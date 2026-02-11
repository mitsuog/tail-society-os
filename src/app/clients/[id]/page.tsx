import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { 
  Phone, MapPin, Mail, Clock, 
  Filter, XCircle, History, FileSignature, FileText, CalendarPlus, AlertCircle, Pencil, Eye, Dog, Calendar
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

export const dynamic = 'force-dynamic';

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
  const { id } = await params;
  const { pet_id } = await searchParams;
  const supabase = await createClient();

  const { data: rawClient } = await supabase.from('clients').select('*').eq('id', id).single();
  
  if (!rawClient) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-gray-600 gap-4 p-4">
            <p className="text-lg">Cliente no encontrado</p>
            <Link href="/admin/clients"><Button variant="outline">Volver al Directorio</Button></Link>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/30 to-white pt-20 md:pt-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      
        {/* HEADER */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <BackButton />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                {client.full_name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <Badge variant="secondary" className="text-xs h-5 px-2 font-normal text-gray-700 bg-gray-100 border-gray-300">
                  Cliente desde {clientSinceDate.getFullYear()}
                </Badge>
                
                {allSigned ? (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-300 gap-1 text-xs h-5">
                    <FileSignature size={10}/> Contrato Vigente
                  </Badge>
                ) : someSigned ? (
                  <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 gap-1 text-xs h-5">
                    <AlertCircle size={10}/> Firma Parcial
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50 gap-1 text-xs h-5">
                    <FileText size={10}/> Sin Firma
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs sm:text-sm text-gray-700">
            <span className="flex items-center gap-1.5">
              <Phone size={14} className="text-gray-500"/> {client.phone}
            </span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span className="flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-none">
              <Mail size={14} className="text-gray-500"/> {client.email || "Sin email"}
            </span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-gray-500"/> Monterrey, NL
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <NewAppointmentDialog 
              initialClient={{ id: client.id, full_name: client.full_name, phone: client.phone }}
              customTrigger={
                <Button className="bg-blue-600 text-white hover:bg-blue-700 h-9 text-sm w-full sm:w-auto justify-center shadow-sm">
                  <CalendarPlus className="mr-2 h-4 w-4"/> Nueva Cita
                </Button>
              }
            />
            
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-300 flex-1 sm:flex-initial">
                <SignatureLinkButton clientId={client.id} isSigned={allSigned} />
                {hasPets && (
                  <Link href={`/waiver/${client.id}?mode=view`} target="_blank" className="flex-1 sm:flex-initial">
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-700 hover:text-blue-700 hover:bg-white px-3 border-l border-gray-300 rounded-l-none w-full sm:w-auto" title="Ver Documento">
                      <Eye size={14} className="sm:mr-1.5"/> <span className="sm:inline">Ver</span>
                    </Button>
                  </Link>
                )}
              </div>
              
              <AddPetDialog clientId={client.id} />
              
              <EditClientDialog 
                client={client} 
                trigger={
                  <Button variant="outline" size="sm" className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-blue-400 h-9 w-9 sm:w-auto px-2 sm:px-3">
                    <Pencil size={14} className="sm:mr-0"/>
                  </Button>
                }
              />
            </div>
          </div>
        </div>

        {/* CONTENIDO - SIN RESTRICCIONES DE HEIGHT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
          
          {/* SIDEBAR */}
          <div className="lg:col-span-3 space-y-4">
            
            {(client.notes || client.internal_tags.length > 0) && (
              <Card className="p-3 text-xs space-y-2 border-gray-200 bg-white shadow-md">
                {client.internal_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {client.internal_tags.map((tag: string) => (
                      <span key={tag} className="text-[10px] font-bold bg-orange-50 text-orange-700 px-2 py-1 rounded border border-orange-200 flex items-center gap-1 capitalize">
                        <Filter size={10}/> {tag.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
                {client.notes && (
                  <div className="bg-gray-50 text-gray-700 p-2.5 rounded border border-gray-200 leading-relaxed italic text-xs">
                    {client.notes}
                  </div>
                )}
              </Card>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                  <Dog size={14} className="text-gray-500"/> Mascotas ({pets.length})
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                {pets.map(pet => (
                  <PetCard 
                    key={pet.id} 
                    pet={pet} 
                    clientId={client.id}
                    isActive={pet_id === pet.id}
                  />
                ))}
                
                {pets.length === 0 && (
                  <Card className="p-6 text-center border-dashed border-gray-300 bg-gray-50">
                    <p className="text-xs text-gray-500">Sin mascotas registradas</p>
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* HISTORIAL - SIN MIN-HEIGHT FIJO */}
          <div className="lg:col-span-9">
            <Card className="border-gray-200 bg-white shadow-md overflow-hidden">
              
              <div className="p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-teal-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-gray-600"/>
                  <span className="text-sm font-bold text-gray-800">Historial de Servicios</span>
                </div>
                
                {pet_id && activePetName ? (
                  <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-300">
                    <Filter size={12}/> 
                    <span className="hidden sm:inline">Filtrado por:</span>
                    <strong>{activePetName}</strong>
                    <Link href={`/clients/${client.id}`} title="Ver todos">
                      <XCircle size={14} className="ml-1 cursor-pointer hover:text-red-600 transition-colors"/>
                    </Link>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">Historial completo</span>
                )}
              </div>

              {/* LISTA SCROLLEABLE SIN RESTRICCIONES */}
              <div className="max-h-[600px] overflow-y-auto">
                {displayedAppointments.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {displayedAppointments.map((appt) => (
                      <div key={appt.id} className="p-3 sm:p-4 hover:bg-blue-50/30 transition-colors group">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          
                          <div className="sm:w-[160px] shrink-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge variant="outline" className="text-[10px] h-5 px-2 rounded border-gray-300 text-gray-700 font-medium bg-white">
                                {appt.pet?.name || 'Mascota'}
                              </Badge>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <p className="text-sm sm:text-base font-bold text-gray-900">
                                {new Date(appt.date).toLocaleDateString('es-MX', {
                                  day: 'numeric', 
                                  month: 'short', 
                                  year: '2-digit'
                                })}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock size={10}/> {new Date(appt.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 font-medium line-clamp-2 sm:line-clamp-1 group-hover:line-clamp-none transition-all">
                              {appt.notes?.replace('ServicioCD:', '').split('. Staff:')[0] || "Servicio General"}
                            </p>
                            {appt.secondary_services_text && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1 group-hover:line-clamp-none">
                                {appt.secondary_services_text}
                              </p>
                            )}
                          </div>

                          <div className="text-left sm:text-right sm:w-[100px] shrink-0 sm:border-l border-transparent sm:border-gray-200 sm:pl-4">
                            <span className="text-base sm:text-lg font-bold text-green-700">
                              ${appt.price_charged?.toLocaleString() || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 p-4">
                    <div className="bg-blue-50 p-4 rounded-full mb-3">
                      <Calendar size={32} className="text-blue-400 opacity-50"/>
                    </div>
                    <p className="text-sm font-medium text-gray-600">Sin registros de servicios</p>
                    {pet_id && <p className="text-xs mt-1 text-center text-gray-500">Para esta mascota en particular</p>}
                  </div>
                )}
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}