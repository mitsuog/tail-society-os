import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Banknote, CalendarCheck, Users, TrendingUp, 
  MapPin, Sun, ArrowUpRight, ArrowRight,
  CalendarPlus, Search, Clock, Scissors, Droplets, Sparkles
} from 'lucide-react';
import { cn } from "@/lib/utils";
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { startOfWeek, endOfWeek, subWeeks, format, parseISO, getHours } from 'date-fns';

export const dynamic = 'force-dynamic';

// --- UTILS & TYPES ---

interface AppointmentItem {
  id: string;
  start_time: string;
  pet_name: string;
  service_category: string; // 'cut', 'bath', 'other'
  service_name: string;
}

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

// --- WIDGET DE AGENDA (Nuevo) ---
function AgendaWidget({ appointments }: { appointments: AppointmentItem[] }) {
  // Generar horas operativas (ej. 9:00 a 19:00)
  const hours = Array.from({ length: 11 }, (_, i) => i + 9); // 9, 10... 19

  // Agrupar citas por hora
  const apptsByHour: Record<number, AppointmentItem[]> = {};
  appointments.forEach(app => {
    const h = getHours(parseISO(app.start_time));
    if (!apptsByHour[h]) apptsByHour[h] = [];
    apptsByHour[h].push(app);
  });

  const getServiceStyle = (cat: string) => {
    const c = cat?.toLowerCase() || '';
    if (c.includes('corte') || c.includes('cut')) return { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', icon: Scissors };
    if (c.includes('baño') || c.includes('bath')) return { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500', icon: Droplets };
    return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', icon: Sparkles };
  };

  return (
    <Card className="col-span-1 md:col-span-2 shadow-sm border-slate-200 flex flex-col h-full overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-white z-10 border-b border-slate-100">
        <div>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-slate-500"/> Agenda del Día
          </CardTitle>
          <p className="text-xs text-slate-500">Vista rápida de ocupación</p>
        </div>
        <div className="flex gap-2 text-[10px] font-medium text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>Baño</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span>Corte</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0 scroll-smooth">
        <div className="divide-y divide-slate-50">
          {hours.map((hour) => {
            const slotAppts = apptsByHour[hour] || [];
            const isPast = hour < new Date().getHours();

            return (
              <div key={hour} className={cn("flex group transition-colors hover:bg-slate-50/80 min-h-[50px]", isPast && "opacity-60 bg-slate-50/30")}>
                {/* Columna Hora */}
                <div className="w-16 flex-shrink-0 border-r border-slate-100 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover:text-slate-600">
                  {hour}:00
                </div>
                
                {/* Columna Citas */}
                <div className="flex-1 p-2 flex flex-wrap gap-2 items-center">
                  {slotAppts.length > 0 ? (
                    slotAppts.map((appt) => {
                      const style = getServiceStyle(appt.service_category || appt.service_name);
                      return (
                        <div key={appt.id} className={cn("flex items-center gap-2 px-2.5 py-1 rounded-full border transition-all shadow-sm", style.bg, "border-transparent group-hover:border-slate-200/50")}>
                          <span className={cn("w-2 h-2 rounded-full animate-pulse", style.dot)}></span>
                          <span className={cn("text-xs font-bold truncate max-w-[100px]", style.text)}>{appt.pet_name}</span>
                          <style.icon size={10} className={cn("opacity-70", style.text)}/>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-[10px] text-slate-300 italic font-medium ml-2">Disponible</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
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

  // 4. Fetch de Métricas Generales
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

  // 5. Fetch para la AGENDA VISUAL (Reemplaza el gráfico financiero)
  // Obtenemos: Hora, Mascota y Servicio para pintar las bolitas
  let agendaItems: AppointmentItem[] = [];
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

  if (rawAgenda) {
      agendaItems = rawAgenda.map((item: any) => {
          // Extraer info del primer servicio (asumiendo principal)
          const svc = item.appointment_services?.[0]?.services;
          return {
              id: item.id,
              start_time: item.start_time,
              pet_name: item.pets?.name || 'Mascota',
              service_name: svc?.name || 'Servicio',
              service_category: svc?.category || 'other'
          };
      });
  }

  // Ejecutar queries paralelas
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
              Panel de control operativo.
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

          {/* BLOQUE 4: Ingresos Mes / Directorio */}
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

          {/* BLOQUE 5: AGENDA VISUAL (Reemplaza Gráfico) */}
          {/* Ocupa 2 columnas, mostrando el timeline de 9am a 7pm */}
          <AgendaWidget appointments={agendaItems} />

          {/* BLOQUE 6: Lista Reciente */}
          <div className={cn("col-span-1 lg:col-span-2")}>
             <RecentClientsList clients={recentClients.data || []} />
          </div>

        </div>
      </div>
    </div>
  );
}