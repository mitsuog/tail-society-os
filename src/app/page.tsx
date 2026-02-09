import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import Search from '@/components/Search';
import ClientFilters from '@/components/ClientFilters';
import Pagination from '@/components/Pagination';
import ClientRow from '@/components/ClientRow';
import DashboardNewClientBtn from '@/components/DashboardNewClientBtn';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  SearchX, TabletSmartphone, CalendarPlus, 
  Banknote, TrendingUp, CalendarCheck, Dog, Filter 
} from 'lucide-react';
import { cn } from "@/lib/utils";

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 10;

// --- COMPONENTE KPI MEJORADO ---
function MetricCard({ title, value, icon: Icon, description, colorClass, trend }: any) {
  return (
    <Card className={cn(
      "border-l-4 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-default",
      "hover:scale-[1.02] active:scale-[0.98]"
    )}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 truncate">
              {title}
            </p>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-1 break-words">
              {value}
            </h3>
            {description && (
              <p className={cn(
                "text-[10px] sm:text-xs font-medium truncate",
                trend === 'positive' ? 'text-green-600' : 
                trend === 'negative' ? 'text-red-600' : 'text-slate-400'
              )}>
                {description}
              </p>
            )}
          </div>
          <div className={cn(
            "p-2.5 sm:p-3 rounded-xl text-white shrink-0 transition-transform duration-300 group-hover:scale-110",
            colorClass
          )}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
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
  const trendLabel = `${isPositiveTrend ? '+' : ''}${Math.abs(diffRevenue).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })} vs. sem. ant.`;

  // =================================================================================
  // 2. LÓGICA DE BÚSQUEDA (Pre-cálculo de IDs)
  // =================================================================================
  
  let searchIds: string[] | null = null;

  if (queryText) {
    const { data: petsFound } = await supabase
      .from('pets')
      .select('client_id')
      .ilike('name', `%${queryText}%`)
      .limit(50);
    
    const petOwnerIds = petsFound ? petsFound.map(p => p.client_id) : [];

    const { data: clientsFound } = await supabase
      .from('clients')
      .select('id')
      .or(`full_name.ilike.%${queryText}%,phone.ilike.%${queryText}%,email.ilike.%${queryText}%`)
      .limit(50);
      
    const clientMatchIds = clientsFound ? clientsFound.map(c => c.id) : [];

    searchIds = Array.from(new Set([...clientMatchIds, ...petOwnerIds]));
  }

  // =================================================================================
  // 3. ESTRATEGIA DE ORDENAMIENTO Y CONSULTA
  // =================================================================================
  
  let clients: any[] = [];
  let totalCount = 0;

  if (sort === 'last_visit') {
      const { data: recentAppts } = await supabase
        .from('appointments')
        .select('client_id, date')
        .in('status', ['completed', 'attended']) 
        .order('date', { ascending: false })
        .limit(1000);
      
      let orderedIds = recentAppts ? Array.from(new Set(recentAppts.map(a => a.client_id))) : [];

      if (searchIds !== null) {
          const matching = orderedIds.filter(id => searchIds!.includes(id));
          const extras = searchIds.filter(id => !orderedIds.includes(id));
          orderedIds = [...matching, ...extras];
      } else if (searchIds === null && orderedIds.length === 0) {
          const { data: defaultClients } = await supabase.from('clients').select('id').order('created_at', {ascending: false}).limit(50);
          if (defaultClients) orderedIds = defaultClients.map(c => c.id);
      }

      if (speciesFilter && speciesFilter !== 'all') {
          const { data: petsWithSpecies } = await supabase
              .from('pets')
              .select('client_id')
              .eq('species', speciesFilter);
          
          if (petsWithSpecies) {
              const clientIdsWithSpecies = Array.from(new Set(petsWithSpecies.map(p => p.client_id)));
              orderedIds = orderedIds.filter(id => clientIdsWithSpecies.includes(id));
          } else {
              orderedIds = [];
          }
      }

      totalCount = orderedIds.length;
      const pageIds = orderedIds.slice(offset, offset + ITEMS_PER_PAGE);

      if (pageIds.length > 0) {
          const { data } = await supabase
            .from('clients')
            .select(`*, pets ( id, name, breed, species, appointments ( date, status ) )`)
            .in('id', pageIds);
          
          if (data) {
              const orderMap = new Map(pageIds.map((id, idx) => [id, idx]));
              clients = data.sort((a: any, b: any) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0));
          }
      }
  }
  else if (sort === 'newest') {
      const { data: recentAppts } = await supabase
        .from('appointments')
        .select('client_id')
        .in('status', ['completed', 'attended']) 
        .order('date', { ascending: false })
        .limit(1000);
      
      let orderedIds = recentAppts ? Array.from(new Set(recentAppts.map(a => a.client_id))) : [];

      if (searchIds !== null) {
          const matching = orderedIds.filter(id => searchIds!.includes(id));
          const extras = searchIds.filter(id => !orderedIds.includes(id));
          orderedIds = [...matching, ...extras];
      } else if (searchIds === null && orderedIds.length === 0) {
          const { data: defaultClients } = await supabase.from('clients').select('id').order('created_at', {ascending: false}).limit(50);
          if (defaultClients) orderedIds = defaultClients.map(c => c.id);
      }

      if (speciesFilter && speciesFilter !== 'all') {
          const { data: petsWithSpecies } = await supabase
              .from('pets')
              .select('client_id')
              .eq('species', speciesFilter);
          
          if (petsWithSpecies) {
              const clientIdsWithSpecies = Array.from(new Set(petsWithSpecies.map(p => p.client_id)));
              orderedIds = orderedIds.filter(id => clientIdsWithSpecies.includes(id));
          } else {
              orderedIds = [];
          }
      }

      totalCount = orderedIds.length;
      const pageIds = orderedIds.slice(offset, offset + ITEMS_PER_PAGE);

      if (pageIds.length > 0) {
          const { data } = await supabase
            .from('clients')
            .select(`*, pets ( id, name, breed, species, appointments ( date, status ) )`)
            .in('id', pageIds);
          
          if (data) {
              const orderMap = new Map(pageIds.map((id, idx) => [id, idx]));
              clients = data.sort((a: any, b: any) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0));
          }
      }
  }
  else {
      let query = supabase
        .from('clients')
        .select(`*, pets ( id, name, breed, species, appointments ( date, status ) )`, { count: 'exact' });

      if (searchIds !== null) {
          if (searchIds.length === 0) {
              clients = [];
              totalCount = 0;
          } else {
              query = query.in('id', searchIds);
          }
      }

      if (speciesFilter && speciesFilter !== 'all' && searchIds?.length !== 0) {
          const { data: petsWithSpecies } = await supabase
              .from('pets')
              .select('client_id')
              .eq('species', speciesFilter);
          
          if (petsWithSpecies && petsWithSpecies.length > 0) {
              const clientIdsWithSpecies = Array.from(new Set(petsWithSpecies.map(p => p.client_id)));
              
              if (searchIds !== null) {
                  const combinedIds = searchIds.filter(id => clientIdsWithSpecies.includes(id));
                  if (combinedIds.length === 0) {
                      clients = [];
                      totalCount = 0;
                  } else {
                      query = query.in('id', combinedIds);
                  }
              } else {
                  query = query.in('id', clientIdsWithSpecies);
              }
          } else {
              clients = [];
              totalCount = 0;
          }
      }

      if (totalCount === 0 && clients.length === 0 && (searchIds === null || searchIds.length > 0)) {
          if (sort === 'name_asc') {
              query = query.order('full_name', { ascending: true });
          } else if (sort === 'name_desc') {
              query = query.order('full_name', { ascending: false });
          } else if (sort === 'oldest') {
              query = query.order('created_at', { ascending: true });
          } else {
              query = query.order('created_at', { ascending: false });
          }

          query = query.range(offset, offset + ITEMS_PER_PAGE - 1);

          const { data, count } = await query;
          clients = data || [];
          totalCount = count || 0;
      }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

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
  // 4. RENDERIZADO UI OPTIMIZADO
  // =================================================================================
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* CONTENEDOR CON SCROLL */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-6 pb-20 animate-in fade-in duration-500">
          
          {/* ===================== HEADER MEJORADO ===================== */}
          <div className="flex flex-col gap-3 sm:gap-4 border-b border-slate-200 pb-3 sm:pb-4">
            
            {/* Fila 1: Título y Status */}
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)] shrink-0"></div>
                  <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight truncate">
                    Centro de Mando
                  </h1>
                </div>
                <p className="text-[10px] sm:text-xs md:text-sm text-slate-500 capitalize font-medium ml-4 sm:ml-5 md:ml-6 mt-0.5 truncate">
                  {new Date(now).toLocaleDateString('es-MX', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long',
                    timeZone: 'America/Monterrey' 
                  })}
                </p>
              </div>
            </div>

            {/* Fila 2: Botones de Acción */}
            <div className="flex flex-wrap gap-2 sm:gap-2.5">
              <Link href="/checkin" className="flex-1 sm:flex-none">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full sm:w-auto gap-2 border-slate-300 text-slate-600 h-9 sm:h-10 text-xs sm:text-sm hover:bg-slate-50 active:scale-95 transition-transform"
                >
                  <TabletSmartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>
                  <span>Kiosco</span>
                </Button>
              </Link>
              
              <div className="flex-1 sm:flex-none">
                <DashboardNewClientBtn />
              </div>
              
              <div className="flex-1 sm:flex-none">
                <NewAppointmentDialog 
                  customTrigger={
                    <Button 
                      size="sm" 
                      className="w-full sm:w-auto gap-2 bg-slate-900 hover:bg-slate-800 text-white h-9 sm:h-10 shadow-md text-xs sm:text-sm active:scale-95 transition-transform"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>
                      <span>Nueva Cita</span>
                    </Button>
                  }
                />
              </div>
            </div>
          </div>

          {/* ===================== KPI GRID MEJORADO ===================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
              description={`${monthMetrics.completed} completadas`}
              colorClass="bg-blue-500"
            />
            <MetricCard 
              title="Clientes" 
              value={totalActiveClients.count} 
              icon={Dog} 
              description={`+${newClientsCount.count} nuevos`}
              colorClass="bg-slate-500"
              trend="positive"
            />
          </div>

          {/* ===================== TABLA MEJORADA ===================== */}
          <Card className="border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* BARRA DE HERRAMIENTAS MEJORADA */}
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200 p-3 sm:p-4 flex flex-col gap-3 shadow-sm">
              
              {/* Búsqueda - Siempre arriba en móvil */}
              <div className="w-full">
                <Search placeholder="Buscar cliente, mascota o teléfono..." />
              </div>
              
              {/* Filtros - Abajo en móvil, al lado en desktop */}
              <div className="flex items-center justify-between gap-3">
                <ClientFilters />
                
                {/* Badge de resultados - Solo visible en desktop */}
                {totalCount > 0 && (
                  <Badge variant="secondary" className="hidden sm:flex text-xs font-medium whitespace-nowrap">
                    {totalCount} resultados
                  </Badge>
                )}
              </div>
            </div>

            {/* TABLA RESPONSIVA */}
            <div className="flex-1 overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                  <TableRow className="hover:bg-slate-50/80">
                    <TableHead className="w-[30%] font-bold text-slate-700 pl-4 sm:pl-6 text-xs sm:text-sm">
                      Cliente
                    </TableHead>
                    <TableHead className="w-[25%] font-bold text-slate-700 text-xs sm:text-sm">
                      Mascotas
                    </TableHead>
                    <TableHead className="w-[20%] font-bold text-slate-700 hidden md:table-cell text-xs sm:text-sm">
                      Última Visita
                    </TableHead>
                    <TableHead className="w-[25%] text-right font-bold text-slate-700 pr-4 sm:pr-6 text-xs sm:text-sm">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client: any) => (
                    <ClientRow 
                      key={client.id} 
                      client={client} 
                      lastVisitDate={getLastVisit(client)} 
                      firstVisitDate={null} 
                    />
                  ))}
                  
                  {/* ESTADO VACÍO MEJORADO */}
                  {clients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-64">
                        <div className="flex flex-col items-center justify-center text-center px-4">
                          <div className="bg-slate-50 p-4 sm:p-6 rounded-full mb-4">
                            <SearchX className="h-10 w-10 sm:h-12 sm:w-12 text-slate-300" />
                          </div>
                          <p className="text-base sm:text-lg font-semibold text-slate-600 mb-2">
                            No se encontraron resultados
                          </p>
                          <p className="text-xs sm:text-sm text-slate-500 max-w-sm">
                            {queryText 
                              ? `Sin coincidencias para "${queryText}"` 
                              : "No hay clientes registrados en el sistema."}
                          </p>
                          {(queryText || speciesFilter) && (
                            <Link href="/" className="mt-4">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                Limpiar filtros
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* FOOTER CON PAGINACIÓN MEJORADO */}
            {totalCount > 0 && (
              <div className="border-t border-slate-100 bg-slate-50/50 p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                <p className="text-xs sm:text-sm text-slate-500 text-center sm:text-left order-2 sm:order-1">
                  Mostrando <span className="font-semibold text-slate-700">{clients.length}</span> de{' '}
                  <span className="font-semibold text-slate-700">{totalCount}</span> resultados
                </p>
                <div className="order-1 sm:order-2 w-full sm:w-auto flex justify-center">
                  <Pagination totalPages={totalPages} />
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
