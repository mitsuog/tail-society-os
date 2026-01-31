import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import Search from '@/components/Search';
import ClientFilters from '@/components/ClientFilters';
import Pagination from '@/components/Pagination';
import ClientRow from '@/components/ClientRow';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Plus, SearchX, TabletSmartphone, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 15;

interface Appointment { date: string; }
interface Pet { id: string; name: string; breed: string; species: string; behavior_notes?: string; allergies?: string; appointments: Appointment[]; }
interface Client { id: string; full_name: string; phone: string; email: string | null; address: string | null; created_at: string; pets: Pet[]; }

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ q?: string, sort?: string, species?: string, page?: string }> }) {
  const params = await searchParams;
  const query = (params?.q || '').trim();
  const sort = params?.sort || 'newest';
  const speciesFilter = params?.species || '';
  const currentPage = Number(params?.page) || 1;

  const supabase = await createClient();

  // ===========================================================================
  // PASO 1: ENCONTRAR LOS IDs QUE COINCIDEN (BÚSQUEDA INTELIGENTE)
  // ===========================================================================
  let targetIds: string[] | null = null; // null significa "traer todos"
  
  // A) Si hay búsqueda de TEXTO (Nombre, Teléfono, Email, Mascota, Raza)
  if (query) {
    // 1. Buscamos en CLIENTES (Nombre, Teléfono, Email)
    const { data: clientMatches } = await supabase
      .from('clients')
      .select('id')
      .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`); // Agregué email aquí

    // 2. Buscamos en MASCOTAS (Nombre, Raza)
    const { data: petMatches } = await supabase
      .from('pets')
      .select('client_id')
      .or(`name.ilike.%${query}%,breed.ilike.%${query}%`);

    // Combinamos los resultados (Dueños encontrados + Dueños de mascotas encontradas)
    const idsA = clientMatches?.map(c => c.id) || [];
    const idsB = petMatches?.map(p => p.client_id) || [];
    
    // Usamos Set para eliminar duplicados
    targetIds = Array.from(new Set([...idsA, ...idsB]));
  }

  // B) Si hay filtro de ESPECIE (Perro/Gato)
  if (speciesFilter && speciesFilter !== 'all') {
    const { data: speciesMatches } = await supabase
      .from('pets')
      .select('client_id')
      .ilike('species', `%${speciesFilter}%`);

    const speciesIds = speciesMatches?.map(p => p.client_id) || [];

    if (targetIds === null) {
      // Si no había búsqueda de texto, estos son los únicos IDs válidos
      targetIds = speciesIds;
    } else {
      // Si YA había búsqueda de texto, hacemos INTERSECCIÓN (debe cumplir ambas cosas)
      // Ejemplo: Buscar "Juan" (Texto) Y que tenga "Gato" (Especie)
      targetIds = targetIds.filter(id => speciesIds.includes(id));
    }
  }

  // Si después de filtrar la lista queda vacía (buscaste "XJ8" y no existe), forzamos un ID imposible
  if (targetIds !== null && targetIds.length === 0) {
    targetIds = ['00000000-0000-0000-0000-000000000000'];
  }


  // ===========================================================================
  // PASO 2: TRAER LA INFORMACIÓN DE ESOS IDs
  // ===========================================================================
  
  // Preparamos la consulta base
  let dbQuery = supabase
    .from('clients')
    .select(`
      id, full_name, phone, email, address, created_at,
      pets (
        id, name, breed, species, allergies, behavior_notes,
        appointments ( date )
      )
    `, { count: 'exact' });

  // Aplicamos el filtro de IDs si es necesario
  if (targetIds !== null) {
    dbQuery = dbQuery.in('id', targetIds);
  }

  // --- ORDENAMIENTO ---
  if (sort === 'last_visit') {
    // Para ordenar por visita necesitamos traer todo el bloque (limitado a 1000 por seguridad)
    dbQuery = dbQuery.range(0, 999);
  } else {
    // Ordenamiento SQL Nativo
    switch (sort) {
      case 'oldest': dbQuery = dbQuery.order('created_at', { ascending: true }).order('id', { ascending: true }); break;
      case 'alpha_asc': dbQuery = dbQuery.order('full_name', { ascending: true }); break;
      case 'alpha_desc': dbQuery = dbQuery.order('full_name', { ascending: false }); break;
      case 'newest': default: dbQuery = dbQuery.order('created_at', { ascending: false }).order('id', { ascending: true }); break;
    }
    // Paginación SQL directa
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    dbQuery = dbQuery.range(from, to);
  }

  // EJECUTAMOS LA CONSULTA FINAL
  const { data: rawData, count } = await dbQuery;
  
  let clients: Client[] = rawData as unknown as Client[] || [];
  let totalCount = count ?? 0;

  // --- LÓGICA MANUAL PARA SORT='LAST_VISIT' ---
  if (sort === 'last_visit' && clients.length > 0) {
    // Calculamos fecha max en memoria
    const clientsWithDates = clients.map(c => {
      let maxDate = 0;
      c.pets?.forEach(p => p.appointments?.forEach(a => {
        const d = new Date(a.date).getTime();
        if (d > maxDate) maxDate = d;
      }));
      // Si no tiene visitas, usa fecha registro como fallback
      const sortValue = maxDate > 0 ? maxDate : new Date(c.created_at).getTime();
      return { ...c, sortValue };
    });

    // Ordenamos
    clientsWithDates.sort((a, b) => b.sortValue - a.sortValue);
    
    // Recalculamos paginación manual
    totalCount = clientsWithDates.length;
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    clients = clientsWithDates.slice(from, from + ITEMS_PER_PAGE);
  }

  const totalPages = totalCount ? Math.ceil(totalCount / ITEMS_PER_PAGE) : 1;

  // Helper para fechas
  const getClientDates = (client: Client) => {
    let timestamps: number[] = [];
    client.pets?.forEach(pet => pet.appointments?.forEach(appt => {
        if (appt.date) timestamps.push(new Date(appt.date).getTime());
    }));
    if (timestamps.length === 0) return { first: null, last: null };
    return { first: new Date(Math.min(...timestamps)), last: new Date(Math.max(...timestamps)) };
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Directorio</h1>
          <div className="text-slate-500 mt-1 flex items-center gap-2 text-sm">
            <Users size={14} />
            {(query || speciesFilter) ? <span>Resultados:</span> : <span>Total Clientes:</span>}
            <Badge variant={(query || speciesFilter) ? "default" : "secondary"} className="ml-1">{totalCount}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/checkin"><Button className="bg-slate-900 hover:bg-slate-800 text-white gap-2 shadow-md"><TabletSmartphone size={18} /> Modo Recepción</Button></Link>
          <Link href="/nuevo"><Button variant="outline" className="gap-2 border-slate-300"><Plus size={18} /> Nuevo (Admin)</Button></Link>
        </div>
      </div>

      {/* FILTROS */}
      <Card className="border-none shadow-none bg-transparent">
        <div className="flex flex-col gap-4">
          <div className="w-full"><Search placeholder="🔍 Buscar por nombre, teléfono, email, raza o mascota..." /></div>
          <ClientFilters />
        </div>
      </Card>

      {/* TABLA DE RESULTADOS */}
      <Card className="overflow-hidden border-slate-200 shadow-sm bg-white flex flex-col min-h-[500px]">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-100">
            <TableRow>
              <TableHead className="w-[350px] font-semibold text-slate-700">Cliente</TableHead>
              <TableHead className="font-semibold text-slate-700 hidden md:table-cell">Contacto</TableHead>
              <TableHead className="font-semibold text-slate-700">Mascotas</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">Detalles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients?.map((client) => {
              const { first, last } = getClientDates(client);
              return <ClientRow key={client.id} client={client} lastVisitDate={last} firstVisitDate={first} />;
            })}
            
            {/* Espaciador para mantener altura */}
            {clients.length < ITEMS_PER_PAGE && clients.length > 0 && (
               <TableRow style={{ height: (ITEMS_PER_PAGE - clients.length) * 73 }} className="hover:bg-transparent"><TableCell colSpan={4} /></TableRow>
            )}
          </TableBody>
        </Table>
        
        {/* ESTADO VACÍO */}
        {(!clients || clients.length === 0) && (
          <div className="flex-1 flex flex-col items-center justify-center text-center bg-slate-50/30 min-h-[300px]">
            <SearchX className="h-10 w-10 text-slate-300 mb-3" />
            <h3 className="text-slate-900 font-medium">No se encontraron resultados</h3>
            <p className="text-slate-500 text-sm mt-1">Prueba con otro término de búsqueda.</p>
            {(query || speciesFilter) && (<Link href="/" className="mt-4"><Button variant="outline" size="sm">Limpiar filtros</Button></Link>)}
          </div>
        )}

        {/* PAGINACIÓN */}
        {totalCount > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 mt-auto">
            <Pagination totalPages={totalPages} />
          </div>
        )}
      </Card>
    </div>
  );
}