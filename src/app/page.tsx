import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { CalendarPlus, Search, ShieldCheck } from 'lucide-react';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { startOfWeek, endOfWeek, subWeeks, format, subDays } from 'date-fns';
import DraggableDashboard from '@/components/dashboard/DraggableDashboard';
import { WIDGET_CATALOG } from '@/components/dashboard/WidgetRegistry';
import type { DashboardData } from '@/components/dashboard/WidgetRegistry';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Detección de Rol
  let role = 'employee';
  let displayName = 'Usuario';
  if (user) {
      const { data: emp } = await supabase.from('employees').select('role, first_name').eq('id', user.id).single();
      if (emp) { 
          role = emp.role; 
          displayName = emp.first_name; 
      } else { 
          // Fallback para admin si no está vinculado
          displayName = user.user_metadata?.first_name || 'Admin'; 
          role = 'admin'; 
      }
  }

  // 2. Configuración
  const hour = Number(new Date().toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Monterrey' }));
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  // 3. Layout (Fixed: Null Check)
  let userLayout: string[] = [];
  if (user) {
    const { data: settings } = await supabase.from('user_settings').select('dashboard_layout').eq('user_id', user.id).single();
    
    // FIX TS ERROR: Validamos que settings no sea null antes de leer dashboard_layout
    if (settings && settings.dashboard_layout && Array.isArray(settings.dashboard_layout) && settings.dashboard_layout.length > 0) {
      userLayout = settings.dashboard_layout;
    } else {
      // Default Nuevo Diseño
      userLayout = ['revenue_zettle', 'weather', 'retention_risk', 'agenda_combined', 'top_breeds', 'quick_actions'];
    }
  }

  // 4. Fechas
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
  const todayStart = `${todayStr}T00:00:00-06:00`;
  const todayEnd = `${todayStr}T23:59:59.999-06:00`;
  
  const yest = subDays(now, 1);
  const yestStr = yest.toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
  const lastW = subDays(now, 7);
  const lastWStr = lastW.toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });

  // 5. Fetching de Datos

  // A. Finanzas (Fixed: Type Safe Sum)
  const getFinance = async () => {
      // Si no es rol financiero, retornamos null
      if (!['admin', 'manager', 'receptionist'].includes(role)) return null;

      const { data: today } = await supabase.from('view_finance_appointments').select('final_price').gte('date', todayStart).lte('date', todayEnd).in('status', ['completed', 'attended']);
      const { data: yest } = await supabase.from('view_finance_appointments').select('final_price').gte('date', `${yestStr}T00:00:00`).lte('date', `${yestStr}T23:59:59`).in('status', ['completed', 'attended']);
      const { data: lastWk } = await supabase.from('view_finance_appointments').select('final_price').gte('date', `${lastWStr}T00:00:00`).lte('date', `${lastWStr}T23:59:59`).in('status', ['completed', 'attended']);

      // FIX TS ERROR: La función acepta null explícitamente
      const sum = (rows: { final_price: any }[] | null) => {
          if (!rows) return 0;
          return rows.reduce((acc, curr) => acc + (Number(curr.final_price) || 0), 0);
      };

      const tVal = sum(today); 
      const yVal = sum(yest); 
      const lVal = sum(lastWk);

      return {
          amount: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(tVal),
          vsYesterday: yVal > 0 ? ((tVal - yVal)/yVal)*100 : 0,
          vsLastWeek: lVal > 0 ? ((tVal - lVal)/lVal)*100 : 0,
          yesterdayAmount: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(yVal),
          lastWeekAmount: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(lVal),
      };
  };

  // B. Agenda
  const getAgenda = async () => {
    const { data } = await supabase.from('appointments').select(`id, start_time, status, pets(name), appointment_services(services(name, category))`).gte('start_time', todayStart).lte('start_time', todayEnd).neq('status', 'cancelled');
    
    if (!data) return { items: [], stats: { waiting:0, bathing:0, cutting:0, ready:0, total:0 } };
    
    let stats = { waiting:0, bathing:0, cutting:0, ready:0, total:0 };
    const items = data.map((item: any) => {
        const rawSvc: any = item.appointment_services?.[0]?.services;
        const svc = Array.isArray(rawSvc) ? rawSvc[0] : rawSvc;
        const cat = svc?.category?.toLowerCase() || '';
        
        if (item.status === 'checked_in' || item.status === 'confirmed') stats.waiting++;
        else if (item.status === 'completed') stats.ready++;
        else if (item.status === 'in_process' || item.status === 'attended') {
            if (cat.includes('corte') || cat.includes('cut')) stats.cutting++; else stats.bathing++;
        }
        return { 
            id: item.id, 
            start_time: item.start_time, 
            pet_name: item.pets?.name||'Mascota', 
            status: item.status, 
            service_name: svc?.name||'Servicio', 
            service_category: cat 
        };
    });
    stats.total = items.length;
    return { items, stats };
  };

  // C. Top Razas
  const getTopBreeds = async () => {
     const thirtyDaysAgo = subDays(now, 30).toISOString();
     const { data } = await supabase.from('appointments').select(`pets(breed)`).gte('date', thirtyDaysAgo).eq('status', 'completed');
     const counts: Record<string, number> = {};
     data?.forEach((i: any) => { 
         const p = Array.isArray(i.pets) ? i.pets[0] : i.pets; 
         if (p?.breed) counts[p.breed] = (counts[p.breed] || 0) + 1; 
     });
     return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);
  };

  // D. Retención (Whatsapp)
  const getRetention = async () => {
      // Clientes que vinieron entre hace 60 y 15 días
      const rangeStart = subDays(now, 60).toISOString();
      const { data: appts } = await supabase.from('appointments')
        .select('client_id, date, clients(id, full_name, phone)')
        .gte('date', rangeStart)
        .order('date', { ascending: false });

      if (!appts) return { risk15: [], risk30: [] };

      // Lógica de última visita
      const lastVisits = new Map();
      appts.forEach((a: any) => {
          if (!lastVisits.has(a.client_id)) {
              lastVisits.set(a.client_id, { 
                  date: new Date(a.date), 
                  client: Array.isArray(a.clients) ? a.clients[0] : a.clients 
              });
          }
      });

      const risk15: any[] = [];
      const risk30: any[] = [];
      const todayTime = now.getTime();

      lastVisits.forEach((val) => {
          const daysAgo = Math.floor((todayTime - val.date.getTime()) / (1000 * 60 * 60 * 24));
          // Solo si tiene nombre y teléfono
          if (val.client?.phone && val.client?.full_name) {
              if (daysAgo >= 15 && daysAgo < 30) {
                  risk15.push({ id: val.client.id, name: val.client.full_name, phone: val.client.phone, days_ago: daysAgo });
              } else if (daysAgo >= 30) {
                  risk30.push({ id: val.client.id, name: val.client.full_name, phone: val.client.phone, days_ago: daysAgo });
              }
          }
      });

      return { risk15: risk15.slice(0, 10), risk30: risk30.slice(0, 10) };
  };

  const [finance, agenda, topBreeds, retention] = await Promise.all([
      getFinance(), getAgenda(), getTopBreeds(), getRetention()
  ]);

  // FIX TS ERROR: El objeto debe coincidir EXACTAMENTE con el tipo DashboardData
  const dashboardData: DashboardData = {
    revenue: finance,
    agenda: agenda,
    topBreeds: topBreeds,
    retention: retention,
    weather: { temp: 24, condition: 'Soleado' }
    // Eliminados: recentClients, weekly (Ya no existen en el tipo)
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