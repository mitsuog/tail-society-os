//tail-society-os/src/app/checkin/page.tsx

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
import { UserPlus, Search, Dog, ArrowLeft, FileText, CheckCircle2, AlertTriangle, ShieldCheck, User, PawPrint, Lock, HeartPulse, Gavel, Check, ChevronsUpDown, Eraser, PenTool, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// --- UTILIDADES DE LIMPIEZA Y VALIDACIÓN ---
const getFirstName = (str: string) => str ? str.split(' ')[0] : '';
const cleanString = (str: string) => str ? str.trim().toUpperCase().replace(/\s+/g, ' ') : ''; // Mayúsculas y sin espacios dobles
const cleanPhone = (str: string) => str ? str.replace(/\D/g, '').slice(0, 10) : ''; // Solo números
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const PrivacyLink = () => (
  <a href="https://tailsociety.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">
    Aviso de Privacidad
  </a>
);

// --- TIPOS ---
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
  
  // SEGURIDAD ANTI-SPAM
  const [startTime, setStartTime] = useState<number>(0);
  const [honeyPot, setHoneyPot] = useState(''); // Campo trampa invisible

  // Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ClientData[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);

  // Autocompletar Razas
  const [existingBreeds, setExistingBreeds] = useState<string[]>([]);
  const [openBreedSearch, setOpenBreedSearch] = useState(false);
  const [tempBreedSearch, setTempBreedSearch] = useState(""); 

  // Firma Digital
  const sigPad = useRef<SignatureCanvas>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Formulario
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

  const clearSignature = () => {
    sigPad.current?.clear();
    setSignatureData(null);
  };

  const saveSignature = () => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      setSignatureData(sigPad.current.getTrimmedCanvas().toDataURL('image/png'));
    } else {
      setSignatureData(null);
    }
  };

  // --- VALIDACIÓN VISUAL (Habilita/Deshabilita botón) ---
  const isFormValid = () => {
    // Validaciones básicas de presencia
    if (!formData.ownerName.trim() || !formData.ownerPhone.trim()) return false;
    if (!formData.petName.trim() || !formData.petBreed.trim() || !formData.petColor.trim()) return false;
    if (!formData.acceptedTerms || !signatureData) return false;
    return true;
  };

  // --- INIT ---
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
    // Iniciar reloj de seguridad al montar el componente
    setStartTime(Date.now());
  }, []);

  // --- LÓGICA DE REGISTRO BLINDADA ---
  const handleRegister = async () => {
    // 1. DEFENSA: HONEYPOT (Si el campo invisible tiene texto, es un bot)
    if (honeyPot !== '') {
      console.warn("Intento de spam bloqueado.");
      return; 
    }

    // 2. DEFENSA: TIEMPO MÍNIMO (Evita scripts de llenado rápido)
    const timeElapsed = Date.now() - startTime;
    if (timeElapsed < 4000) { 
      alert("El formulario se completó demasiado rápido. Por favor revisa tus datos con calma.");
      return;
    }

    // 3. DEFENSA: CALIDAD DE DATOS (Validaciones estrictas)
    const cleanPhoneVal = cleanPhone(formData.ownerPhone);
    if (cleanPhoneVal.length !== 10) {
      alert("El teléfono es inválido. Deben ser 10 dígitos exactos.");
      return;
    }

    if (formData.ownerEmail && !isValidEmail(formData.ownerEmail.trim())) {
      alert("El correo electrónico no tiene un formato válido.");
      return;
    }

    // Evitar nombres basura como "a", "yo", "...", "asd"
    if (formData.ownerName.trim().length < 5) {
      alert("Por favor ingresa el Nombre y Apellido completos del responsable.");
      return;
    }

    if (!isFormValid()) return; // Doble check
    
    setLoading(true);
    const supabase = createClient();

    try {
      // 4. SANEAMIENTO (Limpieza final antes de enviar a BD)
      const finalOwnerName = cleanString(formData.ownerName);
      const finalPetName = cleanString(formData.petName);
      const finalPetBreed = cleanString(formData.petBreed);
      const finalPetColor = cleanString(formData.petColor);
      const finalEmail = formData.ownerEmail.trim().toLowerCase();

      // A. Insertar Cliente
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert([{
          full_name: finalOwnerName,
          phone: cleanPhoneVal,
          email: finalEmail || null,
          address: formData.ownerAddress.trim(),
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (clientError) throw clientError;

      // B. Subir Firma
      let signatureUrl = null;
      if (signatureData) {
        try {
          const res = await fetch(signatureData);
          const blob = await res.blob();
          const fileName = `${clientData.id}_${Date.now()}.png`;
          const { data: uploadData } = await supabase.storage.from('signatures').upload(fileName, blob);
          if (uploadData) signatureUrl = uploadData.path;
        } catch (e) { console.error("Error subiendo firma", e); }
      }

      // C. Preparar Datos Específicos
      const behaviorList = [];
      if (formData.qNervous) behaviorList.push("Nervioso");
      if (formData.qAggressive) behaviorList.push("Agresivo");
      if (formData.qNoise) behaviorList.push("Sensible a Ruidos");
      const behaviorString = behaviorList.length > 0 ? behaviorList.join(', ') : null;

      const allergyString = formData.qAllergies ? "SÍ PRESENTA ALERGIAS" : null;

      const generalNotes = `
        [Detalles Médicos]
        Convive: ${formData.qOtherPets ? 'SÍ' : 'No'} | Enferm: ${formData.qDiseases ? 'SÍ' : 'No'}
        Condición: ${formData.qConditions ? 'SÍ' : 'No'} | Senior: ${formData.qGeriatric ? 'SÍ' : 'No'}
        Premios: ${formData.qPrizes ? 'SÍ' : 'No'} | Vacunas: ${formData.qVaccination ? 'SÍ' : 'No'}
        ---
        Notas: ${formData.qComments}
      `;

      // D. Insertar Mascota
      const { data: petData, error: petError } = await supabase
        .from('pets')
        .insert([{
          client_id: clientData.id,
          name: finalPetName,
          breed: finalPetBreed,
          species: formData.petSpecies,
          gender: formData.petGender,
          color: finalPetColor,
          birth_date: formData.petBirthday ? formData.petBirthday : null,
          allergies: allergyString,
          behavior_notes: behaviorString,
          notes: generalNotes,
        }])
        .select()
        .single();

      if (petError) throw petError;

      // Éxito
      setSelectedClient({
        id: clientData.id,
        full_name: clientData.full_name,
        phone: clientData.phone,
        email: clientData.email,
        pets: petData ? [{ id: petData.id, name: petData.name }] : []
      });
      
      setLoading(false);
      setStep('success-popup'); 

      setTimeout(() => { setStep('client-actions'); }, 2500);

    } catch (error: any) {
      console.error(error);
      // Manejo de error específico para duplicados (Postgres error 23505)
      if (error.code === '23505') {
         alert("Error: Este cliente o mascota ya se encuentra registrado en el sistema. Por favor usa la opción 'Ya soy Cliente'.");
      } else {
         alert(`Error al registrar: ${error.message}`);
      }
      setLoading(false);
    }
  };

  // --- LÓGICA DE BÚSQUEDA ---
  const handleSearch = async () => {
    if (searchTerm.length < 4) { alert("Por seguridad, ingresa al menos 4 caracteres."); return; }
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
      alert("No encontramos coincidencias.");
    }
  };

  const handleSelectClient = (client: ClientData) => {
    setSelectedClient(client);
    setStep('client-actions');
  };

  // --- VISTAS ---
  
  // POPUP ÉXITO
  if (step === 'success-popup') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
        <Card className="w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-300 border-green-500 border-2">
          <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-2"><CheckCircle2 className="h-10 w-10 text-green-600 animate-pulse" /></div>
            <h2 className="text-2xl font-bold text-slate-900">¡Registro Exitoso!</h2>
            <p className="text-slate-500">Bienvenido a la familia Tail Society.<br/>Redirigiendo...</p>
            <Loader2 className="h-5 w-5 animate-spin text-slate-400 mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // MENÚ PRINCIPAL
  if (step === 'menu') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-slate-900 mb-6">
          <CardHeader className="text-center">
            <div className="mx-auto bg-slate-900 text-white w-12 h-12 rounded-full flex items-center justify-center mb-4 shadow-md"><Dog size={24} /></div>
            <CardTitle className="text-2xl sm:text-3xl">Tail Society</CardTitle>
            <CardDescription className="text-base">Recepción Digital Inteligente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button onClick={() => setStep('new-client')} className="w-full group relative flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-all text-left">
              <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0"><UserPlus size={24} /></div>
              <div><h3 className="font-bold text-slate-900 text-lg">Soy Cliente Nuevo</h3><p className="text-sm text-slate-500 leading-tight">Registro completo y contrato</p></div>
            </button>
            <button onClick={() => setStep('find-client')} className="w-full group relative flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-green-500 hover:bg-green-50 active:bg-green-100 transition-all text-left">
              <div className="h-12 w-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0"><Search size={24} /></div>
              <div><h3 className="font-bold text-slate-900 text-lg">Ya soy Cliente</h3><p className="text-sm text-slate-500 leading-tight">Búsqueda rápida</p></div>
            </button>
          </CardContent>
        </Card>
        <p className="text-xs text-slate-400 text-center max-w-xs px-4">Sus datos están protegidos conforme a la LFPDPPP. <br/> <PrivacyLink /></p>
      </div>
    );
  }

  // FORMULARIO DE REGISTRO (CON VALIDACIONES EN UI)
  if (step === 'new-client') {
    return (
      <div className="min-h-screen bg-slate-50 py-6 px-3 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="icon" onClick={() => setStep('menu')} className="shrink-0"><ArrowLeft size={18}/></Button>
            <div><h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">Nuevo Ingreso</h1><p className="text-sm text-slate-500">Campos marcados con <span className="text-red-500">*</span> son obligatorios</p></div>
          </div>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100"><CardTitle className="text-base sm:text-lg flex items-center gap-2"><UserPlus size={18} className="text-blue-600"/> 1. Información General</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
              
              {/* HONEYPOT (INVISIBLE) */}
              <div className="hidden opacity-0 h-0 w-0 overflow-hidden">
                <label>Do not fill this field</label>
                <input type="text" name="fax_field" value={honeyPot} onChange={(e) => setHoneyPot(e.target.value)} tabIndex={-1} autoComplete="off"/>
              </div>

              {/* RESPONSABLE */}
              <div className="space-y-4 p-4 bg-slate-50/50 rounded-lg border border-slate-100">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Responsable</Label>
                <div className="space-y-2"><Label>Nombre Completo <span className="text-red-500">*</span></Label><Input className="bg-white uppercase" placeholder="NOMBRE Y APELLIDO" value={formData.ownerName} onChange={(e) => handleInputChange('ownerName', e.target.value)} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <div className="space-y-2"><Label>Teléfono (10 dígitos) <span className="text-red-500">*</span></Label><Input className="bg-white" type="tel" maxLength={10} placeholder="Ej: 5512345678" value={formData.ownerPhone} onChange={(e) => handleInputChange('ownerPhone', e.target.value)} /></div>
                   <div className="space-y-2"><Label>Email <span className="text-slate-400 font-normal text-xs">(Opcional)</span></Label><Input className="bg-white" type="email" value={formData.ownerEmail} onChange={(e) => handleInputChange('ownerEmail', e.target.value)} /></div>
                </div>
              </div>
              
              {/* MASCOTA */}
              <div className="space-y-4 p-4 bg-blue-50/30 rounded-lg border border-blue-100">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mascota</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Nombre <span className="text-red-500">*</span></Label><Input className="bg-white uppercase" value={formData.petName} onChange={(e) => handleInputChange('petName', e.target.value)} /></div>
                  <div className="space-y-2 flex flex-col"><Label>Raza <span className="text-red-500">*</span></Label><Popover open={openBreedSearch} onOpenChange={setOpenBreedSearch}><PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={openBreedSearch} className="justify-between font-normal w-full bg-white uppercase">{formData.petBreed ? formData.petBreed : "Seleccionar..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="p-0 w-[250px] sm:w-[300px]" align="start"><Command><CommandInput placeholder="BUSCAR RAZA..." onValueChange={(val) => setTempBreedSearch(val)}/><CommandList><CommandEmpty className="py-2 px-2"><p className="text-sm text-slate-500 mb-2 px-2">No encontrada.</p><Button variant="secondary" size="sm" className="w-full h-8" onClick={() => { handleInputChange('petBreed', tempBreedSearch.toUpperCase()); setOpenBreedSearch(false); }}>➕ Usar: "{tempBreedSearch.toUpperCase()}"</Button></CommandEmpty><CommandGroup heading="Razas Existentes" className="max-h-[200px] overflow-auto">{existingBreeds.map((breed) => (<CommandItem key={breed} value={breed} onSelect={(v) => { handleInputChange('petBreed', v); setOpenBreedSearch(false); }}><Check className={cn("mr-2 h-4 w-4", formData.petBreed === breed ? "opacity-100" : "opacity-0")}/> {breed}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>Especie</Label><Select onValueChange={(v) => handleInputChange('petSpecies', v)} defaultValue={formData.petSpecies}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Perro">Perro</SelectItem><SelectItem value="Gato">Gato</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Sexo</Label><Select onValueChange={(v) => handleInputChange('petGender', v)} defaultValue={formData.petGender}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Macho">Macho</SelectItem><SelectItem value="Hembra">Hembra</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Color <span className="text-red-500">*</span></Label><Input className="bg-white uppercase" value={formData.petColor} onChange={(e) => handleInputChange('petColor', e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label className="flex items-center gap-2">Fecha de Nacimiento <span className="text-slate-400 font-normal text-xs">(Opcional)</span></Label><Input type="date" className="bg-white" value={formData.petBirthday} onChange={(e) => handleInputChange('petBirthday', e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 bg-blue-50/50"><CardTitle className="text-base sm:text-lg flex items-center gap-2 text-blue-800"><FileText size={18}/> 2. Cuestionario de Salud</CardTitle></CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                {[
                  { id: 'qAllergies', label: '¿Tiene alergias?' }, { id: 'qOtherPets', label: '¿Convive con otros?' },
                  { id: 'qNervous', label: '¿Es nervioso?' }, { id: 'qDiseases', label: '¿Enfermedades?' },
                  { id: 'qAggressive', label: '¿Es agresivo?' }, { id: 'qConditions', label: '¿Condición especial?' },
                  { id: 'qGeriatric', label: '¿Es senior?' }, { id: 'qNoise', label: '¿Sensible a ruidos?' },
                  { id: 'qPrizes', label: '¿Premios?', default: true }, { id: 'qVaccination', label: '¿Vacunación?', default: true },
                ].map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
                    <Label htmlFor={q.id} className="flex-1 cursor-pointer font-medium text-sm text-slate-700">{q.label}</Label>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold ${formData[q.id as keyof typeof formData] ? 'text-blue-600' : 'text-slate-400'}`}>{formData[q.id as keyof typeof formData] ? 'SÍ' : 'NO'}</span>
                      <Checkbox id={q.id} checked={formData[q.id as keyof typeof formData] as boolean} onCheckedChange={(c) => handleInputChange(q.id, c)} className="h-5 w-5"/>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6"><Label className="font-bold text-slate-700">Comentarios adicionales <span className="text-slate-400 font-normal text-xs">(Opcional)</span></Label><Textarea className="mt-2 bg-slate-50" placeholder="Detalles médicos o de conducta..." value={formData.qComments} onChange={(e) => handleInputChange('qComments', e.target.value)} /></div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-400">
            <CardHeader className="pb-3 border-b border-slate-100"><CardTitle className="text-base sm:text-lg flex items-center gap-2"><Gavel size={18} className="text-amber-600"/> 3. Acuerdos de Servicio y Firma</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-6">
              <ScrollArea className="h-96 rounded-md border border-slate-200 bg-white p-4 sm:p-6 text-sm text-slate-700 shadow-inner">
                {/* TEXTOS LEGALES */}
                <div className="mb-6"><h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-base"><HeartPulse size={16} className="text-blue-600"/> 1. Naturaleza del Servicio y Seguridad</h4><p className="text-justify mb-3 leading-relaxed">Entiendo que la estética canina es una actividad que involucra el trabajo directo con seres vivos, los cuales pueden tener movimientos repentinos e impredecibles. Acepto que, a pesar de los protocolos de seguridad y el manejo profesional de Tail Society, existen riesgos inherentes (como rasguños menores o irritación) al utilizar herramientas punzocortantes en animales en movimiento.</p><div className="bg-blue-50 p-3 rounded-md border border-blue-100"><p className="text-justify font-medium text-slate-900 text-xs sm:text-sm"><strong>Política de Cero Sedantes:</strong> Tail Society NO utiliza ni administra tranquilizantes o sedantes bajo ninguna circunstancia. Si la mascota arriba bajo el efecto de sedantes previamente administrados por el dueño, el servicio será denegado por seguridad cardíaca del animal.</p></div></div>
                <div className="mb-6"><h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-base"><ShieldCheck size={16} className="text-amber-600"/> 2. Suspensión y Admisión</h4><p className="text-justify mb-2 leading-relaxed">Nos reservamos el derecho de suspender o negar el servicio en cualquier momento si la mascota muestra signos de:</p><ul className="list-disc pl-5 mb-3 space-y-1 text-xs sm:text-sm"><li><strong>Estrés severo o pánico:</strong> Priorizamos la integridad mental y física de la mascota.</li><li><strong>Agresividad incontrolable:</strong> Si la mascota intenta morder al personal o ataca a otros perros.</li></ul><div className="border-l-4 border-slate-300 pl-3 py-2 bg-slate-50"><p className="text-justify text-sm font-semibold text-slate-800">Derecho de Admisión y Trato Digno:</p><p className="text-justify text-xs sm:text-sm mt-1">Tail Society mantiene una política de <strong>Cero Tolerancia al Maltrato</strong>. Nos reservamos el derecho de admisión ante cualquier conducta violenta, física o verbal, por parte de los propietarios hacia el personal o hacia las mascotas.</p></div></div>
                <div className="mb-6"><h4 className="font-bold text-slate-900 mb-2 border-b pb-1 text-base">3. Condiciones del Manto y Parásitos</h4><div className="space-y-4"><div><p className="text-justify leading-relaxed mb-2"><strong>Política de Nudos ("Humanidad sobre Vanidad"):</strong></p><p className="text-justify text-xs sm:text-sm mb-2">Si el pelaje presenta nudos pegados a la piel, por bienestar animal, <strong>NO se intentarán deshacer con cepillo</strong>, ya que esto causa dolor severo y daños a la piel. Se procederá obligatoriamente al <strong>rapado sanitario</strong>.</p><p className="text-justify text-xs sm:text-sm italic text-slate-500 bg-slate-50 p-2 rounded">Liberación de Responsabilidad: Al retirar nudos apretados, es común descubrir (o que se generen) irritaciones, enrojecimientos o hematomas debido a la falta de circulación sanguínea previa. Tail Society no es responsable por estas condiciones provocadas por el estado del manto previo a la cita.</p></div><div className="bg-red-50 p-3 rounded-md border border-red-200"><p className="text-red-800 text-sm font-bold text-justify flex gap-2 items-start"><AlertTriangle size={18} className="shrink-0 mt-0.5"/><span>Si se detectan ectoparásitos (pulgas/garrapatas), se aplicará un cargo automático de <strong>$500.00 MXN</strong> por fumigación y limpieza profunda del área.</span></p></div></div></div>
                <div className="mt-4 pt-4 border-t border-slate-100"><p className="text-xs text-slate-500 text-justify">Sus datos personales son tratados conforme a la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong>. Puede consultar nuestro Aviso de Privacidad Integral en <a href="https://tailsociety.com/policies/privacy-policy" target="_blank" className="text-blue-600 underline">nuestro sitio web</a>.</p></div>
              </ScrollArea>
              
              <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-lg border border-amber-200 mb-4">
                <Checkbox id="terms" checked={formData.acceptedTerms} onCheckedChange={(c) => handleInputChange('acceptedTerms', c)} className="mt-1 h-5 w-5 data-[state=checked]:bg-slate-900"/>
                <div className="grid gap-1.5 leading-none"><Label htmlFor="terms" className="text-sm font-bold text-slate-900 cursor-pointer leading-tight">He leído, entiendo y acepto los protocolos de servicio y seguridad. <span className="text-red-500">*</span></Label><p className="text-xs text-slate-600 text-justify mt-1">Al marcar esta casilla y firmar, declaro que la información proporcionada es verídica y acepto las condiciones estipuladas.</p></div>
              </div>
              
              <div className="space-y-3">
                <Label className="flex items-center gap-2 font-bold text-slate-900"><PenTool size={16} className="text-slate-500"/> Firma del Responsable <span className="text-red-500">*</span>:</Label>
                <div className={cn("border-2 border-dashed rounded-xl overflow-hidden bg-white touch-none shadow-inner", signatureData ? "border-green-500 bg-green-50/20" : "border-slate-300")}><SignatureCanvas ref={sigPad} penColor="black" canvasProps={{ className: 'w-full h-40 cursor-crosshair' }} onEnd={saveSignature} /></div>
                <div className="flex justify-between items-center text-xs text-slate-400"><span>* Firme dentro del recuadro usando su dedo o mouse.</span><Button variant="ghost" size="sm" onClick={clearSignature} className="text-red-500 hover:bg-red-50 hover:text-red-600 h-8"><Eraser size={14} className="mr-1"/> Borrar Firma</Button></div>
              </div>
            </CardContent>
            
            <CardFooter className="bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
              {!isFormValid() && (<p className="text-xs text-red-500 font-medium">* Por favor complete todos los campos obligatorios y firme para continuar.</p>)}
              <Button size="lg" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 ml-auto" disabled={!isFormValid() || loading} onClick={handleRegister}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Guardando...</> : <><CheckCircle2 className="mr-2 h-4 w-4"/> Confirmar y Registrar</>}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // BÚSQUEDA Y SELECCIÓN (Sin cambios sustanciales)
  if (step === 'find-client') { return ( <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4"> <Card className="w-full max-w-md shadow-lg"> <CardHeader> <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={() => setStep('menu')}><ArrowLeft size={16} className="mr-2"/> Regresar</Button> <CardTitle>Busquemos tu ficha</CardTitle> <CardDescription>Ingresa Nombre (Inicio) o Teléfono</CardDescription> </CardHeader> <CardContent className="space-y-4"> <div className="space-y-2"> <div className="flex gap-2"> <Input placeholder="Ej. Juan o 5678..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()}/> <Button onClick={handleSearch} disabled={loading}>{loading ? '...' : <Search size={18} />}</Button> </div> </div> <p className="text-xs text-slate-400">*Mínimo 4 caracteres.</p> </CardContent> <CardFooter className="bg-slate-50 border-t p-3 text-xs text-slate-400 justify-center"> Protegemos tus datos bajo la LFPDPPP. <PrivacyLink /> </CardFooter> </Card> </div> ); }

  if (step === 'select-client') { return ( <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4"> <Card className="w-full max-w-lg shadow-lg border-t-4 border-t-slate-900"> <CardHeader> <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={() => setStep('find-client')}><ArrowLeft size={16} className="mr-2"/> Buscar de nuevo</Button> <CardTitle>¿Cuál eres tú?</CardTitle> <CardDescription>Identifícate por tus mascotas.</CardDescription> </CardHeader> <CardContent className="space-y-3"> {searchResults.map((client) => ( <button key={client.id} onClick={() => handleSelectClient(client)} className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-900 hover:shadow-md transition-all group text-left"> <div className="flex items-center gap-4"> <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0"><User size={24} /></div> <div> <div className="font-bold text-slate-900 text-lg">{getFirstName(client.full_name)}</div> <div className="text-sm text-slate-600 flex items-center gap-2 mt-1"><PawPrint size={14} className="text-blue-500"/><span className="font-medium">{client.pets.length > 0 ? client.pets.map(p => p.name).join(', ') : 'Sin mascotas'}</span></div> </div> </div> <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold shrink-0">Soy yo</div> </button> ))} </CardContent> <CardFooter className="bg-slate-50 border-t p-4 text-xs text-slate-400 justify-center text-center"> <Lock size={12} className="inline mr-1"/> Datos ocultos por seguridad (LFPDPPP). <br/> <PrivacyLink /> </CardFooter> </Card> </div> ); }

  if (step === 'client-actions' && selectedClient) { return ( <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4"> <Card className="w-full max-w-lg shadow-lg border-t-4 border-t-green-500"> <CardHeader> <div className="flex justify-between items-center mb-2"> <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 flex items-center gap-1"><ShieldCheck size={12}/> Identidad Protegida</Badge> <Button variant="ghost" size="sm" onClick={() => { setSelectedClient(null); setStep('menu'); }} className="text-slate-400">Salir</Button> </div> <CardTitle className="text-2xl">Hola, {getFirstName(selectedClient.full_name)}</CardTitle> <CardDescription>¿Qué mascota nos visita hoy?</CardDescription> </CardHeader> <CardContent className="space-y-6"> <div className="grid grid-cols-1 gap-3"> {selectedClient.pets.map((pet) => ( <button key={pet.id} onClick={() => alert(`¡Elegiste a ${pet.name}! Aquí abriríamos el menú de servicios.`)} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-green-500 hover:shadow-md transition-all group"> <div className="flex items-center gap-4"> <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><Dog size={24} /></div> <div className="text-left"><span className="font-bold block text-lg text-slate-800">{pet.name}</span><span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Agendar Servicio</span></div> </div> </button> ))} </div> <div className="relative py-2"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">O bien</span></div></div> <button className="w-full p-3 bg-slate-50 border border-slate-200 border-dashed rounded-lg text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"><UserPlus size={18} /><span className="font-medium">Registrar nueva mascota</span></button> </CardContent> </Card> </div> ); }

  return null;
}