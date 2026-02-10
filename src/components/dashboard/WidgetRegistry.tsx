'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Banknote, CalendarCheck, Users, TrendingUp, TrendingDown,
  Sun, CloudSun, CloudRain, ArrowUpRight,
  Plus, CreditCard, LogIn, Trophy, MessageCircle, AlertTriangle, Clock,
  Thermometer, Droplets, Cake, UserPlus, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { parseISO, getHours, isValid, format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

// Imports de Componentes Propios
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import AddClientDialog from '@/components/AddClientDialog'; // <--- Tu componente original

export type DashboardData = {
  revenue: { amount: string; vsYesterday: number; vsLastWeek: number; yesterdayAmount: string; lastWeekAmount: string } | null;
  agenda: { items: any[]; stats: { waiting: number; bathing: number; cutting: number; ready: number; total: number } };
  topBreeds: { name: string; count: number }[];
  weather: { temp: number; condition: string; min: number; rainProb: number };
  retention: { risk15: any[]; risk30: any[] };
  dateContext: string;
  clientInsights: {
    newClients: { id: string; name: string; phone: string; created_at: string }[];
    birthdays: { id: string; pet_name: string; breed: string; owner_name: string; phone: string; birthdate: string; turns_age: number }[];
  };
};

// 1. REVENUE
const RevenueWidget = ({ data }: { data: DashboardData }) => {
  if (!data.revenue) return null;
  const { amount, vsYesterday, vsLastWeek, yesterdayAmount, lastWeekAmount } = data.revenue;
  return (
    <Card className="h-full shadow-sm border-slate-200 bg-white flex flex-col justify-between overflow-hidden">
      <CardHeader className="px-5 py-3 border-b border-slate-50 bg-slate-50/50"><div className="flex items-center gap-2"><div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-md"><Banknote size={14}/></div><span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Venta Zettle</span></div></CardHeader>
      <CardContent className="px-5 py-4">
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{amount}</div>
        <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs"><span className="text-slate-500 font-medium">Ayer ({yesterdayAmount})</span><Badge variant="outline" className={cn("font-bold border-0", vsYesterday >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{vsYesterday >= 0 ? <TrendingUp size={10} className="mr-1"/> : <TrendingDown size={10} className="mr-1"/>}{Math.abs(vsYesterday).toFixed(1)}%</Badge></div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-50"><span className="text-slate-500 font-medium">Sem. Pasada ({lastWeekAmount})</span><Badge variant="outline" className={cn("font-bold border-0", vsLastWeek >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{vsLastWeek >= 0 ? <TrendingUp size={10} className="mr-1"/> : <TrendingDown size={10} className="mr-1"/>}{Math.abs(vsLastWeek).toFixed(1)}%</Badge></div>
        </div>
      </CardContent>
    </Card>
  );
};

// 2. WEATHER
const WeatherWidget = ({ data }: { data: DashboardData }) => {
    const { temp, min, rainProb, condition } = data.weather;
    const forecast = [{ day: 'Mañana', temp: '26°', icon: CloudSun }, { day: 'Mié', temp: '22°', icon: CloudRain }, { day: 'Jue', temp: '25°', icon: Sun }];
    return (
        <Card className="h-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none shadow-md flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700"></div>
            <CardHeader className="px-5 py-3 relative z-10 flex flex-row justify-between items-start pb-0"><div className="flex items-center gap-2"><div className="p-1 bg-white/20 rounded-md"><Sun size={12} className="text-white"/></div><span className="text-xs font-bold text-blue-50 uppercase tracking-wide">San Pedro</span></div></CardHeader>
            <div className="px-5 pb-2 relative z-10">
                <div className="flex items-center justify-between"><div><span className="text-4xl font-bold tracking-tighter">{temp}°</span><p className="text-sm font-medium text-blue-100">{condition}</p></div><Sun className="h-10 w-10 text-yellow-300 animate-pulse-slow" /></div>
                <div className="flex gap-4 mt-3 pt-3 border-t border-white/10"><div className="flex items-center gap-1.5"><Thermometer size={12} className="text-blue-200"/><div className="flex flex-col leading-none"><span className="text-[10px] text-blue-200">Mínima</span><span className="text-xs font-bold">{min}°</span></div></div><div className="flex items-center gap-1.5"><Droplets size={12} className="text-blue-200"/><div className="flex flex-col leading-none"><span className="text-[10px] text-blue-200">Lluvia</span><span className="text-xs font-bold">{rainProb}%</span></div></div></div>
            </div>
            <div className="bg-black/20 backdrop-blur-sm p-2 grid grid-cols-3 gap-1 text-center border-t border-white/5">{forecast.map((f, i) => (<div key={i} className="flex flex-col items-center justify-center py-1"><span className="text-[9px] text-blue-100 opacity-80 mb-0.5">{f.day}</span><f.icon size={12} className="text-white mb-0.5"/><span className="text-[10px] font-bold">{f.temp}</span></div>))}</div>
        </Card>
    );
};

// 3. AGENDA (7:00 - 23:00)
const CombinedAgendaWidget = ({ data }: { data: DashboardData }) => {
    const [isMounted, setIsMounted] = useState(false);
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => { 
        setIsMounted(true);
        setNow(new Date()); 
        const t = setInterval(() => setNow(new Date()), 60000); 
        return () => clearInterval(t); 
    }, []);

    const { items, stats } = data.agenda;
    const hours = Array.from({ length: 17 }, (_, i) => i + 7); 

    const currentHour = now ? now.getHours() : -1;
    const currentMin = now ? now.getMinutes() : 0;
    const lineTop = ((currentMin / 60) * 100) + "%"; 

    const apptsByHour: Record<number, any[]> = {};
    if (isMounted) {
        items.forEach((appt) => {
            if (!appt.start_time) return;
            const start = parseISO(appt.start_time);
            if (isValid(start)) {
                const h = getHours(start);
                if (!apptsByHour[h]) apptsByHour[h] = [];
                apptsByHour[h].push(appt);
            }
        });
    }

    if (!isMounted || !now) {
        return (
            <Card className="h-full shadow-sm border-slate-200 bg-white flex flex-col overflow-hidden min-h-[350px]">
                 <CardHeader className="px-5 py-3 border-b border-slate-50 bg-slate-50/50"><div className="flex items-center gap-2"><div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md"><CalendarCheck size={14}/></div><span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Cargando Agenda...</span></div></CardHeader>
                 <div className="flex-1 bg-slate-50/30 animate-pulse"></div>
            </Card>
        );
    }

    return (
        <Card className="h-full shadow-sm border-slate-200 bg-white flex flex-col overflow-hidden min-h-[350px]">
            <CardHeader className="px-5 py-3 border-b border-slate-50 bg-slate-50/50 flex flex-row justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md"><CalendarCheck size={14}/></div>
                    <div className="flex flex-col leading-none">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Agenda del Día</span>
                        <span className="text-[10px] text-slate-400 capitalize">{data.dateContext}</span>
                    </div>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] bg-white text-slate-500">
                    {format(now, 'HH:mm')}
                </Badge>
            </CardHeader>
            <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 bg-white">
                <div className="p-2 text-center"><span className="block text-[10px] text-slate-400">Espera</span><span className="text-sm font-bold text-slate-700">{stats.waiting}</span></div>
                <div className="p-2 text-center"><span className="block text-[10px] text-cyan-600">Baño</span><span className="text-sm font-bold text-cyan-600">{stats.bathing}</span></div>
                <div className="p-2 text-center"><span className="block text-[10px] text-purple-600">Corte</span><span className="text-sm font-bold text-purple-600">{stats.cutting}</span></div>
                <div className="p-2 text-center"><span className="block text-[10px] text-emerald-600">Listo</span><span className="text-sm font-bold text-emerald-600">{stats.ready}</span></div>
            </div>
            <div className="flex-1 overflow-y-auto p-0 scroll-smooth relative">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10 opacity-60">
                        <CalendarCheck className="h-10 w-10 mb-2"/>
                        <span className="text-xs">Sin citas para hoy</span>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {hours.map((hour) => (
                            <div key={hour} className="flex min-h-[60px] relative group hover:bg-slate-50/50 transition-colors">
                                <div className="w-14 border-r border-slate-100 flex items-start justify-center pt-3 text-[10px] font-bold text-slate-400 font-mono">
                                    {hour}:00
                                </div>
                                <div className="flex-1 p-1.5 flex flex-col gap-1 relative min-h-[60px]">
                                    {hour === currentHour && (
                                        <div className="absolute left-0 w-full h-[2px] bg-red-500 z-20 pointer-events-none flex items-center shadow-sm" style={{ top: lineTop }}>
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 ring-2 ring-white"></div>
                                        </div>
                                    )}
                                    {apptsByHour[hour]?.map((apt) => {
                                        const isCut = apt.service_category?.includes('corte') || apt.service_category?.includes('cut');
                                        return (
                                            <div key={apt.id} className={cn("flex items-center justify-between px-3 py-1.5 rounded-md border-l-4 text-xs shadow-sm bg-white z-10 transition-transform hover:scale-[1.01] cursor-default", isCut ? "border-l-purple-500 border-slate-100" : "border-l-cyan-500 border-slate-100")}>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="font-bold text-slate-700 truncate">{apt.pet_name}</span>
                                                    <span className="text-[9px] text-slate-400 truncate max-w-[120px]">{apt.service_name}</span>
                                                </div>
                                                <Badge variant="outline" className="ml-2 h-5 text-[9px] px-1.5 bg-slate-50 border-slate-200 text-slate-500">{format(parseISO(apt.start_time), 'HH:mm')}</Badge>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
};

// 4. RETENTION
const RetentionWidget = ({ data }: { data: DashboardData }) => {
    const { risk15, risk30 } = data.retention;
    const sendWhatsapp = (phone: string, name: string) => { const clean = phone.replace(/\D/g, ''); const msg = `Hola ${name}, te extrañamos en TailSociety! 🐶`; window.open(`https://wa.me/52${clean}?text=${encodeURIComponent(msg)}`, '_blank'); };
    const ClientRow = ({ c }: { c: any }) => (<div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 group hover:bg-slate-50 px-2 rounded-md transition-colors"><div className="flex flex-col"><span className="text-xs font-bold text-slate-700">{c.name}</span><span className="text-[10px] text-slate-400">Ausente {c.days_ago} días</span></div><Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-100 hover:text-green-700" onClick={() => sendWhatsapp(c.phone, c.name)}><MessageCircle size={14} /></Button></div>);
    return (
        <Card className="h-full shadow-sm border-slate-200 bg-white flex flex-col overflow-hidden">
            <CardHeader className="px-5 py-3 border-b border-slate-50 bg-slate-50/50"><div className="flex items-center gap-2"><div className="p-1.5 bg-amber-100 text-amber-600 rounded-md"><AlertTriangle size={14}/></div><span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Recuperación</span></div></CardHeader>
            <CardContent className="p-0 flex-1"><Tabs defaultValue="15days" className="w-full h-full flex flex-col"><TabsList className="w-full grid grid-cols-2 rounded-none bg-white border-b border-slate-100 p-0 h-9 shrink-0"><TabsTrigger value="15days" className="text-[10px] data-[state=active]:text-amber-700 data-[state=active]:border-b-amber-500 rounded-none border-b-2 border-transparent">15+ Días ({risk15.length})</TabsTrigger><TabsTrigger value="30days" className="text-[10px] data-[state=active]:text-red-700 data-[state=active]:border-b-red-500 rounded-none border-b-2 border-transparent">30+ Días ({risk30.length})</TabsTrigger></TabsList><TabsContent value="15days" className="p-0 m-0 flex-1 overflow-y-auto max-h-[250px]"><div className="p-2">{risk15.length > 0 ? risk15.map(c => <ClientRow key={c.id} c={c}/>) : <p className="text-xs text-slate-400 text-center py-8">Todo al día 🎉</p>}</div></TabsContent><TabsContent value="30days" className="p-0 m-0 flex-1 overflow-y-auto max-h-[250px]"><div className="p-2">{risk30.length > 0 ? risk30.map(c => <ClientRow key={c.id} c={c}/>) : <p className="text-xs text-slate-400 text-center py-8">Sin riesgo crítico 🎉</p>}</div></TabsContent></Tabs></CardContent>
        </Card>
    );
};

// 5. CLIENT PULSE
const ClientPulseWidget = ({ data }: { data: DashboardData }) => {
    const newClients = data.clientInsights?.newClients || [];
    const birthdays = data.clientInsights?.birthdays || [];
    const sendWhatsapp = (phone: string, msg: string) => { if (!phone) return; const clean = phone.replace(/\D/g, ''); window.open(`https://wa.me/52${clean}?text=${encodeURIComponent(msg)}`, '_blank'); };
    const formatBday = (dateStr: string) => { if (!dateStr) return ''; return format(parseISO(dateStr), "d 'de' MMM", { locale: es }); };

    return (
        <Card className="h-full shadow-sm border-slate-200 bg-white flex flex-col overflow-hidden">
            <CardHeader className="px-5 py-3 border-b border-slate-50 bg-slate-50/50"><div className="flex items-center gap-2"><div className="p-1.5 bg-pink-100 text-pink-600 rounded-md"><Sparkles size={14}/></div><span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Insights Clientes</span></div></CardHeader>
            <CardContent className="p-0 flex-1">
                <Tabs defaultValue="birthdays" className="w-full h-full flex flex-col">
                    <TabsList className="w-full grid grid-cols-2 rounded-none bg-white border-b border-slate-100 p-0 h-9 shrink-0">
                        <TabsTrigger value="birthdays" className="text-[10px] data-[state=active]:text-pink-600 data-[state=active]:border-b-pink-500 rounded-none border-b-2 border-transparent gap-1"><Cake size={12}/> Cumpleaños ({birthdays.length})</TabsTrigger>
                        <TabsTrigger value="new" className="text-[10px] data-[state=active]:text-blue-600 data-[state=active]:border-b-blue-500 rounded-none border-b-2 border-transparent gap-1"><UserPlus size={12}/> Nuevos ({newClients.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="birthdays" className="p-0 m-0 flex-1 overflow-y-auto max-h-[250px]">
                        <div className="p-2 space-y-1">
                            {birthdays.length > 0 ? birthdays.map(pet => (
                                <div key={pet.id} className="flex items-center justify-between py-2 px-3 border-b border-slate-50 last:border-0 group hover:bg-pink-50/50 rounded-md transition-colors"><div className="flex items-center gap-3"><div className="flex flex-col items-center justify-center w-8 h-8 bg-pink-100 text-pink-600 rounded-full shrink-0 shadow-sm border border-pink-200"><span className="text-[10px] font-bold">{pet.turns_age}</span></div><div className="flex flex-col leading-tight"><span className="text-xs font-bold text-slate-700">{pet.pet_name} <span className="font-normal text-slate-400 text-[10px]">({pet.breed})</span></span><span className="text-[10px] text-slate-500">Dueño: {pet.owner_name?.split(' ')[0]} • <span className="font-semibold text-pink-600">{formatBday(pet.birthdate)}</span></span></div></div><Button size="icon" variant="ghost" className="h-7 w-7 text-pink-400 hover:text-pink-600 hover:bg-pink-100" onClick={() => sendWhatsapp(pet.phone, `¡Hola ${pet.owner_name?.split(' ')[0]}! 🎂 En TailSociety vimos que se acerca el cumpleaños de ${pet.pet_name}. ¡Queremos desearle un día increíble! 🐾`)} title="Enviar felicitación"><MessageCircle size={14} /></Button></div>
                            )) : <div className="flex flex-col items-center justify-center py-8 text-slate-400 opacity-60"><Cake size={24} className="mb-2"/><p className="text-xs">No hay cumpleañeros próximos</p></div>}
                        </div>
                    </TabsContent>
                    <TabsContent value="new" className="p-0 m-0 flex-1 overflow-y-auto max-h-[250px]">
                        <div className="p-2 space-y-1">
                            {newClients.length > 0 ? newClients.map(client => { const daysAgo = differenceInDays(new Date(), parseISO(client.created_at)); return (<div key={client.id} className="flex items-center justify-between py-2 px-3 border-b border-slate-50 last:border-0 group hover:bg-blue-50/50 rounded-md transition-colors"><div className="flex items-center gap-3"><div className="flex flex-col items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full shrink-0 shadow-sm border border-blue-200"><UserPlus size={14}/></div><div className="flex flex-col leading-tight"><span className="text-xs font-bold text-slate-700">{client.name}</span><span className="text-[10px] text-slate-400">Registrado {daysAgo === 0 ? 'hoy' : `hace ${daysAgo} días`}</span></div></div><Button size="icon" variant="ghost" className="h-7 w-7 text-blue-400 hover:text-blue-600 hover:bg-blue-100" onClick={() => sendWhatsapp(client.phone, `¡Hola ${client.name?.split(' ')[0]}! 👋 Gracias por registrarte en TailSociety.`)} title="Enviar bienvenida"><MessageCircle size={14} /></Button></div>) }) : <div className="flex flex-col items-center justify-center py-8 text-slate-400 opacity-60"><UserPlus size={24} className="mb-2"/><p className="text-xs">Sin registros nuevos</p></div>}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

// 6. ACCIONES (Conectado a AddClientDialog)
const QuickActionsWidget = () => {
    // Estado local para abrir el modal desde el widget
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);

    return (
        <Card className="h-full shadow-sm border-slate-200 bg-white flex flex-col justify-center">
            <CardHeader className="px-5 py-3 border-b border-slate-50"><div className="flex items-center gap-2"><div className="p-1.5 bg-slate-100 text-slate-600 rounded-md"><Clock size={14}/></div><span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Acciones</span></div></CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-3">
                {/* 1. Botón Nuevo Cliente (Controla el estado local) */}
                <Button 
                    variant="outline" 
                    className="h-auto py-3 flex flex-col gap-1 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50"
                    onClick={() => setIsClientModalOpen(true)}
                >
                    <UserPlus size={18} />
                    <span className="text-[10px] font-bold">Nuevo Cliente</span>
                </Button>

                {/* Modal "oculto" que se abre con el estado local */}
                <AddClientDialog isOpen={isClientModalOpen} onOpenChange={setIsClientModalOpen} />

                {/* 2. Botón Cita (Usa su propio trigger custom) */}
                <NewAppointmentDialog customTrigger={
                    <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50">
                        <Plus size={18} />
                        <span className="text-[10px] font-bold">Cita</span>
                    </Button>
                } />

                <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50"><CreditCard size={18} /><span className="text-[10px] font-bold">Cobrar</span></Button>
                
                {/* 3. Link a la Consola de Clientes */}
                <Link href="/admin/clients" className="contents">
                    <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50">
                        <Users size={18} />
                        <span className="text-[10px] font-bold">Clientes</span>
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
};

// 7. TOP RAZAS
const TopBreedsWidget = ({ data }: { data: DashboardData }) => {
    const breeds = data.topBreeds || []; const max = Math.max(...breeds.map(b => b.count), 1);
    return (
        <Card className="h-full shadow-sm border-slate-200 bg-white flex flex-col">
            <CardHeader className="px-5 py-3 border-b border-slate-50"><div className="flex items-center gap-2"><div className="p-1.5 bg-yellow-100 text-yellow-600 rounded-md"><Trophy size={14}/></div><span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Top Razas (Mes)</span></div></CardHeader>
            <CardContent className="p-5 pt-3 flex flex-col gap-3 flex-1 justify-center">
                {breeds.length > 0 ? breeds.map((b, i) => (
                    <div key={i} className="space-y-1"><div className="flex justify-between text-xs"><span className="font-semibold text-slate-700 flex items-center gap-2"><span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white", i===0?"bg-yellow-400":i===1?"bg-slate-400":"bg-amber-600")}>{i+1}</span>{b.name}</span><span className="text-slate-500 text-[10px]">{b.count} visitas</span></div><div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${(b.count/max)*100}%` }}></div></div></div>
                )) : <div className="text-center text-slate-400 text-xs py-4">Sin datos</div>}
            </CardContent>
        </Card>
    );
};

export const WIDGET_CATALOG = {
  revenue_zettle: { id: 'revenue_zettle', component: RevenueWidget, roles: ['admin', 'manager', 'receptionist'], defaultColSpan: 1 },
  retention_risk: { id: 'retention_risk', component: RetentionWidget, roles: ['admin', 'manager', 'receptionist'], defaultColSpan: 1 },
  weather: { id: 'weather', component: WeatherWidget, roles: ['all'], defaultColSpan: 1 },
  agenda_combined: { id: 'agenda_combined', component: CombinedAgendaWidget, roles: ['all'], defaultColSpan: 2 },
  quick_actions: { id: 'quick_actions', component: QuickActionsWidget, roles: ['admin', 'manager', 'receptionist'], defaultColSpan: 1 },
  top_breeds: { id: 'top_breeds', component: TopBreedsWidget, roles: ['all'], defaultColSpan: 1 },
  client_pulse: { id: 'client_pulse', component: ClientPulseWidget, roles: ['all'], defaultColSpan: 1 }
};

export type WidgetId = keyof typeof WIDGET_CATALOG;