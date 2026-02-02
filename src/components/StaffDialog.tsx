'use client';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    // Colores automáticos por rol para el calendario
    const role = formData.get('role') as string;
    let color = '#94a3b8'; // Gris default
    if(role === 'stylist') color = '#a855f7'; // Morado
    if(role === 'finisher') color = '#3b82f6'; // Azul
    if(role === 'bather') color = '#06b6d4'; // Cyan

    const { error } = await supabase.from('employees').insert({
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      role: role,
      color: color,
      active: true
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Empleado registrado");
      setOpen(false);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 text-white gap-2 hover:bg-slate-800"><Plus size={16}/> Nuevo Empleado</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar Colaborador</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Nombre</Label><Input name="first_name" required /></div>
            <div className="space-y-1"><Label>Apellido</Label><Input name="last_name" /></div>
          </div>
          <div className="space-y-1">
            <Label>Puesto / Rol</Label>
            <Select name="role" required defaultValue="bather">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stylist">Estilista (Cortes, Baño, Todo)</SelectItem>
                <SelectItem value="finisher">Terminador (Secado, Baño)</SelectItem>
                <SelectItem value="bather">Bañador (Solo Baño)</SelectItem>
                <SelectItem value="admin">Recepción / Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-slate-900 text-white mt-4">
            {loading ? <Loader2 className="animate-spin" /> : "Guardar Empleado"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}