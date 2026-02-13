import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { 
  Phone, MapPin, Mail, Clock, 
  Filter, XCircle, History, FileSignature, FileText, CalendarPlus, 
  AlertCircle, Pencil, Eye, Dog, Calendar, User, ChevronRight, Hash
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import EditClientDialog from '@/components/EditClientDialog'; 
import AddPetDialog from '@/components/AddPetDialog';
import SignatureLinkButton from '@/components/SignatureLinkButton';
import PetCard from '@/components/PetCard';
import BackButton from '@/components/BackButton';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';

export const dynamic = 'force-dynamic';

// --- INTERFACES (Intactas) ---
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
  waiver_signed: boolean;
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
  pet: { name: string } | null;
}

export default async function ClientDetail({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>, 
  searchParams: Promise<{ pet_id?: string }> 
}) {
  // --- LÓGICA DE DATOS (Intacta) ---
  const { id } = await params;
  const { pet_id } = await searchParams;
  const supabase = await createClient();

  const { data: rawClient } = await supabase.from('clients').select('*').eq('id', id).single();
  
  if (!rawClient) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-gray-600 gap-4 p-4">
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-900">Cliente no encontrado</p>
              <p className="text-sm text-gray-500 mb-6">Es posible que haya sido eliminado o el ID sea incorrecto.</p>
              <Link href="/admin/clients"><Button variant="outline">Volver al Directorio</Button></Link>
            </div>
        </div>
    );
  }

  const client = {
      ...rawClient,
      internal_tags: Array.isArray(rawClient.internal_tags) ? rawClient.internal_tags : []
  };

  const { data: rawPets } = await supabase
    .from('pets')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: true });
    
  const pets = (rawPets || []) as Pet[];

  const hasPets = pets.length > 0;
  const allSigned = hasPets && pets.every(p => p.waiver_signed);
  const someSigned = hasPets && pets.some(p => p.waiver_signed) && !allSigned;

  let allAppointments: Appointment[] = [];
  const petIds = pets.map(p => p.id);
  
  if (petIds.length > 0) {
    const { data: appts } = await supabase
      .from('appointments')
      .select(`*, pet:pets(name)`) 
      .in('pet_id', petIds)
      .order('date', { ascending: false });
    
    if (appts) allAppointments = appts as unknown as Appointment[];
  }

  const displayedAppointments = pet_id 
    ? allAppointments.filter(a => a.pet_id === pet_id)
    : allAppointments;

  const activePetName = pet_id ? pets.find(p => p.id === pet_id)?.name : null;

  let clientSinceDate = new Date(client.created_at);
  if (allAppointments.length > 0) {
    const lastApptDate = new Date(allAppointments[allAppointments.length - 1].date);
    if (!isNaN(lastApptDate.getTime()) && lastApptDate < clientSinceDate) {
        clientSinceDate = lastApptDate;
    }
  }

  // Helper para iniciales
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
      <div className="min-h-screen bg-slate-50/50 pb-12">
        {/* TOP BAR / BREADCRUMB */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 h-14 flex items-center shadow-sm">
             <div className="max-w-7xl mx-auto w-full flex items-center gap-2 text-sm text-gray-500">
                <BackButton />
                <span className="hidden sm:inline">Directorio</span>
                <ChevronRight size={14} className="hidden sm:inline" />
                <span className="font-medium text-gray-900 truncate">Expediente de {client.full_name}</span>
             </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
          {/* --- HERO PROFILE CARD --- */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6 md:items-start">
                
                {/* Avatar & Main Info */}
                <div className="flex items-start gap-4 flex-1">
                  <Avatar className="h-20 w-20 border-4 border-slate-50 shadow-inner">
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl font-bold">
                      {getInitials(client.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-2">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                        {client.full_name}
                      </h1>
                      <div className="flex items-center gap-2 mt-1">
                         <Badge variant="secondary" className="font-normal text-gray-600 bg-gray-100">
                           Cliente desde {clientSinceDate.getFullYear()}
                         </Badge>
                         {/* Status Contract Badge */}
                         {allSigned ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 hover:bg-emerald-100">
                              <FileSignature size={12}/> Contrato Vigente
                            </Badge>
                          ) : someSigned ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1">
                              <AlertCircle size={12}/> Firma Parcial
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500 border-gray-300 bg-gray-50 gap-1">
                              <FileText size={12}/> Sin Firma
                            </Badge>
                          )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600 bg-slate-50 p-4 rounded-lg border border-slate-100 min-w-[300px]">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600">
                        <Phone size={16} />
                      </div>
                      <span className="font-medium text-gray-900">{client.phone}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-indigo-600">
                        <Mail size={16} />
                      </div>
                      <span className="truncate max-w-[180px]" title={client.email || ''}>{client.email || "No registrado"}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-rose-500">
                        <MapPin size={16} />
                      </div>
                      <span>Monterrey, NL</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-500">
                        <Hash size={16} />
                      </div>
                      <span className="font-mono text-xs text-gray-400">ID: ...{client.id.slice(-6)}</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="bg-slate-50/50 border-t border-gray-100 px-6 py-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex gap-2 w-full sm:w-auto">
                    {/* Nueva Cita - Botón Principal */}
                    <NewAppointmentDialog 
                      initialClient={{ id: client.id, full_name: client.full_name, phone: client.phone }}
                      customTrigger={
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm w-full sm:w-auto">
                          <CalendarPlus className="mr-2 h-4 w-4"/> Nueva Cita
                        </Button>
                      }
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>
                    
                    <SignatureLinkButton clientId={client.id} isSigned={allSigned} />
                    
                    {hasPets && (
                      <Link href={`/waiver/${client.id}?mode=view`} target="_blank">
                        <Button variant="outline" size="sm" className="bg-white hover:bg-slate-50 text-slate-700 border-slate-300">
                          <Eye size={14} className="mr-2"/> Ver Contrato
                        </Button>
                      </Link>
                    )}
                    
                    <AddPetDialog clientId={client.id} />

                    <EditClientDialog 
                      client={client} 
                      trigger={
                        <Button variant="outline" size="icon" className="h-9 w-9 bg-white border-slate-300 hover:bg-slate-50 text-slate-600" title="Editar Cliente">
                          <Pencil size={15} />
                        </Button>
                      }
                    />
                </div>
            </div>
          </div>

          {/* --- CONTENT GRID --- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* SIDEBAR (Notas & Mascotas) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Notas Importantes */}
              {(client.notes || client.internal_tags.length > 0) && (
                <Card className="p-4 border-amber-100 bg-amber-50/50 shadow-sm space-y-3">
                   <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
                     <AlertCircle size={14}/> Notas Internas
                   </h3>
                   
                   {client.internal_tags.length > 0 && (
                     <div className="flex flex-wrap gap-1.5">
                       {client.internal_tags.map((tag: string) => (
                         <Badge key={tag} variant="outline" className="bg-white border-amber-200 text-amber-700 capitalize">
                           <Filter size={10} className="mr-1"/> {tag.replace('_', ' ')}
                         </Badge>
                       ))}
                     </div>
                   )}
                   
                   {client.notes && (
                     <p className="text-sm text-gray-700 italic leading-relaxed bg-white/60 p-3 rounded-lg border border-amber-100/50">
                       "{client.notes}"
                     </p>
                   )}
                </Card>
              )}

              {/* Lista de Mascotas */}
              <div className="space-y-3">
                 <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                       <Dog size={16} className="text-blue-500"/> Mascotas ({pets.length})
                    </h3>
                 </div>
                 
                 <div className="space-y-3">
                   {pets.map(pet => (
                     <div key={pet.id} className={`transition-transform duration-200 ${pet_id === pet.id ? 'ring-2 ring-blue-500 ring-offset-2 rounded-xl' : ''}`}>
                         <PetCard 
                           pet={pet} 
                           clientId={client.id}
                           isActive={pet_id === pet.id}
                         />
                     </div>
                   ))}
                   
                   {pets.length === 0 && (
                     <div className="text-center py-8 bg-white border-2 border-dashed border-gray-200 rounded-xl">
                        <Dog className="mx-auto h-8 w-8 text-gray-300 mb-2"/>
                        <p className="text-sm text-gray-500">No hay mascotas registradas</p>
                     </div>
                   )}
                 </div>
              </div>
            </div>

            {/* MAIN CONTENT (Historial) */}
            <div className="lg:col-span-8 space-y-4">
               <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <History className="text-gray-400"/> Historial de Servicios
                  </h2>
               </div>

               <Card className="bg-white border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
                  {/* Filter Header */}
                  <div className="bg-gray-50/80 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                      {pet_id && activePetName ? (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">Filtrando por:</span>
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200 px-3 py-1 text-sm font-medium gap-2">
                               {activePetName}
                               <Link href={`/clients/${client.id}`} title="Quitar filtro">
                                 <XCircle size={14} className="hover:text-blue-900 cursor-pointer"/>
                               </Link>
                            </Badge>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Mostrando todas las mascotas</span>
                      )}
                      
                      <div className="text-xs font-medium text-gray-400">
                        {displayedAppointments.length} registro(s)
                      </div>
                  </div>

                  {/* Appointments List */}
                  {displayedAppointments.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {displayedAppointments.map((appt) => {
                         const apptDate = new Date(appt.date);
                         return (
                          <div key={appt.id} className="p-4 hover:bg-slate-50 transition-colors group">
                             <div className="flex gap-4 items-start">
                                
                                {/* Date Block */}
                                <div className="flex-shrink-0 w-16 bg-white border border-gray-200 rounded-lg text-center overflow-hidden shadow-sm">
                                   <div className="bg-blue-50 text-blue-700 text-[10px] font-bold uppercase py-1 border-b border-blue-100">
                                      {apptDate.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')}
                                   </div>
                                   <div className="py-2">
                                      <span className="text-xl font-bold text-gray-900 block leading-none">
                                        {apptDate.getDate()}
                                      </span>
                                      <span className="text-[10px] text-gray-400 block mt-1">
                                        {apptDate.getFullYear()}
                                      </span>
                                   </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pt-1">
                                   <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs bg-white text-gray-600 border-gray-200 font-normal">
                                          {appt.pet?.name || 'Mascota'}
                                        </Badge>
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                           <Clock size={12}/> {apptDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                      </div>
                                      <span className="font-mono font-semibold text-gray-900 bg-green-50 text-green-700 px-2 py-0.5 rounded text-sm">
                                         ${appt.price_charged?.toLocaleString() || 0}
                                      </span>
                                   </div>

                                   <h4 className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
                                      {appt.notes?.replace('ServicioCD:', '').split('. Staff:')[0] || "Servicio General"}
                                   </h4>
                                   
                                   {appt.secondary_services_text && (
                                     <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                       + {appt.secondary_services_text}
                                     </p>
                                   )}
                                </div>
                             </div>
                          </div>
                         );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                       <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                          <Calendar className="text-slate-300 w-8 h-8"/>
                       </div>
                       <h3 className="text-gray-900 font-medium mb-1">Sin historial disponible</h3>
                       <p className="text-sm text-gray-500 max-w-xs mx-auto">
                         {pet_id ? "Esta mascota no tiene citas registradas aún." : "Este cliente no tiene servicios previos."}
                       </p>
                       <div className="mt-6">
                         <NewAppointmentDialog 
                            initialClient={{ id: client.id, full_name: client.full_name, phone: client.phone }}
                            customTrigger={<Button variant="outline">Agendar Primera Cita</Button>}
                         />
                       </div>
                    </div>
                  )}
               </Card>
            </div>
            
          </div>
        </div>
      </div>
  );
}