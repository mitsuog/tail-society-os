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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator 
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
// Importamos X explícitamente para el botón de borrar
import { Loader2, CalendarPlus, Search, Check, Clock, User, Phone, Dog, History, AlertTriangle, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import { addMinutes } from 'date-fns';

export default function NewAppointmentDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Data Sources
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Selection State
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>("10:00");
  
  // Intelligence State
  const [lastServiceIds, setLastServiceIds] = useState<string[]>([]);
  const [lastServiceDate, setLastServiceDate] = useState<string | null>(null);
  
  // Search State
  const [clientSearch, setClientSearch] = useState("");
  const [openClientSearch, setOpenClientSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);

  const supabase = createClient();
  const router = useRouter();

  // 1. Cargar Catálogos
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        const [resServices, resEmployees] = await Promise.all([
          supabase.from('services').select('*').order('name'),
          supabase.from('employees').select('*').eq('active', true)
        ]);
        if (resServices.data) setServices(resServices.data);
        if (resEmployees.data) setEmployees(resEmployees.data);
      };
      fetchData();
    }
  }, [open]);

  // 2. Buscar Clientes (Omni-search)
  useEffect(() => {
    if (clientSearch.length > 2) {
      setIsSearching(true);
      const searchOmni = async () => {
        const term = clientSearch.trim();
        const searchPattern = `%${term}%`;
        try {
          const { data: directClients } = await supabase
            .from('clients')
            .select('*, pets(*)')
            .or(`full_name.ilike.${searchPattern},phone.ilike.${searchPattern}`)
            .limit(5);

          const { data: petOwners } = await supabase
            .from('pets')
            .select('client:clients(*, pets(*))')
            .or(`name.ilike.${searchPattern},breed.ilike.${searchPattern}`)
            .limit(5);

          const combinedMap = new Map();
          directClients?.forEach(c => combinedMap.set(c.id, c));
          petOwners?.forEach((item: any) => { if (item.client) combinedMap.set(item.client.id, item.client); });

          setClients(Array.from(combinedMap.values()));
        } catch (err) { console.error(err); } 
        finally { setIsSearching(false); }
      };
      const timer = setTimeout(searchOmni, 400);
      return () => clearTimeout(timer);
    } else { setClients([]); }
  }, [clientSearch]);

  // 3. INTELIGENCIA: Buscar Último Servicio
  useEffect(() => {
    if (selectedPet) {
      const fetchLastAppointment = async () => {
        const { data: lastAppt } = await supabase
          .from('appointments')
          .select('id, date, appointment_services(service_id)')
          .eq('pet_id', selectedPet.id)
          .eq('status', 'completed')
          .order('date', { ascending: false })
          .limit(1)
          .single();

        if (lastAppt && lastAppt.appointment_services) {
          const ids = lastAppt.appointment_services.map((as: any) => as.service_id);
          setLastServiceIds(ids);
          setLastServiceDate(lastAppt.date);
        } else {
          setLastServiceIds([]);
          setLastServiceDate(null);
        }
      };
      fetchLastAppointment();
    }
  }, [selectedPet]);

  // 4. Calculadora de Tiempos
  useEffect(() => {
    if (!selectedPet || selectedServices.length === 0) {
      setTotalDuration(0);
      return;
    }
    let minutes = 0;
    const petSize = selectedPet.size || 'Mediano';

    selectedServices.forEach(svcId => {
      const svc = services.find(s => s.id === svcId);
      if (!svc) return;
      
      let svcTime = svc.duration_minutes || 60;
      if (svc.category === 'cut' && !svc.name.includes(petSize)) {
         if (petSize === 'Grande') svcTime += 30;
         if (petSize === 'Gigante' || petSize === 'Extra Grande') svcTime += 60;
      }
      minutes += svcTime;
    });
    setTotalDuration(minutes);
  }, [selectedServices, selectedPet, services]);

  // 5. FILTRO DE EMPLEADOS
  const availableEmployees = useMemo(() => {
    if (selectedServices.length === 0) return employees;
    const requiresStylist = selectedServices.some(id => {
      const svc = services.find(s => s.id === id);
      return svc?.category === 'cut' || svc?.name.toLowerCase().includes('corte');
    });
    return employees.filter(emp => {
      if (requiresStylist) return emp.role === 'stylist';
      return true; 
    });
  }, [selectedServices, employees, services]);

  useEffect(() => {
    if (selectedEmployee) {
      const isValid = availableEmployees.find(e => e.id === selectedEmployee);
      if (!isValid) setSelectedEmployee("");
    }
  }, [availableEmployees]);

  const handleSave = async () => {
    if (!selectedPet || !selectedEmployee || selectedServices.length === 0) {
      toast.error("Faltan datos requeridos.");
      return;
    }
    setLoading(true);
    try {
      const startDateTime = new Date(`${date}T${time}`);
      const endDateTime = addMinutes(startDateTime, totalDuration);

      const { data: appt, error: apptError } = await supabase
        .from('appointments')
        .insert({
          client_id: selectedClient.id,
          pet_id: selectedPet.id,
          date: date,
          status: 'scheduled',
          notes: `Duración: ${totalDuration} min`
        })
        .select()
        .single();

      if (apptError) throw apptError;

      const serviceInserts = selectedServices.map(svcId => ({
        appointment_id: appt.id,
        service_id: svcId,
        employee_id: selectedEmployee,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        resource_type: 'table'
      }));

      await supabase.from('appointment_services').insert(serviceInserts);

      toast.success("Cita agendada correctamente");
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedClient(null);
    setSelectedPet(null);
    setSelectedServices([]);
    setClientSearch("");
    setLastServiceIds([]);
  };

  // --- LÓGICA DE FILTRADO POR TALLA Y AGRUPACIÓN ---
  const groupedServices = useMemo(() => {
    
    // A. Filtrar por Talla de Mascota
    const petSize = selectedPet?.size || '';
    
    // Normalizar talla para comparación
    let targetSize = 'Generico'; 
    if (petSize === 'Chico' || petSize === 'Puppy') targetSize = 'Chico';
    else if (petSize === 'Mediano') targetSize = 'Mediano';
    else if (petSize === 'Grande') targetSize = 'Grande';
    else if (petSize === 'Extra Grande' || petSize === 'Gigante') targetSize = 'Extra Grande';

    const filteredList = services.filter(s => {
        const name = s.name.toLowerCase();
        
        // Si no hay mascota seleccionada, mostrar todo
        if (!targetSize || targetSize === 'Generico') return true;

        // Detectar si el servicio es específico de otra talla
        const isChico = name.includes('chico');
        const isMediano = name.includes('mediano');
        const isGrande = name.includes('grande') && !name.includes('extra');
        const isExtra = name.includes('extra grande') || name.includes('gigante');

        // Si es servicio genérico (sin talla en el nombre), lo mostramos siempre
        if (!isChico && !isMediano && !isGrande && !isExtra) return true;

        // Si tiene talla, debe coincidir con la de la mascota
        if (targetSize === 'Chico' && isChico) return true;
        if (targetSize === 'Mediano' && isMediano) return true;
        if (targetSize === 'Grande' && isGrande) return true;
        if (targetSize === 'Extra Grande' && isExtra) return true;

        return false; // Si tiene talla pero no coincide, lo ocultamos
    });

    // B. Agrupar y Deduplicar
    const groups = {
      cut: [] as any[],
      bath: [] as any[],
      addon: [] as any[]
    };

    const uniqueServices = new Map();
    filteredList.forEach(s => {
      const normalizedName = s.name.trim().toLowerCase();
      if (!uniqueServices.has(normalizedName)) {
        uniqueServices.set(normalizedName, s);
      }
    });

    uniqueServices.forEach((s) => {
      const name = s.name.toLowerCase();
      const cat = s.category || '';

      if (cat === 'cut' || name.includes('corte') || name.includes('estetica')) {
        groups.cut.push(s);
      } else if (cat === 'bath' || name.includes('baño') || name.includes('bath') || name.includes('coat')) {
        groups.bath.push(s);
      } else {
        groups.addon.push(s);
      }
    });

    return groups;
  }, [services, selectedPet]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 text-white shadow-lg gap-2 hover:bg-slate-800">
          <CalendarPlus size={18} /> Nueva Cita
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar Servicio</DialogTitle>
        </DialogHeader>

        {/* PASO 1: CLIENTE Y MASCOTA */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Buscar Cliente</Label>
              <Popover open={openClientSearch} onOpenChange={setOpenClientSearch}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between text-left font-normal">
                    {selectedClient ? (
                        <div className="flex flex-col items-start">
                            <span className="font-bold text-slate-900">{selectedClient.full_name}</span>
                            <span className="text-xs text-slate-500">{selectedClient.phone}</span>
                        </div>
                    ) : <span className="text-slate-500">Busca por nombre, mascota, raza...</span>}
                    <Search className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[400px]" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Ej: Max, Golden, Juan..." onValueChange={setClientSearch} />
                    <CommandList>
                      {isSearching && <div className="p-4 text-center text-xs text-slate-500"><Loader2 className="animate-spin h-4 w-4 mx-auto mb-1"/>Buscando...</div>}
                      <CommandGroup heading="Resultados">
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            onSelect={() => {
                              setSelectedClient(client);
                              setOpenClientSearch(false);
                              if(client.pets && client.pets.length === 1) setSelectedPet(client.pets[0]);
                              else setSelectedPet(null);
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col w-full">
                              <div className="flex justify-between">
                                  <span className="font-bold flex items-center gap-2"><User size={12}/> {client.full_name}</span>
                                  <span className="text-xs text-slate-400 flex items-center gap-1"><Phone size={10}/> {client.phone}</span>
                              </div>
                              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 pl-5">
                                 <Dog size={10} /> 
                                 {client.pets?.length > 0 ? client.pets.map((p:any) => `${p.name} (${p.breed})`).join(", ") : "Sin mascotas"}
                              </div>
                            </div>
                            {selectedClient?.id === client.id && <Check className="ml-auto h-4 w-4 text-green-600" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedClient && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label>Seleccionar Mascota</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedClient.pets?.map((pet: any) => (
                    <div 
                      key={pet.id}
                      onClick={() => setSelectedPet(pet)}
                      className={cn(
                        "cursor-pointer border rounded-lg p-3 flex items-center gap-3 transition-all hover:bg-slate-50 relative overflow-hidden",
                        selectedPet?.id === pet.id ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-slate-200"
                      )}
                    >
                      <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                         {pet.photo_url ? <img src={pet.photo_url} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-slate-500">{pet.name[0]}</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-800 truncate">{pet.name}</p>
                        <p className="text-xs text-slate-500 truncate">{pet.breed}</p>
                        <p className="text-[10px] text-slate-400">{pet.size}</p>
                      </div>
                      {selectedPet?.id === pet.id && <div className="absolute top-0 right-0 bg-blue-500 text-white p-1 rounded-bl-lg"><Check size={10} /></div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button disabled={!selectedPet} onClick={() => setStep(2)} className="bg-slate-900 text-white">Continuar</Button>
            </DialogFooter>
          </div>
        )}

        {/* --- PASO 2: SERVICIOS Y DETALLES --- */}
        {step === 2 && selectedPet && (
          <div className="space-y-5 py-2 animate-in fade-in slide-in-from-right-4">
            
            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
               <div className="h-8 w-8 rounded-full bg-white border border-slate-200 overflow-hidden">
                  {selectedPet.photo_url ? <img src={selectedPet.photo_url} className="w-full h-full object-cover" /> : <Dog size={16} className="m-auto mt-1.5 text-slate-300"/>}
               </div>
               <div>
                 <p className="font-bold text-sm leading-none">{selectedPet.name}</p>
                 <p className="text-[10px] text-slate-500">{selectedPet.breed} • {selectedPet.size}</p>
               </div>
               <Button variant="ghost" size="sm" className="ml-auto text-xs h-7" onClick={() => setStep(1)}>Cambiar</Button>
            </div>

            {/* SUGERENCIA INTELIGENTE */}
            {lastServiceIds.length > 0 && selectedServices.length === 0 && (
               <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between animate-pulse-once">
                  <div className="flex items-center gap-2 text-blue-800">
                     <History size={16} />
                     <div className="flex flex-col">
                        <span className="text-xs font-bold">Sugerencia: Repetir último servicio</span>
                        <span className="text-[10px] opacity-80">Realizado el {lastServiceDate}</span>
                     </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs bg-white text-blue-700 border-blue-200 hover:bg-blue-100"
                    onClick={() => setSelectedServices(lastServiceIds)}
                  >
                    Aplicar
                  </Button>
               </div>
            )}

            {/* BUSCADOR DE SERVICIOS FILTRADO */}
            <div className="space-y-2">
              <Label>Agregar Servicios</Label>
              <Command className="border rounded-md max-h-[250px] overflow-hidden">
                <CommandInput placeholder={`Buscar para ${selectedPet.size} (ej. Baño, Corte...)`} />
                <CommandList className="overflow-y-auto">
                  <CommandEmpty>No encontrado para esta talla.</CommandEmpty>
                  
                  <CommandGroup heading="Corte y Estilismo">
                    {groupedServices.cut.map(svc => (
                      <CommandItem key={svc.id} onSelect={() => setSelectedServices(prev => prev.includes(svc.id) ? prev.filter(x=>x!==svc.id) : [...prev, svc.id])}>
                        <div className="flex items-center gap-2 w-full">
                           <Checkbox checked={selectedServices.includes(svc.id)} />
                           <span className="flex-1 font-medium text-slate-700">{svc.name}</span>
                           <span className="text-xs text-slate-400">{svc.duration_minutes}m</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />

                  <CommandGroup heading="Baño y Mantenimiento">
                    {groupedServices.bath.map(svc => (
                      <CommandItem key={svc.id} onSelect={() => setSelectedServices(prev => prev.includes(svc.id) ? prev.filter(x=>x!==svc.id) : [...prev, svc.id])}>
                        <div className="flex items-center gap-2 w-full">
                           <Checkbox checked={selectedServices.includes(svc.id)} />
                           <span className="flex-1">{svc.name}</span>
                           <span className="text-xs text-slate-400">{svc.duration_minutes}m</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />

                  <CommandGroup heading="Adicionales">
                    {groupedServices.addon.map(svc => (
                      <CommandItem key={svc.id} onSelect={() => setSelectedServices(prev => prev.includes(svc.id) ? prev.filter(x=>x!==svc.id) : [...prev, svc.id])}>
                        <div className="flex items-center gap-2 w-full">
                           <Checkbox checked={selectedServices.includes(svc.id)} />
                           <span className="flex-1">{svc.name}</span>
                           <span className="text-xs text-slate-400">{svc.duration_minutes}m</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>

                </CommandList>
              </Command>
              
              {/* Badges de selección MEJORADOS */}
              <div className="flex flex-wrap gap-2 min-h-[24px] py-1">
                 {selectedServices.length === 0 && (
                    <span className="text-xs text-slate-400 italic">Ningún servicio seleccionado</span>
                 )}
                 {selectedServices.map(id => {
                    const s = services.find(x => x.id === id);
                    return s ? (
                        <Badge 
                          key={id} 
                          variant="secondary" 
                          className="text-[11px] px-2 py-1 gap-1 flex items-center justify-between border border-slate-200"
                        >
                           <span>{s.name}</span>
                           <button
                             type="button"
                             onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation(); 
                               setSelectedServices(prev => prev.filter(x => x !== id));
                             }}
                             className="ml-1 -mr-1 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-colors"
                           >
                             <X size={13} />
                           </button>
                        </Badge>
                    ) : null;
                 })}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                 <div className="flex items-center gap-2">
                    <Clock size={16} /> <span>Duración Total:</span>
                 </div>
                 <strong className="text-slate-900">{Math.floor(totalDuration / 60)}h {totalDuration % 60}m</strong>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                 <Label>Fecha</Label>
                 <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
               </div>
               <div className="space-y-1">
                 <Label>Hora Inicio (15 min)</Label>
                 <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} step="900" />
               </div>
            </div>

            <div className="space-y-1">
               <div className="flex justify-between">
                  <Label>Asignar a</Label>
                  {availableEmployees.length < employees.length && (
                      <span className="text-[10px] text-amber-600 flex items-center gap-1">
                          <AlertTriangle size={10} /> Solo Estilistas
                      </span>
                  )}
               </div>
               <Select onValueChange={setSelectedEmployee} value={selectedEmployee}>
                 <SelectTrigger>
                   <SelectValue placeholder="Seleccionar responsable..." />
                 </SelectTrigger>
                 <SelectContent>
                   {availableEmployees.map(emp => (
                     <SelectItem key={emp.id} value={emp.id}>
                       <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full" style={{backgroundColor: emp.color}}></div>
                         {emp.first_name} {emp.last_name} 
                         <span className="text-xs text-slate-400 ml-1">
                            ({emp.role === 'stylist' ? 'Estilista' : emp.role === 'finisher' ? 'Terminador' : 'Bañador'})
                         </span>
                       </div>
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>

            <DialogFooter className="flex justify-between sm:justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
              <Button onClick={handleSave} disabled={loading} className="bg-slate-900 text-white min-w-[140px]">
                {loading ? <Loader2 className="animate-spin mr-2"/> : <Check className="mr-2 h-4 w-4" />}
                Agendar Cita
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}