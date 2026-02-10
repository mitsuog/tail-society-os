'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Banknote, CalendarCheck, Users, TrendingUp, 
  MapPin, Sun, ArrowUpRight, ArrowDownRight, ArrowRight,
  Scissors, Droplets, Sparkles, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseISO, getHours } from 'date-fns';

// --- DEFINICIONES DE TIPOS PARA LOS DATOS ---
// CORRECCIÓN: Agregado 'export' para que DraggableDashboard pueda usarlo
export type DashboardData = {
  today: { revenue: number; count: number; pending: number; formattedRevenue: string };
  month: { revenue: number; formattedRevenue: string };
  recentClients: any[];
  agenda: any[];
  weekly: { weeklyData: any[]; growthPercentage: number; formattedRevenue: string };
};

// --- COMPONENTES VISUALES ---

// 1. Widget de Clima
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
        <p className="text-blue-100 text-xs font-medium mt-1">Soleado</p>
      </div>
      <div className="flex justify-between mt-2 border-t border-white/20 pt-2 text-center">
        <div><span className="text-[9px] text-blue-200 block">Humedad</span><span className="text-xs font-bold">45%</span></div>
        <div><span className="text-[9px] text-blue-200 block">Viento</span><span className="text-xs font-bold">12k</span></div>
      </div>
    </CardContent>
  </Card>
);

// 2. Métrica Genérica
const BentoMetric = ({ title, value, subtext, icon: Icon, trend, colorClass }: any) => (
  <Card className="h-full flex flex-col justify-between shadow-sm border-slate-200 hover:shadow-md transition-all duration-300 group">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-5">
      <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      <div className={cn("p-2 rounded-full transition-colors bg-slate-50 group-hover:bg-slate-100", colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
    </CardHeader>
    <CardContent className="p-5 pt-0">
      <div className="text-2xl font-bold text-slate-900 truncate">{value}</div>
      <p className="text-xs text-slate-500 mt-1 flex items-center">
        {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-emerald-500 mr-1" />}
        {subtext}
      </p>
    </CardContent>
  </Card>
);

// 3. Agenda Visual
const AgendaWidget = ({ data }: { data: DashboardData }) => {
  const appointments = data.agenda || [];
  const hours = Array.from({ length: 10 }, (_, i) => i + 9); // 9:00 a 18:00

  // Agrupar por hora
  const apptsByHour: Record<number, any[]> = {};
  appointments.forEach((appt) => {
    const h = getHours(parseISO(appt.start_time));
    if (!apptsByHour[h]) apptsByHour[h] = [];
    apptsByHour[h].push(appt);
  });

  const getServiceStyle = (cat: string) => {
    const c = cat?.toLowerCase() || '';
    if (c.includes('corte') || c.includes('cut')) return 'bg-purple-500';
    if (c.includes('baño') || c.includes('bath')) return 'bg-cyan-500';
    return 'bg-amber-500';
  };

  return (
    <Card className="h-full shadow-sm border-slate-200 flex flex-col overflow-hidden min-h-[300px]">
      <CardHeader className="flex flex-row items-center justify-between pb-2 p-5 border-b border-slate-100">
        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-slate-500"/> Agenda del Día
        </CardTitle>
        <div className="flex gap-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>Baño</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>Corte</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0 scroll-smooth h-64">
        <div className="divide-y divide-slate-50">
          {hours.map((hour) => {
            const items = apptsByHour[hour] || [];
            const isPast = hour < new Date().getHours();
            return (
              <div key={hour} className={cn("flex min-h-[45px] hover:bg-slate-50 transition-colors", isPast && "opacity-50 bg-slate-50/50")}>
                <div className="w-14 border-r border-slate-100 flex items-center justify-center text-xs font-mono text-slate-400">
                  {hour}:00
                </div>
                <div className="flex-1 p-2 flex items-center gap-2 flex-wrap">
                  {items.length > 0 ? items.map((apt) => (
                    <div key={apt.id} className="flex items-center gap-2 px-2 py-1 rounded-full bg-white border border-slate-100 shadow-sm">
                      <span className={cn("w-2 h-2 rounded-full", getServiceStyle(apt.service_category || apt.service_name))}></span>
                      <span className="text-[10px] font-bold text-slate-700 truncate max-w-[80px]">{apt.pet_name}</span>
                    </div>
                  )) : <span className="text-[10px] text-slate-300 italic pl-2">Libre</span>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// 4. Clientes Recientes
const RecentClientsWidget = ({ data }: { data: DashboardData }) => {
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

// 5. Gráfico Semanal
const WeeklyRevenueWidget = ({ data }: { data: DashboardData }) => {
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
            {growthPercentage >= 0 ? <ArrowUpRight size={12} className="mr-1"/> : <ArrowDownRight size={12} className="mr-1"/>}
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

// --- CATÁLOGO PRINCIPAL ---
export const WIDGET_CATALOG = {
  weather: {
    id: 'weather',
    component: WeatherWidget,
    roles: ['all'],
    defaultColSpan: 1,
  },
  revenue_today: {
    id: 'revenue_today',
    component: ({ data }: { data: DashboardData }) => (
      <BentoMetric 
        title="Ingresos Hoy" 
        value={data.today.formattedRevenue} 
        subtext={`${data.today.count} pagados`} 
        icon={Banknote} 
        trend="up"
        colorClass="text-emerald-600"
      />
    ),
    roles: ['admin', 'manager', 'receptionist'],
    defaultColSpan: 1,
  },
  appointments_status: {
    id: 'appointments_status',
    component: ({ data }: { data: DashboardData }) => (
      <BentoMetric 
        title="Citas Pendientes" 
        value={data.today.pending} 
        subtext="Restantes hoy" 
        icon={CalendarCheck} 
        colorClass="text-indigo-600"
      />
    ),
    roles: ['all'],
    defaultColSpan: 1,
  },
  revenue_month: {
    id: 'revenue_month',
    component: ({ data }: { data: DashboardData }) => (
      <BentoMetric 
        title="Ingresos Mes" 
        value={data.month.formattedRevenue} 
        subtext="Acumulado bruto" 
        icon={TrendingUp} 
        colorClass="text-blue-600"
      />
    ),
    roles: ['admin', 'manager'],
    defaultColSpan: 1,
  },
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
  clients_recent: {
    id: 'clients_recent',
    component: RecentClientsWidget,
    roles: ['all'],
    defaultColSpan: 2,
  }
};

export type WidgetId = keyof typeof WIDGET_CATALOG;