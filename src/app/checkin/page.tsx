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
import { UserPlus, Search, Dog, ArrowLeft, FileText, CheckCircle2, AlertTriangle, ShieldCheck, User, PawPrint, Lock, HeartPulse, Gavel, Check, ChevronsUpDown, Eraser, PenTool, Loader2, CalendarPlus } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
// 1. IMPORTAMOS IMAGE DE NEXT
import Image from 'next/image';
import { searchClients, createAppointmentRequest, registerNewClient } from './actions';

// --- UTILIDADES ---
const getFirstName = (str: string) => str ? str.split(' ')[0] : '';
const cleanString = (str: string) => str ? str.trim().toUpperCase().replace(/\s+/g, ' ') : '';
const cleanPhone = (str: string) => str ? str.replace(/\D/g, '').slice(0, 10) : '';
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const PrivacyLink = () => (
  <a href="#" className="text-cyan-600 hover:text-cyan-700 hover:underline font-bold transition-colors">Aviso de Privacidad</a>
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

  // --- ACTIONS ---
  const handleRequestAppointment = async (petId: string, petName: string) => {
    if (!selectedClient) return;
    if (!confirm(`¿Confirmar solicitud de servicio para ${petName}?`)) return;

    setLoading(true);
    try {
      const result = await createAppointmentRequest(selectedClient.id, petId);
      if (!result.success) throw new Error(result.error);
      alert("✅ Solicitud enviada. En breve te llamaremos.");
      setStep('menu');
      setSelectedClient(null);
    } catch (error: any) {
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

    try {
      const clientData = {
        full_name: cleanString(formData.ownerName),
        phone: cleanPhoneVal,
        email: formData.ownerEmail.trim().toLowerCase() || null,
        address: formData.ownerAddress.trim(),
        created_at: new Date().toISOString(),
      };

      const petData = {
        name: cleanString(formData.petName),
        breed: cleanString(formData.petBreed),
        species: formData.petSpecies,
        gender: formData.petGender,
        color: cleanString(formData.petColor),
        birth_date: formData.petBirthday || null,
        notes: `[Kiosko] ${formData.qComments} | Alergias: ${formData.qAllergies?'Sí':'No'}`,
      };

      const result = await registerNewClient(clientData, petData, signatureData);

      if (!result.success) {
        if (result.error === 'DUPLICATE_ENTRY') throw new Error("Este cliente ya existe. Usa 'Ya soy Cliente'.");
        throw new Error(result.error);
      }

      const { client, pet } = result;
      setSelectedClient({ id: client.id, full_name: client.full_name, phone: client.phone, email: client.email, pets: [{ id: pet.id, name: pet.name }] });
      
      setLoading(false);
      setStep('success-popup'); 
      setTimeout(() => { setStep('client-actions'); }, 2500);

    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.length < 4) { alert("Ingresa al menos 4 letras/números."); return; }
    setLoading(true);
    try {
        const result = await searchClients(searchTerm);
        if (!result.success) throw new Error(result.error);
        if (result.data && result.data.length > 0) {
            // @ts-ignore
            setSearchResults(result.data); 
            setStep('select-client');
        } else {
            alert("No se encontraron coincidencias.");
        }
    } catch (e) { alert("Error al buscar."); } 
    finally { setLoading(false); }
  };

  const handleSelectClient = (client: ClientData) => {
    setSelectedClient(client);
    setStep('client-actions');
  };

  // --- VISTAS ---

  if (step === 'success-popup') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2E3856]/90 backdrop-blur-md p-4 animate-in fade-in duration-500">
        <Card className="w-full max-w-sm border-none shadow-2xl bg-white/95 backdrop-blur-xl">
          <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
                <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
                <CheckCircle2 className="h-20 w-20 text-green-500 relative z-10" />
            </div>
            <div className="space-y-2">
                <h2 className="text-3xl font-black text-[#2E3856]">¡Registro Exitoso!</h2>
                <p className="text-slate-500 font-medium">Bienvenido a la familia Tail Society.</p>
            </div>
            <Loader2 className="h-6 w-6 animate-spin text-cyan-500 mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. MODIFICACIÓN PRINCIPAL: MENÚ (INICIO) CON LOGO Y ESTILO MEJORADO
  if (step === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-400/10 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <Card className="w-full max-w-md shadow-2xl border-none bg-white/80 backdrop-blur-xl relative z-10 overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600" />
          
          <CardHeader className="text-center pt-8 pb-4 space-y-4">
            {/* LOGO AREA */}
            <div className="mx-auto relative w-32 h-32 mb-2 transform group-hover:scale-105 transition-transform duration-700 ease-out">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 to-blue-600 blur-2xl opacity-20 rounded-full" />
                <Image 
                    src="/Logo500x500.png" 
                    alt="Tail Society" 
                    fill 
                    className="object-contain drop-shadow-xl relative z-10"
                    priority
                />
            </div>
            
            <div className="space-y-1">
                <CardTitle className="text-3xl font-black text-[#2E3856] tracking-tight">Tail Society</CardTitle>
                <CardDescription className="text-base font-medium text-slate-500">
                    Kiosko de Auto-Atención
                </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pb-8 px-8">
            <button 
                onClick={() => setStep('new-client')} 
                className="w-full group/btn relative flex items-center gap-5 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-cyan-400 hover:shadow-cyan-100 hover:shadow-lg transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-50 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover/btn:scale-110 transition-transform duration-300 shadow-inner relative z-10">
                <UserPlus size={28} />
              </div>
              <div className="relative z-10">
                <h3 className="font-bold text-xl text-[#2E3856] group-hover/btn:text-blue-700 transition-colors">Soy Nuevo</h3>
                <p className="text-sm text-slate-500 font-medium">Registrarme con mi mascota</p>
              </div>
            </button>

            <button 
                onClick={() => setStep('find-client')} 
                className="w-full group/btn relative flex items-center gap-5 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-green-400 hover:shadow-green-100 hover:shadow-lg transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 text-green-600 flex items-center justify-center shrink-0 group-hover/btn:scale-110 transition-transform duration-300 shadow-inner relative z-10">
                <Search size={28} />
              </div>
              <div className="relative z-10">
                <h3 className="font-bold text-xl text-[#2E3856] group-hover/btn:text-green-700 transition-colors">Ya soy Cliente</h3>
                <p className="text-sm text-slate-500 font-medium">Buscar mi cuenta</p>
              </div>
            </button>
          </CardContent>
          <CardFooter className="bg-slate-50/50 border-t border-slate-100 p-4 text-center justify-center">
             <p className="text-xs text-slate-400 font-medium">
               Datos protegidos por SSL. <PrivacyLink />
             </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // --- RESTO DE VISTAS (Con estilo limpio) ---

  if (step === 'new-client') {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
        <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="icon" onClick={() => setStep('menu')} className="hover:bg-white/50"><ArrowLeft size={20}/></Button>
            <div>
                <h1 className="text-2xl font-bold text-[#2E3856]">Nuevo Ingreso</h1>
                <p className="text-slate-500 text-sm">Complete el perfil digital</p>
            </div>
          </div>

          <Card className="border-none shadow-md overflow-hidden">
            <div className="h-1 w-full bg-blue-500"></div>
            <CardHeader className="pb-4 bg-slate-50/50 border-b"><CardTitle className="text-lg flex items-center gap-2 text-[#2E3856]"><UserPlus size={20} className="text-blue-500"/> Información General</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8">
              <div className="hidden"><input type="text" value={honeyPot} onChange={(e) => setHoneyPot(e.target.value)}/></div>
              
              <div className="space-y-5 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Responsable</Label>
                <div className="space-y-2"><Label>Nombre Completo <span className="text-red-500">*</span></Label><Input className="bg-white h-12 text-lg uppercase font-medium focus-visible:ring-blue-500" placeholder="NOMBRE Y APELLIDO" value={formData.ownerName} onChange={(e) => handleInputChange('ownerName', e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2"><Label>Teléfono <span className="text-red-500">*</span></Label><Input className="bg-white h-11 font-medium" type="tel" maxLength={10} value={formData.ownerPhone} onChange={(e) => handleInputChange('ownerPhone', e.target.value)} /></div>
                   <div className="space-y-2"><Label>Email</Label><Input className="bg-white h-11" type="email" value={formData.ownerEmail} onChange={(e) => handleInputChange('ownerEmail', e.target.value)} /></div>
                </div>
              </div>
              
              <div className="space-y-5 p-6 bg-blue-50/40 rounded-2xl border border-blue-100/50">
                <Label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Mascota</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nombre <span className="text-red-500">*</span></Label><Input className="bg-white h-12 text-lg uppercase font-bold text-blue-900 border-blue-200 focus-visible:ring-blue-500" value={formData.petName} onChange={(e) => handleInputChange('petName', e.target.value)} /></div>
                  <div className="space-y-2 flex flex-col"><Label>Raza <span className="text-red-500">*</span></Label><Popover open={openBreedSearch} onOpenChange={setOpenBreedSearch}><PopoverTrigger asChild><Button variant="outline" role="combobox" className="justify-between bg-white h-12 border-blue-200 uppercase text-slate-700 hover:bg-blue-50 hover:text-blue-700">{formData.petBreed || "Seleccionar..."}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="p-0"><Command><CommandInput placeholder="Buscar..." onValueChange={setTempBreedSearch}/><CommandList><CommandEmpty><Button variant="ghost" size="sm" onClick={() => { handleInputChange('petBreed', tempBreedSearch.toUpperCase()); setOpenBreedSearch(false); }}>Usar "{tempBreedSearch}"</Button></CommandEmpty><CommandGroup className="max-h-40 overflow-auto">{existingBreeds.map((breed) => (<CommandItem key={breed} value={breed} onSelect={(v) => { handleInputChange('petBreed', v); setOpenBreedSearch(false); }}><Check className={cn("mr-2 h-4 w-4", formData.petBreed === breed ? "opacity-100" : "opacity-0")}/> {breed}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>Especie</Label><Select onValueChange={(v) => handleInputChange('petSpecies', v)} defaultValue={formData.petSpecies}><SelectTrigger className="bg-white border-blue-200"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Perro">Perro</SelectItem><SelectItem value="Gato">Gato</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Sexo</Label><Select onValueChange={(v) => handleInputChange('petGender', v)} defaultValue={formData.petGender}><SelectTrigger className="bg-white border-blue-200"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Macho">Macho</SelectItem><SelectItem value="Hembra">Hembra</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Color <span className="text-red-500">*</span></Label><Input className="bg-white border-blue-200 uppercase" value={formData.petColor} onChange={(e) => handleInputChange('petColor', e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label className="flex items-center gap-2">Cumpleaños <span className="text-slate-400 font-normal text-xs">(Opcional)</span></Label><Input type="date" className="bg-white border-blue-200" value={formData.petBirthday} onChange={(e) => handleInputChange('petBirthday', e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md overflow-hidden">
            <div className="h-1 w-full bg-cyan-500"></div>
            <CardHeader className="pb-4 bg-slate-50/50 border-b"><CardTitle className="text-lg flex items-center gap-2 text-[#2E3856]"><HeartPulse size={20} className="text-cyan-500"/> Perfil Médico & Conducta</CardTitle></CardHeader>
            <CardContent className="pt-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                 {[
                    { id: 'qAllergies', label: 'Alergias' }, { id: 'qAggressive', label: 'Agresivo' },
                    { id: 'qNervous', label: 'Nervioso' }, { id: 'qNoise', label: 'Miedo Ruidos' },
                    { id: 'qOtherPets', label: 'Sociable' }, { id: 'qGeriatric', label: 'Senior' },
                    { id: 'qDiseases', label: 'Enfermo' }, { id: 'qConditions', label: 'Condición' },
                    { id: 'qPrizes', label: 'Premios OK', default: true }, { id: 'qVaccination', label: 'Vacunado', default: true },
                 ].map((q) => (
                    <label key={q.id} className={cn(
                        "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200",
                        formData[q.id as keyof typeof formData] 
                            ? "bg-cyan-50 border-cyan-300 shadow-sm" 
                            : "bg-white border-slate-200 hover:border-slate-300"
                    )}>
                      <span className={cn("font-medium text-sm", formData[q.id as keyof typeof formData] ? "text-cyan-700" : "text-slate-600")}>{q.label}</span>
                      <Checkbox id={q.id} checked={formData[q.id as keyof typeof formData] as boolean} onCheckedChange={(c) => handleInputChange(q.id, c)} className="data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"/>
                    </label>
                 ))}
              </div>
              <div className="mt-6">
                  <Label className="font-bold text-slate-700">Observaciones Adicionales</Label>
                  <Textarea className="mt-2 bg-slate-50 border-slate-200 focus-visible:ring-cyan-500" placeholder="Detalles de alergias, medicamentos o conducta..." value={formData.qComments} onChange={(e) => handleInputChange('qComments', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md overflow-hidden bg-[#2E3856] text-white">
            <CardHeader className="pb-4 border-b border-white/10"><CardTitle className="text-lg flex items-center gap-2 text-white"><Gavel size={20} className="text-cyan-400"/> Acuerdo Legal y Firma</CardTitle></CardHeader>
            <CardContent className="pt-8 space-y-6">
              <ScrollArea className="h-64 rounded-xl border border-white/20 bg-white/5 p-6 text-sm text-slate-200 shadow-inner">
                {/* TEXTOS LEGALES */}
                <div className="mb-6"><h4 className="font-bold text-cyan-300 mb-2 flex items-center gap-2 text-base">1. Seguridad y Riesgos</h4><p className="text-justify mb-3 leading-relaxed opacity-90">Entiendo que la estética canina es una actividad con seres vivos que pueden moverse impredeciblemente. Acepto que existen riesgos inherentes (rasguños, irritación) a pesar de los protocolos profesionales.</p><div className="bg-red-500/20 p-3 rounded-lg border border-red-500/30"><p className="text-justify font-medium text-red-200 text-xs sm:text-sm"><strong>Política de Cero Sedantes:</strong> Tail Society NO administra sedantes. Si la mascota llega sedada, el servicio será denegado por su seguridad.</p></div></div>
                <div className="mb-6"><h4 className="font-bold text-cyan-300 mb-2 flex items-center gap-2 text-base">2. Admisión</h4><p className="text-justify mb-2 leading-relaxed opacity-90">Nos reservamos el derecho de admisión si la mascota muestra agresividad incontrolable o estrés severo, o si hay maltrato por parte de los dueños.</p></div>
                <div className="mb-6"><h4 className="font-bold text-cyan-300 mb-2 text-base">3. Manto y Parásitos</h4><div className="space-y-4"><div><p className="text-justify text-xs sm:text-sm mb-2 opacity-90"><strong>Nudos:</strong> No deshacemos nudos pegados a la piel (causa dolor). Se procederá a rapado sanitario.</p></div><div className="bg-white/10 p-3 rounded-lg border border-white/20"><p className="text-white text-sm font-bold text-justify flex gap-2 items-start"><AlertTriangle size={18} className="shrink-0 mt-0.5 text-yellow-400"/><span>Parásitos: Cargo automático de <strong>$500.00 MXN</strong> por fumigación si se detectan pulgas/garrapatas.</span></p></div></div></div>
                <div className="mt-4 pt-4 border-t border-white/10"><p className="text-xs text-slate-400 text-justify">Sus datos son tratados conforme a la LFPDPPP.</p></div>
              </ScrollArea>
              
              <div className="flex items-start space-x-3 p-4 bg-white/10 rounded-xl border border-white/20">
                <Checkbox id="terms" checked={formData.acceptedTerms} onCheckedChange={(c) => handleInputChange('acceptedTerms', c)} className="mt-1 h-5 w-5 border-white data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"/>
                <div className="grid gap-1.5 leading-none"><Label htmlFor="terms" className="text-sm font-bold text-white cursor-pointer leading-tight">He leído y acepto los términos, condiciones y políticas de servicio. <span className="text-red-400">*</span></Label></div>
              </div>
              
              <div className="space-y-3">
                <Label className="flex items-center gap-2 font-bold text-white"><PenTool size={16} className="text-cyan-400"/> Firma del Responsable <span className="text-red-400">*</span></Label>
                <div className={cn("border-2 border-dashed rounded-xl overflow-hidden bg-white touch-none shadow-inner h-48 relative", signatureData ? "border-cyan-500" : "border-slate-300")}>
                    <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{ className: 'w-full h-full cursor-crosshair' }} onEnd={saveSignature} />
                    {!signatureData && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 font-bold text-2xl uppercase tracking-widest opacity-50">Firma Aquí</div>}
                    <button onClick={clearSignature} className="absolute top-3 right-3 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600 shadow-sm transition-colors"><Eraser size={16}/></button>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="bg-[#1e2841] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
              {!isFormValid() && (<p className="text-xs text-red-400 font-medium bg-red-950/30 px-3 py-1 rounded-full animate-pulse">* Complete campos obligatorios y firma.</p>)}
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-900/20 h-12 px-8 rounded-xl ml-auto" disabled={!isFormValid() || loading} onClick={handleRegister}>
                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin"/> Procesando...</> : <><CheckCircle2 className="mr-2 h-5 w-5"/> Finalizar Registro</>}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // --- VISTAS INTERMEDIAS (Estilo unificado) ---
  
  if (step === 'find-client') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-cyan-50/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-none bg-white/90 backdrop-blur-xl">
          <CardHeader>
            <Button variant="ghost" size="sm" onClick={() => setStep('menu')} className="w-fit -ml-2 mb-2 hover:bg-slate-100 rounded-full px-3"><ArrowLeft size={16} className="mr-2"/> Volver</Button>
            <CardTitle className="text-[#2E3856]">Buscar Cliente</CardTitle>
            <CardDescription>Ingresa tu Nombre o Teléfono</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-8">
            <Input className="h-12 text-lg bg-slate-50 border-slate-200 focus-visible:ring-cyan-500" placeholder="Ej: Juan o 551234..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} autoFocus />
            <Button className="w-full h-12 text-lg bg-[#2E3856] hover:bg-[#1e2841]" onClick={handleSearch} disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "Buscar Ficha"}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'select-client') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-xl border-none">
          <CardHeader>
            <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={() => setStep('find-client')}><ArrowLeft size={16} className="mr-2"/> Buscar de nuevo</Button>
            <CardTitle className="text-[#2E3856]">Resultados</CardTitle>
            <CardDescription>Selecciona tu perfil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-8">
            {searchResults.map((client) => (
              <button key={client.id} onClick={() => handleSelectClient(client)} className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-[#2E3856] hover:shadow-md transition-all group text-left">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-[#2E3856] group-hover:text-white transition-colors shrink-0"><User size={24} /></div>
                  <div>
                    <div className="font-bold text-[#2E3856] text-lg">{getFirstName(client.full_name)}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-2 mt-1"><PawPrint size={14} className="text-blue-400"/><span className="font-medium">{client.pets.length > 0 ? client.pets.map(p => p.name).join(', ') : 'Sin mascotas'}</span></div>
                  </div>
                </div>
                <div className="text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold shrink-0">Seleccionar →</div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'client-actions' && selectedClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-none overflow-hidden">
          <div className="h-1.5 w-full bg-green-500"></div>
          <CardHeader>
            <div className="flex justify-between items-center mb-4">
              <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 gap-1 py-1 px-3"><ShieldCheck size={14}/> Identidad Confirmada</Badge>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedClient(null); setStep('menu'); }} className="text-slate-400 hover:text-slate-600">Cerrar</Button>
            </div>
            <CardTitle className="text-3xl text-[#2E3856]">Hola, {getFirstName(selectedClient.full_name)}</CardTitle>
            <CardDescription className="text-base">¿Quién nos visita hoy?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            <div className="grid grid-cols-1 gap-3">
              {selectedClient.pets.map((pet) => (
                <button 
                  key={pet.id} 
                  onClick={() => handleRequestAppointment(pet.id, pet.name)} 
                  disabled={loading}
                  className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl hover:border-green-500 hover:shadow-lg hover:shadow-green-500/10 transition-all group text-left w-full relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-green-50/0 group-hover:bg-green-50/30 transition-colors duration-300"/>
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform"><Dog size={28} /></div>
                    <div>
                      <span className="font-bold block text-xl text-[#2E3856] group-hover:text-green-700 transition-colors">{pet.name}</span>
                      <span className="text-xs text-green-600 font-bold uppercase tracking-wider flex items-center gap-1 mt-1">
                        <CalendarPlus size={14}/> Solicitar Cita Hoy
                      </span>
                    </div>
                  </div>
                  {loading ? <Loader2 className="animate-spin text-slate-400"/> : <div className="h-8 w-8 rounded-full bg-white border border-green-200 flex items-center justify-center text-green-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm"><Check size={16}/></div>}
                </button>
              ))}
            </div>
            
            <div className="relative py-4"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div><div className="relative flex justify-center text-xs uppercase font-bold tracking-widest"><span className="bg-white px-3 text-slate-400">O también</span></div></div>
            
            <button onClick={() => setStep('new-client')} className="w-full p-4 bg-slate-50 border-2 border-slate-200 border-dashed rounded-xl text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-700 transition-all font-medium group">
              <UserPlus size={20} className="group-hover:scale-110 transition-transform"/>
              Registrar nueva mascota
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}