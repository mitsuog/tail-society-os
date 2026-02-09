import { createClient } from '@/utils/supabase/server';
import { parseISO, isValid } from 'date-fns';
import CalendarBoard from '@/components/calendar/CalendarBoard';

// IMPORTANTE: Forzamos render dinámico para evitar caché de empleados antiguos
export const dynamic = 'force-dynamic';

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // 1. Lógica de Fecha (FIX ZONA HORARIA)
  // Al agregar T12:00:00, evitamos que la conversión a UTC reste un día
  let selectedDate = new Date();
  if (params.date) {
    const rawDate = params.date.includes('T') ? params.date : `${params.date}T12:00:00`;
    const parsed = parseISO(rawDate);
    if (isValid(parsed)) selectedDate = parsed;
  }
  
  const currentView = (params.view as 'day' | 'week' | '3day' | 'month') || 'day';

  // 2. Carga de Empleados
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('is_active', true) 
    .order('first_name');

  return (
    // FIX CSS: h-full y min-h-0 son vitales para que el scroll interno funcione
    <div className="w-full h-full flex flex-col overflow-hidden bg-white">
      <div className="flex-1 w-full h-full min-h-0 relative">
        <CalendarBoard 
            currentDate={selectedDate} 
            view={currentView} 
            employees={employees || []}
            appointments={[]} 
            userRole="admin" 
        />
      </div>
    </div>
  );
}