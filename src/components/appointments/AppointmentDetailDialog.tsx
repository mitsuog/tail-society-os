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
  Ruler, MessageCircle, Copy, PhoneCall, 
  CheckCircle2, PlayCircle, StopCircle, AlertCircle as AlertCircleIcon
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// --- ESTATUS ---
const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Agendada', icon: Calendar, color: 'text-slate-600', bg: 'bg-slate-100' },
  { value: 'confirmed', label: 'Confirmada', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'checked_in', label: 'En Recepción', icon: User, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { value: 'in_progress', label: 'En Proceso', icon: PlayCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  { value: 'completed', label: 'Completada', icon: StopCircle, color: 'text-green-600', bg: 'bg-green-50' },
  { value: 'cancelled', label: 'Cancelada', icon: X, color: 'text-red-600', bg: 'bg-red-50' },
  { value: 'no_show', label: 'No Asistió', icon: AlertCircleIcon, color: 'text-red-800', bg: 'bg-red-50' },
];

const READ_ONLY_STATUSES = ['completed', 'cancelled', 'no_show'];

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

// --- UTILS ---
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
    } catch (e) { return ""; }
};

const isServiceCompatible = (serviceName: string, petSize: string) => {
    if (!petSize) return true;
    const sName = serviceName.toLowerCase();
    const pSize = petSize.toLowerCase();
    const keywordsExtra = ['extra', 'gigante', 'giant'];
    const keywordsGrande = ['grande', 'large', 'largo'];
    const keywordsMediano = ['mediano', 'medium', 'estandar'];
    const keywordsChico = ['chico', 'pequeño', 'small', 'mini', 'toy', 'puppy', 'cachorro'];

    const check = (list: string[], text: string) => list.some(k => text.includes(k));

    const svcSize = {
        extra: check(keywordsExtra, sName),
        grande: check(keywordsGrande, sName),
        mediano: check(keywordsMediano, sName),
        chico: check(keywordsChico, sName)
    };
    
    if (!svcSize.extra && !svcSize.grande && !svcSize.mediano && !svcSize.chico) return true;

    const petSz = {
        extra: check(keywordsExtra, pSize),
        grande: check(keywordsGrande, pSize),
        mediano: check(keywordsMediano, pSize),
        chico: check(keywordsChico, pSize)
    };

    if (petSz.extra && svcSize.extra) return true;
    if (petSz.grande && svcSize.grande) return true;
    if (petSz.mediano && svcSize.mediano) return true;
    if (petSz.chico && svcSize.chico) return true;

    return false;
};

// --- COMPONENTES UI ---
function ClientContactPopover({ client }: { client: any }) {
    const rawPhone = client?.phone || "";
    const cleanPhone = rawPhone.replace(/\D/g, ''); 
    const handleCopy = () => {
        if(rawPhone) { navigator.clipboard.writeText(rawPhone); toast.success("Copiado"); }
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
                            <span className="text-sm font-medium leading-none truncate max-w-[150px]">{client?.full_name || 'Cliente'}</span>
                            <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                                <Phone size={10}/> {rawPhone || 'N/A'}
                            </span>
                        </div>
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 z-[9999]" align="start">
                {rawPhone ? (
                    <div className="grid gap-1">
                        <a href={`tel:${rawPhone}`} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 text-sm"><PhoneCall size={14}/> Llamar</a>
                        <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 text-sm"><MessageCircle size={14}/> WhatsApp</a>
                        <button onClick={handleCopy} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 text-sm w-full text-left"><Copy size={14}/> Copiar</button>
                    </div>
                ) : <div className="text-xs text-center text-slate-400 p-2">Sin teléfono</div>}
            </PopoverContent>
        </Popover>
    );
}

function SearchableServiceSelect({ services, value, onChange, disabled, petSize }: any) {
    const [open, setOpen] = useState(false);
    const selected = services.find((s:any) => String(s.id) === String(value));
    const catInfo = getCategoryInfo(selected?.category);
    const Icon = catInfo.icon;

    const availableServices = useMemo(() => {
        return services.filter((s: Service) => s.active && isServiceCompatible(s.name, petSize));
    }, [services, petSize]);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} 
                    className={cn("w-full justify-between h-9 text-xs bg-white font-normal px-3 border-slate-200", selected && !disabled && `border-l-4 ${catInfo.border.replace('border', 'border-l')}`)}>
                    <div className="flex items-center gap-2 truncate w-full">
                        {selected ? <Icon size={14} className={cn("shrink-0", catInfo.color)}/> : <Scissors size={14} className="text-slate-400"/>}
                        <span className="truncate">{selected ? selected.name : "Seleccionar servicio..."}</span>
                    </div>
                    {!disabled && <ChevronsUpDown className="ml-2 h-3 w-3 opacity-50" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 z-[9999]" align="start">
                <Command>
                    <CommandInput placeholder="Buscar servicio..." />
                    <CommandList>
                        <CommandEmpty>No encontrado.</CommandEmpty>
                        <CommandGroup>
                            {availableServices.map((s:any) => (
                                <CommandItem key={s.id} value={s.name} onSelect={() => { onChange(s.id); setOpen(false); }}>
                                    <Check className={cn("mr-2 h-4 w-4", value === s.id ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{s.name}</span>
                                        <span className="text-[10px] text-slate-400">${s.base_price} • {s.duration_minutes}m</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

function SearchableEmployeeSelect({ employees, value, onChange, disabled }: any) {
    const [open, setOpen] = useState(false);
    const selected = employees.find((e:any) => String(e.id) === String(value));
    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="w-full justify-between h-9 text-xs bg-white font-normal px-3 border-slate-200">
                    <div className="flex items-center gap-2 truncate">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: selected?.color || '#e2e8f0'}}></div>
                        <span className="truncate">{selected ? `${selected.first_name}` : "Sin asignar"}</span>
                    </div>
                    {!disabled && <ChevronsUpDown className="ml-2 h-3 w-3 opacity-50" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 z-[9999]" align="start">
                <Command>
                    <CommandInput placeholder="Buscar..." />
                    <CommandList>
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

    const [status, setStatus] = useState(""); 
    const [date, setDate] = useState("");
    const [notes, setNotes] = useState("");
    
    // GESTIÓN DE SERVICIOS
    const [mainService, setMainService] = useState<any>({
        serviceId: "", employeeId: "", startTime: "", endTime: "", duration: 0
    });
    const [extraServices, setExtraServices] = useState<any[]>([]);
    const [initialExtraIds, setInitialExtraIds] = useState<string[]>([]);
    
    const [petHistory, setPetHistory] = useState<any[]>([]);
    const [fullData, setFullData] = useState<any>(null);

    const isReadOnly = READ_ONLY_STATUSES.includes(status);

    useEffect(() => {
        if (!appointment) return;
        setInitializing(true);
        const pId = appointment.appointment_id || appointment.appointment?.id || appointment.id;

        const load = async () => {
            // 1. Cargar Cita + Mascota + Cliente
            const { data: parent } = await supabase.from('appointments')
                .select(`*, pet:pets(size, name, breed), client:clients(*)`)
                .eq('id', pId)
                .single();

            if(parent) {
                setFullData(parent);
                setStatus(parent.status || 'scheduled'); 
                setDate(formatDateForInput(parent.date));
                setNotes(parent.notes || "");

                // --- CARGA DE HISTORIAL HÍBRIDO ---
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
                        let names = h.appointment_services?.map((item: any) => item.services?.name).filter(Boolean) || [];
                        if (names.length === 0 && h.notes && h.notes.startsWith('ServicioCD:')) {
                            const match = h.notes.match(/ServicioCD:\s*(.*?)(?:\.\s*Perfume|$)/i);
                            if (match && match[1]) names = [match[1].trim()];
                        }
                        return { date: h.date, services: names };
                    });
                    setPetHistory(formattedHist);
                }
            }

            // 2. Cargar Servicios Actuales
            const { data: servicesData } = await supabase.from('appointment_services')
                .select(`id, start_time, end_time, service_id, employee_id`)
                .eq('appointment_id', pId)
                .order('start_time', {ascending: true});

            if (servicesData && servicesData.length > 0) {
                const main = servicesData[0];
                const startT = format(parseISO(main.start_time), 'HH:mm');
                const endT = format(parseISO(main.end_time), 'HH:mm');
                const dur = differenceInMinutes(parseISO(main.end_time), parseISO(main.start_time));
                
                setMainService({
                    id: main.id,
                    serviceId: String(main.service_id),
                    employeeId: main.employee_id ? String(main.employee_id) : "",
                    startTime: startT, endTime: endT, duration: dur
                });

                const extras = servicesData.slice(1).map((ext: any) => ({
                    id: ext.id,
                    tempId: Math.random(),
                    serviceId: String(ext.service_id),
                    employeeId: ext.employee_id ? String(ext.employee_id) : "",
                    startTime: format(parseISO(ext.start_time), 'HH:mm'),
                    endTime: format(parseISO(ext.end_time), 'HH:mm'),
                    duration: differenceInMinutes(parseISO(ext.end_time), parseISO(ext.start_time))
                }));
                setExtraServices(extras);
                setInitialExtraIds(extras.map((e:any) => e.id));
            }
            setInitializing(false);
        };
        load();
    }, [appointment, supabase]);

    const calculateEndTime = (start: string, duration: number) => {
        if (!start) return "00:00";
        const [h, m] = start.split(':').map(Number);
        const d = new Date(); d.setHours(h, m, 0, 0);
        return format(addMinutes(d, duration), 'HH:mm');
    };

    const formatForDB = (dateStr: string, timeStr: string) => {
        if (!dateStr || !timeStr) return null;
        return new Date(`${dateStr}T${timeStr}:00`).toISOString();
    };

    const handleSave = async () => {
        if (isReadOnly) return;
        setLoading(true);
        try {
            const pId = fullData.id;
            await supabase.from('appointments').update({ date, notes }).eq('id', pId);

            if (mainService.serviceId) {
                const mainStartISO = formatForDB(date, mainService.startTime);
                const mainEndISO = formatForDB(date, mainService.endTime);
                
                const mainPayload = {
                    appointment_id: pId,
                    service_id: mainService.serviceId,
                    employee_id: mainService.employeeId || null,
                    start_time: mainStartISO,
                    end_time: mainEndISO,
                    resource_type: 'table'
                };

                if (mainService.id) {
                    await supabase.from('appointment_services').update(mainPayload).eq('id', mainService.id);
                } else {
                    const { data: newMain } = await supabase.from('appointment_services').insert(mainPayload).select('id').single();
                    if(newMain) setMainService((prev: any) => ({...prev, id: newMain.id}));
                }
            }

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

            toast.success("Cambios guardados");
            await onUpdate();
            onClose(); 
        } catch (e:any) {
            toast.error("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if(!confirm("¿Eliminar cita completa?")) return;
        setLoading(true);
        try {
            await supabase.from('appointment_services').delete().eq('appointment_id', fullData.id);
            await supabase.from('appointments').delete().eq('id', fullData.id);
            toast.success("Cita eliminada");
            await onUpdate();
            onClose();
        } catch (e: any) {
            toast.error(e.message);
            setLoading(false);
        }
    };

    const handleStatusChange = async (val: string) => {
        setLoading(true);
        const { error } = await supabase.from('appointments').update({ status: val }).eq('id', fullData.id);
        if(!error) {
            setStatus(val);
            toast.success("Estatus actualizado");
            if(onUpdate) onUpdate();
        }
        setLoading(false);
    };

    if (initializing || !fullData) return (
        <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
            <DialogTitle className="sr-only">Cargando</DialogTitle>
            <DialogDescription className="sr-only">Espere...</DialogDescription>
            <Loader2 className="animate-spin" size={32}/>
        </div>
    );

    const statusInfo = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    const pet = fullData.pet;
    const client = fullData.client;
    const petSize = pet?.size;

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 overflow-hidden">
            {/* HEADER MEJORADO PARA MÓVIL */}
            <DialogHeader className="px-4 py-4 md:px-6 md:py-5 border-b border-slate-100 bg-white shrink-0">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mr-8 md:mr-0">
                    <div className="space-y-1">
                        <DialogTitle className="text-xl md:text-2xl font-bold text-slate-900 flex flex-wrap items-center gap-2">
                            {pet?.name}
                            <div className="flex items-center gap-1.5 mt-1 md:mt-0">
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 font-medium">
                                    {pet?.breed}
                                </Badge>
                                {pet?.size && (
                                    <Badge variant="outline" className="text-slate-500 border-slate-300 font-normal uppercase text-[10px] tracking-wide flex items-center gap-1">
                                        <Ruler size={10}/> {pet.size}
                                    </Badge>
                                )}
                            </div>
                        </DialogTitle>
                        <DialogDescription className="flex items-center gap-4 text-sm text-slate-500">
                            <ClientContactPopover client={client} />
                        </DialogDescription>
                    </div>

                    <div className="w-full md:w-auto mt-2 md:mt-0">
                        <Select value={status} onValueChange={handleStatusChange} disabled={loading}>
                            <SelectTrigger className={cn("w-full md:w-[180px] h-9 text-xs font-bold border-slate-200 shadow-sm", statusInfo.bg, statusInfo.color)}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                {STATUS_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                        <div className="flex items-center gap-2"><opt.icon size={12} className={opt.color}/> {opt.label}</div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </DialogHeader>

            <Tabs defaultValue="details" className="flex flex-col h-full w-full overflow-hidden">
                <div className="px-4 md:px-6 pt-2 pb-0 shrink-0 bg-slate-50/50">
                    <TabsList className="w-full grid grid-cols-2 mb-2 bg-slate-100 p-1">
                        <TabsTrigger value="details">Detalles</TabsTrigger>
                        <TabsTrigger value="history">Historial</TabsTrigger>
                    </TabsList>
                </div>
                
                <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="p-4 md:p-6 pt-2 pb-20">
                        {/* TAB: DETALLES */}
                        <TabsContent value="details" className="space-y-6 mt-0 focus-visible:outline-none">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Calendar size={12}/> Fecha</Label>
                                    <Input type="date" value={date || ""} onChange={e=>setDate(e.target.value)} disabled={isReadOnly} className="bg-white h-10 border-slate-200"/>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><AlertTriangle size={12}/> Notas</Label>
                                    <Input value={notes || ""} onChange={e=>setNotes(e.target.value)} disabled={isReadOnly} placeholder="Sin notas..." className="bg-white h-10 border-slate-200"/>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Scissors size={12}/> Servicio Principal</Label>
                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Tipo de Servicio</Label>
                                            <SearchableServiceSelect 
                                                services={servicesList} 
                                                value={mainService.serviceId} 
                                                petSize={petSize}
                                                onChange={(v:any) => {
                                                    const svc = servicesList.find((s:any) => String(s.id) === String(v));
                                                    setMainService((prev: any) => ({...prev, serviceId:v, duration: svc?.duration_minutes || 30, endTime: calculateEndTime(prev.startTime, svc?.duration_minutes || 30)}))
                                                }} 
                                                disabled={isReadOnly} 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Encargado</Label>
                                            <SearchableEmployeeSelect employees={employees} value={mainService.employeeId} onChange={(v:any) => setMainService((prev: any) => ({...prev, employeeId:v}))} disabled={isReadOnly} />
                                        </div>
                                        <div className="space-y-1.5 col-span-1 md:col-span-2">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1"><Clock size={10}/> Horario</Label>
                                            <div className="flex items-center gap-2">
                                                <Input type="time" value={mainService.startTime || ""} onChange={e => setMainService((prev: any) => ({...prev, startTime: e.target.value, endTime: calculateEndTime(e.target.value, prev.duration)}))} disabled={isReadOnly} className="h-9 w-full md:w-32"/>
                                                <span className="text-slate-300">-</span>
                                                <Input type="time" value={mainService.endTime || ""} disabled className="h-9 bg-slate-50 text-slate-500 w-full md:w-32"/>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {extraServices.length > 0 && (
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Sparkles size={12}/> Adicionales</Label>
                                    {extraServices.map((extra) => (
                                        <div key={extra.tempId} className="bg-white border border-slate-200 border-dashed rounded-xl p-3 relative group">
                                            {!isReadOnly && (
                                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50" onClick={() => setExtraServices((prev: any[]) => prev.filter(e => e.tempId !== extra.tempId))}>
                                                    <X size={14}/>
                                                </Button>
                                            )}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                                                <SearchableServiceSelect 
                                                    services={servicesList} value={extra.serviceId} petSize={petSize}
                                                    onChange={(v:string) => {
                                                        const svc = servicesList.find((s:any) => String(s.id) === String(v));
                                                        setExtraServices((prev: any[]) => prev.map(e => e.tempId === extra.tempId ? {...e, serviceId: v, duration: svc?.duration_minutes || 30, endTime: calculateEndTime(e.startTime, svc?.duration_minutes||30)} : e));
                                                    }} 
                                                    disabled={isReadOnly} 
                                                />
                                                <SearchableEmployeeSelect employees={employees} value={extra.employeeId} onChange={(v:string) => setExtraServices((prev: any[]) => prev.map(e => e.tempId === extra.tempId ? {...e, employeeId: v} : e))} disabled={isReadOnly} />
                                                <div className="flex gap-2 col-span-1 md:col-span-2">
                                                    <Input type="time" value={extra.startTime || ""} onChange={e => setExtraServices((prev: any[]) => prev.map(ex => ex.tempId === extra.tempId ? {...ex, startTime: e.target.value, endTime: calculateEndTime(e.target.value, ex.duration)} : ex))} disabled={isReadOnly} className="h-8 text-xs w-full md:w-24"/>
                                                    <Input type="time" value={extra.endTime || ""} disabled className="h-8 text-xs bg-slate-50 w-full md:w-24"/>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {!isReadOnly && (
                                <Button variant="outline" size="sm" className="w-full border-dashed text-slate-500 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 h-10" onClick={() => {
                                    const lastTime = extraServices.length > 0 ? extraServices[extraServices.length-1].endTime : mainService.endTime;
                                    setExtraServices([...extraServices, { tempId: Math.random(), serviceId: "", employeeId: mainService.employeeId, startTime: lastTime, endTime: calculateEndTime(lastTime, 30), duration: 30 }]);
                                }}>
                                    <Plus size={14} className="mr-2"/> Agregar Servicio Adicional
                                </Button>
                            )}
                        </TabsContent>

                        {/* TAB: HISTORIAL */}
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
                                                    <div className="text-sm font-medium text-slate-800 mb-1">Servicios</div>
                                                    {h.services && h.services.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {h.services.map((svcName: string, idx: number) => (
                                                                <Badge key={idx} variant="secondary" className="text-[10px] font-normal bg-purple-50 text-purple-700 border-purple-100">
                                                                    {svcName}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : <span className="text-xs text-slate-400 italic">Sin detalle</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </div>
                </div>
                
                {/* FOOTER */}
                <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex flex-col md:flex-row justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 gap-3">
                    {!isReadOnly && (
                        <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 w-full md:w-auto" onClick={handleDelete}>
                            <Trash2 size={16} className="mr-2"/> Eliminar
                        </Button>
                    )}
                    <div className="flex gap-2 w-full md:w-auto ml-auto">
                        <Button variant="outline" onClick={onClose} className="flex-1 md:flex-none">Cerrar</Button>
                        {!isReadOnly && (
                            <Button onClick={handleSave} disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white min-w-[120px] flex-1 md:flex-none">
                                {loading ? <Loader2 className="animate-spin"/> : <Save size={16} className="mr-2"/>} 
                                Guardar
                            </Button>
                        )}
                    </div>
                </div>
            </Tabs>
        </div>
    );
}

// WRAPPER PRINCIPAL
export default function AppointmentDetailDialog({ 
  appointment, open, onOpenChange, employees, onUpdate 
}: AppointmentDetailDialogProps) {
  const supabase = createClient();
  const [servicesList, setServicesList] = useState<Service[]>([]);

  useEffect(() => {
    if (open) {
      const fetchServices = async () => {
        const { data } = await supabase.from('services').select('id, name, duration_minutes, category, base_price, active').order('name');
        if (data) setServicesList(data as Service[]);
      };
      fetchServices();
    }
  }, [open]);

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] md:w-[650px] h-[90vh] md:h-[85vh] flex flex-col p-0 overflow-hidden bg-white gap-0 rounded-lg">
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