import fs from 'fs';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('🚀 Iniciando Carga de Catálogo...');
  const results = [];

  // Leer Servicios-Grid view (2).csv
  fs.createReadStream('Servicios-Grid view (2).csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      for (const row of results) {
        // Limpieza de datos: "$MXN100" -> 100
        const priceClean = row['Precio']?.replace(/[^0-9.]/g, '') || 0;
        const durationParts = row['Duración']?.split(':') || ['00', '00']; // "0:30" -> 30 min
        const minutes = (parseInt(durationParts[0]) * 60) + parseInt(durationParts[1]);

        const { error } = await supabase
          .from('services_catalog')
          .upsert({
            name: row['Servicio'],
            base_price: priceClean,
            duration_minutes: minutes,
            legacy_id: row['ID Servicio'] // Ej: "COLOR5"
          }, { onConflict: 'legacy_id' });

        if (error) console.error(`❌ Error ${row['Servicio']}:`, error.message);
        else console.log(`✅ Servicio cargado: ${row['Servicio']}`);
      }
      console.log('🏁 Catálogo finalizado.');
    });
}

run();