'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Pencil, Check, X, Trash2, Loader2, Scissors, Droplets, Sparkles, Box, Plus, ArchiveRestore, Power 
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Tipos ---
interface Service {
  id: string;
  name: string;
  category: 'cut' | 'bath' | 'addon' | 'general';
  base_price: number;
  duration_minutes: number;
  active: boolean; 
}

const getCategoryInfo = (cat: string) => {
    switch(cat) {
        case 'cut': return { label: 'Corte', icon: Scissors, color: 'bg-purple-100 text-purple-700 border-purple-200' };
        case 'bath': return { label: 'Baño', icon: Droplets, color: 'bg-cyan-100 text-cyan-700 border-cyan-200' };
        case 'addon': return { label: 'Adicional', icon: Sparkles, color: 'bg-amber-100 text-amber-800 border-amber-200' };
        default: return { label: 'General', icon: Box, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
};

export default function ServicesManagement() {
  const supabase = createClient();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Service | null>(null);

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('active', { ascending: false }) 
        .order('category', { ascending: true }) 
        .order('name', { ascending: true });
        
    if (error) {
        toast.error("Error al cargar servicios");
    } else {
        setServices(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const startEditing = (service: Service) => {
    setEditingId(service.id);
    setEditForm({ ...service }); 
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleInputChange = (field: keyof Service, value: any) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: value });
  };

  const saveService = async () => {
    if (!editForm) return;

    if (!editForm.name.trim()) return toast.error("El nombre es obligatorio");
    if (editForm.base_price < 0) return toast.error("El precio no puede ser negativo");

    const updatePromise = async () => {
        const { error } = await supabase
            .from('services')
            .update({
                name: editForm.name,
                category: editForm.category,
                base_price: editForm.base_price,
                duration_minutes: editForm.duration_minutes,
                active: editForm.active 
            })
            .eq('id', editForm.id);
            
        if (error) throw new Error(error.message);
        return true;
    };

    toast.promise(updatePromise(), {
        loading: 'Guardando cambios...',
        success: () => {
            setServices(prev => prev.map(s => s.id === editForm.id ? editForm : s));
            setEditingId(null);
            setEditForm(null);
            return 'Servicio actualizado correctamente';
        },
        error: (err) => `Error al actualizar: ${err.message}`
    });
  };

  const toggleActiveStatus = async (service: Service) => {
      const newState = !service.active;
      const actionLabel = newState ? "reactivar" : "desactivar";

      setServices(prev => prev.map(s => s.id === service.id ? { ...s, active: newState } : s));

      const { error } = await supabase
        .from('services')
        .update({ active: newState })
        .eq('id', service.id);
        
      if(error) {
          setServices(prev => prev.map(s => s.id === service.id ? { ...s, active: service.active } : s));
          toast.error(`Error al ${actionLabel}: ` + error.message);
      } else {
          toast.success(`Servicio ${newState ? 'activado' : 'desactivado'}`);
      }
  };

  const createNewService = async () => {
      const newService = {
          name: "Nuevo Servicio",
          category: 'general',
          base_price: 0,
          duration_minutes: 30,
          active: true
      };
      
      const { data, error } = await supabase.from('services').insert(newService).select().single();
      
      if(error) {
          toast.error("Error al crear: " + error.message);
      } else {
          setServices([data, ...services]);
          startEditing(data);
          toast.success("Servicio creado.");
      }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
        <div>
            <h2 className="text-lg font-bold text-slate-800">Catálogo de Servicios</h2>
            <p className="text-sm text-slate-500">Administra precios y visibilidad.</p>
        </div>
        <Button onClick={createNewService} className="bg-slate-900 text-white hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-2"/> Nuevo Servicio
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[80px]">Estado</TableHead>
              <TableHead className="w-[250px]">Nombre del Servicio</TableHead>
              <TableHead className="w-[180px]">Categoría</TableHead>
              <TableHead className="w-[120px]">Precio ($)</TableHead>
              <TableHead className="w-[120px]">Duración (min)</TableHead>
              <TableHead className="text-right w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="animate-spin inline mr-2"/> Cargando...</TableCell></TableRow>
            ) : services.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No hay servicios.</TableCell></TableRow>
            ) : (
                services.map((service) => {
                    const isEditing = editingId === service.id;
                    const catInfo = getCategoryInfo(isEditing ? (editForm?.category || 'general') : service.category);
                    const CatIcon = catInfo.icon;
                    const isActive = isEditing ? editForm?.active : service.active;

                    return (
                        <TableRow 
                            key={service.id} 
                            className={cn(
                                "group transition-colors border-b last:border-0", 
                                isEditing ? "bg-purple-50/40" : "hover:bg-slate-50",
                                !isActive && !isEditing && "opacity-60 bg-slate-50/50 grayscale-[0.5]"
                            )}
                        >
                            <TableCell>
                                {isEditing ? (
                                    <div className="flex items-center gap-2" title={editForm?.active ? "Activo" : "Inactivo"}>
                                        <input 
                                            type="checkbox" 
                                            checked={editForm?.active}
                                            onChange={(e) => handleInputChange('active', e.target.checked)}
                                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer accent-purple-600"
                                        />
                                        <span className="text-[10px] uppercase font-bold text-slate-500">{editForm?.active ? 'ON' : 'OFF'}</span>
                                    </div>
                                ) : (
                                    <Badge variant="outline" className={cn("border-0 px-2 py-0.5 text-[10px] font-bold", isActive ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500")}>
                                        {isActive ? 'ACTIVO' : 'INACTIVO'}
                                    </Badge>
                                )}
                            </TableCell>

                            <TableCell className="font-medium">
                                {isEditing ? (
                                    <Input value={editForm?.name} onChange={(e) => handleInputChange('name', e.target.value)} className="h-8 font-bold border-purple-300"/>
                                ) : (
                                    <span className={cn("text-slate-700", !isActive && "line-through decoration-slate-400")}>{service.name}</span>
                                )}
                            </TableCell>

                            <TableCell>
                                {isEditing ? (
                                    <Select value={editForm?.category} onValueChange={(val) => handleInputChange('category', val)}>
                                        <SelectTrigger className="h-8 border-purple-300"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cut">Corte</SelectItem>
                                            <SelectItem value="bath">Baño</SelectItem>
                                            <SelectItem value="addon">Adicional</SelectItem>
                                            <SelectItem value="general">General</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded border w-fit text-xs font-medium", catInfo.color)}>
                                        <CatIcon size={12} /> {catInfo.label}
                                    </div>
                                )}
                            </TableCell>

                            <TableCell>
                                {isEditing ? (
                                    <Input type="number" value={editForm?.base_price} onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value))} className="h-8 w-24 border-purple-300"/>
                                ) : (
                                    <span className="font-mono text-slate-600 font-bold">${service.base_price.toFixed(2)}</span>
                                )}
                            </TableCell>

                            <TableCell>
                                {isEditing ? (
                                    <div className="flex items-center gap-1">
                                        <Input type="number" value={editForm?.duration_minutes} onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value))} className="h-8 w-20 border-purple-300"/>
                                        <span className="text-xs text-slate-400">min</span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{service.duration_minutes} min</span>
                                )}
                            </TableCell>

                            <TableCell className="text-right">
                                {isEditing ? (
                                    <div className="flex justify-end gap-1">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={cancelEditing}><X size={16} /></Button>
                                        <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={saveService}><Check size={16} /></Button>
                                    </div>
                                ) : (
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-purple-600 hover:bg-purple-50" onClick={() => startEditing(service)}>
                                            <Pencil size={14} />
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className={cn("h-8 w-8 transition-colors", isActive ? "text-slate-300 hover:text-red-500 hover:bg-red-50" : "text-green-500 hover:text-green-700 hover:bg-green-50")} 
                                            onClick={() => toggleActiveStatus(service)}
                                            title={isActive ? "Desactivar" : "Reactivar"}
                                        >
                                            {isActive ? <Power size={14} /> : <ArchiveRestore size={14} />}
                                        </Button>
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    );
                })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}