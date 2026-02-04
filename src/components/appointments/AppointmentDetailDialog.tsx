'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format, parseISO, addMinutes, differenceInMinutes, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from "sonner";
import { 
  User, Phone, Calendar, Clock, Scissors, Droplets, Sparkles, Box, 
  Check, X, Trash2, Save, Loader2, Plus, ChevronsUpDown, AlertTriangle, History,
  Ruler, MessageCircle, Copy, PhoneCall, ExternalLink
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// --- INTERFACES ---
interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  category: string;
  base_price: number;
  active: boolean; 
}

interface AppointmentDetailDialogProps {
  appointment: any | null;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  employees: any[];
  onUpdate: () => void | Promise<void>;
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

const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
        if(dateString.includes('T')) return dateString.split('T')[0];
        const d = new Date(dateString);
        if(!isValid(d)) return "";
        return d.toISOString().split('T')[0];
    } catch (e) {
        return "";
    }
};

// --- LÓGICA DE FILTRADO POR TALLA ---
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

// --- COMPONENTE DE CONTACTO RÁPIDO ---
function ClientContactPopover({ client }: { client: any }) {
    const rawPhone = client?.phone || "";
    const cleanPhone = rawPhone.replace(/\D/g, ''); 

    const handleCopy = () => {
        if(rawPhone) {
            navigator.clipboard.writeText(rawPhone);
            toast.success("Teléfono copiado");
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-auto py-1 px-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors group">
                    <div className="flex items-center gap-2 text-left">
                        <div className="bg-slate-100 p-1.5 rounded-full group-hover:bg-white transition-colors">
                            <User size={14} className="text-slate-500"/> 
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium leading-none">{client?.full_name || 'Cliente Desconocido'}</span>
                            <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                                <Phone size={10}/> {rawPhone || 'Sin teléfono registrado'}
                            </span>
                        </div>
                        <ChevronsUpDown size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1"/>
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2 shadow-xl border-slate-200" align="start">
                <div className="grid gap-1">
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                        Contacto Rápido
                    </div>
                    {rawPhone ? (
                        <>
                            <a href={`tel:${rawPhone}`} className="flex items-center gap-3 p-2.5 rounded-md hover:bg-slate-50 text-sm text-slate-700 transition-colors w-full group">
                                <div className="bg-green-100 p-2 rounded-full text-green-600 group-hover:bg-green-200 group-hover:text-green-700 transition-colors"><PhoneCall size={16}/></div>
                                <div className="flex flex-col">
                                    <span className="font-medium">Llamar</span>
                                    <span className="text-[10px] text-slate-400">Vía telefónica</span>
                                </div>
                            </a>
                            <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2.5 rounded-md hover:bg-slate-50 text-sm text-slate-700 transition-colors w-full group">
                                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 group-hover:bg-emerald-200 group-hover:text-emerald-700 transition-colors"><MessageCircle size={16}/></div>
                                <div className="flex flex-col">
                                    <span className="font-medium">WhatsApp</span>
                                    <span className="text-[10px] text-slate-400">Abrir chat directo</span>
                                </div>
                                <ExternalLink size={12} className="ml-auto text-slate-300"/>
                            </a>
                            <button onClick={handleCopy} className="flex items-center gap-3 p-2.5 rounded-md hover:bg-slate-50 text-sm text-slate-700 transition-colors w-full text-left group">
                                <div className="bg-slate-100 p-2 rounded-full text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-600 transition-colors"><Copy size={16}/></div>
                                <div className="flex flex-col">
                                    <span className="font-medium">Copiar Número</span>
                                    <span className="text-[10px] text-slate-400">{rawPhone}</span>
                                </div>
                            </button>
                        </>
                    ) : (
                        <div className="p-4 text-center border border-dashed rounded-md bg-slate-50">
                            <span className="text-xs text-slate-400 italic block">No hay número telefónico registrado para este cliente.</span>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

// --- COMPONENTE SELECTOR DE SERVICIOS ---
function SearchableServiceSelect({ services, value, onChange, disabled, petSize }: any) {
    const [open, setOpen] = useState(false);
    const selected = services.find((s:any) => String(s.id) === String(value));
    const catInfo = getCategoryInfo(selected?.category);
    const Icon = catInfo.icon;

    const availableServices = useMemo(() => {
        return services.filter((s: Service) => {
            const isActive = s.active === true;
            if (!isActive) return false; 
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
                <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className={cn("w-full justify-between h-10 bg-white font-normal px-3 text-left border-slate-200 shadow-sm", selected && !disabled && `border-l-4 ${catInfo.border.replace('border', 'border-l')}`)}>
                    <div className="flex items-center gap-2 truncate w-full">
                        {selected ? <Icon size={16} className={cn("shrink-0", catInfo.color)}/> : <Scissors size={16} className="text-slate-400"/>}
                        <div className="flex flex-col items-start truncate">
                            <span className="truncate text-sm font-medium text-slate-700">
                                {selected ? selected.name : "Seleccionar servicio..."}
                            </span>
                            {selected && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    {selected.duration_minutes} min • ${selected.base_price}
                                    {!selected.active && <span className="text-red-500 font-bold ml-1 bg-red-50 px-1 rounded border border-red-100 flex items-center gap-0.5"><AlertTriangle size={8}/> INACTIVO</span>}
                                    {selected.active && !isServiceCompatible(selected.name, petSize) && <span className="text-amber-500 font-bold ml-1 bg-amber-50 px-1 rounded border border-amber-100 text-[9px]">Talla Incompatible</span>}
                                </span>
                            )}
                        </div>
                    </div>
                    {!disabled && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0 z-[9999]" align="start">
                <Command>
                    <CommandInput placeholder={`Buscar para ${petSize || 'todos'}...`} />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandEmpty>
                            <div className="py-2 text-center text-xs text-slate-500">
                                No se encontraron servicios activos <br/> para talla <strong>{petSize || 'General'}</strong>
                            </div>
                        </CommandEmpty>
                        
                        {selected && !availableServices.find((s:Service) => s.id === selected.id) && (
                            <CommandGroup heading="Selección Actual (No disponible)">
                                <CommandItem value={selected.name} onSelect={() => setOpen(false)} className="opacity-70 bg-slate-50 cursor-not-allowed">
                                    <Check className="mr-2 h-4 w-4 opacity-100" />
                                    <div className="flex flex-col">
                                        <span className="line-through text-slate-500">{selected.name}</span>
                                        <span className="text-[10px] text-red-500 font-bold">
                                            {!selected.active ? "Servicio Inactivo" : "Talla Incorrecta"}
                                        </span>
                                    </div>
                                </CommandItem>
                            </CommandGroup>
                        )}

                        {groups.cut.length > 0 && (
                            <CommandGroup heading="Cortes y Estilismo">
                                {groups.cut.map((s: Service) => (
                                    <ServiceItem key={s.id} service={s} currentId={value} onSelect={(id: string) => { onChange(id); setOpen(false); }} />
                                ))}
                            </CommandGroup>
                        )}
                        
                        {(groups.cut.length > 0 && groups.bath.length > 0) && <CommandSeparator />}

                        {groups.bath.length > 0 && (
                            <CommandGroup heading="Baños">
                                {groups.bath.map((s: Service) => (
                                    <ServiceItem key={s.id} service={s} currentId={value} onSelect={(id: string) => { onChange(id); setOpen(false); }} />
                                ))}
                            </CommandGroup>
                        )}

                        {(groups.bath.length > 0 && groups.addon.length > 0) && <CommandSeparator />}

                        {groups.addon.length > 0 && (
                            <CommandGroup heading="Adicionales">
                                {groups.addon.map((s: Service) => (
                                    <ServiceItem key={s.id} service={s} currentId={value} onSelect={(id: string) => { onChange(id); setOpen(false); }} />
                                ))}
                            </CommandGroup>
                        )}

                        {groups.general.length > 0 && (
                            <CommandGroup heading="Otros">
                                {groups.general.map((s: Service) => (
                                    <ServiceItem key={s.id} service={s} currentId={value} onSelect={(id: string) => { onChange(id); setOpen(false); }} />
                                ))}
                            </CommandGroup>
                        )}
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

function SearchableEmployeeSelect({ employees, value, onChange, disabled }: any) {
    const [open, setOpen] = useState(false);
    const selected = employees.find((e:any) => String(e.id) === String(value));
    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="w-full justify-between h-10 bg-white font-normal px-3 text-left border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 truncate">
                        <div className="w-2.5 h-2.5 rounded-full border border-black/10" style={{backgroundColor: selected?.color || '#e2e8f0'}}></div>
                        <span className="truncate text-sm">{selected ? `${selected.first_name} ${selected.last_name || ''}` : "Sin asignar"}</span>
                    </div>
                    {!disabled && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0 z-[9999]" align="start">
                <Command>
                    <CommandInput placeholder="Buscar empleado..." />
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

// --- FORMULARIO PRINCIPAL ---
function AppointmentForm({ appointment, employees, onUpdate, onClose, servicesList }: any) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    
    // Estados de datos
    const [date, setDate] = useState("");
    const [notes, setNotes] = useState("");
    const [mainService, setMainService] = useState<any>({
        serviceId: "",
        employeeId: "",
        startTime: "",
        endTime: "",
        duration: 0
    });
    const [extraServices, setExtraServices] = useState<any[]>([]);
    const [petHistory, setPetHistory] = useState<any[]>([]);
    const [initialExtraIds, setInitialExtraIds] = useState<string[]>([]);
    
    // Datos completos cargados (cliente, mascota)
    const [fullData, setFullData] = useState<any>(null);

    useEffect(() => {
        if (!appointment) return;
        setInitializing(true);
        const pId = appointment.appointment_id || appointment.appointment?.id || appointment.id;
        
        const load = async () => {
            // 1. Cargar Cita + MASCOTA + CLIENTE
            const { data: parent, error } = await supabase.from('appointments')
                .select(`*, pet:pets(size, name, breed), client:clients(*)`)
                .eq('id', pId)
                .single();
                
            if(parent) {
                setFullData(parent);
                setDate(formatDateForInput(parent.date));
                setNotes(parent.notes || "");
                
                // --- CARGA DE HISTORIAL HÍBRIDO (Legacy + Nuevo) ---
                const { data: hist } = await supabase.from('appointments')
                    .select(`
                        date, 
                        notes, 
                        appointment_services ( services ( name ) )
                    `)
                    .eq('pet_id', parent.pet_id)
                    .neq('id', pId)
                    .order('date', {ascending:false})
                    .limit(5);
                
                if(hist) {
                    const formattedHist = hist.map((h:any) => {
                        // 1. Intentar sacar servicios nuevos
                        let names = h.appointment_services?.map((item: any) => item.services?.name).filter(Boolean) || [];
                        
                        // 2. Si no hay nuevos, intentar parsear LEGACY de las notas
                        if (names.length === 0 && h.notes && h.notes.startsWith('ServicioCD:')) {
                            const match = h.notes.match(/ServicioCD:\s*(.*?)(?:\.\s*Perfume|$)/i);
                            if (match && match[1]) {
                                names = [match[1].trim()];
                            }
                        }
                        
                        return { date: h.date, services: names };
                    });
                    setPetHistory(formattedHist);
                }
            }

            // 2. Cargar Servicios de la cita actual
            const { data: servicesData } = await supabase.from('appointment_services')
                .select(`id, start_time, end_time, service_id, employee_id, services(name, duration_minutes, category, base_price, active)`)
                .eq('appointment_id', pId)
                .order('start_time', {ascending: true});

            if (servicesData && servicesData.length > 0) {
                const main = servicesData[0];
                // AQUÍ ESTÁ EL CAMBIO CLAVE PARA LA HORA:
                // Usamos parseISO + format para respetar la zona horaria del usuario.
                const startT = format(parseISO(main.start_time), 'HH:mm');
                const endT = format(parseISO(main.end_time), 'HH:mm');
                const dur = differenceInMinutes(parseISO(main.end_time), parseISO(main.start_time));
                
                setMainService({
                    id: main.id,
                    serviceId: String(main.service_id),
                    employeeId: main.employee_id ? String(main.employee_id) : "",
                    startTime: startT, 
                    endTime: endT, 
                    duration: dur
                });

                const extras = servicesData.slice(1).map((ext: any) => ({
                    id: ext.id,
                    tempId: Math.random(),
                    serviceId: String(ext.service_id),
                    employeeId: ext.employee_id ? String(ext.employee_id) : "",
                    startTime: format(parseISO(ext.start_time), 'HH:mm'), // También corregido aquí
                    endTime: format(parseISO(ext.end_time), 'HH:mm'),     // Y aquí
                    duration: differenceInMinutes(parseISO(ext.end_time), parseISO(ext.start_time))
                }));
                setExtraServices(extras);
                setInitialExtraIds(extras.map((e: any) => e.id));
            }
            setInitializing(false);
        };
        load();
    }, [appointment]);

    const calculateEndTime = (start: string, duration: number) => {
        if (!start) return "00:00";
        const [h, m] = start.split(':').map(Number);
        const d = new Date(); d.setHours(h, m, 0, 0);
        return format(addMinutes(d, duration), 'HH:mm');
    };

    const formatForDB = (dateStr: string, timeStr: string) => {
        if (!dateStr || !timeStr) return null;
        // Al crear un Date con string simple "YYYY-MM-DDTHH:mm:00" (sin Z), 
        // el navegador asume hora local, lo cual es correcto porque el input es hora local.
        const d = new Date(`${dateStr}T${timeStr}:00`);
        return d.toISOString();
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const pId = appointment.appointment_id || appointment.appointment?.id || appointment.id;
            await supabase.from('appointments').update({ date, notes }).eq('id', pId);

            const mainStartISO = formatForDB(date, mainService.startTime);
            const mainEndISO = formatForDB(date, mainService.endTime);

            await supabase.from('appointment_services').update({
                service_id: mainService.serviceId,
                employee_id: mainService.employeeId || null,
                start_time: mainStartISO,
                end_time: mainEndISO
            }).eq('id', mainService.id);

            const currentExtraIds = extraServices.map(e => e.id).filter(Boolean);
            const toDeleteIds = initialExtraIds.filter(id => !currentExtraIds.includes(id));
            
            if (toDeleteIds.length > 0) {
                await supabase.from('appointment_services').delete().in('id', toDeleteIds);
            }

            for(const extra of extraServices) {
                const extraStartISO = formatForDB(date, extra.startTime);
                const extraEndISO = formatForDB(date, extra.endTime);

                const payload = {
                    appointment_id: pId,
                    service_id: extra.serviceId,
                    employee_id: extra.employeeId || null,
                    start_time: extraStartISO,
                    end_time: extraEndISO,
                    resource_type: 'table'
                };
                
                if(extra.id) await supabase.from('appointment_services').update(payload).eq('id', extra.id);
                else await supabase.from('appointment_services').insert(payload);
            }

            toast.success("Cita actualizada");
            await onUpdate();
            onClose(); 
        } catch (e:any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if(!confirm("¿Eliminar cita completa?")) return;
        setLoading(true);
        try {
            const pId = appointment.appointment_id || appointment.appointment?.id || appointment.id;
            await supabase.from('appointment_services').delete().eq('appointment_id', pId);
            await supabase.from('appointments').delete().eq('id', pId);
            toast.success("Cita eliminada");
            await onUpdate();
            onClose();
        } catch (e: any) {
            toast.error(e.message);
            setLoading(false);
        }
    };

    // Usamos los datos frescos (fullData) si existen, si no, usamos los props iniciales (appointment)
    const pet = fullData?.pet || appointment.appointment?.pet;
    const client = fullData?.client || appointment.appointment?.client;
    const petSize = pet?.size || '';
    const mainSvcCat = getCategoryInfo(servicesList.find((s: Service) => String(s.id) === String(mainService.serviceId))?.category);

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 overflow-hidden">
            {/* HEADER INTEGRADO EN EL RENDER INICIAL */}
            <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-white shrink-0 flex flex-row items-start justify-between space-y-0 text-left">
                <div className="flex flex-col gap-1 w-full">
                    <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        {pet?.name || 'Mascota'}
                        <div className="flex gap-1.5">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 font-medium">
                                {pet?.breed}
                            </Badge>
                            {pet?.size && (
                                <Badge variant="outline" className="text-slate-500 border-slate-300 font-normal uppercase text-[10px] tracking-wide flex items-center gap-1">
                                    <Ruler size={10}/> {pet.size}
                                </Badge>
                            )}
                        </div>
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                        <ClientContactPopover client={client} />
                    </DialogDescription>
                </div>
            </DialogHeader>

            <Tabs defaultValue="details" className="flex flex-col h-full w-full overflow-hidden">
                <div className="px-6 pt-2 pb-0 shrink-0 bg-slate-50/50">
                    <TabsList className="w-full grid grid-cols-2 mb-2 bg-slate-100 p-1">
                        <TabsTrigger value="details" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Detalles</TabsTrigger>
                        <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Historial</TabsTrigger>
                    </TabsList>
                </div>
                
                <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="p-6 pt-2 pb-6">
                        <TabsContent value="details" className="space-y-6 mt-0 focus-visible:outline-none">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Calendar size={12}/> Fecha</Label>
                                    <Input type="date" value={date || ""} onChange={e=>setDate(e.target.value)} disabled={!isEditing} className="bg-white h-10 border-slate-200"/>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><AlertTriangle size={12}/> Notas</Label>
                                    <Input value={notes || ""} onChange={e=>setNotes(e.target.value)} disabled={!isEditing} placeholder="Sin notas..." className="bg-white h-10 border-slate-200"/>
                                </div>
                            </div>

                            {/* SERVICIOS */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                        {mainSvcCat.icon && <mainSvcCat.icon size={12} className={mainSvcCat.color} />} 
                                        Servicio Principal
                                    </Label>
                                    {!isEditing && (
                                        <Button size="sm" variant="link" className="h-auto p-0 text-purple-600 font-semibold" onClick={() => setIsEditing(true)}>
                                            Editar Cita
                                        </Button>
                                    )}
                                </div>
                                <div className={cn("bg-white border rounded-xl p-4 shadow-sm transition-all relative overflow-hidden", isEditing ? "border-purple-200 ring-1 ring-purple-100" : "border-slate-200")}>
                                    <div className={cn("absolute top-0 left-0 w-1 h-full", mainSvcCat.bg.replace('bg-', 'bg-').replace('50', '500'))}></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                                Servicio <Badge variant="outline" className="text-[9px] font-normal border-slate-200 text-slate-400 px-1 py-0 h-4">{petSize || 'Talla?'}</Badge>
                                            </Label>
                                            <SearchableServiceSelect 
                                                services={servicesList} 
                                                value={mainService.serviceId} 
                                                petSize={petSize}
                                                onChange={(v:any) => {
                                                    const svc = servicesList.find((s:any) => String(s.id) === String(v));
                                                    setMainService({...mainService, serviceId:v, duration: svc?.duration_minutes || 30, endTime: calculateEndTime(mainService.startTime, svc?.duration_minutes || 30)})
                                                }} 
                                                disabled={!isEditing} 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Encargado</Label>
                                            <SearchableEmployeeSelect employees={employees} value={mainService.employeeId} onChange={(v:any) => setMainService({...mainService, employeeId:v})} disabled={!isEditing} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1"><Clock size={10}/> Entrada</Label>
                                            <Input type="time" value={mainService.startTime || ""} onChange={e => setMainService({...mainService, startTime: e.target.value, endTime: calculateEndTime(e.target.value, mainService.duration)})} disabled={!isEditing} className="h-9"/>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Salida (Est.)</Label>
                                            <Input type="time" value={mainService.endTime || ""} disabled className="h-9 bg-slate-50 text-slate-500 border-slate-100"/>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {extraServices.length > 0 && (
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Sparkles size={12}/> Adicionales</Label>
                                    {extraServices.map((extra, i) => (
                                        <div key={extra.tempId} className="bg-white border border-slate-200 border-dashed rounded-xl p-3 relative group">
                                            {isEditing && (
                                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50" onClick={() => setExtraServices(prev => prev.filter(e => e.tempId !== extra.tempId))}>
                                                    <X size={14}/>
                                                </Button>
                                            )}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                                                <SearchableServiceSelect 
                                                    services={servicesList} 
                                                    value={extra.serviceId} 
                                                    petSize={petSize}
                                                    onChange={(v:string) => {
                                                        const svc = servicesList.find((s:any) => String(s.id) === String(v));
                                                        setExtraServices(prev => prev.map(e => e.tempId === extra.tempId ? {...e, serviceId: v, duration: svc?.duration_minutes || 30, endTime: calculateEndTime(e.startTime, svc?.duration_minutes||30)} : e));
                                                    }} 
                                                    disabled={!isEditing} 
                                                />
                                                <SearchableEmployeeSelect employees={employees} value={extra.employeeId} onChange={(v:string) => setExtraServices(prev => prev.map(e => e.tempId === extra.tempId ? {...e, employeeId: v} : e))} disabled={!isEditing} />
                                                <Input type="time" value={extra.startTime || ""} onChange={e => setExtraServices(prev => prev.map(ex => ex.tempId === extra.tempId ? {...ex, startTime: e.target.value, endTime: calculateEndTime(e.target.value, ex.duration)} : ex))} disabled={!isEditing} className="h-8 text-xs"/>
                                                <Input type="time" value={extra.endTime || ""} disabled className="h-8 text-xs bg-slate-50"/>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {isEditing && (
                                <Button variant="outline" size="sm" className="w-full border-dashed text-slate-500 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50" onClick={() => {
                                    const lastTime = extraServices.length > 0 ? extraServices[extraServices.length-1].endTime : mainService.endTime;
                                    setExtraServices([...extraServices, { tempId: Math.random(), serviceId: "", employeeId: mainService.employeeId, startTime: lastTime, endTime: calculateEndTime(lastTime, 30), duration: 30 }]);
                                }}>
                                    <Plus size={14} className="mr-2"/> Agregar Servicio Adicional
                                </Button>
                            )}
                        </TabsContent>

                        <TabsContent value="history" className="mt-0 h-full">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[300px]">
                                {petHistory.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                                        <History size={32} className="mb-2 opacity-20"/>
                                        <span className="text-sm">No hay citas previas registradas</span>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {petHistory.map((h, i) => (
                                            <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex gap-4">
                                                <div className="flex flex-col items-center justify-center bg-slate-100 rounded-lg w-12 h-12 shrink-0 text-slate-600">
                                                    <span className="text-[10px] font-bold uppercase">{h.date ? format(parseISO(h.date), 'MMM', {locale: es}) : '-'}</span>
                                                    <span className="text-lg font-bold leading-none">{h.date ? format(parseISO(h.date), 'dd') : '-'}</span>
                                                </div>
                                                <div className="flex-1 min-w-0 py-0.5">
                                                    <div className="text-sm font-medium text-slate-800 mb-1">Servicios Realizados</div>
                                                    {h.services && h.services.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {h.services.map((svcName: string, idx: number) => (
                                                                <Badge key={idx} variant="secondary" className="text-[10px] font-normal bg-purple-50 text-purple-700 border-purple-100">
                                                                    {svcName}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Sin detalle de servicios</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </div>
                </div>
                
                {isEditing && (
                    <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                        <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleDelete}>
                            <Trash2 size={16} className="mr-2"/> Eliminar Cita
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white min-w-[120px]">
                                {loading ? <Loader2 className="animate-spin"/> : <Save size={16} className="mr-2"/>} 
                                Guardar
                            </Button>
                        </div>
                    </div>
                )}
            </Tabs>
        </div>
    );
}

// ============================================================================
// COMPONENTE PRINCIPAL (Wrapper)
// ============================================================================
export default function AppointmentDetailDialog({ 
  appointment, open, onOpenChange, employees, onUpdate 
}: AppointmentDetailDialogProps) {
  const supabase = createClient();
  const [servicesList, setServicesList] = useState<Service[]>([]);

  useEffect(() => {
    if (open) {
      const fetchServices = async () => {
        const { data } = await supabase
            .from('services')
            .select('id, name, duration_minutes, category, base_price, active') 
            .order('name');
            
        if (data) {
            setServicesList(data as Service[]);
        }
      };
      fetchServices();
    }
  }, [open]);

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] h-[85vh] flex flex-col p-0 overflow-hidden bg-white gap-0">
        <AppointmentForm 
            key={appointment.id} 
            appointment={appointment} 
            employees={employees} 
            onUpdate={onUpdate}
            onClose={() => onOpenChange(false)}
            servicesList={servicesList}
        />
      </DialogContent>
    </Dialog>
  );
}