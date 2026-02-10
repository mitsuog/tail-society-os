'use client';

import Link from 'next/link';
import { 
  Banknote, CalendarCheck, Users, TrendingUp, 
  MapPin, CloudRain, Thermometer, ArrowUpRight, Scissors, Droplets, 
  Plus, CreditCard, LogIn, Clock, CheckCircle2, 
  AlertTriangle, Crown, PawPrint, Phone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

export type DashboardData = {
  revenue: { amount: string; vsYesterday: number; vsLastWeek: number; yesterdayAmount: string; lastWeekAmount: string } | null;
  agenda: { items: any[]; stats: { waiting: number; bathing: number; cutting: number; ready: number; total: number } };
  operations: { waiting: number; bathing: number; cutting: number; ready: number; total: number };
  staff: { id: string; name: string; status: 'busy' | 'free' | 'break'; current_pet?: string }[];
  topBreeds: { name: string; count: number }[];
  retention: { risk15: any[]; risk30: any[] };
  clientInsights: { newClients: any[]; birthdays: any[] };
  weather: { temp: number; condition: string; min: number; rainProb: number };
  dateContext: string;
};

// 1. FACTURACIÓN
const RevenueZettleWidget = ({ data }: { data: DashboardData }) => {
  const rev = data.revenue || { amount: '$0', vsYesterday: 0, vsLastWeek: 0, yesterdayAmount: '$0', lastWeekAmount: '$0' };
  const isPos = rev.vsYesterday >= 0;
  return (
    <Card className="h-full shadow-sm border-slate-200 flex flex-col justify-center bg-white overflow-hidden">
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div>
          <div className="flex justify-between items-start mb-2">
             <p className="text-[10px] md:text-xs uppercase tracking-wider font-bold text-slate-400">Facturación Diaria</p>
             <div className="bg-slate-100 p-1.5 rounded-full"><Banknote size={14} className="text-slate-600"/></div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{rev.amount}</div>
        </div>
        <div className="mt-4 space-y-2">
           <div className={cn("flex items-center text-xs font-medium", isPos ? "text-emerald-600" : "text-red-500")}>
              <TrendingUp size={14} className={cn("mr-1", !isPos && "rotate-180")} />
              {Math.abs(rev.vsYesterday).toFixed(1)}% vs ayer
           </div>
           <p className="text-[10px] text-slate-400">Ayer cerró en {rev.yesterdayAmount}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// 2. CLIMA
const WeatherWidget = ({ data }: { data: DashboardData }) => {
    return (
      <Card className="h-full bg-gradient-to-br from-blue-500 to-blue-700 text-white border-none shadow-md overflow-hidden relative group min-h-[150px]">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
        <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100 flex items-center gap-1"><CloudRain size={10} /> Pronóstico Clima</span>
                <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white flex items-center gap-1"><MapPin size={8} /> San Pedro</span>
            </div>
            <div className="flex items-end gap-3 mt-2">
                <h3 className="text-4xl font-bold tracking-tighter leading-none">{data.weather?.temp}°</h3>
                <div className="mb-1">
                    <p className="text-sm font-medium leading-none">{data.weather?.condition}</p>
                    <p className="text-[10px] text-blue-100">Mín {data.weather?.min}°</p>
                </div>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
             <div className="flex items-center gap-1.5 text-xs font-medium"><Thermometer size={12} className="text-blue-200" /> Sens {data.weather?.temp + 2}°</div>
             <div className="flex items-center gap-1.5 text-xs font-medium"><CloudRain size={12} className="text-blue-200" /> {data.weather?.rainProb}% Lluvia</div>
          </div>
        </CardContent>
      </Card>
    );
};

// 3. ACCIONES RÁPIDAS
const QuickActionsWidget = () => (
    <Card className="h-full shadow-sm border-slate-200 bg-slate-900 text-white flex flex-col justify-between">
        <CardHeader className="p-4 pb-0"><CardTitle className="text-sm font-medium text-slate-300">Acciones Rápidas</CardTitle></CardHeader>
        <CardContent className="p-4 grid grid-cols-2 gap-2.5 h-full content-center">
            <Link href="/checkin" className="contents">
                <Button variant="secondary" className="h-auto py-2.5 px-1 flex flex-col justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border-0"><LogIn size={18} className="opacity-80"/><span className="text-[10px] font-medium leading-tight text-center w-full whitespace-normal">Check-In</span></Button>
            </Link>
            <NewAppointmentDialog customTrigger={
                <Button variant="secondary" className="h-auto py-2.5 px-1 flex flex-col justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border-0"><Plus size={18} /><span className="text-[10px] font-medium leading-tight text-center w-full whitespace-normal">Nueva Cita</span></Button>
            } />
            <Button variant="secondary" className="h-auto py-2.5 px-1 flex flex-col justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border-0"><CreditCard size={18} className="opacity-80"/><span className="text-[10px] font-medium leading-tight text-center w-full whitespace-normal">Cobrar</span></Button>
            <Link href="/admin/clients" className="contents">
                <Button variant="secondary" className="h-auto py-2.5 px-1 flex flex-col justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border-0"><Users size={18} className="opacity-80"/><span className="text-[10px] font-medium leading-tight text-center w-full whitespace-normal">Clientes</span></Button>
            </Link>
        </CardContent>
    </Card>
);

// 4. WATCHLIST (RETENTION) - CON TEXTO DE ACCIÓN
const RetentionWidget = ({ data }: { data: DashboardData }) => {
    const riskClients = [...(data.retention?.risk30 || []), ...(data.retention?.risk15 || [])].slice(0, 5);
    return (
        <Card className="h-full shadow-sm border-slate-200 flex flex-col bg-white overflow-hidden">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2 truncate">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0"/> <span className="truncate">Watchlist</span>
                </CardTitle>
                {/* CAMBIO: Texto Call to Action */}
                <Badge variant="outline" className="text-[9px] h-5 px-1.5 font-bold text-blue-700 bg-blue-50 border-blue-200 whitespace-nowrap cursor-pointer hover:bg-blue-100">
                    Recuperar Clientes
                </Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-1 overflow-y-auto">
                {riskClients.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                        {riskClients.map((client, i) => (
                            <div key={i} className="flex items-center justify-between py-2.5 first:pt-1 group">
                                <div className="min-w-0 pr-2">
                                    <p className="text-xs font-semibold text-slate-700 truncate">{client.name}</p>
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <Clock size={10}/> {client.days_ago} días ausente
                                    </p>
                                </div>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 shrink-0" title="Contactar">
                                    <Phone size={14} />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
                        <CheckCircle2 size={24} className="mb-2 opacity-20"/><p className="text-xs">Al día</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// 5. TOP MASCOTAS
const TopBreedsWidget = ({ data }: { data: DashboardData }) => {
    const breeds = data.topBreeds || [];
    const maxCount = Math.max(...breeds.map(b => b.count), 1);
    return (
        <Card className="h-full shadow-sm border-slate-200 flex flex-col bg-white overflow-hidden">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2"><Crown className="h-4 w-4 text-yellow-500"/> Top Mascotas (Mes)</CardTitle></CardHeader>
            <CardContent className="p-4 pt-1 flex-1 flex flex-col justify-center gap-3">
                {breeds.length > 0 ? breeds.map((item, i) => (
                    <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium"><span className="text-slate-700 truncate max-w-[70%]">{item.name || 'Mestizo'}</span><span className="text-slate-500">{item.count}</span></div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-800 rounded-full transition-all duration-500" style={{ width: `${(item.count / maxCount) * 100}%` }}/></div>
                    </div>
                )) : <p className="text-xs text-slate-400 text-center">Sin datos suficientes</p>}
            </CardContent>
        </Card>
    );
};

// 6. AGENDA (SIMPLE)
const AgendaSimpleWidget = ({ data }: { data: DashboardData }) => {
    const ops = data.operations;
    const items = data.agenda?.items || [];
    const sortedItems = [...items].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return (
        <Card className="h-full shadow-sm border-slate-200 flex flex-col bg-white overflow-hidden min-h-[350px]">
            <CardHeader className="p-4 pb-2 border-b border-slate-50 bg-slate-50/50 flex flex-row items-center justify-between shrink-0">
                <div className="flex items-center gap-2"><div className="p-1.5 bg-blue-100 rounded text-blue-600"><CalendarCheck size={16}/></div><CardTitle className="text-sm font-bold text-slate-900">Agenda del Día</CardTitle></div>
                <Badge variant="secondary" className="font-mono text-xs">{items.length} Citas</Badge>
            </CardHeader>
            <div className="px-4 pt-3 pb-1 bg-white shrink-0">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wide"><span>Progreso del Día</span><span>{ops.ready} / {Math.max(ops.total, 1)} Finalizados</span></div>
                <Progress value={(ops.ready / Math.max(ops.total, 1)) * 100} className="h-1.5 bg-slate-100" indicatorColor="bg-emerald-500"/>
                <div className="flex gap-3 mt-3 pb-2 border-b border-slate-50">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-600"><div className="w-2 h-2 rounded-full bg-cyan-500"></div> {ops.bathing} Baño</div>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-600"><div className="w-2 h-2 rounded-full bg-purple-500"></div> {ops.cutting} Corte</div>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-600"><div className="w-2 h-2 rounded-full bg-amber-500"></div> {ops.waiting} Espera</div>
                </div>
            </div>
            <CardContent className="p-0 flex-1 overflow-y-auto bg-white relative">
                {sortedItems.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {sortedItems.map((appt) => {
                            const date = parseISO(appt.start_time);
                            const isDone = appt.status === 'completed';
                            const isCut = appt.service_category?.includes('corte');
                            return (
                                <div key={appt.id} className={cn("flex items-center gap-3 p-3 hover:bg-slate-50/80 transition-colors group", isDone && "opacity-60 grayscale bg-slate-50/30")}>
                                    <div className="flex flex-col items-center justify-center w-12 shrink-0 border-r border-slate-100 pr-3">
                                        <span className="text-xs font-bold text-slate-700">{format(date, 'HH:mm')}</span>
                                        <span className="text-[9px] text-slate-400 font-medium uppercase">{format(date, 'a', { locale: es })}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5"><p className="text-xs font-bold text-slate-800 truncate">{appt.pet_name}</p>{isDone && <CheckCircle2 size={12} className="text-emerald-500"/>}</div>
                                        <div className="flex items-center gap-2"><Badge variant="outline" className={cn("text-[9px] h-4 px-1 rounded border-0", isCut ? "bg-purple-50 text-purple-700" : "bg-cyan-50 text-cyan-700")}>{isCut ? <Scissors size={8} className="mr-1"/> : <Droplets size={8} className="mr-1"/>}{appt.service_name}</Badge></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center"><div className="bg-slate-50 p-3 rounded-full mb-2"><PawPrint size={20} className="opacity-30"/></div><p className="text-xs">No hay citas hoy</p></div>
                )}
            </CardContent>
        </Card>
    );
};

// 7. STAFF
const StaffStatusWidget = ({ data }: { data: DashboardData }) => {
    const sortedStaff = [...data.staff].sort((a, b) => (a.status === 'busy' ? -1 : 1));
    const getStatusColor = (s: string) => { if (s === 'busy') return 'bg-red-500'; if (s === 'free') return 'bg-emerald-500'; return 'bg-amber-500'; }
    return (
        <Card className="h-full shadow-sm border-slate-200 flex flex-col bg-white overflow-hidden">
            <CardHeader className="p-4 pb-2 flex flex-row justify-between items-center"><CardTitle className="text-sm font-bold text-slate-800">Equipo</CardTitle><Badge variant="secondary" className="text-[10px] h-5">{data.staff.length} activos</Badge></CardHeader>
            <CardContent className="p-4 pt-0 flex-1 overflow-y-auto max-h-[200px]">
                <div className="flex flex-col gap-3">
                    {sortedStaff.length > 0 ? sortedStaff.map((m) => (
                        <div key={m.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3 overflow-hidden"><div className="relative shrink-0"><Avatar className="h-8 w-8 border border-slate-100 bg-slate-50"><AvatarFallback className="text-[10px] font-bold text-slate-600">{m.name.substring(0,2).toUpperCase()}</AvatarFallback></Avatar><span className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white", getStatusColor(m.status))}></span></div><div className="min-w-0"><p className="text-xs font-semibold text-slate-700 truncate">{m.name}</p><p className="text-[10px] text-slate-400 truncate">{m.status === 'busy' ? `Con ${m.current_pet || 'Mascota'}` : 'Disponible'}</p></div></div>
                        </div>
                    )) : <p className="text-xs text-slate-400 text-center py-4">No hay personal activo.</p>}
                </div>
            </CardContent>
        </Card>
    );
}

// CATALOGO LIMPIO (SIN DUPLICADOS)
export const WIDGET_CATALOG = {
  revenue_zettle: { id: 'revenue_zettle', component: RevenueZettleWidget, roles: ['admin', 'manager'], defaultColSpan: 1 },
  weather: { id: 'weather', component: WeatherWidget, roles: ['all'], defaultColSpan: 1 },
  quick_actions: { id: 'quick_actions', component: QuickActionsWidget, roles: ['all'], defaultColSpan: 1 },
  agenda_combined: { id: 'agenda_combined', component: AgendaSimpleWidget, roles: ['all'], defaultColSpan: 2 },
  staff_status: { id: 'staff_status', component: StaffStatusWidget, roles: ['admin', 'manager'], defaultColSpan: 1 },
  retention_risk: { id: 'retention_risk', component: RetentionWidget, roles: ['admin', 'manager'], defaultColSpan: 1 },
  top_breeds: { id: 'top_breeds', component: TopBreedsWidget, roles: ['admin', 'manager'], defaultColSpan: 2 },
  
  // ALIAS (Mapeo a componentes existentes para evitar error si DB tiene keys viejas, aunque page.tsx ya los filtra)
  stats_overview: { id: 'stats_overview', component: RevenueZettleWidget, roles: ['admin'], defaultColSpan: 1 },
  live_operations: { id: 'live_operations', component: AgendaSimpleWidget, roles: ['all'], defaultColSpan: 2 },
};

export type WidgetId = keyof typeof WIDGET_CATALOG;