import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { addMinutes, subDays, addDays, isWeekend } from 'date-fns';

// 1. CARGA DE VARIABLES Y VERIFICACIÓN
dotenv.config({ path: path.resolve(process.cwd(), '.env.demo') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // ¡DEBE SER LA SERVICE_ROLE KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error CRÍTICO: No se encontraron las llaves en .env.demo");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// --- DATA MAESTRA ---

// 1. Servicios Premium
const SERVICES = [
  { name: 'Corte de Raza (Tijera)', price: 850, duration: 120, category: 'cut' },
  { name: 'Baño Hidratante & Deslanado', price: 650, duration: 90, category: 'bath' },
  { name: 'Estilo Asiático / Teddy', price: 950, duration: 150, category: 'cut' },
  { name: 'Spa Ozonoterapia', price: 400, duration: 45, category: 'spa' },
  { name: 'Tratamiento de Keratina', price: 350, duration: 30, category: 'spa' },
  { name: 'Pedicure & Bálsamo', price: 250, duration: 30, category: 'addon' },
];

// 2. Productos de Tienda (Para simular venta cruzada)
const STORE_ITEMS = [
  { name: 'Shampoo Artero Hidratante', price: 450 },
  { name: 'Perfume For Pets', price: 320 },
  { name: 'Correa de Cuero Premium', price: 550 },
  { name: 'Snacks Hipoalergénicos', price: 150 },
];

// 3. Niveles de Comisión
const COMMISSION_TIERS = [
    { name: 'Nivel 1 (Junior)', type: 'grooming', min_sales: 0, max_sales: 20000, percentage: 0.30 },
    { name: 'Nivel 2 (Senior)', type: 'grooming', min_sales: 20001, max_sales: 40000, percentage: 0.35 },
    { name: 'Nivel 3 (Master)', type: 'grooming', min_sales: 40001, max_sales: 999999, percentage: 0.40 },
    { name: 'Ventas Tienda', type: 'total', min_sales: 0, max_sales: 999999, percentage: 0.10 },
];

// 4. Empleados (Configurados para Pool)
const EMPLOYEES = [
  { first_name: 'Ana', last_name: 'Estilista', role: 'stylist', color: '#ec4899', commission_type: 'grooming', participation: 100, salary: 3000 },
  { first_name: 'Carlos', last_name: 'Bañador', role: 'bather', color: '#3b82f6', commission_type: 'grooming', participation: 100, salary: 2500 },
  { first_name: 'Miguel', last_name: 'Master', role: 'stylist', color: '#f59e0b', commission_type: 'grooming', participation: 100, salary: 3500 },
  { first_name: 'Sofia', last_name: 'Recepción', role: 'reception', color: '#10b981', commission_type: 'total', participation: 100, salary: 2800 },
];

const BREEDS = ['Poodle Toy', 'Schnauzer Mini', 'Golden Retriever', 'Bulldog Francés', 'Pomerania', 'Samoyedo', 'Yorkshire', 'Mestizo'];

// --- HELPER: AUTH ---
async function getOrCreateAuthUser(email: string, name: string) {
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true,
        user_metadata: { first_name: name }
    });
    if (data.user) return data.user.id;
    
    // Si ya existe, intentamos buscarlo
    if (error?.status === 422) {
        const { data: users } = await supabase.auth.admin.listUsers();
        return users.users.find(u => u.email === email)?.id;
    }
    return null;
}

// --- FUNCIÓN PRINCIPAL ---

async function seed() {
  console.log('🚀 Iniciando Generación de Entorno Demo (Hardcoded Data)...');

  // 0. VERIFICACIÓN DE SEGURIDAD
  const { error: adminCheck } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (adminCheck) {
      console.error("🛑 ERROR: Debes usar la SERVICE_ROLE_KEY en .env.demo para ejecutar este script.");
      process.exit(1);
  }

  // -------------------------------------------------------------
  // 1. LIMPIEZA TOTAL
  // -------------------------------------------------------------
  console.log('🧹 Limpiando base de datos...');
  const tables = [
      'payroll_receipts', 'appointment_services', 'payroll_runs', 
      'sales_transactions', 'appointments', 'employee_absences', 
      'employee_schedules', 'employee_documents', 'employee_contracts', 
      'pets', 'clients', 'employees', 'services', 'commission_tiers', 'official_holidays'
  ];
  
  for (const table of tables) {
      // Usamos un filtro dummy para borrar todo sin restricciones
      await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
      // Nota: Para tablas con ID numérico (si las hubiera), usa .neq('id', 0)
  }
  console.log('✨ Base de datos limpia.');

  // -------------------------------------------------------------
  // 2. CONFIGURACIÓN
  // -------------------------------------------------------------
  await supabase.from('commission_tiers').insert(COMMISSION_TIERS);
  
  for (const svc of SERVICES) {
      await supabase.from('services').insert({ ...svc, active: true });
  }
  
  await supabase.from('official_holidays').insert([
      { date: '2026-01-01', name: 'Año Nuevo' },
      { date: '2026-02-05', name: 'Día de la Constitución' },
      { date: '2026-05-01', name: 'Día del Trabajo' },
      { date: '2026-09-16', name: 'Día de la Independencia' },
      { date: '2026-11-16', name: 'Revolución Mexicana' },
      { date: '2026-12-25', name: 'Navidad' }
  ]);

  // -------------------------------------------------------------
  // 3. STAFF
  // -------------------------------------------------------------
  const empIds: any[] = [];
  console.log('👷 Creando Staff...');
  
  for (const emp of EMPLOYEES) {
    const email = `${emp.first_name.toLowerCase()}@demo.com`;
    const authId = await getOrCreateAuthUser(email, emp.first_name);
    
    if (!authId) continue;

    const { data: newEmp } = await supabase.from('employees').upsert({
      id: authId,
      first_name: emp.first_name,
      last_name: emp.last_name,
      role: emp.role,
      color: emp.color,
      active: true,
      email: email,
      commission_type: emp.commission_type,
      participation_pct: emp.participation,
      show_in_calendar: true
    }).select().single();

    if (newEmp) {
        empIds.push(newEmp);
        await supabase.from('employee_contracts').insert({
            employee_id: newEmp.id,
            base_salary_weekly: emp.salary,
            start_date: new Date().toISOString(),
            is_active: true,
            metadata: { bank_dispersion: emp.salary, cash_difference: 0 }
        });
        
        // Horario Lun-Sab 9am-7pm
        const schedule = [1, 2, 3, 4, 5, 6].map(day => ({
            employee_id: newEmp.id,
            day_of_week: day,
            start_time: '09:00',
            end_time: '19:00',
            is_working: true
        }));
        await supabase.from('employee_schedules').insert(schedule);
    }
  }

  // -------------------------------------------------------------
  // 4. CLIENTES & MASCOTAS
  // -------------------------------------------------------------
  const petIds: any[] = [];
  for (let i = 0; i < 40; i++) { 
    const { data: client } = await supabase.from('clients').insert({
      full_name: `Cliente Demo ${i+1}`,
      phone: `55${Math.floor(10000000 + Math.random() * 90000000)}`, 
      email: `cliente${i}@demo.com`,
      internal_tags: Math.random() > 0.8 ? 'vip' : 'regular',
      status: 'active'
    }).select().single();

    if (client) {
        const breed = BREEDS[Math.floor(Math.random() * BREEDS.length)];
        const { data: pet } = await supabase.from('pets').insert({
            client_id: client.id,
            name: `Mascota ${i+1}`,
            breed: breed,
            size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
            status: 'active'
        }).select().single();
        if (pet) petIds.push(pet);
    }
  }

  // -------------------------------------------------------------
  // 5. AGENDA & VENTAS HARDCODED (La Magia)
  // -------------------------------------------------------------
  const today = new Date();
  let totalAppointments = 0;
  const { data: dbServices } = await supabase.from('services').select('*');

  if (petIds.length > 0 && empIds.length > 0 && dbServices) {
      
      // RANGO: -35 días a +35 días
      for (let i = -35; i <= 35; i++) { 
        const day = new Date(today);
        day.setDate(today.getDate() + i);
        
        if (day.getDay() === 0) continue; // Cerrado domingos

        const isSaturday = day.getDay() === 6;
        const dailyCount = isSaturday ? 8 : 5; // Más trabajo en sábado

        for (let j = 0; j < dailyCount; j++) { 
            const stylists = empIds.filter(e => e.role !== 'reception');
            const emp = stylists[Math.floor(Math.random() * stylists.length)];
            const service = dbServices[Math.floor(Math.random() * dbServices.length)];
            const pet = petIds[Math.floor(Math.random() * petIds.length)];

            // Horario aleatorio
            const hour = 9 + j; // Distribuye una cita por hora aprox
            if (hour > 18) break;
            
            day.setHours(hour, 0, 0, 0); 
            const startTime = new Date(day);
            const endTime = addMinutes(startTime, service.duration_minutes);

            const isPast = i < 0; // Si el día es antes de hoy
            const status = isPast ? 'completed' : 'confirmed';
            
            // A. Crear Cita
            const { data: appt } = await supabase.from('appointments').insert({
                date: startTime.toISOString(),
                client_id: pet.client_id,
                pet_id: pet.id,
                status: status,
                price_charged: service.base_price,
                notes: isPast ? 'Servicio completado' : 'Reservado desde Demo'
            }).select().single();

            if (appt) {
                totalAppointments++;

                // B. Vincular Servicio-Empleado
                await supabase.from('appointment_services').insert({
                    appointment_id: appt.id,
                    service_id: service.id,
                    service_name: service.name,
                    price: service.base_price,
                    employee_id: emp.id,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString()
                });

                // C. HARDCODE DE VENTAS (Solo para citas pasadas)
                // Esto simula que Zettle ya procesó el pago y facturación.
                if (isPast) {
                    const hasProduct = Math.random() > 0.7; // 30% compra producto
                    let total = Number(service.base_price);
                    
                    // Construir Items para Nómina
                    const items = [{
                        name: service.name,
                        quantity: 1,
                        unit_price: service.base_price,
                        amount: service.base_price,
                        category: 'grooming' // <--- IMPORTANTE PARA EL POOL
                    }];

                    if (hasProduct) {
                        const prod = STORE_ITEMS[Math.floor(Math.random() * STORE_ITEMS.length)];
                        total += prod.price;
                        items.push({
                            name: prod.name,
                            quantity: 1,
                            unit_price: prod.price,
                            amount: prod.price,
                            category: 'store' // <--- IMPORTANTE PARA RECEPCIÓN
                        });
                    }

                    // Insertar Transacción "Facturada"
                    await supabase.from('sales_transactions').insert({
                        zettle_id: uuidv4(), // ID Simulado
                        timestamp: startTime.toISOString(),
                        total_amount: total,
                        tax_amount: total * 0.16, // Simulación de IVA (16%)
                        payment_method: Math.random() > 0.5 ? 'CARD' : 'CASH',
                        is_grooming: true, // Habilita reparto de pool
                        is_store: hasProduct,
                        items: items // JSON detallado
                    });
                }
            }
        }
      }
  }

  // -------------------------------------------------------------
  // 6. INCIDENTES (Faltas para probar deducciones)
  // -------------------------------------------------------------
  console.log('📉 Generando faltas...');
  if (empIds.length > 0) {
      const targetEmp = empIds[0]; 
      // Falta hace 3 días
      const d = subDays(new Date(), 3);
      await supabase.from('employee_absences').insert({
          employee_id: targetEmp.id,
          type: 'unjustified',
          start_date: d.toISOString(),
          end_date: d.toISOString(),
          reason: 'Prueba de Descuento Nómina'
      });
  }

  console.log(`✅ ${totalAppointments} citas generadas.`);
  console.log('🚀 ¡DEMO LISTO! Datos financieros inyectados correctamente.');
}

seed().catch((e) => {
    console.error("FATAL ERROR:", e);
});