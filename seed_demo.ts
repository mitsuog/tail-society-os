import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { addMinutes, subDays } from 'date-fns';

// 1. CARGA SEGURA DE VARIABLES
dotenv.config({ path: path.resolve(process.cwd(), '.env.demo') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error CRÍTICO: No se encontraron las llaves en .env.demo");
  process.exit(1);
}

// Cliente con permisos de ADMIN (Service Role)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// --- DATA MAESTRA ---

const COMMISSION_TIERS = [
    { name: 'Nivel 1 (Base)', type: 'grooming', min_sales: 0, max_sales: 15000, percentage: 0.30 },
    { name: 'Nivel 2 (Pro)', type: 'grooming', min_sales: 15001, max_sales: 25000, percentage: 0.35 },
    { name: 'Nivel 3 (Master)', type: 'grooming', min_sales: 25001, max_sales: 999999, percentage: 0.40 },
    { name: 'Ventas Tienda', type: 'total', min_sales: 0, max_sales: 999999, percentage: 0.10 },
];

const EMPLOYEES = [
  { first_name: 'Ana', last_name: 'Groomer', role: 'stylist', color: '#ec4899', commission_type: 'grooming', participation: 100, salary: 2500 },
  { first_name: 'Carlos', last_name: 'Bañador', role: 'bather', color: '#3b82f6', commission_type: 'grooming', participation: 100, salary: 1800 },
  { first_name: 'Sofia', last_name: 'Recepción', role: 'reception', color: '#10b981', commission_type: 'total', participation: 100, salary: 2000 },
  { first_name: 'Miguel', last_name: 'Senior', role: 'stylist', color: '#f59e0b', commission_type: 'grooming', participation: 100, salary: 3000 },
];

const SERVICES = [
  { name: 'Corte Schnauzer', price: 650, duration: 90, category: 'cut' },
  { name: 'Corte Poodle', price: 750, duration: 120, category: 'cut' },
  { name: 'Baño General', price: 400, duration: 60, category: 'bath' },
  { name: 'Baño Medicado', price: 550, duration: 70, category: 'bath' },
  { name: 'Deslanado Profundo', price: 800, duration: 120, category: 'bath' },
  { name: 'Corte de Uñas', price: 150, duration: 15, category: 'addon' },
];

const BREEDS = ['Schnauzer', 'Poodle', 'Golden Retriever', 'Bulldog', 'Mestizo', 'Chihuahua', 'Yorkie', 'Husky'];

const STORE_ITEMS = [
  { name: 'Shampoo Premium', price: 250 },
  { name: 'Juguete Hueso', price: 120 },
  { name: 'Correa Paseo', price: 350 },
  { name: 'Premios Bolsa', price: 90 },
];

// --- HELPER: CREAR USUARIO AUTH ---
async function getOrCreateAuthUser(email: string, name: string) {
    // 1. Intentar crear usuario
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true,
        user_metadata: { first_name: name }
    });

    if (data.user) return data.user.id;

    // 2. Si ya existe, buscarlo (Workaround)
    if (error?.message?.includes('already registered') || error?.status === 422) {
        const { data: users } = await supabase.auth.admin.listUsers();
        const existing = users.users.find(u => u.email === email);
        return existing?.id;
    }
    
    console.error(`⚠️ Error auth para ${email}:`, error?.message);
    return null; // Si falla auth, devolvemos null y el script intentará insertar sin user_id (lo cual está permitido en tu schema)
}

// --- FUNCIÓN PRINCIPAL ---

async function seed() {
  console.log('🌱 Iniciando Restauración Total del Sistema Demo...');

  // -------------------------------------------------------------
  // 0. LIMPIEZA DE BASE DE DATOS
  // -------------------------------------------------------------
  console.log('🧹 Eliminando datos antiguos...');
  
  await supabase.from('payroll_receipts').delete().neq('id', 0);
  await supabase.from('appointment_services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('payroll_runs').delete().neq('id', 0);
  await supabase.from('sales_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('employee_absences').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('employee_schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('employee_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('employee_contracts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('pets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('commission_tiers').delete().neq('id', 0);
  await supabase.from('official_holidays').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('✨ Tablas públicas limpias.');

  // -------------------------------------------------------------
  // 1. CONFIGURACIÓN BASE
  // -------------------------------------------------------------
  await supabase.from('commission_tiers').insert(COMMISSION_TIERS);
  await supabase.from('official_holidays').insert([
      { date: '2026-01-01', name: 'Año Nuevo' },
      { date: '2026-02-05', name: 'Día de la Constitución' },
      { date: '2026-05-01', name: 'Día del Trabajo' },
      { date: '2026-09-16', name: 'Día de la Independencia' },
      { date: '2026-11-16', name: 'Revolución Mexicana' },
      { date: '2026-12-25', name: 'Navidad' }
  ]);

  // -------------------------------------------------------------
  // 2. CREAR STAFF (AUTH + DB)
  // -------------------------------------------------------------
  const empIds: { id: string; role: string; first_name: string }[] = [];
  
  console.log('👷 Creando empleados...');
  for (const emp of EMPLOYEES) {
    const email = `${emp.first_name.toLowerCase()}@demo.com`;
    
    // A. Crear Auth User
    const authId = await getOrCreateAuthUser(email, emp.first_name);
    
    // B. Insertar en tabla pública (CORREGIDO: Sin campo 'phone' que no existe)
    const payload: any = {
      first_name: emp.first_name,
      last_name: emp.last_name,
      role: emp.role,
      color: emp.color,
      active: true,
      email: email,
      commission_type: emp.commission_type,
      participation_pct: emp.participation,
      show_in_calendar: true
    };

    if (authId) payload.id = authId;

    const { data: newEmp, error } = await supabase.from('employees')
        .upsert(payload)
        .select('id, role, first_name')
        .single();
    
    if (error) {
        console.error(`❌ Error insertando perfil para ${emp.first_name}:`, error.message);
        continue;
    }

    if (newEmp) {
        empIds.push(newEmp);
        
        // C. Contrato
        await supabase.from('employee_contracts').insert({
            employee_id: newEmp.id,
            base_salary_weekly: emp.salary,
            start_date: new Date().toISOString(),
            is_active: true,
            metadata: { bank_dispersion: emp.salary, cash_difference: 0 }
        });

        // D. Horario
        const schedule = [1, 2, 3, 4, 5, 6].map(day => ({
            employee_id: newEmp.id,
            day_of_week: day,
            start_time: '09:00',
            end_time: '18:00',
            is_working: true
        }));
        await supabase.from('employee_schedules').insert(schedule);
    }
  }
  console.log(`✅ ${empIds.length} empleados configurados.`);

  // -------------------------------------------------------------
  // 3. GENERAR CLIENTES Y MASCOTAS
  // -------------------------------------------------------------
  const petIds: { id: string; client_id: string; name: string }[] = [];
  
  for (let i = 0; i < 40; i++) { 
    const isVip = Math.random() > 0.8;
    
    // CORREGIDO: Sin campo 'address' y 'internal_tags' como string
    const { data: client, error: clientError } = await supabase.from('clients').insert({
      full_name: `Cliente Demo ${i+1}`,
      phone: `55${Math.floor(10000000 + Math.random() * 90000000)}`, 
      email: `cliente${i}@demo.com`,
      internal_tags: isVip ? 'vip, frequent' : 'regular', // Convertido a string simple
      status: 'active'
    }).select('id').single();

    if (clientError) {
        console.error(`❌ Error creando cliente ${i}:`, clientError.message);
        continue;
    }

    if (client) {
        const numPets = Math.random() > 0.85 ? 2 : 1;
        for (let p = 0; p < numPets; p++) {
            const breed = BREEDS[Math.floor(Math.random() * BREEDS.length)];
            const { data: pet } = await supabase.from('pets').insert({
                client_id: client.id,
                name: `Firulais ${i}-${p+1}`,
                breed: breed,
                size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
                status: 'active',
                sex: Math.random() > 0.5 ? 'male' : 'female'
            }).select('id, name').single();
            
            if (pet) petIds.push({ id: pet.id, client_id: client.id, name: pet.name });
        }
    }
  }
  console.log(`✅ Clientes y mascotas listos. Total mascotas: ${petIds.length}`);

  // -------------------------------------------------------------
  // 4. SIMULACIÓN OPERATIVA (Citas + Ventas)
  // -------------------------------------------------------------
  const today = new Date();
  let totalAppointments = 0;
  
  if (petIds.length > 0 && empIds.length > 0) {
      for (let i = -45; i < 15; i++) { 
        const day = new Date(today);
        day.setDate(today.getDate() + i);
        
        if (day.getDay() === 0) continue;

        const dailyCount = Math.floor(Math.random() * 5) + 3;

        for (let j = 0; j < dailyCount; j++) { 
            const stylists = empIds.filter(e => e.role !== 'reception');
            if (stylists.length === 0) break;
            
            const emp = stylists[Math.floor(Math.random() * stylists.length)];
            const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
            const selectedPet = petIds[Math.floor(Math.random() * petIds.length)];

            const hour = 9 + Math.floor(Math.random() * 8); 
            day.setHours(hour, 0, 0, 0); 
            const startTime = new Date(day);
            const endTime = addMinutes(startTime, service.duration);

            const isPast = i < 0;
            const status = isPast ? 'completed' : 'confirmed';
            
            // Crear Cita
            const { data: appt, error: apptError } = await supabase.from('appointments').insert({
                date: startTime.toISOString(),
                client_id: selectedPet.client_id,
                pet_id: selectedPet.id,
                status: status,
                price_charged: service.price,
                notes: `Servicio Demo: ${service.name}`
            }).select('id').single();

            if (apptError) continue;

            if (appt) {
                totalAppointments++;

                await supabase.from('appointment_services').insert({
                    appointment_id: appt.id,
                    service_name: service.name,
                    price: service.price,
                    employee_id: emp.id,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString()
                });

                if (isPast) {
                    const boughtStoreItem = Math.random() > 0.7; 
                    let finalTotal = service.price;
                    const items = [{
                        name: service.name,
                        quantity: 1,
                        unit_price: service.price,
                        amount: service.price,
                        category: 'grooming'
                    }];

                    if (boughtStoreItem) {
                        const storeItem = STORE_ITEMS[Math.floor(Math.random() * STORE_ITEMS.length)];
                        const qty = 1;
                        const itemTotal = storeItem.price * qty;
                        finalTotal += itemTotal;
                        items.push({
                            name: storeItem.name,
                            quantity: qty,
                            unit_price: storeItem.price,
                            amount: itemTotal,
                            category: 'store'
                        });
                    }

                    await supabase.from('sales_transactions').insert({
                        zettle_id: uuidv4(),
                        timestamp: startTime.toISOString(),
                        total_amount: finalTotal,
                        tax_amount: finalTotal * 0.16,
                        is_grooming: true,
                        is_store: boughtStoreItem,
                        items: items
                    });
                }
            }
        }
      }
  } else {
      console.warn("⚠️ No se generaron citas porque faltan empleados o mascotas.");
  }

  // -------------------------------------------------------------
  // 5. INCIDENTES DE NÓMINA
  // -------------------------------------------------------------
  console.log('📉 Generando incidentes de asistencia...');
  if (empIds.length > 0) {
      const randomEmp = empIds[0]; 
      const absentDate = subDays(new Date(), 2); 
      
      // Falta Injustificada
      await supabase.from('employee_absences').insert({
          employee_id: randomEmp.id,
          type: 'unjustified',
          start_date: absentDate.toISOString(),
          end_date: absentDate.toISOString(),
          reason: 'No avisó'
      });

      if (empIds.length > 1) {
          const sickEmp = empIds[1];
          const sickDate = subDays(new Date(), 5);
          await supabase.from('employee_absences').insert({
              employee_id: sickEmp.id,
              type: 'sick',
              start_date: sickDate.toISOString(),
              end_date: sickDate.toISOString(),
              reason: 'Gripe'
          });
      }
  }

  console.log(`✅ ${totalAppointments} citas generadas.`);
  console.log('🚀 ¡ENTORNO DEMO 100% OPERATIVO! 🚀');
}

seed().catch((e) => {
    console.error("FATAL ERROR EN SEED:", e);
});