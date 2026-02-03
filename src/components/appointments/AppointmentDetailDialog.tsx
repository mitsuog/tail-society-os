'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format, parseISO, addMinutes, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from "sonner";
import { 
  UserCircle, X, Trash2, Save, 
  Check, ChevronsUpDown, Scissors, 
  Droplets, Sparkles, Box, Loader2, Plus
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
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
const getCategoryStyles = (category: string = 'general') => {
    switch (category?.toLowerCase()) {
        case 'cut': return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: Scissors };
        case 'bath': return { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', icon: Droplets };
        case 'addon': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Sparkles };
        default: return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: Box };
    }
};

// --- COMPONENTES AUXILIARES ---

function SearchableServiceSelect({ services, value, onChange, disabled, placeholder }: any) {
    const [open, setOpen] = useState(false);
    
    const selected = services.find((s:any) => String(s.id) === String(value));
    const styles = getCategoryStyles(selected?.category);
    const Icon = styles.icon;

    // Filtro Visual: Activos + El seleccionado actualmente
    const visibleServices = services.filter((s: Service) => 
        s.active === true || String(s.id) === String(value)
    );

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className={cn("w-full justify-between h-9 bg-white font-normal px-3 text-left border-slate-200", !value && !disabled && "text-slate-500", selected && !disabled && `border-l-4 ${styles.border.replace('border', 'border-l')}`)}>
                    <div className="flex items-center gap-2 truncate w-full">
                        {selected ? <Icon size={14} className={cn("shrink-0", styles.text)}/> : <Scissors size={14} className="text-slate-400"/>}
                        <span className="truncate">
                            {selected ? selected.name : (placeholder || "Seleccionar...")}
                            {selected && !selected.active && <span className="ml-2 text-[9px] text-red-400 font-bold">(Inactivo)</span>}
                        </span>
                    </div>
                    {!disabled && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 z-[9999]" align="start">
                <Command>
                    <CommandInput placeholder="Buscar servicio..." />
                    <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandEmpty>No encontrado.</CommandEmpty>
                        <CommandGroup>
                            {visibleServices.map((service:any) => (
                                <CommandItem key={service.id} onSelect={() => { onChange(String(service.id)); setOpen(false); }}>
                                    <Check className={cn("mr-2 h-4 w-4", String(value) === String(service.id) ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                        <span className={cn(!service.active && "text-slate-400")}>{service.name}</span>
                                        {!service.active && <span className="text-[9px] text-red-400 font-bold">Archivado</span>}
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
                <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="w-full justify-between h-9 bg-white font-normal px-3 text-left border-slate-200">
                    <div className="flex items-center gap-2 truncate">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: selected?.color || '#ccc'}}></div>
                        <span className="truncate">{selected ? `${selected.first_name} ${selected.last_name || ''}` : "Sin asignar"}</span>
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

// --- FORMULARIO LÓGICO ---
function AppointmentForm({ appointment, employees, onUpdate, onClose, servicesList }: any) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    
    // Estados
    const [date, setDate] = useState("");
    const [notes, setNotes] = useState("");
    const [mainService, setMainService] = useState<any>({});
    const [extraServices, setExtraServices] = useState<any[]>([]);
    const [petHistory, setPetHistory] = useState<any[]>([]);
    
    // Control de borrado
    const [initialExtraIds, setInitialExtraIds] = useState<string[]>([]);

    useEffect(() => {
        if (!appointment) return;
        setInitializing(true);
        const pId = appointment.appointment_id || appointment.appointment?.id || appointment.id;
        
        const load = async () => {
            // Cargar Cita
            const { data: parent } = await supabase.from('appointments').select('*').eq('id', pId).single();
            if(parent) {
                setDate(parent.date);
                setNotes(parent.notes || "");
                
                // Historial
                const { data: hist } = await supabase.from('appointments')
                    .select('date, appointment_services(service:services(name))')
                    .eq('pet_id', parent.pet_id)
                    .neq('id', pId)
                    .order('date', {ascending:false})
                    .limit(5);
                if(hist) setPetHistory(hist.map((h:any) => ({ date: h.date, services: h.appointment_services.map((as:any) => as.service?.name).filter(Boolean) })));
            }

            // Cargar Servicios
            const { data: servicesData } = await supabase.from('appointment_services')
                .select(`id, start_time, end_time, service_id, employee_id, service:services(name, duration_minutes, category)`)
                .eq('appointment_id', pId)
                .order('start_time', {ascending: true});

            if (servicesData && servicesData.length > 0) {
                const main = servicesData[0];
                // Extraer hora local de la ISO string que viene de BD
                const startT = main.start_time.split('T')[1].substring(0,5);
                const endT = main.end_time.split('T')[1].substring(0,5);
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
                    startTime: ext.start_time.split('T')[1].substring(0,5),
                    endTime: ext.end_time.split('T')[1].substring(0,5),
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

    // Helper para convertir Fecha Local (Input) -> ISO String (Database)
    // Esto asegura que "10:00 AM" se guarde con la zona horaria correcta y no aparezca a las 4 AM.
    const formatForDB = (dateStr: string, timeStr: string) => {
        if (!dateStr || !timeStr) return null;
        const d = new Date(`${dateStr}T${timeStr}:00`);
        return d.toISOString();
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const pId = appointment.appointment_id || appointment.appointment?.id || appointment.id;
            
            // 1. Actualizar Cita Padre
            await supabase.from('appointments').update({ date, notes }).eq('id', pId);

            // 2. Actualizar Servicio Principal
            // CORRECCIÓN: Usamos formatForDB para convertir a ISO
            const mainStartISO = formatForDB(date, mainService.startTime);
            const mainEndISO = formatForDB(date, mainService.endTime);

            await supabase.from('appointment_services').update({
                service_id: mainService.serviceId,
                employee_id: mainService.employeeId || null,
                start_time: mainStartISO,
                end_time: mainEndISO
            }).eq('id', mainService.id);

            // 3. Manejar Extras
            // Eliminar
            const currentExtraIds = extraServices.map(e => e.id).filter(Boolean);
            const toDeleteIds = initialExtraIds.filter(id => !currentExtraIds.includes(id));
            if (toDeleteIds.length > 0) {
                await supabase.from('appointment_services').delete().in('id', toDeleteIds);
            }

            // Insertar/Actualizar
            for(const extra of extraServices) {
                // CORRECCIÓN: Convertir a ISO también para los extras
                const extraStartISO = formatForDB(date, extra.startTime);
                const extraEndISO = formatForDB(date, extra.endTime);

                const payload = {
                    appointment_id: pId,
                    service_id: extra.serviceId,
                    employee_id: extra.employeeId || null,
                    start_time: extraStartISO,
                    end_time: extraEndISO,
                    resource_type: 'table' // Asegurar que tenga el recurso para que el calendario lo vea
                };
                
                if(extra.id) {
                    await supabase.from('appointment_services').update(payload).eq('id', extra.id);
                } else {
                    await supabase.from('appointment_services').insert(payload);
                }
            }

            toast.success("Cita actualizada");
            await onUpdate();
            onClose(); 
        } catch (e:any) {
            console.error(e);
            toast.error("Error al guardar: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if(!confirm("¿Eliminar toda la cita?")) return;
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

    const mainSvcInfo = servicesList.find((s:any) => String(s.id) === String(mainService.serviceId));
    const mainStyle = getCategoryStyles(mainSvcInfo?.category);

    if (initializing) return <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <ScrollArea className="flex-1 p-6">
                <Tabs defaultValue="details">
                    <TabsList className="w-full grid grid-cols-2 mb-4">
                        <TabsTrigger value="details">Detalles</TabsTrigger>
                        <TabsTrigger value="history">Historial</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="details" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label className="text-xs font-bold text-slate-500 uppercase">Fecha</Label><Input type="date" value={date} onChange={e=>setDate(e.target.value)} disabled={!isEditing} className="h-8"/></div>
                            <div><Label className="text-xs font-bold text-slate-500 uppercase">Notas</Label><Input value={notes} onChange={e=>setNotes(e.target.value)} disabled={!isEditing} className="h-8"/></div>
                        </div>

                        <div className={cn("border rounded-lg p-4 transition-all", isEditing ? "bg-white shadow-sm ring-1 ring-purple-100" : "bg-slate-50", mainStyle.bg, mainStyle.border)}>
                            <div className="flex justify-between mb-2">
                                <Label className="text-xs font-bold uppercase text-slate-500">Servicio Principal</Label>
                                {!isEditing && <Button size="sm" variant="ghost" className="h-5 text-xs text-purple-600 p-0 hover:bg-transparent" onClick={() => setIsEditing(true)}>Editar</Button>}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <SearchableServiceSelect services={servicesList} value={mainService.serviceId} onChange={(v:any) => {
                                    const svc = servicesList.find((s:any) => String(s.id) === String(v));
                                    setMainService({...mainService, serviceId:v, duration: svc?.duration_minutes || 30, endTime: calculateEndTime(mainService.startTime, svc?.duration_minutes || 30)})
                                }} disabled={!isEditing} />
                                <SearchableEmployeeSelect employees={employees} value={mainService.employeeId} onChange={(v:any) => setMainService({...mainService, employeeId:v})} disabled={!isEditing} />
                                <Input type="time" value={mainService.startTime} onChange={e => setMainService({...mainService, startTime: e.target.value, endTime: calculateEndTime(e.target.value, mainService.duration)})} disabled={!isEditing} className="h-8"/>
                                <Input type="time" value={mainService.endTime} disabled className="h-8 bg-black/5"/>
                            </div>
                        </div>

                        {extraServices.map((extra, i) => (
                            <div key={extra.tempId} className="border border-dashed p-2 rounded relative group hover:border-purple-200 transition-colors">
                                {isEditing && <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-5 w-5 text-slate-400 hover:text-red-500" onClick={() => setExtraServices(prev => prev.filter(e => e.tempId !== extra.tempId))}><X size={12}/></Button>}
                                <div className="text-xs font-bold mb-1 text-slate-500">Extra {i+1}</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <SearchableServiceSelect services={servicesList} value={extra.serviceId} onChange={(v:string) => {
                                        const svc = servicesList.find((s:any) => String(s.id) === String(v));
                                        setExtraServices(prev => prev.map(e => e.tempId === extra.tempId ? {...e, serviceId: v, duration: svc?.duration_minutes || 30, endTime: calculateEndTime(e.startTime, svc?.duration_minutes||30)} : e));
                                    }} disabled={!isEditing} />
                                    <SearchableEmployeeSelect employees={employees} value={extra.employeeId} onChange={(v:string) => setExtraServices(prev => prev.map(e => e.tempId === extra.tempId ? {...e, employeeId: v} : e))} disabled={!isEditing} />
                                    <Input type="time" value={extra.startTime} onChange={e => setExtraServices(prev => prev.map(ex => ex.tempId === extra.tempId ? {...ex, startTime: e.target.value, endTime: calculateEndTime(e.target.value, ex.duration)} : ex))} disabled={!isEditing} className="h-8"/>
                                    <Input type="time" value={extra.endTime} disabled className="h-8 bg-black/5"/>
                                </div>
                            </div>
                        ))}
                        
                        {isEditing && (
                            <Button variant="outline" size="sm" className="w-full border-dashed text-slate-500 hover:text-purple-600 hover:border-purple-200" onClick={() => {
                                const lastTime = extraServices.length > 0 ? extraServices[extraServices.length-1].endTime : mainService.endTime;
                                setExtraServices([...extraServices, { tempId: Math.random(), serviceId: "", employeeId: mainService.employeeId, startTime: lastTime, endTime: calculateEndTime(lastTime, 30), duration: 30 }]);
                            }}><Plus size={12} className="mr-2"/> Agregar Servicio Extra</Button>
                        )}

                    </TabsContent>
                    <TabsContent value="history">
                        {petHistory.length === 0 ? <div className="text-center text-sm text-slate-400 py-4">Sin historial</div> : (
                            <div className="space-y-2">
                                {petHistory.map((h, i) => (
                                    <div key={i} className="flex gap-2 text-sm border-b pb-2 last:border-0">
                                        <div className="font-bold w-20 shrink-0 text-slate-700">{format(parseISO(h.date), 'dd MMM', {locale: es})}</div>
                                        <div className="text-slate-500 truncate">{h.services.join(', ')}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </ScrollArea>
            
            {isEditing && (
                <div className="p-4 border-t bg-white flex justify-between shadow-lg z-10">
                    <Button variant="destructive" size="sm" onClick={handleDelete}><Trash2 size={14} className="mr-2"/> Eliminar</Button>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancelar</Button>
                        <Button size="sm" onClick={handleSave} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white"><Save size={14} className="mr-2"/> Guardar Cambios</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function AppointmentDetailDialog({ 
  appointment, open, onOpenChange, employees, onUpdate 
}: AppointmentDetailDialogProps) {
  const supabase = createClient();
  const [servicesList, setServicesList] = useState<Service[]>([]);

  useEffect(() => {
    if (open) {
      const fetchServices = async () => {
        // Traemos todos los servicios (activos e inactivos)
        const { data } = await supabase
            .from('services')
            .select('id, name, duration_minutes, category, active') 
            .order('name');
            
        if (data) {
            // Deduplicación simple (por si acaso)
            const unique = Array.from(new Map(data.map((s:any) => [s.name, s])).values());
            setServicesList(unique as Service[]);
        }
      };
      fetchServices();
    }
  }, [open]);

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[85vh] flex flex-col p-0 overflow-hidden bg-white">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <DialogHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                            {appointment.appointment?.pet?.name || 'Mascota'}
                            <Badge variant="secondary" className="text-[10px] font-normal bg-white border border-slate-200 text-slate-500">{appointment.appointment?.pet?.breed}</Badge>
                        </DialogTitle>
                        <DialogDescription className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                           <UserCircle size={12}/> <span>{appointment.appointment?.client?.full_name || 'Cliente'}</span>
                        </DialogDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onOpenChange(false)}><X className="h-4 w-4"/></Button>
                </div>
            </DialogHeader>
        </div>
        
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