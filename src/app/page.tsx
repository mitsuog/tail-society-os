import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import Search from '@/components/Search';
import ClientFilters from '@/components/ClientFilters';
import Pagination from '@/components/Pagination';
import ClientRow from '@/components/ClientRow';
import DashboardNewClientBtn from '@/components/DashboardNewClientBtn';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog'; // <--- 1. IMPORTAR EL MODAL
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  SearchX, TabletSmartphone, CalendarPlus, 
  Banknote, TrendingUp, TrendingDown, CalendarCheck, Clock, Dog, ArrowUpRight, Filter 
} from 'lucide-react';
import { cn } from "@/lib/utils";

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 10;

// --- KPI CARD ---
function MetricCard({ title, value, icon: Icon, description, colorClass, trend }: any) {
  return (
    <Card className="border-l-4 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
            {description && (
              <p className={cn("text-xs mt-1 font-medium", 
                trend === 'positive' ? 'text-green-600' : 
                trend === 'negative' ? 'text-red-600' : 'text-slate-400'
              )}>
                {description}
              </p>
            )}
          </div>
          <div className={cn("p-2 rounded-lg text-white", colorClass)}>
            <Icon size={20} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ q?: string, sort?: string, species?: string, page?: string }> }) {
  const params = await searchParams;
  const queryText = (params?.q || '').trim();
  const sort = params?.sort || 'newest'; 
  const speciesFilter = params?.species || ''; 
  const currentPage = Number(params?.page) || 1;
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const supabase = await createClient();

  // =================================================================================
  // 1. CARGA DE KPIs (Financieros y Operativos)
  // =================================================================================
  const getMonterreyRangeISO = (date: Date) => {
    const mtyDate = date.toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
    return {
       start: `${mtyDate}T00:00:00-06:00`,
       end: `${mtyDate}T23:59:59.999-06:00`
    };
  };

  const now = new Date();
  const { start: todayStart, end: todayEnd } = getMonterreyRangeISO(now);
  
  const lastWeekDate = new Date(now);
  lastWeekDate.setDate(now.getDate() - 7);
  const { start: lastWeekStart, end: lastWeekEnd } = getMonterreyRangeISO(lastWeekDate);

  const currentMonthStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' }).substring(0, 7); 
  const monthStart = `${currentMonthStr}-01T00:00:00-06:00`;

  const getMetrics = async (start: string, end: string) => {
      const { data } = await supabase
          .from('view_finance_appointments') 
          .select('final_price, status')
          .gte('date', start)
          .lte('date', end);
      
      if (!data) return { revenue: 0, completed: 0, agenda: 0, pending: 0 };

      const active = data.filter((a: any) => !['cancelled', 'no_show'].includes(a.status));
      const completedList = active.filter((a: any) => ['completed', 'attended'].includes(a.status));
      const pendingList = active.filter((a: any) => !['completed', 'attended'].includes(a.status));
      const revenue = completedList.reduce((sum: number, item: any) => sum + (Number(item.final_price) || 0), 0);

      return { revenue, completed: completedList.length, agenda: active.length, pending: pendingList.length };
  };

  const [todayMetrics, lastWeekMetrics, monthMetrics, newClientsCount, totalActiveClients] = await Promise.all([
      getMetrics(todayStart, todayEnd),
      getMetrics(lastWeekStart, lastWeekEnd),
      getMetrics(monthStart, todayEnd),
      supabase.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true)
  ]);

  const diffRevenue = todayMetrics.revenue - lastWeekMetrics.revenue;
  const isPositiveTrend = diffRevenue >= 0;
  const trendLabel = `${isPositiveTrend ? '+' : ''}${Math.abs(diffRevenue).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })} vs. sem. anterior`;

  // =================================================================================
  // 2. LÓGICA DE BÚSQUEDA (Pre-cálculo de IDs)
  // =================================================================================
  
  let searchIds: string[] | null = null;

  if (queryText) {
    // 1. Buscar Mascotas
    const { data: petsFound } = await supabase
      .from('pets')
      .select('client_id')
      .ilike('name', `%${queryText}%`)
      .limit(50);
    
    const petOwnerIds = petsFound ? petsFound.map(p => p.client_id) : [];

    // 2. Buscar Clientes
    const { data: clientsFound } = await supabase
      .from('clients')
      .select('id')
      .or(`full_name.ilike.%${queryText}%,phone.ilike.%${queryText}%,email.ilike.%${queryText}%`)
      .limit(50);
      
    const clientMatchIds = clientsFound ? clientsFound.map(c => c.id) : [];

    // Unir resultados
    searchIds = Array.from(new Set([...clientMatchIds, ...petOwnerIds]));
  }

  // =================================================================================
  // 3. ESTRATEGIA DE ORDENAMIENTO Y CONSULTA
  // =================================================================================
  
  let clients: any[] = [];
  let totalCount = 0;

  // --- ESCENARIO 1: ORDEN POR VISITAS RECIENTES (Complejo) ---
  if (sort === 'newest') {
      
      // Obtener IDs de citas COMPLETADAS en orden descendente
      const { data: recentAppts } = await supabase
        .from('appointments')
        .select('client_id')
        .in('status', ['completed', 'attended']) 
        .order('date', { ascending: false })
        .limit(1000);
      
      let orderedIds = recentAppts ? Array.from(new Set(recentAppts.map(a => a.client_id))) : [];

      // Filtrar con la búsqueda si existe
      if (searchIds !== null) {
          const matching = orderedIds.filter(id => searchIds!.includes(id));
          // Agregar al final los que coinciden con búsqueda pero no tienen citas recientes
          const extras = searchIds.filter(id => !orderedIds.includes(id));
          orderedIds = [...matching, ...extras];
      } else if (searchIds === null && orderedIds.length === 0) {
          // Fallback si no hay citas ni búsqueda: traer últimos registrados
          const { data: defaultClients } = await supabase.from('clients').select('id').order('created_at', {ascending: false}).limit(50);
          if (defaultClients) orderedIds = defaultClients.map(c => c.id);
      }

      // Paginación Manual sobre IDs
      totalCount = orderedIds.length;
      const pageIds = orderedIds.slice(offset, offset + ITEMS_PER_PAGE);

      if (pageIds.length > 0) {
          let query = supabase
            .from('clients')
            .select(`*, pets ( id, name, breed, species, appointments ( date, status ) )`)
            .in('id', pageIds);
          
          if (speciesFilter) query = query.ilike('pets.species', speciesFilter);

          const { data } = await query;
          // Reordenar en JS para respetar el orden de fecha
          if (data) {
              clients = pageIds.map(id => data.find((c:any) => c.id === id)).filter(Boolean);
          }
      }
  } 
  // --- ESCENARIO 2: ORDEN ESTÁNDAR (A-Z, Z-A, Antiguos) ---
  else {
      let query = supabase
        .from('clients')
        .select(`*, pets ( id, name, breed, species, appointments ( date, status ) )`, { count: 'exact' });

      // Filtros
      if (searchIds !== null) {
          if (searchIds.length > 0) query = query.in('id', searchIds);
          else query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
      if (speciesFilter) query = query.ilike('pets.species', speciesFilter);

      if (sort === 'name_asc') {
          query = query.order('full_name', { ascending: true });
      } else if (sort === 'name_desc') {
          query = query.order('full_name', { ascending: false });
      } else if (sort === 'oldest') {
          query = query.order('created_at', { ascending: true });
      } else {
          // Default fallback
          query = query.order('created_at', { ascending: false });
      }

      // Paginación SQL
      query = query.range(offset, offset + ITEMS_PER_PAGE - 1);

      const { data, count } = await query;
      clients = data || [];
      totalCount = count || 0;
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Helper visual para fecha
  const getLastVisit = (client: any) => {
    if (!client.pets || client.pets.length === 0) return null;
    const allAppointments = client.pets.flatMap((pet: any) => pet.appointments || []);
    if (allAppointments.length === 0) return null;
    
    const completed = allAppointments.filter((a:any) => ['completed', 'attended'].includes(a.status));
    if(completed.length > 0) {
        const dates = completed.map((a: any) => new Date(a.date).getTime());
        return new Date(Math.max(...dates));
    }
    
    const dates = allAppointments.map((a: any) => new Date(a.date).getTime());
    return new Date(Math.max(...dates));
  };

  // =================================================================================
  // 4. RENDERIZADO UI
  // =================================================================================
  return (
    <div className="w-full max-w-[1600px] mx-auto p-3 lg:p-6 space-y-4 lg:space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
             <div className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
             Centro de Mando
          </h1>
          <p className="text-slate-500 text-xs md:text-sm capitalize font-medium ml-5 md:ml-6 mt-0.5">
             {new Date(now).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Monterrey' })}
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
           <Link href="/checkin">
             <Button variant="outline" size="sm" className="gap-2 border-slate-300 text-slate-600 h-9 shrink-0">
               <TabletSmartphone size={14}/> <span className="hidden sm:inline">Kiosco</span>
             </Button>
           </Link>
           <div className="shrink-0"><DashboardNewClientBtn /></div>
           
           {/* --- 2. AQUÍ ESTÁ EL CAMBIO PRINCIPAL --- */}
           {/* Se reemplazó el <Link> por el componente del Modal con customTrigger */}
           <NewAppointmentDialog 
             customTrigger={
                <Button size="sm" className="gap-2 bg-slate-900 hover:bg-slate-800 text-white h-9 shadow-md shrink-0">
                    <CalendarPlus size={14}/> <span className="hidden sm:inline">Nueva Cita</span>
                </Button>
             }
           />
           {/* --------------------------------------- */}

        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard 
            title="Ingresos Hoy" 
            value={`$${todayMetrics.revenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
            icon={Banknote} 
            description={trendLabel}
            trend={isPositiveTrend ? 'positive' : 'negative'}
            colorClass="bg-emerald-500"
        />
        <MetricCard 
            title="Agenda Hoy" 
            value={todayMetrics.agenda} 
            icon={CalendarCheck} 
            description={`${todayMetrics.pending} pendientes`}
            colorClass="bg-indigo-500"
        />
        <MetricCard 
            title="Venta Mes" 
            value={`$${monthMetrics.revenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
            icon={TrendingUp} 
            description={`${monthMetrics.completed} citas completadas`}
            colorClass="bg-blue-500"
        />
        <MetricCard 
            title="Clientes" 
            value={totalActiveClients.count} 
            icon={Dog} 
            description={`+${newClientsCount.count} nuevos este mes`}
            colorClass="bg-slate-500"
            trend="positive"
        />
      </div>

      {/* --- SECCIÓN DE GESTIÓN --- */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        
        {/* BARRA DE HERRAMIENTAS */}
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center shadow-sm">
          <div className="w-full md:max-w-md relative">
            <Search placeholder="Buscar por cliente, mascota o teléfono..." />
          </div>
          <div className="w-full md:w-auto flex flex-wrap items-center gap-3 justify-start md:justify-end">
             <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Filter size={10}/> Filtros:
                </span>
                <ClientFilters />
             </div>
          </div>
        </div>

        {/* TABLA RESPONSIVA */}
        <div className="relative w-full overflow-x-auto">
          <Table className="min-w-[700px] md:min-w-full">
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[30%] font-bold text-slate-700 pl-6">Cliente</TableHead>
                <TableHead className="w-[25%] font-bold text-slate-700">Mascotas</TableHead>
                <TableHead className="w-[20%] font-bold text-slate-700 hidden md:table-cell">Última Visita</TableHead>
                <TableHead className="w-[25%] text-right font-bold text-slate-700 pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client: any) => (
                <ClientRow key={client.id} client={client} lastVisitDate={getLastVisit(client)} firstVisitDate={null} />
              ))}
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <div className="bg-slate-50 p-4 rounded-full mb-3"><SearchX className="h-8 w-8 text-slate-300" /></div>
                      <p className="text-lg font-medium text-slate-600">No se encontraron resultados</p>
                      <p className="text-sm text-slate-500 mt-1">
                        {queryText ? `Sin coincidencias para "${queryText}"` : "Base de datos vacía."}
                      </p>
                      {(queryText || speciesFilter) && <Link href="/" className="mt-4"><Button variant="link" className="text-blue-600">Limpiar filtros</Button></Link>}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {totalCount > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/30 p-4 flex justify-between items-center mt-auto">
              <p className="text-xs text-slate-500">Mostrando {clients.length} de {totalCount} resultados</p>
              <div className="scale-90 origin-right">
                  <Pagination totalPages={totalPages} />
              </div>
          </div>
        )}
      </Card>
    </div>
  );
}