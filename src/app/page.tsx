import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { CalendarPlus, Search } from 'lucide-react';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { startOfWeek, endOfWeek, subWeeks, format, startOfDay, endOfDay, startOfMonth } from 'date-fns';
import DraggableDashboard from '@/components/dashboard/DraggableDashboard';
import { WIDGET_CATALOG } from '@/components/dashboard/WidgetRegistry';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Detección de Usuario y Rol
  let role = 'employee';
  let displayName = 'Usuario';
  if (user) {
      const { data: emp } = await supabase.from('employees').select('role, first_name').eq('id', user.id).single();
      if (emp) {
          role = emp.role;
          displayName = emp.first_name;
      } else {
          displayName = user.user_metadata?.first_name || 'Admin';
      }
  }

  // 2. Saludo
  const hour = Number(new Date().toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Monterrey' }));
  let greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  
  // Widgets Permitidos
  const allowedWidgets = Object.keys(WIDGET_CATALOG).filter(key => {
    const w = WIDGET_CATALOG[key as keyof typeof WIDGET_CATALOG];
    return w.roles.includes('all') || w.roles.includes(role);
  });

  // 3. Layout
  let userLayout: string[] = ['stats_overview', 'live_operations', 'quick_actions', 'staff_status', 'agenda_timeline', 'weather'];
  
  if (user) {
    const { data: settings } = await supabase.from('user_settings').select('dashboard_layout').eq('user_id', user.id).single();
    if (settings && settings.dashboard_layout && settings.dashboard_layout.length > 0) {
      userLayout = settings.dashboard_layout;
    }
  }

  // 4. Fechas
  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd'T'00:00:00");

  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd'T'00:00:00");
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd'T'23:59:59");
  const prevWeekStart = format(subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1), "yyyy-MM-dd'T'00:00:00");
  const prevWeekEnd = format(subWeeks(endOfWeek(now, { weekStartsOn: 1 }), 1), "yyyy-MM-dd'T'23:59:59");

  // ---------------------------------------------------------------------------
  // 5. FETCHING
  // ---------------------------------------------------------------------------

  // A. Métricas Financieras
  const getSimpleMetrics = async (start: string, end: string) => {
      const { data } = await supabase.from('view_finance_appointments').select('final_price, status').gte('date', start).lte('date', end);
      if (!data) return { revenue: 0, count: 0, pending: 0 };
      const valid = data.filter((a:any) => ['completed', 'attended'].includes(a.status));
      const pending = data.filter((a:any) => !['cancelled', 'no_show', 'completed', 'attended'].includes(a.status));
      const revenue = valid.reduce((acc: number, curr: any) => acc + (Number(curr.final_price) || 0), 0);
      return { revenue, count: valid.length, pending: pending.length };
  };

  // B. Agenda y Operaciones
  const getServicesData = async () => {
    const { data, error } = await supabase
      .from('appointment_services')
      .select(`
        id,
        service_name,
        category,
        appointments!inner (
          id,
          start_time,
          status,
          pets (name)
        )
      `)
      .gte('appointments.start_time', todayStart)
      .lte('appointments.start_time', todayEnd)
      .neq('appointments.status', 'cancelled');

    if (error) {
      console.error("Error fetching services:", error);
      return [];
    }
    return data;
  };

  const servicesRaw = await getServicesData();

  // Procesar Agenda
  const agenda = servicesRaw.map((item: any) => {
      // Manejo seguro de pets (array u objeto)
      const petsData = item.appointments?.pets as any;
      const petName = Array.isArray(petsData) 
          ? petsData[0]?.name 
          : petsData?.name;

      return {
          id: item.id,
          start_time: item.appointments?.start_time,
          pet_name: petName || 'Mascota',
          status: item.appointments?.status,
          service_name: item.service_name,
          service_category: (item.category || 'baño').toLowerCase()
      };
  });

  // Procesar Operaciones en Vivo
  const processLiveOperations = () => {
    let waiting = 0, bathing = 0, cutting = 0, ready = 0;
    
    const processedAppts = new Set();
    
    servicesRaw.forEach((item: any) => {
      const apptId = item.appointments.id;
      const status = item.appointments.status;
      const category = (item.category || '').toLowerCase();

      // Estados Globales de la Cita
      if (!processedAppts.has(apptId)) {
        if (status === 'checked_in' || status === 'confirmed') waiting++;
        if (status === 'completed') ready++;
        processedAppts.add(apptId);
      }

      // Estados de Proceso (por servicio)
      if (status === 'in_process' || status === 'attended') {
        if (category.includes('corte') || category.includes('cut') || category.includes('estilo')) {
          cutting++;
        } else {
          bathing++;
        }
      }
    });

    return { waiting, bathing, cutting, ready, total: (waiting + bathing + cutting + ready) };
  };

  const operations = processLiveOperations();

  // C. Semanal
  const getWeeklyData = async () => {
    const { data: curr } = await supabase.from('view_finance_appointments').select('date, final_price').gte('date', weekStart).lte('date', weekEnd).in('status', ['completed', 'attended']);
    const dailyTotals = new Array(7).fill(0);
    const daysMap = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    curr?.forEach((a: any) => {
        let d = new Date(a.date).getDay() - 1; if (d === -1) d = 6;
        dailyTotals[d] += (Number(a.final_price) || 0);
    });
    const totalWeek = dailyTotals.reduce((a, b) => a + b, 0);
    const maxVal = Math.max(...dailyTotals, 1);
    
    return { 
        weeklyData: dailyTotals.map((val, i) => ({ day: daysMap[i], value: val, heightPct: Math.round((val / maxVal) * 100) })), 
        growthPercentage: 0, 
        formattedRevenue: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(totalWeek) 
    };
  };

  // D. Estado del Staff (CORREGIDO EL ERROR DE TIPADO AQUÍ)
  const getStaffStatus = async () => {
    const { data: employees } = await supabase.from('employees').select('id, first_name').eq('active', true);
    if (!employees) return [];

    const { data: activeAppts } = await supabase
        .from('appointments')
        .select('employee_id, pets(name)')
        .eq('status', 'in_process') 
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd);

    return employees.map(emp => {
        const activeJob = activeAppts?.find((a: any) => a.employee_id === emp.id);
        
        // --- CORRECCIÓN AQUÍ ---
        // Forzamos pets como 'any' para evitar el error 'property name does not exist on type never'
        const petsData = activeJob?.pets as any; 
        
        const petName = petsData 
            ? (Array.isArray(petsData) ? petsData[0]?.name : petsData.name)
            : undefined;

        return {
            id: emp.id,
            name: emp.first_name,
            status: (activeJob ? 'busy' : 'free') as 'busy' | 'free' | 'break',
            current_pet: petName
        };
    });
  };

  // 6. EJECUCIÓN FINAL
  const [todayM, monthM, weekly, staff] = await Promise.all([
      getSimpleMetrics(todayStart, todayEnd),
      getSimpleMetrics(monthStart, todayEnd),
      getWeeklyData(),
      getStaffStatus()
  ]);

  const dashboardData = {
    today: { ...todayM, formattedRevenue: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(todayM.revenue) },
    month: { ...monthM, formattedRevenue: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(monthM.revenue) },
    recentClients: [],
    agenda,       
    weekly, 
    operations,
    staff
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{greeting}, {displayName} <span className="inline-block animate-wave">👋</span></h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">Centro de Mando Operativo.</p>
          </div>
          <div className="flex gap-2">
             <Link href="/admin/clients"><Button variant="outline" className="bg-white border-slate-200 text-slate-600"><Search className="mr-2 h-4 w-4" /> Buscar</Button></Link>
             <NewAppointmentDialog customTrigger={<Button className="bg-slate-900 text-white"><CalendarPlus className="mr-2 h-4 w-4" /> Nueva Cita</Button>} />
          </div>
        </div>
        <DraggableDashboard initialLayout={userLayout} availableWidgets={allowedWidgets} data={dashboardData} />
      </div>
    </div>
  );
}