'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createClient } from '@/utils/supabase/client';
import { CheckCircle2, Plus, PawPrint, User, Phone, Mail, Sparkles } from 'lucide-react';
import { BreedCombobox } from '@/components/kiosk/BreedCombobox';

type Step = 'welcome' | 'client-info' | 'pet-info' | 'review' | 'success';

interface Pet {
  name: string;
  breed: string;
  age: string;
  weight: string;
  gender: 'male' | 'female';
  notes: string;
}

interface ClientData {
  fullName: string;
  phone: string;
  email: string;
}

export default function KioskPage() {
  const [step, setStep] = useState<Step>('welcome');
  const [clientData, setClientData] = useState<ClientData>({
    fullName: '',
    phone: '',
    email: ''
  });
  const [pets, setPets] = useState<Pet[]>([]);
  const [currentPet, setCurrentPet] = useState<Pet>({
    name: '',
    breed: '',
    age: '',
    weight: '',
    gender: 'male',
    notes: ''
  });
  const [showAddAnotherDialog, setShowAddAnotherDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStartRegistration = () => {
    setStep('client-info');
  };

  const handleClientInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('pet-info');
  };

  const handlePetInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPets([...pets, currentPet]);
    setShowAddAnotherDialog(true);
  };

  const handleAddAnotherPet = () => {
    setCurrentPet({
      name: '',
      breed: '',
      age: '',
      weight: '',
      gender: 'male',
      notes: ''
    });
    setShowAddAnotherDialog(false);
    // Mantenemos en pet-info para agregar otra
  };

  const handleFinishAddingPets = () => {
    setShowAddAnotherDialog(false);
    setStep('review');
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // 1. Crear cliente (SIN campo address)
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          full_name: clientData.fullName,
          phone: clientData.phone,
          email: clientData.email
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // 2. Crear mascotas
      const petInserts = pets.map(pet => ({
        client_id: client.id,
        name: pet.name,
        breed: pet.breed,
        age: parseInt(pet.age) || null,
        weight: parseFloat(pet.weight) || null,
        gender: pet.gender,
        notes: pet.notes
      }));

      const { error: petsError } = await supabase
        .from('pets')
        .insert(petInserts);

      if (petsError) throw petsError;

      setStep('success');
    } catch (error) {
      console.error('Error en registro:', error);
      alert('Hubo un error al registrarte. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-0 shadow-2xl">
          <CardContent className="p-12 text-center space-y-8">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-400 rounded-full blur-2xl opacity-20 animate-pulse" />
                <PawPrint className="h-24 w-24 text-blue-600 relative" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-slate-900">
                ¡Bienvenido a Tail Society!
              </h1>
              <p className="text-xl text-slate-600">
                Comencemos tu registro en 3 sencillos pasos
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="p-4 bg-blue-50 rounded-xl">
                <User className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">Tus Datos</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl">
                <PawPrint className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">Tu Mascota</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">Confirmar</p>
              </div>
            </div>

            <Button
              onClick={handleStartRegistration}
              size="lg"
              className="w-full max-w-xs h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
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
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Paso 1: Tus Datos</h2>
                <p className="text-blue-100">Información de contacto</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            <form onSubmit={handleClientInfoSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-base font-semibold text-slate-700">
                  Nombre Completo *
                </Label>
                <Input
                  id="fullName"
                  value={clientData.fullName}
                  onChange={(e) => setClientData({...clientData, fullName: e.target.value})}
                  placeholder="Ej: María García"
                  required
                  className="h-12 text-lg"
                  autoComplete="name"
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
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold text-slate-700">
                  Correo Electrónico *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={clientData.email}
                    onChange={(e) => setClientData({...clientData, email: e.target.value})}
                    placeholder="tu@email.com"
                    required
                    className="h-12 text-lg pl-11"
                    autoComplete="email"
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Continuar al Siguiente Paso
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
        <Card className="w-full max-w-2xl border-0 shadow-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
                  <PawPrint className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Paso 2: Tu Mascota</h2>
                  <p className="text-purple-100">
                    {pets.length === 0 ? 'Primera mascota' : `Mascota #${pets.length + 1}`}
                  </p>
                </div>
              </div>
              {pets.length > 0 && (
                <div className="text-right">
                  <p className="text-sm text-purple-100">{pets.length} mascota(s) agregada(s)</p>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            <form onSubmit={handlePetInfoSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="petName" className="text-base font-semibold text-slate-700">
                    Nombre de tu Mascota *
                  </Label>
                  <Input
                    id="petName"
                    value={currentPet.name}
                    onChange={(e) => setCurrentPet({...currentPet, name: e.target.value})}
                    placeholder="Ej: Max"
                    required
                    className="h-12 text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="breed" className="text-base font-semibold text-slate-700">
                    Raza *
                  </Label>
                  <BreedCombobox
                    value={currentPet.breed}
                    onChange={(value) => setCurrentPet({...currentPet, breed: value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-base font-semibold text-slate-700">
                    Edad (años)
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    value={currentPet.age}
                    onChange={(e) => setCurrentPet({...currentPet, age: e.target.value})}
                    placeholder="Ej: 3"
                    min="0"
                    max="30"
                    className="h-12 text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-base font-semibold text-slate-700">
                    Peso (kg)
                  </Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={currentPet.weight}
                    onChange={(e) => setCurrentPet({...currentPet, weight: e.target.value})}
                    placeholder="Ej: 15.5"
                    min="0"
                    className="h-12 text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-700">
                    Sexo *
                  </Label>
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant={currentPet.gender === 'male' ? 'default' : 'outline'}
                      onClick={() => setCurrentPet({...currentPet, gender: 'male'})}
                      className="flex-1 h-12"
                    >
                      Macho
                    </Button>
                    <Button
                      type="button"
                      variant={currentPet.gender === 'female' ? 'default' : 'outline'}
                      onClick={() => setCurrentPet({...currentPet, gender: 'female'})}
                      className="flex-1 h-12"
                    >
                      Hembra
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-base font-semibold text-slate-700">
                  Notas Especiales (Opcional)
                </Label>
                <Textarea
                  id="notes"
                  value={currentPet.notes}
                  onChange={(e) => setCurrentPet({...currentPet, notes: e.target.value})}
                  placeholder="Alergias, temperamento, cuidados especiales..."
                  className="min-h-[100px] text-base"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="mr-2 h-5 w-5" />
                Agregar esta Mascota
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Dialog Mejorado */}
        <Dialog open={showAddAnotherDialog} onOpenChange={setShowAddAnotherDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                ¡Mascota Agregada!
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                {currentPet.name} ha sido registrado exitosamente.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 pt-4">
              <Button
                onClick={handleAddAnotherPet}
                className="w-full h-12 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="mr-2 h-5 w-5" />
                Sí, agregar otra mascota
              </Button>
              
              <Button
                onClick={handleFinishAddingPets}
                variant="outline"
                className="w-full h-12 text-base border-2"
              >
                No, continuar con {pets.length} mascota(s)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-3xl border-0 shadow-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-green-600 to-emerald-600 text-white p-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Paso 3: Confirma tu Información</h2>
                <p className="text-green-100">Revisa que todo esté correcto</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8 space-y-8">
            {/* Información del Cliente */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Tus Datos
              </h3>
              <div className="bg-blue-50 rounded-lg p-6 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Nombre</p>
                    <p className="font-semibold text-slate-900">{clientData.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Teléfono</p>
                    <p className="font-semibold text-slate-900">{clientData.phone}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Correo</p>
                  <p className="font-semibold text-slate-900">{clientData.email}</p>
                </div>
              </div>
            </div>

            {/* Información de Mascotas */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <PawPrint className="h-5 w-5 text-purple-600" />
                Tus Mascotas ({pets.length})
              </h3>
              <div className="space-y-3">
                {pets.map((pet, index) => (
                  <div key={index} className="bg-purple-50 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-xl font-bold text-slate-900">{pet.name}</h4>
                        <p className="text-slate-600">{pet.breed}</p>
                      </div>
                      <Badge className="bg-purple-200 text-purple-900">
                        Mascota #{index + 1}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Edad</p>
                        <p className="font-semibold">{pet.age || 'No especificada'} años</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Peso</p>
                        <p className="font-semibold">{pet.weight || 'No especificado'} kg</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Sexo</p>
                        <p className="font-semibold capitalize">{pet.gender === 'male' ? 'Macho' : 'Hembra'}</p>
                      </div>
                    </div>
                    {pet.notes && (
                      <div className="mt-4 pt-4 border-t border-purple-200">
                        <p className="text-sm text-slate-600">Notas</p>
                        <p className="text-sm text-slate-900">{pet.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep('client-info')}
                variant="outline"
                size="lg"
                className="flex-1 h-14 text-base"
              >
                Editar Información
              </Button>
              
              <Button
                onClick={handleFinalSubmit}
                disabled={loading}
                size="lg"
                className="flex-1 h-14 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Confirmar Registro
                  </>
                )}
              </Button>
            </div>
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
                ¡Registro Exitoso!
              </h1>
              <p className="text-xl text-slate-600">
                Bienvenido a la familia Tail Society
              </p>
            </div>

            <div className="bg-green-50 rounded-xl p-6 space-y-3">
              <p className="text-lg font-semibold text-slate-900">
                Próximos Pasos:
              </p>
              <ul className="text-left space-y-2 max-w-md mx-auto">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-slate-700">Recibirás un email de confirmación</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-slate-700">Nuestro equipo se pondrá en contacto contigo</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-slate-700">Podrás agendar tu primera cita</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={() => window.location.href = '/'}
              size="lg"
              className="w-full max-w-xs h-14 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              Finalizar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}