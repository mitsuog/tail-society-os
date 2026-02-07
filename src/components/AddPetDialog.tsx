'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch"; 
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList 
} from "@/components/ui/command";
import { toast } from "sonner";
import { Loader2, Plus, Save, Camera, AlertTriangle, Syringe, Bone, Volume2, Users, HeartPulse, Skull, Check, ChevronsUpDown, Crop, X, Upload } from 'lucide-react';
import { cn } from "@/lib/utils";
import Cropper from 'react-easy-crop'; 
import Webcam from "react-webcam"; 

// --- CORRECCIÓN 1: Agregar onPetAdded a la interfaz ---
interface AddPetDialogProps {
  clientId: string;
  trigger?: React.ReactNode;
  onPetAdded?: () => void | Promise<void>;
}

// --- UTILIDADES ---
async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; 
    img.src = imageSrc;
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el contexto del canvas');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Canvas is empty')); return; }
      resolve(blob);
    }, 'image/jpeg', 0.9);
  });
}

function dataURLtoFile(dataurl: string, filename: string) {
  const arr = dataurl.split(',');
  // @ts-ignore
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) { u8arr[n] = bstr.charCodeAt(n); }
  return new File([u8arr], filename, { type: mime });
}

// --- CORRECCIÓN 2: Desestructurar onPetAdded ---
export default function AddPetDialog({ clientId, trigger, onPetAdded }: AddPetDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [conversionStatus, setConversionStatus] = useState<string>("");
  
  // ESTADOS DEL CROPPER Y CÁMARA
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const router = useRouter();
  const supabase = createClient();

  // Estados buscador de razas
  const [breeds, setBreeds] = useState<string[]>([]);
  const [openBreed, setOpenBreed] = useState(false);
  const [breedSearch, setBreedSearch] = useState("");

  const [formData, setFormData] = useState({
    name: '', species: 'Perro', breed: '', color: '', size: 'Chico', birth_date: '', photo_url: '',
    is_vaccined: false, has_allergies: false, has_illness: false, has_conditions: false, is_senior: false,
    is_aggressive: false, is_nervous: false, is_noisereactive: false, convive: false, treats: false, notes: '' 
  });

  // Resetear al cerrar
  useEffect(() => {
    if (!open) {
      setImageToCrop(null);
      setZoom(1);
      setConversionStatus("");
      setIsCameraOpen(false);
    }
  }, [open]);

  // Cargar razas
  useEffect(() => {
    const fetchBreeds = async () => {
      const { data } = await supabase.from('pets').select('breed').not('breed', 'is', null);
      if (data) {
        const uniqueBreeds = Array.from(new Set(data.map(p => p.breed).filter(b => b && b.trim() !== '')))
          .sort((a, b) => a!.localeCompare(b!));
        // @ts-ignore
        setBreeds(uniqueBreeds);
      }
    };
    if (open) fetchBreeds();
  }, [open, supabase]);

  // --- FUNCIÓN BLINDADA HEIC ---
  const convertHeicToJpg = async (file: File): Promise<File> => {
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';
    if (!isHeic) return file;
    setConversionStatus("Procesando formato iPhone...");
    try {
      const heic2any = (await import("heic2any")).default;
      const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.7 });
      const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      return new File([finalBlob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
    } catch (error) {
      console.error("Fallo conversión HEIC:", error);
      throw new Error("Error procesando imagen. Intenta con otra.");
    }
  };

  // 1. SELECCIÓN DE ARCHIVO (FILE INPUT)
  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    let file = e.target.files[0];
    try {
      file = await convertHeicToJpg(file);
      const objectUrl = URL.createObjectURL(file);
      setImageToCrop(objectUrl);
      setConversionStatus("");
      setIsCameraOpen(false); 
    } catch (error: any) {
      toast.error(error.message);
      setConversionStatus("");
    }
    e.target.value = ''; 
  };

  // 2. CAPTURA DE WEBCAM
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      const file = dataURLtoFile(imageSrc, "webcam-photo.jpg");
      const objectUrl = URL.createObjectURL(file);
      setImageToCrop(objectUrl);
      setIsCameraOpen(false); 
    } else {
      toast.error("No se pudo capturar la imagen. Intenta de nuevo.");
    }
  }, [webcamRef]);

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  // 3. SUBIR IMAGEN FINAL
  const uploadCroppedImage = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    try {
      setUploading(true);
      setConversionStatus("Recortando y subiendo...");
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const fileName = `${clientId}-${Date.now()}.jpg`;
      const croppedFile = new File([croppedBlob], fileName, { type: "image/jpeg" });

      const { error: uploadError } = await supabase.storage.from('pet-photos').upload(fileName, croppedFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('pet-photos').getPublicUrl(fileName);
      const finalUrl = `${data.publicUrl}?t=${Date.now()}`;
      setFormData(prev => ({ ...prev, photo_url: finalUrl }));
      setImageToCrop(null); 
      toast.success("Foto cargada");
    } catch (error: any) {
      toast.error("Error al guardar foto: " + error.message);
    } finally {
      setUploading(false);
      setConversionStatus("");
    }
  };

  // Autocalcular Senior
  useEffect(() => {
    if (formData.birth_date) {
      const birth = new Date(formData.birth_date);
      const now = new Date();
      const age = now.getFullYear() - birth.getFullYear();
      setFormData(prev => ({ ...prev, is_senior: age >= 7 }));
    }
  }, [formData.birth_date]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };
  const handleSelectChange = (name: string, value: string) => { setFormData({ ...formData, [name]: value }); };
  const handleSwitchChange = (name: string, checked: boolean) => { setFormData({ ...formData, [name]: checked }); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('pets').insert({
        client_id: clientId,
        name: formData.name, species: formData.species, breed: formData.breed || 'Mestizo',
        color: formData.color, size: formData.size, birth_date: formData.birth_date || null,
        photo_url: formData.photo_url || null, is_vaccined: formData.is_vaccined,
        has_allergies: formData.has_allergies, has_illness: formData.has_illness,
        has_conditions: formData.has_conditions, is_senior: formData.is_senior,
        is_aggressive: formData.is_aggressive, is_nervous: formData.is_nervous,
        is_noisereactive: formData.is_noisereactive, convive: formData.convive,
        treats: formData.treats, notes: formData.notes || null, waiver_signed: false 
      });

      if (error) throw error;
      toast.success(`Mascota ${formData.name} registrada.`);
      
      // --- CORRECCIÓN 3: Llamar a onPetAdded si existe ---
      if (onPetAdded) await onPetAdded();
      
      setOpen(false);
      setFormData({
        name: '', species: 'Perro', breed: '', color: '', size: 'Chico', birth_date: '', photo_url: '',
        is_vaccined: false, has_allergies: false, has_illness: false, has_conditions: false, is_senior: false,
        is_aggressive: false, is_nervous: false, is_noisereactive: false, convive: false, treats: false, notes: ''
      });
      router.refresh();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERIZADO CONDICIONAL DE VISTAS ---
  let dialogContent;

  if (isCameraOpen) {
    dialogContent = (
      <div className="flex flex-col gap-4 py-4 animate-in fade-in zoom-in-95 items-center bg-black rounded-lg p-4">
        <h3 className="text-white text-sm font-bold mb-2">Tomar Foto</h3>
        <div className="relative rounded-lg overflow-hidden w-full bg-black border border-slate-700">
           <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width={1280}
              videoConstraints={{ facingMode: "user" }}
              onUserMediaError={(err) => {
                  console.error(err);
                  toast.error("No se pudo acceder a la cámara. Verifica permisos del navegador.");
                  setIsCameraOpen(false);
              }}
              className="w-full h-auto"
           />
        </div>
        <div className="flex gap-4 w-full justify-center">
           <Button variant="secondary" onClick={() => setIsCameraOpen(false)}>
              <X size={16} className="mr-2"/> Cancelar
           </Button>
           <Button onClick={capture} className="bg-white text-black hover:bg-slate-200 font-bold px-8">
              <Camera size={16} className="mr-2"/> Capturar
           </Button>
        </div>
     </div>
    );
  } else if (imageToCrop) {
    dialogContent = (
      <div className="flex flex-col gap-4 py-4 animate-in fade-in zoom-in-95">
        <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden shadow-inner">
           <Cropper
             image={imageToCrop}
             crop={crop}
             zoom={zoom}
             aspect={1} 
             onCropChange={setCrop}
             onCropComplete={onCropComplete}
             onZoomChange={setZoom}
           />
        </div>
        <div className="flex items-center gap-4 px-2">
           <span className="text-xs text-slate-500 font-medium">Zoom</span>
           <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900" />
        </div>
        <div className="flex justify-end gap-2 mt-2">
           <Button variant="outline" onClick={() => setImageToCrop(null)} disabled={uploading}><X size={16} className="mr-2"/> Cancelar</Button>
           <Button onClick={uploadCroppedImage} disabled={uploading} className="bg-slate-900 text-white">
             {uploading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Check size={16} className="mr-2"/>}
             Confirmar Recorte
           </Button>
        </div>
      </div>
    );
  } else {
    dialogContent = (
      <form onSubmit={handleSubmit} className="space-y-6 py-2">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col items-center gap-3 min-w-[140px]">
             {/* PREVIEW */}
             <div className="w-32 h-32 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative shadow-sm">
                {formData.photo_url ? (
                  <img src={formData.photo_url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="text-slate-300 h-10 w-10" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="animate-spin text-white"/>
                  </div>
                )}
             </div>

             {/* BOTONERA CLARA */}
             <div className="flex flex-col gap-2 w-full px-2">
                <Button 
                  type="button" 
                  onClick={() => setIsCameraOpen(true)}
                  disabled={uploading}
                  className="w-full bg-slate-800 text-white hover:bg-slate-700 text-xs h-8"
                >
                   <Camera size={14} className="mr-2" /> Usar Cámara
                </Button>

                <div className="relative w-full">
                    <Button 
                        type="button" 
                        variant="outline"
                        disabled={uploading}
                        className="w-full text-xs h-8 border-slate-300 text-slate-600"
                    >
                       <Upload size={14} className="mr-2" /> Subir Archivo
                    </Button>
                    <input 
                      type="file" 
                      accept="image/*, .heic, .heif" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={onFileSelect} 
                      disabled={uploading} 
                    />
                </div>
             </div>

             {conversionStatus && <span className="text-[9px] text-blue-600 animate-pulse text-center">{conversionStatus}</span>}
          </div>

          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1"><Label htmlFor="name">Nombre *</Label><Input id="name" name="name" required placeholder="Ej. Max" value={formData.name} onChange={handleChange} /></div>
               <div className="space-y-1"><Label>Especie</Label><Select onValueChange={(val) => handleSelectChange('species', val)} defaultValue="Perro"><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Perro">Perro</SelectItem><SelectItem value="Gato">Gato</SelectItem></SelectContent></Select></div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1 flex flex-col">
                  <Label className="mb-1.5">Raza</Label>
                  <Popover open={openBreed} onOpenChange={setOpenBreed} modal={true}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={openBreed} className="justify-between font-normal text-slate-900 border-slate-200">
                        {formData.breed || "Seleccionar..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[250px]" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar..." onValueChange={(val) => setBreedSearch(val)} />
                        <CommandList className="max-h-[200px] overflow-y-auto">
                          <CommandEmpty className="py-2 px-2 text-sm">
                             {breedSearch ? (
                               <div className="cursor-pointer bg-slate-100 p-2 rounded text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-2"
                                  onClick={() => { const newBreed = breedSearch.charAt(0).toUpperCase() + breedSearch.slice(1); setFormData({...formData, breed: newBreed}); setOpenBreed(false); }}>
                                  <Plus size={14} /> Usar "{breedSearch}"
                               </div>
                             ) : "No encontrado"}
                          </CommandEmpty>
                          <CommandGroup heading="Razas Existentes">
                            {breeds.map((breed) => (
                              <CommandItem key={breed} value={breed} onSelect={(currentValue) => { const originalValue = breeds.find(b => b.toLowerCase() === currentValue.toLowerCase()) || currentValue; setFormData({...formData, breed: originalValue}); setOpenBreed(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", formData.breed === breed ? "opacity-100" : "opacity-0")} />
                                {breed}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
               </div>
               <div className="space-y-1"><Label htmlFor="color">Color</Label><Input id="color" name="color" placeholder="Ej. Blanco" value={formData.color} onChange={handleChange} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1"><Label>Tamaño</Label><Select onValueChange={(val) => handleSelectChange('size', val)} defaultValue="Chico"><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Chico">Chico</SelectItem><SelectItem value="Mediano">Mediano</SelectItem><SelectItem value="Grande">Grande</SelectItem><SelectItem value="Gigante">Gigante</SelectItem></SelectContent></Select></div>
               <div className="space-y-1"><Label htmlFor="birth_date">Nacimiento</Label><Input id="birth_date" name="birth_date" type="date" value={formData.birth_date} onChange={handleChange} /></div>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100 my-2" />

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
           <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Syringe className={formData.is_vaccined ? "text-green-500" : "text-slate-400"} size={20} /><div><Label htmlFor="is_vaccined" className="font-bold text-slate-700 block">¿Vacunación Vigente?</Label><span className="text-xs text-slate-500">¿Cuenta con esquema completo?</span></div></div><Switch id="is_vaccined" checked={formData.is_vaccined} onCheckedChange={(val) => handleSwitchChange('is_vaccined', val)} /></div>
           {!formData.is_vaccined && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm"><AlertTriangle size={18} className="shrink-0 mt-0.5" /><div><strong>Advertencia de Admisión:</strong><p>La mascota debe cumplir con su esquema de vacunación.</p></div></div>}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Salud y Comportamiento</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"><Label htmlFor="has_allergies" className="cursor-pointer">¿Tiene Alergias?</Label><Switch id="has_allergies" checked={formData.has_allergies} onCheckedChange={(val) => handleSwitchChange('has_allergies', val)} /></div>
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"><Label htmlFor="has_illness" className="cursor-pointer">¿Enfermedades?</Label><Switch id="has_illness" checked={formData.has_illness} onCheckedChange={(val) => handleSwitchChange('has_illness', val)} /></div>
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"><Label htmlFor="has_conditions" className="cursor-pointer">¿Condición Especial?</Label><Switch id="has_conditions" checked={formData.has_conditions} onCheckedChange={(val) => handleSwitchChange('has_conditions', val)} /></div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50/50 border-blue-100">
               <div className="flex items-center gap-2">
                  <Label htmlFor="is_senior" className="cursor-pointer">¿Es Senior? (+7 años)</Label>
                  {formData.is_senior && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded">Auto</span>}
               </div>
               <Switch id="is_senior" checked={formData.is_senior} onCheckedChange={(val) => handleSwitchChange('is_senior', val)} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
               <div className="flex items-center gap-2">
                  {formData.is_aggressive && <Skull size={14} className="text-red-500"/>}
                  <Label htmlFor="is_aggressive" className="cursor-pointer">¿Es Agresivo?</Label>
               </div>
               <Switch id="is_aggressive" checked={formData.is_aggressive} onCheckedChange={(val) => handleSwitchChange('is_aggressive', val)} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
               <div className="flex items-center gap-2">
                  {formData.is_nervous && <HeartPulse size={14} className="text-orange-500"/>}
                  <Label htmlFor="is_nervous" className="cursor-pointer">¿Es Nervioso?</Label>
               </div>
               <Switch id="is_nervous" checked={formData.is_nervous} onCheckedChange={(val) => handleSwitchChange('is_nervous', val)} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
               <div className="flex items-center gap-2">
                  {formData.is_noisereactive && <Volume2 size={14} className="text-purple-500"/>}
                  <Label htmlFor="is_noisereactive" className="cursor-pointer">¿Sensible a Ruidos?</Label>
               </div>
               <Switch id="is_noisereactive" checked={formData.is_noisereactive} onCheckedChange={(val) => handleSwitchChange('is_noisereactive', val)} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
               <div className="flex items-center gap-2">
                  <Users size={14} className="text-green-500"/>
                  <Label htmlFor="convive" className="cursor-pointer">¿Convive con otros?</Label>
               </div>
               <Switch id="convive" checked={formData.convive} onCheckedChange={(val) => handleSwitchChange('convive', val)} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 sm:col-span-2">
               <div className="flex items-center gap-2">
                  <Bone size={14} className="text-amber-600"/>
                  <Label htmlFor="treats" className="cursor-pointer">¿Se le pueden dar Premios?</Label>
               </div>
               <Switch id="treats" checked={formData.treats} onCheckedChange={(val) => handleSwitchChange('treats', val)} />
            </div>
          </div>
        </div>

        <div className="space-y-2"><Label htmlFor="notes">Comentarios Adicionales / Notas</Label><Textarea id="notes" name="notes" placeholder="Detalles..." value={formData.notes} onChange={handleChange} className="h-20" /></div>

        <DialogFooter className="pt-4 sticky bottom-0 bg-white border-t border-slate-100 mt-6 z-10">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white min-w-[140px]">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar Expediente
          </Button>
        </DialogFooter>
      </form>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
            <Plus size={16} /> Agregar Mascota
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Expediente de Mascota</DialogTitle>
          <DialogDescription>Llenado de cuestionario operativo y carga de foto.</DialogDescription>
        </DialogHeader>
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
}