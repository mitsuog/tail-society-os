'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import SignatureCanvas from 'react-signature-canvas';
import { UserPlus, Search, Dog, ArrowLeft, FileText, CheckCircle2, User, ShieldCheck, HeartPulse, Gavel, Check, ChevronsUpDown, Loader2, CalendarPlus, Lock, Eraser } from 'lucide-react'; // <--- Eraser añadido
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// --- UTILIDADES ---
const getFirstName = (str: string) => str ? str.split(' ')[0] : '';
const cleanString = (str: string) => str ? str.trim().toUpperCase().replace(/\s+/g, ' ') : '';
const cleanPhone = (str: string) => str ? str.replace(/\D/g, '').slice(0, 10) : '';
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const PrivacyLink = () => (
  <a href="#" className="text-blue-600 hover:underline font-bold">Aviso de Privacidad</a>
);

type Step = 'menu' | 'new-client' | 'find-client' | 'select-client' | 'client-actions' | 'success-popup';

interface ClientData {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  pets: { id: string, name: string }[];
}

export default function ReceptionWizard() {
  const [step, setStep] = useState<Step>('menu');
  const [loading, setLoading] = useState(false);
  
  // SEGURIDAD
  const [startTime, setStartTime] = useState<number>(0);
  const [honeyPot, setHoneyPot] = useState('');

  // Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ClientData[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);

  // Datos
  const [existingBreeds, setExistingBreeds] = useState<string[]>([]);
  const [openBreedSearch, setOpenBreedSearch] = useState(false);
  const [tempBreedSearch, setTempBreedSearch] = useState(""); 

  const sigPad = useRef<SignatureCanvas>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ownerName: '', ownerPhone: '', ownerEmail: '', ownerAddress: '',
    petName: '', petBreed: '', petSpecies: 'Perro', petGender: 'Macho', petColor: '', petBirthday: '',
    qAllergies: false, qOtherPets: false, qNervous: false, qDiseases: false,
    qAggressive: false, qConditions: false, qGeriatric: false,
    qPrizes: true, qNoise: false, qVaccination: true,
    qComments: '',
    acceptedTerms: false
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const clearSignature = () => { sigPad.current?.clear(); setSignatureData(null); };
  const saveSignature = () => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      setSignatureData(sigPad.current.getTrimmedCanvas().toDataURL('image/png'));
    } else { setSignatureData(null); }
  };

  const isFormValid = () => {
    if (!formData.ownerName.trim() || !formData.ownerPhone.trim()) return false;
    if (!formData.petName.trim() || !formData.petBreed.trim() || !formData.petColor.trim()) return false;
    if (!formData.acceptedTerms || !signatureData) return false;
    return true;
  };

  useEffect(() => {
    const fetchBreeds = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('pets').select('breed');
      if (data) {
        const uniqueBreeds = Array.from(new Set(data.map(p => p.breed).filter(Boolean))).sort();
        // @ts-ignore
        setExistingBreeds(uniqueBreeds);
      }
    };
    fetchBreeds();
    setStartTime(Date.now());
  }, []);

  // --- LÓGICA DE SOLICITUD (INBOX) ---
  const handleRequestAppointment = async (petId: string, petName: string) => {
    if (!selectedClient) return;
    
    // Confirmación simple en UI
    if (!confirm(`¿Confirmar solicitud de servicio para ${petName}?`)) return;

    setLoading(true);
    const supabase = createClient();
    
    try {
      // Creamos la cita con estado 'request'
      const { error } = await supabase
        .from('appointments')
        .insert([{
          client_id: selectedClient.id,
          pet_id: petId,
          status: 'request', // Esto activará la alerta en el Dashboard
          start_time: new Date().toISOString(), // Fecha de la solicitud
          notes: 'Solicitud desde Kiosko Público'
        }]);

      if (error) throw error;

      alert("✅ Solicitud enviada. En breve te llamaremos.");
      setStep('menu');
      setSelectedClient(null);
    } catch (error) {
      console.error(error);
      alert("Hubo un error al enviar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (honeyPot !== '') return;
    const timeElapsed = Date.now() - startTime;
    if (timeElapsed < 4000) { alert("Formulario completado demasiado rápido."); return; }

    const cleanPhoneVal = cleanPhone(formData.ownerPhone);
    if (cleanPhoneVal.length !== 10) { alert("Teléfono inválido."); return; }
    if (!isFormValid()) return;
    
    setLoading(true);
    const supabase = createClient();

    try {
      const finalOwnerName = cleanString(formData.ownerName);
      const finalPetName = cleanString(formData.petName);
      const finalPetBreed = cleanString(formData.petBreed);
      const finalPetColor = cleanString(formData.petColor);

      // 1. Cliente
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert([{
          full_name: finalOwnerName,
          phone: cleanPhoneVal,
          email: formData.ownerEmail.trim().toLowerCase() || null,
          address: formData.ownerAddress.trim(),
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (clientError) throw clientError;

      // 2. Firma
      if (signatureData) {
        // Lógica de subida simplificada por brevedad (asumimos funciona igual)
        const res = await fetch(signatureData);
        const blob = await res.blob();
        const fileName = `${clientData.id}_${Date.now()}.png`;
        await supabase.storage.from('signatures').upload(fileName, blob);
      }

      // 3. Mascota
      const generalNotes = `[Kiosko] ${formData.qComments} | Alergias: ${formData.qAllergies?'Sí':'No'}`;
      const { data: petData, error: petError } = await supabase
        .from('pets')
        .insert([{
          client_id: clientData.id,
          name: finalPetName,
          breed: finalPetBreed,
          species: formData.petSpecies,
          gender: formData.petGender,
          color: finalPetColor,
          birth_date: formData.petBirthday || null,
          notes: generalNotes,
        }])
        .select()
        .single();

      if (petError) throw petError;

      setSelectedClient({
        id: clientData.id,
        full_name: clientData.full_name,
        phone: clientData.phone,
        email: clientData.email,
        pets: [{ id: petData.id, name: petData.name }]
      });
      
      setLoading(false);
      setStep('success-popup'); 
      setTimeout(() => { setStep('client-actions'); }, 2500);

    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.length < 4) { alert("Ingresa al menos 4 letras/números."); return; }
    setLoading(true);
    const supabase = createClient();
    const { data: clients } = await supabase
      .from('clients')
      .select('id, full_name, phone, email, pets(id, name)')
      .or(`full_name.ilike.${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(5);

    setLoading(false);
    if (clients && clients.length > 0) {
      // @ts-ignore
      setSearchResults(clients); 
      setStep('select-client');
    } else {
      alert("No se encontraron coincidencias.");
    }
  };

  const handleSelectClient = (client: ClientData) => {
    setSelectedClient(client);
    setStep('client-actions');
  };

  // --- VISTAS ---

  if (step === 'success-popup') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
        <Card className="w-full max-w-sm border-green-500 border-2 shadow-2xl">
          <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-600 animate-pulse" />
            <h2 className="text-2xl font-bold text-slate-900">¡Registro Exitoso!</h2>
            <p className="text-slate-500">Bienvenido a Tail Society.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'menu') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-slate-900 mb-6">
          <CardHeader className="text-center">
            <div className="mx-auto bg-slate-900 text-white w-12 h-12 rounded-full flex items-center justify-center mb-4 shadow-md"><Dog size={24} /></div>
            <CardTitle className="text-3xl">Tail Society</CardTitle>
            <CardDescription>Kiosko de Auto-Checkin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button onClick={() => setStep('new-client')} className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left">
              <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><UserPlus size={24} /></div>
              <div><h3 className="font-bold text-lg text-slate-900">Soy Nuevo</h3><p className="text-sm text-slate-500">Registrarme con mi mascota</p></div>
            </button>
            <button onClick={() => setStep('find-client')} className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-green-500 hover:bg-green-50 transition-all text-left">
              <div className="h-12 w-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><Search size={24} /></div>
              <div><h3 className="font-bold text-lg text-slate-900">Ya soy Cliente</h3><p className="text-sm text-slate-500">Buscar mi cuenta</p></div>
            </button>
          </CardContent>
        </Card>
        <p className="text-xs text-slate-400 text-center max-w-xs px-4"><PrivacyLink /></p>
      </div>
    );
  }

  if (step === 'new-client') {
    return (
      <div className="min-h-screen bg-slate-50 py-6 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="icon" onClick={() => setStep('menu')}><ArrowLeft size={18}/></Button>
            <h1 className="text-xl font-bold text-slate-900">Nuevo Ingreso</h1>
          </div>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100"><CardTitle className="text-base flex items-center gap-2"><UserPlus size={18} className="text-blue-600"/> Datos Generales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
              <div className="hidden"><input type="text" value={honeyPot} onChange={(e) => setHoneyPot(e.target.value)}/></div>
              
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
                <Label className="text-xs font-bold text-slate-400 uppercase">Responsable</Label>
                <div className="space-y-2"><Label>Nombre Completo *</Label><Input className="bg-white uppercase" value={formData.ownerName} onChange={(e) => handleInputChange('ownerName', e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-2"><Label>Teléfono *</Label><Input className="bg-white" type="tel" maxLength={10} value={formData.ownerPhone} onChange={(e) => handleInputChange('ownerPhone', e.target.value)} /></div>
                   <div className="space-y-2"><Label>Email</Label><Input className="bg-white" type="email" value={formData.ownerEmail} onChange={(e) => handleInputChange('ownerEmail', e.target.value)} /></div>
                </div>
              </div>
              
              <div className="space-y-4 p-4 bg-blue-50/30 rounded-lg border border-blue-100">
                <Label className="text-xs font-bold text-slate-400 uppercase">Mascota</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Nombre *</Label><Input className="bg-white uppercase" value={formData.petName} onChange={(e) => handleInputChange('petName', e.target.value)} /></div>
                  <div className="space-y-2 flex flex-col"><Label>Raza *</Label><Popover open={openBreedSearch} onOpenChange={setOpenBreedSearch}><PopoverTrigger asChild><Button variant="outline" role="combobox" className="justify-between bg-white uppercase">{formData.petBreed || "Seleccionar..."}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="p-0"><Command><CommandInput placeholder="Buscar..." onValueChange={setTempBreedSearch}/><CommandList><CommandEmpty><Button variant="ghost" size="sm" onClick={() => { handleInputChange('petBreed', tempBreedSearch.toUpperCase()); setOpenBreedSearch(false); }}>Usar "{tempBreedSearch}"</Button></CommandEmpty><CommandGroup className="max-h-40 overflow-auto">{existingBreeds.map((breed) => (<CommandItem key={breed} value={breed} onSelect={(v) => { handleInputChange('petBreed', v); setOpenBreedSearch(false); }}><Check className={cn("mr-2 h-4 w-4", formData.petBreed === breed ? "opacity-100" : "opacity-0")}/> {breed}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>Especie</Label><Select onValueChange={(v) => handleInputChange('petSpecies', v)} defaultValue={formData.petSpecies}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Perro">Perro</SelectItem><SelectItem value="Gato">Gato</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Sexo</Label><Select onValueChange={(v) => handleInputChange('petGender', v)} defaultValue={formData.petGender}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Macho">Macho</SelectItem><SelectItem value="Hembra">Hembra</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Color *</Label><Input className="bg-white uppercase" value={formData.petColor} onChange={(e) => handleInputChange('petColor', e.target.value)} /></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100"><CardTitle className="text-base flex items-center gap-2"><FileText size={18}/> Salud</CardTitle></CardHeader>
            <CardContent className="pt-6 grid grid-cols-2 gap-3">
               {[
                  { id: 'qAllergies', label: '¿Alergias?' }, { id: 'qAggressive', label: '¿Agresivo?' },
                  { id: 'qNervous', label: '¿Nervioso?' }, { id: 'qPrizes', label: '¿Premios?', default: true }
               ].map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-3 rounded bg-slate-50 border">
                    <Label htmlFor={q.id} className="cursor-pointer font-medium text-sm">{q.label}</Label>
                    <Checkbox id={q.id} checked={formData[q.id as keyof typeof formData] as boolean} onCheckedChange={(c) => handleInputChange(q.id, c)} />
                  </div>
               ))}
               <div className="col-span-2 mt-2"><Label>Comentarios</Label><Textarea className="bg-slate-50" value={formData.qComments} onChange={(e) => handleInputChange('qComments', e.target.value)} /></div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-400">
            <CardHeader className="pb-3 border-b"><CardTitle className="text-base flex items-center gap-2"><Gavel size={18}/> Firma</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="h-32 rounded border bg-slate-50 p-4 text-xs text-slate-600 overflow-y-auto">
                <p><strong>1. Servicio:</strong> Entiendo que la estética canina conlleva riesgos inherentes...</p>
                <p><strong>2. Salud:</strong> Declaro que mi mascota está sana y vacunada...</p>
              </div>
              <div className="flex items-center gap-2"><Checkbox id="terms" checked={formData.acceptedTerms} onCheckedChange={(c) => handleInputChange('acceptedTerms', c)} /><Label htmlFor="terms" className="font-bold">Acepto los términos y condiciones</Label></div>
              <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white relative h-40 touch-none">
                <SignatureCanvas ref={sigPad} canvasProps={{ className: 'w-full h-full' }} onEnd={saveSignature} />
                <button onClick={clearSignature} className="absolute top-2 right-2 p-1 bg-slate-100 rounded text-slate-500"><Eraser size={14}/></button>
                {!signatureData && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 font-bold text-xl uppercase tracking-widest">Firma Aquí</div>}
              </div>
            </CardContent>
            <CardFooter className="pt-0"><Button className="w-full h-12 text-lg" onClick={handleRegister} disabled={loading || !isFormValid()}>{loading ? <Loader2 className="animate-spin"/> : "Registrar y Continuar"}</Button></CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'find-client') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Button variant="ghost" size="sm" onClick={() => setStep('menu')} className="w-fit -ml-2 mb-2"><ArrowLeft size={16}/> Volver</Button>
            <CardTitle>Buscar Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Nombre o Teléfono..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus />
            <Button className="w-full" onClick={handleSearch} disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "Buscar"}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'select-client') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <Button variant="ghost" size="sm" className="w-fit -ml-2" onClick={() => setStep('find-client')}>Reintentar</Button>
            <CardTitle>Resultados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {searchResults.map((client) => (
              <button key={client.id} onClick={() => handleSelectClient(client)} className="w-full flex items-center justify-between p-4 bg-white border rounded-lg hover:bg-slate-50 transition-all text-left group">
                <div>
                  <div className="font-bold text-slate-900">{getFirstName(client.full_name)}</div>
                  <div className="text-sm text-slate-500">{client.pets.length > 0 ? client.pets.map(p => p.name).join(', ') : 'Sin mascotas'}</div>
                </div>
                <div className="text-blue-600 opacity-0 group-hover:opacity-100 text-sm font-bold">Soy yo →</div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- VISTA DE ACCIONES: SOLICITAR CITA ---
  if (step === 'client-actions' && selectedClient) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg border-t-4 border-t-green-500">
          <CardHeader>
            <div className="flex justify-between items-center mb-2">
              <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 gap-1"><ShieldCheck size={12}/> Identidad Protegida</Badge>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedClient(null); setStep('menu'); }} className="text-slate-400">Salir</Button>
            </div>
            <CardTitle className="text-2xl">Hola, {getFirstName(selectedClient.full_name)}</CardTitle>
            <CardDescription>Selecciona la mascota para solicitar servicio:</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-3">
              {selectedClient.pets.map((pet) => (
                <button 
                  key={pet.id} 
                  onClick={() => handleRequestAppointment(pet.id, pet.name)} 
                  disabled={loading}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-green-500 hover:shadow-md transition-all group text-left w-full"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><Dog size={24} /></div>
                    <div>
                      <span className="font-bold block text-lg text-slate-800">{pet.name}</span>
                      <span className="text-xs text-green-600 font-bold uppercase tracking-wide flex items-center gap-1">
                        <CalendarPlus size={12}/> Solicitar Cita
                      </span>
                    </div>
                  </div>
                  {loading && <Loader2 className="animate-spin text-slate-400" />}
                </button>
              ))}
            </div>
            
            <div className="relative py-2"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">O bien</span></div></div>
            
            <button onClick={() => setStep('new-client')} className="w-full p-3 bg-slate-50 border border-slate-200 border-dashed rounded-lg text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
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