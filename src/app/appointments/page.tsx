import { createClient } from '@/utils/supabase/server';
import { parseISO, isValid } from 'date-fns';
import CalendarBoard from '@/components/calendar/CalendarBoard';

// Forzamos que esta página sea dinámica para que no cachee los empleados
export const dynamic = 'force-dynamic';

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // 1. Lógica de Fecha (Con corrección de zona horaria)
  // Agregamos 'T12:00:00' para evitar que el servidor (UTC) devuelva el día anterior
  let selectedDate = new Date();
  if (params.date) {
    const rawDate = params.date.includes('T') ? params.date : `${params.date}T12:00:00`;
    const parsed = parseISO(rawDate);
    if (isValid(parsed)) selectedDate = parsed;
  }
  
  // 2. Determinar la vista actual (por defecto 'day')
  const currentView = (params.view as 'day' | 'week' | '3day' | 'month') || 'day';

  // 3. Carga de Empleados
  // CORRECCIÓN IMPORTANTE: Usamos 'active' en lugar de 'is_active'
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('active', true) 
    .order('first_name');

  return (
    <div className="h-full w-full flex flex-col p-0 md:p-2 overflow-hidden">
      <div className="flex-1 w-full h-full min-h-0">
        <CalendarBoard 
            currentDate={selectedDate} 
            view={currentView} 
            employees={employees || []}
            appointments={[]} // Las citas se cargan en el cliente (CalendarBoard)
            userRole="admin" 
        />
      </div>
    </div>
  );
}