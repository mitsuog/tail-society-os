'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Search, Dog, ArrowLeft, FileText, CheckCircle2, AlertTriangle, Syringe } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type Step = 'menu' | 'new-client' | 'find-client' | 'client-actions';

interface ClientData {
  id: string;
  full_name: string;
  pets: { id: string, name: string }[];
}

export default function ReceptionWizard() {
  const [step, setStep] = useState<Step>('menu');
  const [loading, setLoading] = useState(false);
  
  // Estado para búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [foundClient, setFoundClient] = useState<ClientData | null>(null);

  // --- ESTADO DEL FORMULARIO DE REGISTRO (Expandido) ---
  const [formData, setFormData] = useState({
    // Dueño
    ownerName: '', ownerPhone: '', ownerEmail: '', ownerAddress: '',
    // Mascota
    petName: '', petBreed: '', petSpecies: 'Perro', petGender: 'Macho', petColor: '', petBirthday: '',
    // Cuestionario Binario (Valores por defecto en false/No)
    qAllergies: false, qOtherPets: false, qNervous: false, qDiseases: false,
    qAggressive: false, qConditions: false, qGeriatric: false,
    qPrizes: true, qNoise: false, qVaccination: true,
    qComments: '',
    // Legal
    knotsOption: 'no-apply', // no-apply | remove | shave
    acceptedTerms: false
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: clients } = await supabase
      .from('clients')
      .select('id, full_name, pets(id, name)')
      .ilike('phone', `%${searchTerm}%`)
      .limit(1);

    setLoading(false);
    if (clients && clients.length > 0) {
      // @ts-ignore
      setFoundClient(clients[0]); 
      setStep('client-actions');
    } else {
      alert("No encontramos ese teléfono. Intenta de nuevo o regístralo como nuevo.");
    }
  };

  // --- VISTA 1: MENÚ PRINCIPAL ---
  if (step === 'menu') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-slate-900">
          <CardHeader className="text-center">
            <div className="mx-auto bg-slate-900 text-white w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Dog size={24} />
            </div>
            <CardTitle className="text-2xl">Bienvenido a Tail Society</CardTitle>
            <CardDescription>Sistema de Recepción Digital</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button 
              onClick={() => setStep('new-client')}
              className="w-full group relative flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
            >
              <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserPlus size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Soy Cliente Nuevo</h3>
                <p className="text-sm text-slate-500">Registro completo y responsiva</p>
              </div>
            </button>

            <button 
              onClick={() => setStep('find-client')}
              className="w-full group relative flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-green-500 hover:bg-green-50 transition-all text-left"
            >
              <div className="h-12 w-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Search size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Ya soy Cliente</h3>
                <p className="text-sm text-slate-500">Búsqueda rápida por teléfono</p>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- VISTA 2: FORMULARIO CLIENTE NUEVO (Completo con Legal) ---
  if (step === 'new-client') {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setStep('menu')}>
              <ArrowLeft size={16}/>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Registro de Nuevo Ingreso</h1>
              <p className="text-slate-500">Por favor completa los 3 pasos del formulario</p>
            </div>
          </div>

          {/* PASO 1: DATOS GENERALES */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus size={18} className="text-blue-600"/> 1. Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              {/* Dueño */}
              <div className="space-y-4">
                <Label className="text-xs font-bold text-slate-400 uppercase">Datos del Responsable</Label>
                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <Input placeholder="Nombre y Apellido" value={formData.ownerName} onChange={(e) => handleInputChange('ownerName', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input placeholder="10 dígitos" type="tel" value={formData.ownerPhone} onChange={(e) => handleInputChange('ownerPhone', e.target.value)} />
                   </div>
                   <div className="space-y-2">
                    <Label>Email</Label>
                    <Input placeholder="correo@ejemplo.com" type="email" value={formData.ownerEmail} onChange={(e) => handleInputChange('ownerEmail', e.target.value)} />
                   </div>
                </div>
              </div>
              
              {/* Mascota */}
              <div className="space-y-4">
                <Label className="text-xs font-bold text-slate-400 uppercase">Datos de la Mascota</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input placeholder="Nombre mascota" value={formData.petName} onChange={(e) => handleInputChange('petName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Raza</Label>
                    <Input placeholder="Ej. French Poodle" value={formData.petBreed} onChange={(e) => handleInputChange('petBreed', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>Especie</Label>
                    <Select onValueChange={(v) => handleInputChange('petSpecies', v)} defaultValue={formData.petSpecies}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Perro">Perro</SelectItem>
                        <SelectItem value="Gato">Gato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sexo</Label>
                    <Select onValueChange={(v) => handleInputChange('petGender', v)} defaultValue={formData.petGender}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Macho">Macho</SelectItem>
                        <SelectItem value="Hembra">Hembra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Input placeholder="Ej. Blanco" value={formData.petColor} onChange={(e) => handleInputChange('petColor', e.target.value)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PASO 2: CUESTIONARIO BINARIO */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 bg-blue-50/50">
              <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                <FileText size={18}/> 2. Cuestionario de Salud y Conducta
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                {/* Pregunta Helper */}
                {[
                  { id: 'qAllergies', label: '¿Tiene alergias?' },
                  { id: 'qOtherPets', label: '¿Convive con otras mascotas?' },
                  { id: 'qNervous', label: '¿Es nervioso?' },
                  { id: 'qDiseases', label: '¿Padece de enfermedades?' },
                  { id: 'qAggressive', label: '¿Es agresivo?' },
                  { id: 'qConditions', label: '¿Padece alguna condición especial?' },
                  { id: 'qGeriatric', label: '¿Es mascota geriátrica/senior?' },
                  { id: 'qNoise', label: '¿Es sensible a algún ruido?' },
                  { id: 'qPrizes', label: '¿Se le pueden dar premios?', default: true },
                  { id: 'qVaccination', label: '¿Cuenta con vacunación completa?', default: true },
                ].map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100">
                    <Label htmlFor={q.id} className="cursor-pointer flex-1">{q.label}</Label>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${formData[q.id as keyof typeof formData] ? 'text-blue-600' : 'text-slate-300'}`}>
                        {formData[q.id as keyof typeof formData] ? 'SÍ' : 'NO'}
                      </span>
                      <Checkbox 
                        id={q.id} 
                        checked={formData[q.id as keyof typeof formData] as boolean}
                        onCheckedChange={(checked) => handleInputChange(q.id, checked)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Label>¿Tienes algún comentario importante sobre tu mascota?</Label>
                <Textarea 
                  className="mt-2" 
                  placeholder="Detalles médicos, comportamiento específico, verrugas, etc." 
                  value={formData.qComments}
                  onChange={(e) => handleInputChange('qComments', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* PASO 3: RESPONSIVA Y LEGAL */}
          <Card className="border-l-4 border-l-amber-400">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500"/> 3. Carta Responsiva y Aviso de Nudos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              <ScrollArea className="h-48 rounded-md border p-4 bg-slate-50 text-sm text-slate-600 leading-relaxed">
                <p className="font-bold mb-2">Carta Responsiva del Dueño/Responsable:</p>
                <p className="mb-2">
                  Por medio de la presente, confirmo que mi mascota cuenta con todo su esquema de vacunación actualizado y estoy al tanto de las condiciones de salud y padecimientos de mi mascota. Entiendo y acepto que si mi mascota presentara alguna reacción adversa, Tail Society se reserva el derecho de suspender el procedimiento por el bienestar de su mascota sin compensación alguna.
                </p>
                <p className="mb-2">
                  Comprendo que Tail Society no se hará responsable por daños a terceros o lesiones que pueda ocasionar su mascota al personal, la propiedad, otros clientes o mascotas, durante su estancia con nosotros. Cualquier daño correrá bajo mi responsabilidad.
                </p>
                <p className="mb-2">
                  De igual forma, entiendo que por seguridad y bienestar de todos, se reservan el derecho de admisión de mi mascota si presenta problemas dermatológicos severos o condiciones no aptas para darle atención estética.
                </p>
                <p className="mb-4">
                  Asimismo, si durante su servicio, a mi mascota se le detectan ectoparásitos como pulgas o garrapatas, se cobrará una cuota de $500 pesos por fumigación y desinfección del área y material utilizado, adicionales a los servicios recibidos.
                </p>
                
                <Separator className="my-4"/>
                
                <p className="font-bold mb-2">Aviso sobre nudos en pelo (Para mascotas de pelo largo):</p>
                <p>
                  En caso de que su mascota presente nudos apretados o en múltiples zonas y que se indique que no se podrán retirar con el cepillado normal, por salud de la mascota, será necesario optar por un servicio de retiro de nudos (costo adicional) o rapado. Además, pueden presentarse irritaciones leves en la piel después de retirar nudos apretados.
                </p>
              </ScrollArea>

              <div className="space-y-4 bg-amber-50 p-4 rounded-lg border border-amber-100">
                <Label className="font-bold text-amber-900">Selección sobre tratamiento de nudos:</Label>
                <RadioGroup defaultValue="no-apply" onValueChange={(v) => handleInputChange('knotsOption', v)} className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no-apply" id="r1" />
                    <Label htmlFor="r1">No aplica (Pelo corto / Sin nudos)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="remove" id="r2" />
                    <Label htmlFor="r2">Acepto Remoción de nudos (Costo extra según severidad)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="shave" id="r3" />
                    <Label htmlFor="r3">Acepto Rapado de mascota (Por salud y bienestar)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="terms" 
                  checked={formData.acceptedTerms}
                  onCheckedChange={(c) => handleInputChange('acceptedTerms', c)}
                  className="data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                />
                <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  He leído y acepto las condiciones del servicio y la carta responsiva.
                </Label>
              </div>

            </CardContent>
            <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-end py-4">
              <Button size="lg" className="bg-slate-900 hover:bg-slate-800 w-full md:w-auto" disabled={!formData.acceptedTerms}>
                <CheckCircle2 className="mr-2 h-4 w-4"/> Registrar y Continuar
              </Button>
            </CardFooter>
          </Card>

        </div>
      </div>
    );
  }

  // --- VISTA 3: BUSCADOR (Igual que antes) ---
  if (step === 'find-client') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={() => setStep('menu')}>
              <ArrowLeft size={16} className="mr-2"/> Regresar
            </Button>
            <CardTitle>Busquemos tu ficha</CardTitle>
            <CardDescription>Ingresa tu número de teléfono registrado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Número de Teléfono</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Ej. 55..." 
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  type="tel"
                />
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? '...' : <Search size={18} />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- VISTA 4: PANEL CLIENTE EXISTENTE (Igual que antes) ---
  if (step === 'client-actions' && foundClient) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg border-t-4 border-t-green-500">
          <CardHeader>
            <div className="flex justify-between items-center mb-2">
               <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                 Cliente Verificado
               </Badge>
               <Button variant="ghost" size="sm" onClick={() => setStep('menu')} className="text-slate-400">
                 Salir
               </Button>
            </div>
            <CardTitle className="text-2xl">Hola, {foundClient.full_name.split(' ')[0]}</CardTitle>
            <CardDescription>¿A quién vamos a consentir hoy?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tus Mascotas</Label>
              <div className="grid grid-cols-1 gap-2">
                {foundClient.pets.map((pet) => (
                  <button key={pet.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-green-500 hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <Dog size={20} className="text-slate-500 group-hover:text-green-600"/>
                      </div>
                      <div className="text-left">
                        <span className="font-bold block text-slate-800">{pet.name}</span>
                        <span className="text-xs text-slate-400">Agendar servicio</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">O bien</span></div>
            </div>
            <button className="w-full p-3 bg-blue-50 border border-blue-200 border-dashed rounded-lg text-blue-600 flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
              <UserPlus size={18} />
              <span className="font-medium">Registrar nueva mascota</span>
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}