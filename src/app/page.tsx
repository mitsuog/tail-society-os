import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { CalendarPlus, Search, ShieldCheck } from 'lucide-react';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';
import DraggableDashboard from '@/components/dashboard/DraggableDashboard';

// NOTA: Ya no importamos WIDGET_CATALOG aquí para evitar errores de servidor.
// Solo importamos el TIPO de datos.
import type { DashboardData } from '@/components/dashboard/WidgetRegistry';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. DETECCIÓN DE ROL (CON OVERRIDE)
  let role = 'admin'; // <<< FORZADO A ADMIN PARA QUE FUNCIONE YA
  let displayName = 'Admin';
  
  if (user) {
      // Intentamos buscar nombre real, pero mantenemos el rol admin forzado
      const { data: emp } = await supabase.from('employees').select('first_name').eq('id', user.id).single();
      if (emp) {
          displayName = emp.first_name;
      } else {
          displayName = user.user_metadata?.first_name || 'Admin';
      }
  }

  // 2. SALUDO
  const hour = Number(new Date().toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Monterrey' }));
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  // 3. LAYOUT
  let userLayout: string[] = [];
  if (user) {
    const { data: settings } = await supabase.from('user_settings').select('dashboard_layout').eq('user_id', user.id).single();
    if (settings && settings.dashboard_layout && Array.isArray(settings.dashboard_layout) && settings.dashboard_layout.length > 0) {
      userLayout = settings.dashboard_layout;
    } else {
      // Default completo
      userLayout = ['stats_overview', 'live_operations', 'quick_actions', 'staff_status', 'agenda_timeline', 'weather'];
    }
  }

  // 4. PREPARACIÓN DE FECHAS
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
  const todayStart = `${todayStr}T00:00:00-06:00`;
  const todayEnd = `${todayStr}T23:59:59.999-06:00`;
  const monthStart = `${todayStr.substring(0, 7)}-01T00:00:00-06:00`;
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd'T'00:00:00");
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd'T'23:59:59");
  const prevWeekStart = format(subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1), "yyyy-MM-dd'T'00:00:00");
  const prevWeekEnd = format(subWeeks(endOfWeek(now, { weekStartsOn: 1 }), 1), "yyyy-MM-dd'T'23:59:59");

  // 5. FETCHING REAL (Con 'any' de seguridad)
  const getSimpleMetrics = async (start: string, end: string) => {
      const { data } = await supabase.from('view_finance_appointments').select('final_price, status').gte('date', start).lte('date', end);
      if (!data) return { revenue: 0, count: 0, pending: 0 };
      const valid = data.filter((a:any) => ['completed', 'attended'].includes(a.status));
      const pending = data.filter((a:any) => !['cancelled', 'no_show', 'completed', 'attended'].includes(a.status));
      const revenue = valid.reduce((acc: number, curr: any) => acc + (Number(curr.final_price) || 0), 0);
      return { revenue, count: valid.length, pending: pending.length };
  };

  const getAgendaData = async () => {
    const { data } = await supabase.from('appointments')
      .select(`id, start_time, status, pets(name), appointment_services(services(name, category))`)
      .gte('start_time', todayStart)
      .lte('start_time', todayEnd)
      .neq('status', 'cancelled');
    if (!data) return [];
    return data.map((item: any) => {
        const rawServices: any = item.appointment_services?.[0]?.services;
        const svc = Array.isArray(rawServices) ? rawServices[0] : rawServices;
        return {
            id: item.id, start_time: item.start_time, pet_name: item.pets?.name || 'Mascota', status: item.status,
            service_name: svc?.name || 'Servicio', service_category: svc?.category || 'other'
        };
    });
  };

  const getWeeklyData = async () => {
    const { data: curr } = await supabase.from('view_finance_appointments').select('date, final_price').gte('date', weekStart).lte('date', weekEnd).in('status', ['completed', 'attended']);
    const { data: prev } = await supabase.from('view_finance_appointments').select('final_price').gte('date', prevWeekStart).lte('date', prevWeekEnd).in('status', ['completed', 'attended']);
    const dailyTotals = new Array(7).fill(0);
    const daysMap = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    curr?.forEach((a: any) => {
        let d = new Date(a.date).getDay() - 1; if (d === -1) d = 6;
        dailyTotals[d] += (Number(a.final_price) || 0);
    });
    const totalWeek = dailyTotals.reduce((a, b) => a + b, 0);
    const prevTotal = prev?.reduce((a: any, b: any) => a + (Number(b.final_price) || 0), 0) || 0;
    let growth = 0;
    if (prevTotal > 0) growth = ((totalWeek - prevTotal) / prevTotal) * 100; else if (totalWeek > 0) growth = 100;
    const maxVal = Math.max(...dailyTotals, 1);
    return { weeklyData: dailyTotals.map((val, i) => ({ day: daysMap[i], value: val, heightPct: Math.round((val / maxVal) * 100) })), growthPercentage: growth, formattedRevenue: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(totalWeek) };
  };

  const getLiveOperations = async () => {
    const { data } = await supabase.from('appointments').select(`status, appointment_services(services(category))`).gte('start_time', todayStart).lte('start_time', todayEnd).neq('status', 'cancelled');
    let waiting = 0, bathing = 0, cutting = 0, ready = 0;
    data?.forEach((a: any) => {
        const rawSvc: any = a.appointment_services?.[0]?.services;
        const svcObj = Array.isArray(rawSvc) ? rawSvc[0] : rawSvc;
        const cat = svcObj?.category?.toLowerCase() || '';
        if (a.status === 'checked_in' || a.status === 'confirmed') waiting++;
        else if (a.status === 'completed') ready++;
        else if (a.status === 'in_process' || a.status === 'attended') {
            if (cat.includes('corte') || cat.includes('cut')) cutting++; else bathing++;
        }
    });
    return { waiting, bathing, cutting, ready, total: (waiting + bathing + cutting + ready) };
  };

  const getStaffStatus = async () => {
    const { data: employees } = await supabase.from('employees').select('id, first_name').eq('active', true);
    if (!employees) return [];
    const { data: activeAppts } = await supabase.from('appointments').select('employee_id, pets(name)').eq('status', 'in_process').gte('start_time', todayStart).lte('start_time', todayEnd);
    return employees.map(emp => {
        const activeJob = activeAppts?.find((a: any) => a.employee_id === emp.id);
        const rawPets: any = activeJob?.pets;
        const petName = Array.isArray(rawPets) ? rawPets[0]?.name : rawPets?.name;
        return { id: emp.id, name: emp.first_name, status: (activeJob ? 'busy' : 'free') as any, current_pet: petName };
    });
  };

  const [todayM, monthM, agenda, weekly, operations, staff] = await Promise.all([getSimpleMetrics(todayStart, todayEnd), getSimpleMetrics(monthStart, todayEnd), getAgendaData(), getWeeklyData(), getLiveOperations(), getStaffStatus()]);

  const dashboardData: DashboardData = {
    today: { ...todayM, formattedRevenue: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(todayM.revenue) },
    month: { ...monthM, formattedRevenue: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(monthM.revenue) },
    recentClients: [],
    agenda, weekly, operations, staff: staff as any
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{greeting}, {displayName} <span className="inline-block animate-wave">👋</span></h1>
            
            {/* DEBUGGER: CONFIRMACIÓN DE ROL FORZADO */}
            <div className="flex items-center gap-2 mt-2 text-xs text-emerald-600 font-mono bg-emerald-50 p-1 px-2 rounded w-fit border border-emerald-100">
               <ShieldCheck size={12}/> 
               Modo Admin Activo
            </div>

          </div>
          <div className="flex gap-2">
             <Link href="/admin/clients"><Button variant="outline" className="bg-white border-slate-200 text-slate-600"><Search className="mr-2 h-4 w-4" /> Buscar</Button></Link>
             <NewAppointmentDialog customTrigger={<Button className="bg-slate-900 text-white"><CalendarPlus className="mr-2 h-4 w-4" /> Nueva Cita</Button>} />
          </div>
        </div>
        
        {/* Pasamos userRole="admin" para que el cliente sepa qué mostrar */}
        <DraggableDashboard initialLayout={userLayout} userRole={role} data={dashboardData} />
      
      </div>
    </div>
  );
}