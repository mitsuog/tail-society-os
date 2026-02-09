import { 
  Banknote, CalendarCheck, Users, TrendingUp, Sun 
} from 'lucide-react';
import { Card } from "@/components/ui/card";

// Importa tus componentes visuales aquí (los que hicimos antes)
// Para este ejemplo, usaré placeholders simplificados, pero tú usas tus componentes reales
// como <WeatherWidget />, <AgendaWidget />, etc.

export const WIDGET_CATALOG = {
  weather: {
    id: 'weather',
    component: () => <div className="h-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-xl shadow-sm">🌤️ Clima San Pedro</div>,
    roles: ['admin', 'manager', 'receptionist', 'employee'], // Todos
    defaultColSpan: 1, // 1 columna de 4
  },
  revenue_today: {
    id: 'revenue_today',
    component: ({ data }: any) => <div className="h-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm">💰 Ingresos: {data?.revenue}</div>,
    roles: ['admin', 'manager', 'receptionist'], // Solo financieros
    defaultColSpan: 1,
  },
  agenda: {
    id: 'agenda',
    component: ({ data }: any) => <div className="h-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm">📅 Agenda Visual ({data?.count} citas)</div>,
    roles: ['admin', 'manager', 'receptionist', 'employee'],
    defaultColSpan: 2, // Ocupa 2 columnas
  },
  clients_recent: {
    id: 'clients_recent',
    component: () => <div className="h-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm">👥 Clientes Recientes</div>,
    roles: ['admin', 'manager'],
    defaultColSpan: 2,
  }
};

export type WidgetId = keyof typeof WIDGET_CATALOG;