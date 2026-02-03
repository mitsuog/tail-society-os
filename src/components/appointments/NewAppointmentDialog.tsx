'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Loader2, CalendarPlus, Search, Check, Clock, User, Phone, Dog, 
  AlertTriangle, X, Plus, Scissors, Droplets, Sparkles, Box 
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { addMinutes, format, setMinutes } from 'date-fns';

// --- Interfaces ---
interface AppointmentConfig {
  serviceIds: string[];
  employeeId: string;
}

// --- UTILS ---
const generateTimeSlots = (startHour = 8, endHour = 20) => {
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
        const hourStr = h.toString().padStart(2, '0');
        slots.push(`${hourStr}:00`, `${hourStr}:15`, `${hourStr}:30`, `${hourStr}:45`);
    }
    return slots;
};

export default function NewAppointmentDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Data
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Selección
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientPets, setClientPets] = useState<any[]>([]);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  
  // Configuración
  const [configs, setConfigs] = useState<Record<string, AppointmentConfig>>({});
  
  // Globales
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");

  const router = useRouter();
  const supabase = createClient();
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // 1. Cargar Datos
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        const [clientsRes, servicesRes, employeesRes] = await Promise.all([
          supabase.from('clients').select('*').order('full_name'),
          supabase.from('services').select('*').order('name'),
          supabase.from('employees').select('*').eq('active', true).order('first_name')
        ]);

        if (clientsRes.data) setClients(clientsRes.data);
        
        // Deduplicación de servicios
        if (servicesRes.data) {
            const uniqueServices = Array.from(
                new Map(servicesRes.data.map(s => [s.name, s])).values()
            );
            setServices(uniqueServices);
        }

        if (employeesRes.data) setEmployees(employeesRes.data);
        
        setDate(new Date().toISOString().split('T')[0]);
        const now = new Date();
        const minutes = Math.ceil(now.getMinutes() / 15) * 15;
        const rounded = setMinutes(now, minutes);
        setTime(format(rounded, 'HH:mm'));
      };
      fetchData();
    } else {
      setTimeout(() => {
        setStep(1); setSelectedClient(null); setSelectedPetIds([]); setConfigs({}); setNotes("");
      }, 300);
    }
  }, [open]);

  // 2. Helpers
  const handleClientSelect = async (client: any) => {
    setSelectedClient(client);
    setLoading(true);
    const { data } = await supabase.from('pets').select('*').eq('client_id', client.id);
    if (data) setClientPets(data);
    setLoading(false);
    setStep(2);
  };

  const togglePetSelection = (petId: string) => {
    setSelectedPetIds(prev => {
      if (prev.includes(petId)) {
        const newIds = prev.filter(id => id !== petId);
        const newConfigs = { ...configs };
        delete newConfigs[petId];
        setConfigs(newConfigs);
        return newIds;
      } else {
        setConfigs(prevConf => ({ ...prevConf, [petId]: { serviceIds: [], employeeId: "" } }));
        return [...prev, petId];
      }
    });
  };

  const toggleServiceForPet = (petId: string, serviceId: string) => {
      setConfigs(prev => {
          const currentServices = prev[petId]?.serviceIds || [];
          let newServices = currentServices.includes(serviceId) 
            ? currentServices.filter(id => id !== serviceId)
            : [...currentServices, serviceId];
          return { ...prev, [petId]: { ...prev[petId], serviceIds: newServices } };
      });
  };

  const updatePetEmployee = (petId: string, employeeId: string) => {
    setConfigs(prev => ({ ...prev, [petId]: { ...prev[petId], employeeId } }));
  };

  // 3. Filtrado por Talla
  const getCompatibleServices = (petId: string) => {
      const pet = clientPets.find(p => p.id === petId);
      if (!pet || !pet.size) return services;

      const size = pet.size.toLowerCase();
      const isPetChico = size.includes('chico') || size.includes('puppy') || size.includes('mini');
      const isPetExtra = size.includes('extra') || size.includes('gigante');
      const isPetMediano = size.includes('mediano');
      const isPetGrande = size.includes('grande') && !isPetExtra;

      return services.filter(svc => {
          const name = svc.name.toLowerCase();
          const isSvcChico = name.includes('chico') || name.includes('puppy');
          const isSvcExtra = name.includes('extra') || name.includes('gigante');
          const isSvcMediano = name.includes('mediano');
          const isSvcGrande = name.includes('grande') && !isSvcExtra;
          
          if (!isSvcChico && !isSvcMediano && !isSvcGrande && !isSvcExtra) return true;
          
          if (isPetChico && isSvcChico) return true;
          if (isPetMediano && isSvcMediano) return true;
          if (isPetGrande && isSvcGrande) return true;
          if (isPetExtra && isSvcExtra) return true;
          
          return false; 
      });
  };

  // 4. Guardar (CORREGIDO: Sin campo de precio)
  const handleSave = async () => {
    if (selectedPetIds.length === 0) return toast.error("Selecciona al menos una mascota");
    for (const petId of selectedPetIds) {
      if (!configs[petId]?.serviceIds || configs[petId].serviceIds.length === 0) {
        const pet = clientPets.find(p => p.id === petId);
        return toast.error(`Falta seleccionar servicio para ${pet?.name}`);
      }
    }

    setLoading(true);
    try {
      const servicesToInsert = [];
      
      for (const petId of selectedPetIds) {
        const config = configs[petId];
        
        // 1. Crear Cita Padre
        const { data: apptData, error: apptError } = await supabase
          .from('appointments')
          .insert({ 
            client_id: selectedClient.id, 
            pet_id: petId, 
            date, 
            notes, 
            status: 'confirmed' 
          })
          .select().single();

        if (apptError) throw apptError;

        let currentStartTime = new Date(`${date}T${time}:00`);
        
        // 2. Crear Servicios
        for (const svcId of config.serviceIds) {
            const svcInfo = services.find(s => s.id === svcId);
            const duration = svcInfo?.duration_minutes || 30;
            // OMITIMOS EL PRECIO: La tabla appointment_services no tiene esa columna
            const endTime = addMinutes(currentStartTime, duration);

            servicesToInsert.push({
                appointment_id: apptData.id,
                service_id: svcId,
                employee_id: config.employeeId || null,
                start_time: currentStartTime.toISOString(),
                end_time: endTime.toISOString(),
                resource_type: 'table'
                // NOTA: Si en el futuro agregas la columna base_price a appointment_services, descomenta esto:
                // base_price: svcInfo?.base_price || 0 
            });
            currentStartTime = endTime;
        }
      }
      
      const { error: servicesError } = await supabase.from('appointment_services').insert(servicesToInsert);
      if (servicesError) throw servicesError;

      toast.success(`${selectedPetIds.length} Mascotas agendadas`);
      setOpen(false);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (category: string) => {
    switch(category) {
      case 'cut': return <Scissors className="w-3 h-3"/>;
      case 'bath': return <Droplets className="w-3 h-3"/>;
      case 'addon': return <Sparkles className="w-3 h-3"/>;
      default: return <Box className="w-3 h-3"/>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all hover:scale-105">
          <CalendarPlus className="mr-2 h-4 w-4" /> Agendar Cita
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-slate-50 gap-0 h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-purple-600"/> Nueva Cita
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-4">
            <div className={cn("h-1.5 flex-1 rounded-full transition-all", step >= 1 ? "bg-purple-600" : "bg-slate-200")}></div>
            <div className={cn("h-1.5 flex-1 rounded-full transition-all", step >= 2 ? "bg-purple-600" : "bg-slate-200")}></div>
            <div className={cn("h-1.5 flex-1 rounded-full transition-all", step >= 3 ? "bg-purple-600" : "bg-slate-200")}></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* PASO 1: CLIENTE */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-slate-800">¿Quién nos visita hoy?</h3>
                <p className="text-sm text-slate-500">Busca por nombre o teléfono.</p>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <Command className="rounded-lg border-0 shadow-none">
                  <CommandInput placeholder="Buscar cliente..." className="h-11" autoFocus/>
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>No encontrado.</CommandEmpty>
                    <CommandGroup>
                      {clients.map(client => (
                        <CommandItem key={client.id} onSelect={() => handleClientSelect(client)} className="cursor-pointer py-3 aria-selected:bg-purple-50">
                          <User className="mr-3 h-4 w-4 text-slate-400" />
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800">{client.full_name}</span>
                            <span className="text-xs text-slate-400">{client.phone || 'Sin teléfono'}</span>
                          </div>
                          <Check className={cn("ml-auto h-4 w-4 text-purple-600", selectedClient?.id === client.id ? "opacity-100" : "opacity-0")} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            </div>
          )}

          {/* PASO 2: MASCOTAS */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-slate-800">Selecciona las mascotas</h3>
                    <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-slate-400">Cambiar</Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {clientPets.length === 0 ? (
                        <div className="col-span-2 py-8 text-center bg-white border border-dashed rounded-xl text-slate-500">Sin mascotas registradas.</div>
                    ) : clientPets.map(pet => {
                        const isSelected = selectedPetIds.includes(pet.id);
                        return (
                            <div 
                                key={pet.id} 
                                onClick={() => togglePetSelection(pet.id)}
                                className={cn(
                                    "cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-4 bg-white",
                                    isSelected ? "border-purple-500 bg-purple-50/50 shadow-md" : "border-transparent shadow-sm hover:border-slate-200"
                                )}
                            >
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isSelected ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-400")}>
                                    <Dog size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">{pet.name}</h4>
                                    <p className="text-xs text-slate-500">{pet.breed} • {pet.size || 'ND'}</p>
                                </div>
                                {isSelected && <Check className="ml-auto text-purple-600" size={16} />}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-4 flex justify-end">
                    <Button disabled={selectedPetIds.length === 0} onClick={() => setStep(3)} className="bg-purple-600 text-white">Continuar ({selectedPetIds.length})</Button>
                </div>
            </div>
          )}

          {/* PASO 3: DETALLES */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* FECHA Y HORA */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Fecha</Label>
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="font-medium h-9"/>
                    </div>
                    <div>
                        <Label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Hora de Llegada</Label>
                        <Select value={time} onValueChange={setTime}>
                            <SelectTrigger className="h-9 font-medium">
                                <SelectValue placeholder="Seleccionar hora" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px] overflow-y-auto" position="popper" sideOffset={5}>
                                {timeSlots.map(slot => (
                                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* CONFIGURACIÓN POR MASCOTA */}
                <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase mb-3 block px-1">Servicios por Mascota</Label>
                    <div className="space-y-4">
                        {selectedPetIds.map((petId, index) => {
                            const pet = clientPets.find(p => p.id === petId);
                            const config = configs[petId] || { serviceIds: [] };
                            const compatibleServices = getCompatibleServices(petId); 
                            
                            return (
                                <div key={petId} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">{index + 1}</div>
                                        <span className="font-bold text-sm text-slate-800">{pet?.name}</span>
                                        <Badge variant="secondary" className="text-[10px]">{pet?.breed}</Badge>
                                        <span className="ml-auto text-[10px] text-slate-400 uppercase font-bold tracking-wider">{pet?.size}</span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {/* SERVICIOS */}
                                        <div>
                                            <Label className="text-[10px] text-slate-400 uppercase font-bold mb-1.5 block">Servicios</Label>
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {config.serviceIds?.map(svcId => {
                                                    const svc = services.find(s => s.id === svcId);
                                                    return (
                                                        <Badge key={svcId} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 pr-1 gap-1 flex items-center">
                                                            {getServiceIcon(svc?.category)}
                                                            {svc?.name}
                                                            <button onClick={() => toggleServiceForPet(petId, svcId)} className="hover:bg-purple-200 rounded-full p-0.5 ml-1">
                                                                <X size={10} />
                                                            </button>
                                                        </Badge>
                                                    );
                                                })}
                                                
                                                <Popover modal={true}>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-6 text-xs border-dashed text-slate-500 hover:text-purple-600 hover:border-purple-300">
                                                            <Plus size={12} className="mr-1"/> Agregar
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[300px] p-0" align="start">
                                                        <Command>
                                                            <CommandInput placeholder="Buscar servicio..." />
                                                            <CommandList>
                                                                <CommandEmpty>No encontrado.</CommandEmpty>
                                                                <CommandGroup heading="Sugeridos para su talla">
                                                                    {compatibleServices.map(svc => {
                                                                        const isSelected = config.serviceIds?.includes(svc.id);
                                                                        return (
                                                                            <CommandItem key={svc.id} onSelect={() => toggleServiceForPet(petId, svc.id)} className="text-xs cursor-pointer">
                                                                                <div className={cn("mr-2 flex h-3 w-3 items-center justify-center rounded border border-slate-400", isSelected ? "bg-purple-600 border-purple-600 text-white" : "opacity-50")}>
                                                                                    {isSelected && <Check className="h-2.5 w-2.5" />}
                                                                                </div>
                                                                                <div className="flex-1 flex items-center gap-2">
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                                                    <span>{svc.name}</span>
                                                                                    <span className="ml-auto text-[10px] opacity-50">{svc.duration_minutes}m</span>
                                                                                </div>
                                                                            </CommandItem>
                                                                        );
                                                                    })}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>

                                        {/* EMPLEADO */}
                                        <div>
                                            <Label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">Encargado (Opcional)</Label>
                                            <Select value={config.employeeId} onValueChange={(val) => updatePetEmployee(petId, val)}>
                                                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                                                    <SelectValue placeholder="Sin asignar" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                                                    {employees.map(emp => (
                                                        <SelectItem key={emp.id} value={emp.id} className="text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full" style={{backgroundColor: emp.color}}></div>
                                                                {emp.first_name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="pt-2 pb-6">
                    <Label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Notas Generales</Label>
                    <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: La dueña pagará al recoger..." className="bg-white border-slate-200 h-9 text-sm"/>
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex justify-between">
            {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>Atrás</Button>
            )}
            {step < 3 ? (
                <Button className="ml-auto" variant="ghost" disabled>Paso {step} de 3</Button>
            ) : (
                <Button onClick={handleSave} disabled={loading} className="bg-slate-900 text-white ml-auto min-w-[150px]">
                    {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Check className="mr-2 h-4 w-4" />}
                    Confirmar Citas
                </Button>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}