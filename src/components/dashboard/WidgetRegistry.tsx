'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Banknote, CalendarCheck, Users, TrendingUp, TrendingDown,
  MapPin, Sun, CloudSun, CloudRain, ArrowUpRight, ArrowDownRight, ArrowRight,
  Scissors, Droplets, Plus, CreditCard, LogIn, Trophy, Bone, MessageCircle, AlertTriangle, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { parseISO, getHours } from 'date-fns';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';

// --- TIPOS ---
export type DashboardData = {
  revenue: { amount: string; vsYesterday: number; vsLastWeek: number; yesterdayAmount: string; lastWeekAmount: string } | null;
  agenda: { items: any[]; stats: { waiting: number; bathing: number; cutting: number; ready: number; total: number } };
  topBreeds: { name: string; count: number }[];
  weather: { temp: number; condition: string };
  // Nuevo: Datos de retención
  retention: {
    risk15: { id: string; name: string; phone: string; days_ago: number }[];
    risk30: { id: string; name: string; phone: string; days_ago: number }[];
  };
};

// ==========================================
// WIDGETS
// ==========================================

// 1. REVENUE (ZETTLE STYLE) - Solo Gerencia
const RevenueWidget = ({ data }: { data: DashboardData }) => {
  if (!data.revenue) return null;
  const { amount, vsYesterday, vsLastWeek, yesterdayAmount, lastWeekAmount } = data.revenue;
  
  return (
    <Card className="h-full shadow-sm border-slate-200 bg-white flex flex-col justify-between overflow-hidden">
      <CardHeader className="px-5 py-3 border-b border-slate-50 bg-slate-50/50">
        <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-md"><Banknote size={14}/></div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Facturación</span>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-4">
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{amount}</div>
        
        <div className="mt-4 space-y-3">
            {/* Comparativa Ayer */}
            <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Ayer ({yesterdayAmount})</span>
                <Badge variant="outline" className={cn("font-bold border-0", vsYesterday >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                    {vsYesterday >= 0 ? <TrendingUp size={10} className="mr-1"/> : <TrendingDown size={10} className="mr-1"/>}
                    {Math.abs(vsYesterday).toFixed(1)}%
                </Badge>
            </div>
             {/* Comparativa Semana Pasada */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-50">
                <span className="text-slate-500">Sem. Pasada ({lastWeekAmount})</span>
                <Badge variant="outline" className={cn("font-bold border-0", vsLastWeek >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                    {vsLastWeek >= 0 ? <TrendingUp size={10} className="mr-1"/> : <TrendingDown size={10} className="mr-1"/>}
                    {Math.abs(vsLastWeek).toFixed(1)}%
                </Badge>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 2. RETENCIÓN (WHATSAPP) - Nuevo Widget
const RetentionWidget = ({ data }: { data: DashboardData }) => {
    const { risk15, risk30 } = data.retention;

    const sendWhatsapp = (phone: string, name: string, days: number) => {
        // Limpiar teléfono
        const cleanPhone = phone.replace(/\D/g, '');
        const msg = `Hola ${name}! 🐶 Notamos que hace ${days} días no nos visitas en TailSociety. ¡Tu mascota te extraña guapo/a! 🛁✂️ ¿Te agendamos cita?`;
        window.open(`https://wa.me/52${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const ClientRow = ({ client }: { client: any }) => (
        <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
            <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700">{client.name}</span>
                <span className="text-[10px] text-slate-400">Hace {client.days_ago} días</span>
            </div>
            <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => sendWhatsapp(client.phone, client.name, client.days_ago)}
            >
                <MessageCircle size={14} />
            </Button>
        </div>
    );

    return (
        <Card className="h-full shadow-sm border-slate-200 bg-white flex flex-col overflow-hidden">
            <CardHeader className="px-5 py-3 border-b border-slate-50 bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-100 text-amber-600 rounded-md"><AlertTriangle size={14}/></div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Recuperación</span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Tabs defaultValue="15days" className="w-full">
                    <TabsList className="w-full grid grid-cols-2 rounded-none bg-white border-b border-slate-100 p-0 h-9">
                        <TabsTrigger value="15days" className="text-[10px] rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:text-amber-700">
                            Ausencia 15+ ({risk15.length})
                        </TabsTrigger>
                        <TabsTrigger value="30days" className="text-[10px] rounded-none border-b-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:text-red-700">
                            Ausencia 30+ ({risk30.length})
                        </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="15days" className="p-4 max-h-[200px] overflow-y-auto">
                        {risk15.length > 0 ? risk15.map(c => <ClientRow key={c.id} client={c} />) : <p className="text-xs text-slate-400 text-center py-4">Todo al día 🎉</p>}
                    </TabsContent>
                    
                    <TabsContent value="30days" className="p-4 max-h-[200px] overflow-y-auto">
                        {risk30.length > 0 ? risk30.map(c => <ClientRow key={c.id} client={c} />) : <p className="text-xs text-slate-400 text-center py-4">Nadie ha faltado tanto 🎉</p>}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

// 3. WEATHER 
const WeatherWidget = ({ data }: { data: DashboardData }) => {
    // Forecast simulado estático (para visual)
    const forecast = [
        { day: 'Mañana', temp: '26°', icon: CloudSun },
        { day: 'Mié', temp: '22°', icon: CloudRain },
        { day: 'Jue', temp: '25°', icon: Sun },
    ];

    return (
        <Card className="h-full bg-gradient-to-b from-blue-500 to-blue-600 text-white border-none shadow-md flex flex-col justify-between overflow-hidden relative">
            <CardHeader className="px-5 py-3 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-white/20 rounded-md"><Sun size={12} className="text-white"/></div>
                    <span className="text-xs font-bold text-blue-50 uppercase tracking-wide">Clima</span>
                </div>
            </CardHeader>
            
            <div className="px-5 pb-4 relative z-10 flex items-center justify-between">
                <div>
                    <span className="text-4xl font-bold tracking-tighter">24°</span>
                    <p className="text-sm font-medium text-blue-100">Hoy en San Pedro</p>
                </div>
                <Sun className="h-12 w-12 text-yellow-300 animate-pulse-slow" />
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-3 grid grid-cols-3 gap-1 divide-x divide-white/10">
                {forecast.map((f, i) => (
                    <div key={i} className="flex flex-col items-center text-center">
                        <span className="text-[9px] text-blue-100 mb-1">{f.day}</span>
                        <f.icon size={14} className="mb-1 text-white"/>
                        <span className="text-xs font-bold">{f.temp}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
};

// 4. AGENDA UNIFICADA (Timeline)
const CombinedAgendaWidget = ({ data }: { data: DashboardData }) => {
    const { items, stats } = data.agenda;
    const hours = Array.from({ length: 9 }, (_, i) => i + 10); // 10:00 a 18:00
    
    // Linea de tiempo
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const lineTop = ((currentMin / 60) * 100) + "%"; 

    const apptsByHour: Record<number, any[]> = {};
    items.forEach((appt) => {
        const h = getHours(parseISO(appt.start_time));
        if (!apptsByHour[h]) apptsByHour[h] = [];
        apptsByHour[h].push(appt);
    });

    return (
        <Card className="h-full shadow-sm border-slate-200 bg-white flex flex-col overflow-hidden min-h-[350px]">
            <CardHeader className="px-5 py-3 border-b border-slate-50 bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md"><CalendarCheck size={14}/></div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Agenda del Día</span>
                </div>
            </CardHeader>
            
            {/* KPI RAPIDO */}
            <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 bg-white">
                <div className="p-2 text-center"><span className="block text-[10px] text-slate-400">Espera</span><span className="text-sm font-bold text-slate-700">{stats.waiting}</span></div>
                <div className="p-2 text-center"><span className="block text-[10px] text-cyan-600">Baño</span><span className="text-sm font-bold text-cyan-600">{stats.bathing}</span></div>
                <div className="p-2 text-center"><span className="block text-[10px] text-purple-600">Corte</span><span className="text-sm font-bold text-purple-600">{stats.cutting}</span></div>
                <div className="p-2 text-center"><span className="block text-[10px] text-emerald-600">Listo</span><span className="text-sm font-bold text-emerald-600">{stats.ready}</span></div>
            </div>

            <div className="flex-1 overflow-y-auto p-0 scroll-smooth relative">
                <div className="divide-y divide-slate-50">
                    {hours.map((hour) => {
                        const slotItems = apptsByHour[hour] || [];
                        const isCurrentHour = hour === currentHour;
                        
                        return (
                            <div key={hour} className="flex min-h-[60px] relative group">
                                <div className="w-14 border-r border-slate-100 flex items-start justify-center pt-3 text-[10px] font-bold text-slate-400">
                                    {hour}:00
                                </div>
                                <div className="flex-1 p-1.5 flex flex-col gap-1 relative">
                                    {isCurrentHour && (
                                        <div className="absolute left-0 w-full h-0.5 bg-red-500 z-20 pointer-events-none flex items-center" style={{ top: lineTop }}>
                                            <div className="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
                                        </div>
                                    )}
                                    {slotItems.map((apt) => {
                                        const isCut = apt.service_category?.includes('cut') || apt.service_category?.includes('corte');
                                        return (
                                            <div key={apt.id} className={cn("flex items-center justify-between px-3 py-1.5 rounded border-l-4 text-xs shadow-sm bg-white z-10", 
                                                isCut ? "border-l-purple-500 border-slate-100" : "border-l-cyan-500 border-slate-100"
                                            )}>
                                                <span className="font-bold text-slate-700">{apt.pet_name}</span>
                                                <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{apt.service_name}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
};

// 5. ACCIONES
const QuickActionsWidget = () => (
    <Card className="h-full shadow-sm border-slate-200 bg-white flex flex-col justify-center">
        <CardHeader className="px-5 py-3 border-b border-slate-50">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 text-slate-600 rounded-md"><Clock size={14}/></div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Acciones</span>
            </div>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-2 gap-3">
            <Link href="/checkin" className="contents">
                <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 bg-slate-50 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50">
                    <LogIn size={18} />
                    <span className="text-[10px] font-bold">Entrada</span>
                </Button>
            </Link>
            <NewAppointmentDialog customTrigger={
                <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 bg-slate-50 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50">
                    <Plus size={18} />
                    <span className="text-[10px] font-bold">Cita</span>
                </Button>
            } />
            <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 bg-slate-50 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50">
                <CreditCard size={18} />
                <span className="text-[10px] font-bold">Cobrar</span>
            </Button>
            <Link href="/admin/clients" className="contents">
                <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 bg-slate-50 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50">
                    <Users size={18} />
                    <span className="text-[10px] font-bold">Clientes</span>
                </Button>
            </Link>
        </CardContent>
    </Card>
);

// 6. TOP RAZAS
const TopBreedsWidget = ({ data }: { data: DashboardData }) => {
    const breeds = data.topBreeds || [];
    const maxCount = Math.max(...breeds.map(b => b.count), 1);

    return (
        <Card className="h-full shadow-sm border-slate-200 bg-white flex flex-col">
            <CardHeader className="px-5 py-3 border-b border-slate-50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-yellow-100 text-yellow-600 rounded-md"><Trophy size={14}/></div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Top Razas (Mes)</span>
                </div>
            </CardHeader>
            <CardContent className="p-5 pt-3 flex flex-col gap-3 flex-1 justify-center">
                {breeds.length > 0 ? breeds.map((b, i) => (
                    <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-700 flex items-center gap-2">
                                <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white", 
                                    i === 0 ? "bg-yellow-400" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-600" : "bg-slate-200 text-slate-500"
                                )}>{i + 1}</span>
                                {b.name}
                            </span>
                            <span className="text-slate-500 text-[10px]">{b.count} visitas</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(b.count / maxCount) * 100}%` }}></div>
                        </div>
                    </div>
                )) : <div className="text-center text-slate-400 text-xs py-4">Sin datos</div>}
            </CardContent>
        </Card>
    );
};

// --- CATÁLOGO ---
export const WIDGET_CATALOG = {
  revenue_zettle: { id: 'revenue_zettle', component: RevenueWidget, roles: ['admin', 'manager', 'receptionist'], defaultColSpan: 1 },
  retention_risk: { id: 'retention_risk', component: RetentionWidget, roles: ['admin', 'manager', 'receptionist'], defaultColSpan: 1 },
  weather: { id: 'weather', component: WeatherWidget, roles: ['all'], defaultColSpan: 1 },
  agenda_combined: { id: 'agenda_combined', component: CombinedAgendaWidget, roles: ['all'], defaultColSpan: 2 },
  quick_actions: { id: 'quick_actions', component: QuickActionsWidget, roles: ['admin', 'manager', 'receptionist'], defaultColSpan: 1 },
  top_breeds: { id: 'top_breeds', component: TopBreedsWidget, roles: ['all'], defaultColSpan: 1 },
};

export type WidgetId = keyof typeof WIDGET_CATALOG;