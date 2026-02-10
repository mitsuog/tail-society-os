import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { CalendarPlus, Search } from 'lucide-react';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';
import DraggableDashboard from '@/components/dashboard/DraggableDashboard';
import { WIDGET_CATALOG } from '@/components/dashboard/WidgetRegistry';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Obtener Usuario
  const { data: { user } } = await supabase.auth.getUser();
  
  let role = 'employee';
  let displayName = 'Usuario';

  if (user) {
      const { data: employeeData } = await supabase.from('employees').select('role, first_name').eq('id', user.id).single();
      if (employeeData) {
          role = employeeData.role;
          displayName = employeeData.first_name;
      } else {
          displayName = user.user_metadata?.first_name || 'Usuario';
          role = user.user_metadata?.role || 'employee'; 
      }
  }

  // 2. Saludo
  const hour = Number(new Date().toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Monterrey' }));
  let greeting = 'Buenos días';
  if (hour >= 12) greeting = 'Buenas tardes';
  if (hour >= 19) greeting = 'Buenas noches';

  // 3. Permisos
  const canViewFinancials = ['admin', 'manager', 'receptionist'].includes(role);
  
  // Widgets Permitidos
  const allowedWidgets = Object.keys(WIDGET_CATALOG).filter(key => {
    const w = WIDGET_CATALOG[key as keyof typeof WIDGET_CATALOG];
    return w.roles.includes('all') || w.roles.includes(role);
  });

// 4. Layout
  let userLayout: string[] = [];
  
  if (user) {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('dashboard_layout')
      .eq('user_id', user.id)
      .single();
    
    // FIX: Si existe pero está vacío, O si no existe, usar default.
    if (settings?.dashboard_layout && Array.isArray(settings.dashboard_layout) && settings.dashboard_layout.length > 0) {
      userLayout = settings.dashboard_layout;
    } else {
      // DEFAULT LAYOUT: Forzamos esto si no hay nada guardado
      // Agregaremos los nuevos widgets que diseñaremos abajo
      userLayout = [
        'stats_overview', // Nuevo
        'live_operations', // Nuevo
        'staff_status',    // Nuevo
        'agenda_timeline', 
        'quick_actions',   // Nuevo
        'revenue_month'
      ];
    }
  }

  // 5. Fechas
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
  const todayStart = `${todayStr}T00:00:00-06:00`;
  const todayEnd = `${todayStr}T23:59:59.999-06:00`;
  const monthStart = `${todayStr.substring(0, 7)}-01T00:00:00-06:00`;
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd'T'00:00:00");
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd'T'23:59:59");
  const prevWeekStart = format(subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1), "yyyy-MM-dd'T'00:00:00");
  const prevWeekEnd = format(subWeeks(endOfWeek(now, { weekStartsOn: 1 }), 1), "yyyy-MM-dd'T'23:59:59");

  // 6. Data Fetching
  const getSimpleMetrics = async (start: string, end: string) => {
      const select = canViewFinancials ? 'final_price, status' : 'status';
      const { data } = await supabase.from('view_finance_appointments').select(select).gte('date', start).lte('date', end);
      if (!data) return { revenue: 0, count: 0, pending: 0 };
      const valid = data.filter((a:any) => ['completed', 'attended'].includes(a.status));
      const pending = data.filter((a:any) => !['cancelled', 'no_show', 'completed', 'attended'].includes(a.status));
      const revenue = canViewFinancials ? valid.reduce((acc: number, curr: any) => acc + (Number(curr.final_price) || 0), 0) : 0;
      return { revenue, count: valid.length, pending: pending.length };
  };

  const getAgendaData = async () => {
    const { data } = await supabase.from('appointments').select(`id, start_time, status, pets(name), appointment_services(services(name, category))`).gte('start_time', todayStart).lte('start_time', todayEnd).neq('status', 'cancelled');
    if (!data) return [];
    return data.map((item: any) => ({
        id: item.id,
        start_time: item.start_time,
        pet_name: item.pets?.name || 'Mascota',
        service_name: item.appointment_services?.[0]?.services?.name || 'Servicio',
        service_category: item.appointment_services?.[0]?.services?.category || 'other'
    }));
  };

  const getWeeklyData = async () => {
    if (!canViewFinancials) return { weeklyData: [], growthPercentage: 0, totalWeekRevenue: 0 };
    const { data: curr } = await supabase.from('view_finance_appointments').select('date, final_price').gte('date', weekStart).lte('date', weekEnd).in('status', ['completed', 'attended']);
    const { data: prev } = await supabase.from('view_finance_appointments').select('final_price').gte('date', prevWeekStart).lte('date', prevWeekEnd).in('status', ['completed', 'attended']);

    const dailyTotals = new Array(7).fill(0);
    const daysMap = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    curr?.forEach((a: any) => {
        let d = new Date(a.date).getDay() - 1;
        if (d === -1) d = 6;
        dailyTotals[d] += (Number(a.final_price) || 0);
    });

    const totalWeek = dailyTotals.reduce((a, b) => a + b, 0);
    const prevTotal = prev?.reduce((a: any, b: any) => a + (Number(b.final_price) || 0), 0) || 0;
    let growth = 0;
    if (prevTotal > 0) growth = ((totalWeek - prevTotal) / prevTotal) * 100;
    else if (totalWeek > 0) growth = 100;

    const maxVal = Math.max(...dailyTotals, 1);
    return {
        weeklyData: dailyTotals.map((val, i) => ({ day: daysMap[i], value: val, heightPct: Math.round((val / maxVal) * 100) })),
        growthPercentage: growth,
        totalWeekRevenue: totalWeek
    };
  };

  const [todayM, monthM, clients, agenda, weekly] = await Promise.all([
      getSimpleMetrics(todayStart, todayEnd),
      getSimpleMetrics(monthStart, todayEnd),
      supabase.from('clients').select('id, full_name, created_at, pets(count)').order('created_at', { ascending: false }).limit(6),
      getAgendaData(),
      getWeeklyData()
  ]);

  const dashboardData = {
    today: { ...todayM, formattedRevenue: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(todayM.revenue) },
    month: { ...monthM, formattedRevenue: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(monthM.revenue) },
    recentClients: clients.data || [],
    agenda,
    weekly: { ...weekly, formattedRevenue: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(weekly.totalWeekRevenue) }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{greeting}, {displayName} <span className="inline-block animate-wave">👋</span></h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">Panel de control personalizado.</p>
          </div>
          <div className="flex gap-2">
             <Link href="/admin/clients"><Button variant="outline" className="bg-white border-slate-200 text-slate-600"><Search className="mr-2 h-4 w-4" /> Buscar Cliente</Button></Link>
             <NewAppointmentDialog customTrigger={<Button className="bg-slate-900 text-white"><CalendarPlus className="mr-2 h-4 w-4" /> Nueva Cita</Button>} />
          </div>
        </div>
        <DraggableDashboard initialLayout={userLayout} availableWidgets={allowedWidgets} data={dashboardData} />
      </div>
    </div>
  );
}