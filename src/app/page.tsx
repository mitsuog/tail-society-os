import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { CalendarPlus, Search } from 'lucide-react';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { subDays, addDays } from 'date-fns';
import DraggableDashboard from '@/components/dashboard/DraggableDashboard';
// Asegúrate que este import esté así:
import type { DashboardData } from '@/components/dashboard/WidgetRegistry';
import { fetchRecentZettlePurchases } from '@/lib/zettle';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. ROL
  let role = 'employee';
  let displayName = 'Usuario';
  if (user) {
      const { data: emp } = await supabase.from('employees').select('role, first_name').eq('id', user.id).single();
      if (emp) { role = emp.role; displayName = emp.first_name; } 
      else { displayName = user.user_metadata?.first_name || 'Admin'; role = 'admin'; }
  }

  // 2. CONFIGURACIÓN DE FECHAS (Monterrey)
  const timeZone = 'America/Monterrey';
  const now = new Date();
  
  const getMtyDateStr = (d: Date) => d.toLocaleDateString('en-CA', { timeZone });
  const todayStr = getMtyDateStr(now); 
  const yestStr = getMtyDateStr(subDays(now, 1));
  const lastWeekStr = getMtyDateStr(subDays(now, 7));

  // Rango ISO explícito para Monterrey
  const todayStartSupabase = `${todayStr}T00:00:00-06:00`; 
  const todayEndSupabase = `${todayStr}T23:59:59-06:00`;

  const dateContext = new Date(todayStartSupabase).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone });
  const hour = Number(new Date().toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone }));
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  // 3. LAYOUT
  let userLayout: string[] = [];
  if (user) {
    const { data: settings } = await supabase.from('user_settings').select('dashboard_layout').eq('user_id', user.id).single();
    if (settings && settings.dashboard_layout && Array.isArray(settings.dashboard_layout) && settings.dashboard_layout.length > 0) {
      userLayout = settings.dashboard_layout;
    } else {
      userLayout = ['revenue_zettle', 'weather', 'client_pulse', 'agenda_combined', 'retention_risk', 'top_breeds', 'quick_actions'];
    }
  }

  // 5. FETCHING
  // A. FINANZAS
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

  // B. AGENDA
  const getAgenda = async () => {
    const { data } = await supabase.from('appointments')
        .select(`id, start_time, status, pets(name), appointment_services(services(name, category))`)
        .gte('start_time', todayStartSupabase)
        .lte('start_time', todayEndSupabase)
        .neq('status', 'cancelled');
    
    if (!data) return { items: [], stats: { waiting:0, bathing:0, cutting:0, ready:0, total:0 } };
    
    let stats = { waiting:0, bathing:0, cutting:0, ready:0, total:0 };
    const items = data.map((item: any) => {
        const rawPet = Array.isArray(item.pets) ? item.pets[0] : item.pets;
        const rawSvcWrapper = Array.isArray(item.appointment_services) ? item.appointment_services[0] : item.appointment_services;
        const rawSvc = Array.isArray(rawSvcWrapper?.services) ? rawSvcWrapper.services[0] : rawSvcWrapper?.services;
        
        const petName = rawPet?.name || 'Mascota';
        const svcName = rawSvc?.name || 'Servicio';
        const cat = rawSvc?.category?.toLowerCase() || '';
        
        if (item.status === 'checked_in' || item.status === 'confirmed') stats.waiting++;
        else if (item.status === 'completed') stats.ready++;
        else if (item.status === 'in_process' || item.status === 'attended') { 
            if (cat.includes('corte') || cat.includes('cut')) stats.cutting++; else stats.bathing++; 
        }
        
        return { 
            id: item.id, 
            start_time: item.start_time, 
            pet_name: petName, 
            status: item.status, 
            service_name: svcName, 
            service_category: cat 
        };
    });
    stats.total = items.length;
    return { items, stats };
  };

  // C. TOP RAZAS
  const getTopBreeds = async () => {
     const thirtyDaysAgo = subDays(now, 30).toISOString();
     const { data } = await supabase.from('appointments').select(`pets(breed)`).gte('date', thirtyDaysAgo).eq('status', 'completed');
     const counts: Record<string, number> = {};
     data?.forEach((i: any) => { const p = Array.isArray(i.pets) ? i.pets[0] : i.pets; if (p?.breed) counts[p.breed] = (counts[p.breed] || 0) + 1; });
     return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 4);
  };

  // D. RETENCIÓN
  const getRetention = async () => {
      const rangeStart = subDays(now, 90).toISOString();
      const { data: appts } = await supabase.from('appointments').select('client_id, date, clients(id, full_name, phone)').gte('date', rangeStart).order('date', { ascending: false });
      if (!appts) return { risk15: [], risk30: [] };
      const lastVisits = new Map();
      appts.forEach((a: any) => { if (!lastVisits.has(a.client_id)) lastVisits.set(a.client_id, { date: new Date(a.date), client: Array.isArray(a.clients) ? a.clients[0] : a.clients }); });
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

  // E. INSIGHTS
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
              const bdate = new Date(p.birthdate + 'T00:00:00'); 
              if (isNaN(bdate.getTime())) return;
              const bdayThisYear = new Date(today.getFullYear(), bdate.getMonth(), bdate.getDate());
              let targetBday = bdayThisYear;
              if (bdayThisYear < new Date(today.setHours(0,0,0,0))) { targetBday = new Date(today.getFullYear() + 1, bdate.getMonth(), bdate.getDate()); }
              if (targetBday >= new Date(today.setHours(0,0,0,0)) && targetBday <= nextTwoWeeks) {
                  const client = Array.isArray(p.clients) ? p.clients[0] : p.clients;
                  birthdays.push({ id: p.id, pet_name: p.name, breed: p.breed, owner_name: client?.full_name || 'Cliente', phone: client?.phone || '', birthdate: p.birthdate, turns_age: targetBday.getFullYear() - bdate.getFullYear(), _sortDate: targetBday.getTime() });
              }
          });
          birthdays.sort((a, b) => a._sortDate - b._sortDate);
      }
      return { newClients, birthdays: birthdays.slice(0, 10) };
  };

  const [finance, agenda, topBreeds, retention, clientInsights] = await Promise.all([getFinance(), getAgenda(), getTopBreeds(), getRetention(), getClientInsights()]);

  const dashboardData: DashboardData = {
    revenue: finance, agenda, topBreeds, retention, clientInsights,
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
        <DraggableDashboard initialLayout={userLayout} userRole={role} data={dashboardData} />
      </div>
    </div>
  );
}