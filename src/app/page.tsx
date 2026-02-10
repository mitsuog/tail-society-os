import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { CalendarPlus, Search } from 'lucide-react';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { subDays, addDays } from 'date-fns';
import DraggableDashboard from '@/components/dashboard/DraggableDashboard';
import { fetchRecentZettlePurchases } from '@/lib/zettle';
// Importamos el tipo solo como referencia
import type { DashboardData } from '@/components/dashboard/WidgetRegistry';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. ROL Y USUARIO
  let role = 'employee';
  let displayName = 'Usuario';
  if (user) {
      const { data: emp } = await supabase.from('employees').select('role, first_name').eq('id', user.id).single();
      if (emp) { 
          role = emp.role; 
          displayName = emp.first_name; 
      } else { 
          displayName = user.user_metadata?.first_name || 'Admin'; 
          role = 'admin'; 
      }
  }

  // 2. CONFIGURACIÓN DE FECHAS (Monterrey)
  const timeZone = 'America/Monterrey';
  const now = new Date();
  
  const getMtyDateStr = (d: Date) => d.toLocaleDateString('en-CA', { timeZone });
  const todayStr = getMtyDateStr(now); 
  const yestStr = getMtyDateStr(subDays(now, 1));
  const lastWeekStr = getMtyDateStr(subDays(now, 7));

  // Rango exacto para hoy en base de datos (-06:00)
  const todayStartSupabase = `${todayStr}T00:00:00-06:00`;
  const todayEndSupabase = `${todayStr}T23:59:59.999-06:00`;

  const dateContext = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone });
  const hour = Number(new Date().toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone }));
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  // 3. LAYOUT DEL DASHBOARD (SIN DUPLICADOS)
  const defaultLayout = ['revenue_zettle', 'agenda_combined', 'staff_status', 'weather', 'quick_actions', 'retention_risk', 'top_breeds'];
  let userLayout: string[] = defaultLayout;

  if (user) {
    const { data: settings } = await supabase.from('user_settings').select('dashboard_layout').eq('user_id', user.id).single();
    
    if (settings?.dashboard_layout && Array.isArray(settings.dashboard_layout) && settings.dashboard_layout.length > 0) {
        // --- LIMPIEZA DE LAYOUT ---
        const LEGACY_MAP: Record<string, string> = {
            'stats_overview': 'revenue_zettle',
            'live_operations': 'agenda_combined',
            'client_pulse': 'quick_actions'
        };
        const cleanedLayout = settings.dashboard_layout.map(id => LEGACY_MAP[id] || id);
        userLayout = Array.from(new Set(cleanedLayout));
    }
  }

  // 4. FETCHING DE DATOS
  
  // A. FINANZAS
  const getFinance = async () => {
      if (!['admin', 'manager', 'receptionist'].includes(role)) return null;
      const nextDayStr = (d: Date) => getMtyDateStr(addDays(d, 1));
      const [todayData, yestData, lastWeekData] = await Promise.all([
          fetchRecentZettlePurchases(todayStr, nextDayStr(now)),
          fetchRecentZettlePurchases(yestStr, todayStr),
          fetchRecentZettlePurchases(lastWeekStr, nextDayStr(subDays(now, 7)))
      ]);
      
      const calculateTotal = (res: any, target: string) => {
          if (!res?.purchases) return 0;
          return res.purchases.reduce((acc: number, p: any) => {
              const pDate = new Date(p.timestamp).toLocaleDateString('en-CA', { timeZone });
              return pDate === target ? acc + (p.amount || 0) : acc;
          }, 0) / 100;
      };

      const tVal = calculateTotal(todayData, todayStr);
      const yVal = calculateTotal(yestData, yestStr);
      const lVal = calculateTotal(lastWeekData, lastWeekStr);

      return {
          amount: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(tVal),
          vsYesterday: yVal > 0 ? ((tVal - yVal)/yVal)*100 : 0,
          vsLastWeek: lVal > 0 ? ((tVal - lVal)/lVal)*100 : 0,
          yesterdayAmount: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(yVal),
          lastWeekAmount: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(lVal),
      };
  };

  // B. AGENDA (Consulta Appointment Services)
  const getOperationalData = async () => {
    const { data, error } = await supabase
      .from('appointment_services')
      .select(`
        id, service_name, category,
        services ( name, category ),
        appointments!inner ( id, start_time, status, pets (name) )
      `)
      .gte('appointments.start_time', todayStartSupabase)
      .lte('appointments.start_time', todayEndSupabase)
      .neq('appointments.status', 'cancelled');
    
    if (error || !data) return { agenda: [], operations: { waiting:0, bathing:0, cutting:0, ready:0, total:0 } };
    
    const agenda = data.map((item: any) => {
        const petsData = item.appointments?.pets as any; // Cast explicito aquí también
        const petName = Array.isArray(petsData) ? petsData[0]?.name : petsData?.name;
        const svcName = item.service_name || item.services?.name || 'Servicio';
        const svcCat = (item.category || item.services?.category || 'baño').toLowerCase();
        
        return { 
            id: item.id, 
            start_time: item.appointments?.start_time, 
            pet_name: petName || 'Mascota', 
            status: item.appointments?.status, 
            service_name: svcName, 
            service_category: svcCat 
        };
    });

    let waiting = 0, bathing = 0, cutting = 0, ready = 0;
    const processedAppts = new Set(); 

    data.forEach((item: any) => {
        const apptId = item.appointments.id;
        const status = item.appointments.status;
        const cat = (item.category || item.services?.category || '').toLowerCase();

        if (!processedAppts.has(apptId)) {
            if (status === 'checked_in' || status === 'confirmed') waiting++;
            else if (status === 'completed') ready++;
            processedAppts.add(apptId);
        }
        if (status === 'in_process' || status === 'attended') { 
            if (cat.includes('corte') || cat.includes('cut')) cutting++; else bathing++; 
        }
    });

    return { agenda, operations: { waiting, bathing, cutting, ready, total: (waiting + bathing + cutting + ready) } };
  };

  // C. STAFF (CORREGIDO EL ERROR DE TYPE)
  const getStaffStatus = async () => {
    const { data: employees } = await supabase.from('employees').select('id, first_name').eq('active', true);
    if (!employees) return [];
    
    const { data: activeAppts } = await supabase
        .from('appointments')
        .select('employee_id, pets(name)')
        .eq('status', 'in_process')
        .gte('start_time', todayStartSupabase)
        .lte('start_time', todayEndSupabase);
        
    return employees.map(emp => {
        const job = activeAppts?.find((a: any) => a.employee_id === emp.id);
        
        // --- CORRECCIÓN ---
        // Forzamos el tipo 'any' para evitar que TS se queje de 'never'
        const jobPets = job?.pets as any;
        const pName = jobPets ? (Array.isArray(jobPets) ? jobPets[0]?.name : jobPets.name) : undefined;
        
        return { 
            id: emp.id, 
            name: emp.first_name, 
            status: (job ? 'busy' : 'free') as 'busy' | 'free' | 'break', 
            current_pet: pName 
        };
    });
  };

  // D. TOP RAZAS
  const getTopBreeds = async () => {
     const monthAgo = subDays(now, 30).toISOString();
     const { data } = await supabase.from('appointments').select(`pets(breed)`).gte('date', monthAgo).eq('status', 'completed');
     const counts: Record<string, number> = {};
     data?.forEach((i: any) => { 
         const p = i.pets as any; // Cast seguro
         const petObj = Array.isArray(p) ? p[0] : p;
         if (petObj?.breed) counts[petObj.breed] = (counts[petObj.breed] || 0) + 1; 
     });
     return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 4);
  };

  // E. RETENCIÓN
  const getRetention = async () => {
      const rangeStart = subDays(now, 90).toISOString();
      const { data: appts } = await supabase.from('appointments').select('client_id, date, clients(id, full_name, phone)').gte('date', rangeStart).order('date', { ascending: false });
      if (!appts) return { risk15: [], risk30: [] };
      const lastVisits = new Map();
      appts.forEach((a: any) => { 
          if (!lastVisits.has(a.client_id)) { 
              const c = a.clients as any;
              lastVisits.set(a.client_id, { date: new Date(a.date), client: Array.isArray(c) ? c[0] : c }); 
          }
      });
      
      const risk15: any[] = []; const risk30: any[] = []; const t = now.getTime();
      lastVisits.forEach((val) => {
          const daysAgo = Math.floor((t - val.date.getTime()) / (1000 * 60 * 60 * 24));
          if (val.client?.full_name) {
              const item = { id: val.client.id, name: val.client.full_name, phone: val.client.phone, days_ago: daysAgo };
              if (daysAgo >= 30) risk30.push(item);
              else if (daysAgo >= 15) risk15.push(item);
          }
      });
      return { risk15: risk15.slice(0, 10), risk30: risk30.slice(0, 10) };
  };

  // F. CLIENTES NUEVOS / CUMPLEAÑOS
  const getInsights = async () => {
      const weekAgo = subDays(now, 7).toISOString();
      const { data: newC } = await supabase.from('clients').select('id, full_name, phone, created_at').gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(10);
      const newClients = newC?.map((c: any) => ({ id: c.id, name: c.full_name, phone: c.phone, created_at: c.created_at })) || [];
      return { newClients, birthdays: [] }; 
  };

  const [finance, ops, staff, topBreeds, retention, insights] = await Promise.all([
      getFinance(), getOperationalData(), getStaffStatus(), getTopBreeds(), getRetention(), getInsights()
  ]);

  // Objeto sin tipado estricto para permitir mezcla de datos
  const dashboardData = {
    revenue: finance, 
    agenda: { items: ops.agenda, stats: ops.operations },
    operations: ops.operations,
    staff, topBreeds, retention, clientInsights: insights,
    weather: { temp: 24, condition: 'Soleado', min: 18, rainProb: 10 },
    dateContext
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{greeting}, {displayName}</h1>
            <p className="text-slate-500 mt-1 text-sm">Resumen de actividad.</p>
          </div>
          <div className="flex gap-2">
             <Link href="/admin/clients"><Button variant="outline" className="bg-white border-slate-200 text-slate-600 h-9 text-xs"><Search className="mr-2 h-3.5 w-3.5" /> Buscar</Button></Link>
             <NewAppointmentDialog customTrigger={<Button className="bg-slate-900 text-white h-9 text-xs"><CalendarPlus className="mr-2 h-3.5 w-3.5" /> Nueva Cita</Button>} />
          </div>
        </div>
        <DraggableDashboard initialLayout={userLayout} userRole={role} data={dashboardData as any} />
      </div>
    </div>
  );
}