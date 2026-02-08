import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { fetchRecentZettlePurchases } from '@/lib/zettle';
import { subDays } from 'date-fns';

export async function GET(request: Request) {
  const supabase = await createClient();
  
  try {
    // 1. Obtener reglas de clasificación (Grooming vs Tienda)
    const { data: rules } = await supabase.from('revenue_classification_rules').select('*');

    // 2. Traer ventas de Zettle (últimos 7 días)
    const startDate = subDays(new Date(), 7).toISOString();
    const data = await fetchRecentZettlePurchases(startDate);
    
    if (!data || !data.purchases) {
        return NextResponse.json({ success: false, message: "Zettle no devolvió datos recientes." });
    }

    let importedCount = 0;

    // 3. Procesar y NORMALIZAR cada venta
    for (const p of data.purchases) {
      // Zettle envía el total en CENTAVOS. Lo convertimos a PESOS.
      const totalAmount = (p.amount || 0) / 100;
      const taxAmount = (p.vatAmount || 0) / 100;

      // Normalizamos los productos para que payroll-actions los entienda
      const rawProducts = p.products || [];
      const normalizedItems = rawProducts.map((item: any) => {
          const unitPrice = (item.unitPrice || 0) / 100; // Centavos a Pesos
          const quantity = Number(item.quantity || 0);
          const rowTotal = unitPrice * quantity;
          
          return {
              name: item.name,
              variant: item.variant,
              quantity: quantity,
              unit_price: unitPrice,
              amount: rowTotal, // <--- ESTO es lo que busca la nómina
              category: item.category?.name // Categoría original de Zettle
          };
      });
      
      // Lógica de Clasificación (Grooming vs Store)
      let hasGrooming = false;
      let hasStore = false;

      // Si no hay productos (cobro manual monto total), revisamos el monto
      if (normalizedItems.length === 0) {
          // Asumimos tienda por defecto en cobros manuales vacíos, a menos que haya una regla futura
          hasStore = true;
      } else {
          for (const item of normalizedItems) {
             const name = (item.name || '').toLowerCase();
             const cat = (item.category || '').toLowerCase();
             
             let classified = false;
             
             // A. Buscar en Reglas Personalizadas
             if (rules) {
                 for (const rule of rules) {
                     const keyword = rule.keyword.toLowerCase();
                     const match = rule.match_type === 'exact' 
                        ? name === keyword 
                        : name.includes(keyword);
                     
                     if (match) {
                         rule.category === 'grooming' ? hasGrooming = true : hasStore = true;
                         classified = true;
                         break;
                     }
                 }
             }

             // B. Si no hay regla, usar lógica por defecto
             if (!classified) {
                 if (
                     cat.includes('grooming') || cat.includes('servicio') || 
                     name.includes('corte') || name.includes('baño') || 
                     name.includes('deslanado') || name.includes('cepillado')
                 ) {
                     hasGrooming = true;
                 } else {
                     hasStore = true;
                 }
             }
          }
      }

      // Upsert en Supabase
      const { error } = await supabase.from('sales_transactions').upsert({
        zettle_id: p.purchaseUUID,
        timestamp: p.timestamp,
        total_amount: totalAmount, // Guardado en Pesos
        tax_amount: taxAmount,
        payment_method: p.paymentMethod,
        items: normalizedItems,    // Guardamos el JSON normalizado con 'amount'
        is_grooming: hasGrooming,
        is_store: hasStore
      }, { onConflict: 'zettle_id' });

      if (!error) importedCount++;
    }

    return NextResponse.json({ 
        success: true, 
        message: `Sincronización API completada. ${importedCount} ventas procesadas correctamente.` 
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}