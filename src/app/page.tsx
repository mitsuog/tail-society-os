import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { CalendarPlus, Search } from 'lucide-react';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { subDays, addDays } from 'date-fns';
import DraggableDashboard from '@/components/dashboard/DraggableDashboard';
import { fetchRecentZettlePurchases } from '@/lib/zettle';
import { WIDGET_CATALOG } from '@/components/dashboard/WidgetRegistry';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. ROL Y USUARIO
  let role = 'employee';
  let displayName = 'Usuario';
  if (user) {
      const { data: emp } = await supabase.from('employees').select('role, first_name').eq('id', user.id).single();
      if (emp) { role = emp.role; displayName = emp.first_name; } 
      else { displayName = user.user_metadata?.first_name || 'Admin'; role = 'admin'; }
  }

  // 2. CONFIGURACIÓN DE FECHAS
  const timeZone = 'America/Monterrey';
  const now = new Date();
  const getMtyDateStr = (d: Date) => d.toLocaleDateString('en-CA', { timeZone });
  const todayStr = getMtyDateStr(now); 
  const todayStartISO = `${todayStr}T00:00:00-06:00`;
  const todayEndISO = `${todayStr}T23:59:59.999-06:00`;
  const dateContext = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone });
  const hour = Number(new Date().toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone }));
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  // 3. LAYOUTS POR DEFECTO (REGLAS DE NEGOCIO)
  const DEFAULT_LAYOUTS: Record<string, string[]> = {
      'admin': ['quick_actions', 'weather', 'agenda_combined', 'retention_risk', 'revenue_zettle', 'staff_status'],
      'manager': ['quick_actions', 'weather', 'agenda_combined', 'retention_risk', 'revenue_zettle', 'staff_status'],
      'receptionist': ['quick_actions', 'weather', 'agenda_combined', 'retention_risk', 'revenue_zettle'],
      'employee': ['weather', 'agenda_combined', 'top_breeds']
  };

  // Determinar layout inicial
  let userLayout: string[] = DEFAULT_LAYOUTS[role] || DEFAULT_LAYOUTS['employee'];

  if (user) {
    const { data: settings } = await supabase.from('user_settings').select('dashboard_layout').eq('user_id', user.id).single();
    
    // FIX TS18047: Validación segura de settings
    if (settings && settings.dashboard_layout && Array.isArray(settings.dashboard_layout) && settings.dashboard_layout.length > 0) {
        // Limpieza de legacy
        const legacyMap: Record<string, string> = { 'live_operations': 'agenda_combined', 'stats_overview': 'revenue_zettle', 'client_pulse': 'quick_actions' };
        const cleaned = new Set<string>();
        settings.dashboard_layout.forEach((id: string) => {
            const newId = legacyMap[id] || id;
            if (Object.keys(WIDGET_CATALOG).includes(newId)) cleaned.add(newId);
        });
        userLayout = Array.from(cleaned);
    }
  }

  // 4. FETCHING DE DATOS
  const getFinance = async () => {
      if (!['admin', 'manager', 'receptionist'].includes(role)) return null;
      const [tD, yD] = await Promise.all([
          fetchRecentZettlePurchases(todayStr, getMtyDateStr(addDays(now, 1))),
          fetchRecentZettlePurchases(getMtyDateStr(subDays(now, 1)), todayStr)
      ]);
      const calc = (res: any, target: string) => res?.purchases?.reduce((acc: number, p: any) => (new Date(p.timestamp).toLocaleDateString('en-CA', {timeZone}) === target ? acc + (p.amount||0) : acc), 0)/100 || 0;
      const tVal = calc(tD, todayStr); const yVal = calc(yD, getMtyDateStr(subDays(now, 1)));
      return { amount: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits:0 }).format(tVal), vsYesterday: yVal > 0 ? ((tVal-yVal)/yVal)*100 : 0, yesterdayAmount: `$${yVal}`, lastWeekAmount: '$0', vsLastWeek: 0 };
  };

  const getAgendaData = async () => {
    const { data, error } = await supabase.from('appointments').select(`id, start_time, status, pets (name), appointment_services (service_name, services (name, category))`).gte('start_time', todayStartISO).lte('start_time', todayEndISO).neq('status', 'cancelled');
    if (error || !data) return [];
    return data.map((appt: any) => {
        // FIX TS2339: Cast explicito a 'any' para evitar error 'never'
        const petsData = appt.pets as any;
        const petName = Array.isArray(petsData) ? petsData[0]?.name : petsData?.name;
        const s = appt.appointment_services; 
        const mS = Array.isArray(s) ? s[0] : s;
        return { id: appt.id, start_time: appt.start_time, pet_name: petName || 'Mascota', status: appt.status, service_name: mS?.service_name || mS?.services?.name || 'Servicio', service_category: (mS?.services?.category || 'baño').toLowerCase() };
    });
  };

  const getStaff = async () => {
      const { data: emps } = await supabase.from('employees').select('id, first_name').eq('active', true); if(!emps) return [];
      const { data: jobs } = await supabase.from('appointments').select('employee_id, pets(name)').eq('status', 'in_process').gte('start_time', todayStartISO).lte('start_time', todayEndISO);
      return emps.map(e => { 
          const job = jobs?.find((j: any) => j.employee_id === e.id); 
          const jobPets = job?.pets as any; // Cast explicito
          return { id: e.id, name: e.first_name, status: (job ? 'busy' : 'free') as 'busy'|'free', current_pet: jobPets ? (Array.isArray(jobPets) ? jobPets[0]?.name : jobPets.name) : undefined }; 
      });
  };

  const getRetention = async () => {
      const { data: appts } = await supabase.from('appointments').select('client_id, date, clients(id, full_name, phone)').gte('date', subDays(now, 90).toISOString()).order('date', {ascending: false});
      if(!appts) return { risk15: [], risk30: [] };
      const visited = new Set(); const risk15: any[] = []; const risk30: any[] = [];
      appts.forEach((a: any) => {
          if(!visited.has(a.client_id)) {
              visited.add(a.client_id);
              const days = Math.floor((now.getTime() - new Date(a.date).getTime())/(1000*60*60*24));
              const c = a.clients as any; const client = Array.isArray(c) ? c[0] : c;
              if(client) { const item = { id: client.id, name: client.full_name, phone: client.phone, days_ago: days }; if(days >= 30) risk30.push(item); else if(days >= 15) risk15.push(item); }
          }
      });
      return { risk15: risk15.slice(0,5), risk30: risk30.slice(0,5) };
  };

  const getTopBreeds = async () => {
      const { data } = await supabase.from('appointments').select('pets(breed)').gte('date', subDays(now, 30).toISOString()).eq('status', 'completed');
      const counts: Record<string, number> = {};
      data?.forEach((i: any) => { const p = i.pets as any; const petObj = Array.isArray(p) ? p[0] : p; if(petObj?.breed) counts[petObj.breed] = (counts[petObj.breed]||0)+1; });
      return Object.entries(counts).map(([name, count]) => ({name, count})).sort((a,b)=>b.count-a.count).slice(0,4);
  }

  const [finance, agenda, staff, retention, topBreeds] = await Promise.all([getFinance(), getAgendaData(), getStaff(), getRetention(), getTopBreeds()]);

  const dashboardData = { revenue: finance, agenda: agenda, staff, retention, topBreeds, clientInsights: { newClients: [], birthdays: [] }, weather: { temp: 24, condition: 'Soleado', min: 18, rainProb: 0 }, dateContext };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
          <div><h1 className="text-3xl font-bold text-slate-900 tracking-tight">{greeting}, {displayName}</h1><p className="text-slate-500 mt-1 text-sm">Resumen de actividad.</p></div>
          <div className="flex gap-2">
             <Link href="/admin/clients"><Button variant="outline" className="bg-white border-slate-200 text-slate-600 h-9 text-xs"><Search className="mr-2 h-3.5 w-3.5" /> Buscar</Button></Link>
             <NewAppointmentDialog customTrigger={<Button className="bg-slate-900 text-white h-9 text-xs"><CalendarPlus className="mr-2 h-3.5 w-3.5" /> Nueva Cita</Button>} />
          </div>
        </div>
        <DraggableDashboard initialLayout={userLayout} userRole={role} data={dashboardData as any} availableWidgets={Object.keys(WIDGET_CATALOG)} />
      </div>
    </div>
  );
}