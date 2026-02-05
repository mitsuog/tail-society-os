import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { 
  Phone, MapPin, Mail, Clock, Plus, 
  Filter, XCircle, History, FileSignature, FileText, CalendarPlus, CheckCircle, AlertCircle, Pencil, Eye
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import EditClientDialog from '@/components/EditClientDialog'; 
import AddPetDialog from '@/components/AddPetDialog';
import SignatureLinkButton from '@/components/SignatureLinkButton';
import PetCard from '@/components/PetCard';
import BackButton from '@/components/BackButton';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { cn } from "@/lib/utils";

// --- IMPORTANTE: Evita que Next.js guarde caché del estatus de la firma ---
export const dynamic = 'force-dynamic';

// --- INTERFACES ---
interface Pet {
  id: string;
  client_id: string;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  size: string | null;
  birth_date: string | null;
  photo_url: string | null;
  status: string; 
  waiver_signed: boolean; // Campo clave para la firma
  is_vaccined: boolean;
  has_allergies: boolean;
  has_illness: boolean;
  has_conditions: boolean;
  is_senior: boolean;
  is_aggressive: boolean;
  is_nervous: boolean;
  is_noisereactive: boolean;
  convive: boolean;
  treats: boolean;
  notes: string | null;
  vet_name: string | null;
  vet_phone: string | null;
  last_vaccine_date: string | null;
  medical_notes: string | null;
  created_at: string;
}

interface Appointment {
  id: string;
  date: string;
  notes: string | null;
  price_charged: number | null;
  secondary_services_text: string | null;
  pet_id: string;
  status: string;
  pet: { name: string };
}

export default async function ClientDetail({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>, 
  searchParams: Promise<{ pet_id?: string }> 
}) {
  const { id } = await params;
  const { pet_id } = await searchParams;
  const supabase = await createClient();

  // 1. CARGA DE CLIENTE
  const { data: client } = await supabase.from('clients').select('*').eq('id', id).single();
  if (!client) return <div className="p-10 text-center text-slate-500">Cliente no encontrado</div>;

  // 2. CARGA DE MASCOTAS
  const { data: rawPets } = await supabase
    .from('pets')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: true });
    
  const pets = rawPets as Pet[] | null;

  // --- LÓGICA DE FIRMA ---
  const hasPets = pets && pets.length > 0;
  // Firmado completo: Si tiene mascotas y TODAS tienen la firma true
  const allSigned = hasPets && pets.every(p => p.waiver_signed);
  // Firma parcial: Si solo algunas tienen la firma
  const someSigned = hasPets && pets.some(p => p.waiver_signed) && !allSigned;

  // 3. CARGA DE CITAS
  let allAppointments: Appointment[] = [];
  const petIds = pets?.map(p => p.id) || [];
  
  if (petIds.length > 0) {
    const { data: appts } = await supabase
      .from('appointments')
      .select(`*, pet:pets(name)`) 
      .in('pet_id', petIds)
      .order('date', { ascending: false });
    
    if (appts) allAppointments = appts as any[];
  }

  // Filtrado de citas
  const displayedAppointments = pet_id 
    ? allAppointments.filter(a => a.pet_id === pet_id)
    : allAppointments;

  const activePetName = pet_id ? pets?.find(p => p.id === pet_id)?.name : null;

  // Antigüedad del Cliente
  let clientSinceDate = new Date(client.created_at);
  if (allAppointments.length > 0) {
    const oldestDate = new Date(allAppointments[allAppointments.length - 1].date);
    if (oldestDate < clientSinceDate) clientSinceDate = oldestDate;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4 animate-in fade-in duration-300">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 leading-none">{client.full_name}</h1>
              
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal text-slate-500 bg-slate-100">
                 Desde {clientSinceDate.getFullYear()}
              </Badge>

              {/* BADGES DE ESTADO DE FIRMA */}
              {allSigned ? (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 gap-1 text-[10px] h-5 hover:bg-blue-100 cursor-default">
                      <FileSignature size={10}/> Contrato Vigente
                  </Badge>
              ) : someSigned ? (
                  <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 gap-1 text-[10px] h-5">
                      <AlertCircle size={10}/> Firma Parcial
                  </Badge>
              ) : (
                  <Badge variant="outline" className="text-slate-500 border-slate-200 bg-slate-50 gap-1 text-[10px] h-5">
                      <FileText size={10}/> Sin Firma
                  </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Phone size={12}/> {client.phone}</span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1"><Mail size={12}/> {client.email || "Sin email"}</span>
              <span className="flex items-center gap-1"><MapPin size={12}/> Monterrey, NL</span>
            </div>
          </div>
        </div>

        {/* ACCIONES DEL HEADER */}
        <div className="flex gap-2 w-full md:w-auto justify-end items-center">
           <NewAppointmentDialog 
              initialClient={{ id: client.id, full_name: client.full_name, phone: client.phone }}
              customTrigger={
                  <Button className="bg-slate-900 text-white hover:bg-slate-800 h-9 text-xs">
                      <CalendarPlus className="mr-2 h-3.5 w-3.5"/> Nueva Cita
                  </Button>
              }
           />
           
           {/* GRUPO DE ACCIONES DE CONTRATO */}
           <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
               {/* 1. Botón para copiar link */}
               <SignatureLinkButton clientId={client.id} isSigned={allSigned} />
               
               {/* 2. Botón para ver documento (Solo si hay mascotas) */}
               {hasPets && (
                   <Link href={`/waiver/${client.id}?mode=view`} target="_blank">
                       <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-600 hover:text-blue-700 hover:bg-white px-3 border-l border-slate-200 rounded-l-none" title="Ver Documento Firmado">
                           <Eye size={14} className="mr-1.5"/> Ver
                       </Button>
                   </Link>
               )}
           </div>
           
           <AddPetDialog clientId={client.id} />
           
           <EditClientDialog 
              client={client} 
              trigger={
                <Button variant="outline" className="gap-2 bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-blue-700 h-9 px-3">
                   <Pencil size={14} />
                </Button>
              }
           />
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* COLUMNA IZQUIERDA: PERFIL Y MASCOTAS (3/12) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Tarjeta de Notas */}
          {(client.notes || client.internal_tags) && (
            <div className="bg-white rounded-lg border border-slate-200 p-3 text-xs space-y-2 shadow-sm">
              {client.internal_tags && client.internal_tags.length > 0 && (
                 <div className="flex flex-wrap gap-1">
                    {client.internal_tags.map((tag: string) => (
                        <span key={tag} className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1">
                            <Filter size={10}/> {tag}
                        </span>
                    ))}
                 </div>
              )}
              {client.notes && (
                 <div className="bg-slate-50 text-slate-600 p-2 rounded border border-slate-100 leading-relaxed italic">
                   {client.notes}
                 </div>
              )}
            </div>
          )}

          {/* Lista de Mascotas */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mascotas ({pets?.length})</h3>
            </div>
            
            <div className="flex flex-col gap-2">
              {pets?.map(pet => (
                <PetCard 
                  key={pet.id} 
                  pet={pet} 
                  /* CORRECCIÓN: Props requeridas por PetCard */
                  clientId={client.id}
                  isActive={pet_id === pet.id}
                />
              ))}
              
              {(!pets || pets.length === 0) && (
                 <div className="text-center p-6 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-400">Sin mascotas registradas</p>
                 </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: HISTORIAL (9/12) */}
        <div className="lg:col-span-9">
          <Card className="shadow-sm border-slate-200 h-full min-h-[500px] flex flex-col bg-white">
              
              {/* Header de Tabla */}
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/30 rounded-t-lg">
                 <div className="flex items-center gap-2">
                    <History size={16} className="text-slate-400"/>
                    <span className="text-sm font-bold text-slate-700">Historial de Servicios</span>
                 </div>
                 
                 {pet_id && activePetName ? (
                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium border border-blue-100 animate-in fade-in">
                       <Filter size={10} /> Filtrado por: <strong>{activePetName}</strong>
                       <Link href={`/clients/${client.id}`} title="Ver todos"><XCircle size={14} className="ml-1 cursor-pointer hover:text-red-500 transition-colors"/></Link>
                    </div>
                 ) : (
                    <span className="text-xs text-slate-400">Mostrando historial completo</span>
                 )}
              </div>

              {/* Lista de Citas */}
              <div className="flex-1 overflow-auto p-0">
                {displayedAppointments.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                     {displayedAppointments.map((appt) => (
                       <div key={appt.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 hover:bg-slate-50 transition-colors group">
                         
                         {/* Fecha y Mascota */}
                         <div className="sm:w-[150px] shrink-0">
                            <div className="flex items-center gap-2 mb-1">
                               <Badge variant="outline" className="text-[10px] h-4 px-1 rounded-sm border-slate-300 text-slate-500 font-normal bg-white">
                                 {appt.pet?.name || 'Mascota'}
                               </Badge>
                            </div>
                            <p className="text-sm font-bold text-slate-800 capitalize">
                              {new Date(appt.date).toLocaleDateString('es-MX', {day: 'numeric', month: 'short', year: '2-digit'})}
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock size={10}/> {new Date(appt.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                         </div>

                         {/* Descripción */}
                         <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 font-medium truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                              {appt.notes?.replace('ServicioCD:', '').split('. Staff:')[0] || "Servicio General"}
                            </p>
                            {appt.secondary_services_text && (
                              <p className="text-xs text-slate-400 truncate mt-0.5">{appt.secondary_services_text}</p>
                            )}
                         </div>

                         {/* Precio */}
                         <div className="text-right sm:w-[90px] shrink-0 border-l border-transparent sm:border-slate-100 sm:pl-4">
                            <span className="text-sm font-bold text-green-700">${appt.price_charged?.toLocaleString() || 0}</span>
                         </div>
                       </div>
                     ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                     <div className="bg-slate-50 p-4 rounded-full mb-2">
                        <FileText size={32} className="opacity-30"/>
                     </div>
                     <p className="text-sm font-medium text-slate-500">Sin registros disponibles</p>
                     {pet_id && <p className="text-xs mt-1">Para esta mascota</p>}
                  </div>
                )}
              </div>
          </Card>
        </div>

      </div>
    </div>
  );
}