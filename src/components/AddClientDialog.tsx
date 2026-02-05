'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch"; 
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, User, PawPrint, AlertTriangle, Check, ChevronsUpDown, 
  Stethoscope, Info, ShieldAlert, Tag, FileText, PlusCircle, Link as LinkIcon, Copy
} from 'lucide-react';
import { cn } from "@/lib/utils";

// PROPS
interface AddClientDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// OBJETO INICIAL PARA RESETEAR FACILMENTE
const INITIAL_PET_DATA = {
    name: '', species: 'dog', breed: '', color: '', size: 'mediano',
    birth_date: '', 
    sex: 'male', 
    is_aggressive: false, 
    is_nervous: false, 
    is_noisereactive: false,
    has_illness: false, 
    has_allergies: false, 
    has_conditions: false,
    is_senior: false, 
    waiver_signed: false, 
    is_vaccined: false, 
    vet_name: '', vet_phone: '', notes: '',
    convive: true, treats: true
};

export default function AddClientDialog({ isOpen, onOpenChange }: AddClientDialogProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // TABS
  const [activeTab, setActiveTab] = useState<'client' | 'pet' | 'admin'>('client');
  
  // DATA CLIENTE
  const [clientData, setClientData] = useState({
    full_name: '', phone: '', email: ''
  });
  const [clientId, setClientId] = useState<string | null>(null);

  // DATA MASCOTA
  const [petData, setPetData] = useState(INITIAL_PET_DATA);
  const [addedPetsCount, setAddedPetsCount] = useState(0); 

  // DATA INTERNA
  const [internalData, setInternalData] = useState({
      is_active: true,
      notes: '', 
      tags: [] as string[]
  });

  // UI STATES
  const [openBreed, setOpenBreed] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  
  const breedsList = [
    "Mestizo", "Labrador", "Golden Retriever", "Pastor Alemán", "Bulldog Francés", 
    "Bulldog Inglés", "Poodle", "Beagle", "Chihuahua", "Pug", "Husky", 
    "Boxer", "Salchicha", "Yorkshire", "Shih Tzu", "Schnauzer", 
    "Pomerania", "Doberman", "Gran Danés", "Rottweiler", "Cocker Spaniel", "Border Collie", 
    "Maltés", "Jack Russell", "Shiba Inu", "Boston Terrier", 
    "Bernés", "Pastor Australiano", "San Bernardo", "Samoyedo", "Akita", 
    "Chow Chow", "Dálmata", "Gato Doméstico", "Persa", "Siamés", "Maine Coon", "Bengala"
  ];

  const colorsList = [
      "Negro", "Blanco", "Café", "Chocolate", "Dorado", "Rubio", "Gris", "Plata", 
      "Crema", "Rojo", "Azul", "Manchado", "Tricolor", "Atigrado", "Arlequín", "Merle"
  ];

  const adminTags = [
      { id: 'vip', label: 'VIP', color: 'bg-amber-100 text-amber-700 border-amber-200' },
      { id: 'frequent', label: 'Frecuente', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      { id: 'late_payment', label: 'Moroso', color: 'bg-red-100 text-red-700 border-red-200' },
      { id: 'difficult', label: 'Conflictivo', color: 'bg-slate-800 text-white border-slate-900' },
      { id: 'employee', label: 'Empleado', color: 'bg-purple-100 text-purple-700 border-purple-200' },
      { id: 'friend', label: 'Amigo/Fam', color: 'bg-green-100 text-green-700 border-green-200' },
  ];

  const handleInternalOpenChange = (val: boolean) => {
    onOpenChange(val);
    if (!val) {
        setTimeout(() => {
            setActiveTab('client');
            setClientId(null);
            setClientData({ full_name: '', phone: '', email: '' });
            setPetData(INITIAL_PET_DATA);
            setAddedPetsCount(0);
            setInternalData({ is_active: true, notes: '', tags: [] });
        }, 300);
    }
  };

  const copyWaiverLink = () => {
      if (!clientId) return;
      const link = `${window.location.origin}/waiver/${clientId}`;
      navigator.clipboard.writeText(link);
      toast.success("Link copiado al portapapeles");
  };

  // 1. CREAR CLIENTE
  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientData.full_name || !clientData.phone) return toast.error("Nombre y teléfono obligatorios");

    setLoading(true);
    try {
        const { data, error } = await supabase.from('clients').insert({
            full_name: clientData.full_name,
            phone: clientData.phone,
            email: clientData.email.trim() === '' ? null : clientData.email, 
            status: 'active',
            is_active: true
        }).select().single();

        if (error) throw error;
        
        setClientId(data.id);
        toast.success("Cliente guardado");
        setActiveTab('pet');
    } catch (error: any) {
        if (error.code === '23505') {
            toast.error("Ya existe un cliente con ese teléfono o email.");
        } else if (error.message?.includes('check_phone_valid')) {
            toast.error("El número de teléfono no es válido. Verifica que tenga 10 dígitos.");
        } else if (error.message?.includes('check_email_valid')) {
            toast.error("El formato del correo electrónico no es válido.");
        } else {
            toast.error("Error al guardar: " + error.message);
        }
    } finally {
        setLoading(false);
    }
  };

  // 2. CREAR MASCOTA
  const handlePetSubmit = async (action: 'save_next' | 'save_add_another') => {
    if (!petData.name) return toast.error("Nombre de mascota obligatorio");

    setLoading(true);
    try {
        const { sex, birth_date, ...restOfPetData } = petData;

        const payload = {
            client_id: clientId,
            gender: sex, 
            birth_date: birth_date === '' ? null : birth_date, 
            ...restOfPetData
        };

        const { error } = await supabase.from('pets').insert(payload);

        if (error) throw error;

        setAddedPetsCount(prev => prev + 1);

        if (action === 'save_add_another') {
            toast.success(`"${petData.name}" guardado. Agrega la siguiente mascota.`);
            setPetData(INITIAL_PET_DATA); 
            const formContainer = document.getElementById('pet-form-container');
            if(formContainer) formContainer.scrollTop = 0;
        } else {
            toast.success("Mascota agregada");
            setActiveTab('admin'); 
        }

    } catch (error: any) {
        console.error("Error saving pet:", error);
        toast.error("Error al guardar mascota: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  // 3. FINALIZAR
  const handleAdminSubmit = async () => {
      setLoading(true);
      try {
          const { error } = await supabase.from('clients').update({
              notes: internalData.notes, 
              internal_tags: internalData.tags, 
              is_active: internalData.is_active,
              status: internalData.is_active ? 'active' : 'inactive'
          }).eq('id', clientId);

          if (error) throw error;

          toast.success("¡Registro completado exitosamente!");
          handleInternalOpenChange(false);
          router.refresh();
      } catch (error: any) {
          toast.error("Error al guardar datos admin: " + error.message);
      } finally {
          setLoading(false);
      }
  };

  const toggleTag = (tagId: string) => {
      setInternalData(prev => ({
          ...prev,
          tags: prev.tags.includes(tagId) 
            ? prev.tags.filter(t => t !== tagId) 
            : [...prev.tags, tagId]
      }));
  };

  // Helper para renderizar los switches con estilo unificado
  const RenderSwitch = ({ label, checked, onChange, colorClass = "border-slate-100 bg-slate-50" }: any) => (
      <div className={cn("flex items-center justify-between p-2.5 rounded-lg border transition-all hover:border-slate-300", colorClass)}>
          <Label className="text-xs font-medium cursor-pointer flex-1" onClick={() => onChange(!checked)}>{label}</Label>
          <Switch checked={checked} onCheckedChange={onChange} className="scale-75 origin-right"/>
      </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleInternalOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[90vh] sm:h-auto overflow-y-auto bg-white p-0 gap-0">
        
        {/* HEADER */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
            <div className="flex justify-between items-center mb-2">
                <DialogTitle className="text-xl font-bold text-slate-800">
                    {activeTab === 'admin' ? 'Gestión Interna' : 'Nuevo Registro'}
                </DialogTitle>
                <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <div className={cn("px-3 py-1 rounded text-[10px] font-bold transition-colors", activeTab === 'client' ? "bg-slate-900 text-white" : "text-slate-400")}>1. Cliente</div>
                    <div className={cn("px-3 py-1 rounded text-[10px] font-bold transition-colors", activeTab === 'pet' ? "bg-purple-600 text-white" : "text-slate-400")}>2. Mascota</div>
                    <div className={cn("px-3 py-1 rounded text-[10px] font-bold transition-colors", activeTab === 'admin' ? "bg-amber-500 text-white" : "text-slate-400")}>3. Gestión</div>
                </div>
            </div>
            <DialogDescription className="text-xs text-slate-500">
                {activeTab === 'client' && "Información de contacto del dueño."}
                {activeTab === 'pet' && "Datos clínicos y de comportamiento de la mascota."}
                {activeTab === 'admin' && "Alertas y configuración interna del staff."}
            </DialogDescription>
        </div>

        {/* CONTENIDO */}
        <div className="p-6" id="pet-form-container">
          
          {/* PASO 1: CLIENTE */}
          {activeTab === 'client' && (
             <form onSubmit={handleClientSubmit} className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><User size={14} /> Datos Personales</Label>
                    <div className="grid gap-4">
                        <div className="space-y-1">
                            <Label>Nombre Completo <span className="text-red-500">*</span></Label>
                            <Input placeholder="Ej. Juan Pérez" value={clientData.full_name} onChange={e => setClientData({...clientData, full_name: e.target.value})} className="bg-slate-50 border-slate-200 focus:bg-white transition-colors" autoFocus />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Teléfono <span className="text-red-500">*</span></Label>
                                <Input placeholder="Ej. 811..." type="tel" value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"/>
                            </div>
                            <div className="space-y-1">
                                <Label>Email (Opcional)</Label>
                                <Input placeholder="correo@ejemplo.com" type="email" value={clientData.email} onChange={e => setClientData({...clientData, email: e.target.value})} className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"/>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t">
                    <Button type="submit" disabled={loading} className="bg-slate-900 text-white w-full sm:w-auto">
                        {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null} 
                        Siguiente: Mascota
                    </Button>
                </DialogFooter>
             </form>
          )}

          {/* PASO 2: MASCOTA */}
          {activeTab === 'pet' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             
             {/* BASIC INFO */}
             <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><PawPrint size={14} /> Información Básica</Label>
                    {addedPetsCount > 0 && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Mascotas agregadas: {addedPetsCount}</Badge>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label>Nombre <span className="text-red-500">*</span></Label>
                        <Input value={petData.name} onChange={e => setPetData({...petData, name: e.target.value})} placeholder="Nombre de la mascota" className="bg-slate-50"/>
                    </div>
                    
                    {/* RAZA */}
                    <div className="space-y-1">
                        <Label>Raza</Label>
                        <Popover open={openBreed} onOpenChange={setOpenBreed} modal={true}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={openBreed} className="w-full justify-between bg-slate-50 border-slate-200 font-normal truncate">
                                    {petData.breed ? petData.breed : "Seleccionar o escribir..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 z-[9999]" align="start">
                                <Command>
                                    <CommandInput placeholder="Buscar raza..." />
                                    <CommandList className="max-h-[200px] overflow-y-auto">
                                        <CommandEmpty>
                                            <div className="p-2 border-t mt-1">
                                                <p className="text-xs mb-2 text-slate-400">Raza no encontrada. Escríbela:</p>
                                                <Input 
                                                    placeholder="Escribe la raza aquí..." 
                                                    className="h-8 text-xs"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            setPetData({...petData, breed: e.currentTarget.value});
                                                            setOpenBreed(false);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {breedsList.map((breed) => (
                                                <CommandItem
                                                    key={breed}
                                                    value={breed}
                                                    onSelect={(currentValue) => {
                                                        setPetData({...petData, breed: currentValue});
                                                        setOpenBreed(false);
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", petData.breed === breed ? "opacity-100" : "opacity-0")}/>
                                                    {breed}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-1">
                        <Label>Fecha Nac. (Aprox)</Label>
                        <Input type="date" value={petData.birth_date} onChange={e => setPetData({...petData, birth_date: e.target.value})} className="bg-slate-50"/>
                    </div>

                    <div className="space-y-1">
                        <Label>Sexo</Label>
                        <Select value={petData.sex} onValueChange={v => setPetData({...petData, sex: v})}>
                            <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Sexo" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">Macho</SelectItem>
                                <SelectItem value="female">Hembra</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
             </div>

             {/* APPEARANCE */}
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label>Color</Label>
                    <Popover open={openColor} onOpenChange={setOpenColor} modal={true}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={openColor} className="w-full justify-between bg-slate-50 border-slate-200 font-normal truncate">
                                {petData.color ? petData.color : "Seleccionar o escribir..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[250px] p-0 z-[9999]" align="start">
                            <Command>
                                <CommandInput placeholder="Buscar color..." />
                                <CommandList className="max-h-[200px] overflow-y-auto">
                                    <CommandEmpty>
                                        <div className="p-2 border-t mt-1">
                                            <p className="text-xs mb-2 text-slate-400">Color no listado:</p>
                                            <Input 
                                                placeholder="Escribe el color..." 
                                                className="h-8 text-xs"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        setPetData({...petData, color: e.currentTarget.value});
                                                        setOpenColor(false);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </CommandEmpty>
                                    <CommandGroup>
                                        {colorsList.map((color) => (
                                            <CommandItem
                                                key={color}
                                                value={color}
                                                onSelect={(currentValue) => {
                                                    setPetData({...petData, color: currentValue});
                                                    setOpenColor(false);
                                                }}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", petData.color.toLowerCase() === color.toLowerCase() ? "opacity-100" : "opacity-0")}/>
                                                {color}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-1">
                    <Label>Tamaño</Label>
                    <Select value={petData.size} onValueChange={v => setPetData({...petData, size: v})}>
                        <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Tamaño" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="chico">Chico</SelectItem>
                            <SelectItem value="mediano">Mediano</SelectItem>
                            <SelectItem value="grande">Grande</SelectItem>
                            <SelectItem value="extra">Extra Grande</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
             </div>

             {/* FLAGS UNIFICADOS (GRID STYLE) */}
             <div className="space-y-3 pt-2 border-t border-dashed">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><AlertTriangle size={14} /> Comportamiento y Salud</h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <RenderSwitch label="Agresivo" checked={petData.is_aggressive} onChange={(v: boolean) => setPetData({...petData, is_aggressive: v})} />
                    <RenderSwitch label="Nervioso" checked={petData.is_nervous} onChange={(v: boolean) => setPetData({...petData, is_nervous: v})} />
                    <RenderSwitch label="Reactivo (Ruido)" checked={petData.is_noisereactive} onChange={(v: boolean) => setPetData({...petData, is_noisereactive: v})} />
                    <RenderSwitch label="Convive" checked={petData.convive} onChange={(v: boolean) => setPetData({...petData, convive: v})} />
                    <RenderSwitch label="Acepta Premios" checked={petData.treats} onChange={(v: boolean) => setPetData({...petData, treats: v})} />
                    <RenderSwitch label="Senior (+7 años)" checked={petData.is_senior} onChange={(v: boolean) => setPetData({...petData, is_senior: v})} colorClass="bg-purple-50 border-purple-100" />
                    
                    <RenderSwitch label="Alergias" checked={petData.has_allergies} onChange={(v: boolean) => setPetData({...petData, has_allergies: v})} />
                    <RenderSwitch label="Enfermedad" checked={petData.has_illness} onChange={(v: boolean) => setPetData({...petData, has_illness: v})} />
                    <RenderSwitch label="Condiciones" checked={petData.has_conditions} onChange={(v: boolean) => setPetData({...petData, has_conditions: v})} />
                    <RenderSwitch label="Vacunas al día" checked={petData.is_vaccined} onChange={(v: boolean) => setPetData({...petData, is_vaccined: v})} />
                </div>

                {/* SECCIÓN WAIVER LINK (CONTRATO) */}
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-full text-green-700">
                            <FileText size={18}/>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-green-800">Contrato Digital (Waiver)</h4>
                            <p className="text-xs text-green-600">Firma requerida para el servicio.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* TOGGLE MANUAL */}
                        <div className="flex items-center gap-2 mr-2">
                            <Switch checked={petData.waiver_signed} onCheckedChange={(v) => setPetData({...petData, waiver_signed: v})} />
                            <Label className="text-xs cursor-pointer">Firmado Manual</Label>
                        </div>
                        {/* BOTÓN COPIAR LINK */}
                        <Button type="button" size="sm" variant="outline" className="bg-white text-green-700 border-green-300 hover:bg-green-100 h-8" onClick={copyWaiverLink}>
                            <LinkIcon size={12} className="mr-1.5"/> Enviar Link
                        </Button>
                    </div>
                </div>
             </div>

             <DialogFooter className="flex gap-2 pt-2 border-t mt-4 justify-between w-full">
                {addedPetsCount === 0 ? (
                    <Button type="button" variant="ghost" onClick={() => setActiveTab('admin')}>Omitir Mascota</Button>
                ) : (
                    <div className="text-xs text-slate-400 content-center italic">Mascotas guardadas: {addedPetsCount}</div>
                )}
                
                <div className="flex gap-2">
                    <Button type="button" variant="outline" disabled={loading} onClick={() => handlePetSubmit('save_add_another')} className="border-dashed border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100">
                        <PlusCircle size={14} className="mr-2"/> Agregar Otra
                    </Button>
                    
                    <Button type="button" disabled={loading} onClick={() => handlePetSubmit('save_next')} className="bg-slate-900 text-white min-w-[120px]">
                        {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : (addedPetsCount > 0 ? "Finalizar Mascotas" : "Guardar y Continuar")}
                    </Button>
                </div>
             </DialogFooter>
             </div>
          )}

          {/* PASO 3: GESTIÓN INTERNA */}
          {activeTab === 'admin' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-center gap-3">
                      <ShieldAlert className="text-amber-600 h-5 w-5 shrink-0" />
                      <div>
                          <h4 className="text-xs font-bold text-amber-800 uppercase">Solo uso interno</h4>
                          <p className="text-[11px] text-amber-700">Esta información solo es visible para el staff y recepcionistas.</p>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="space-y-0.5">
                              <Label className="text-sm font-medium">Estado del Cliente</Label>
                              <p className="text-xs text-slate-400">Desactiva para bloquear citas futuras.</p>
                          </div>
                          <Switch checked={internalData.is_active} onCheckedChange={v => setInternalData({...internalData, is_active: v})} />
                      </div>

                      <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                              <Tag size={12}/> Etiquetas Administrativas
                          </Label>
                          <div className="flex flex-wrap gap-2">
                              {adminTags.map(tag => (
                                  <Badge 
                                      key={tag.id}
                                      variant="outline"
                                      className={cn(
                                          "cursor-pointer transition-all px-3 py-1.5 border hover:opacity-80 select-none",
                                          internalData.tags.includes(tag.id) ? tag.color : "bg-white text-slate-500 border-slate-200"
                                      )}
                                      onClick={() => toggleTag(tag.id)}
                                  >
                                      {tag.label}
                                      {internalData.tags.includes(tag.id) && <Check size={10} className="ml-1.5 inline-block"/>}
                                  </Badge>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                          <FileText size={12}/> Notas Internas / Bitácora
                      </Label>
                      <Textarea 
                          value={internalData.notes} 
                          onChange={e => setInternalData({...internalData, notes: e.target.value})}
                          placeholder="Ej: Pedir depósito previo, cliente prefiere contacto por WhatsApp..."
                          className="min-h-[100px] bg-amber-50/30 border-amber-100 focus:border-amber-300 resize-none text-sm"
                      />
                  </div>

                  <DialogFooter className="flex gap-2 pt-4 border-t mt-4">
                      <Button type="button" variant="outline" onClick={() => setActiveTab('pet')}>Atrás</Button>
                      <Button onClick={handleAdminSubmit} disabled={loading} className="bg-slate-900 text-white min-w-[150px] shadow-lg shadow-slate-900/10 hover:bg-slate-800">
                          {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <><Check size={16} className="mr-2"/> Finalizar Registro</>}
                      </Button>
                  </DialogFooter>
              </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}