import fs from 'fs';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Configuración para limpiar encabezados "sucios" de Excel (BOM)
const csvOptions = {
  mapHeaders: ({ header }) => header.trim().replace(/^\ufeff/, '')
};

// Mapas en memoria
const servicesMap = new Map(); 
const agendaMap = new Map();   

const cleanPhone = (p) => p?.replace(/[^0-9]/g, '') || '';

async function loadReferenceData() {
  console.log('📦 Cargando referencias (Servicios y Agenda)...');
  
  // 1. Cargar Servicios
  const { data: services } = await supabase.from('services_catalog').select('id, legacy_id');
  if (services) services.forEach(s => servicesMap.set(s.legacy_id, s.id));

  // 2. Cargar Agenda (CSV)
  // Mapeamos ID_Agenda -> Objeto completo de la fila
  await new Promise((resolve) => {
    fs.createReadStream('AgendaServicios-Grid view (2).csv')
      .pipe(csv(csvOptions))
      .on('data', (row) => {
        if(row['ID_Agenda']) agendaMap.set(row['ID_Agenda'], row); 
      })
      .on('end', resolve);
  });
  
  console.log(`📚 Memoria lista: ${servicesMap.size} servicios DB | ${agendaMap.size} citas CSV.`);
}

async function migrate() {
  await loadReferenceData();

  const petsRows = [];
  console.log('📖 Leyendo Mascotas-Grid view (3).csv ...');

  fs.createReadStream('Mascotas-Grid view (3).csv')
    .pipe(csv(csvOptions))
    .on('data', (d) => petsRows.push(d))
    .on('end', async () => {
      console.log(`🚀 Iniciando migración de ${petsRows.length} registros...`);
      
      let successCount = 0;
      let errorCount = 0;

      for (const row of petsRows) {
        try {
          // --- DATOS DEL CSV (Mapeo Exacto) ---
          const petName = row['Nombre mascota'];
          const rawPhone = row['Teléfono movil (Cliente)'];
          const ownerName = row['Cliente'];
          
          // Si faltan datos críticos, saltamos
          if (!petName || !rawPhone || !ownerName) continue;

          const phone = cleanPhone(rawPhone);

          // --- 1. CLIENTE ---
          let clientId;
          const { data: existingClient } = await supabase
            .from('clients')
            .select('id')
            .eq('phone', phone)
            .maybeSingle();

          if (existingClient) {
            clientId = existingClient.id;
          } else {
            // Mapeo de campos del Cliente
            const { data: newClient, error: clientError } = await supabase
              .from('clients')
              .insert([{ 
                full_name: ownerName, 
                phone: phone,
                email: row['Correo (Cliente)'] || null,
                secondary_phone: row['telefono2'] || null,
                marketing_consent: row['ClienteAceptaDatos'] === 'checked' || row['ClienteAceptaDatos'] === 'true'
              }])
              .select('id')
              .single();
            
            if (clientError) throw new Error(`Cliente error: ${clientError.message}`);
            clientId = newClient.id;
          }

          // --- 2. MASCOTA ---
          // Limpieza fecha nacimiento (Formatos: 9/13/2015 o 13/09/2015)
          let birthDate = null;
          if (row['Fecha de nacimiento']) {
            const parts = row['Fecha de nacimiento'].split('/');
            // Asumimos MM/DD/YYYY por el ejemplo que vi (9/13/2015)
            if (parts.length === 3) birthDate = `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
          }

          // Mapeo de campos de Mascota
          const { data: petData, error: petError } = await supabase
            .from('pets')
            .insert([{
              name: petName,
              client_id: clientId,
              breed: row['Razas/Tipo'],       // CSV: Razas/Tipo
              gender: row['Sexo'],            // CSV: Sexo
              birth_date: birthDate,
              allergies: row['Cuidados Especiales'], // CSV: Cuidados Especiales
              species: row['Tipo de mascota'], // CSV: Tipo de mascota (Nuevo campo)
              size: row['Tamaño'],             // CSV: Tamaño (Nuevo campo)
              photo_url: row['Foto']           // CSV: Foto
            }])
            .select('id')
            .single();

          if (petError) throw new Error(`Mascota error: ${petError.message}`);
          
          // --- 3. AGENDA (Historial) ---
          const agendaIdsStr = row['AgendaServicios']; // Ej: "1238, 3519"
          
          if (agendaIdsStr) {
            // Convertimos "1238, 3519" en array ['1238', '3519']
            const agendaIds = agendaIdsStr.toString().split(',').map(s => s.trim()).filter(s => s);
            
            for (const agendaId of agendaIds) {
              const apptData = agendaMap.get(agendaId); // Buscamos en el CSV de Agenda cargado en memoria
              if (!apptData) continue;

              // Procesar Servicios
              const serviceCodes = apptData['Servicio']?.split(',') || [];
              const mainCode = serviceCodes[0]?.trim();
              const serviceId = servicesMap.get(mainCode); // ID real en DB

              // Fecha Cita
              let apptDate = new Date();
              if (apptData['Fecha_Agenda']) {
                const parts = apptData['Fecha_Agenda'].split('/');
                if(parts.length === 3) apptDate = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
              }

              // Guardar Cita
              // Nota: 'Perfume' del CSV lo metemos en las notas para no complicar la tabla
              const notas = `ServicioCD: ${apptData['ServicioCD'] || ''}. Perfume: ${apptData['Perfume'] || 'N/A'}. Cond: ${apptData['Condiciones'] || ''}`;

              await supabase.from('appointments').insert({
                pet_id: petData.id,
                service_id: serviceId || null, 
                date: apptDate,
                legacy_id: agendaId,
                status: 'completed',
                price_charged: apptData['Precio']?.replace(/[^0-9.]/g, '') || 0,
                notes: notas,
                secondary_services_text: serviceCodes.slice(1).join(', ')
              });
            }
          }
          
          successCount++;
          if(successCount % 50 === 0) console.log(`⚡ Procesadas ${successCount} mascotas...`);

        } catch (err) {
          // Solo mostramos error si no es un registro vacío
          if (err.message) console.error(`❌ ${err.message}`);
          errorCount++;
        }
      }
      console.log(`\n🏁 MIGRACIÓN TERMINADA: ${successCount} Éxitos.`);
    });
}

migrate();