import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Banknote, CalendarCheck, Users, TrendingUp, 
  MapPin, Sun, ArrowUpRight, ArrowDownRight,
  CalendarPlus, Search, ArrowRight
} from 'lucide-react';
import { cn } from "@/lib/utils";
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';

export const dynamic = 'force-dynamic';

// --- TIPOS ---
interface WeeklyMetric {
  day: string;
  value: number;
  heightPct: number;
}

// --- UTILS ---
const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('es-MX', { 
    style: 'currency', 
    currency: 'MXN', 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// --- COMPONENTES VISUALES (BENTO UI) ---

function WeatherWidget() {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-xl overflow-hidden relative group">
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-all duration-500"></div>
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-blue-400/30 rounded-full blur-xl"></div>

      <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full min-h-[180px]">
        <div>
          <div className="flex items-center gap-1.5 text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1">
            <MapPin size={10} /> San Pedro Garza García, NL
          </div>
          <div className="flex items-center gap-3">
            <h3 className="text-4xl font-bold tracking-tighter">24°</h3>
            <Sun className="h-8 w-8 text-yellow-300 animate-pulse" />
          </div>
          <p className="text-blue-100 text-xs font-medium mt-1">Mayormente Soleado</p>
        </div>

        <div className="flex items-center justify-between mt-4 border-t border-white/20 pt-3">
          <div className="flex flex-col text-center">
            <span className="text-[10px] text-blue-200">Humedad</span>
            <span className="text-xs font-bold">45%</span>
          </div>
          <div className="flex flex-col text-center">
            <span className="text-[10px] text-blue-200">Viento</span>
            <span className="text-xs font-bold">12km/h</span>
          </div>
          <div className="flex flex-col text-center">
            <span className="text-[10px] text-blue-200">Mañana</span>
            <span className="text-xs font-bold">26°</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BentoMetric({ title, value, subtext, icon: Icon, className, trend, href }: any) {
  const Content = (
    <Card className={cn(
      "flex flex-col justify-between shadow-sm border-slate-200 hover:shadow-md transition-all duration-300 group h-full", 
      href && "cursor-pointer hover:border-blue-300", 
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        <div className={cn("p-2 rounded-full bg-slate-50 group-hover:bg-slate-100 transition-colors", 
          trend === 'up' ? "text-emerald-600" : "text-slate-600")}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-slate-500 flex items-center">
            {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-emerald-500 mr-1" />}
            {subtext}
            </p>
            {href && <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-blue-500 transition-colors" />}
        </div>
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{Content}</Link>;
  return Content;
}

function RecentClientsList({ clients }: { clients: any[] }) {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-2 shadow-sm border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-bold text-slate-900">Actividad Reciente</CardTitle>
          <p className="text-xs text-slate-500">Últimos clientes registrados</p>
        </div>
        <Link href="/admin/clients">
          <Button variant="ghost" size="sm" className="text-xs h-8 text-blue-600 hover:bg-blue-50">
            Ir al Buscador <ArrowRight className="ml-1 h-3 w-3"/>
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="px-0">
        <div className="flex flex-col">
          {clients.slice(0, 5).map((client, i) => (
            <div key={client.id} className="flex items-center justify-between py-3 px-6 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                  {client.full_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{client.full_name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Users size={10} /> {client.pets?.length || 0} Mascotas
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-[10px] font-normal text-slate-500 border-slate-200">
                  {new Date(client.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                </Badge>
              </div>
            </div>
          ))}
          {clients.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-400">Sin actividad reciente.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// --- PÁGINA PRINCIPAL (SERVER COMPONENT) ---

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Obtener Usuario y Rol Real
  const { data: { user } } = await supabase.auth.getUser();
  
  // Buscar datos del empleado para saber el rol y nombre
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
          displayName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || 'Usuario';
          role = user.user_metadata?.role || 'employee'; 
      }
  }

  // Lógica de Saludo
  const hour = Number(new Date().toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Monterrey' }));
  let greeting = 'Buenos días';
  if (hour >= 12) greeting = 'Buenas tardes';
  if (hour >= 19) greeting = 'Buenas noches';

  // 2. Definir Permisos
  const canViewFinancials = ['admin', 'manager', 'receptionist'].includes(role);

  // 3. Fechas y Rangos
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

  // 4. Fetch de Datos
  const getSimpleMetrics = async (start: string, end: string) => {
      const { data } = await supabase.from('view_finance_appointments').select('final_price, status').gte('date', start).lte('date', end);
      if (!data) return { revenue: 0, count: 0, pending: 0 };
      
      const valid = data.filter((a:any) => ['completed', 'attended'].includes(a.status));
      const pending = data.filter((a:any) => !['cancelled', 'no_show', 'completed', 'attended'].includes(a.status));
      
      return { 
          revenue: valid.reduce((acc: number, curr: any) => acc + (Number(curr.final_price) || 0), 0),
          count: valid.length,
          pending: pending.length
      };
  };

  // AQUÍ ESTABA EL ERROR: Declarar el tipo explícito para evitar 'implicit any[]'
  let weeklyData: WeeklyMetric[] = [];
  let growthPercentage = 0;
  let totalWeekRevenue = 0;

  if (canViewFinancials) {
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

      const daysMap = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      const dailyTotals = new Array(7).fill(0);

      currentWeekRaw?.forEach((appt: any) => {
          const date = new Date(appt.date);
          let dayIndex = date.getDay() - 1; 
          if (dayIndex === -1) dayIndex = 6;
          dailyTotals[dayIndex] += (Number(appt.final_price) || 0);
      });

      totalWeekRevenue = dailyTotals.reduce((a, b) => a + b, 0);
      const prevWeekTotal = prevWeekRaw?.reduce((acc: number, curr: any) => acc + (Number(curr.final_price) || 0), 0) || 0;

      if (prevWeekTotal > 0) {
          growthPercentage = ((totalWeekRevenue - prevWeekTotal) / prevWeekTotal) * 100;
      } else if (totalWeekRevenue > 0) {
          growthPercentage = 100;
      }

      const maxVal = Math.max(...dailyTotals, 1);
      weeklyData = dailyTotals.map((val, i) => ({
          day: daysMap[i],
          value: val,
          heightPct: Math.round((val / maxVal) * 100)
      }));
  }

  const [todayMetrics, monthMetrics, recentClients] = await Promise.all([
      getSimpleMetrics(todayStart, todayEnd),
      getSimpleMetrics(monthStart, todayEnd),
      supabase.from('clients')
        .select('id, full_name, created_at, pets(count)')
        .order('created_at', { ascending: false })
        .limit(6)
  ]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8 space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {greeting}, {displayName} <span className="inline-block animate-wave">👋</span>
            </h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">
              Resumen operativo en tiempo real.
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

        {/* LAYOUT BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* BLOQUE 1: Clima */}
          <WeatherWidget />

          {/* BLOQUE 2: Ingresos Hoy (Si tiene permisos) */}
          {canViewFinancials ? (
              <BentoMetric 
                title="Ingresos Hoy"
                value={formatMoney(todayMetrics.revenue)}
                subtext={`${todayMetrics.count} servicios pagados`}
                icon={Banknote}
                trend="up"
              />
          ) : (
              <BentoMetric 
                title="Servicios Hoy"
                value={todayMetrics.count}
                subtext="Completados y pagados"
                icon={CalendarCheck}
              />
          )}

          {/* BLOQUE 3: Agenda Activa */}
          <BentoMetric 
            title="Citas Pendientes"
            value={todayMetrics.pending}
            subtext="Para el resto del día"
            icon={CalendarCheck}
            className="border-l-4 border-l-indigo-500"
          />

          {/* BLOQUE 4: Clientes / Ingresos Mes */}
          {canViewFinancials ? (
              <BentoMetric 
                title="Ingresos Mes"
                value={formatMoney(monthMetrics.revenue)}
                subtext="Acumulado mensual"
                icon={TrendingUp}
              />
          ) : (
              <BentoMetric 
                title="Buscar Clientes"
                value="Directorio"
                subtext="Ir al buscador avanzado"
                icon={Users}
                href="/admin/clients"
              />
          )}

          {/* FILA 2 */}

          {/* BLOQUE 5: Gráfico Semanal (SOLO ADMIN/MANAGER/RECEPTION) */}
          {canViewFinancials && (
            <Card className="col-span-1 md:col-span-2 shadow-sm border-slate-200 flex flex-col justify-between overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                        <CardTitle className="text-base font-bold text-slate-900">Rendimiento Semanal</CardTitle>
                        <p className="text-xs text-slate-500">Facturación acumulada: <span className="font-bold text-slate-900">{formatMoney(totalWeekRevenue)}</span></p>
                    </div>
                    <div className={cn("px-2 py-1 rounded text-xs font-bold flex items-center", 
                        growthPercentage >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    )}>
                        {growthPercentage >= 0 ? <ArrowUpRight size={14} className="mr-1"/> : <ArrowDownRight size={14} className="mr-1"/>}
                        {Math.abs(growthPercentage).toFixed(1)}% vs semana ant.
                    </div>
                </CardHeader>
                <CardContent className="h-48 flex items-end justify-between gap-3 px-6 pb-6 pt-2">
                    {weeklyData.map((d, i) => (
                        <div key={i} className="flex flex-col items-center justify-end w-full h-full group gap-2">
                            <div className="w-full bg-slate-100 rounded-t-md relative overflow-hidden h-full flex items-end">
                                <div 
                                    className="w-full bg-slate-900 rounded-t-md transition-all duration-1000 ease-out group-hover:bg-blue-600" 
                                    style={{ height: `${d.heightPct}%` }}
                                >
                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap transition-opacity pointer-events-none z-10">
                                        {formatMoney(d.value)}
                                    </div>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{d.day}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>
          )}

          {/* BLOQUE 6: Lista Reciente (Ocupa el espacio restante) */}
          <div className={cn("col-span-1 lg:col-span-2", !canViewFinancials && "lg:col-span-4")}>
             <RecentClientsList clients={recentClients.data || []} />
          </div>

        </div>
      </div>
    </div>
  );
}