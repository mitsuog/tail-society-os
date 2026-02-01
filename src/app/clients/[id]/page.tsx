import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { 
  ArrowLeft, FileText, Phone, MapPin, Mail, Clock, ShieldAlert, Plus, 
  Filter, XCircle, Cake, Weight, Cat, Dog, Calendar, Search, History
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import EditClientDialog from '@/components/EditClientDialog';
import { cn } from '@/lib/utils';

// --- INTERFACES ---
interface Pet {
  id: string;
  name: string;
  breed: string;
  species: string;
  gender: string;
  allergies: string | null;
  birth_date: string | null;
  weight?: string | null;
}

interface Appointment {
  id: string;
  date: string;
  notes: string | null;
  price_charged: number | null;
  secondary_services_text: string | null;
  pet_id: string;
  status: string;
}

// --- HELPER EDAD ---
function getAge(dateString: string | null) {
  if (!dateString) return "";
  const today = new Date();
  const birthDate = new Date(dateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age === 0 ? "Bebe" : `${age} años`;
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

  // CARGA DE DATOS
  const { data: client } = await supabase.from('clients').select('*').eq('id', id).single();
  if (!client) return <div className="p-4 text-center text-sm">Cliente no encontrado</div>;

  const { data: rawPets } = await supabase.from('pets').select('*').eq('client_id', id);
  const pets = rawPets as Pet[] | null;

  // CARGA DE CITAS
  let allAppointments: Appointment[] = [];
  const petIds = pets?.map(p => p.id) || [];
  
  if (petIds.length > 0) {
    const { data: appts } = await supabase
      .from('appointments')
      .select('*')
      .in('pet_id', petIds)
      .order('date', { ascending: false });
    
    if (appts) allAppointments = appts as Appointment[];
  }

  // FILTRADO
  let displayedAppointments = allAppointments;
  let activePetName = null;

  if (pet_id) {
    displayedAppointments = allAppointments.filter(a => a.pet_id === pet_id);
    activePetName = pets?.find(p => p.id === pet_id)?.name;
  }

  const getPetName = (pId: string) => pets?.find(p => p.id === pId)?.name || 'Mascota';

  // Antigüedad
  let clientSinceDate = new Date(client.created_at);
  if (allAppointments.length > 0) {
    const oldestDate = new Date(allAppointments[allAppointments.length - 1].date);
    if (oldestDate < clientSinceDate) clientSinceDate = oldestDate;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4 animate-in fade-in duration-300">
      
      {/* HEADER COMPACTO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100 rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-xl font-bold text-slate-900 leading-none">{client.full_name}</h1>
               <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal text-slate-500 bg-slate-100">
                  Desde {clientSinceDate.getFullYear()}
               </Badge>
            </div>
            <div className="flex items-center gap-3 text-slate-500 text-xs mt-1">
              <span className="flex items-center gap-1"><Phone size={12}/> {client.phone}</span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1"><Mail size={12}/> {client.email || "Sin email"}</span>
            </div>
          </div>
        </div>
        <EditClientDialog client={client} />
      </div>

      {/* GRID PRINCIPAL (Compacto) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* === SIDEBAR (Perfil y Filtros) - 3 Columnas === */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* NOTAS Y DIRECCIÓN (Si existen) */}
          {(client.address || client.notes) && (
            <div className="bg-white rounded-lg border border-slate-200 p-3 text-xs space-y-2 shadow-sm">
              {client.address && (
                 <div className="flex gap-2 text-slate-600">
                   <MapPin size={14} className="shrink-0 text-slate-400"/> {client.address}
                 </div>
              )}
              {client.notes && (
                 <div className="bg-amber-50 text-amber-900 p-2 rounded border border-amber-100">
                   <strong>Nota:</strong> {client.notes}
                 </div>
              )}
            </div>
          )}

          {/* LISTA DE MASCOTAS (Compacta) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mascotas ({pets?.length})</h3>
            </div>
            
            <div className="flex flex-col gap-2">
              {pets?.map(pet => {
                const isActive = pet_id === pet.id;
                return (
                  <Link key={pet.id} href={isActive ? `/clients/${client.id}` : `/clients/${client.id}?pet_id=${pet.id}`}>
                    <div className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer relative overflow-hidden group",
                      isActive 
                        ? "bg-blue-50 border-blue-500 shadow-sm" 
                        : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm"
                    )}>
                      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                      
                      <div className={cn("h-9 w-9 rounded-md flex items-center justify-center text-xs shrink-0", isActive ? "bg-white text-blue-600" : "bg-slate-100 text-slate-500")}>
                        {pet.species?.toLowerCase() === 'gato' ? <Cat size={18}/> : <Dog size={18}/>}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-center">
                          <p className={cn("text-sm font-bold truncate leading-none", isActive ? "text-blue-900" : "text-slate-700")}>{pet.name}</p>
                          {pet.allergies && <ShieldAlert size={12} className="text-red-500 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                           {pet.breed} • {pet.gender === 'Macho' ? 'M' : 'H'} {getAge(pet.birth_date) && `• ${getAge(pet.birth_date)}`}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
              
              <button className="flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 transition-colors">
                 <Plus size={14} /> Registrar Mascota
              </button>
            </div>
          </div>
        </div>


        {/* === CONTENIDO PRINCIPAL (Historial) - 9 Columnas === */}
        <div className="lg:col-span-9">
          <Card className="shadow-sm border-slate-200 h-full min-h-[500px] flex flex-col">
             
             {/* Header de Tabla */}
             <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-lg">
                <div className="flex items-center gap-2">
                   <History size={16} className="text-slate-400"/>
                   <span className="text-sm font-bold text-slate-700">Historial de Servicios</span>
                </div>
                
                {pet_id && activePetName ? (
                   <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                      <Filter size={10} /> {activePetName}
                      <Link href={`/clients/${client.id}`}><XCircle size={12} className="ml-1 cursor-pointer hover:text-blue-600"/></Link>
                   </div>
                ) : (
                   <span className="text-xs text-slate-400">Todo el historial</span>
                )}
             </div>

             {/* Lista Lineal (Estilo Tabla Compacta) */}
             <div className="flex-1 overflow-auto p-0">
               {displayedAppointments.length > 0 ? (
                 <div className="divide-y divide-slate-100">
                    {displayedAppointments.map((appt) => (
                      <div key={appt.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 hover:bg-slate-50 transition-colors group">
                        
                        {/* Fecha y Mascota */}
                        <div className="sm:w-[140px] shrink-0">
                           <div className="flex items-center gap-2 mb-0.5">
                              <Badge variant="outline" className="text-[10px] h-4 px-1 rounded-sm border-slate-300 text-slate-500 font-normal">
                                {getPetName(appt.pet_id)}
                              </Badge>
                           </div>
                           <p className="text-sm font-bold text-slate-700">
                             {new Date(appt.date).toLocaleDateString('es-MX', {day: 'numeric', month: 'short', year: '2-digit'})}
                           </p>
                           <p className="text-[10px] text-slate-400">
                             {new Date(appt.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </p>
                        </div>

                        {/* Descripción (Expandible) */}
                        <div className="flex-1 min-w-0">
                           <p className="text-xs sm:text-sm text-slate-700 font-medium truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                             {appt.notes?.replace('ServicioCD:', '').split('. Staff:')[0] || "Servicio General"}
                           </p>
                           {appt.secondary_services_text && (
                             <p className="text-[10px] text-slate-400 truncate mt-0.5">{appt.secondary_services_text}</p>
                           )}
                        </div>

                        {/* Precio */}
                        <div className="text-right sm:w-[80px] shrink-0">
                           <span className="text-sm font-bold text-green-700">${appt.price_charged || 0}</span>
                        </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <FileText size={32} className="opacity-20 mb-2"/>
                    <p className="text-sm">Sin registros</p>
                 </div>
               )}
             </div>
          </Card>
        </div>

      </div>
    </div>
  );
}