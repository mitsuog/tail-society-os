'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save, Pencil, Lock, UserCog } from 'lucide-react';
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  status: string;
  internal_tags: string | null;
}

interface EditClientDialogProps {
  client: Client;
  trigger?: React.ReactNode;
}

export default function EditClientDialog({ client, trigger }: EditClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    full_name: client.full_name || '',
    phone: client.phone || '',
    email: client.email || '',
    notes: client.notes || '',
    status: client.status || 'active',
    internal_tags: client.internal_tags || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          email: formData.email || null,
          notes: formData.notes || null,
          status: formData.status,
          internal_tags: formData.internal_tags || null
        })
        .eq('id', client.id);

      if (error) throw error;

      toast.success("Cliente actualizado correctamente");
      setOpen(false);
      router.refresh();

    } catch (error: any) {
      toast.error("Error al actualizar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600">
            <Pencil size={16} />
          </Button>
        )}
      </DialogTrigger>
      
      {/* EL MODAL TIENE Z-100 */}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto z-[100]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="text-blue-600" /> Editar Cliente
          </DialogTitle>
          <DialogDescription>
            Modifica los datos de contacto y estatus administrativo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Nombre Completo</Label>
              <Input required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
          </div>
          
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100 space-y-4">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
              <Lock size={12} /> Gestión Interna
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Estatus</Label>
                <Select value={formData.status} onValueChange={val => setFormData({...formData, status: val})}>
                  <SelectTrigger className={cn("font-medium", formData.status === 'active' ? "text-green-600" : "text-slate-500")}>
                    <SelectValue />
                  </SelectTrigger>
                  
                  {/* --- CORRECCIÓN AQUÍ: z-[200] --- */}
                  <SelectContent className="z-[200]"> 
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo / Vetado</SelectItem>
                  </SelectContent>
                  
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Alertas / Flags</Label>
                <Input 
                  value={formData.internal_tags} 
                  onChange={e => setFormData({...formData, internal_tags: e.target.value})} 
                  placeholder="Ej. VIP, Difícil..." 
                  className="border-amber-200 focus:border-amber-400"
                />
              </div>
            </div>
            <div className="space-y-1">
               <Label>Notas Internas</Label>
               <Textarea 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  className="h-20 bg-white"
               />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-slate-900 min-w-[120px] text-white">
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}