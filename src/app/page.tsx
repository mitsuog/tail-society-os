import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import Search from '@/components/Search';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Dog, Phone, Mail, ChevronRight, SearchX } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Pet {
  name: string;
  breed: string;
  species: string;
}

interface Client {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  pets: Pet[];
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ q?: string }> | { q?: string } }) {
  const params = await searchParams;
  const query = params?.q || '';
  const supabase = await createClient();

  // --- LÓGICA DE BÚSQUEDA ---
  let filterIds: string[] = [];
  if (query) {
    const { data: matchedPets } = await supabase
      .from('pets')
      .select('client_id')
      .ilike('name', `%${query}%`);
    if (matchedPets) filterIds = matchedPets.map(p => p.client_id).filter(Boolean);
  }

  let dbQuery = supabase
    .from('clients')
    .select(`id, full_name, phone, email, pets ( name, breed, species )`)
    .order('created_at', { ascending: false });

  if (query) {
    let orConditions = `full_name.ilike.%${query}%,phone.ilike.%${query}%`;
    if (filterIds.length > 0) orConditions += `,id.in.(${filterIds.join(',')})`;
    dbQuery = dbQuery.or(orConditions);
  }

  const { data: rawClients } = await dbQuery.limit(query ? 50 : 15);
  const clients = rawClients as unknown as Client[] | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Clientes</h2>
          <p className="text-slate-500">
            {query ? `Resultados para "${query}"` : `Mostrando los últimos registros`}
          </p>
        </div>
        <Link href="/nuevo">
          <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-2 shadow-md">
            <Plus size={16} /> Nuevo Cliente
          </Button>
        </Link>
      </div>

      {/* Buscador */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="w-full md:w-1/2">
            <Search placeholder="Buscar Cliente, Teléfono o Mascota..." />
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden border-slate-200 shadow-sm bg-white">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="w-[300px] font-semibold">Cliente</TableHead>
              <TableHead className="font-semibold">Contacto</TableHead>
              <TableHead className="font-semibold">Mascotas</TableHead>
              <TableHead className="text-right font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients?.map((client) => (
              <TableRow key={client.id} className="hover:bg-blue-50/50 cursor-pointer group transition-colors">
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-slate-100 shadow-sm">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${client.full_name}`} />
                      <AvatarFallback>{client.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-slate-900">{client.full_name}</div>
                      <div className="text-xs text-slate-400">ID: {client.id.split('-')[0]}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone size={13} className="text-blue-500" /> {client.phone}
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail size={13} className="text-slate-400" /> {client.email}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {client.pets.map((pet, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 font-normal">
                        <Dog size={12} className="mr-1 text-slate-400"/>
                        {pet.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/clients/${client.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {(!clients || clients.length === 0) && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <SearchX className="h-6 w-6 text-slate-300" />
            </div>
            <h3 className="text-slate-900 font-medium">Sin resultados</h3>
            <p className="text-slate-500 text-sm mt-1">No encontramos coincidencias para "{query}"</p>
          </div>
        )}
      </Card>
    </div>
  );
}