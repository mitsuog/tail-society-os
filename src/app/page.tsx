import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Banknote, CalendarCheck, Users, TrendingUp, 
  MapPin, Sun, Cloud, Wind, ArrowUpRight, MoreHorizontal,
  CalendarPlus, Search
} from 'lucide-react';
import { cn } from "@/lib/utils";
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';

export const dynamic = 'force-dynamic';

// --- COMPONENTES VISUALES (BENTO UI) ---

// 1. Widget de Clima (San Pedro Garza García)
// Nota: En producción, esto debería conectar a una API de clima real.
function WeatherWidget() {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-xl overflow-hidden relative group">
      {/* Decoración de fondo */}
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

// 2. Tarjeta KPI Estilo Bento
function BentoMetric({ title, value, subtext, icon: Icon, className, trend }: any) {
  return (
    <Card className={cn("flex flex-col justify-between shadow-sm border-slate-200 hover:shadow-md transition-all duration-300 group", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        <div className={cn("p-2 rounded-full bg-slate-50 group-hover:bg-slate-100 transition-colors", 
          trend === 'up' ? "text-emerald-600" : "text-slate-600")}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <p className="text-xs text-slate-500 mt-1 flex items-center">
          {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-emerald-500 mr-1" />}
          {subtext}
        </p>
      </CardContent>
    </Card>
  );
}

// 3. Tarjeta de Lista Rápida (Últimos Clientes)
function RecentClientsList({ clients }: { clients: any[] }) {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-2 shadow-sm border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-bold text-slate-900">Actividad Reciente</CardTitle>
          <p className="text-xs text-slate-500">Últimos clientes registrados o activos</p>
        </div>
        <Link href="/admin/clients">
          <Button variant="ghost" size="sm" className="text-xs h-8">Ver todos</Button>
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

  // 1. Saludo Dinámico (Monterrey Time)
  const { data: { user } } = await supabase.auth.getUser();
  const userName = user?.user_metadata?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || 'Admin';
  
  const hour = Number(new Date().toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Monterrey' }));
  let greeting = 'Buenos días';
  if (hour >= 12) greeting = 'Buenas tardes';
  if (hour >= 19) greeting = 'Buenas noches';

  // 2. Obtener Fechas para KPIs
  const getMonterreyRangeISO = (date: Date) => {
    const mtyDate = date.toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
    return { start: `${mtyDate}T00:00:00-06:00`, end: `${mtyDate}T23:59:59.999-06:00` };
  };
  const now = new Date();
  const { start: todayStart, end: todayEnd } = getMonterreyRangeISO(now);
  const currentMonthStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' }).substring(0, 7); 
  const monthStart = `${currentMonthStr}-01T00:00:00-06:00`;

  // 3. Fetch de Datos (Paralelo y Optimizado)
  const getMetrics = async (start: string, end: string) => {
      const { data } = await supabase.from('view_finance_appointments').select('final_price, status').gte('date', start).lte('date', end);
      if (!data) return { revenue: 0, count: 0 };
      const valid = data.filter((a:any) => ['completed', 'attended'].includes(a.status));
      return { 
          revenue: valid.reduce((acc: number, curr: any) => acc + (Number(curr.final_price) || 0), 0),
          count: valid.length,
          pending: data.filter((a:any) => !['cancelled', 'no_show', 'completed', 'attended'].includes(a.status)).length
      };
  };

  const [todayMetrics, monthMetrics, recentClients] = await Promise.all([
      getMetrics(todayStart, todayEnd),
      getMetrics(monthStart, todayEnd),
      supabase.from('clients')
        .select('id, full_name, created_at, pets(count)')
        .order('created_at', { ascending: false })
        .limit(6)
  ]);

  // --- RENDERIZADO BENTO GRID ---
  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8 space-y-6">
        
        {/* HEADER: Saludo y Acciones Rápidas */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {greeting}, {userName} <span className="inline-block animate-wave">👋</span>
            </h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">
              Aquí tienes el resumen operativo de hoy en San Pedro.
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
          
          {/* BLOQUE 1: Clima (Destacado) */}
          <WeatherWidget />

          {/* BLOQUE 2: Ingresos Hoy */}
          <BentoMetric 
            title="Ingresos Hoy"
            value={`$${todayMetrics.revenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
            subtext={`${todayMetrics.count} servicios pagados`}
            icon={Banknote}
            trend="up"
          />

          {/* BLOQUE 3: Agenda Activa */}
          <BentoMetric 
            title="Citas Pendientes"
            value={todayMetrics.pending}
            subtext="Para el resto del día"
            icon={CalendarCheck}
            className="border-l-4 border-l-indigo-500"
          />

          {/* BLOQUE 4: Ingresos Mes */}
          <BentoMetric 
            title="Ingresos Mes"
            value={`$${monthMetrics.revenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
            subtext="Acumulado bruto"
            icon={TrendingUp}
          />

          {/* FILA 2 */}

          {/* BLOQUE 5: Gráfico Simple (Simulado con CSS por simplicidad en Server Component) */}
          <Card className="col-span-1 md:col-span-2 shadow-sm border-slate-200 flex flex-col justify-between">
             <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900">Rendimiento Semanal</CardTitle>
             </CardHeader>
             <CardContent className="h-40 flex items-end justify-between gap-2 px-6 pb-6">
                {/* Barras simuladas con Tailwind para no depender de librerías de gráficos complejas en este snippet */}
                {[45, 60, 35, 70, 85, 55, 65].map((h, i) => (
                    <div key={i} className="w-full bg-slate-100 rounded-t-sm relative group overflow-hidden" style={{ height: '100%' }}>
                        <div 
                            className="absolute bottom-0 w-full bg-slate-900 rounded-t-sm transition-all duration-500 group-hover:bg-blue-600" 
                            style={{ height: `${h}%` }}
                        ></div>
                    </div>
                ))}
             </CardContent>
          </Card>

          {/* BLOQUE 6: Lista Reciente (Datos Reales) */}
          <RecentClientsList clients={recentClients.data || []} />

        </div>
      </div>
    </div>
  );
}