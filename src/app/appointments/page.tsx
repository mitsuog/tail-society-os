import { createClient } from '@/utils/supabase/server';
import { parseISO, isValid } from 'date-fns';
import CalendarBoard from '@/components/calendar/CalendarBoard';

// Forzamos render dinámico para evitar caché de empleados antiguos
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
  // CRÍTICO: Usamos 'active' (tu corrección local) porque es el nombre real en Supabase
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('active', true) 
    .order('first_name');

  return (
    // FIX CSS: Usamos la estructura robusta (h-full, bg-white) para que el scroll funcione bien
    <div className="w-full h-full flex flex-col overflow-hidden bg-white">
      <div className="flex-1 w-full h-full min-h-0 relative">
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