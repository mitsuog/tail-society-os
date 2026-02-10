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

  // 2. CONFIGURACIÓN DE FECHAS (MONTERREY)
  const timeZone = 'America/Monterrey';
  const now = new Date();
  
  // Helpers
  const getMtyDateStr = (d: Date) => d.toLocaleDateString('en-CA', { timeZone });
  const todayStr = getMtyDateStr(now); 
  const yestStr = getMtyDateStr(subDays(now, 1));
  const lastWeekStr = getMtyDateStr(subDays(now, 7));

  // --- CORRECCIÓN DE FECHAS PARA SUPABASE ---
  // Construimos manualmente el ISO con offset -06:00 para garantizar que filtramos el día de Monterrey
  const todayStartSupabase = `${todayStr}T00:00:00-06:00`;
  const todayEndSupabase = `${todayStr}T23:59:59.999-06:00`;

  const dateContext = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone });
  const hour = Number(new Date().toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone }));
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  // 3. LAYOUT DEL DASHBOARD
  let userLayout: string[] = [];
  if (user) {
    const { data: settings } = await supabase.from('user_settings').select('dashboard_layout').eq('user_id', user.id).single();
    if (settings?.dashboard_layout && Array.isArray(settings.dashboard_layout) && settings.dashboard_layout.length > 0) {
      userLayout = settings.dashboard_layout;
    } else {
      userLayout = ['revenue_zettle', 'live_operations', 'staff_status', 'agenda_combined', 'weather', 'quick_actions'];
    }
  }

  // ---------------------------------------------------------------------------
  // 4. FETCHING DE DATOS
  // ---------------------------------------------------------------------------

  // A. FINANZAS (ZETTLE)
  const getFinance = async () => {
      if (!['admin', 'manager', 'receptionist'].includes(role)) return null;
      
      const nextDayStr = (d: Date) => getMtyDateStr(addDays(d, 1));
      
      const [todayData, yestData, lastWeekData] = await Promise.all([
          fetchRecentZettlePurchases(todayStr, nextDayStr(now)),
          fetchRecentZettlePurchases(yestStr, todayStr),
          fetchRecentZettlePurchases(lastWeekStr, nextDayStr(subDays(now, 7)))
      ]);

      const calculateDailyTotal = (response: { purchases: any[] } | null, targetDateStr: string) => {
          if (!response || !response.purchases) return 0;
          return response.purchases.reduce((acc: number, purchase: any) => {
              const pDate = new Date(purchase.timestamp);
              const pStr = pDate.toLocaleDateString('en-CA', { timeZone });
              if (pStr === targetDateStr) return acc + (purchase.amount || 0);
              return acc;
          }, 0) / 100; 
      };

      const tVal = calculateDailyTotal(todayData, todayStr); 
      const yVal = calculateDailyTotal(yestData, yestStr); 
      const lVal = calculateDailyTotal(lastWeekData, lastWeekStr);

      return {
          amount: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(tVal),
          vsYesterday: yVal > 0 ? ((tVal - yVal)/yVal)*100 : 0,
          vsLastWeek: lVal > 0 ? ((tVal - lVal)/lVal)*100 : 0,
          yesterdayAmount: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(yVal),
          lastWeekAmount: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(lVal),
      };
  };

  // B. AGENDA + OPERACIONES (Corrección Principal)
  const getOperationalData = async () => {
    // 1. Consultamos appointment_services directamente.
    // Intentamos traer 'service_name' directo O 'services(name)' por si es relación.
    const { data, error } = await supabase
      .from('appointment_services')
      .select(`
        id, 
        service_name, 
        category,
        services ( name, category ),
        appointments!inner (
          id,
          start_time,
          status,
          pets (name)
        )
      `)
      .gte('appointments.start_time', todayStartSupabase)
      .lte('appointments.start_time', todayEndSupabase)
      .neq('appointments.status', 'cancelled');
    
    if (error || !data) {
        console.error("Error fetching agenda:", error);
        return { agenda: [], operations: { waiting:0, bathing:0, cutting:0, ready:0, total:0 } };
    }
    
    // 2. Mapeo Robusto
    const agenda = data.map((item: any) => {
        // Nombre Mascota
        const petsData = item.appointments?.pets;
        const petName = Array.isArray(petsData) ? petsData[0]?.name : petsData?.name;
        
        // Nombre Servicio y Categoría (Prioridad: Directo -> Relación -> Default)
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

    // 3. Estadísticas de Operaciones
    let waiting = 0, bathing = 0, cutting = 0, ready = 0;
    const processedAppts = new Set(); 

    data.forEach((item: any) => {
        const apptId = item.appointments.id;
        const status = item.appointments.status;
        const cat = (item.category || item.services?.category || '').toLowerCase();

        // Contadores Globales (1 por cita)
        if (!processedAppts.has(apptId)) {
            if (status === 'checked_in' || status === 'confirmed') waiting++;
            else if (status === 'completed') ready++;
            processedAppts.add(apptId);
        }

        // Contadores de Proceso (1 por servicio)
        if (status === 'in_process' || status === 'attended') { 
            if (cat.includes('corte') || cat.includes('cut') || cat.includes('estilo')) cutting++; 
            else bathing++; 
        }
    });

    const operations = { waiting, bathing, cutting, ready, total: (waiting + bathing + cutting + ready) };
    return { agenda, operations };
  };

  // C. STAFF STATUS
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
        const activeJob = activeAppts?.find((a: any) => a.employee_id === emp.id);
        const petsData = activeJob?.pets as any; 
        const petName = petsData ? (Array.isArray(petsData) ? petsData[0]?.name : petsData.name) : undefined;

        return {
            id: emp.id,
            name: emp.first_name,
            status: (activeJob ? 'busy' : 'free') as 'busy' | 'free' | 'break',
            current_pet: petName
        };
    });
  };

  // D. TOP RAZAS
  const getTopBreeds = async () => {
     const thirtyDaysAgo = subDays(now, 30).toISOString();
     const { data } = await supabase.from('appointments').select(`pets(breed)`).gte('date', thirtyDaysAgo).eq('status', 'completed');
     const counts: Record<string, number> = {};
     data?.forEach((i: any) => { 
        const p = Array.isArray(i.pets) ? i.pets[0] : i.pets; 
        if (p?.breed) counts[p.breed] = (counts[p.breed] || 0) + 1; 
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
             lastVisits.set(a.client_id, { 
                 date: new Date(a.date), 
                 client: Array.isArray(a.clients) ? a.clients[0] : a.clients 
             }); 
          }
      });
      
      const risk15: any[] = []; const risk30: any[] = []; const todayTime = now.getTime();
      lastVisits.forEach((val) => {
          const daysAgo = Math.floor((todayTime - val.date.getTime()) / (1000 * 60 * 60 * 24));
          if (val.client?.phone && val.client?.full_name) {
              if (daysAgo >= 30) risk30.push({ id: val.client.id, name: val.client.full_name, phone: val.client.phone, days_ago: daysAgo });
              else if (daysAgo >= 15) risk15.push({ id: val.client.id, name: val.client.full_name, phone: val.client.phone, days_ago: daysAgo });
          }
      });
      return { risk15: risk15.slice(0, 10), risk30: risk30.slice(0, 10) };
  };

  // F. INSIGHTS
  const getClientInsights = async () => {
      const weekAgo = subDays(now, 7).toISOString();
      const { data: newClientsData } = await supabase.from('clients').select('id, full_name, phone, created_at').gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(10);
      const newClients = newClientsData?.map((c: any) => ({ id: c.id, name: c.full_name, phone: c.phone, created_at: c.created_at })) || [];

      const { data: petsData } = await supabase.from('pets').select('id, name, breed, birthdate, clients(full_name, phone)').not('birthdate', 'is', null);
      const birthdays: any[] = [];
      if (petsData) {
          const today = new Date(); const nextTwoWeeks = addDays(today, 14);
          petsData.forEach((p: any) => {
              if (!p.birthdate) return;
              const bdate = new Date(p.birthdate + 'T12:00:00'); 
              if (isNaN(bdate.getTime())) return;
              const bdayThisYear = new Date(today.getFullYear(), bdate.getMonth(), bdate.getDate());
              let targetBday = bdayThisYear;
              if (bdayThisYear < new Date(today.setHours(0,0,0,0))) { targetBday = new Date(today.getFullYear() + 1, bdate.getMonth(), bdate.getDate()); }
              if (targetBday >= new Date(today.setHours(0,0,0,0)) && targetBday <= nextTwoWeeks) {
                  const client = Array.isArray(p.clients) ? p.clients[0] : p.clients;
                  birthdays.push({ 
                      id: p.id, pet_name: p.name, breed: p.breed, owner_name: client?.full_name || 'Cliente', phone: client?.phone || '', birthdate: p.birthdate, 
                      turns_age: targetBday.getFullYear() - bdate.getFullYear(), _sortDate: targetBday.getTime() 
                  });
              }
          });
          birthdays.sort((a, b) => a._sortDate - b._sortDate);
      }
      return { newClients, birthdays: birthdays.slice(0, 10) };
  };

  // 6. EJECUCIÓN PARALELA
  const [finance, opsData, staff, topBreeds, retention, clientInsights] = await Promise.all([
      getFinance(), 
      getOperationalData(), 
      getStaffStatus(),
      getTopBreeds(), 
      getRetention(), 
      getClientInsights()
  ]);

  // Objeto de datos sin tipado forzado para permitir campos extra (staff, operations)
  const dashboardData = {
    revenue: finance, 
    agenda: {
        items: opsData.agenda,
        stats: opsData.operations
    },
    operations: opsData.operations,
    staff: staff,
    topBreeds, 
    retention, 
    clientInsights,
    weather: { temp: 24, condition: 'Soleado', min: 18, rainProb: 10 },
    dateContext: dateContext 
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