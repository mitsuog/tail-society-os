'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createEmployee } from '@/app/actions/staff-actions';

export default function AddStaffDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'Estilista',
    show_in_calendar: true, // Por defecto se ve en agenda
    color: '#3b82f6'
  });

  const handleSubmit = async () => {
    if (!data.first_name || !data.role) return toast.error("Nombre y puesto requeridos");
    setLoading(true);
    try {
      await createEmployee(data);
      toast.success("Empleado creado exitosamente");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-slate-500" /> Nuevo Colaborador
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={data.first_name} onChange={e => setData({...data, first_name: e.target.value})} placeholder="Ej. Ana" />
            </div>
            <div className="space-y-2">
                <Label>Apellido</Label>
                <Input value={data.last_name} onChange={e => setData({...data, last_name: e.target.value})} placeholder="Ej. López" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Email</Label>
                <Input value={data.email} onChange={e => setData({...data, email: e.target.value})} placeholder="correo@ejemplo.com" />
            </div>
            <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={data.phone} onChange={e => setData({...data, phone: e.target.value})} placeholder="55 1234 5678" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
                <Label>Puesto / Rol</Label>
                <Select value={data.role} onValueChange={(val) => setData({...data, role: val})}>
                    <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Estilista">Estilista (Groomer)</SelectItem>
                        <SelectItem value="Bañador">Bañador</SelectItem>
                        <SelectItem value="Recepción">Recepción</SelectItem>
                        <SelectItem value="Gerencia">Gerencia</SelectItem>
                        <SelectItem value="Limpieza">Limpieza</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                 <Label>Color Agenda</Label>
                 <div className="flex gap-2">
                    {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map(c => (
                        <div key={c} 
                            onClick={() => setData({...data, color: c})}
                            className={`w-6 h-6 rounded-full cursor-pointer border-2 ${data.color === c ? 'border-slate-900' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                 </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100 mt-2">
             <div className="space-y-0.5">
                <Label className="text-base">Mostrar en Agenda</Label>
                <p className="text-xs text-slate-500">Si se desactiva, no aparecerá para agendar citas.</p>
             </div>
             <Switch checked={data.show_in_calendar} onCheckedChange={(v) => setData({...data, show_in_calendar: v})} />
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}