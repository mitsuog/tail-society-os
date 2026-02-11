import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    Phone, Mail, History, ShieldAlert, ChevronLeft, ChevronRight, Dog, PawPrint, Search as SearchIcon, Eye
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
        <div className="min-h-screen bg-gradient-to-b from-blue-50/30 to-white pt-20 md:pt-8 pb-8">
            <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 w-full">
                
                {/* HEADER */}
                <div className="mb-4 sm:mb-6 lg:mb-8 space-y-3 sm:space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
                                Directorio de Clientes
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-600">
                                {totalItems} {totalItems === 1 ? 'cliente registrado' : 'clientes registrados'}
                            </p>
                        </div>
                        <div className="hidden sm:block">
                            <ClientPageHeader />
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Search placeholder="Buscar por nombre, teléfono, mascota..." />
                        </div>
                        <div className="sm:hidden">
                            <ClientPageHeader />
                        </div>
                    </div>
                </div>

                {/* VISTA DESKTOP: TABLA */}
                <div className="hidden lg:block">
                    <Card className="border-gray-200 shadow-md overflow-hidden bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-blue-50 to-teal-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Cliente</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Mascotas</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Detalles</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Última Visita</th>
                                        <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {clients.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center gap-3 text-gray-400">
                                                    <div className="bg-blue-50 p-4 rounded-full">
                                                        {isSearching ? <SearchIcon className="h-8 w-8 text-blue-400"/> : <PawPrint className="h-8 w-8 text-blue-400" />}
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-600">
                                                        {isSearching ? `No se encontraron resultados para "${searchTerm}"` : "Aún no hay clientes registrados"}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        clients.map((client) => (
                                            <tr key={client.id} className="group hover:bg-blue-50/30 transition-colors">
                                                {/* CLIENTE */}
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-3 items-center">
                                                        <Avatar className="h-10 w-10 border-2 border-blue-100">
                                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-teal-500 text-white font-semibold text-sm">
                                                                {client.initials}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0 flex-1">
                                                            <Link 
                                                                href={`/clients/${client.id}`} 
                                                                className="font-semibold text-gray-900 hover:text-blue-600 transition-colors block truncate"
                                                            >
                                                                {client.full_name}
                                                            </Link>
                                                            <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                                                                <span className="flex items-center gap-1">
                                                                    <Phone size={11} className="text-gray-400"/> {client.phone}
                                                                </span>
                                                                {client.email && (
                                                                    <>
                                                                        <span className="text-gray-300">•</span>
                                                                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                                                                            <Mail size={11} className="text-gray-400"/> {client.email}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* MASCOTAS */}
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                                        {client.pets && client.pets.length > 0 ? (
                                                            client.pets.map((pet: any) => (
                                                                <Badge key={pet.id} variant="secondary" className="bg-white border border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50 gap-1.5 shadow-sm transition-colors">
                                                                    <Dog size={12} className="text-gray-500"/>
                                                                    <span className="text-xs font-medium">{pet.name}</span>
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">Sin mascotas</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* DETALLES */}
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        {!client.is_active || client.status === 'inactive' && (
                                                            <Badge variant="destructive" className="w-fit text-xs">Inactivo</Badge>
                                                        )}
                                                        <div className="flex flex-wrap gap-1">
                                                            {client.tags.map((tag: string) => (
                                                                <Badge key={tag} variant="outline" className={`text-xs capitalize ${tagColors[tag] || 'bg-gray-50 text-gray-600 border-gray-300'}`}>
                                                                    {tag.replace('_', ' ')}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                        {client.notes && (
                                                            <div className="flex items-start gap-1.5 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-200 max-w-[180px]">
                                                                <ShieldAlert size={12} className="mt-0.5 shrink-0"/>
                                                                <span className="truncate">{client.notes}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* ÚLTIMA VISITA */}
                                                <td className="px-4 py-4">
                                                    {client.lastVisit ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                                                <History size={13} className="text-gray-400"/>
                                                                {formatDistanceToNow(parseISO(client.lastVisit), { addSuffix: true, locale: es })}
                                                            </div>
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(client.lastVisit).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">Sin historial</span>
                                                    )}
                                                </td>

                                                {/* ACCIONES */}
                                                <td className="px-6 py-4 text-right">
                                                    <ClientActions client={client} />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* PAGINACIÓN */}
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                            <span className="text-sm text-gray-700">
                                Página <span className="font-semibold">{currentPage}</span> de <span className="font-semibold">{totalPages || 1}</span>
                            </span>
                            <div className="flex items-center gap-2">
                                <Link href={currentPage > 1 ? `/admin/clients?q=${searchTerm}&page=${currentPage - 1}` : '#'}>
                                    <Button variant="outline" size="sm" disabled={currentPage <= 1} className="h-9 border-gray-300 hover:bg-blue-50 hover:border-blue-400">
                                        <ChevronLeft size={16} className="mr-1"/> Anterior
                                    </Button>
                                </Link>
                                <Link href={currentPage < totalPages ? `/admin/clients?q=${searchTerm}&page=${currentPage + 1}` : '#'}>
                                    <Button variant="outline" size="sm" disabled={currentPage >= totalPages} className="h-9 border-gray-300 hover:bg-blue-50 hover:border-blue-400">
                                        Siguiente <ChevronRight size={16} className="ml-1"/>
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* VISTA MÓVIL/TABLET: CARDS */}
                <div className="lg:hidden space-y-3">
                    {clients.length === 0 ? (
                        <Card className="p-12 text-center border-gray-200 bg-white shadow-md">
                            <div className="flex flex-col items-center gap-3">
                                <div className="bg-blue-50 p-4 rounded-full">
                                    {isSearching ? <SearchIcon className="h-8 w-8 text-blue-400"/> : <PawPrint className="h-8 w-8 text-blue-400" />}
                                </div>
                                <p className="text-sm font-medium text-gray-600">
                                    {isSearching ? `No hay resultados para "${searchTerm}"` : "Aún no hay clientes"}
                                </p>
                            </div>
                        </Card>
                    ) : (
                        clients.map((client) => (
                            <Card key={client.id} className="overflow-hidden border-gray-200 bg-white hover:shadow-lg transition-all">
                                <div className="p-4 space-y-3">
                                    {/* HEADER */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex gap-3 items-start flex-1 min-w-0">
                                            <Avatar className="h-12 w-12 border-2 border-blue-100 shrink-0">
                                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-teal-500 text-white font-bold">
                                                    {client.initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-semibold text-gray-900 truncate mb-1">
                                                    {client.full_name}
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-700 mb-0.5">
                                                    <Phone size={11} className="text-gray-400 shrink-0"/>
                                                    <span>{client.phone}</span>
                                                </div>
                                                {client.email && (
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 truncate">
                                                        <Mail size={11} className="text-gray-400 shrink-0"/>
                                                        <span className="truncate">{client.email}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Link href={`/clients/${client.id}`}>
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50">
                                                <Eye size={16}/>
                                            </Button>
                                        </Link>
                                    </div>

                                    {/* MASCOTAS */}
                                    {client.pets && client.pets.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {client.pets.map((pet: any) => (
                                                <Badge key={pet.id} variant="secondary" className="bg-gray-100 text-gray-700 gap-1.5 border border-gray-300">
                                                    <Dog size={11}/>
                                                    <span className="text-xs">{pet.name}</span>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    {/* TAGS */}
                                    {(client.tags.length > 0 || !client.is_active) && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {!client.is_active && (
                                                <Badge variant="destructive" className="text-xs">Inactivo</Badge>
                                            )}
                                            {client.tags.slice(0, 3).map((tag: string) => (
                                                <Badge key={tag} variant="outline" className={`text-xs capitalize ${tagColors[tag] || 'bg-gray-50 text-gray-600 border-gray-300'}`}>
                                                    {tag.replace('_', ' ')}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    {/* FOOTER */}
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                        {client.lastVisit ? (
                                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                <History size={12} className="text-gray-400"/>
                                                <span>{formatDistanceToNow(parseISO(client.lastVisit), { addSuffix: true, locale: es })}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">Sin visitas</span>
                                        )}
                                        <ClientActions client={client} />
                                    </div>

                                    {/* NOTA */}
                                    {client.notes && (
                                        <div className="flex items-start gap-2 text-xs text-orange-700 bg-orange-50 px-2.5 py-2 rounded border border-orange-200">
                                            <ShieldAlert size={12} className="mt-0.5 shrink-0"/>
                                            <span className="line-clamp-2">{client.notes}</span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))
                    )}

                    {/* PAGINACIÓN MÓVIL */}
                    {totalPages > 1 && (
                        <Card className="p-4 border-gray-200 bg-white shadow-md">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">
                                    Página {currentPage} de {totalPages}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Link href={currentPage > 1 ? `/admin/clients?q=${searchTerm}&page=${currentPage - 1}` : '#'}>
                                        <Button variant="outline" size="sm" disabled={currentPage <= 1} className="h-9 w-9 p-0 border-gray-300 hover:bg-blue-50 hover:border-blue-400">
                                            <ChevronLeft size={16}/>
                                        </Button>
                                    </Link>
                                    <Link href={currentPage < totalPages ? `/admin/clients?q=${searchTerm}&page=${currentPage + 1}` : '#'}>
                                        <Button variant="outline" size="sm" disabled={currentPage >= totalPages} className="h-9 w-9 p-0 border-gray-300 hover:bg-blue-50 hover:border-blue-400">
                                            <ChevronRight size={16}/>
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}