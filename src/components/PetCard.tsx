'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dog, Cat, Syringe, AlertTriangle, Edit2, Trash2, Cross, Eye 
} from 'lucide-react';
import EditPetDialog from './EditPetDialog';
import DeleteAlert from './DeleteAlert'; 
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

interface Pet {
  id: string;
  client_id: string;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  size: string | null;
  birth_date: string | null;
  photo_url: string | null;
  status: string; 
  waiver_signed: boolean;
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

interface PetCardProps {
  pet: Pet;
  clientId: string;
  isActive: boolean;
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

export default function PetCard({ pet, clientId, isActive }: PetCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [showDetail, setShowDetail] = useState(false); // Usamos este estado para el Dialog

  const getAge = (dateString: string | null) => {
    if (!dateString) return '';
    const birth = new Date(dateString);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    return years > 0 ? `${years} años` : `${months} meses`;
  };

  // 1. CLIC SIMPLE: Seleccionar/Filtrar
  const handleCardClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (isActive) {
      params.delete('pet_id');
    } else {
      params.set('pet_id', pet.id);
    }
    router.push(`/clients/${clientId}?${params.toString()}`);
  };

  // 2. ABRIR DETALLE
  const handleOpenDetail = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Evita que se active el filtro al dar click al botón
    setShowDetail(true);
  };

  const handleDeletePet = async () => {
    const { error } = await supabase.from('pets').delete().eq('id', pet.id);
    if (error) {
      toast.error("Error al eliminar mascota: " + error.message);
    } else {
      toast.success(`${pet.name} eliminado correctamente.`);
      if (isActive) {
         router.push(`/clients/${clientId}`);
      } else {
         router.refresh();
      }
    }
  };

  const SpeciesIcon = pet.species === 'Gato' ? Cat : Dog;
  const isDeceased = pet.status === 'deceased';
  const isInactive = pet.status === 'inactive';
  const safePhotoUrl = cleanUrl(pet.photo_url);

  return (
    <>
      <Card 
        onClick={handleCardClick}
        onDoubleClick={handleOpenDetail} // DOBLE CLIC: Abre el detalle
        className={cn(
          "relative flex items-center p-3 gap-3 cursor-pointer transition-all duration-200 border group overflow-hidden select-none",
          isActive 
            ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300 shadow-md' 
            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm',
          isDeceased && "grayscale bg-slate-50 border-slate-400 opacity-90",
          isInactive && "opacity-60 bg-slate-50 border-dashed"
        )}
      >
        {/* FOTO */}
        <div className="shrink-0 relative h-16 w-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
          {safePhotoUrl ? (
            <Image 
              src={safePhotoUrl} 
              alt={pet.name} 
              fill 
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="flex items-center justify-center h-full w-full text-slate-300">
               <SpeciesIcon size={32} />
            </div>
          )}
          
          {isDeceased && (
            <div className="absolute top-0 right-0 bg-black text-white p-0.5 rounded-bl-lg shadow-sm z-10">
                <Cross size={10} strokeWidth={3} />
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="flex-1 min-w-0 space-y-1">
           <div className="flex justify-between items-start">
              <div>
                <h4 className={cn("text-sm font-bold truncate flex items-center gap-2", isActive && "text-blue-700", isDeceased && "line-through text-slate-500")}>
                  {pet.name}
                  {isDeceased && <span className="text-[9px] no-underline bg-black text-white px-1.5 py-0 rounded">QEPD</span>}
                  {isInactive && <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0 rounded">Baja</span>}
                </h4>
                <p className="text-xs text-slate-500 truncate">
                  {pet.breed || 'Mestizo'} {pet.birth_date && `• ${getAge(pet.birth_date)}`}
                </p>
              </div>
           </div>

           <div className="flex flex-wrap gap-1 mt-1">
              {!pet.is_vaccined && !isDeceased && <Badge variant="destructive" className="h-4 px-1 text-[9px]"><Syringe size={8} className="mr-1"/> Vacunas</Badge>}
              {pet.is_aggressive && <Badge variant="destructive" className="h-4 px-1 text-[9px]"><AlertTriangle size={8} className="mr-1"/> Agresivo</Badge>}
              {pet.has_allergies && <Badge className="bg-amber-100 text-amber-700 h-4 px-1 text-[9px]"><AlertTriangle size={8} className="mr-1"/> Alergia</Badge>}
           </div>
        </div>

        {/* ACCIONES (Hover) */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            
            {/* BOTÓN VER DETALLE (NUEVO) */}
            <Button 
              variant="secondary" 
              size="icon" 
              className="h-7 w-7 bg-white/90 hover:bg-blue-50 text-slate-500 hover:text-blue-600 shadow-sm border border-slate-100"
              onClick={handleOpenDetail}
              title="Ver Ficha / Editar"
            >
              <Eye size={12} />
            </Button>

            {/* BOTÓN EDITAR (REDUNDANTE PERO ÚTIL) */}
            <Button 
              variant="secondary" 
              size="icon" 
              className="h-7 w-7 bg-white/90 hover:bg-white text-slate-500 hover:text-slate-700 shadow-sm border border-slate-100"
              onClick={handleOpenDetail}
            >
              <Edit2 size={12} />
            </Button>

            {/* BOTÓN ELIMINAR */}
            <div onClick={(e) => e.stopPropagation()}>
               <DeleteAlert 
                  title={`¿Eliminar a ${pet.name}?`}
                  description="Se eliminará la ficha y su historial. Usar solo si fue error de dedo. Si falleció, cambia su estatus en Editar."
                  onConfirm={handleDeletePet}
                  trigger={
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-7 w-7 bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-600 shadow-sm border border-slate-100"
                    >
                      <Trash2 size={12} />
                    </Button>
                  }
               />
            </div>
         </div>
      </Card>

      {/* DIALOGO DE EDICIÓN/DETALLE */}
      {showDetail && (
        <EditPetDialog 
          pet={pet} 
          open={showDetail} 
          onOpenChange={setShowDetail} 
        />
      )}
    </>
  );
}