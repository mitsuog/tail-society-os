'use client';

import { useState, useEffect, useRef } from 'react';
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
import { toast } from "sonner";
import { Loader2, Save, Camera, AlertTriangle, Syringe, Bone, Volume2, Users, HeartPulse, Skull, Stethoscope, Activity, Crop, X, Check } from 'lucide-react';
import { cn } from "@/lib/utils";
// ELIMINADO: import heic2any from "heic2any"; (Causaba el error)
import Cropper from 'react-easy-crop'; 

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  size: string | null;
  birth_date: string | null;
  photo_url: string | null;
  status: string;
  is_vaccined: boolean;
  has_allergies: boolean;
  has_illness: boolean;
  has_conditions: boolean;
  is_senior: boolean;
  is_aggressive: boolean;
  is_nervous: boolean;
  is_noisereactive: boolean;
  convive: boolean;
  treats: boolean;
  notes: string | null;
  vet_name: string | null;
  vet_phone: string | null;
  last_vaccine_date: string | null;
  medical_notes: string | null;
}

interface EditPetDialogProps {
  pet: Pet;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}

// --- UTILIDAD: CANVAS PARA RECORTAR IMAGEN ---
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
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.9);
  });
}

const cleanUrl = (url: string | null) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const match = url.match(/\((https?:\/\/[^)]+)\)/);
  if (match) return match[1];
  const httpIndex = url.indexOf('http');
  if (httpIndex > 0) return url.substring(httpIndex);
  return '';
};

export default function EditPetDialog({ pet, open, onOpenChange }: EditPetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [conversionStatus, setConversionStatus] = useState<string>("");
  
  // ESTADOS DEL CROPPER
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: pet.name || '',
    species: pet.species || 'Perro',
    breed: pet.breed || '',
    color: pet.color || '',
    size: pet.size || 'Chico',
    birth_date: pet.birth_date || '',
    photo_url: cleanUrl(pet.photo_url),
    status: pet.status || 'active',
    is_vaccined: pet.is_vaccined || false,
    has_allergies: pet.has_allergies || false,
    has_illness: pet.has_illness || false,
    has_conditions: pet.has_conditions || false,
    is_senior: pet.is_senior || false,
    is_aggressive: pet.is_aggressive || false,
    is_nervous: pet.is_nervous || false,
    is_noisereactive: pet.is_noisereactive || false,
    convive: pet.convive || false,
    treats: pet.treats || false,
    notes: pet.notes || '',
    vet_name: pet.vet_name || '',
    vet_phone: pet.vet_phone || '',
    last_vaccine_date: pet.last_vaccine_date || '',
    medical_notes: pet.medical_notes || ''
  });

  useEffect(() => {
    const cleaned = cleanUrl(pet.photo_url);
    setPreviewUrl(cleaned || null);
    setImageToCrop(null);
    setZoom(1);

    setFormData({
        name: pet.name || '',
        species: pet.species || 'Perro',
        breed: pet.breed || '',
        color: pet.color || '',
        size: pet.size || 'Chico',
        birth_date: pet.birth_date || '',
        photo_url: cleaned,
        status: pet.status || 'active',
        is_vaccined: pet.is_vaccined || false,
        has_allergies: pet.has_allergies || false,
        has_illness: pet.has_illness || false,
        has_conditions: pet.has_conditions || false,
        is_senior: pet.is_senior || false,
        is_aggressive: pet.is_aggressive || false,
        is_nervous: pet.is_nervous || false,
        is_noisereactive: pet.is_noisereactive || false,
        convive: pet.convive || false,
        treats: pet.treats || false,
        notes: pet.notes || '',
        vet_name: pet.vet_name || '',
        vet_phone: pet.vet_phone || '',
        last_vaccine_date: pet.last_vaccine_date || '',
        medical_notes: pet.medical_notes || ''
    });
  }, [pet, open]);

  // --- FUNCIÓN BLINDADA PARA CONVERTIR HEIC ---
  const convertHeicToJpg = async (file: File): Promise<File> => {
    const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                   file.name.toLowerCase().endsWith('.heif') ||
                   file.type === 'image/heic' || 
                   file.type === 'image/heif';

    if (!isHeic) return file;
    setConversionStatus("Procesando formato iPhone...");
    
    try {
      // AQUÍ ESTÁ EL ARREGLO: IMPORTACIÓN DINÁMICA
      // Solo carga la librería cuando estamos en el navegador y realmente la necesitamos.
      const heic2any = (await import("heic2any")).default;

      const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.7 });
      const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      return new File([finalBlob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
    } catch (error) {
      console.error("Fallo conversión HEIC:", error);
      throw new Error("Error procesando imagen. Intenta con otra.");
    }
  };

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    let file = e.target.files[0];
    
    try {
      file = await convertHeicToJpg(file);
      
      const objectUrl = URL.createObjectURL(file);
      setImageToCrop(objectUrl);
      setConversionStatus("");

    } catch (error: any) {
      toast.error(error.message);
      setConversionStatus("");
    }
    e.target.value = '';
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const uploadCroppedImage = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    
    try {
      setUploading(true);
      setConversionStatus("Recortando y subiendo...");

      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const fileName = `${pet.id}-${Date.now()}.jpg`;
      const croppedFile = new File([croppedBlob], fileName, { type: "image/jpeg" });

      const { error: uploadError } = await supabase.storage
        .from('pet-photos')
        .upload(fileName, croppedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('pet-photos').getPublicUrl(fileName);
      const finalUrl = `${data.publicUrl}?t=${Date.now()}`;
      
      setFormData(prev => ({ ...prev, photo_url: finalUrl }));
      setPreviewUrl(finalUrl); 
      setImageToCrop(null); 
      
      toast.success("Foto actualizada correctamente");

    } catch (error: any) {
      console.error(error);
      toast.error("Error al guardar recorte: " + error.message);
    } finally {
      setUploading(false);
      setConversionStatus("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };
  const handleSelectChange = (name: string, value: string) => { setFormData({ ...formData, [name]: value }); };
  const handleSwitchChange = (name: string, checked: boolean) => { setFormData({ ...formData, [name]: checked }); };

  const handleSubmit = async (e?: any) => { 
    if (e && e.preventDefault) e.preventDefault(); 
    setLoading(true);
    try {
      const { error } = await supabase.from('pets').update({
            name: formData.name, species: formData.species, breed: formData.breed, color: formData.color,
            size: formData.size, birth_date: formData.birth_date || null, photo_url: formData.photo_url || null, status: formData.status,
            is_vaccined: formData.is_vaccined, has_allergies: formData.has_allergies, has_illness: formData.has_illness, has_conditions: formData.has_conditions,
            is_senior: formData.is_senior, is_aggressive: formData.is_aggressive, is_nervous: formData.is_nervous, is_noisereactive: formData.is_noisereactive,
            convive: formData.convive, treats: formData.treats, notes: formData.notes || null, vet_name: formData.vet_name || null, vet_phone: formData.vet_phone || null,
            last_vaccine_date: formData.last_vaccine_date || null, medical_notes: formData.medical_notes || null
        }).eq('id', pet.id);

      if (error) throw error;
      toast.success("Mascota guardada");
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto z-[100]">
        <DialogHeader>
          <DialogTitle>Editar Expediente de {pet.name}</DialogTitle>
          <DialogDescription>Actualiza la información médica y de comportamiento.</DialogDescription>
        </DialogHeader>

        {imageToCrop ? (
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
               <input
                 type="range"
                 value={zoom}
                 min={1}
                 max={3}
                 step={0.1}
                 onChange={(e) => setZoom(Number(e.target.value))}
                 className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
               />
            </div>

            <div className="flex justify-end gap-2 mt-2">
               <Button variant="outline" onClick={() => setImageToCrop(null)} disabled={uploading}>
                 <X size={16} className="mr-2"/> Cancelar
               </Button>
               <Button onClick={uploadCroppedImage} disabled={uploading} className="bg-slate-900 text-white">
                 {uploading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Check size={16} className="mr-2"/>}
                 Confirmar Recorte
               </Button>
            </div>
            {uploading && <p className="text-center text-xs text-slate-500 animate-pulse">{conversionStatus}</p>}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 py-2">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col items-center gap-3">
                 <div className="w-32 h-32 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group hover:border-blue-400 transition-colors">
                    
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="text-slate-300 h-10 w-10 group-hover:text-blue-400 transition-colors" />
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer">
                        <Crop size={24} className="mb-1"/>
                        <span className="text-[10px] font-bold">Recortar</span>
                    </div>

                    <input type="file" accept="image/*, .heic, .heif" className="absolute inset-0 opacity-0 cursor-pointer" onChange={onFileSelect} />
                 </div>
                 <p className="text-[10px] text-slate-400">Clic para subir y recortar</p>
                 {conversionStatus && <span className="text-[9px] text-blue-600 animate-pulse">{conversionStatus}</span>}
              </div>

              <div className="flex-1 space-y-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-2">
                   <div className="space-y-1">
                      <Label className="flex items-center gap-2 text-slate-700"><Activity size={14}/> Estatus de Vida / Actividad</Label>
                      <Select onValueChange={(val) => handleSelectChange('status', val)} value={formData.status}>
                        <SelectTrigger className={cn("font-medium border-slate-300", formData.status === 'active' ? "text-green-600" : formData.status === 'deceased' ? "text-slate-900 bg-slate-200" : "text-slate-500")}>
                          <SelectValue/>
                        </SelectTrigger>
                        <SelectContent className="z-[200]">
                          <SelectItem value="active">Activo (Vigente)</SelectItem>
                          <SelectItem value="deceased">Fallecido (Deceso)</SelectItem>
                          <SelectItem value="inactive">Baja (Regalado / Ya no viene)</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1"><Label>Nombre</Label><Input name="name" required value={formData.name} onChange={handleChange} /></div>
                   <div className="space-y-1"><Label>Especie</Label><Select onValueChange={(val) => handleSelectChange('species', val)} value={formData.species}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent className="z-[200]"><SelectItem value="Perro">Perro</SelectItem><SelectItem value="Gato">Gato</SelectItem></SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Raza</Label><Input name="breed" value={formData.breed} onChange={handleChange} /></div><div className="space-y-1"><Label>Color</Label><Input name="color" value={formData.color} onChange={handleChange} /></div></div>
                <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Tamaño</Label><Select onValueChange={(val) => handleSelectChange('size', val)} value={formData.size}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent className="z-[200]"><SelectItem value="Chico">Chico</SelectItem><SelectItem value="Mediano">Mediano</SelectItem><SelectItem value="Grande">Grande</SelectItem><SelectItem value="Gigante">Gigante</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Nacimiento</Label><Input name="birth_date" type="date" value={formData.birth_date} onChange={handleChange} /></div></div>
              </div>
            </div>
            
            <div className="h-px bg-slate-100 my-2" />
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
               <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Syringe className={formData.is_vaccined ? "text-green-500" : "text-slate-400"} size={20} /><div><Label className="font-bold text-slate-700">¿Vacunación Vigente?</Label></div></div><Switch checked={formData.is_vaccined} onCheckedChange={(val) => handleSwitchChange('is_vaccined', val)} /></div>
               {!formData.is_vaccined && <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-md text-red-800 text-xs"><AlertTriangle size={14} className="shrink-0 mt-0.5" /><p>Advertencia: Se requiere esquema de vacunación completo para el servicio.</p></div>}
            </div>

            <div className="space-y-3">
               <h4 className="text-xs font-bold text-slate-500 uppercase">Salud y Comportamiento</h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-2 border rounded"><Label>¿Alergias?</Label><Switch checked={formData.has_allergies} onCheckedChange={(v)=>handleSwitchChange('has_allergies',v)}/></div>
                  <div className="flex items-center justify-between p-2 border rounded"><Label>¿Agresivo?</Label><Switch checked={formData.is_aggressive} onCheckedChange={(v)=>handleSwitchChange('is_aggressive',v)}/></div>
                  <div className="flex items-center justify-between p-2 border rounded"><Label>¿Enfermedades?</Label><Switch checked={formData.has_illness} onCheckedChange={(v)=>handleSwitchChange('has_illness',v)}/></div>
                  <div className="flex items-center justify-between p-2 border rounded"><Label>¿Condición?</Label><Switch checked={formData.has_conditions} onCheckedChange={(v)=>handleSwitchChange('has_conditions',v)}/></div>
                  <div className="flex items-center justify-between p-2 border rounded bg-blue-50/50"><Label>¿Senior?</Label><Switch checked={formData.is_senior} onCheckedChange={(v)=>handleSwitchChange('is_senior',v)}/></div>
                  <div className="flex items-center justify-between p-2 border rounded"><Label>¿Nervioso?</Label><Switch checked={formData.is_nervous} onCheckedChange={(v)=>handleSwitchChange('is_nervous',v)}/></div>
                  <div className="flex items-center justify-between p-2 border rounded"><Label>¿Ruido?</Label><Switch checked={formData.is_noisereactive} onCheckedChange={(v)=>handleSwitchChange('is_noisereactive',v)}/></div>
                  <div className="flex items-center justify-between p-2 border rounded"><Label>¿Convive?</Label><Switch checked={formData.convive} onCheckedChange={(v)=>handleSwitchChange('convive',v)}/></div>
                  <div className="flex items-center justify-between p-2 border rounded sm:col-span-2"><Label>¿Premios?</Label><Switch checked={formData.treats} onCheckedChange={(v)=>handleSwitchChange('treats',v)}/></div>
               </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1 flex items-center gap-2"><Stethoscope size={14} /> Veterinario (Opcional)</h4>
              <div className="grid grid-cols-2 gap-4"><Input placeholder="Nombre del Dr." name="vet_name" value={formData.vet_name} onChange={handleChange} /><Input placeholder="Teléfono Clínica" name="vet_phone" type="tel" value={formData.vet_phone} onChange={handleChange} /></div>
            </div>

            <div className="space-y-2"><Label>Notas</Label><Textarea name="notes" value={formData.notes} onChange={handleChange} className="h-20" /></div>

            <DialogFooter className="pt-4 border-t sticky bottom-0 bg-white z-10">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="bg-slate-900 text-white min-w-[140px]">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}