import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

// 1. CARGA SEGURA DE VARIABLES
dotenv.config({ path: path.resolve(process.cwd(), '.env.demo') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error CRÍTICO: No se encontraron las llaves en .env.demo");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- DATA MAESTRA ---

const EMPLOYEES = [
  { first_name: 'Ana', last_name: 'Estilista', role: 'stylist', color: '#ec4899', commission: 0.4 },
  { first_name: 'Carlos', last_name: 'Bañador', role: 'bather', color: '#3b82f6', commission: 0.3 },
  { first_name: 'Sofia', last_name: 'Recepción', role: 'reception', color: '#10b981', commission: 0.1 },
  { first_name: 'Miguel', last_name: 'Senior', role: 'stylist', color: '#f59e0b', commission: 0.45 }, // Nuevo
];

const SERVICES = [
  { name: 'Corte Schnauzer', price: 650, duration: 90 },
  { name: 'Corte Poodle', price: 750, duration: 120 },
  { name: 'Baño General', price: 400, duration: 60 },
  { name: 'Baño Medicado', price: 550, duration: 70 },
  { name: 'Deslanado Profundo', price: 800, duration: 120 },
  { name: 'Corte de Uñas', price: 150, duration: 15 },
];

const BREEDS = ['Schnauzer', 'Poodle', 'Golden Retriever', 'Bulldog', 'Mestizo', 'Chihuahua', 'Yorkie'];

const STORE_ITEMS = [
  { name: 'Shampoo Premium', price: 250 },
  { name: 'Juguete Hueso', price: 120 },
  { name: 'Correa Paseo', price: 350 },
  { name: 'Premios Bolsa', price: 90 },
];

// --- FUNCIÓN PRINCIPAL ---

async function seed() {
  console.log('🌱 Iniciando Super-Siembra en:', supabaseUrl);

  // 1. Crear Empleados
  const empIds = [];
  for (const emp of EMPLOYEES) {
    const { data, error } = await supabase.from('employees').insert({
      first_name: emp.first_name,
      last_name: emp.last_name,
      role: emp.role,
      color: emp.color,
      active: true,
      email: `${emp.first_name.toLowerCase()}@demo.com`,
      commission_rate: emp.commission 
    }).select('id').single();
    
    if (data) empIds.push(data);
  }
  console.log(`✅ ${empIds.length} empleados creados.`);

  // 2. Crear Clientes y Mascotas (Lógica 1:N)
  const petIds = []; // Guardamos IDs de mascotas para las citas
  const clientIds = [];

  for (let i = 0; i < 50; i++) { // Aumentado a 50 clientes
    const phone = `55${Math.floor(10000000 + Math.random() * 90000000)}`; 
    const isVip = Math.random() > 0.8;

    const { data: client } = await supabase.from('clients').insert({
      full_name: `Cliente Demo ${i+1}`,
      phone: phone, 
      email: `cliente${i}@demo.com`,
      internal_tags: isVip ? 'vip, frequent' : 'regular',
      status: 'active'
    }).select('id').single();

    if (client) {
        clientIds.push(client.id);
        
        // Lógica Multimascota: 20% de probabilidad de tener 2 perros
        const numPets = Math.random() > 0.8 ? 2 : 1;

        for (let p = 0; p < numPets; p++) {
            const breed = BREEDS[Math.floor(Math.random() * BREEDS.length)];
            const { data: pet } = await supabase.from('pets').insert({
                client_id: client.id,
                name: `Firulais ${i}-${p+1}`,
                breed: breed,
                size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
                status: 'active'
            }).select('id').single();
            
            if (pet) petIds.push({ id: pet.id, client_id: client.id });
        }
    }
  }
  console.log(`✅ ${clientIds.length} clientes y ${petIds.length} mascotas creadas.`);

  // 3. Generar Agenda y Ventas (Histórico y Futuro)
  const today = new Date();
  let totalAppointments = 0;
  
  // Rango: De -45 días atrás a +15 días adelante
  for (let i = -45; i < 15; i++) { 
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    
    // Saltamos Domingos (opcional, 0 es Domingo)
    if (day.getDay() === 0) continue;

    // Volumen diario variable: Entre 4 y 8 citas por día
    const dailyCount = Math.floor(Math.random() * 5) + 4;

    for (let j = 0; j < dailyCount; j++) { 
        if (petIds.length === 0) break;
        
        const emp = empIds[Math.floor(Math.random() * empIds.length)];
        const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
        
        // Seleccionar mascota aleatoria
        const selectedPet = petIds[Math.floor(Math.random() * petIds.length)];

        // Horario aleatorio entre 10am y 6pm
        const hour = 10 + Math.floor(Math.random() * 8); 
        day.setHours(hour, 0, 0, 0);
        const fullDate = day.toISOString();

        const isPast = i < 0;
        const status = isPast ? 'completed' : 'confirmed';
        
        // Insertar Cita
        const { data: appt } = await supabase.from('appointments').insert({
            date: fullDate,
            client_id: selectedPet.client_id,
            pet_id: selectedPet.id,
            status: status,
            price_charged: service.price,
            notes: `Servicio Demo: ${service.name}`
        }).select('id').single();

        totalAppointments++;

        // Si la cita ya pasó (Completed), generamos el dinero y detalle
        if (appt && isPast) {
            // Detalle del servicio
            await supabase.from('appointment_services').insert({
                appointment_id: appt.id,
                service_name: service.name,
                price: service.price,
                employee_id: emp.id,
                start_time: fullDate,
                end_time: fullDate
            });

            // --- LÓGICA ZETTLE (FACTOR DE VENTA) ---
            // 40% de probabilidad de comprar algo extra en tienda
            const boughtStoreItem = Math.random() > 0.6;
            let finalTotal = service.price;
            const items = [{
                name: service.name,
                quantity: 1,
                unit_price: service.price,
                amount: service.price,
                category: 'Grooming'
            }];

            if (boughtStoreItem) {
                const storeItem = STORE_ITEMS[Math.floor(Math.random() * STORE_ITEMS.length)];
                // Factor aleatorio de cantidad (1 o 2 items)
                const qty = Math.random() > 0.8 ? 2 : 1; 
                const itemTotal = storeItem.price * qty;
                
                finalTotal += itemTotal;
                items.push({
                    name: storeItem.name,
                    quantity: qty,
                    unit_price: storeItem.price,
                    amount: itemTotal,
                    category: 'Store' // Esto ayudará a diferenciar ingresos en gráficas
                });
            }

            // Insertar Transacción Zettle
            await supabase.from('sales_transactions').insert({
                zettle_id: uuidv4(),
                timestamp: fullDate,
                total_amount: finalTotal,
                tax_amount: finalTotal * 0.16, // IVA simulado
                is_grooming: true,
                is_store: boughtStoreItem,
                items: items // JSON con el desglose
            });
        }
    }
  }
  console.log(`✅ ${totalAppointments} citas agendadas.`);
  console.log('🚀 ¡Base de datos Demo lista y vitaminada!');
}

seed().catch(console.error);