'use client';

import Link from 'next/link';
import {
  Banknote, CalendarCheck, Users, TrendingUp, TrendingDown,
  MapPin, CloudRain, Thermometer, Scissors, Droplets,
  Plus, CreditCard, LogIn, Clock, CheckCircle2,
  AlertTriangle, Crown, PawPrint, Phone, Calendar, Sun, Cloud, CloudSun,
  Zap, ArrowUpRight, ArrowDownRight, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================================
// TIPOS — Consistentes con lo que page.tsx realmente envía
// ============================================================
export type AgendaItem = {
  id: string;
  start_time: string;
  pet_name: string;
  status: string;
  service_name: string;
  service_category: string;
};

export type DashboardData = {
  revenue: {
    amount: string;
    rawAmount: number;
    vsYesterday: number;
    vsLastWeek: number;
    yesterdayAmount: string;
    lastWeekAmount: string;
  } | null;
  agenda: AgendaItem[];               // ← Array directo, ya no {items, stats}
  staff: { id: string; name: string; status: 'busy' | 'free' | 'break'; current_pet?: string }[];
  topBreeds: { name: string; count: number }[];
  retention: { risk15: any[]; risk30: any[] };
  clientInsights: any;
  weather: {
    current: { temp: number; condition: string; min: number; max: number; rainProb: number };
    forecast: Array<{ day: string; temp: number; rain: number; icon: string }>;
  };
  dateContext: string;
};

// ============================================================
// 1. FACTURACIÓN DIARIA
// ============================================================
const RevenueZettleWidget = ({ data }: { data: DashboardData }) => {
  const rev = data.revenue;
  if (!rev) return (
    <Card className="h-full border-slate-200 flex items-center justify-center bg-slate-50/60">
      <p className="text-slate-400 text-xs">Sin permisos financieros</p>
    </Card>
  );

  const isUpYest = rev.vsYesterday >= 0;
  const isUpWeek = rev.vsLastWeek >= 0;

  return (
    <Card className="h-full border-slate-200 shadow-sm bg-white overflow-hidden relative group">
      {/* Acento superior */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />

      <CardContent className="p-5 pt-6 flex flex-col justify-between h-full gap-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-1">Venta Neta Hoy</p>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">{rev.amount}</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-2.5 rounded-xl border border-emerald-100">
            <Banknote size={18} className="text-emerald-600" />
          </div>
        </div>

        {/* Comparativas */}
        <div className="space-y-2.5">
          <ComparisonRow
            label={`Ayer (${rev.yesterdayAmount})`}
            value={rev.vsYesterday}
            isUp={isUpYest}
          />
          <ComparisonRow
            label={`Sem. Pasada (${rev.lastWeekAmount})`}
            value={rev.vsLastWeek}
            isUp={isUpWeek}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const ComparisonRow = ({ label, value, isUp }: { label: string; value: number; isUp: boolean }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-slate-500">{label}</span>
    <div className={cn(
      "flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px]",
      isUp ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
    )}>
      {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(value).toFixed(1)}%
    </div>
  </div>
);

// ============================================================
// 2. CLIMA
// ============================================================
const WeatherWidget = ({ data }: { data: DashboardData }) => {
  const weather = data.weather;
  const current = weather?.current ?? { temp: 25, condition: 'Soleado', min: 18, max: 28, rainProb: 0 };
  const forecast = weather?.forecast ?? [];

  return (
    <Card className="h-full border-0 shadow-md overflow-hidden relative min-h-[180px]"
      style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #3b82f6 100%)'
      }}
    >
      {/* Decoración */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl" />

      <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full text-white">
        {/* Principal */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-blue-200 mb-2">
              <MapPin size={10} /> San Pedro Garza García
            </div>
            <div className="text-5xl font-extrabold tracking-tighter leading-none">{current.temp}°</div>
            <div className="text-sm font-medium text-blue-100 mt-1">{current.condition}</div>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center justify-end gap-1.5 text-blue-200">
              <Thermometer size={12} />
              <span className="text-xs font-medium">{current.min}° / {current.max}°</span>
            </div>
            <div className="flex items-center justify-end gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1">
              <CloudRain size={12} className="text-blue-200" />
              <span className="text-sm font-bold">{current.rainProb}%</span>
            </div>
          </div>
        </div>

        {/* Pronóstico 3 Días */}
        {forecast.length > 0 && (
          <div className="mt-auto pt-3 border-t border-white/10 grid grid-cols-3 gap-2">
            {forecast.map((day, i) => (
              <div key={i} className="flex flex-col items-center text-center bg-white/5 rounded-lg py-2 px-1 backdrop-blur-sm">
                <span className="text-[9px] uppercase font-bold text-blue-200 mb-1">{day.day}</span>
                <span className="text-base font-bold">{day.temp}°</span>
                <div className="flex items-center gap-0.5 text-[9px] text-blue-200 mt-0.5">
                  <Droplets size={8} /> {day.rain}%
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================
// 3. WATCHLIST (RETENCIÓN)
// ============================================================
const RetentionWidget = ({ data }: { data: DashboardData }) => {
  const risk30 = data.retention?.risk30 || [];
  const risk15 = data.retention?.risk15 || [];
  const allRisks = [
    ...risk30.map(c => ({ ...c, severity: 'high' as const })),
    ...risk15.map(c => ({ ...c, severity: 'medium' as const }))
  ].slice(0, 6);

  return (
    <Card className="h-full shadow-sm border-slate-200 flex flex-col bg-white overflow-hidden">
      <CardHeader className="p-4 py-3 flex flex-row items-center justify-between space-y-0 border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <div className="bg-amber-100 p-1 rounded-md">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          </div>
          Watchlist
        </CardTitle>
        {allRisks.length > 0 && (
          <Badge className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
            {allRisks.length} riesgo{allRisks.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-y-auto">
        {allRisks.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {allRisks.map((client, i) => (
              <div key={i} className="flex items-center justify-between p-3 group hover:bg-slate-50/80 transition-colors">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-bold text-slate-700 truncate">{client.name}</p>
                    {client.severity === 'high' ? (
                      <span className="inline-flex items-center h-4 px-1.5 text-[8px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200 rounded">
                        30+ días
                      </span>
                    ) : (
                      <span className="inline-flex items-center h-4 px-1.5 text-[8px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200 rounded">
                        15+ días
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock size={10} /> Última visita: hace {client.days_ago} días
                  </p>
                </div>
                {client.phone && (
                  <a href={`tel:${client.phone}`}>
                    <Button size="icon" variant="ghost"
                      className="h-7 w-7 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white shrink-0 transition-all"
                      title="Llamar"
                    >
                      <Phone size={13} />
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-2">
            <div className="bg-emerald-50 p-3 rounded-full">
              <CheckCircle2 size={20} className="text-emerald-500" />
            </div>
            <p className="text-xs text-slate-500 font-medium">¡Retención al 100%!</p>
            <p className="text-[10px] text-slate-400">Todos los clientes están al día</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================
// 4. AGENDA DEL DÍA
// ============================================================
const AgendaSimpleWidget = ({ data }: { data: DashboardData }) => {
  // Soporta tanto array directo como objeto legacy
  const items: AgendaItem[] = Array.isArray(data.agenda) ? data.agenda : [];
  const sortedItems = [...items].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const completed = sortedItems.filter(a => a.status === 'completed').length;
  const inProcess = sortedItems.filter(a => a.status === 'in_process').length;

  return (
    <Card className="h-full shadow-sm border-slate-200 flex flex-col bg-white overflow-hidden min-h-[300px]">
      <CardHeader className="p-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between shrink-0 space-y-0">
        <div className="flex items-center gap-2">
          <div className="bg-blue-50 p-1 rounded-md">
            <CalendarCheck size={14} className="text-blue-600" />
          </div>
          <CardTitle className="text-sm font-bold text-slate-900">Agenda del Día</CardTitle>
        </div>
        <div className="flex items-center gap-1.5">
          {inProcess > 0 && (
            <Badge className="text-[10px] h-5 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 animate-pulse">
              {inProcess} en curso
            </Badge>
          )}
          <Badge variant="outline" className="bg-white text-[10px] h-5 font-mono tabular-nums">
            {completed}/{sortedItems.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-y-auto bg-white">
        {sortedItems.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {sortedItems.map((appt) => {
              const date = parseISO(appt.start_time);
              const isCut = appt.service_category?.toLowerCase().includes('corte') || appt.service_category === 'cut';
              const isDone = appt.status === 'completed';
              const isActive = appt.status === 'in_process';

              return (
                <div key={appt.id} className={cn(
                  "flex items-center gap-3 p-3 transition-colors",
                  isDone && "opacity-40",
                  isActive && "bg-blue-50/50 border-l-2 border-l-blue-500",
                  !isDone && !isActive && "hover:bg-slate-50"
                )}>
                  {/* Hora */}
                  <div className="flex flex-col items-center justify-center w-12 shrink-0">
                    <span className={cn(
                      "text-sm font-bold tabular-nums",
                      isActive ? "text-blue-600" : "text-slate-700"
                    )}>
                      {format(date, 'HH:mm')}
                    </span>
                  </div>

                  {/* Separador visual */}
                  <div className={cn(
                    "w-0.5 h-8 rounded-full shrink-0",
                    isDone ? "bg-emerald-300" : isActive ? "bg-blue-400" : "bg-slate-200"
                  )} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        "text-xs font-bold truncate",
                        isDone ? "text-slate-500 line-through" : "text-slate-800"
                      )}>
                        {appt.pet_name}
                      </p>
                      {isDone && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
                      {isActive && (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                        </span>
                      )}
                    </div>
                    <Badge variant="secondary" className={cn(
                      "text-[9px] h-4 px-1.5 rounded mt-1 font-normal",
                      isCut
                        ? "bg-purple-50 text-purple-700 border-purple-100"
                        : "bg-cyan-50 text-cyan-700 border-cyan-100"
                    )}>
                      {isCut ? <Scissors size={8} className="mr-1" /> : <Droplets size={8} className="mr-1" />}
                      <span className="truncate max-w-[140px]">{appt.service_name}</span>
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3 min-h-[200px]">
            <div className="bg-slate-100 p-4 rounded-full">
              <Calendar size={24} className="text-slate-300" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Sin citas hoy</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Agenda una nueva cita para empezar</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================
// 5. ACCIONES RÁPIDAS
// ============================================================
const QuickActionsWidget = () => (
  <Card className="h-full shadow-sm border-0 overflow-hidden relative"
    style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
    }}
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_50%)]" />

    <CardHeader className="p-4 pb-2 relative z-10">
      <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        <Zap size={14} className="text-blue-400" />
        Acciones Rápidas
      </CardTitle>
    </CardHeader>
    <CardContent className="p-4 pt-2 grid grid-cols-2 gap-2.5 h-full content-center relative z-10">
      <Link href="/checkin" className="contents">
        <Button variant="secondary"
          className="h-auto py-3 px-2 flex flex-col justify-center gap-1.5 bg-white/[0.07] hover:bg-white/[0.14] text-white border-0 rounded-xl backdrop-blur-sm transition-all hover:scale-[1.02]"
        >
          <LogIn size={18} className="text-blue-300" />
          <span className="text-[10px] font-medium">Check-In</span>
        </Button>
      </Link>
      <NewAppointmentDialog customTrigger={
        <Button variant="secondary"
          className="h-auto py-3 px-2 flex flex-col justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border-0 rounded-xl transition-all hover:scale-[1.02]"
        >
          <Plus size={18} />
          <span className="text-[10px] font-medium">Nueva Cita</span>
        </Button>
      } />
      <Button variant="secondary"
        className="h-auto py-3 px-2 flex flex-col justify-center gap-1.5 bg-white/[0.07] hover:bg-white/[0.14] text-white border-0 rounded-xl backdrop-blur-sm transition-all hover:scale-[1.02]"
      >
        <CreditCard size={18} className="text-emerald-300" />
        <span className="text-[10px] font-medium">Cobrar</span>
      </Button>
      <Link href="/admin/clients" className="contents">
        <Button variant="secondary"
          className="h-auto py-3 px-2 flex flex-col justify-center gap-1.5 bg-white/[0.07] hover:bg-white/[0.14] text-white border-0 rounded-xl backdrop-blur-sm transition-all hover:scale-[1.02]"
        >
          <Users size={18} className="text-purple-300" />
          <span className="text-[10px] font-medium">Clientes</span>
        </Button>
      </Link>
    </CardContent>
  </Card>
);

// ============================================================
// 6. STAFF
// ============================================================
const StaffStatusWidget = ({ data }: { data: DashboardData }) => {
  const sortedStaff = [...(data.staff || [])].sort((a, b) => (a.status === 'busy' ? -1 : 1));

  const statusConfig = {
    busy: { color: 'bg-red-500', ring: 'ring-red-100', label: 'Ocupado' },
    free: { color: 'bg-emerald-500', ring: 'ring-emerald-100', label: 'Disponible' },
    break: { color: 'bg-amber-500', ring: 'ring-amber-100', label: 'Descanso' },
  };

  return (
    <Card className="h-full shadow-sm border-slate-200 flex flex-col bg-white overflow-hidden">
      <CardHeader className="p-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-row justify-between items-center space-y-0">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <div className="bg-violet-50 p-1 rounded-md">
            <Users size={14} className="text-violet-600" />
          </div>
          Equipo
        </CardTitle>
        <div className="flex items-center gap-1.5">
          <Badge className="text-[10px] h-5 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
            {sortedStaff.filter(s => s.status === 'free').length} libres
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-y-auto max-h-[220px]">
        {sortedStaff.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {sortedStaff.map((m) => {
              const cfg = statusConfig[m.status] || statusConfig.free;
              return (
                <div key={m.id} className="flex items-center justify-between p-3 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="relative shrink-0">
                      <Avatar className="h-8 w-8 border border-slate-100 bg-slate-50">
                        <AvatarFallback className="text-[10px] font-bold text-slate-600 bg-slate-100">
                          {m.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ring-2",
                        cfg.color, cfg.ring
                      )} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{m.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {m.status === 'busy' ? (
                          <span className="text-blue-500">
                            <PawPrint size={9} className="inline mr-0.5 -mt-0.5" />
                            {m.current_pet || 'Mascota'}
                          </span>
                        ) : cfg.label}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <p className="text-xs text-slate-400">Sin personal activo</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================
// 7. TOP MASCOTAS
// ============================================================
const TopBreedsWidget = ({ data }: { data: DashboardData }) => {
  const breeds = data.topBreeds || [];
  const maxCount = Math.max(...breeds.map(b => b.count), 1);

  const barColors = [
    'from-blue-500 to-blue-600',
    'from-violet-500 to-purple-600',
    'from-teal-500 to-cyan-600',
    'from-amber-500 to-orange-600',
  ];

  return (
    <Card className="h-full shadow-sm border-slate-200 flex flex-col bg-white overflow-hidden">
      <CardHeader className="p-4 pb-2 space-y-0">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <div className="bg-amber-50 p-1 rounded-md">
            <Crown className="h-3.5 w-3.5 text-amber-500" />
          </div>
          Top Razas del Mes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 flex-1 flex flex-col justify-center gap-3.5">
        {breeds.length > 0 ? breeds.map((item, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 w-4 text-right">#{i + 1}</span>
                <span className="font-semibold text-slate-700 truncate max-w-[70%]">{item.name || 'Mestizo'}</span>
              </div>
              <span className="text-slate-500 font-mono text-[11px] tabular-nums">{item.count}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", barColors[i % barColors.length])}
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <PawPrint size={20} className="text-slate-200 mb-2" />
            <p className="text-xs text-slate-400">Sin datos este mes</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================
// CATÁLOGO DEFINITIVO
// ============================================================
export const WIDGET_CATALOG = {
  revenue_zettle: { id: 'revenue_zettle', component: RevenueZettleWidget, roles: ['admin', 'manager', 'receptionist'], defaultColSpan: 1 },
  agenda_combined: { id: 'agenda_combined', component: AgendaSimpleWidget, roles: ['all'], defaultColSpan: 1 },
  staff_status: { id: 'staff_status', component: StaffStatusWidget, roles: ['admin', 'manager'], defaultColSpan: 1 },
  weather: { id: 'weather', component: WeatherWidget, roles: ['all'], defaultColSpan: 1 },
  quick_actions: { id: 'quick_actions', component: QuickActionsWidget, roles: ['admin', 'manager', 'receptionist'], defaultColSpan: 1 },
  retention_risk: { id: 'retention_risk', component: RetentionWidget, roles: ['admin', 'manager', 'receptionist'], defaultColSpan: 1 },
  top_breeds: { id: 'top_breeds', component: TopBreedsWidget, roles: ['all'], defaultColSpan: 1 },
} as const;

export type WidgetId = keyof typeof WIDGET_CATALOG;