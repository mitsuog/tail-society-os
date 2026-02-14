import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    Phone, Mail, History, ShieldAlert, ChevronLeft, ChevronRight, Dog, PawPrint, Search as SearchIcon, Users as UsersIcon
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
    
    const { q: query, page: pageParam } = await searchParams;
    const searchTerm = query || '';
    const currentPage = Number(pageParam) || 1;
    const itemsPerPage = 15;

    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let clientIdsToFetch: string[] = [];
    let isSearching = false;

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
        vip: "bg-amber-50 text-amber-700 border-amber-300",
        difficult: "bg-red-50 text-red-700 border-red-300",
        frequent: "bg-blue-50 text-blue-700 border-blue-300",
        employee: "bg-gray-50 text-gray-700 border-gray-300",
        late_payment: "bg-orange-50 text-orange-700 border-orange-300"
    };

    return (
        <div className="w-full bg-gradient-to-b from-blue-50/30 to-white pb-20 md:pb-8 min-h-screen">
            <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-4 lg:py-8 w-full">
                
                {/* HEADER */}
                <div className="mb-4 sm:mb-6 lg:mb-8 space-y-3 sm:space-y-4 sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-2 -mx-3 px-3 sm:mx-0 sm:px-0 border-b sm:border-none border-gray-100 transition-all">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                                <UsersIcon className="h-5 w-5 sm:h-7 sm:w-7 text-blue-600" />
                                Directorio de Clientes
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500">
                                {totalItems} registros encontrados
                            </p>
                        </div>
                        <div className="hidden sm:block">
                            <ClientPageHeader />
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Search placeholder="Buscar cliente, mascota, teléfono..." />
                        </div>
                        <div className="sm:hidden">
                            <ClientPageHeader />
                        </div>
                    </div>
                </div>

                {/* VISTA DESKTOP: TABLA */}
                <div className="hidden lg:block">
                    <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50/50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">Cliente</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">Mascotas</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">Estado</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">Última Visita</th>
                                        <th className="px-6 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-xs">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {clients.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                No se encontraron clientes.
                                            </td>
                                        </tr>
                                    ) : (
                                        clients.map((client) => (
                                            <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9 border border-gray-200">
                                                            <AvatarFallback className="bg-blue-50 text-blue-700 font-medium text-xs">
                                                                {client.initials}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <Link href={`/clients/${client.id}`} className="font-medium text-gray-900 hover:text-blue-600 truncate block">
                                                                {client.full_name}
                                                            </Link>
                                                            <div className="flex flex-col text-xs text-gray-500 mt-0.5">
                                                                <span className="flex items-center gap-1"><Phone size={10}/> {client.phone}</span>
                                                                {client.email && <span className="flex items-center gap-1 truncate max-w-[150px]"><Mail size={10}/> {client.email}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                                                        {client.pets && client.pets.length > 0 ? (
                                                            client.pets.map((pet: any) => (
                                                                <Badge key={pet.id} variant="secondary" className="bg-white border border-gray-200 text-gray-600 hover:border-blue-300 font-normal px-2 py-0.5 h-6">
                                                                    <Dog size={10} className="mr-1 text-gray-400"/> {pet.name}
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">Sin mascotas</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col gap-1.5 items-start">
                                                        {!client.is_active && <Badge variant="destructive" className="text-[10px] h-5 px-1.5">Inactivo</Badge>}
                                                        {client.tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {client.tags.slice(0, 2).map((tag: string) => (
                                                                    <Badge key={tag} variant="outline" className={`text-[10px] h-5 px-1.5 border-0 ${tagColors[tag] || 'bg-gray-100 text-gray-600'}`}>
                                                                        {tag.replace('_', ' ')}
                                                                    </Badge>
                                                                ))}
                                                                {client.tags.length > 2 && <span className="text-[10px] text-gray-400">+{client.tags.length - 2}</span>}
                                                            </div>
                                                        )}
                                                        {client.notes && (
                                                            <div className="flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 max-w-[140px] truncate" title={client.notes}>
                                                                <ShieldAlert size={10} className="shrink-0"/> Nota interna
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-xs text-gray-600">
                                                    {client.lastVisit ? (
                                                        <div>
                                                            <span className="block font-medium">{new Date(client.lastVisit).toLocaleDateString()}</span>
                                                            <span className="text-gray-400">{formatDistanceToNow(parseISO(client.lastVisit), { addSuffix: true, locale: es })}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Nunca</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <ClientActions client={client} />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* VISTA MÓVIL: TARJETAS COMPACTAS */}
                <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {clients.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                            <PawPrint className="h-10 w-10 mx-auto mb-2 text-gray-300"/>
                            <p>No se encontraron resultados.</p>
                        </div>
                    ) : (
                        clients.map((client) => (
                            <Link href={`/clients/${client.id}`} key={client.id} className="block group">
                                <Card className="p-3 border-gray-200 bg-white active:bg-gray-50 transition-all shadow-sm hover:shadow-md h-full flex flex-col relative overflow-hidden">
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${client.is_active ? 'bg-blue-500' : 'bg-gray-300'}`} />
                                    
                                    <div className="pl-2 flex flex-col h-full justify-between gap-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex gap-2.5 min-w-0">
                                                <Avatar className="h-9 w-9 border border-gray-100 shrink-0">
                                                    <AvatarFallback className="bg-blue-50 text-blue-700 text-xs font-bold">
                                                        {client.initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-sm text-gray-900 truncate leading-tight mb-0.5">
                                                        {client.full_name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                                        <span className="flex items-center gap-1"><Phone size={10}/> {client.phone}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* FIX: Eliminamos el onClick aquí y lo dejamos en el componente ClientActions */}
                                            <div className="shrink-0 -mr-1">
                                                 <ClientActions client={client} />
                                            </div>
                                        </div>

                                        <div className="bg-gray-50/80 rounded-md p-2 border border-gray-100">
                                            {client.pets && client.pets.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {client.pets.map((pet: any) => (
                                                        <Badge key={pet.id} variant="secondary" className="bg-white text-gray-700 border border-gray-200 text-[10px] px-1.5 py-0 h-5 font-medium flex items-center gap-1 shadow-sm">
                                                            <Dog size={10} className="text-blue-400" /> {pet.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-gray-400 italic flex items-center gap-1">
                                                    <PawPrint size={10}/> Sin mascotas registradas
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between pt-1 border-t border-gray-50 mt-1">
                                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                                <History size={10}/> 
                                                {client.lastVisit 
                                                    ? formatDistanceToNow(parseISO(client.lastVisit), { locale: es, addSuffix: true }) 
                                                    : 'Sin historial'}
                                            </div>

                                            <div className="flex gap-1">
                                                {!client.is_active && (
                                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded uppercase">Inactivo</span>
                                                )}
                                                {client.tags.includes('vip') && (
                                                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded uppercase">VIP</span>
                                                )}
                                                {client.notes && (
                                                    <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 border border-orange-100 text-[9px] rounded flex items-center gap-1">
                                                        <ShieldAlert size={8}/> Nota
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))
                    )}
                </div>

                {/* PAGINACIÓN */}
                {totalPages > 1 && (
                    <div className="mt-4 lg:mt-6 flex justify-center items-center gap-2 pb-20 md:pb-0">
                        <Link href={currentPage > 1 ? `/admin/clients?q=${searchTerm}&page=${currentPage - 1}` : '#'}>
                            <Button variant="outline" size="sm" disabled={currentPage <= 1} className="h-8 w-8 p-0 rounded-full shadow-sm">
                                <ChevronLeft size={16}/>
                            </Button>
                        </Link>
                        <span className="text-xs font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                            Página {currentPage} de {totalPages}
                        </span>
                        <Link href={currentPage < totalPages ? `/admin/clients?q=${searchTerm}&page=${currentPage + 1}` : '#'}>
                            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} className="h-8 w-8 p-0 rounded-full shadow-sm">
                                <ChevronRight size={16}/>
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}