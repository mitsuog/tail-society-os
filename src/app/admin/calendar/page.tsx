import { createClient } from '@/utils/supabase/server';
import { parseISO, isValid } from 'date-fns';
import { redirect } from 'next/navigation';
import CalendarBoard from '@/components/calendar/CalendarBoard'; 

export const dynamic = 'force-dynamic';

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // 1. VERIFICAR AUTENTICACIÓN
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. OBTENER ROL DEL USUARIO
  // Si no encuentra rol en la tabla, asigna 'employee' por defecto por seguridad
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  // Definimos el tipo explícitamente para evitar conflictos con TypeScript
  const userRole = (roleData?.role || 'employee') as 'admin' | 'manager' | 'receptionist' | 'employee';

  // 3. LÓGICA DE FECHA (Recuperada)
  let selectedDate = new Date();
  if (params.date) {
    const parsed = parseISO(params.date);
    if (isValid(parsed)) selectedDate = parsed;
  }
  
  // 4. LÓGICA DE VISTA (Recuperada)
  const currentView = (params.view as 'day' | 'week' | '3day' | 'month') || 'day';

  // 5. CARGAR EMPLEADOS (Recuperado)
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('active', true) 
    .order('first_name');

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col bg-slate-50/50">
      <div className="flex-1 overflow-hidden p-2 md:p-4">
        <CalendarBoard 
            currentDate={selectedDate} 
            view={currentView} 
            employees={employees || []}
            appointments={[]} 
            userRole={userRole} // Ahora 'userRole' ya está definido arriba
        />
      </div>
    </div>
  );
}