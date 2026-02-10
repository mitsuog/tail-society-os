'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Banknote, CalendarCheck, Users, TrendingUp, 
  MapPin, Sun, ArrowUpRight, Scissors, Droplets, 
  Plus, CreditCard, LogIn, GripVertical, CheckCircle2, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress"; // Ya existe
import { cn } from "@/lib/utils";
import { parseISO, getHours } from 'date-fns';
// IMPORTACIÓN CORREGIDA
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';

// --- TIPOS REALES ---
export type DashboardData = {
  today: { revenue: number; count: number; pending: number; formattedRevenue: string };
  month: { revenue: number; formattedRevenue: string };
  recentClients: any[];
  agenda: any[];
  weekly: { weeklyData: any[]; growthPercentage: number; formattedRevenue: string };
  // Datos reales
  operations: { waiting: number; bathing: number; cutting: number; ready: number; total: number };
  staff: { id: string; name: string; status: 'busy' | 'free' | 'break'; current_pet?: string }[];
};

// --- WIDGETS ---

const StatsOverviewWidget = ({ data }: { data: DashboardData }) => {
  const ticket = data.today.count > 0 ? data.today.revenue / data.today.count : 0;
  return (
    <Card className="h-full shadow-sm border-slate-200 flex flex-col justify-center bg-white">
      <CardContent className="p-6 grid grid-cols-3 divide-x divide-slate-100">
        <div className="px-2 first:pl-0">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Venta Hoy</p>
          <div className="text-xl md:text-2xl font-bold text-slate-900">{data.today.formattedRevenue}</div>
          <div className="text-[10px] text-emerald-600 font-medium flex items-center mt-1">
             <ArrowUpRight size={10} className="mr-0.5"/> Actualizado
          </div>
        </div>
        <div className="px-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Ticket Prom.</p>
          <div className="text-xl md:text-2xl font-bold text-slate-900">
            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(ticket)}
          </div>
        </div>
        <div className="px-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Citas</p>
          <div className="text-xl md:text-2xl font-bold text-slate-900">{data.today.count + data.today.pending}</div>
          <div className="text-[10px] text-blue-600 font-medium mt-1">{data.today.pending} pendientes</div>
        </div>
      </CardContent>
    </Card>
  );
};

const LiveOperationsWidget = ({ data }: { data: DashboardData }) => {
  const ops = data.operations; 
  // Calculamos porcentajes seguros (evitar división por 0)
  const maxCap = Math.max(ops.total, 1); 

  return (
    <Card className="h-full shadow-sm border-slate-200 flex flex-col bg-white">
      <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> En Tienda
        </CardTitle>
        <span className="text-xs text-slate-400">{ops.total} mascotas activas</span>
      </CardHeader>
      <CardContent className="p-5 pt-2 flex flex-col justify-center flex-1 gap-4">
        
        {/* Baño */}
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5"><Droplets size={12} className="text-cyan-500"/> Baño / Secado</span>
                <span className="text-slate-900 font-bold">{ops.bathing}</span>
            </div>
            <Progress value={(ops.bathing / maxCap) * 100} className="h-1.5 bg-slate-100" indicatorColor="bg-cyan-500" />
        </div>

        {/* Corte */}
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5"><Scissors size={12} className="text-purple-500"/> Corte / Estilo</span>
                <span className="text-slate-900 font-bold">{ops.cutting}</span>
            </div>
            <Progress value={(ops.cutting / maxCap) * 100} className="h-1.5 bg-slate-100" indicatorColor="bg-purple-500" />
        </div>

        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-50">
            <div className="flex-1 flex items-center gap-2 bg-amber-50 px-2 py-1.5 rounded border border-amber-100">
                <Clock size={12} className="text-amber-600"/>
                <div className="flex flex-col">
                    <span className="text-[9px] text-amber-600 font-bold uppercase">Espera</span>
                    <span className="text-xs font-bold text-slate-700">{ops.waiting}</span>
                </div>
            </div>
            <div className="flex-1 flex items-center gap-2 bg-emerald-50 px-2 py-1.5 rounded border border-emerald-100">
                <CheckCircle2 size={12} className="text-emerald-600"/>
                <div className="flex flex-col">
                    <span className="text-[9px] text-emerald-600 font-bold uppercase">Listos</span>
                    <span className="text-xs font-bold text-slate-700">{ops.ready}</span>
                </div>
            </div>
        </div>

      </CardContent>
    </Card>
  );
};

const StaffStatusWidget = ({ data }: { data: DashboardData }) => {
    // Ordenar: Ocupados primero
    const sortedStaff = [...data.staff].sort((a, b) => (a.status === 'busy' ? -1 : 1));

    const getStatusColor = (s: string) => {
        if (s === 'busy') return 'bg-red-500';
        if (s === 'free') return 'bg-emerald-500';
        return 'bg-amber-500';
    }

    const getStatusText = (m: any) => {
        if (m.status === 'busy') return `Con ${m.current_pet}`;
        if (m.status === 'free') return 'Disponible';
        return 'Descanso';
    }

    return (
        <Card className="h-full shadow-sm border-slate-200 flex flex-col bg-white overflow-hidden">
            <CardHeader className="p-5 pb-2"><CardTitle className="text-sm font-bold text-slate-800">Equipo ({data.staff.length})</CardTitle></CardHeader>
            <CardContent className="p-5 pt-0 flex-1 overflow-y-auto">
                <div className="flex flex-col gap-3">
                    {sortedStaff.length > 0 ? sortedStaff.map((m) => (
                        <div key={m.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Avatar className="h-8 w-8 border border-slate-100">
                                        <AvatarFallback className="text-[10px] font-bold bg-slate-50 text-slate-600">
                                            {m.name.substring(0,2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white", getStatusColor(m.status))}></span>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-700">{m.name}</p>
                                    <p className="text-[10px] text-slate-400 truncate max-w-[100px]">{getStatusText(m)}</p>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <p className="text-xs text-slate-400 text-center py-4">No hay personal activo.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

const QuickActionsWidget = () => (
    <Card className="h-full shadow-sm border-slate-200 bg-slate-900 text-white flex flex-col justify-between">
        <CardHeader className="p-5 pb-0"><CardTitle className="text-sm font-medium text-slate-300">Acciones</CardTitle></CardHeader>
        <CardContent className="p-5 grid grid-cols-2 gap-3">
            <Link href="/checkin" className="contents">
                <Button variant="secondary" className="h-auto py-3 flex flex-col gap-1 bg-white/10 hover:bg-white/20 text-white border-0"><LogIn size={16} /><span className="text-[10px]">Check-In</span></Button>
            </Link>
            
            <NewAppointmentDialog customTrigger={
                <Button variant="secondary" className="h-auto py-3 flex flex-col gap-1 bg-blue-600 hover:bg-blue-500 text-white border-0">
                    <Plus size={16} />
                    <span className="text-[10px]">Cita</span>
                </Button>
            } />
            
            <Button variant="secondary" className="h-auto py-3 flex flex-col gap-1 bg-white/10 hover:bg-white/20 text-white border-0"><CreditCard size={16} /><span className="text-[10px]">Cobrar</span></Button>
            <Link href="/admin/clients" className="contents">
                <Button variant="secondary" className="h-auto py-3 flex flex-col gap-1 bg-white/10 hover:bg-white/20 text-white border-0"><Users size={16} /><span className="text-[10px]">Clientes</span></Button>
            </Link>
        </CardContent>
    </Card>
);

// --- OTROS WIDGETS (Agenda, Weather, etc. se mantienen igual) ---
const WeatherWidget = () => (
    <Card className="h-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-md overflow-hidden relative group min-h-[160px]">
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-all duration-500"></div>
      <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-1.5 text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1"><MapPin size={10} /> San Pedro</div>
          <div className="flex items-center gap-3"><h3 className="text-3xl font-bold tracking-tighter">24°</h3><Sun className="h-6 w-6 text-yellow-300 animate-pulse" /></div>
        </div>
        <div className="flex justify-between mt-2 border-t border-white/20 pt-2 text-center text-xs font-bold">
          <div>45% Hum</div><div>12k Viento</div>
        </div>
      </CardContent>
    </Card>
);

const AgendaWidget = ({ data }: { data: DashboardData }) => {
    const appointments = data.agenda || [];
    const hours = Array.from({ length: 9 }, (_, i) => i + 10);
    const apptsByHour: Record<number, any[]> = {};
    appointments.forEach((appt) => {
      const h = getHours(parseISO(appt.start_time));
      if (!apptsByHour[h]) apptsByHour[h] = [];
      apptsByHour[h].push(appt);
    });
  
    return (
      <Card className="h-full shadow-sm border-slate-200 flex flex-col overflow-hidden min-h-[300px] bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2 p-5 border-b border-slate-50 bg-slate-50/50">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-slate-500"/> Agenda Visual
          </CardTitle>
          <div className="flex gap-2 text-[10px] text-slate-400">Hoy</div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0 scroll-smooth h-64">
          <div className="divide-y divide-slate-50">
            {hours.map((hour) => {
              const items = apptsByHour[hour] || [];
              return (
                <div key={hour} className="flex min-h-[50px] hover:bg-slate-50 transition-colors group">
                  <div className="w-14 border-r border-slate-100 flex items-center justify-center text-xs font-mono text-slate-400">{hour}:00</div>
                  <div className="flex-1 p-2 flex items-center gap-2 flex-wrap">
                    {items.map((apt) => (
                      <div key={apt.id} className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold border shadow-sm", 
                          (apt.service_category?.includes('corte')) ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-cyan-100 text-cyan-700 border-cyan-200"
                      )}>
                        {apt.pet_name}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
};

export const WIDGET_CATALOG = {
  stats_overview: { id: 'stats_overview', component: StatsOverviewWidget, roles: ['admin', 'manager'], defaultColSpan: 2 },
  live_operations: { id: 'live_operations', component: LiveOperationsWidget, roles: ['all'], defaultColSpan: 1 },
  quick_actions: { id: 'quick_actions', component: QuickActionsWidget, roles: ['all'], defaultColSpan: 1 },
  staff_status: { id: 'staff_status', component: StaffStatusWidget, roles: ['admin', 'manager'], defaultColSpan: 1 },
  agenda_timeline: { id: 'agenda_timeline', component: AgendaWidget, roles: ['all'], defaultColSpan: 2 },
  weather: { id: 'weather', component: WeatherWidget, roles: ['all'], defaultColSpan: 1 },
};

export type WidgetId = keyof typeof WIDGET_CATALOG;