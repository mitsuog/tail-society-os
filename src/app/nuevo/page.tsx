//tail-society-os/src/app/nuevo/page.tsx

import { createClient } from '../../utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";

export default function NewClientPage() {
  
  // --- CORRECCIÓN: Renombramos la función a 'saveClient' ---
  async function saveClient(formData: FormData) {
    'use server';
    
    // Ahora sí usa la herramienta importada de Supabase sin confundirse
    const supabase = await createClient();
    
    // 1. Recoger datos del Cliente
    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    
    // 2. Insertar Cliente
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert([{ full_name: fullName, phone, email }])
      .select()
      .single();

    if (clientError) {
      console.error('Error creando cliente:', clientError);
      return; 
    }

    // 3. Recoger datos de Mascota (si se llenaron)
    const petName = formData.get('petName') as string;
    
    if (petName && client) {
      const breed = formData.get('breed') as string;
      const species = formData.get('species') as string;
      
      await supabase
        .from('pets')
        .insert([{
          name: petName,
          breed,
          species,
          client_id: client.id
        }]);
    }

    // 4. Redirigir al inicio
    redirect('/');
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft size={16} /> Volver
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Registrar Nuevo Cliente</h1>
      </div>

      {/* Actualizamos la acción del formulario con el nuevo nombre */}
      <form action={saveClient}>
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
            <CardDescription>Ingresa los datos del dueño y su mascota principal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Sección Dueño */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Datos del Dueño</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">Nombre Completo *</label>
                  <input name="fullName" required className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. Juan Pérez" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Teléfono *</label>
                    <input name="phone" required className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="555-000-0000" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <input name="email" type="email" className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="cliente@correo.com" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 my-4"></div>

            {/* Sección Mascota */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Mascota Principal</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">Nombre Mascota</label>
                  <input name="petName" className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. Firulais" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Especie</label>
                    <select name="species" className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="Perro">Perro</option>
                      <option value="Gato">Gato</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Raza</label>
                    <input name="breed" className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. Golden Retriever" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white">
                <Save className="mr-2 h-4 w-4" /> Guardar Registro
              </Button>
            </div>

          </CardContent>
        </Card>
      </form>
    </div>
  );
}