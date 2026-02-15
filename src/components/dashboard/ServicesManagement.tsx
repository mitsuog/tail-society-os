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
  Pencil, Check, X, Loader2, Scissors, Droplets, Sparkles, Box, Plus, ArchiveRestore, Power 
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Tipos ---
interface Service {
  id: string;
  name: string;
  category: 'cut' | 'bath' | 'addon' | 'spa' | 'general'; // Agregué 'spa' por el seed anterior
  base_price: number;
  duration_minutes: number;
  active: boolean; 
}

const getCategoryInfo = (cat: string) => {
    switch(cat) {
        case 'cut': return { label: 'Corte', icon: Scissors, color: 'bg-purple-100 text-purple-700 border-purple-200' };
        case 'bath': return { label: 'Baño', icon: Droplets, color: 'bg-cyan-100 text-cyan-700 border-cyan-200' };
        case 'addon': return { label: 'Adicional', icon: Sparkles, color: 'bg-amber-100 text-amber-800 border-amber-200' };
        case 'spa': return { label: 'Spa', icon: Sparkles, color: 'bg-pink-100 text-pink-800 border-pink-200' };
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
        // Aseguramos el tipo correcto al recibir datos
        setServices((data as Service[]) || []);
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

  // --- CORRECCIÓN PRINCIPAL: CANCELAR ---
  const cancelEditing = () => {
    // Si estábamos editando un servicio "nuevo" (temporal), lo eliminamos de la lista visual
    if (editingId && editingId.startsWith('temp-')) {
        setServices(prev => prev.filter(s => s.id !== editingId));
    }
    setEditingId(null);
    setEditForm(null);
  };

  const handleInputChange = (field: keyof Service, value: any) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: value });
  };

  // --- CORRECCIÓN PRINCIPAL: GUARDAR ---
  const saveService = async () => {
    if (!editForm) return;

    if (!editForm.name.trim()) return toast.error("El nombre es obligatorio");
    if (editForm.base_price < 0) return toast.error("El precio no puede ser negativo");

    const isNew = editForm.id.startsWith('temp-');

    const updatePromise = async () => {
        if (isNew) {
            // INSERTAR (Crear nuevo)
            // Eliminamos el ID temporal para que Supabase genere uno real
            const { id, ...payload } = editForm;
            
            const { data, error } = await supabase
                .from('services')
                .insert(payload)
                .select()
                .single();

            if (error) throw new Error(error.message);
            
            // Reemplazamos el item temporal con el real de la DB
            setServices(prev => prev.map(s => s.id === editForm.id ? (data as Service) : s));
            return 'Servicio creado correctamente';
        } else {
            // ACTUALIZAR (Existente)
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
            
            // Actualizamos el estado local
            setServices(prev => prev.map(s => s.id === editForm.id ? editForm : s));
            return 'Servicio actualizado correctamente';
        }
    };

    toast.promise(updatePromise(), {
        loading: 'Guardando...',
        success: (msg) => {
            setEditingId(null);
            setEditForm(null);
            return msg;
        },
        error: (err) => `Error: ${err.message}`
    });
  };

  const toggleActiveStatus = async (service: Service) => {
      // Evitar activar/desactivar items temporales no guardados
      if (service.id.startsWith('temp-')) return;

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

  // --- CORRECCIÓN PRINCIPAL: CREAR ---
  const createNewService = () => {
      // 1. Generamos un ID temporal
      const tempId = `temp-${Date.now()}`;
      
      // 2. Creamos el objeto solo en memoria (Local State)
      const newService: Service = {
          id: tempId,
          name: "",
          category: 'general',
          base_price: 0,
          duration_minutes: 30,
          active: true
      };
      
      // 3. Lo agregamos al inicio de la lista visual
      setServices([newService, ...services]);
      
      // 4. Iniciamos edición inmediatamente
      startEditing(newService);
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
                                    <Input 
                                        value={editForm?.name} 
                                        onChange={(e) => handleInputChange('name', e.target.value)} 
                                        className="h-8 font-bold border-purple-300"
                                        placeholder="Nombre del servicio..."
                                        autoFocus
                                    />
                                ) : (
                                    <span className={cn("text-slate-700", !isActive && "line-through decoration-slate-400")}>{service.name || 'Sin nombre'}</span>
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
                                                <SelectItem value="spa">Spa</SelectItem>
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