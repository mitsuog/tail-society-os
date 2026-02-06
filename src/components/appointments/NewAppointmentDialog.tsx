'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { 
  Loader2, CalendarPlus, Search, Check, Clock, User, Phone, Dog, 
  AlertTriangle, X, Scissors, Droplets, Sparkles, Box, ChevronsUpDown,
  ArrowRight, ArrowLeft, Plus
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { addMinutes } from 'date-fns';

// --- INTERFACES ---
interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  category: string;
  base_price: number;
  active: boolean;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  color: string;
}

interface Pet {
  id: string;
  name: string;
  breed: string;
  size: string;
}

interface Client {
  id: string;
  full_name: string;
  phone: string;
  pet_names?: string[]; 
}

interface PetSelection {
    startTime: string; 
    mainServiceId: string;
    employeeId: string;
    extras: { 
        tempId: number; 
        serviceId: string; 
        employeeId: string; 
    }[];
}

// --- UTILS DE ESTILO ---
const getCategoryInfo = (category: string = 'general') => {
    switch (category?.toLowerCase()) {
        case 'cut': return { label: 'Corte', icon: Scissors, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' };
        case 'bath': return { label: 'Baño', icon: Droplets, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' };
        case 'addon': return { label: 'Adicional', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
        default: return { label: 'General', icon: Box, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
    }
};

const isServiceCompatible = (serviceName: string, petSize: string) => {
    if (!petSize) return true;
    const sName = serviceName.toLowerCase();
    const pSize = petSize.toLowerCase();
    const keywordsExtra = ['extra', 'gigante', 'giant'];
    const keywordsGrande = ['grande', 'large', 'largo'];
    const keywordsMediano = ['mediano', 'medium', 'estandar'];
    const keywordsChico = ['chico', 'pequeño', 'small', 'mini', 'toy', 'puppy', 'cachorro'];

    const svcIsExtra = keywordsExtra.some(k => sName.includes(k));
    const svcIsGrande = !svcIsExtra && keywordsGrande.some(k => sName.includes(k));
    const svcIsMediano = keywordsMediano.some(k => sName.includes(k));
    const svcIsChico = keywordsChico.some(k => sName.includes(k));

    if (!svcIsExtra && !svcIsGrande && !svcIsMediano && !svcIsChico) return true;

    const petIsExtra = keywordsExtra.some(k => pSize.includes(k));
    const petIsGrande = !petIsExtra && keywordsGrande.some(k => pSize.includes(k));
    const petIsMediano = keywordsMediano.some(k => pSize.includes(k));
    const petIsChico = keywordsChico.some(k => pSize.includes(k));

    if (petIsExtra && svcIsExtra) return true;
    if (petIsGrande && svcIsGrande) return true;
    if (petIsMediano && svcIsMediano) return true;
    if (petIsChico && svcIsChico) return true;

    return false;
};

// --- SELECTOR DE SERVICIOS ---
function SearchableServiceSelect({ services, value, onChange, disabled, petSize, placeholder = "Seleccionar servicio..." }: any) {
    const [open, setOpen] = useState(false);
    const selected = services.find((s:any) => String(s.id) === String(value));
    const catInfo = getCategoryInfo(selected?.category);
    const Icon = catInfo.icon;

    const availableServices = useMemo(() => {
        return services.filter((s: Service) => {
            if (!s.active) return false; 
            return isServiceCompatible(s.name, petSize);
        });
    }, [services, petSize]);

    const groups = useMemo(() => {
        return {
            cut: availableServices.filter((s: Service) => s.category === 'cut'),
            bath: availableServices.filter((s: Service) => s.category === 'bath'),
            addon: availableServices.filter((s: Service) => s.category === 'addon'),
            general: availableServices.filter((s: Service) => !['cut', 'bath', 'addon'].includes(s.category))
        };
    }, [availableServices]);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className={cn("w-full justify-between h-9 bg-white font-normal px-3 text-left border-slate-200 shadow-sm transition-all", selected && !disabled && `border-l-4 ${catInfo.border.replace('border', 'border-l')}`)}>
                    <div className="flex items-center gap-2 truncate w-full">
                        {selected ? <Icon size={14} className={cn("shrink-0", catInfo.color)}/> : <Scissors size={14} className="text-slate-400"/>}
                        <div className="flex flex-col items-start truncate">
                            <span className="truncate text-xs font-medium text-slate-700">{selected ? selected.name : placeholder}</span>
                            {selected && <span className="text-[10px] text-slate-400 flex items-center gap-1">{selected.duration_minutes} min • ${selected.base_price}</span>}
                        </div>
                    </div>
                    {!disabled && <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 z-[9999]" align="start">
                <Command shouldFilter={false}> 
                    <CommandInput placeholder={`Buscar para ${petSize || 'todos'}...`} />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandEmpty>
                            <div className="py-2 text-center text-xs text-slate-500">No hay servicios disponibles para talla <strong>{petSize || 'General'}</strong></div>
                        </CommandEmpty>
                        {groups.cut.length > 0 && <CommandGroup heading="Cortes y Estilismo">{groups.cut.map((s: Service) => <ServiceItem key={s.id} service={s} currentId={value} onSelect={(id: string) => { onChange(id); setOpen(false); }} />)}</CommandGroup>}
                        {(groups.cut.length > 0 && groups.bath.length > 0) && <CommandSeparator />}
                        {groups.bath.length > 0 && <CommandGroup heading="Baños">{groups.bath.map((s: Service) => <ServiceItem key={s.id} service={s} currentId={value} onSelect={(id: string) => { onChange(id); setOpen(false); }} />)}</CommandGroup>}
                        {(groups.bath.length > 0 && groups.addon.length > 0) && <CommandSeparator />}
                        {groups.addon.length > 0 && <CommandGroup heading="Adicionales">{groups.addon.map((s: Service) => <ServiceItem key={s.id} service={s} currentId={value} onSelect={(id: string) => { onChange(id); setOpen(false); }} />)}</CommandGroup>}
                        {groups.general.length > 0 && <CommandGroup heading="Otros">{groups.general.map((s: Service) => <ServiceItem key={s.id} service={s} currentId={value} onSelect={(id: string) => { onChange(id); setOpen(false); }} />)}</CommandGroup>}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

function ServiceItem({ service, currentId, onSelect }: any) {
    return (
        <CommandItem value={service.name} onSelect={() => onSelect(service.id)} className="cursor-pointer">
            <Check className={cn("mr-2 h-4 w-4", String(currentId) === String(service.id) ? "opacity-100" : "opacity-0")} />
            <div className="flex flex-col">
                <span className="font-medium text-slate-700">{service.name}</span>
                <span className="text-[10px] text-slate-400">{service.duration_minutes} min • ${service.base_price}</span>
            </div>
        </CommandItem>
    )
}

function SearchableEmployeeSelect({ employees, value, onChange }: any) {
    const [open, setOpen] = useState(false);
    const selected = employees.find((e:any) => String(e.id) === String(value));
    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-9 bg-white font-normal px-3 text-left border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 truncate">
                        <div className="w-2 h-2 rounded-full border border-black/10" style={{backgroundColor: selected?.color || '#e2e8f0'}}></div>
                        <span className="truncate text-xs">{selected ? `${selected.first_name} ${selected.last_name || ''}` : "Automático"}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 z-[9999]" align="start">
                <Command>
                    <CommandInput placeholder="Buscar..." />
                    <CommandList>
                        <CommandEmpty>No encontrado.</CommandEmpty>
                        <CommandGroup>
                            {employees.map((emp:any) => (
                                <CommandItem key={emp.id} onSelect={() => { onChange(String(emp.id)); setOpen(false); }}>
                                    <div className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: emp.color}}></div>
                                    {emp.first_name} {emp.last_name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
    return (
        <div className="flex items-center w-full px-6 py-4 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center w-full">
                <div className="flex flex-col items-center relative z-10">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300", currentStep >= 1 ? "bg-slate-900 text-white shadow-md" : "bg-white border border-slate-200 text-slate-400")}>1</div>
                    <span className={cn("text-[10px] mt-1 font-medium absolute -bottom-4 w-20 text-center", currentStep >= 1 ? "text-slate-900" : "text-slate-400")}>Cliente</span>
                </div>
                <div className={cn("flex-1 h-[2px] mx-2 rounded-full transition-all duration-500", currentStep >= 2 ? "bg-slate-900" : "bg-slate-200")}></div>
                <div className="flex flex-col items-center relative z-10">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300", currentStep >= 2 ? "bg-slate-900 text-white shadow-md" : "bg-white border border-slate-200 text-slate-400")}>2</div>
                    <span className={cn("text-[10px] mt-1 font-medium absolute -bottom-4 w-20 text-center", currentStep >= 2 ? "text-slate-900" : "text-slate-400")}>Detalles</span>
                </div>
            </div>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---
export default function NewAppointmentDialog({ 
  onSuccess,
  initialClient,
  initialPetId,
  customTrigger,
  open: externalOpen, // RECIBIR ESTADO EXTERNO
  onOpenChange: externalOnOpenChange // RECIBIR SETTER EXTERNO
}: { 
  onSuccess?: () => void;
  initialClient?: { id: string, full_name: string, phone: string };
  initialPetId?: string;
  customTrigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const supabase = createClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // CONTROL HÍBRIDO (Props o Estado Interno)
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? externalOnOpenChange! : setInternalOpen;

  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Selection State
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedClientName, setSelectedClientName] = useState<string>(""); 
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [date, setDate] = useState<string>("");
  const [globalTime, setGlobalTime] = useState<string>("09:00");
  const [notes, setNotes] = useState<string>("");

  const [selections, setSelections] = useState<Record<string, PetSelection>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showClientResults, setShowClientResults] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        const { data: empData } = await supabase.from('employees').select('*').eq('active', true);
        if (empData) setEmployees(empData);

        const { data: svcData } = await supabase.from('services').select('*').eq('active', true).order('name');
        if (svcData) setServices(svcData);

        if (initialClient) {
            setSelectedClientId(initialClient.id);
            setSearchTerm(initialClient.full_name);
            if (initialPetId) {
                setSelectedPetIds([initialPetId]);
                if (!selections[initialPetId]) {
                    setSelections(prev => ({
                        ...prev,
                        [initialPetId]: { startTime: globalTime, mainServiceId: "", employeeId: "", extras: [] }
                    }));
                }
            }
        } else {
            // Reset
            setStep(1);
            setSelectedClientId("");
            setSearchTerm("");
            setPets([]);
            setSelectedPetIds([]);
            setSelections({});
            setGlobalTime("09:00");
            setDate("");
            setNotes("");
        }
      };
      fetchData();
    }
  }, [open, initialClient?.id, initialPetId]);

  // BUSQUEDA AVANZADA
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
        if (searchTerm.length >= 2 && !initialClient) {
            setIsSearching(true);
            setShowClientResults(true);
            const { data: clientsData } = await supabase.from('clients').select('id, full_name, phone').or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`).limit(20);
            const { data: petsData } = await supabase.from('pets').select('client_id, name').ilike('name', `%${searchTerm}%`).limit(20);

            let allClients: Client[] = [...(clientsData || [])].map(c => ({...c, pet_names: []}));
            if (petsData && petsData.length > 0) {
                const clientIdsFromPets = petsData.map(p => p.client_id);
                const { data: petOwners } = await supabase.from('clients').select('id, full_name, phone').in('id', clientIdsFromPets);
                if (petOwners) {
                    const ownersWithPetInfo = petOwners.map(owner => {
                        const matchedPets = petsData.filter(p => p.client_id === owner.id).map(p => p.name);
                        return { ...owner, pet_names: matchedPets };
                    });
                    allClients = [...allClients, ...ownersWithPetInfo];
                }
            }
            const uniqueClientsMap = new Map<string, Client>();
            allClients.forEach(c => {
                if(!uniqueClientsMap.has(c.id)) uniqueClientsMap.set(c.id, c);
                else {
                    const existing = uniqueClientsMap.get(c.id);
                    if (c.pet_names && c.pet_names.length > 0 && existing) existing.pet_names = c.pet_names;
                }
            });
            setClients(Array.from(uniqueClientsMap.values()));
            setIsSearching(false);
        } else {
            setClients([]);
            setShowClientResults(false);
        }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, initialClient]);

  useEffect(() => {
    if (selectedClientId) {
        const fetchPets = async () => {
            const { data } = await supabase.from('pets').select('*').eq('client_id', selectedClientId);
            if (data) setPets(data);
        };
        fetchPets();
    } else {
        setPets([]);
    }
  }, [selectedClientId]);

  const handleClientSelect = (client: Client) => {
      setSelectedClientId(client.id);
      setSearchTerm(client.full_name); 
      setShowClientResults(false); 
  };

  const handlePetToggle = (petId: string) => {
    setSelectedPetIds(prev => prev.includes(petId) ? prev.filter(id => id !== petId) : [...prev, petId]);
    if (!selections[petId]) {
        setSelections(prev => ({ ...prev, [petId]: { startTime: globalTime, mainServiceId: "", employeeId: "", extras: [] } }));
    }
  };

  const handleGlobalTimeChange = (newTime: string) => {
      setGlobalTime(newTime);
      setSelections(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(key => { updated[key].startTime = newTime; });
          return updated;
      });
  };

  const handlePetStartTimeChange = (petId: string, val: string) => {
      setSelections(prev => ({ ...prev, [petId]: { ...prev[petId], startTime: val } }));
  };
  const handleMainServiceChange = (petId: string, val: string) => {
      setSelections(prev => ({ ...prev, [petId]: { ...prev[petId], mainServiceId: val } }));
  };
  const handleMainEmployeeChange = (petId: string, val: string) => {
      setSelections(prev => ({ ...prev, [petId]: { ...prev[petId], employeeId: val } }));
  };
  const handleAddExtra = (petId: string) => {
      setSelections(prev => ({ ...prev, [petId]: { ...prev[petId], extras: [...(prev[petId]?.extras || []), { tempId: Math.random(), serviceId: "", employeeId: prev[petId]?.employeeId || "" }] } }));
  };
  const handleRemoveExtra = (petId: string, tempId: number) => {
      setSelections(prev => ({ ...prev, [petId]: { ...prev[petId], extras: prev[petId].extras.filter(e => e.tempId !== tempId) } }));
  };
  const handleExtraServiceChange = (petId: string, tempId: number, val: string) => {
      setSelections(prev => ({ ...prev, [petId]: { ...prev[petId], extras: prev[petId].extras.map(e => e.tempId === tempId ? { ...e, serviceId: val } : e) } }));
  };
  const handleExtraEmployeeChange = (petId: string, tempId: number, val: string) => {
      setSelections(prev => ({ ...prev, [petId]: { ...prev[petId], extras: prev[petId].extras.map(e => e.tempId === tempId ? { ...e, employeeId: val } : e) } }));
  };

  const handleSave = async () => {
    if (selectedPetIds.length === 0) return toast.error("Selecciona al menos una mascota");
    if (!date) return toast.error("Define la fecha");

    setLoading(true);
    try {
        for (const petId of selectedPetIds) {
            const config = selections[petId];
            if (!config?.mainServiceId) throw new Error("Falta seleccionar servicio principal para una mascota");
            if (!config?.startTime) throw new Error("Falta hora de inicio para una mascota");

            const baseDate = new Date(`${date}T${config.startTime}:00`); 
            const { data: appt, error: apptError } = await supabase.from('appointments').insert({
                client_id: selectedClientId,
                pet_id: petId,
                date: baseDate.toISOString(), 
                status: 'scheduled',
                notes: notes
            }).select().single();

            if (apptError) throw apptError;

            const mainSvc = services.find(s => s.id === config.mainServiceId);
            const mainDuration = mainSvc?.duration_minutes || 60;
            const mainEndTime = addMinutes(baseDate, mainDuration);

            await supabase.from('appointment_services').insert({
                appointment_id: appt.id,
                service_id: config.mainServiceId,
                employee_id: config.employeeId || null, 
                start_time: baseDate.toISOString(),
                end_time: mainEndTime.toISOString(),
                resource_type: 'table'
            });

            let currentStartTime = mainEndTime; 
            for (const extra of config.extras) {
                if (!extra.serviceId) continue;
                const extraSvc = services.find(s => s.id === extra.serviceId);
                const extraDuration = extraSvc?.duration_minutes || 30;
                const extraEndTime = addMinutes(currentStartTime, extraDuration);
                await supabase.from('appointment_services').insert({
                    appointment_id: appt.id,
                    service_id: extra.serviceId,
                    employee_id: extra.employeeId || null,
                    start_time: currentStartTime.toISOString(),
                    end_time: extraEndTime.toISOString(),
                    resource_type: 'table'
                });
                currentStartTime = extraEndTime;
            }
        }
        toast.success("Citas creadas exitosamente");
        setOpen(false);
        if (onSuccess) onSuccess(); 
    } catch (e: any) {
        toast.error(e.message || "Error al crear citas");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* SI ES CONTROLADO (DESDE SIDEBAR), NO RENDERIZAMOS EL TRIGGER POR DEFECTO.
         SI NO ES CONTROLADO (USO INDIVIDUAL), SE MUESTRA EL BOTÓN.
      */}
      {!isControlled && (
          <DialogTrigger asChild>
            {customTrigger ? customTrigger : (
                <Button className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-all hover:scale-[1.02]">
                    <CalendarPlus className="mr-2 h-4 w-4" /> Nueva Cita
                </Button>
            )}
          </DialogTrigger>
      )}
      
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-white gap-0 border-slate-200">
        <DialogHeader className="p-5 pb-0 bg-white">
            <DialogTitle className="text-xl font-bold text-slate-800">Agendar Cita</DialogTitle>
        </DialogHeader>

        <StepIndicator currentStep={step} />

        <div className="p-6 h-[450px] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
                <div className="space-y-2 relative">
                    <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><User size={12}/> Buscar Cliente</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Ej: Juan, Firulais, 811..." 
                            value={searchTerm}
                            disabled={!!initialClient} 
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                if (selectedClientId && !initialClient) { 
                                    setSelectedClientId("");
                                    setPets([]);
                                    setSelectedPetIds([]);
                                }
                            }}
                            className={cn("pl-9 h-10 border-slate-200 focus:ring-purple-500", selectedClientId && "border-purple-500 bg-purple-50 text-purple-900 font-medium")}
                        />
                        {selectedClientId && <div className="absolute right-3 top-3"><Check className="h-4 w-4 text-purple-600" /></div>}
                    </div>
                    {showClientResults && searchTerm.length >= 2 && !selectedClientId && (
                        <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 mt-1 max-h-48 overflow-y-auto">
                            {isSearching ? (
                                <div className="p-4 text-center text-xs text-slate-400"><Loader2 className="animate-spin h-4 w-4 mx-auto mb-1"/>Buscando...</div>
                            ) : clients.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400">No se encontraron clientes.</div>
                            ) : (
                                <div className="py-1">
                                    {clients.map(client => (
                                        <div key={client.id} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between group transition-colors" onClick={() => handleClientSelect(client)}>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm text-slate-700 group-hover:text-slate-900">{client.full_name}</span>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                    <span className="flex items-center gap-1"><Phone size={10}/> {client.phone}</span>
                                                    {client.pet_names && client.pet_names.length > 0 && <span className="flex items-center gap-1 text-purple-500 bg-purple-50 px-1 rounded"><Dog size={10}/> {client.pet_names.join(", ")}</span>}
                                                </div>
                                            </div>
                                            <ArrowRight size={14} className="text-slate-300 group-hover:text-purple-500 opacity-0 group-hover:opacity-100 transition-all"/>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {selectedClientId && (
                    <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300 delay-100">
                        <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Dog size={12}/> Seleccionar Mascotas</Label>
                        {pets.length === 0 ? (
                            <div className="p-6 border border-dashed rounded-xl text-center bg-slate-50">
                                <Dog className="h-8 w-8 text-slate-300 mx-auto mb-2 opacity-50"/>
                                <span className="text-sm text-slate-400 block">Este cliente no tiene mascotas registradas.</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {pets.map(pet => (
                                    <div key={pet.id} onClick={() => handlePetToggle(pet.id)} className={cn("cursor-pointer border rounded-xl p-3 flex items-center gap-3 transition-all relative overflow-hidden", selectedPetIds.includes(pet.id) ? "bg-white border-purple-500 shadow-md ring-1 ring-purple-100" : "bg-white border-slate-200 hover:border-purple-300 hover:bg-slate-50")}>
                                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors", selectedPetIds.includes(pet.id) ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-400")}><Dog size={18} /></div>
                                        <div className="flex flex-col min-w-0">
                                            <span className={cn("font-bold text-sm truncate", selectedPetIds.includes(pet.id) ? "text-slate-900" : "text-slate-600")}>{pet.name}</span>
                                            <div className="flex gap-1 items-center"><Badge variant="outline" className="text-[9px] h-4 px-1.5 text-slate-500 font-normal border-slate-300 bg-white">{pet.size}</Badge></div>
                                        </div>
                                        {selectedPetIds.includes(pet.id) && <div className="absolute top-0 right-0 bg-purple-500 text-white rounded-bl-lg p-1"><Check size={12}/></div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col h-full gap-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><CalendarPlus size={12}/> Fecha</Label>
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-sm border-slate-200 bg-white focus:ring-0"/>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Clock size={12}/> Hora Referencia</Label>
                        <Input type="time" value={globalTime} onChange={e => handleGlobalTimeChange(e.target.value)} className="h-9 text-sm border-slate-200 bg-white focus:ring-0"/>
                        <span className="text-[10px] text-slate-400">Actualiza todas las mascotas abajo</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Scissors size={12}/> Configurar Servicios</Label>
                    <div className="space-y-6">
                        {selectedPetIds.map(petId => {
                            const pet = pets.find(p => p.id === petId);
                            const config = selections[petId] || { mainServiceId: "", employeeId: "", extras: [], startTime: globalTime };
                            const selectedService = services.find(s => String(s.id) === String(config.mainServiceId));
                            const catInfo = getCategoryInfo(selectedService?.category);

                            return (
                                <div key={petId} className={cn("bg-white border rounded-xl p-4 shadow-sm relative overflow-hidden transition-all", selectedService ? `border-l-4 ${catInfo.border.replace('border', 'border-l')}` : "border-slate-200")}>
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                                        <div className="flex items-center gap-2">
                                            <Dog size={14} className="text-slate-400"/>
                                            <span className="font-bold text-sm text-slate-800">{pet?.name}</span>
                                            <span className="text-slate-300 mx-1">|</span>
                                            <Badge variant="outline" className="text-[9px] font-normal border-slate-200 text-slate-400">{pet?.size}</Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label className="text-[10px] text-slate-400 uppercase font-bold">Inicio:</Label>
                                            <Input type="time" value={config.startTime} onChange={(e) => handlePetStartTimeChange(petId, e.target.value)} className="h-7 w-24 text-xs"/>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] text-slate-400 uppercase font-bold">Servicio Principal</Label>
                                                <SearchableServiceSelect services={services} value={config.mainServiceId} petSize={pet?.size || ''} onChange={(val: string) => handleMainServiceChange(petId, val)} placeholder="Seleccionar Servicio Principal..."/>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] text-slate-400 uppercase font-bold">Encargado</Label>
                                                <SearchableEmployeeSelect employees={employees} value={config.employeeId} onChange={(val: string) => handleMainEmployeeChange(petId, val)}/>
                                            </div>
                                        </div>

                                        {config.extras && config.extras.length > 0 && (
                                            <div className="space-y-2 mt-2 pt-2 border-t border-dashed border-slate-100">
                                                <Label className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1"><Sparkles size={10}/> Adicionales</Label>
                                                {config.extras.map((extra) => (
                                                    <div key={extra.tempId} className="flex gap-2 items-center bg-slate-50 p-2 rounded-md">
                                                        <div className="flex-1"><SearchableServiceSelect services={services} value={extra.serviceId} petSize={pet?.size || ''} onChange={(val: string) => handleExtraServiceChange(petId, extra.tempId, val)} placeholder="Servicio extra..."/></div>
                                                        <div className="w-[140px]"><SearchableEmployeeSelect employees={employees} value={extra.employeeId} onChange={(val: string) => handleExtraEmployeeChange(petId, extra.tempId, val)}/></div>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => handleRemoveExtra(petId, extra.tempId)}><X size={14}/></Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <Button variant="outline" size="sm" className="w-full border-dashed text-slate-400 hover:text-purple-600 hover:border-purple-200 mt-2 h-8 text-xs" onClick={() => handleAddExtra(petId)}><Plus size={12} className="mr-1.5"/> Agregar Servicio Extra</Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="pt-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5"><AlertTriangle size={12}/> Notas Generales</Label>
                    <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: La dueña pagará al recoger..." className="bg-white border-slate-200 h-9 text-sm"/>
                </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex justify-between items-center">
            {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="text-slate-500 hover:text-slate-800"><ArrowLeft className="mr-2 h-3 w-3"/> Atrás</Button>
            ) : <div className="text-[10px] text-slate-400 italic">Paso 1 de 2</div>}

            {step < 2 ? (
                <Button className="ml-auto bg-slate-900 text-white hover:bg-slate-800" onClick={() => { if(selectedPetIds.length > 0) setStep(2); else toast.error("Por favor selecciona al menos una mascota"); }} disabled={selectedPetIds.length === 0}>Siguiente Paso <ArrowRight className="ml-2 h-4 w-4"/></Button>
            ) : (
                <Button onClick={handleSave} disabled={loading} className="bg-slate-900 text-white ml-auto min-w-[160px] hover:bg-slate-800 shadow-md">{loading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Check className="mr-2 h-4 w-4" />} Confirmar Citas</Button>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}