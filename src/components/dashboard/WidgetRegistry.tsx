'use client';

import Link from 'next/link';
import { 
  Banknote, CalendarCheck, Users, TrendingUp, TrendingDown,
  MapPin, CloudRain, Thermometer, Scissors, Droplets, 
  Plus, CreditCard, LogIn, Clock, CheckCircle2, 
  AlertTriangle, Crown, PawPrint, Phone, Calendar, Sun, Cloud, CloudSun
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

// DEFINICIÓN DE DATOS ROBUSTA
export type DashboardData = {
  revenue: { 
      amount: string; 
      rawAmount: number;
      vsYesterday: number; 
      vsLastWeek: number; 
      yesterdayAmount: string; 
      lastWeekAmount: string;
  } | null;
  agenda: { items: any[]; stats: any };
  staff: { id: string; name: string; status: 'busy' | 'free' | 'break'; current_pet?: string }[];
  topBreeds: { name: string; count: number }[];
  retention: { risk15: any[]; risk30: any[] }; // Separados para poder combinarlos visualmente
  clientInsights: any;
  weather: { 
      current: { temp: number; condition: string; min: number; max: number; rainProb: number };
      forecast: Array<{ day: string; temp: number; rain: number; icon: string }>;
  };
  dateContext: string;
};

// 1. FACTURACIÓN DIARIA (CON COMPARATIVAS)
const RevenueZettleWidget = ({ data }: { data: DashboardData }) => {
  const rev = data.revenue;
  if (!rev) return <div className="h-full flex items-center justify-center text-slate-400 text-xs bg-slate-50 border border-slate-100 rounded-lg">Sin permisos financieros</div>;

  const isUpYest = rev.vsYesterday >= 0;
  const isUpWeek = rev.vsLastWeek >= 0;

  return (
    <Card className="h-full shadow-sm border-slate-200 flex flex-col bg-white overflow-hidden">
      <CardContent className="p-5 flex flex-col justify-between h-full">
        {/* ENCABEZADO Y MONTO ACTUAL */}
        <div>
          <div className="flex justify-between items-start mb-2">
             <div className="flex flex-col">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Venta Neta Hoy</p>
                <div className="text-3xl font-bold text-slate-900 tracking-tight mt-1">{rev.amount}</div>
             </div>
             <div className="bg-blue-50 p-2 rounded-full text-blue-600"><Banknote size={18} /></div>
          </div>
        </div>

        {/* COMPARATIVAS */}
        <div className="space-y-3 mt-2">
            {/* VS AYER */}
            <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                <span className="text-slate-500">Ayer ({rev.yesterdayAmount})</span>
                <div className={cn("flex items-center font-bold", isUpYest ? "text-emerald-600" : "text-red-500")}>
                    {isUpYest ? <TrendingUp size={12} className="mr-1"/> : <TrendingDown size={12} className="mr-1"/>}
                    {Math.abs(rev.vsYesterday).toFixed(1)}%
                </div>
            </div>
            
            {/* VS SEMANA PASADA */}
            <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Semana Pasada ({rev.lastWeekAmount})</span>
                <div className={cn("flex items-center font-bold", isUpWeek ? "text-emerald-600" : "text-red-500")}>
                    {isUpWeek ? <TrendingUp size={12} className="mr-1"/> : <TrendingDown size={12} className="mr-1"/>}
                    {Math.abs(rev.vsLastWeek).toFixed(1)}%
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 2. CLIMA (CON PRONÓSTICO)
const WeatherWidget = ({ data }: { data: DashboardData }) => {
    const { current, forecast } = data.weather || { current: { temp: 25, condition: 'Soleado', min: 18, rainProb: 0 }, forecast: [] };
    
    return (
      <Card className="h-full bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none shadow-md overflow-hidden relative group min-h-[180px]">
        {/* Fondo Decorativo */}
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        
        <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full">
          {/* Principal */}
          <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-100 mb-1"><MapPin size={10} /> San Pedro</div>
                <div className="text-4xl font-bold tracking-tighter">{current.temp}°</div>
                <div className="text-sm font-medium opacity-90">{current.condition}</div>
            </div>
            <div className="text-right">
                <div className="text-[10px] text-blue-100 mb-1">Precipitación</div>
                <div className="flex items-center justify-end gap-1 font-bold text-lg"><CloudRain size={16} /> {current.rainProb}%</div>
            </div>
          </div>

          {/* Pronóstico 3 Días */}
          <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-3 gap-1">
             {forecast.map((day: any, i: number) => (
                 <div key={i} className="flex flex-col items-center text-center">
                     <span className="text-[9px] uppercase font-bold text-blue-200 mb-0.5">{day.day}</span>
                     <span className="text-sm font-bold">{day.temp}°</span>
                     <div className="flex items-center gap-0.5 text-[9px] opacity-80">
                        <Droplets size={8} /> {day.rain}%
                     </div>
                 </div>
             ))}
          </div>
        </CardContent>
      </Card>
    );
};

// 3. WATCHLIST (RETENCION DETALLADA)
const RetentionWidget = ({ data }: { data: DashboardData }) => {
    const risk30 = data.retention?.risk30 || [];
    const risk15 = data.retention?.risk15 || [];
    // Combinamos para mostrar, priorizando los de 30 días
    const allRisks = [
        ...risk30.map(c => ({ ...c, severity: 'high' })), 
        ...risk15.map(c => ({ ...c, severity: 'medium' }))
    ].slice(0, 6);

    return (
        <Card className="h-full shadow-sm border-slate-200 flex flex-col bg-white overflow-hidden">
            <CardHeader className="p-4 py-3 flex flex-row items-center justify-between space-y-0 border-b border-slate-50">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500"/> Watchlist
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] h-5">{allRisks.length} Riesgos</Badge>
            </CardHeader>
            
            <CardContent className="p-0 flex-1 overflow-y-auto">
                {allRisks.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                        {allRisks.map((client, i) => (
                            <div key={i} className="flex items-center justify-between p-3 group hover:bg-slate-50 transition-colors">
                                <div className="min-w-0 pr-2">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="text-xs font-bold text-slate-700 truncate">{client.name}</p>
                                        {client.severity === 'high' ? (
                                            <Badge variant="destructive" className="h-3.5 px-1 text-[8px] rounded-sm uppercase tracking-wider">30+ Días</Badge>
                                        ) : (
                                            <Badge variant="outline" className="h-3.5 px-1 text-[8px] text-amber-600 bg-amber-50 border-amber-200 rounded-sm uppercase tracking-wider">15+ Días</Badge>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <Clock size={10}/> Última visita: hace {client.days_ago} días
                                    </p>
                                </div>
                                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white shrink-0 transition-colors" title="Llamar">
                                    <Phone size={14} />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
                        <CheckCircle2 size={24} className="mb-2 opacity-20 text-emerald-500"/>
                        <p className="text-xs">Felicidades, retención al 100%</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// 4. AGENDA SIMPLE (SOLO LISTA)
const AgendaSimpleWidget = ({ data }: { data: DashboardData }) => {
    const items = Array.isArray(data.agenda) ? data.agenda : [];
    const sortedItems = [...items].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return (
        <Card className="h-full shadow-sm border-slate-200 flex flex-col bg-white overflow-hidden min-h-[300px]">
            <CardHeader className="p-4 py-3 border-b border-slate-50 bg-slate-50/50 flex flex-row items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <CalendarCheck size={16} className="text-slate-500"/>
                    <CardTitle className="text-sm font-bold text-slate-900">Agenda del Día</CardTitle>
                </div>
                <Badge variant="outline" className="bg-white text-xs font-mono">{items.length}</Badge>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-y-auto bg-white relative">
                {sortedItems.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {sortedItems.map((appt) => {
                            const date = parseISO(appt.start_time);
                            const isCut = appt.service_category?.toLowerCase().includes('corte');
                            const isDone = appt.status === 'completed';

                            return (
                                <div key={appt.id} className={cn("flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors", isDone && "opacity-50 grayscale")}>
                                    <div className="flex flex-col items-center justify-center w-12 shrink-0 border-r border-slate-100 pr-2">
                                        <span className="text-xs font-bold text-slate-700">{format(date, 'HH:mm')}</span>
                                        <span className="text-[9px] text-slate-400 font-medium uppercase">{format(date, 'a', { locale: es })}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold text-slate-800 truncate">{appt.pet_name}</p>
                                            {isDone && <CheckCircle2 size={12} className="text-emerald-500"/>}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary" className={cn("text-[9px] h-4 px-1 rounded-sm font-normal", 
                                                isCut ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-cyan-50 text-cyan-700 border-cyan-100")}>
                                                {isCut ? <Scissors size={8} className="mr-1"/> : <Droplets size={8} className="mr-1"/>}
                                                <span className="truncate max-w-[140px]">{appt.service_name}</span>
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center gap-2 min-h-[200px]">
                        <Calendar size={24} className="opacity-20"/>
                        <p className="text-xs">No hay citas programadas para hoy.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// 5. ACCIONES
const QuickActionsWidget = () => (
    <Card className="h-full shadow-sm border-slate-200 bg-slate-900 text-white flex flex-col justify-between">
        <CardHeader className="p-4 pb-0"><CardTitle className="text-sm font-medium text-slate-300">Acciones</CardTitle></CardHeader>
        <CardContent className="p-4 grid grid-cols-2 gap-2.5 h-full content-center">
            <Link href="/checkin" className="contents"><Button variant="secondary" className="h-auto py-2.5 px-1 flex flex-col justify-center bg-white/10 hover:bg-white/20 text-white border-0"><LogIn size={18} className="opacity-80"/><span className="text-[10px] mt-1">Check-In</span></Button></Link>
            <NewAppointmentDialog customTrigger={<Button variant="secondary" className="h-auto py-2.5 px-1 flex flex-col justify-center bg-blue-600 hover:bg-blue-500 text-white border-0"><Plus size={18} /><span className="text-[10px] mt-1">Cita</span></Button>} />
            <Button variant="secondary" className="h-auto py-2.5 px-1 flex flex-col justify-center bg-white/10 hover:bg-white/20 text-white border-0"><CreditCard size={18} className="opacity-80"/><span className="text-[10px] mt-1">Cobrar</span></Button>
            <Link href="/admin/clients" className="contents"><Button variant="secondary" className="h-auto py-2.5 px-1 flex flex-col justify-center bg-white/10 hover:bg-white/20 text-white border-0"><Users size={18} className="opacity-80"/><span className="text-[10px] mt-1">Clientes</span></Button></Link>
        </CardContent>
    </Card>
);

// 6. STAFF
const StaffStatusWidget = ({ data }: { data: DashboardData }) => {
    const sortedStaff = [...(data.staff || [])].sort((a, b) => (a.status === 'busy' ? -1 : 1));
    const getStatusColor = (s: string) => { if (s === 'busy') return 'bg-red-500'; if (s === 'free') return 'bg-emerald-500'; return 'bg-amber-500'; }
    return (
        <Card className="h-full shadow-sm border-slate-200 flex flex-col bg-white overflow-hidden">
            <CardHeader className="p-4 py-3 border-b border-slate-50 flex flex-row justify-between items-center"><CardTitle className="text-sm font-bold text-slate-800">Equipo</CardTitle><Badge variant="secondary" className="text-[10px] h-5">{data.staff?.length || 0}</Badge></CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[200px]">
                {sortedStaff.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                        {sortedStaff.map((m) => (
                            <div key={m.id} className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3 overflow-hidden"><div className="relative shrink-0"><Avatar className="h-8 w-8 border border-slate-100 bg-slate-50"><AvatarFallback className="text-[10px] font-bold text-slate-600">{m.name.substring(0,2).toUpperCase()}</AvatarFallback></Avatar><span className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white", getStatusColor(m.status))}></span></div><div className="min-w-0"><p className="text-xs font-semibold text-slate-700 truncate">{m.name}</p><p className="text-[10px] text-slate-400 truncate">{m.status === 'busy' ? `Con ${m.current_pet || 'Mascota'}` : 'Disponible'}</p></div></div>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-xs text-slate-400 text-center py-6">Sin personal activo.</p>}
            </CardContent>
        </Card>
    );
}

// 7. TOP MASCOTAS
const TopBreedsWidget = ({ data }: { data: DashboardData }) => {
    const breeds = data.topBreeds || [];
    const maxCount = Math.max(...breeds.map(b => b.count), 1);
    return (
        <Card className="h-full shadow-sm border-slate-200 flex flex-col bg-white overflow-hidden">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2"><Crown className="h-4 w-4 text-yellow-500"/> Top Mascotas</CardTitle></CardHeader>
            <CardContent className="p-4 pt-1 flex-1 flex flex-col justify-center gap-3">
                {breeds.length > 0 ? breeds.map((item, i) => (
                    <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium"><span className="text-slate-700 truncate max-w-[70%]">{item.name || 'Mestizo'}</span><span className="text-slate-500">{item.count}</span></div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-800 rounded-full transition-all duration-500" style={{ width: `${(item.count / maxCount) * 100}%` }}/></div>
                    </div>
                )) : <p className="text-xs text-slate-400 text-center">Sin datos</p>}
            </CardContent>
        </Card>
    );
};

// --- CATALOGO DEFINITIVO ---
export const WIDGET_CATALOG = {
  revenue_zettle: { id: 'revenue_zettle', component: RevenueZettleWidget, roles: ['admin', 'manager', 'receptionist'], defaultColSpan: 1 },
  agenda_combined: { id: 'agenda_combined', component: AgendaSimpleWidget, roles: ['all'], defaultColSpan: 1 },
  staff_status: { id: 'staff_status', component: StaffStatusWidget, roles: ['admin', 'manager'], defaultColSpan: 1 },
  weather: { id: 'weather', component: WeatherWidget, roles: ['all'], defaultColSpan: 1 },
  quick_actions: { id: 'quick_actions', component: QuickActionsWidget, roles: ['admin', 'manager', 'receptionist'], defaultColSpan: 1 },
  retention_risk: { id: 'retention_risk', component: RetentionWidget, roles: ['admin', 'manager', 'receptionist'], defaultColSpan: 1 },
  top_breeds: { id: 'top_breeds', component: TopBreedsWidget, roles: ['all'], defaultColSpan: 1 },
};

export type WidgetId = keyof typeof WIDGET_CATALOG;