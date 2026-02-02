'use client';

import { useState, useEffect } from 'react';
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
import { toast } from "sonner";
import { 
  Loader2, User, PawPrint, Camera, AlertTriangle, Syringe, 
  Bone, Volume2, Users, HeartPulse, Skull, Check, ChevronsUpDown, Lock, Stethoscope, Info
} from 'lucide-react';
import Image from 'next/image';
import { cn } from "@/lib/utils";

// PROPS CONTROLADAS (Recibe órdenes del Sidebar)
interface AddClientDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddClientDialog({ isOpen, onOpenChange }: AddClientDialogProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const [clientData, setClientData] = useState({
    full_name: '', phone: '', email: '', notes: '', status: 'active', internal_tags: ''
  });

  const [petData, setPetData] = useState({
    name: '', species: 'Perro', breed: '', color: '', size: 'Chico', birth_date: '', photo_url: '',
    is_vaccined: false, has_allergies: false, has_illness: false, has_conditions: false,
    is_senior: false, is_aggressive: false, is_nervous: false, is_noisereactive: false,
    convive: false, treats: false, notes: '', vet_name: '', vet_phone: '', medical_notes: ''
  });

  const [breeds, setBreeds] = useState<string[]>([]);
  const [openBreed, setOpenBreed] = useState(false);
  const [uploading, setUploading] = useState(false);

  // LOGICA DE CIERRE Y LIMPIEZA
  const handleInternalOpenChange = (val: boolean) => {
    onOpenChange(val); // Avisar al Sidebar que cierre
    
    if (!val) {
      // Si cerramos, refrescamos y limpiamos estados
      router.refresh();
      setTimeout(() => {
        setStep(1);
        setCreatedClientId(null);
        setClientData({ full_name: '', phone: '', email: '', notes: '', status: 'active', internal_tags: '' });
        setPetData({ 
            name: '', species: 'Perro', breed: '', color: '', size: 'Chico', birth_date: '', photo_url: '', 
            is_vaccined: false, has_allergies: false, has_illness: false, has_conditions: false, 
            is_senior: false, is_aggressive: false, is_nervous: false, is_noisereactive: false, 
            convive: false, treats: false, notes: '', vet_name: '', vet_phone: '', medical_notes: ''
        });
      }, 500);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const fetchBreeds = async () => {
        const { data } = await supabase.from('pets').select('breed').not('breed', 'is', null);
        if (data) {
          const unique = Array.from(new Set(data.map(p => p.breed).filter(b => b?.trim())))
            .sort((a, b) => a!.localeCompare(b!));
          // @ts-ignore
          setBreeds(unique);
        }
      };
      fetchBreeds();
    }
  }, [isOpen, supabase]);

  useEffect(() => {
    if (petData.birth_date) {
      const birth = new Date(petData.birth_date);
      const now = new Date();
      const age = now.getFullYear() - birth.getFullYear();
      if (age >= 7) {
        setPetData(prev => ({ ...prev, is_senior: true }));
      } else {
        setPetData(prev => ({ ...prev, is_senior: false }));
      }
    }
  }, [petData.birth_date]);

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.from('clients').insert({
        full_name: clientData.full_name,
        phone: clientData.phone,
        email: clientData.email || null,
        notes: clientData.notes || null,
        status: clientData.status,
        internal_tags: clientData.internal_tags || null
      }).select().single();

      if (error) throw error;

      setCreatedClientId(data.id);
      toast.success("Cliente registrado. Ahora agrega su mascota.");
      setStep(2);
      router.refresh();

    } catch (error: any) {
      const isDuplicate = error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint');
      if (isDuplicate) {
        toast.warning("El cliente ya está registrado", {
          description: `El número ${clientData.phone} ya pertenece a otro cliente.`,
          icon: <Info className="text-orange-500" />,
          duration: 5000,
        });
      } else {
        toast.error("Error del sistema: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !createdClientId) return;
    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileName = `${createdClientId}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('pet-photos').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('pet-photos').getPublicUrl(fileName);
      setPetData(prev => ({ ...prev, photo_url: data.publicUrl }));
      toast.success("Foto cargada");
    } catch (err: any) {
      toast.error("Error subida: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdClientId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('pets').insert({
        client_id: createdClientId,
        ...petData,
        breed: petData.breed || 'Mestizo',
        waiver_signed: false
      });
      if (error) throw error;

      toast.success("¡Registro completado con éxito!");
      handleInternalOpenChange(false); // Cerrar modal
      router.push(`/clients/${createdClientId}`); 

    } catch (error: any) {
      toast.error("Error guardando mascota: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleInternalOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto z-[100]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {step === 1 ? <User className="text-blue-600"/> : <PawPrint className="text-orange-500"/>}
            {step === 1 ? "Paso 1: Datos del Propietario" : `Paso 2: Mascota de ${clientData.full_name}`}
          </DialogTitle>
          <DialogDescription>
            {step === 1 ? "Información de contacto y gestión interna." : "Detalles operativos y clínicos de la mascota."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <form onSubmit={handleClientSubmit} className="space-y-5 py-4">
             {/* CAMPOS DE CLIENTE COMPLETO */}
             <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nombre Completo *</Label>
                <Input required value={clientData.full_name} onChange={e => setClientData({...clientData, full_name: e.target.value})} placeholder="Ej. Ana Pérez" />
              </div>
              <div className="space-y-1">
                <Label>Teléfono *</Label>
                <Input required type="tel" value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} placeholder="55..." />
              </div>
            </div>
            
            <div className="space-y-1">
              <Label>Email (Opcional)</Label>
              <Input type="email" value={clientData.email} onChange={e => setClientData({...clientData, email: e.target.value})} placeholder="correo@ejemplo.com" />
            </div>

            <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100 space-y-4">
              <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
                <Lock size={12} /> Gestión Interna (Solo Staff)
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Estatus</Label>
                  <Select value={clientData.status} onValueChange={val => setClientData({...clientData, status: val})}>
                    <SelectTrigger className={cn("font-medium", clientData.status === 'active' ? "text-green-600" : "text-slate-500")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo / Vetado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Alertas / Flags</Label>
                  <Input 
                    value={clientData.internal_tags} 
                    onChange={e => setClientData({...clientData, internal_tags: e.target.value})} 
                    placeholder="Ej. VIP, Difícil..." 
                    className="border-amber-200 focus:border-amber-400"
                  />
                </div>
              </div>
              <div className="space-y-1">
                 <Label>Notas Internas</Label>
                 <Textarea 
                    value={clientData.notes} 
                    onChange={e => setClientData({...clientData, notes: e.target.value})} 
                    placeholder="Notas administrativas..." 
                    className="h-16 bg-white"
                 />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full bg-slate-900">
                {loading ? <Loader2 className="animate-spin" /> : "Guardar y Continuar a Mascota"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handlePetSubmit} className="space-y-5 py-2">
             {/* CAMPOS DE MASCOTA COMPLETO */}
             <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex flex-col items-center gap-3">
                   <div className="w-28 h-28 rounded-xl bg-slate-100 border-2 border-dashed flex items-center justify-center overflow-hidden relative">
                      {petData.photo_url ? <Image src={petData.photo_url} alt="Preview" fill className="object-cover" /> : <Camera className="text-slate-300"/>}
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} disabled={uploading} />
                      {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="animate-spin text-white"/></div>}
                   </div>
                   <p className="text-[10px] text-slate-400">Subir Foto</p>
                </div>
                <div className="flex-1 space-y-3">
                   <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Nombre *</Label><Input required value={petData.name} onChange={e => setPetData({...petData, name: e.target.value})} /></div>
                      <div className="space-y-1"><Label>Especie</Label>
                        <Select value={petData.species} onValueChange={val => setPetData({...petData, species: val})}>
                           <SelectTrigger><SelectValue/></SelectTrigger>
                           <SelectContent><SelectItem value="Perro">Perro</SelectItem><SelectItem value="Gato">Gato</SelectItem></SelectContent>
                        </Select>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 flex flex-col">
                        <Label>Raza</Label>
                        <Popover open={openBreed} onOpenChange={setOpenBreed} modal={true}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="justify-between font-normal">
                              {petData.breed || "Seleccionar..."} <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-[200px]" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar..." />
                              <CommandList className="max-h-[200px] overflow-y-auto">
                                <CommandEmpty className="p-2 text-sm cursor-pointer hover:bg-slate-100" onClick={() => { setPetData({...petData, breed: "Nueva"}); setOpenBreed(false); }}>Crear nueva</CommandEmpty>
                                <CommandGroup>
                                  {breeds.map(b => (
                                    <CommandItem key={b} value={b} onSelect={(val) => {
                                       const realVal = breeds.find(x => x.toLowerCase() === val.toLowerCase()) || val;
                                       setPetData({...petData, breed: realVal}); setOpenBreed(false); 
                                    }}><Check className={cn("mr-2 h-4 w-4", petData.breed===b?"opacity-100":"opacity-0")}/>{b}</CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1"><Label>Color</Label><Input value={petData.color} onChange={e => setPetData({...petData, color: e.target.value})} /></div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Tamaño</Label>
                        <Select value={petData.size} onValueChange={val => setPetData({...petData, size: val})}>
                           <SelectTrigger><SelectValue/></SelectTrigger>
                           <SelectContent><SelectItem value="Chico">Chico</SelectItem><SelectItem value="Mediano">Mediano</SelectItem><SelectItem value="Grande">Grande</SelectItem><SelectItem value="Gigante">Gigante</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label>Nacimiento</Label><Input type="date" value={petData.birth_date} onChange={e => setPetData({...petData, birth_date: e.target.value})} /></div>
                   </div>
                </div>
             </div>

             <div className="h-px bg-slate-100 my-2" />

             <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Syringe size={18} className={petData.is_vaccined?"text-green-500":"text-slate-400"}/>
                   <div><Label className="font-bold cursor-pointer">¿Vacunación Vigente?</Label><span className="text-[10px] text-slate-500 block">Esquema completo requerido</span></div>
                </div>
                <Switch checked={petData.is_vaccined} onCheckedChange={v => setPetData({...petData, is_vaccined: v})} />
             </div>
             {!petData.is_vaccined && (
               <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-xs animate-in fade-in">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <p>Advertencia: Sujeto a cancelación si no presenta comprobante.</p>
               </div>
             )}

             <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Perfil Operativo</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <div className="flex items-center justify-between p-2 border rounded hover:bg-slate-50"><Label>¿Alergias?</Label><Switch checked={petData.has_allergies} onCheckedChange={v => setPetData({...petData, has_allergies: v})}/></div>
                   <div className="flex items-center justify-between p-2 border rounded hover:bg-slate-50"><Label>¿Enfermedades?</Label><Switch checked={petData.has_illness} onCheckedChange={v => setPetData({...petData, has_illness: v})}/></div>
                   <div className="flex items-center justify-between p-2 border rounded hover:bg-slate-50"><Label>¿Condición Especial?</Label><Switch checked={petData.has_conditions} onCheckedChange={v => setPetData({...petData, has_conditions: v})}/></div>
                   <div className="flex items-center justify-between p-2 border rounded bg-blue-50/50 border-blue-100"><div className="flex items-center gap-2"><Label>¿Senior? (+7)</Label>{petData.is_senior && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded">Auto</span>}</div><Switch checked={petData.is_senior} onCheckedChange={v => setPetData({...petData, is_senior: v})}/></div>
                   <div className="flex items-center justify-between p-2 border rounded hover:bg-slate-50"><Label className="flex gap-2 items-center"><Skull size={14} className="text-red-500"/> Agresivo</Label><Switch checked={petData.is_aggressive} onCheckedChange={v => setPetData({...petData, is_aggressive: v})}/></div>
                   <div className="flex items-center justify-between p-2 border rounded hover:bg-slate-50"><Label className="flex gap-2 items-center"><HeartPulse size={14} className="text-orange-500"/> Nervioso</Label><Switch checked={petData.is_nervous} onCheckedChange={v => setPetData({...petData, is_nervous: v})}/></div>
                   <div className="flex items-center justify-between p-2 border rounded hover:bg-slate-50"><Label className="flex gap-2 items-center"><Volume2 size={14} className="text-purple-500"/> Ruido</Label><Switch checked={petData.is_noisereactive} onCheckedChange={v => setPetData({...petData, is_noisereactive: v})}/></div>
                   <div className="flex items-center justify-between p-2 border rounded hover:bg-slate-50"><Label className="flex gap-2 items-center"><Users size={14} className="text-green-500"/> Convive</Label><Switch checked={petData.convive} onCheckedChange={v => setPetData({...petData, convive: v})}/></div>
                   <div className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 sm:col-span-2"><Label className="flex gap-2 items-center"><Bone size={14} className="text-amber-500"/> Premios</Label><Switch checked={petData.treats} onCheckedChange={v => setPetData({...petData, treats: v})}/></div>
                </div>
             </div>

             <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1 flex items-center gap-2"><Stethoscope size={14} /> Veterinario (Opcional)</h4>
                <div className="grid grid-cols-2 gap-3">
                   <Input placeholder="Nombre del Dr." value={petData.vet_name} onChange={e => setPetData({...petData, vet_name: e.target.value})} />
                   <Input placeholder="Teléfono Clínica" type="tel" value={petData.vet_phone} onChange={e => setPetData({...petData, vet_phone: e.target.value})} />
                </div>
             </div>

             <div className="space-y-1"><Label>Notas de Mascota</Label><Textarea value={petData.notes} onChange={e => setPetData({...petData, notes: e.target.value})} placeholder="Detalles adicionales..." className="h-16"/></div>

             <DialogFooter className="flex gap-2 pt-2 border-t mt-4">
                <Button type="button" variant="ghost" onClick={() => handleInternalOpenChange(false)}>Omitir Mascota</Button>
                <Button type="submit" disabled={loading} className="bg-slate-900 text-white min-w-[150px]">{loading ? <Loader2 className="animate-spin" /> : "Finalizar Registro"}</Button>
             </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}