import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { fetchZettleProductLibrary } from '@/lib/zettle';

export async function GET() {
  const supabase = await createClient();
  
  try {
    const products = await fetchZettleProductLibrary();
    let count = 0;

    for (const p of products) {
        const name = (p.name || '').toLowerCase();
        
        // Auto-detectar inicial (solo sugerencia, el usuario podrá cambiarlo)
        let initialCategory = 'store';
        if (
            name.includes('corte') || 
            name.includes('baño') || 
            name.includes('deslanado') || 
            name.includes('servicio') ||
            (p.category && p.category.name && p.category.name.toLowerCase().includes('grooming'))
        ) {
            initialCategory = 'grooming';
        }

        // Upsert: Si ya existe, NO sobrescribimos la categoría (para respetar tus cambios manuales)
        // Solo insertamos si es nuevo.
        const { error } = await supabase
            .from('zettle_catalog')
            .upsert({
                zettle_uuid: p.uuid,
                name: p.name,
                // Usamos una sintaxis especial de Postgres para "DO NOTHING" en el campo category si ya existe
            }, { onConflict: 'zettle_uuid', ignoreDuplicates: false });

        // Si es nuevo (no existía), actualizamos la categoría inicial
        // (Hacemos esto en dos pasos o con logica de aplicación para no borrar tus ediciones)
        const { data: existing } = await supabase.from('zettle_catalog').select('category').eq('zettle_uuid', p.uuid).single();
        
        if (!existing) {
             // Es inserción nueva, ponemos la categoría sugerida
             await supabase.from('zettle_catalog').update({ category: initialCategory }).eq('zettle_uuid', p.uuid);
        } else {
             // Ya existía, solo actualizamos el nombre por si cambió en Zettle
             await supabase.from('zettle_catalog').update({ name: p.name }).eq('zettle_uuid', p.uuid);
        }
        
        count++;
    }

    return NextResponse.json({ success: true, message: `Catálogo sincronizado: ${count} productos.` });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}