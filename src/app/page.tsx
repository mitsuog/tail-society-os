import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import Search from '@/components/Search';
import ClientFilters from '@/components/ClientFilters';
import Pagination from '@/components/Pagination';
import ClientRow from '@/components/ClientRow';
import DashboardNewClientBtn from '@/components/DashboardNewClientBtn';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { SearchX, TabletSmartphone, Users, Dog, CalendarPlus, CalendarDays } from 'lucide-react';

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
              <p className={`text-xs mt-1 font-medium ${trend === 'positive' ? 'text-green-600' : trend === 'negative' ? 'text-red-600' : 'text-slate-400'}`}>
                {description}
              </p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon size={20} className="text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- PÁGINA DASHBOARD ---
export default async function Dashboard({ searchParams }: { searchParams: Promise<{ q?: string, sort?: string, species?: string, page?: string }> }) {
  const params = await searchParams;
  const queryText = (params?.q || '').trim();
  const sort = params?.sort || 'newest';
  const speciesFilter = params?.species || ''; 
  const currentPage = Number(params?.page) || 1;
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const supabase = await createClient();

  // --- 1. CARGA DE KPIs (Con corrección de Estatus) ---
  const now = new Date();
  const sevenDaysAgo = new Date(now); 
  sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenDaysAgo = new Date(now); 
  fourteenDaysAgo.setDate(now.getDate() - 14);

  const [clientsTotal, petsTotal, newClientsWeek, newClientsLastWeek] = await Promise.all([
    // 1. Total Clientes (Cartera Histórica)
    supabase.from('clients').select('*', { count: 'exact', head: true }),

    // 2. Mascotas Activas (Solo cuenta mascotas de clientes ACTIVOS)
    supabase
      .from('pets')
      .select('clients!inner(status)', { count: 'exact', head: true })
      .neq('clients.status', 'inactive'), 

    // 3. Nuevos Clientes (Semana actual)
    supabase.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
    
    // 4. Nuevos Clientes (Semana anterior)
    supabase.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', fourteenDaysAgo.toISOString()).lt('created_at', sevenDaysAgo.toISOString())
  ]);

  const currentWeekCount = newClientsWeek.count || 0;
  const lastWeekCount = newClientsLastWeek.count || 0;
  const diff = currentWeekCount - lastWeekCount;
  const trendLabel = diff >= 0 ? `+${diff} vs. semana anterior` : `${diff} vs. semana anterior`;
  const trendStatus = diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral';

  // --- 2. LÓGICA DE BÚSQUEDA AVANZADA (NOMBRE, TELÉFONO O MASCOTA) ---
  let petOwnerIds: string[] = [];
  
  if (queryText) {
    // Buscar mascotas que coincidan con el texto
    const { data: petsFound } = await supabase
      .from('pets')
      .select('client_id')
      .ilike('name', `%${queryText}%`)
      .limit(50);

    if (petsFound && petsFound.length > 0) {
      // Extraer IDs únicos de los dueños
      petOwnerIds = Array.from(new Set(petsFound.map(p => p.client_id)));
    }
  }

  // --- 3. CONSULTA PRINCIPAL ---
  let selectString = `
    *,
    pets (
      id,
      name,
      breed,
      species,
      appointments ( date )
    )
  `;

  if (speciesFilter) {
    selectString = `
      *,
      pets!inner (
        id,
        name,
        breed,
        species,
        appointments ( date )
      )
    `;
  }

  let query = supabase
    .from('clients')
    .select(selectString, { count: 'exact' });

  // FILTROS
  if (speciesFilter) query = query.ilike('pets.species', speciesFilter);
  
  if (queryText) {
    // Construimos la condición OR:
    // 1. Coincide nombre cliente
    // 2. Coincide teléfono
    let orFilter = `full_name.ilike.%${queryText}%,phone.ilike.%${queryText}%`;
    
    // 3. O BIEN, el ID del cliente es uno de los dueños de las mascotas encontradas
    if (petOwnerIds.length > 0) {
       // Agregamos los IDs al filtro OR usando la sintaxis `id.in.(...)`
       orFilter += `,id.in.(${petOwnerIds.join(',')})`;
    }
    
    query = query.or(orFilter);
  }

  if (sort === 'oldest') query = query.order('created_at', { ascending: true });
  else query = query.order('created_at', { ascending: false });

  query = query.range(offset, offset + ITEMS_PER_PAGE - 1);

  const { data: clientsRaw, count, error } = await query;
  
  if (error) console.error("Error fetching clients:", error);

  const clients = clientsRaw || [];
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getLastVisit = (client: any) => {
    if (!client.pets || client.pets.length === 0) return null;
    const allAppointments = client.pets.flatMap((pet: any) => pet.appointments || []);
    if (allAppointments.length === 0) return null;
    const dates = allAppointments.map((a: any) => new Date(a.date).getTime());
    return new Date(Math.max(...dates));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER DE ACCIONES PRINCIPALES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bienvenido a Tail Society</h1>
          <p className="text-slate-500">Panel de Control Operativo</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {/* BOTÓN KIOSCO */}
          <Link href="/checkin">
            <Button variant="outline" className="gap-2 border-slate-300 w-full md:w-auto text-slate-600">
              <TabletSmartphone size={16}/> Kiosco
            </Button>
          </Link>

          {/* BOTÓN NUEVO CLIENTE (MODAL INTEGRADO) */}
          <div className="w-full md:w-auto">
             <DashboardNewClientBtn />
          </div>

          {/* BOTÓN NUEVA CITA (Acción Principal) */}
          <Link href="/appointments/new">
            <Button className="gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 w-full md:w-auto">
              <CalendarPlus size={16}/> Nueva Cita
            </Button>
          </Link>
        </div>
      </div>

      {/* METRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Cartera de Clientes" value={clientsTotal.count || 0} icon={Users} description="Dueños registrados" colorClass="bg-blue-500"/>
        <MetricCard title="Mascotas Activas" value={petsTotal.count || 0} icon={Dog} description="Mascotas Activas en Base de datos" colorClass="bg-orange-500"/>
        <MetricCard title="Nuevos (7 Días)" value={currentWeekCount} icon={CalendarDays} description={trendLabel} trend={trendStatus} colorClass={diff >= 0 ? "bg-green-500" : "bg-slate-500"}/>
      </div>

      {/* LISTA DE CLIENTES */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 py-5">
            <div className="flex flex-col xl:flex-row gap-4 justify-between xl:items-center">
              <div className="flex-1 max-w-md"><Search placeholder="Buscar por cliente, mascota o teléfono..." /></div>
              <div className="flex-shrink-0"><ClientFilters /></div>
            </div>
        </CardHeader>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[350px] font-bold text-slate-700 pl-6">Cliente</TableHead>
                <TableHead className="font-bold text-slate-700">Mascotas</TableHead>
                <TableHead className="font-bold text-slate-700 hidden md:table-cell">Última Visita</TableHead>
                <TableHead className="text-right font-bold text-slate-700 pr-6">Acciones</TableHead>
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
                      <p className="text-sm text-slate-500 mt-1">{error ? "Error técnico: " + error.message : (queryText ? `No hay coincidencias para "${queryText}"` : "Base de datos vacía o sin acceso.")}</p>
                      {(queryText || speciesFilter) && <Link href="/" className="mt-4"><Button variant="link" className="text-blue-600">Limpiar búsqueda</Button></Link>}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {totalCount > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/30 p-4 flex justify-between items-center">
              <p className="text-xs text-slate-500">Mostrando {clients.length} de {totalCount} resultados</p>
              <Pagination totalPages={totalPages} />
          </div>
        )}
      </Card>
    </div>
  );
}