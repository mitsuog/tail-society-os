import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    Phone, Mail, History, ShieldAlert, ChevronLeft, ChevronRight, Dog, PawPrint, Search as SearchIcon
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// COMPONENTES
import ClientPageHeader from './ClientPageHeader';
import ClientActions from './ClientActions'; 
import Search from '@/components/Search';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function ClientsCRMPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    
    // 1. OBTENER PARÁMETROS
    const { q: query, page: pageParam } = await searchParams;
    const searchTerm = query || '';
    const currentPage = Number(pageParam) || 1;
    const itemsPerPage = 15;

    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let clientIdsToFetch: string[] = [];
    let isSearching = false;

    // 2. MOTOR DE BÚSQUEDA HÍBRIDO
    if (searchTerm) {
        isSearching = true;
        const sanitizedTerm = searchTerm.trim();
        
        const [clientsResult, petsResult] = await Promise.all([
            supabase.from('clients').select('id')
                .or(`full_name.ilike.%${sanitizedTerm}%,phone.ilike.%${sanitizedTerm}%,email.ilike.%${sanitizedTerm}%`),
            supabase.from('pets').select('client_id')
                .or(`name.ilike.%${sanitizedTerm}%,breed.ilike.%${sanitizedTerm}%`)
        ]);

        const idsFromClients = clientsResult.data?.map(c => c.id) || [];
        const idsFromPets = petsResult.data?.map(p => p.client_id) || [];
        
        clientIdsToFetch = Array.from(new Set([...idsFromClients, ...idsFromPets]));
    }

    // 3. CONSULTA PRINCIPAL
    let dbQuery = supabase
        .from('clients')
        .select(`
            id, full_name, phone, email, created_at, 
            status, is_active, internal_tags, notes,
            pets (id, name, breed),
            appointments (date, status)
        `, { count: 'exact' }) 
        .order('created_at', { ascending: false });

    if (isSearching) {
        if (clientIdsToFetch.length > 0) {
            dbQuery = dbQuery.in('id', clientIdsToFetch);
        } else {
            dbQuery = dbQuery.eq('id', '00000000-0000-0000-0000-000000000000'); 
        }
    }

    dbQuery = dbQuery.range(from, to);

    const { data: clientsData, count } = await dbQuery;
    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // 4. VIEW MODEL
    const clients = clientsData?.map((client: any) => {
        const completedAppts = client.appointments
            ?.filter((a: any) => a.status === 'completed')
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const lastVisit = completedAppts?.[0]?.date;
        
        let tags: string[] = [];
        if (Array.isArray(client.internal_tags)) {
            tags = client.internal_tags;
        } else if (typeof client.internal_tags === 'string') {
            tags = client.internal_tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        }

        return {
            ...client,
            lastVisit,
            tags, 
            initials: client.full_name ? client.full_name.split(' ').map((n:string)=>n[0]).join('').substring(0,2).toUpperCase() : '??'
        };
    }) || [];

    const tagColors: Record<string, string> = {
        vip: "bg-purple-50 text-purple-700 border-purple-200",
        difficult: "bg-red-50 text-red-700 border-red-200",
        frequent: "bg-blue-50 text-blue-700 border-blue-200",
        employee: "bg-slate-100 text-slate-700 border-slate-200",
        late_payment: "bg-amber-50 text-amber-700 border-amber-200"
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50/50 pt-16 md:pt-8 pb-8 px-4 md:px-8 w-full max-w-[1920px] mx-auto animate-in fade-in duration-500">
            
            {/* ENCABEZADO Y ACCIONES */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Directorio</h1>
                    <p className="text-gray-500 text-sm">
                        Gestiona {totalItems} expedientes registrados.
                    </p>
                </div>
                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
                    <div className="w-full sm:w-72">
                        <Search placeholder="Buscar cliente, mascota..." />
                    </div>
                    <ClientPageHeader />
                </div>
            </div>

            {/* TABLA ESTILIZADA */}
            <Card className="border-gray-200/60 shadow-sm bg-white overflow-hidden rounded-xl">
                <div className="overflow-x-auto">
                    <Table className="min-w-[700px]">
                        <TableHeader className="bg-gray-50/50">
                            <TableRow className="hover:bg-transparent border-gray-100">
                                <TableHead className="w-[35%] pl-6 py-4 text-[11px] uppercase tracking-wider font-semibold text-gray-500">Cliente</TableHead>
                                <TableHead className="w-[25%] py-4 text-[11px] uppercase tracking-wider font-semibold text-gray-500">Mascotas</TableHead>
                                <TableHead className="hidden md:table-cell w-[20%] py-4 text-[11px] uppercase tracking-wider font-semibold text-gray-500">Detalles</TableHead>
                                <TableHead className="hidden lg:table-cell w-[10%] py-4 text-[11px] uppercase tracking-wider font-semibold text-gray-500">Última Visita</TableHead>
                                
                                {/* CORRECCIÓN AQUÍ: Agregamos sticky right-0 y z-index al encabezado también */}
                                <TableHead className="text-right pr-6 py-4 text-[11px] uppercase tracking-wider font-semibold text-gray-500 sticky right-0 bg-gray-50 z-10 shadow-[ -5px_0px_5px_-5px_rgba(0,0,0,0.1)] md:static md:shadow-none">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
                                            <div className="bg-gray-50 p-4 rounded-full">
                                                {isSearching ? <SearchIcon className="h-6 w-6"/> : <PawPrint className="h-6 w-6" />}
                                            </div>
                                            <p className="text-sm font-medium">
                                                {isSearching ? `No hay resultados para "${searchTerm}"` : "Aún no hay clientes."}
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                clients.map((client) => (
                                    <TableRow key={client.id} className="group hover:bg-gray-50/80 transition-colors border-gray-100">
                                        
                                        {/* COL 1: CLIENTE */}
                                        <TableCell className="align-top py-4 pl-6">
                                            <div className="flex gap-4">
                                                <Avatar className="h-10 w-10 border border-gray-200 bg-white shadow-sm mt-0.5 hidden sm:block">
                                                    <AvatarFallback className="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 font-bold text-xs">
                                                        {client.initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col gap-1 min-w-0">
                                                    <Link 
                                                        href={`/clients/${client.id}`} 
                                                        className="font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate text-[15px]"
                                                    >
                                                        {client.full_name}
                                                    </Link>
                                                    
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                                            <Phone size={11} className="text-gray-400 shrink-0"/> {client.phone}
                                                        </div>
                                                        {client.email && (
                                                            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 truncate max-w-[200px]">
                                                                <Mail size={11} className="text-gray-300 shrink-0"/> 
                                                                <span className="truncate">{client.email}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* TAGS MÓVIL */}
                                                    <div className="flex md:hidden flex-wrap gap-1 mt-1.5">
                                                        {client.tags.slice(0, 2).map((tag: string) => (
                                                            <span key={tag} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 font-medium">{tag}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* COL 2: MASCOTAS */}
                                        <TableCell className="align-top py-4">
                                            <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                                                {client.pets && client.pets.length > 0 ? (
                                                    client.pets.map((pet: any) => (
                                                        <Badge key={pet.id} variant="secondary" className="bg-white border border-gray-200 text-gray-600 hover:border-gray-300 pl-1.5 pr-2.5 py-1 h-auto gap-1.5 flex items-center shadow-sm rounded-md transition-all">
                                                            <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                                                <Dog size={10} />
                                                            </div>
                                                            <div className="flex flex-col leading-none">
                                                                <span className="font-medium text-[11px]">{pet.name}</span>
                                                                {pet.breed && (
                                                                    <span className="text-[9px] text-gray-400 hidden lg:inline-block max-w-[80px] truncate">
                                                                        {pet.breed}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </Badge>
                                                    ))
                                                ) : <span className="text-xs text-gray-300 italic">Sin mascotas</span>}
                                            </div>
                                        </TableCell>

                                        {/* COL 3: ESTADO Y NOTAS (Desktop) */}
                                        <TableCell className="align-top py-4 hidden md:table-cell">
                                            <div className="flex flex-col gap-2 items-start">
                                                {!client.is_active || client.status === 'inactive' ? (
                                                    <Badge variant="destructive" className="h-5 text-[10px] px-2 rounded-full">Inactivo</Badge>
                                                ) : null}

                                                <div className="flex flex-wrap gap-1">
                                                    {client.tags.length > 0 ? client.tags.map((tag: string) => (
                                                        <Badge key={tag} variant="outline" className={`text-[10px] px-2 py-0.5 h-5 font-medium border rounded-full capitalize ${tagColors[tag] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                            {tag.replace('_', ' ')}
                                                        </Badge>
                                                    )) : null}
                                                </div>

                                                {client.notes && (
                                                    <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50/50 px-2 py-1 rounded-md border border-amber-100/50 max-w-[180px]">
                                                        <ShieldAlert size={12} className="mt-0.5 shrink-0 opacity-70"/> 
                                                        <span className="truncate line-clamp-2 leading-tight">{client.notes}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* COL 4: VISITA (Desktop Grande) */}
                                        <TableCell className="align-top py-4 hidden lg:table-cell">
                                            {client.lastVisit ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                                        <History size={13} className="text-gray-400"/>
                                                        {formatDistanceToNow(parseISO(client.lastVisit), { addSuffix: true, locale: es })}
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 pl-5">
                                                        {new Date(client.lastVisit).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            ) : <span className="text-xs text-gray-300 pl-2">Sin historial</span>}
                                        </TableCell>

                                        {/* COL 5: ACCIONES (STICKY MATCH) */}
                                        <TableCell className="align-middle text-right pr-6 py-4 sticky right-0 bg-white md:bg-transparent shadow-[ -8px_0px_12px_-4px_rgba(0,0,0,0.05)] md:shadow-none">
                                            <ClientActions client={client} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* PAGINACIÓN ELEGANTE */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="text-xs text-gray-500 font-medium">
                        Página {currentPage} de {totalPages || 1}
                    </span>
                    
                    <div className="flex items-center gap-2">
                        <Link href={currentPage > 1 ? `/admin/clients?q=${searchTerm}&page=${currentPage - 1}` : '#'}>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white shadow-sm" disabled={currentPage <= 1}>
                                <ChevronLeft size={16}/>
                            </Button>
                        </Link>
                        <Link href={currentPage < totalPages ? `/admin/clients?q=${searchTerm}&page=${currentPage + 1}` : '#'}>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white shadow-sm" disabled={currentPage >= totalPages}>
                                <ChevronRight size={16}/>
                            </Button>
                        </Link>
                    </div>
                </div>
            </Card>
        </div>
    );
}