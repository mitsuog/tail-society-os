'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClient } from '@/utils/supabase/client';
import { CheckCircle2, Plus, PawPrint, User, Phone, Mail, Sparkles, AlertTriangle, Syringe, Bone, Volume2, Users as UsersIcon, HeartPulse, Skull, FileSignature, Loader2, CalendarIcon, X } from 'lucide-react';
import { BreedCombobox } from '@/components/kiosk/BreedCombobox';
import dynamic from 'next/dynamic';
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const SignatureCanvas = dynamic(() => import('react-signature-canvas'), {
  ssr: false,
  loading: () => <div className="w-full h-48 bg-slate-100 rounded-xl animate-pulse"></div>
}) as any;

type Step = 'welcome' | 'client-info' | 'pet-info' | 'waiver' | 'success';

// EXACTAMENTE COMO AddPetDialog.tsx
interface Pet {
  name: string;
  species: string;
  breed: string;
  color: string;
  size: string;
  birth_date: string;
  photo_url: string;
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
  notes: string;
}

// EXACTAMENTE COMO tus dialogs
interface ClientData {
  full_name: string;
  phone: string;
  email: string;
}

const INITIAL_PET_DATA: Pet = {
  name: '',
  species: 'Perro',
  breed: '',
  color: '',
  size: 'Chico',
  birth_date: '',
  photo_url: '',
  is_vaccined: false,
  has_allergies: false,
  has_illness: false,
  has_conditions: false,
  is_senior: false,
  is_aggressive: false,
  is_nervous: false,
  is_noisereactive: false,
  convive: false,
  treats: false,
  notes: ''
};

// Componente DatePicker Simple - Sin dependencia de Calendar
function BirthDatePicker({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const [open, setOpen] = useState(false);
  
  // Parse current value
  const currentDate = value ? new Date(value) : null;
  const [year, setYear] = useState(currentDate?.getFullYear() || new Date().getFullYear());
  const [month, setMonth] = useState(currentDate?.getMonth() || 0);
  const [day, setDay] = useState(currentDate?.getDate() || 1);

  // Generar opciones
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - i);
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  // Calcular días del mes
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleApply = () => {
    const date = new Date(year, month, day);
    onChange(format(date, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  const displayText = value 
    ? format(new Date(value), "d 'de' MMMM, yyyy", { locale: es })
    : 'Selecciona una fecha';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between h-12 text-left font-normal"
        >
          <span className={value ? "text-slate-900" : "text-slate-400"}>
            {displayText}
          </span>
          <CalendarIcon className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500">Año</Label>
            <Select value={String(year)} onValueChange={(val) => setYear(parseInt(val))}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500">Mes</Label>
            <Select value={String(month)} onValueChange={(val) => setMonth(parseInt(val))}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m, idx) => (
                  <SelectItem key={idx} value={String(idx)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500">Día</Label>
            <Select value={String(day)} onValueChange={(val) => setDay(parseInt(val))}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {days.map((d) => (
                  <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClear}
              className="flex-1 text-red-600 hover:bg-red-50"
            >
              <X size={14} className="mr-1" /> Borrar
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
            >
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function CheckinPage() {
  const [step, setStep] = useState<Step>('welcome');
  const [clientData, setClientData] = useState<ClientData>({
    full_name: '',
    phone: '',
    email: ''
  });
  const [pets, setPets] = useState<Pet[]>([]);
  const [currentPet, setCurrentPet] = useState<Pet>(INITIAL_PET_DATA);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const sigCanvas = useRef<any>(null);
  const supabase = createClient();

  const handleStartRegistration = () => {
    setStep('client-info');
  };

  const handleClientInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: client, error } = await supabase
        .from('clients')
        .insert({
          full_name: clientData.full_name,
          phone: clientData.phone,
          email: clientData.email.trim() === '' ? null : clientData.email,
          status: 'active',
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setClientId(client.id);
      setStep('pet-info');
      toast.success('Cliente registrado');
    } catch (error: any) {
      console.error('Error:', error);
      if (error.code === '23505') {
        toast.error('Ya existe un cliente con ese teléfono o email');
      } else {
        toast.error('Error al registrar: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePetInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPet.name.trim()) {
      toast.error('El nombre de la mascota es obligatorio');
      return;
    }

    setLoading(true);

    try {
      // EXACTAMENTE como AddPetDialog.tsx
      const petPayload = {
        client_id: clientId,
        name: currentPet.name,
        species: currentPet.species,
        breed: currentPet.breed || 'Mestizo',
        color: currentPet.color || null,
        size: currentPet.size,
        birth_date: currentPet.birth_date || null,
        photo_url: currentPet.photo_url || null,
        is_vaccined: currentPet.is_vaccined,
        has_allergies: currentPet.has_allergies,
        has_illness: currentPet.has_illness,
        has_conditions: currentPet.has_conditions,
        is_senior: currentPet.is_senior,
        is_aggressive: currentPet.is_aggressive,
        is_nervous: currentPet.is_nervous,
        is_noisereactive: currentPet.is_noisereactive,
        convive: currentPet.convive,
        treats: currentPet.treats,
        notes: currentPet.notes || null,
        waiver_signed: false,
        status: 'active'
      };

      const { error } = await supabase.from('pets').insert(petPayload);

      if (error) throw error;

      setPets([...pets, currentPet]);
      
      // Usar window.confirm (nativo)
      const addAnother = window.confirm(
        `✅ "${currentPet.name}" registrado.\n\n¿Deseas agregar otra mascota?`
      );

      if (addAnother) {
        setCurrentPet(INITIAL_PET_DATA);
        toast.success('Agrega la siguiente mascota');
      } else {
        setStep('waiver');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Error al registrar mascota: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWaiverSubmit = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      toast.error('Por favor firma antes de continuar');
      return;
    }

    setLoading(true);

    try {
      const canvas = sigCanvas.current.getTrimmedCanvas();
      const blob = await new Promise<Blob | null>(resolve => 
        canvas.toBlob(resolve, 'image/png')
      );

      if (!blob) throw new Error('Error al generar imagen de firma');

      // Subir firma
      const fileName = `waiver-${clientId}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, blob, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);

      const now = new Date().toISOString();

      // Actualizar todas las mascotas del cliente
      const { error: updateError } = await supabase
        .from('pets')
        .update({
          waiver_signed: true,
          waiver_date: now,
          signature_url: publicUrl
        })
        .eq('client_id', clientId);

      if (updateError) throw updateError;

      setStep('success');
      toast.success('Registro completado');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Error al guardar firma: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-0 shadow-2xl">
          <CardContent className="p-12 text-center space-y-8">
            {/* Logo de Tail Society */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse" />
                <img 
                  src="/Logo500x500.png" 
                  alt="Tail Society Logo" 
                  className="h-40 w-40 relative drop-shadow-2xl object-contain"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-slate-900">
                ¡Bienvenido a Tail Society!
              </h1>
              <p className="text-xl text-slate-600">
                Registro de cliente nuevo
              </p>
            </div>

            <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto">
              <div className="p-4 bg-blue-50 rounded-xl">
                <User className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">Tus Datos</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl">
                <PawPrint className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">Mascotas</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl">
                <FileSignature className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">Contrato</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">Listo</p>
              </div>
            </div>

            <Button
              onClick={handleStartRegistration}
              size="lg"
              className="w-full max-w-xs h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
            >
              Comenzar Registro
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'client-info') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-0 shadow-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
            {/* Logo en header */}
            <div className="flex justify-center mb-4">
              <img 
                src="/Logo500x500.png" 
                alt="Tail Society" 
                className="h-16 w-16 object-contain drop-shadow-lg"
              />
            </div>
            
            <div className="flex items-center gap-3 justify-center">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
                <User className="h-6 w-6" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold">Paso 1: Tus Datos</h2>
                <p className="text-blue-100">Información de contacto</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            <form onSubmit={handleClientInfoSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-base font-semibold text-slate-700">
                  Nombre Completo *
                </Label>
                <Input
                  id="full_name"
                  value={clientData.full_name}
                  onChange={(e) => setClientData({...clientData, full_name: e.target.value})}
                  placeholder="Ej: María García"
                  required
                  className="h-12 text-lg"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-base font-semibold text-slate-700">
                  Teléfono *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={clientData.phone}
                    onChange={(e) => setClientData({...clientData, phone: e.target.value})}
                    placeholder="81 1234 5678"
                    required
                    className="h-12 text-lg pl-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold text-slate-700">
                  Correo Electrónico (Opcional)
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={clientData.email}
                    onChange={(e) => setClientData({...clientData, email: e.target.value})}
                    placeholder="tu@email.com"
                    className="h-12 text-lg pl-11"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Continuar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'pet-info') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-3xl border-0 shadow-2xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white p-8 sticky top-0 z-10">
            {/* Logo en header */}
            <div className="flex justify-center mb-4">
              <img 
                src="/Logo500x500.png" 
                alt="Tail Society" 
                className="h-16 w-16 object-contain drop-shadow-lg"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
                  <PawPrint className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Paso 2: Datos de Mascota</h2>
                  <p className="text-purple-100">
                    {pets.length === 0 ? 'Primera mascota' : `Mascota #${pets.length + 1}`}
                  </p>
                </div>
              </div>
              {pets.length > 0 && (
                <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur">
                  <p className="text-sm font-bold">{pets.length} registrada(s)</p>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            <form onSubmit={handlePetInfoSubmit} className="space-y-6">
              
              {/* INFORMACIÓN BÁSICA */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <PawPrint size={14} /> Información General
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre de la Mascota *</Label>
                    <Input
                      value={currentPet.name}
                      onChange={(e) => setCurrentPet({...currentPet, name: e.target.value})}
                      placeholder="Ej: Max"
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Especie</Label>
                    <Select
                      value={currentPet.species}
                      onValueChange={(val) => setCurrentPet({...currentPet, species: val})}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Perro">Perro</SelectItem>
                        <SelectItem value="Gato">Gato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Raza</Label>
                    <BreedCombobox
                      value={currentPet.breed}
                      onChange={(value) => setCurrentPet({...currentPet, breed: value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Input
                      value={currentPet.color}
                      onChange={(e) => setCurrentPet({...currentPet, color: e.target.value})}
                      placeholder="Ej: Café"
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tamaño</Label>
                    <Select
                      value={currentPet.size}
                      onValueChange={(val) => setCurrentPet({...currentPet, size: val})}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Chico">Chico</SelectItem>
                        <SelectItem value="Mediano">Mediano</SelectItem>
                        <SelectItem value="Grande">Grande</SelectItem>
                        <SelectItem value="Gigante">Gigante</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha de Nacimiento (Aprox)</Label>
                    <BirthDatePicker
                      value={currentPet.birth_date}
                      onChange={(date) => setCurrentPet({...currentPet, birth_date: date})}
                    />
                  </div>
                </div>
              </div>

              {/* VACUNACIÓN */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Syringe className={currentPet.is_vaccined ? "text-green-500" : "text-slate-400"} size={24} />
                    <div>
                      <Label className="font-bold text-lg text-slate-800">¿Vacunación Vigente?</Label>
                      <p className="text-sm text-slate-500">¿Cuenta con esquema completo al día?</p>
                    </div>
                  </div>
                  <Switch
                    checked={currentPet.is_vaccined}
                    onCheckedChange={(val) => setCurrentPet({...currentPet, is_vaccined: val})}
                    className="scale-125"
                  />
                </div>
                
                {!currentPet.is_vaccined && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm mt-3">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <strong>Advertencia:</strong> La mascota debe cumplir con su esquema de vacunación para recibir servicio.
                    </div>
                  </div>
                )}
              </div>

              {/* CUESTIONARIO DE SALUD Y COMPORTAMIENTO */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle size={14} /> Cuestionario de Comportamiento y Salud
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SwitchField
                    label="¿Tiene Alergias?"
                    checked={currentPet.has_allergies}
                    onChange={(val: boolean) => setCurrentPet({...currentPet, has_allergies: val})}
                  />
                  
                  <SwitchField
                    label="¿Tiene Enfermedades?"
                    checked={currentPet.has_illness}
                    onChange={(val: boolean) => setCurrentPet({...currentPet, has_illness: val})}
                  />

                  <SwitchField
                    label="¿Condiciones Especiales?"
                    checked={currentPet.has_conditions}
                    onChange={(val: boolean) => setCurrentPet({...currentPet, has_conditions: val})}
                  />

                  <SwitchField
                    label="¿Es Senior? (+7 años)"
                    checked={currentPet.is_senior}
                    onChange={(val: boolean) => setCurrentPet({...currentPet, is_senior: val})}
                    colorClass="bg-purple-50 border-purple-200"
                  />

                  <SwitchField
                    label="¿Es Agresivo?"
                    icon={<Skull size={16} className="text-red-500" />}
                    checked={currentPet.is_aggressive}
                    onChange={(val: boolean) => setCurrentPet({...currentPet, is_aggressive: val})}
                  />

                  <SwitchField
                    label="¿Es Nervioso?"
                    icon={<HeartPulse size={16} className="text-orange-500" />}
                    checked={currentPet.is_nervous}
                    onChange={(val: boolean) => setCurrentPet({...currentPet, is_nervous: val})}
                  />

                  <SwitchField
                    label="¿Sensible a Ruidos?"
                    icon={<Volume2 size={16} className="text-purple-500" />}
                    checked={currentPet.is_noisereactive}
                    onChange={(val: boolean) => setCurrentPet({...currentPet, is_noisereactive: val})}
                  />

                  <SwitchField
                    label="¿Convive con otros?"
                    icon={<UsersIcon size={16} className="text-green-500" />}
                    checked={currentPet.convive}
                    onChange={(val: boolean) => setCurrentPet({...currentPet, convive: val})}
                  />

                  <SwitchField
                    label="¿Acepta Premios/Treats?"
                    icon={<Bone size={16} className="text-amber-600" />}
                    checked={currentPet.treats}
                    onChange={(val: boolean) => setCurrentPet({...currentPet, treats: val})}
                    className="md:col-span-2"
                  />
                </div>
              </div>

              {/* NOTAS */}
              <div className="space-y-2">
                <Label>Notas Adicionales (Opcional)</Label>
                <Textarea
                  value={currentPet.notes}
                  onChange={(e) => setCurrentPet({...currentPet, notes: e.target.value})}
                  placeholder="Alergias específicas, medicamentos, comportamientos especiales..."
                  className="min-h-[100px]"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-5 w-5" />
                    Guardar Mascota
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'waiver') {
    return (
      <div className="min-h-screen bg-slate-100 py-8 px-4 flex justify-center items-start">
        <Card className="w-full max-w-lg shadow-2xl border-slate-200 overflow-hidden">
          <CardHeader className="text-center border-b bg-white pb-6 pt-8">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img 
                src="/Logo500x500.png" 
                alt="Tail Society" 
                className="h-20 w-20 object-contain"
              />
            </div>
            
            <div className="mx-auto bg-slate-100 w-14 h-14 rounded-full flex items-center justify-center mb-3">
              <FileSignature className="text-slate-600" size={24}/>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 uppercase">Acuerdo de Servicio</h2>
            <p className="text-slate-500 text-sm">Tail Society • Grooming & Care</p>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-6 bg-slate-50/50">
            
            {/* DATOS DEL CLIENTE Y MASCOTAS */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <User size={16} className="text-slate-400"/>
                <span className="font-semibold uppercase">{clientData.full_name}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-700">
                <PawPrint size={16} className="text-slate-400 mt-0.5"/>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Mascotas cubiertas:</span>
                  <span className="text-slate-800 font-medium">
                    {pets.map(p => p.name).join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* TEXTO LEGAL RESUMIDO */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 h-80 overflow-y-auto text-xs text-slate-700 leading-relaxed">
              <div className="space-y-3">
                <div>
                  <strong className="text-slate-900 block mb-1">1. Naturaleza del Servicio</strong>
                  <p>La estética canina involucra trabajo con seres vivos que pueden tener movimientos impredecibles. A pesar de nuestros protocolos de seguridad, existen riesgos inherentes al usar herramientas punzocortantes.</p>
                </div>

                <div>
                  <strong className="text-slate-900 block mb-1">2. Política de Cero Sedantes</strong>
                  <p>Tail Society NO utiliza ni administra tranquilizantes bajo ninguna circunstancia. Si la mascota llega sedada, el servicio será denegado.</p>
                </div>

                <div>
                  <strong className="text-slate-900 block mb-1">3. Suspensión del Servicio</strong>
                  <p>Nos reservamos el derecho de suspender el servicio ante signos de estrés severo o agresividad incontrolable.</p>
                </div>

                <div>
                  <strong className="text-slate-900 block mb-1">4. Condiciones del Pelaje</strong>
                  <p>Si el pelaje presenta nudos pegados a la piel, se procederá obligatoriamente al rapado sanitario. No somos responsables por irritaciones descubiertas al remover nudos.</p>
                </div>

                <div className="bg-red-50 p-3 rounded border border-red-100">
                  <strong className="text-red-900">5. Ectoparásitos</strong>
                  <p className="text-red-800">Si se detectan pulgas/garrapatas no declaradas, se suspenderá el servicio y se aplicará cargo de $500 MXN por fumigación.</p>
                </div>

                <div className="pt-3 border-t">
                  <p className="font-bold text-slate-900 text-center">
                    Al firmar, acepto las condiciones estipuladas y declaro que la información proporcionada es verídica.
                  </p>
                </div>
              </div>
            </div>

            {/* ÁREA DE FIRMA */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <Label className="text-sm font-bold uppercase text-slate-900">Tu Firma</Label>
                <Button
                  type="button"
                  onClick={clearSignature}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-500 hover:bg-red-50"
                >
                  Borrar
                </Button>
              </div>
              
              <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden shadow-sm">
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="black"
                  backgroundColor="white"
                  canvasProps={{
                    className: 'w-full h-48 block',
                    style: { width: '100%', height: '192px' }
                  }}
                />
              </div>
              
              <p className="text-xs text-center text-slate-400 pt-1">
                Dibuja tu firma con el dedo o mouse
              </p>
            </div>

            <Button
              onClick={handleWaiverSubmit}
              disabled={loading}
              size="lg"
              className="w-full h-14 text-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <FileSignature className="mr-2 h-5 w-5" />
                  Aceptar y Firmar
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-0 shadow-2xl">
          <CardContent className="p-12 text-center space-y-8">
            {/* Logo arriba */}
            <div className="flex justify-center mb-4">
              <img 
                src="/Logo500x500.png" 
                alt="Tail Society" 
                className="h-24 w-24 object-contain opacity-90"
              />
            </div>

            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-green-400 rounded-full blur-3xl opacity-30 animate-pulse" />
                <div className="relative bg-gradient-to-br from-green-500 to-emerald-500 rounded-full p-6">
                  <CheckCircle2 className="h-20 w-20 text-white" />
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-slate-900">
                ¡Registro Completado!
              </h1>
              <p className="text-xl text-slate-600">
                Bienvenido a la familia Tail Society
              </p>
            </div>

            <div className="bg-green-50 rounded-xl p-6 space-y-3">
              <p className="text-lg font-semibold text-slate-900">
                Resumen de tu registro:
              </p>
              <div className="space-y-2 text-left max-w-md mx-auto">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <span className="text-slate-700">
                    <strong>{clientData.full_name}</strong> registrado
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <span className="text-slate-700">
                    <strong>{pets.length}</strong> {pets.length === 1 ? 'mascota registrada' : 'mascotas registradas'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <span className="text-slate-700">Contrato firmado digitalmente</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Próximos Pasos:</h3>
              <ul className="text-sm text-blue-800 space-y-1 text-left max-w-md mx-auto">
                <li>• Recibirás confirmación por mensaje</li>
                <li>• Nuestro equipo te contactará para agendar tu primera cita</li>
                <li>• Puedes llamar al establecimiento para programar tu servicio</li>
              </ul>
            </div>

            <Button
              onClick={() => {
                // Resetear todo el estado
                setStep('welcome');
                setClientData({ full_name: '', phone: '', email: '' });
                setPets([]);
                setCurrentPet(INITIAL_PET_DATA);
                setClientId(null);
                toast.success('¡Listo para registrar otro cliente!');
              }}
              size="lg"
              className="w-full max-w-xs h-14 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              Registrar Otro Cliente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

// Componente auxiliar para switches
interface SwitchFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
  colorClass?: string;
  className?: string;
}

function SwitchField({ 
  label, 
  checked, 
  onChange, 
  icon, 
  colorClass = "bg-slate-50 border-slate-200",
  className = ""
}: SwitchFieldProps) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:border-slate-300 ${colorClass} ${className}`}>
      <div className="flex items-center gap-2">
        {icon}
        <Label className="text-sm font-medium cursor-pointer" onClick={() => onChange(!checked)}>
          {label}
        </Label>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="scale-90"
      />
    </div>
  );
}