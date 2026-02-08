import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { fetchRecentZettlePurchases } from '@/lib/zettle';
import { subDays } from 'date-fns';

export async function GET(request: Request) {
  const supabase = await createClient();
  
  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get('startDate');
  const endParam = searchParams.get('endDate');
  // Fallback de fechas
  const startDate = startParam || subDays(new Date(), 7).toISOString();
  const endDate = endParam || undefined;

  try {
    // 1. CARGAR ÚNICAMENTE EL CATÁLOGO (La única fuente de verdad)
    const { data: catalogData } = await supabase.from('zettle_catalog').select('zettle_uuid, name, category');
    
    const uuidMap = new Map();
    const nameMap = new Map();
    
    catalogData?.forEach((c: any) => {
        if (c.zettle_uuid) uuidMap.set(c.zettle_uuid, c.category);
        // Normalizamos nombres para búsqueda insensible a mayúsculas
        if (c.name) nameMap.set((c.name || '').trim().toLowerCase(), c.category);
    });

    // 2. TRAER VENTAS
    const data = await fetchRecentZettlePurchases(startDate, endDate);
    
    if (!data || !data.purchases || data.purchases.length === 0) {
        return NextResponse.json({ success: false, message: "No se encontraron ventas." });
    }

    let importedCount = 0;
    
    // 3. PROCESAR TRANSACCIONES
    for (const p of data.purchases) {
      
      const rawAmount = p.amount || 0;
      const gratuity = p.gratuityAmount || 0;
      let totalAmount = (rawAmount - gratuity) / 100;
      let taxAmount = (p.vatAmount || 0) / 100;

      const isRefund = p.type === 'REFUND' || totalAmount < 0;
      if (isRefund && totalAmount > 0) totalAmount = totalAmount * -1;

      const rawProducts = p.products || [];
      let ticketHasGrooming = false; 

      const normalizedItems = rawProducts.map((item: any) => {
          let unitPrice = (item.unitPrice || 0) / 100;
          let quantity = Number(item.quantity || 0);
          const discountAmount = (item.discount?.amount || 0) / 100;

          if (isRefund && quantity > 0) quantity = quantity * -1;
          const rowTotal = (unitPrice * quantity) - discountAmount;
          
          // --- LÓGICA ULTRA-ESTRICTA ---
          let category = 'store'; // DEFAULT: Todo es tienda
          let classified = false;

          // A. BUSCAR POR ID EXACTO (Prioridad 1)
          if (item.productUuid && uuidMap.has(item.productUuid)) {
              category = uuidMap.get(item.productUuid);
              classified = true;
          }
          else if (item.variantUuid && uuidMap.has(item.variantUuid)) {
              category = uuidMap.get(item.variantUuid);
              classified = true;
          }

          // B. BUSCAR POR NOMBRE EXACTO (Prioridad 2 - Para manuales que coinciden con catálogo)
          if (!classified) {
              const cleanName = (item.name || '').trim().toLowerCase();
              if (cleanName && nameMap.has(cleanName)) {
                  category = nameMap.get(cleanName);
                  classified = true;
              }
          }

          // NOTA: Si no cayó en A ni en B, se queda como 'store'. 
          // Ya no hay reglas ni adivinanzas.

          if (category === 'grooming') ticketHasGrooming = true;

          return {
              productUuid: item.productUuid,
              variantUuid: item.variantUuid,
              name: item.name || 'Sin Nombre',
              variant: item.variant,
              quantity: quantity,
              unit_price: unitPrice,
              discount: discountAmount,
              amount: rowTotal,
              category: category
          };
      });

      // --- CUADRE FINAL ---
      const sumItems = normalizedItems.reduce((sum: number, i: any) => sum + i.amount, 0);
      
      if (Math.abs(totalAmount - sumItems) > 0.05) {
          const diff = totalAmount - sumItems;
          // Si el ticket no tiene NADA de grooming confirmado por catálogo,
          // el descuento se va a tienda.
          const adjustmentCategory = ticketHasGrooming ? 'grooming' : 'store';
          
          normalizedItems.push({
              name: isRefund ? "Ajuste de Devolución" : "Descuento Global / Ajuste",
              quantity: 1,
              unit_price: diff,
              amount: diff,
              category: adjustmentCategory 
          });
      }

      // --- BANDERAS ---
      const hasGrooming = normalizedItems.some((i: any) => i.category === 'grooming');
      const hasStore = normalizedItems.some((i: any) => i.category === 'store') || !hasGrooming;

      const { error } = await supabase.from('sales_transactions').upsert({
        zettle_id: p.purchaseUUID,
        timestamp: p.timestamp,
        total_amount: totalAmount, 
        tax_amount: taxAmount,
        payment_method: p.paymentMethod,
        items: normalizedItems,
        is_grooming: hasGrooming,
        is_store: hasStore
      }, { onConflict: 'zettle_id' });

      if (!error) importedCount++;
    }

    return NextResponse.json({ 
        success: true, 
        message: `Sincronización Estricta (Solo Catálogo): ${importedCount} ventas procesadas.` 
    });

  } catch (error: any) {
    console.error("Sync Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}