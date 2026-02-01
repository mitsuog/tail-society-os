'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, User, Dog, Save, Phone, Mail, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from "sonner"; // Asumiendo que usas sonner o algún toast

export default function NewClientPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [isPhoneBooking, setIsPhoneBooking] = useState(true); // POR DEFECTO: MODO TELEFÓNICO (BYPASS)

  // Estados del Formulario
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    pet_name: '',
    pet_species: 'Perro',
    pet_breed: '',
    pet_gender: 'Macho',
    pet_birth: '',
    pet_allergies: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Crear Cliente
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          full_name: formData.full_name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          notes: formData.notes,
          // Si es telefónico, ponemos un placeholder o null en la firma.
          // Ajusta esto según tu base de datos (si signature_url es obligatorio o no).
          terms_accepted: !isPhoneBooking, // Solo aceptó términos si no es telefónico
          signature_url: isPhoneBooking ? null : 'FIRMADO_PRESENCIAL_PLACEHOLDER' 
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // 2. Crear Mascota Inicial (Si llenó los datos)
      if (formData.pet_name) {
        const { error: petError } = await supabase
          .from('pets')
          .insert({
            client_id: client.id,
            name: formData.pet_name,
            species: formData.pet_species,
            breed: formData.pet_breed || 'Desconocida',
            gender: formData.pet_gender,
            birth_date: formData.pet_birth || null,
            allergies: formData.pet_allergies || null
          });

        if (petError) throw petError;
      }

      // 3. Éxito
      toast.success("Cliente registrado correctamente");
      
      // Redirigir al perfil para agendar cita inmediatamente
      router.push(`/clients/${client.id}`);

    } catch (error: any) {
      console.error(error);
      toast.error("Error al registrar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      
      {/* Header de Navegación */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registro de Nuevo Cliente</h1>
          <p className="text-slate-500 text-sm">Alta rápida para gestión de agenda</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* SECCIÓN 1: DATOS DEL DUEÑO */}
        <Card>
          <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600"/> Información del Propietario
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="full_name">Nombre Completo *</Label>
              <Input id="full_name" name="full_name" required placeholder="Ej. Juan Pérez" value={formData.full_name} onChange={handleChange} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono Móvil *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input id="phone" name="phone" required className="pl-9" placeholder="55 1234 5678" value={formData.phone} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input id="email" name="email" type="email" className="pl-9" placeholder="juan@ejemplo.com" value={formData.email} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input id="address" name="address" className="pl-9" placeholder="Calle, Número, Colonia..." value={formData.address} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notas Administrativas</Label>
              <Textarea id="notes" name="notes" placeholder="Ej. Cliente referido por Facebook. Prefiere contacto por WhatsApp." value={formData.notes} onChange={handleChange} />
            </div>
          </CardContent>
        </Card>

        {/* SECCIÓN 2: DATOS DE LA MASCOTA */}
        <Card>
          <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
            <CardTitle className="text-base flex items-center gap-2">
              <Dog className="h-5 w-5 text-orange-600"/> Primera Mascota
            </CardTitle>
            <CardDescription>Puedes agregar más mascotas después desde el perfil.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-6">
            <div className="space-y-2">
              <Label htmlFor="pet_name">Nombre de Mascota *</Label>
              <Input id="pet_name" name="pet_name" required placeholder="Ej. Firulais" value={formData.pet_name} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label>Especie</Label>
              <Select onValueChange={(val) => handleSelectChange('pet_species', val)} defaultValue="Perro">
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Perro">Perro</SelectItem>
                  <SelectItem value="Gato">Gato</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pet_breed">Raza</Label>
              <Input id="pet_breed" name="pet_breed" placeholder="Ej. Schnauzer" value={formData.pet_breed} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select onValueChange={(val) => handleSelectChange('pet_gender', val)} defaultValue="Macho">
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Macho">Macho</SelectItem>
                  <SelectItem value="Hembra">Hembra</SelectItem>
                </SelectContent>
              </Select>
            </div>
             
             <div className="space-y-2">
              <Label htmlFor="pet_birth">Fecha de Nacimiento (Aprox)</Label>
              <Input id="pet_birth" name="pet_birth" type="date" value={formData.pet_birth} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pet_allergies">Alergias o Condiciones</Label>
              <Input id="pet_allergies" name="pet_allergies" placeholder="Ej. Alergia al pollo" value={formData.pet_allergies} onChange={handleChange} />
            </div>
          </CardContent>
        </Card>

        {/* SECCIÓN 3: CONTROL DE FIRMA (EL BYPASS) */}
        <Card className={isPhoneBooking ? "border-amber-200 bg-amber-50/30" : "border-slate-200"}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  {isPhoneBooking ? <Phone className="h-4 w-4"/> : <User className="h-4 w-4"/>}
                  {isPhoneBooking ? "Registro Telefónico / Remoto" : "Cliente Presente"}
                </h3>
                <p className="text-sm text-slate-500 max-w-md">
                  {isPhoneBooking 
                    ? "Se omitirá la firma digital por ahora. Podrás solicitarla después mediante un enlace."
                    : "Se habilitará el panel de firma para que el cliente firme ahora mismo."
                  }
                </p>
              </div>
              <Switch 
                checked={isPhoneBooking} 
                onCheckedChange={setIsPhoneBooking}
              />
            </div>

            {/* Aquí iría el SignatureCanvas si !isPhoneBooking es falso, pero por simplicidad de este MVP interno, lo ocultamos */}
            {!isPhoneBooking && (
               <div className="mt-4 p-4 border-2 border-dashed border-slate-300 rounded-lg text-center bg-white">
                  <p className="text-slate-400 text-sm italic">Panel de firma desactivado en esta vista rápida.</p>
                  <p className="text-xs text-slate-400">Para firma presencial completa, usa el Kiosko.</p>
               </div>
            )}
          </CardContent>
        </Card>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white min-w-[150px]">
            {loading ? "Guardando..." : (
              <>
                <Save className="mr-2 h-4 w-4" /> Registrar Cliente
              </>
            )}
          </Button>
        </div>

      </form>
    </div>
  );
}