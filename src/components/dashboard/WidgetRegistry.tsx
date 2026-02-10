'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Banknote, CalendarCheck, Users, TrendingUp, 
  MapPin, Sun, ArrowUpRight, ArrowRight,
  Scissors, Droplets, Sparkles, Clock,
  MoreHorizontal, Plus, CreditCard, LogIn, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress"; // Asegúrate de tener este componente de shadcn
import { cn } from "@/lib/utils";
import { parseISO, getHours } from 'date-fns';

// --- TIPOS DE DATOS ---
export type DashboardData = {
  today: { revenue: number; count: number; pending: number; formattedRevenue: string };
  month: { revenue: number; formattedRevenue: string };
  recentClients: any[];
  agenda: any[];
  weekly: { weeklyData: any[]; growthPercentage: number; formattedRevenue: string };
  // Datos simulados para los nuevos widgets (en producción vendrían de DB)
  staff?: any[]; 
  operations?: { waiting: number; bathing: number; cutting: number; ready: number };
};

// ==========================================
// NUEVOS WIDGETS PREMIUM
// ==========================================

// 1. STATS OVERVIEW (Financiero Compacto)
// Muestra 3 métricas en una sola fila. Muy usado en SaaS modernos.
const StatsOverviewWidget = ({ data }: { data: DashboardData }) => {
  const ticketPromedio = data.today.count > 0 ? data.today.revenue / data.today.count : 0;
  
  return (
    <Card className="h-full shadow-sm border-slate-200 flex flex-col justify-center">
      <CardContent className="p-6 grid grid-cols-3 divide-x divide-slate-100">
        <div className="px-2 first:pl-0">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Venta Hoy</p>
          <div className="text-xl md:text-2xl font-bold text-slate-900">{data.today.formattedRevenue}</div>
          <div className="text-[10px] text-emerald-600 font-medium flex items-center mt-1">
             <ArrowUpRight size={10} className="mr-0.5"/> +12% vs ayer
          </div>
        </div>
        <div className="px-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Ticket Prom.</p>
          <div className="text-xl md:text-2xl font-bold text-slate-900">
            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(ticketPromedio)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">Por servicio</div>
        </div>
        <div className="px-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Citas</p>
          <div className="text-xl md:text-2xl font-bold text-slate-900">{data.today.count + data.today.pending}</div>
          <div className="text-[10px] text-blue-600 font-medium mt-1">
            {data.today.pending} pendientes
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 2. LIVE OPERATIONS (El "Tracking" Operativo)
// Visualiza dónde están los perros en el proceso.
const LiveOperationsWidget = ({ data }: { data: DashboardData }) => {
  // Simulación de datos (En realidad vendrían de data.operations)
  const ops = { waiting: 2, bathing: 3, cutting: 4, ready: 1 }; 
  const total = ops.waiting + ops.bathing + ops.cutting + ops.ready;

  return (
    <Card className="h-full shadow-sm border-slate-200 flex flex-col">
      <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> Operación en Vivo
        </CardTitle>
        <span className="text-xs text-slate-400">{total} mascotas activas</span>
      </CardHeader>
      <CardContent className="p-5 pt-2 flex flex-col justify-center flex-1 gap-4">
        
        {/* Etapa: Baño */}
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5"><Droplets size={12} className="text-cyan-500"/> En Baño</span>
                <span className="text-slate-900">{ops.bathing}</span>
            </div>
            <Progress value={(ops.bathing / 8) * 100} className="h-2 bg-slate-100" indicatorColor="bg-cyan-500" />
        </div>

        {/* Etapa: Corte */}
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5"><Scissors size={12} className="text-purple-500"/> En Corte</span>
                <span className="text-slate-900">{ops.cutting}</span>
            </div>
            <Progress value={(ops.cutting / 8) * 100} className="h-2 bg-slate-100" indicatorColor="bg-purple-500" />
        </div>

        {/* Resumen inferior */}
        <div className="flex gap-2 mt-2">
            <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100">
                {ops.waiting} en Espera
            </Badge>
            <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700 hover:bg-green-100 border-green-100">
                {ops.ready} Listos para entrega
            </Badge>
        </div>

      </CardContent>
    </Card>
  );
};

// 3. QUICK ACTIONS (Accesos Rápidos)
const QuickActionsWidget = () => {
    return (
        <Card className="h-full shadow-sm border-slate-200 bg-slate-900 text-white flex flex-col justify-between">
            <CardHeader className="p-5 pb-0">
                <CardTitle className="text-sm font-medium text-slate-300">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-2 gap-3">
                <Link href="/checkin" className="contents">
                    <Button variant="secondary" className="h-auto py-3 flex flex-col items-center gap-1 bg-white/10 hover:bg-white/20 text-white border-0">
                        <LogIn size={18} />
                        <span className="text-[10px] font-normal">Check-In</span>
                    </Button>
                </Link>
                <NewAppointmentDialog customTrigger={
                    <Button variant="secondary" className="h-auto py-3 flex flex-col items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white border-0">
                        <Plus size={18} />
                        <span className="text-[10px] font-normal">Nueva Cita</span>
                    </Button>
                } />
                <Button variant="secondary" className="h-auto py-3 flex flex-col items-center gap-1 bg-white/10 hover:bg-white/20 text-white border-0">
                    <CreditCard size={18} />
                    <span className="text-[10px] font-normal">Cobrar</span>
                </Button>
                <Button variant="secondary" className="h-auto py-3 flex flex-col items-center gap-1 bg-white/10 hover:bg-white/20 text-white border-0">
                    <Users size={18} />
                    <span className="text-[10px] font-normal">Clientes</span>
                </Button>
            </CardContent>
        </Card>
    )
}

// 4. STAFF STATUS (Disponibilidad)
const StaffStatusWidget = () => {
    // Mock data
    const staff = [
        { name: "Ana P.", status: "busy", task: "Corte Max" },
        { name: "Carlos", status: "free", task: "Disponible" },
        { name: "Sofia", status: "busy", task: "Baño Luna" },
        { name: "Miguel", status: "break", task: "Comida" },
    ];

    const getStatusColor = (s: string) => {
        if (s === 'busy') return 'bg-red-500';
        if (s === 'free') return 'bg-emerald-500';
        return 'bg-amber-500';
    }

    return (
        <Card className="h-full shadow-sm border-slate-200 flex flex-col">
            <CardHeader className="p-5 pb-2">
                 <CardTitle className="text-sm font-bold text-slate-800">Equipo</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex-1 flex flex-col justify-center gap-3">
                {staff.map((member, i) => (
                    <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Avatar className="h-8 w-8 border border-slate-100">
                                    <AvatarFallback className="text-[10px] font-bold bg-slate-50">{member.name.substring(0,2)}</AvatarFallback>
                                </Avatar>
                                <span className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white", getStatusColor(member.status))}></span>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-700">{member.name}</p>
                                <p className="text-[10px] text-slate-400">{member.task}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}


// --- WIDGETS ANTERIORES (MANTENIDOS) ---

const AgendaWidget = ({ data }: { data: DashboardData }) => {
  const appointments = data.agenda || [];
  const hours = Array.from({ length: 9 }, (_, i) => i + 10); // 10:00 a 18:00 (Reducido para ahorrar espacio visual)

  const apptsByHour: Record<number, any[]> = {};
  appointments.forEach((appt) => {
    const h = getHours(parseISO(appt.start_time));
    if (!apptsByHour[h]) apptsByHour[h] = [];
    apptsByHour[h].push(appt);
  });

  const getServiceStyle = (cat: string) => {
    const c = cat?.toLowerCase() || '';
    if (c.includes('corte') || c.includes('cut')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (c.includes('baño') || c.includes('bath')) return 'bg-cyan-100 text-cyan-700 border-cyan-200';
    return 'bg-amber-100 text-amber-700 border-amber-200';
  };

  return (
    <Card className="h-full shadow-sm border-slate-200 flex flex-col overflow-hidden min-h-[300px]">
      <CardHeader className="flex flex-row items-center justify-between pb-2 p-5 border-b border-slate-50 bg-slate-50/50">
        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-slate-500"/> Agenda Visual
        </CardTitle>
        <div className="flex gap-2 text-[10px] text-slate-400">
             <Clock size={12}/> Hoy
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0 scroll-smooth h-64">
        <div className="divide-y divide-slate-50">
          {hours.map((hour) => {
            const items = apptsByHour[hour] || [];
            const isPast = hour < new Date().getHours();
            return (
              <div key={hour} className={cn("flex min-h-[50px] transition-colors group", isPast ? "bg-slate-50/30" : "hover:bg-slate-50")}>
                <div className="w-14 border-r border-slate-100 flex items-center justify-center text-xs font-mono font-medium text-slate-400 group-hover:text-slate-600">
                  {hour}:00
                </div>
                <div className="flex-1 p-2 flex items-center gap-2 flex-wrap relative">
                    {/* Linea de tiempo actual (si fuera la hora actual) */}
                    {hour === new Date().getHours() && (
                        <div className="absolute left-0 top-1/2 w-full h-px bg-red-500/20 z-0 pointer-events-none"></div>
                    )}
                    
                  {items.length > 0 ? items.map((apt) => (
                    <div key={apt.id} className={cn("relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md border shadow-sm transition-transform hover:scale-105 cursor-pointer", getServiceStyle(apt.service_category || apt.service_name))}>
                      <span className="text-[10px] font-bold truncate max-w-[90px]">{apt.pet_name}</span>
                    </div>
                  )) : null}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const WeatherWidget = () => (
  <Card className="h-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-md overflow-hidden relative group min-h-[160px]">
    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-all duration-500"></div>
    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-blue-400/30 rounded-full blur-xl"></div>
    <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center gap-1.5 text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1">
          <MapPin size={10} /> San Pedro Garza García
        </div>
        <div className="flex items-center gap-3">
          <h3 className="text-3xl font-bold tracking-tighter">24°</h3>
          <Sun className="h-6 w-6 text-yellow-300 animate-pulse" />
        </div>
      </div>
      <div className="flex justify-between mt-2 border-t border-white/20 pt-2 text-center">
        <div><span className="text-[9px] text-blue-200 block">Humedad</span><span className="text-xs font-bold">45%</span></div>
        <div><span className="text-[9px] text-blue-200 block">Viento</span><span className="text-xs font-bold">12k</span></div>
      </div>
    </CardContent>
  </Card>
);

const WeeklyRevenueWidget = ({ data }: { data: DashboardData }) => {
    // Mismo código anterior para gráfico semanal...
    const { weeklyData, growthPercentage, formattedRevenue } = data.weekly;
    return (
      <Card className="h-full shadow-sm border-slate-200 flex flex-col justify-between overflow-hidden min-h-[220px]">
        <CardHeader className="flex flex-row items-start justify-between p-5 pb-0">
          <div>
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Rendimiento Semanal</CardTitle>
            <div className="text-xl font-bold text-slate-900 mt-1">{formattedRevenue}</div>
          </div>
          <div className={cn("px-2 py-1 rounded text-[10px] font-bold flex items-center", 
              growthPercentage >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          )}>
              {growthPercentage >= 0 ? <ArrowUpRight size={12} className="mr-1"/> : <ArrowRight size={12} className="mr-1 rotate-45"/>}
              {Math.abs(growthPercentage).toFixed(0)}%
          </div>
        </CardHeader>
        <CardContent className="flex items-end justify-between gap-2 px-5 pb-5 pt-4 h-full">
          {weeklyData?.map((d: any, i: number) => (
            <div key={i} className="flex flex-col items-center justify-end w-full h-full group gap-1">
              <div className="w-full bg-slate-100 rounded-t relative overflow-hidden h-full flex items-end">
                <div 
                  className="w-full bg-slate-900 rounded-t transition-all duration-700 group-hover:bg-blue-600" 
                  style={{ height: `${d.heightPct}%` }}
                ></div>
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase">{d.day}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    );
};

const RecentClientsWidget = ({ data }: { data: DashboardData }) => {
    // Mismo código anterior...
    const clients = data.recentClients || [];
    return (
      <Card className="h-full shadow-sm border-slate-200 flex flex-col overflow-hidden min-h-[300px]">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
          <CardTitle className="text-base font-bold text-slate-900">Nuevos Clientes</CardTitle>
          <Link href="/admin/clients">
            <Button variant="ghost" size="icon" className="h-6 w-6"><ArrowRight size={14}/></Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-y-auto">
          <div className="flex flex-col">
            {clients.map((client) => (
              <div key={client.id} className="flex items-center justify-between py-3 px-5 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {client.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">{client.full_name}</p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Users size={10} /> {client.pets?.length || 0} pets
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] h-5 px-1.5 font-normal border-slate-200 text-slate-400">
                  Hoy
                </Badge>
              </div>
            ))}
            {clients.length === 0 && <div className="p-5 text-center text-xs text-slate-400">Sin actividad.</div>}
          </div>
        </CardContent>
      </Card>
    );
  };

// --- CATÁLOGO PRINCIPAL (REGISTRO) ---

export const WIDGET_CATALOG = {
  // --- WIDGETS NUEVOS ---
  stats_overview: {
    id: 'stats_overview',
    component: StatsOverviewWidget,
    roles: ['admin', 'manager'],
    defaultColSpan: 2, // Ocupa 2 espacios (ancho)
  },
  live_operations: {
    id: 'live_operations',
    component: LiveOperationsWidget,
    roles: ['all'],
    defaultColSpan: 1,
  },
  quick_actions: {
    id: 'quick_actions',
    component: QuickActionsWidget,
    roles: ['all'],
    defaultColSpan: 1,
  },
  staff_status: {
    id: 'staff_status',
    component: StaffStatusWidget,
    roles: ['admin', 'manager'],
    defaultColSpan: 1,
  },
  
  // --- WIDGETS CLÁSICOS RE-ESTILIZADOS ---
  agenda_timeline: {
    id: 'agenda_timeline',
    component: AgendaWidget,
    roles: ['all'],
    defaultColSpan: 2,
  },
  weekly_chart: {
    id: 'weekly_chart',
    component: WeeklyRevenueWidget,
    roles: ['admin', 'manager'],
    defaultColSpan: 2,
  },
  weather: {
    id: 'weather',
    component: WeatherWidget,
    roles: ['all'],
    defaultColSpan: 1,
  },
  clients_recent: {
    id: 'clients_recent',
    component: RecentClientsWidget,
    roles: ['all'],
    defaultColSpan: 1,
  },
  
  // Mantenemos estos por compatibilidad si estaban guardados
  revenue_month: {
    id: 'revenue_month',
    component: ({ data }: { data: DashboardData }) => (
       <Card className="h-full shadow-sm border-slate-200 flex flex-col justify-center p-6">
            <div className="flex items-center gap-2 text-slate-500 mb-1"><TrendingUp size={16}/> <span className="text-xs font-bold uppercase">Mes</span></div>
            <div className="text-2xl font-bold text-slate-900">{data.month.formattedRevenue}</div>
       </Card>
    ),
    roles: ['admin', 'manager'],
    defaultColSpan: 1,
  }
};

export type WidgetId = keyof typeof WIDGET_CATALOG;