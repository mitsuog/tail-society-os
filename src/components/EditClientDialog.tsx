'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save, Loader2 } from 'lucide-react';
// IMPORTANTE: Verifica que esta ruta exista. Si no, crea la carpeta actions dentro de app.
import { updateClientAction } from '@/app/actions/update-client'; 

export default function EditClientDialog({ client }: { client: any }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    // Obtenemos los datos del formulario nativo
    const formData = new FormData(e.currentTarget);
    
    try {
      // Llamada al servidor
      const result = await updateClientAction(client.id, formData);
      
      setOpen(false);
      // Feedback visual simple (o usa toast.success si tienes sonner configurado)
      alert("¡Cliente actualizado correctamente!");
      
    } catch (error: any) {
      console.error(error);
      alert("Error al guardar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-white border-slate-300 hover:bg-slate-100 text-slate-700 shadow-sm">
          <Pencil size={14} /> Editar Datos
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle>Editar Información del Cliente</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          
          <div className="grid gap-2">
            <Label htmlFor="fullName" className="text-slate-700">Nombre Completo</Label>
            <Input 
              id="fullName" 
              name="fullName" 
              defaultValue={client.full_name} 
              required 
              className="uppercase"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone" className="text-slate-700">Teléfono</Label>
              <Input 
                id="phone" 
                name="phone" 
                defaultValue={client.phone} 
                required 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <Input 
                id="email" 
                name="email" 
                defaultValue={client.email || ''} 
                type="email"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address" className="text-slate-700">Dirección</Label>
            <Input 
              id="address" 
              name="address" 
              defaultValue={client.address || ''} 
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes" className="text-slate-700">Notas Internas (Admin)</Label>
            <Textarea 
              id="notes" 
              name="notes" 
              defaultValue={client.notes || ''} 
              placeholder="Historial, preferencias, alertas..."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex justify-end pt-2 border-t mt-2">
            <Button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white min-w-[150px]">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
              Guardar Cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}