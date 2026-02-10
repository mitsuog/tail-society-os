import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { CalendarPlus, Search } from 'lucide-react';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { subDays, addDays, format, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import DraggableDashboard from '@/components/dashboard/DraggableDashboard';
import { fetchRecentZettlePurchases } from '@/lib/zettle';
import { WIDGET_CATALOG } from '@/components/dashboard/WidgetRegistry';
import type { DashboardData } from '@/components/dashboard/WidgetRegistry';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ─────────────────────────────────────────────
  // 1. ROL Y NOMBRE (desde user_roles)
  // ─────────────────────────────────────────────
  let role = 'employee';
  let displayName = 'Usuario';

  if (user) {
    // user_roles: PK es "id", nombre es "full_name"
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (userRole) {
      role = userRole.role || 'employee';
      // Extraer nombre de pila del full_name
      const firstName = userRole.full_name?.split(' ')[0];
      displayName = firstName || 'Usuario';
    } else {
      // Fallback a employees si no existe en user_roles
      const { data: emp } = await supabase
        .from('employees')
        .select('role, first_name')
        .eq('id', user.id)
        .single();

      if (emp) {
        role = emp.role;
        displayName = emp.first_name;
      } else {
        displayName = user.user_metadata?.first_name || 'Admin';
        role = 'admin';
      }
    }
  }

  // ─────────────────────────────────────────────
  // 2. FECHAS (Zona horaria: Monterrey)
  // ─────────────────────────────────────────────
  const timeZone = 'America/Monterrey';
  const now = new Date();
  const getMtyDateStr = (d: Date) => d.toLocaleDateString('en-CA', { timeZone });

  const todayStr = getMtyDateStr(now);
  const todayStartISO = `${todayStr}T00:00:00-06:00`;
  const todayEndISO = `${todayStr}T23:59:59.999-06:00`;

  const dateContext = now.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone
  });

  const hour = Number(now.toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone }));
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  // ─────────────────────────────────────────────
  // 3. LAYOUT DEL USUARIO (con fallback por rol)
  // ─────────────────────────────────────────────
  const DEFAULT_LAYOUTS: Record<string, string[]> = {
    admin:        ['quick_actions', 'weather', 'agenda_combined', 'retention_risk', 'revenue_zettle', 'staff_status'],
    manager:      ['quick_actions', 'weather', 'agenda_combined', 'retention_risk', 'revenue_zettle', 'staff_status'],
    receptionist: ['quick_actions', 'weather', 'agenda_combined', 'retention_risk', 'revenue_zettle'],
    employee:     ['weather', 'agenda_combined', 'top_breeds'],
  };

  let userLayout: string[] = DEFAULT_LAYOUTS[role] || DEFAULT_LAYOUTS['employee'];

  if (user) {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('dashboard_layout')
      .eq('user_id', user.id)
      .single();

    if (settings?.dashboard_layout && Array.isArray(settings.dashboard_layout) && settings.dashboard_layout.length > 0) {
      // Migración de IDs antiguos
      const legacyMap: Record<string, string> = {
        live_operations: 'agenda_combined',
        stats_overview: 'revenue_zettle',
        client_pulse: 'quick_actions',
      };

      const validIds = new Set(Object.keys(WIDGET_CATALOG));
      const cleaned: string[] = [];

      for (const id of settings.dashboard_layout) {
        const resolvedId = legacyMap[id as string] || id;
        if (validIds.has(resolvedId) && !cleaned.includes(resolvedId)) {
          cleaned.push(resolvedId);
        }
      }

      if (cleaned.length > 0) {
        userLayout = cleaned;
      }
    }
  }

  // ─────────────────────────────────────────────
  // 4. FETCH DE DATOS (en paralelo)
  // ─────────────────────────────────────────────

  // A. FINANZAS
  const getFinance = async () => {
    if (!['admin', 'manager', 'receptionist'].includes(role)) return null;

    const yesterday = subDays(now, 1);
    const lastWeekSameDay = subWeeks(now, 1);
    const yesterdayStr = getMtyDateStr(yesterday);
    const lastWeekStr = getMtyDateStr(lastWeekSameDay);

    const [todayData, yesterdayData, lastWeekData] = await Promise.all([
      fetchRecentZettlePurchases(todayStr, getMtyDateStr(addDays(now, 1))),
      fetchRecentZettlePurchases(yesterdayStr, todayStr),
      fetchRecentZettlePurchases(lastWeekStr, getMtyDateStr(addDays(lastWeekSameDay, 1))),
    ]);

    const calcTotal = (res: any, target: string) => {
      if (!res?.purchases) return 0;
      return res.purchases.reduce((acc: number, p: any) => {
        const pDate = new Date(p.timestamp).toLocaleDateString('en-CA', { timeZone });
        return pDate === target ? acc + (p.amount || 0) : acc;
      }, 0) / 100;
    };

    const tVal = calcTotal(todayData, todayStr);
    const yVal = calcTotal(yesterdayData, yesterdayStr);
    const lVal = calcTotal(lastWeekData, lastWeekStr);

    const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : 0);
    const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

    return {
      amount: fmt(tVal),
      rawAmount: tVal,
      vsYesterday: pct(tVal, yVal),
      vsLastWeek: pct(tVal, lVal),
      yesterdayAmount: fmt(yVal),
      lastWeekAmount: fmt(lVal),
    };
  };

  // B. AGENDA — Igual que CalendarBoard: consultar appointment_services directo
  //    (appointments tiene "date", NO "start_time"; el start_time vive en appointment_services)
  const getAgendaData = async () => {
    const { data, error } = await supabase
      .from('appointment_services')
      .select(`
        id, start_time,
        service:services (name, category),
        appointment:appointments (id, status, pet:pets (name))
      `)
      .gte('start_time', todayStartISO)
      .lte('start_time', todayEndISO);

    if (error) {
      console.error('[Dashboard] Error agenda:', error.message);
      return [];
    }
    if (!data) return [];

    return data
      .filter((item: any) => {
        const status = item.appointment?.status;
        return status && status !== 'cancelled';
      })
      .map((item: any) => {
        const petData = item.appointment?.pet as any;
        const petName = Array.isArray(petData) ? petData[0]?.name : petData?.name;
        const svcName = item.service?.name || 'Servicio';
        const svcCat = (item.service?.category || 'bath').toLowerCase();

        return {
          id: item.id,
          appointment_id: item.appointment?.id || item.id,
          start_time: item.start_time,
          pet_name: petName || 'Mascota',
          status: item.appointment?.status || 'scheduled',
          service_name: svcName,
          service_category: svcCat,
        };
      });
  };

  // C. RETENCIÓN
  const getRetention = async () => {
    const { data: appts } = await supabase
      .from('appointments')
      .select('client_id, date, clients(id, full_name, phone)')
      .gte('date', subDays(now, 90).toISOString())
      .order('date', { ascending: false });

    if (!appts) return { risk15: [], risk30: [] };

    const visited = new Set<string>();
    const risk15: any[] = [];
    const risk30: any[] = [];

    for (const a of appts) {
      if (visited.has(a.client_id)) continue;
      visited.add(a.client_id);

      const days = Math.floor((now.getTime() - new Date(a.date).getTime()) / (1000 * 60 * 60 * 24));
      const c = a.clients as any;
      const client = Array.isArray(c) ? c[0] : c;

      if (client) {
        const item = { id: client.id, name: client.full_name, phone: client.phone, days_ago: days };
        if (days >= 30) risk30.push(item);
        else if (days >= 15) risk15.push(item);
      }
    }

    return { risk15: risk15.slice(0, 5), risk30: risk30.slice(0, 5) };
  };

  // D. CLIMA (simulado — reemplazar cuando tengas API key)
  const getWeather = () => ({
    current: { temp: 25, condition: 'Parcialmente Nublado', min: 19, max: 28, rainProb: 15 },
    forecast: [
      { day: format(addDays(now, 1), 'EEE', { locale: es }), temp: 26, rain: 20, icon: 'sun' },
      { day: format(addDays(now, 2), 'EEE', { locale: es }), temp: 24, rain: 40, icon: 'cloud' },
      { day: format(addDays(now, 3), 'EEE', { locale: es }), temp: 23, rain: 10, icon: 'sun' },
    ],
  });

  // E. STAFF
  const getStaff = async () => {
    const { data: emps } = await supabase
      .from('employees')
      .select('id, first_name')
      .eq('active', true);

    if (!emps) return [];

    const { data: jobs } = await supabase
      .from('appointments')
      .select('employee_id, pets(name)')
      .eq('status', 'in_process')
      .gte('start_time', todayStartISO)
      .lte('start_time', todayEndISO);

    return emps.map(e => {
      const job = jobs?.find((j: any) => j.employee_id === e.id);
      const jobPets = job?.pets as any;
      return {
        id: e.id,
        name: e.first_name,
        status: (job ? 'busy' : 'free') as 'busy' | 'free',
        current_pet: jobPets
          ? (Array.isArray(jobPets) ? jobPets[0]?.name : jobPets.name)
          : undefined,
      };
    });
  };

  // F. TOP RAZAS
  const getTopBreeds = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('pets(breed)')
      .gte('date', subDays(now, 30).toISOString())
      .eq('status', 'completed');

    const counts: Record<string, number> = {};
    data?.forEach((i: any) => {
      const p = i.pets as any;
      const petObj = Array.isArray(p) ? p[0] : p;
      if (petObj?.breed) counts[petObj.breed] = (counts[petObj.breed] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  };

  // ─────────────────────────────────────────────
  // EJECUCIÓN EN PARALELO
  // ─────────────────────────────────────────────
  const [finance, agendaData, staff, retention, topBreeds] = await Promise.all([
    getFinance(),
    getAgendaData(),
    getStaff(),
    getRetention(),
    getTopBreeds(),
  ]);

  const dashboardData: DashboardData = {
    revenue: finance,
    agenda: agendaData,                     // ← Array directo, tipo correcto
    staff,
    retention,
    topBreeds,
    clientInsights: { newClients: [], birthdays: [] },
    weather: getWeather(),
    dateContext,
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 overflow-y-auto">
      {/* pt-16 en móvil para no taparse con el hamburger/navbar */}
      <div className="max-w-[1600px] mx-auto w-full p-4 pt-16 md:pt-8 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              {greeting}, {displayName}
            </h1>
            <p className="text-slate-500 mt-1 text-sm capitalize">{dateContext}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/clients">
              <Button variant="outline" className="bg-white border-slate-200 text-slate-600 h-9 text-xs shadow-sm">
                <Search className="mr-2 h-3.5 w-3.5" /> Buscar
              </Button>
            </Link>
            <NewAppointmentDialog
              customTrigger={
                <Button className="bg-slate-900 text-white h-9 text-xs shadow-sm hover:bg-slate-800">
                  <CalendarPlus className="mr-2 h-3.5 w-3.5" /> Nueva Cita
                </Button>
              }
            />
          </div>
        </div>

        {/* Dashboard */}
        <DraggableDashboard
          initialLayout={userLayout}
          userRole={role}
          data={dashboardData}
          availableWidgets={Object.keys(WIDGET_CATALOG)}
        />
      </div>
    </div>
  );
}