import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { 
  CalendarPlus, Search 
} from 'lucide-react';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { startOfWeek, endOfWeek, subWeeks, format, parseISO, getHours } from 'date-fns';
import DraggableDashboard from '@/components/dashboard/DraggableDashboard';
import { WIDGET_CATALOG } from '@/components/dashboard/WidgetRegistry';

export const dynamic = 'force-dynamic';

// --- UTILS ---
const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('es-MX', { 
    style: 'currency', 
    currency: 'MXN', 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// --- PÁGINA PRINCIPAL (SERVER COMPONENT) ---

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. OBTENER USUARIO Y ROL
  const { data: { user } } = await supabase.auth.getUser();
  
  let role = 'employee';
  let displayName = 'Usuario';

  if (user) {
      const { data: employeeData } = await supabase
        .from('employees')
        .select('role, first_name, last_name')
        .eq('id', user.id)
        .single();
      
      if (employeeData) {
          role = employeeData.role;
          displayName = employeeData.first_name;
      } else {
          // Fallback a metadata si no existe registro de empleado
          displayName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || 'Usuario';
          role = user.user_metadata?.role || 'employee'; 
      }
  }

  // 2. LÓGICA DE SALUDO (Monterrey Time)
  const hour = Number(new Date().toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Monterrey' }));
  let greeting = 'Buenos días';
  if (hour >= 12) greeting = 'Buenas tardes';
  if (hour >= 19) greeting = 'Buenas noches';

  // 3. DEFINIR PERMISOS Y WIDGETS PERMITIDOS
  const canViewFinancials = ['admin', 'manager', 'receptionist'].includes(role);

  // Filtramos el catálogo: Solo pasamos los IDs de widgets que este rol tiene permiso de ver
  const allowedWidgets = Object.keys(WIDGET_CATALOG).filter(key => {
    // Cast necesario para TypeScript para usar la clave como índice
    const widgetId = key as keyof typeof WIDGET_CATALOG;
    const widgetDef = WIDGET_CATALOG[widgetId];
    return widgetDef.roles.includes('all') || widgetDef.roles.includes(role);
  });

  // 4. OBTENER LAYOUT GUARDADO DEL USUARIO
  let userLayout: string[] = [];
  if (user) {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('dashboard_layout')
      .eq('user_id', user.id)
      .single();
    
    // Si existe configuración previa, la usamos.
    if (settings?.dashboard_layout && Array.isArray(settings.dashboard_layout)) {
      userLayout = settings.dashboard_layout;
    }
  }

  // 5. PREPARAR FECHAS PARA CONSULTAS
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
  const todayStart = `${todayStr}T00:00:00-06:00`;
  const todayEnd = `${todayStr}T23:59:59.999-06:00`;
  const currentMonthStr = todayStr.substring(0, 7); 
  const monthStart = `${currentMonthStr}-01T00:00:00-06:00`;

  const weekStartObj = startOfWeek(now, { weekStartsOn: 1 });
  const weekEndObj = endOfWeek(now, { weekStartsOn: 1 });
  const weekStart = format(weekStartObj, "yyyy-MM-dd'T'00:00:00");
  const weekEnd = format(weekEndObj, "yyyy-MM-dd'T'23:59:59");

  const prevWeekStartObj = subWeeks(weekStartObj, 1);
  const prevWeekEndObj = subWeeks(weekEndObj, 1);
  const prevWeekStart = format(prevWeekStartObj, "yyyy-MM-dd'T'00:00:00");
  const prevWeekEnd = format(prevWeekEndObj, "yyyy-MM-dd'T'23:59:59");

  // 6. FUNCIONES DE FETCHING DE DATOS (Optimizadas)

  // A. Métricas Generales (Ingresos/Conteo)
  const getSimpleMetrics = async (start: string, end: string) => {
      // Si no tiene permisos financieros, ahorramos cálculo de 'revenue' detallado
      const selectQuery = canViewFinancials ? 'final_price, status' : 'status';
      
      const { data } = await supabase.from('view_finance_appointments')
        .select(selectQuery)
        .gte('date', start)
        .lte('date', end);

      if (!data) return { revenue: 0, count: 0, pending: 0 };
      
      const valid = data.filter((a:any) => ['completed', 'attended'].includes(a.status));
      const pending = data.filter((a:any) => !['cancelled', 'no_show', 'completed', 'attended'].includes(a.status));
      
      const revenue = canViewFinancials 
        ? valid.reduce((acc: number, curr: any) => acc + (Number(curr.final_price) || 0), 0)
        : 0;

      return { revenue, count: valid.length, pending: pending.length };
  };

  // B. Agenda Visual (Datos para las bolitas de colores)
  const getAgendaData = async () => {
    const { data: rawAgenda } = await supabase
      .from('appointments')
      .select(`
          id, start_time, status,
          pets ( name ),
          appointment_services ( services ( name, category ) )
      `)
      .gte('start_time', todayStart)
      .lte('start_time', todayEnd)
      .neq('status', 'cancelled');

    if (!rawAgenda) return [];

    return rawAgenda.map((item: any) => {
        const svc = item.appointment_services?.[0]?.services;
        return {
            id: item.id,
            start_time: item.start_time,
            pet_name: item.pets?.name || 'Mascota',
            service_name: svc?.name || 'Servicio',
            service_category: svc?.category || 'other'
        };
    });
  };

  // C. Gráfico Semanal (Solo financieros)
  const getWeeklyData = async () => {
    if (!canViewFinancials) return { weeklyData: [], growthPercentage: 0, totalWeekRevenue: 0 };

    const { data: currentWeekRaw } = await supabase.from('view_finance_appointments')
      .select('date, final_price, status')
      .gte('date', weekStart)
      .lte('date', weekEnd)
      .in('status', ['completed', 'attended']);

    const { data: prevWeekRaw } = await supabase.from('view_finance_appointments')
      .select('final_price')
      .gte('date', prevWeekStart)
      .lte('date', prevWeekEnd)
      .in('status', ['completed', 'attended']);

    const dailyTotals = new Array(7).fill(0);
    const daysMap = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    currentWeekRaw?.forEach((appt: any) => {
        const date = new Date(appt.date);
        let dayIndex = date.getDay() - 1; 
        if (dayIndex === -1) dayIndex = 6;
        dailyTotals[dayIndex] += (Number(appt.final_price) || 0);
    });

    const totalWeekRevenue = dailyTotals.reduce((a, b) => a + b, 0);
    const prevWeekTotal = prevWeekRaw?.reduce((acc: number, curr: any) => acc + (Number(curr.final_price) || 0), 0) || 0;
    
    let growthPercentage = 0;
    if (prevWeekTotal > 0) {
        growthPercentage = ((totalWeekRevenue - prevWeekTotal) / prevWeekTotal) * 100;
    } else if (totalWeekRevenue > 0) {
        growthPercentage = 100;
    }

    const maxVal = Math.max(...dailyTotals, 1);
    const weeklyData = dailyTotals.map((val, i) => ({
        day: daysMap[i],
        value: val,
        heightPct: Math.round((val / maxVal) * 100)
    }));

    return { weeklyData, growthPercentage, totalWeekRevenue };
  };

  // 7. EJECUCIÓN PARALELA DE PROMESAS
  const [todayMetrics, monthMetrics, recentClients, agendaItems, weeklyStats] = await Promise.all([
      getSimpleMetrics(todayStart, todayEnd),
      getSimpleMetrics(monthStart, todayEnd),
      supabase.from('clients')
        .select('id, full_name, created_at, pets(count)')
        .order('created_at', { ascending: false })
        .limit(6),
      getAgendaData(),
      getWeeklyData()
  ]);

  // 8. EMPAQUETAR DATOS PARA EL CLIENTE
  // Este objeto 'data' se pasará a cada widget, que sabrá qué propiedad leer.
  const dashboardData = {
    today: {
      ...todayMetrics,
      formattedRevenue: formatMoney(todayMetrics.revenue)
    },
    month: {
      ...monthMetrics,
      formattedRevenue: formatMoney(monthMetrics.revenue)
    },
    recentClients: recentClients.data || [],
    agenda: agendaItems,
    weekly: {
      ...weeklyStats,
      formattedRevenue: formatMoney(weeklyStats.totalWeekRevenue)
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8 space-y-6">
        
        {/* HEADER FIJO (No arrastrable) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {greeting}, {displayName} <span className="inline-block animate-wave">👋</span>
            </h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">
              Bienvenido a tu panel de control personalizado.
            </p>
          </div>
          
          <div className="flex gap-2">
             <Link href="/admin/clients">
                <Button variant="outline" className="bg-white border-slate-200 shadow-sm text-slate-600 hover:bg-slate-50">
                    <Search className="mr-2 h-4 w-4" /> Buscar Cliente
                </Button>
             </Link>
             <NewAppointmentDialog 
                customTrigger={
                  <Button className="bg-slate-900 text-white hover:bg-slate-800 shadow-md">
                    <CalendarPlus className="mr-2 h-4 w-4" /> Nueva Cita
                  </Button>
                }
             />
          </div>
        </div>

        {/* COMPONENTE CLIENTE: GRID DRAG & DROP */}
        <DraggableDashboard 
            initialLayout={userLayout}
            availableWidgets={allowedWidgets}
            data={dashboardData}
        />

      </div>
    </div>
  );
}