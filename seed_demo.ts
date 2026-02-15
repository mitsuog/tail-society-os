import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { addMinutes, subDays, addDays, isWeekend } from 'date-fns';

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

// --- DATA MAESTRA: ESTÉTICA PREMIUM & SPA ---

const SERVICES = [
  { name: 'Grooming Completo (Corte de Raza)', price: 850, duration: 120, category: 'cut' },
  { name: 'Baño Hidratante & Deslanado', price: 650, duration: 90, category: 'bath' },
  { name: 'Corte Estilo Asiático (Teddy)', price: 950, duration: 150, category: 'cut' },
  { name: 'Spa de Ozonoterapia', price: 400, duration: 45, category: 'spa' },
  { name: 'Tratamiento de Keratina', price: 350, duration: 30, category: 'spa' },
  { name: 'Pedicure & Bálsamo de Patitas', price: 250, duration: 30, category: 'addon' },
];

const COMMISSION_TIERS = [
    { name: 'Nivel 1 (Junior)', type: 'grooming', min_sales: 0, max_sales: 20000, percentage: 0.30 },
    { name: 'Nivel 2 (Senior)', type: 'grooming', min_sales: 20001, max_sales: 40000, percentage: 0.35 },
    { name: 'Nivel 3 (Master)', type: 'grooming', min_sales: 40001, max_sales: 999999, percentage: 0.40 },
    { name: 'Comisión Tienda', type: 'total', min_sales: 0, max_sales: 999999, percentage: 0.10 },
];

// Configuración para Pool de Grooming (Reparto Equitativo)
const EMPLOYEES = [
  { first_name: 'Ana', last_name: 'Estilista', role: 'stylist', color: '#ec4899', commission_type: 'grooming', participation: 100, salary: 3000 },
  { first_name: 'Carlos', last_name: 'Bañador', role: 'bather', color: '#3b82f6', commission_type: 'grooming', participation: 100, salary: 2500 },
  { first_name: 'Miguel', last_name: 'Senior', role: 'stylist', color: '#f59e0b', commission_type: 'grooming', participation: 100, salary: 3500 },
  { first_name: 'Sofia', last_name: 'Recepción', role: 'reception', color: '#10b981', commission_type: 'total', participation: 100, salary: 2800 }, // Ella va por venta total
];

const BREEDS = ['Poodle Toy', 'Schnauzer Mini', 'Golden Retriever', 'Bulldog Francés', 'Pomerania', 'Samoyedo', 'Yorkshire', 'Mestizo'];

const STORE_ITEMS = [
  { name: 'Shampoo Artero Hidratante', price: 450 },
  { name: 'Perfume For Pets', price: 320 },
  { name: 'Correa de Cuero', price: 550 },
  { name: 'Snacks Naturales', price: 150 },
];

// --- HELPER: CREAR USUARIO AUTH ---
async function getOrCreateAuthUser(email: string, name: string) {
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true,
        user_metadata: { first_name: name }
    });

    if (data.user) return data.user.id;

    if (error?.message?.includes('already registered') || error?.status === 422) {
        const { data: users } = await supabase.auth.admin.listUsers();
        const existing = users.users.find(u => u.email === email);
        return existing?.id;
    }
    
    console.error(`⚠️ Error auth para ${email}:`, error?.message);
    return null;
}

// --- FUNCIÓN PRINCIPAL ---

async function seed() {
  console.log('🌱 Iniciando Restauración Premium del Sistema Demo...');

  // -------------------------------------------------------------
  // 0. LIMPIEZA DE BASE DE DATOS
  // -------------------------------------------------------------
  console.log('🧹 Limpiando datos antiguos...');
  
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
  await supabase.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Limpiamos servicios viejos
  await supabase.from('commission_tiers').delete().neq('id', 0);
  await supabase.from('official_holidays').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('✨ Base de datos limpia.');

  // -------------------------------------------------------------
  // 1. CONFIGURACIÓN Y CATÁLOGOS
  // -------------------------------------------------------------
  await supabase.from('commission_tiers').insert(COMMISSION_TIERS);
  
  // Insertar Servicios Premium
  for (const svc of SERVICES) {
      await supabase.from('services').insert({
          name: svc.name,
          base_price: svc.price,
          duration_minutes: svc.duration,
          category: svc.category,
          active: true
      });
  }
  
  // Días festivos 2026
  await supabase.from('official_holidays').insert([
      { date: '2026-01-01', name: 'Año Nuevo' },
      { date: '2026-02-05', name: 'Día de la Constitución' },
      { date: '2026-05-01', name: 'Día del Trabajo' },
      { date: '2026-09-16', name: 'Día de la Independencia' },
      { date: '2026-12-25', name: 'Navidad' }
  ]);

  // -------------------------------------------------------------
  // 2. CREAR STAFF (EQUIPO SPA)
  // -------------------------------------------------------------
  const empIds: { id: string; role: string; first_name: string }[] = [];
  
  console.log('👷 Configurando equipo de trabajo...');
  for (const emp of EMPLOYEES) {
    const email = `${emp.first_name.toLowerCase()}@demo.com`;
    const authId = await getOrCreateAuthUser(email, emp.first_name);
    
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
        console.error(`❌ Error perfil ${emp.first_name}:`, error.message);
        continue;
    }

    if (newEmp) {
        empIds.push(newEmp);
        
        // Contrato para Nómina
        await supabase.from('employee_contracts').insert({
            employee_id: newEmp.id,
            base_salary_weekly: emp.salary,
            start_date: new Date().toISOString(),
            is_active: true,
            metadata: { bank_dispersion: emp.salary, cash_difference: 0 }
        });

        // Horario (Lun-Sáb)
        const schedule = [1, 2, 3, 4, 5, 6].map(day => ({
            employee_id: newEmp.id,
            day_of_week: day,
            start_time: '09:00',
            end_time: '19:00', // Jornada Spa
            is_working: true
        }));
        await supabase.from('employee_schedules').insert(schedule);
    }
  }

  // -------------------------------------------------------------
  // 3. GENERAR CLIENTES Y MASCOTAS
  // -------------------------------------------------------------
  const petIds: { id: string; client_id: string; name: string }[] = [];
  
  for (let i = 0; i < 40; i++) { 
    const isVip = Math.random() > 0.8;
    const { data: client } = await supabase.from('clients').insert({
      full_name: `Cliente Demo ${i+1}`,
      phone: `55${Math.floor(10000000 + Math.random() * 90000000)}`, 
      email: `cliente${i}@demo.com`,
      internal_tags: isVip ? 'vip, frequent' : 'regular',
      status: 'active'
    }).select('id').single();

    if (client) {
        const numPets = Math.random() > 0.85 ? 2 : 1;
        for (let p = 0; p < numPets; p++) {
            const breed = BREEDS[Math.floor(Math.random() * BREEDS.length)];
            const { data: pet } = await supabase.from('pets').insert({
                client_id: client.id,
                name: `Perrito ${i}-${p+1}`,
                breed: breed,
                size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
                status: 'active',
                sex: Math.random() > 0.5 ? 'male' : 'female'
            }).select('id, name').single();
            
            if (pet) petIds.push({ id: pet.id, client_id: client.id, name: pet.name });
        }
    }
  }
  console.log(`✅ ${petIds.length} mascotas premium registradas.`);

  // -------------------------------------------------------------
  // 4. GENERACIÓN DE CITAS Y VENTAS (-1 Mes a +1 Mes)
  // -------------------------------------------------------------
  const today = new Date();
  let totalAppointments = 0;
  
  // Obtenemos los servicios reales con sus IDs
  const { data: dbServices } = await supabase.from('services').select('*');
  if (!dbServices || dbServices.length === 0) throw new Error("No se crearon los servicios");

  if (petIds.length > 0 && empIds.length > 0) {
      
      // RANGO: -30 días a +30 días
      for (let i = -30; i <= 30; i++) { 
        const day = new Date(today);
        day.setDate(today.getDate() + i);
        
        // Abrimos de Lunes a Sábado
        if (day.getDay() === 0) continue;

        // Fluctuación de Citas: Sábados (6) más llenos, entre semana variable
        const isSaturday = day.getDay() === 6;
        const dailyCount = isSaturday 
            ? Math.floor(Math.random() * 4) + 6  // 6 a 9 citas
            : Math.floor(Math.random() * 4) + 3; // 3 a 6 citas

        for (let j = 0; j < dailyCount; j++) { 
            const stylists = empIds.filter(e => e.role !== 'reception');
            if (stylists.length === 0) break;
            
            const emp = stylists[Math.floor(Math.random() * stylists.length)];
            const service = dbServices[Math.floor(Math.random() * dbServices.length)];
            const selectedPet = petIds[Math.floor(Math.random() * petIds.length)];

            // Horario aleatorio 9am - 6pm (evitando overlap perfecto)
            const hour = 9 + Math.floor(Math.random() * 9); 
            day.setHours(hour, 0, 0, 0); 
            const startTime = new Date(day);
            const endTime = addMinutes(startTime, service.duration_minutes);

            const isPast = i < 0;
            const status = isPast ? 'completed' : 'confirmed';
            
            // Crear Cita
            const { data: appt } = await supabase.from('appointments').insert({
                date: startTime.toISOString(),
                client_id: selectedPet.client_id,
                pet_id: selectedPet.id,
                status: status,
                price_charged: service.base_price,
                notes: isPast ? `Servicio Realizado: ${service.name}` : `Agendado: ${service.name}`
            }).select('id').single();

            if (appt) {
                totalAppointments++;

                // Detalle del Servicio
                await supabase.from('appointment_services').insert({
                    appointment_id: appt.id,
                    service_id: service.id,
                    service_name: service.name,
                    price: service.base_price,
                    employee_id: emp.id,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString()
                });

                // SI YA PASÓ -> GENERAR VENTA ($$$) PARA EL POOL
                if (isPast) {
                    const boughtStoreItem = Math.random() > 0.7; 
                    let finalTotal = Number(service.base_price);
                    
                    const items = [{
                        name: service.name,
                        quantity: 1,
                        unit_price: service.base_price,
                        amount: service.base_price,
                        category: 'grooming' // CLAVE: Esto alimenta el Pool de Grooming
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
                        is_grooming: true, // CLAVE: Marca la transacción como elegible para pool
                        is_store: boughtStoreItem,
                        items: items
                    });
                }
            }
        }
      }
  }

  // -------------------------------------------------------------
  // 5. INCIDENTES DE NÓMINA (Para demostrar deducciones)
  // -------------------------------------------------------------
  console.log('📉 Generando incidentes...');
  if (empIds.length > 0) {
      const randomEmp = empIds[0]; 
      const absentDate = subDays(new Date(), 3); // Hace 3 días
      
      // Falta Injustificada (Afecta Pool y Salario)
      await supabase.from('employee_absences').insert({
          employee_id: randomEmp.id,
          type: 'unjustified',
          start_date: absentDate.toISOString(),
          end_date: absentDate.toISOString(),
          reason: 'Falta injustificada (Demo)'
      });
  }

  console.log(`✅ ${totalAppointments} citas agendadas (Pasadas y Futuras).`);
  console.log('🚀 ¡DEMO PREMIUM LISTO!');
}

seed().catch((e) => {
    console.error("FATAL ERROR EN SEED:", e);
});