import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { ArrowLeft, Calendar, FileText, Phone, MapPin, Mail, Clock, ShieldAlert } from 'lucide-react';
// Fíjate que ahora usamos @/components... es más limpio y seguro
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// Interfaces para TypeScript
interface Pet {
  id: string;
  name: string;
  breed: string;
  species: string;
  gender: string;
  allergies: string | null;
  birth_date: string | null;
}

interface Appointment {
  id: string;
  date: string;
  notes: string | null;
  price_charged: number | null;
  secondary_services_text: string | null;
  services_catalog: { name: string } | null;
  pets: { name: string } | null;
}

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Obtener Cliente
  const { data: client } = await supabase.from('clients').select('*').eq('id', id).single();
  
  // 2. Obtener Mascotas
  const { data: rawPets } = await supabase.from('pets').select('*').eq('client_id', id);
  const pets = rawPets as unknown as Pet[] | null;

  // 3. Obtener Bitácora (Historial)
  let appointments: Appointment[] = [];
  const petIds = pets?.map(p => p.id) || [];
  
  if (petIds.length > 0) {
    const { data: appts } = await supabase
      .from('appointments')
      .select(`
        *,
        services_catalog ( name ),
        pets ( name )
      `)
      .in('pet_id', petIds)
      .order('date', { ascending: false });
    
    if (appts) appointments = appts as unknown as Appointment[];
  }

  if (!client) return <div className="p-10 text-center">Cliente no encontrado</div>;

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER SIMPLE */}
      <div className="flex items-center gap-4 mb-2">
        <Link href="/">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{client.full_name}</h1>
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <Phone size={12}/> {client.phone}
          </p>
        </div>
      </div>

      {/* SISTEMA DE PESTAÑAS */}
      <Tabs defaultValue="bitacora" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="bitacora">Bitácora / Historial</TabsTrigger>
          <TabsTrigger value="perfil">Perfil y Mascotas</TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA 1: BITÁCORA (El corazón del CRM) --- */}
        <TabsContent value="bitacora" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
             <h2 className="text-lg font-semibold text-slate-800">Historial de Servicios</h2>
             <Badge variant="outline" className="text-slate-500">{appointments.length} Citas registradas</Badge>
          </div>

          <div className="space-y-4">
            {appointments.map((appt) => (
              <Card key={appt.id} className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    
                    {/* Columna Izquierda: Qué y Cuándo */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-slate-900">
                          {appt.services_catalog?.name || "Servicio General"}
                        </span>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                          {appt.pets?.name}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar size={14} />
                        <span className="capitalize">
                          {new Date(appt.date).toLocaleDateString('es-MX', { 
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                          })}
                        </span>
                        {appt.price_charged && (
                          <>
                           <span>•</span>
                           <span className="font-medium text-green-700">${appt.price_charged}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Columna Derecha: Notas (Lo importante) */}
                    <div className="flex-1 md:max-w-lg bg-yellow-50/50 p-3 rounded-md border border-yellow-100">
                      <div className="flex gap-2">
                        <FileText size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {appt.notes || "Sin notas registradas."}
                        </p>
                      </div>
                      {appt.secondary_services_text && (
                        <div className="mt-2 pt-2 border-t border-yellow-200/50 text-xs text-slate-500">
                          <span className="font-semibold">Extras:</span> {appt.secondary_services_text}
                        </div>
                      )}
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))}

            {appointments.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                <Clock className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                <p className="text-slate-500">No hay historial disponible para este cliente.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* --- PESTAÑA 2: PERFIL (Datos estáticos) --- */}
        <TabsContent value="perfil" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tarjeta Cliente */}
            <Card>
              <CardHeader>
                <CardTitle>Datos del Dueño</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                    {client.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{client.full_name}</p>
                    <p className="text-xs text-slate-500">ID: {client.id.split('-')[0]}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3 text-slate-600">
                    <Phone size={16} className="text-slate-400"/> {client.phone}
                  </div>
                  <div className="flex gap-3 text-slate-600">
                    <Mail size={16} className="text-slate-400"/> {client.email || "No registrado"}
                  </div>
                  <div className="flex gap-3 text-slate-600">
                    <MapPin size={16} className="text-slate-400"/> {client.address || "Sin dirección"}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarjetas Mascotas */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pets?.map(pet => (
                <Card key={pet.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle>{pet.name}</CardTitle>
                      <Badge>{pet.species || "Mascota"}</Badge>
                    </div>
                    <CardDescription>{pet.breed} • {pet.gender}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pet.allergies && (
                      <div className="bg-red-50 text-red-700 text-xs p-2 rounded flex items-start gap-2">
                        <ShieldAlert size={14} className="mt-0.5"/>
                        {pet.allergies}
                      </div>
                    )}
                    {!pet.allergies && <p className="text-xs text-slate-400 italic">Sin alergias registradas</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}