'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; 
import SignatureCanvas from 'react-signature-canvas';
import { 
  UserPlus, Search, Dog, ArrowLeft, FileText, CheckCircle2, AlertTriangle, ShieldCheck, 
  User, PawPrint, Gavel, Check, ChevronsUpDown, Eraser, PenTool, Loader2, CalendarPlus, 
  Syringe, Skull, Volume2, Users, Bone, HeartPulse, Plus, Calendar as CalendarIcon, DollarSign
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Image from 'next/image';
import { format } from 'date-fns';
import { searchClients, registerNewClientWithPets, getServicesList, getAvailabilityBlocks, createFullRequest } from './actions';

// --- UTILIDADES DE FORMATO ---
const toTitleCase = (str: string) => {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const cleanPhone = (str: string) => str ? str.replace(/\D/g, '').slice(0, 10) : '';

const PrivacyLink = () => (
  <a href="#" className="text-cyan-600 hover:text-cyan-700 hover:underline font-bold transition-colors">Aviso de Privacidad</a>
);

// --- TIPOS ---
type Step = 'menu' | 'new-client' | 'add-pet-loop' | 'legal-sign' | 'find-client' | 'select-client' | 'select-pet-service' | 'select-services' | 'select-date' | 'final-confirmation' | 'success-popup';

interface PetDraft {
  name: string;
  breed: string;
  species: string;
  gender: string;
  color: string;
  birth_date: string;
  // Medical
  has_allergies: boolean;
  is_aggressive: boolean;
  is_nervous: boolean;
  is_noisereactive: boolean;
  convive: boolean;
  is_senior: boolean;
  has_illness: boolean;
  has_conditions: boolean;
  treats: boolean;
  is_vaccined: boolean;
  qComments: string;
}

// Interfaz para cliente seleccionado/encontrado
interface ClientData {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  pets: { id: string; name: string; breed?: string }[];
}

export default function ReceptionWizard() {
  const [step, setStep] = useState<Step>('menu');
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  
  // DATOS GLOBALES
  const [clientData, setClientData] = useState({ id: '', fullName: '', phone: '', email: '', address: '' });
  const [petsDraft, setPetsDraft] = useState<PetDraft[]>([]);
  const [existingBreeds, setExistingBreeds] = useState<string[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  
  // ESTADO CLIENTE SELECCIONADO
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);

  // ESTADO FLUIDO
  const [selectedPetId, setSelectedPetId] = useState<string>(''); 
  const [selectedPetName, setSelectedPetName] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availability, setAvailability] = useState<any[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string>('');

  // FORMULARIO ACTUAL (Mascota en edición)
  const [petForm, setPetForm] = useState<PetDraft>({
    name: '', breed: '', species: 'Perro', gender: '', color: '', birth_date: '',
    has_allergies: false, is_aggressive: false, is_nervous: false, is_noisereactive: false,
    convive: false, is_senior: false, has_illness: false, has_conditions: false,
    treats: true, is_vaccined: true, qComments: ''
  });

  // UI AUX
  const [openBreedSearch, setOpenBreedSearch] = useState(false);
  const [tempBreedSearch, setTempBreedSearch] = useState(""); 
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ClientData[]>([]);
  const sigPad = useRef<SignatureCanvas>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // INIT
  useEffect(() => {
    // Cargar razas básicas y Servicios
    setExistingBreeds(["Mestizo", "Labrador", "Golden Retriever", "Poodle", "Schnauzer", "Chihuahua", "Pug", "Husky", "Pastor Alemán", "Yorkshire"]); 
    setStartTime(Date.now());
    
    getServicesList().then(data => setServicesList(data || []));
  }, []);

  // --- HANDLERS GENERALES ---
  const handleClientChange = (field: string, val: string) => {
    setClientData(prev => ({ ...prev, [field]: val }));
  };

  const handlePetChange = (field: string, val: any) => {
    setPetForm(prev => ({ ...prev, [field]: val }));
  };

  // Auto-calcular Senior
  useEffect(() => {
    if (petForm.birth_date) {
      const birth = new Date(petForm.birth_date);
      const age = new Date().getFullYear() - birth.getFullYear();
      if (petForm.is_senior !== (age >= 7)) {
        setPetForm(prev => ({ ...prev, is_senior: age >= 7 }));
      }
    }
  }, [petForm.birth_date]);

  // --- FLUJO DE REGISTRO NUEVO ---
  
  const addPetToDraft = () => {
    // Validaciones Mascota
    if (!petForm.name || !petForm.breed || !petForm.color || !petForm.species || !petForm.gender) {
      alert("Por favor completa los campos obligatorios de la mascota (Nombre, Raza, Especie, Sexo, Color).");
      return;
    }

    // Formatear Textos
    const formattedPet = {
      ...petForm,
      name: toTitleCase(petForm.name),
      color: toTitleCase(petForm.color),
      breed: toTitleCase(petForm.breed)
    };

    setPetsDraft(prev => [...prev, formattedPet]);
    
    // Reset form for potential next pet
    setPetForm({
        name: '', breed: '', species: 'Perro', gender: '', color: '', birth_date: '',
        has_allergies: false, is_aggressive: false, is_nervous: false, is_noisereactive: false,
        convive: false, is_senior: false, has_illness: false, has_conditions: false,
        treats: true, is_vaccined: true, qComments: ''
    });

    if (confirm("¿Deseas agregar otra mascota?")) {
        // Se queda en el mismo paso, form limpio
    } else {
        setStep('legal-sign');
    }
  };

  const submitRegistration = async () => {
    if (!acceptedTerms || !signatureData) { alert("Debes aceptar y firmar."); return; }
    setLoading(true);

    const formattedClient = {
      full_name: toTitleCase(clientData.fullName),
      phone: cleanPhone(clientData.phone),
      email: clientData.email.toLowerCase(),
      address: clientData.address,
      created_at: new Date().toISOString()
    };

    // Mapeo de mascotas para DB
    const petsForDb = petsDraft.map(p => ({
        name: p.name,
        breed: p.breed,
        species: p.species,
        gender: p.gender,
        color: p.color,
        birth_date: p.birth_date || null,
        // Flags
        is_vaccined: p.is_vaccined,
        has_allergies: p.has_allergies,
        has_illness: p.has_illness,
        has_conditions: p.has_conditions,
        is_senior: p.is_senior,
        is_aggressive: p.is_aggressive,
        is_nervous: p.is_nervous,
        is_noisereactive: p.is_noisereactive,
        convive: p.convive,
        treats: p.treats,
        notes: `[Kiosko] ${p.qComments}`,
        waiver_signed: true
    }));

    const res = await registerNewClientWithPets(formattedClient, petsForDb, signatureData);

    if (res.success) {
        setClientData({ ...clientData, id: res.client.id });
        
        // FIX: Mapeo seguro de mascotas para coincidir con la interfaz ClientData
        const safePets = (res.pets || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            breed: p.breed
        }));

        const newClientData: ClientData = {
            id: res.client.id,
            full_name: res.client.full_name,
            phone: res.client.phone,
            email: res.client.email,
            pets: safePets
        };
        
        setSelectedClient(newClientData);
        setSearchResults([newClientData]); // Para consistencia

        setStep('select-pet-service');
    } else {
        alert("Error: " + res.error);
    }
    setLoading(false);
  };

  // --- FLUJO DE AGENDAR ---

  const handleRequestAppointment = async () => {
    if (!selectedClient) return; // Validación de seguridad
    // Lógica movida a confirmReservation
  };

  const handlePetSelectionForService = (petId: string, petName: string) => {
    setSelectedPetId(petId);
    setSelectedPetName(petName);
    setStep('select-services');
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  // Cargar disponibilidad al cambiar fecha
  useEffect(() => {
    if (step === 'select-date' && selectedDate) {
        setLoading(true);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        getAvailabilityBlocks(dateStr).then(blocks => {
            setAvailability(blocks);
            setLoading(false);
        });
    }
  }, [selectedDate, step]);

  const confirmReservation = async () => {
    if (!selectedDate || !selectedBlock || !selectedClient) return; // Validación extra
    setLoading(true);
    
    const res = await createFullRequest({
        clientId: selectedClient.id,
        petId: selectedPetId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        blockId: selectedBlock,
        serviceIds: selectedServices
    });

    if (res.success) {
        setStep('success-popup');
        setTimeout(() => window.location.reload(), 4000); // Reset total
    } else {
        alert("Error al solicitar: " + res.error);
        setLoading(false);
    }
  };

  // --- LÓGICA DE BÚSQUEDA ---
  const handleSearch = async () => {
    if (searchTerm.length < 4) { alert("Ingresa al menos 4 letras/números."); return; }
    setLoading(true);
    try {
        const res = await searchClients(searchTerm);
        if (res.success && res.data && res.data.length > 0) { 
            // FIX: Casteo explícito a ClientData[]
            setSearchResults(res.data as ClientData[]); 
            setStep('select-client'); 
        } else {
            alert("No se encontraron coincidencias.");
        }
    } catch (e) { 
        alert("Error al buscar."); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleSelectClient = (client: ClientData) => {
    setSelectedClient(client);
    setStep('select-pet-service');
  };

  // --- RENDERERS ---

  const RenderSwitch = ({ label, icon, checked, onChange, colorClass = "border-slate-200 hover:border-slate-300" }: any) => (
    <div className={cn("flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer", checked ? "bg-cyan-50 border-cyan-300 shadow-sm" : "bg-white", colorClass)} onClick={() => onChange(!checked)}>
        <div className="flex items-center gap-2">
           {icon && <div className={cn("text-slate-400", checked && "text-cyan-600")}>{icon}</div>}
           <Label className={cn("text-xs font-medium cursor-pointer", checked ? "text-cyan-900" : "text-slate-600")}>{label}</Label>
        </div>
        <Checkbox checked={checked} onCheckedChange={onChange} className="h-4 w-4 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"/>
    </div>
  );

  // --- VISTAS ---

  if (step === 'menu') {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 flex flex-col items-center justify-center p-6 relative overflow-hidden">
          <Card className="w-full max-w-md shadow-2xl border-none bg-white/80 backdrop-blur-xl relative z-10 overflow-hidden group">
            <CardHeader className="text-center pt-8 pb-4 space-y-4">
              <div className="mx-auto relative w-32 h-32 mb-2">
                  <Image src="/Logo500x500.png" alt="Tail Society" fill className="object-contain drop-shadow-xl" priority />
              </div>
              <CardTitle className="text-3xl font-black text-[#2E3856]">Tail Society</CardTitle>
              <CardDescription>Kiosko de Auto-Atención</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-8 px-8">
              <Button onClick={() => setStep('new-client')} className="w-full h-16 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg rounded-xl">Soy Nuevo</Button>
              <Button onClick={() => setStep('find-client')} variant="outline" className="w-full h-16 text-lg border-2 rounded-xl">Ya soy Cliente</Button>
            </CardContent>
          </Card>
        </div>
    );
  }

  if (step === 'new-client') {
    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-3xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => setStep('menu')}><ArrowLeft className="mr-2" /> Volver</Button>
                <Card>
                    <CardHeader><CardTitle>Datos del Responsable</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <Input placeholder="Nombre Completo *" value={clientData.fullName} onChange={e => handleClientChange('fullName', e.target.value)} className="uppercase" />
                        <div className="grid grid-cols-2 gap-4">
                            <Input type="tel" placeholder="Teléfono (10 dígitos) *" value={clientData.phone} onChange={e => handleClientChange('phone', e.target.value)} />
                            <Input type="email" placeholder="Email" value={clientData.email} onChange={e => handleClientChange('email', e.target.value)} />
                        </div>
                        <Input placeholder="Dirección (Opcional)" value={clientData.address} onChange={e => handleClientChange('address', e.target.value)} />
                    </CardContent>
                    <CardFooter>
                        <Button 
                            className="w-full bg-[#2E3856]" 
                            disabled={!clientData.fullName || clientData.phone.length < 10}
                            onClick={() => setStep('add-pet-loop')}
                        >
                            Siguiente: Agregar Mascota
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
  }

  if (step === 'add-pet-loop') {
    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-[#2E3856]">
                        {petsDraft.length > 0 ? `Agregando mascota #${petsDraft.length + 1}` : "Registro de Mascota"}
                    </h2>
                    {petsDraft.length > 0 && <Badge variant="secondary">{petsDraft.length} guardadas</Badge>}
                </div>

                <Card>
                    <CardContent className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* BASIC DATA */}
                        <div className="space-y-4">
                            <Label className="text-xs font-bold text-blue-500 uppercase">Datos Básicos</Label>
                            <Input placeholder="Nombre *" value={petForm.name} onChange={e => handlePetChange('name', e.target.value)} className="uppercase" />
                            
                            <div className="grid grid-cols-2 gap-3">
                                <Select onValueChange={v => handlePetChange('species', v)} defaultValue="Perro">
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent><SelectItem value="Perro">Perro</SelectItem><SelectItem value="Gato">Gato</SelectItem></SelectContent>
                                </Select>
                                <Select onValueChange={v => handlePetChange('gender', v)}>
                                    <SelectTrigger><SelectValue placeholder="Sexo *"/></SelectTrigger>
                                    <SelectContent><SelectItem value="Macho">Macho</SelectItem><SelectItem value="Hembra">Hembra</SelectItem></SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Popover open={openBreedSearch} onOpenChange={setOpenBreedSearch}>
                                    <PopoverTrigger asChild><Button variant="outline" className="justify-between uppercase">{petForm.breed || "Raza *"}</Button></PopoverTrigger>
                                    <PopoverContent className="p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar..." onValueChange={setTempBreedSearch}/>
                                            <CommandList>
                                                <CommandEmpty>
                                                    <Button variant="ghost" size="sm" onClick={() => { handlePetChange('breed', tempBreedSearch); setOpenBreedSearch(false); }}>
                                                        <Plus className="mr-2 h-4 w-4"/> Agregar "{tempBreedSearch}"
                                                    </Button>
                                                </CommandEmpty>
                                                <CommandGroup className="max-h-40 overflow-auto">
                                                    {existingBreeds.map(b => (
                                                        <CommandItem key={b} value={b} onSelect={(v) => { handlePetChange('breed', v); setOpenBreedSearch(false); }}>
                                                            {b}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Input placeholder="Color *" value={petForm.color} onChange={e => handlePetChange('color', e.target.value)} className="uppercase" />
                            </div>
                            
                            <div className="space-y-1">
                                <Label>Fecha Nacimiento (Para calcular edad)</Label>
                                <Input type="date" value={petForm.birth_date} onChange={e => handlePetChange('birth_date', e.target.value)} />
                            </div>
                        </div>

                        {/* MEDICAL */}
                        <div className="space-y-4">
                            <Label className="text-xs font-bold text-cyan-500 uppercase">Perfil Médico y Conducta <span className="text-slate-400 font-normal normal-case">(Marcar solo si aplica)</span></Label>
                            <div className="grid grid-cols-2 gap-3">
                                <RenderSwitch label="Alérgico" checked={petForm.has_allergies} onChange={(v: boolean) => handlePetChange('has_allergies', v)} />
                                <RenderSwitch label="Agresivo" icon={<Skull size={14}/>} checked={petForm.is_aggressive} onChange={(v: boolean) => handlePetChange('is_aggressive', v)} colorClass="border-red-200" />
                                <RenderSwitch label="Nervioso" checked={petForm.is_nervous} onChange={(v: boolean) => handlePetChange('is_nervous', v)} />
                                <RenderSwitch label="Miedo Ruido" checked={petForm.is_noisereactive} onChange={(v: boolean) => handlePetChange('is_noisereactive', v)} />
                                <RenderSwitch label="Sociable" checked={petForm.convive} onChange={(v: boolean) => handlePetChange('convive', v)} />
                                <RenderSwitch label="Senior (+7)" checked={petForm.is_senior} onChange={(v: boolean) => handlePetChange('is_senior', v)} colorClass="bg-purple-50 border-purple-200" />
                                <RenderSwitch label="Padecimientos" checked={petForm.has_illness} onChange={(v: boolean) => handlePetChange('has_illness', v)} />
                                <RenderSwitch label="Condiciones" checked={petForm.has_conditions} onChange={(v: boolean) => handlePetChange('has_conditions', v)} />
                                <RenderSwitch label="Acepta Premios" checked={petForm.treats} onChange={(v: boolean) => handlePetChange('treats', v)} />
                                <RenderSwitch label="Vacunas OK" checked={petForm.is_vaccined} onChange={(v: boolean) => handlePetChange('is_vaccined', v)} />
                            </div>
                            <Textarea placeholder="Detalles médicos adicionales..." value={petForm.qComments} onChange={e => handlePetChange('qComments', e.target.value)} className="h-20" />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full bg-[#2E3856]" onClick={addPetToDraft}>Guardar y Continuar</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
  }

  if (step === 'legal-sign') {
    return (
        <div className="min-h-screen bg-[#2E3856] py-8 px-4">
            <Card className="max-w-2xl mx-auto border-none shadow-2xl bg-white text-slate-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#2E3856]"><Gavel size={20}/> Acuerdos de Servicio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <ScrollArea className="h-64 rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
                        {/* TEXTO LEGAL SOLICITADO */}
                        <div className="space-y-4">
                            <h4 className="font-bold">1. NATURALEZA DEL SERVICIO Y SEGURIDAD</h4>
                            <p className="text-justify">Entiendo que la estética canina es una actividad que involucra el trabajo directo con seres vivos, los cuales pueden tener movimientos repentinos e impredecibles. Acepto que, a pesar de los protocolos de seguridad y el manejo profesional de Tail Society, existen riesgos inherentes (como rasguños menores o irritación) al utilizar herramientas punzocortantes en animales en movimiento.</p>
                            
                            <h4 className="font-bold">2. SUSPENSIÓN Y ADMISIÓN</h4>
                            <p className="text-justify">Nos reservamos el derecho de suspender o negar el servicio en cualquier momento si la mascota muestra signos de estrés severo, pánico o agresividad.</p>
                            
                            <h4 className="font-bold">3. CONDICIONES DEL MANTO Y PARÁSITOS</h4>
                            <p className="text-justify">Política de Nudos: Si el pelaje presenta nudos pegados a la piel, por bienestar animal, NO se intentarán deshacer con cepillo, se procederá obligatoriamente al rapado sanitario. Si se detectan ectoparásitos, se aplicará un cargo automático de $500.00 MXN.</p>
                        </div>
                    </ScrollArea>
                    
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl cursor-pointer" onClick={() => setAcceptedTerms(!acceptedTerms)}>
                        <Checkbox checked={acceptedTerms} onCheckedChange={(c) => setAcceptedTerms(!!c)} />
                        <Label className="cursor-pointer">He leído y acepto los términos y condiciones.</Label>
                    </div>

                    <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white h-48 relative">
                        <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{ className: 'w-full h-full' }} onEnd={() => setSignatureData(sigPad.current?.toDataURL() || null)} />
                        {!signatureData && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 font-bold uppercase">Firma Aquí</div>}
                        <button onClick={() => { sigPad.current?.clear(); setSignatureData(null); }} className="absolute top-2 right-2 p-2 bg-slate-100 rounded-full"><Eraser size={16}/></button>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full h-12 text-lg bg-green-600 hover:bg-green-700" onClick={submitRegistration} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : "Finalizar Registro"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  // --- VISTAS DE BUSQUEDA Y SELECCIÓN ---
  if (step === 'find-client') {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-md">
                  <CardHeader><Button variant="ghost" onClick={() => setStep('menu')} className="w-fit"><ArrowLeft className="mr-2"/> Volver</Button><CardTitle>Buscar Cliente</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                      <Input placeholder="Nombre o Teléfono" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                      <Button className="w-full bg-[#2E3856]" onClick={handleSearch} disabled={loading}>Buscar</Button>
                  </CardContent>
              </Card>
          </div>
      );
  }

  if (step === 'select-client') {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-lg">
                  <CardHeader><CardTitle>Resultados</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                      {searchResults.map(c => (
                          <div key={c.id} onClick={() => handleSelectClient(c)} className="p-4 border rounded hover:bg-slate-100 cursor-pointer">
                              <p className="font-bold">{c.full_name}</p>
                              <p className="text-sm text-slate-500">{c.pets?.length} mascotas</p>
                          </div>
                      ))}
                  </CardContent>
              </Card>
          </div>
      );
  }

  if (step === 'select-pet-service') {
      const client = selectedClient || { pets: [] };
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-lg">
                  <CardHeader><CardTitle>Selecciona Mascota</CardTitle><CardDescription>¿Para quién es el servicio?</CardDescription></CardHeader>
                  <CardContent className="grid gap-3">
                      {/* FIX: Typado explícito del map para evitar 'any' implícito */}
                      {client.pets.map((p: any) => (
                          <div key={p.id} onClick={() => handlePetSelectionForService(p.id, p.name)} className="flex items-center gap-4 p-4 border rounded-xl hover:border-blue-500 cursor-pointer bg-white">
                              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><Dog /></div>
                              <div><p className="font-bold text-lg">{p.name}</p><p className="text-sm text-slate-500">{p.breed}</p></div>
                          </div>
                      ))}
                  </CardContent>
              </Card>
          </div>
      );
  }

  if (step === 'select-services') {
      return (
          <div className="min-h-screen bg-slate-50 p-4">
              <div className="max-w-2xl mx-auto space-y-4">
                  <Button variant="ghost" onClick={() => setStep('select-pet-service')}><ArrowLeft className="mr-2"/> Cambiar Mascota</Button>
                  <Card>
                      <CardHeader><CardTitle>Servicios para {selectedPetName}</CardTitle><CardDescription>Selecciona uno o más servicios</CardDescription></CardHeader>
                      <CardContent className="grid gap-3">
                          {servicesList.map(svc => (
                              <div key={svc.id} onClick={() => toggleService(svc.id)} 
                                   className={cn("flex justify-between items-center p-4 border rounded-lg cursor-pointer transition-all", selectedServices.includes(svc.id) ? "border-blue-500 bg-blue-50" : "bg-white hover:border-blue-300")}>
                                  <div>
                                      <p className="font-bold">{svc.name}</p>
                                      <p className="text-xs text-slate-500 capitalize">{svc.category} • {svc.breed_size || 'General'}</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="font-bold text-green-600">${svc.price}</p>
                                      {selectedServices.includes(svc.id) && <CheckCircle2 className="h-5 w-5 text-blue-500 ml-auto mt-1" />}
                                  </div>
                              </div>
                          ))}
                      </CardContent>
                      <CardFooter>
                          <Button className="w-full bg-[#2E3856]" disabled={selectedServices.length === 0} onClick={() => setStep('select-date')}>Continuar a Horarios</Button>
                      </CardFooter>
                  </Card>
              </div>
          </div>
      );
  }

  if (step === 'select-date') {
      return (
          <div className="min-h-screen bg-slate-50 p-4">
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                      <CardHeader><CardTitle>Fecha Deseada</CardTitle></CardHeader>
                      <CardContent className="flex justify-center">
                          <Calendar 
                            mode="single" 
                            selected={selectedDate} 
                            onSelect={setSelectedDate} 
                            disabled={(date) => date < new Date()} 
                            className="rounded-md border"
                          />
                      </CardContent>
                  </Card>

                  <Card>
                      <CardHeader><CardTitle>Disponibilidad</CardTitle><CardDescription>Sugerencia de bloques</CardDescription></CardHeader>
                      <CardContent className="space-y-3">
                          {loading ? <div className="text-center py-10"><Loader2 className="animate-spin h-8 w-8 mx-auto"/></div> : 
                           availability.map(block => (
                              <div key={block.id} 
                                   onClick={() => block.status !== 'none' && setSelectedBlock(block.id)}
                                   className={cn(
                                      "p-4 rounded-xl border-l-4 transition-all cursor-pointer relative overflow-hidden",
                                      block.status === 'high' ? "border-green-500 bg-white hover:shadow-md" :
                                      block.status === 'low' ? "border-orange-400 bg-orange-50/50 hover:bg-orange-50" :
                                      "border-slate-300 bg-slate-100 opacity-60 cursor-not-allowed",
                                      selectedBlock === block.id && "ring-2 ring-blue-500"
                                   )}>
                                  <div className="flex justify-between items-center">
                                      <div>
                                          <p className="font-bold text-slate-800">{block.label}</p>
                                          <p className={cn("text-xs font-bold uppercase mt-1", 
                                              block.status === 'high' ? "text-green-600" : 
                                              block.status === 'low' ? "text-orange-600" : "text-slate-500"
                                          )}>
                                              {block.status === 'high' ? "Alta Disponibilidad" : block.status === 'low' ? "Pocos Lugares" : "Lleno"}
                                          </p>
                                      </div>
                                      {selectedBlock === block.id && <CheckCircle2 className="text-blue-600 h-6 w-6"/>}
                                  </div>
                              </div>
                           ))
                          }
                      </CardContent>
                      <CardFooter>
                          <Button className="w-full bg-[#2E3856]" disabled={!selectedBlock} onClick={() => setStep('final-confirmation')}>Revisar Solicitud</Button>
                      </CardFooter>
                  </Card>
              </div>
          </div>
      );
  }

  if (step === 'final-confirmation') {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-lg shadow-xl border-t-4 border-t-blue-600">
                  <CardHeader>
                      <CardTitle className="text-2xl text-[#2E3856]">Confirmar Solicitud</CardTitle>
                      <CardDescription>Verifica los detalles antes de enviar.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <div className="space-y-4 text-sm text-slate-700">
                          <div className="flex items-center gap-3">
                              <div className="bg-blue-100 p-2 rounded-full"><Dog className="text-blue-600 h-5 w-5"/></div>
                              <div><p className="text-xs text-slate-500">Mascota</p><p className="font-bold text-lg">{selectedPetName}</p></div>
                          </div>
                          <div className="flex items-center gap-3">
                              <div className="bg-purple-100 p-2 rounded-full"><CalendarIcon className="text-purple-600 h-5 w-5"/></div>
                              <div><p className="text-xs text-slate-500">Fecha y Bloque</p><p className="font-bold">{selectedDate?.toLocaleDateString()} - {availability.find(b => b.id === selectedBlock)?.label}</p></div>
                          </div>
                          <div className="flex items-center gap-3 items-start">
                              <div className="bg-green-100 p-2 rounded-full"><DollarSign className="text-green-600 h-5 w-5"/></div>
                              <div><p className="text-xs text-slate-500">Servicios Solicitados</p>
                                <ul className="font-medium list-disc pl-4 mt-1">
                                    {servicesList.filter(s => selectedServices.includes(s.id)).map(s => (
                                        <li key={s.id}>{s.name} - ${s.price}</li>
                                    ))}
                                </ul>
                              </div>
                          </div>
                      </div>

                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-900 text-xs text-justify">
                          <strong>IMPORTANTE:</strong> Los servicios seleccionados están sujetos a disponibilidad real y a las condiciones del pelaje de la mascota al momento de la recepción. El precio final podría variar si se requieren servicios adicionales (deslanado, nudos, etc). Recibirás una confirmación por WhatsApp/Email en breve.
                      </div>
                  </CardContent>
                  <CardFooter className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep('select-date')} className="flex-1">Atrás</Button>
                      <Button className="flex-[2] bg-green-600 hover:bg-green-700 text-white" onClick={confirmReservation} disabled={loading}>
                          {loading ? <Loader2 className="animate-spin"/> : "Enviar Solicitud"}
                      </Button>
                  </CardFooter>
              </Card>
          </div>
      );
  }

  if (step === 'success-popup') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2E3856]/95 backdrop-blur-md p-4">
            <div className="text-center text-white space-y-6 animate-in zoom-in duration-300">
                <CheckCircle2 className="h-24 w-24 text-green-400 mx-auto" />
                <h1 className="text-4xl font-bold">¡Solicitud Enviada!</h1>
                <p className="text-lg opacity-90 max-w-md mx-auto">Hemos recibido tu petición. Nuestro equipo revisará la agenda y te contactará para confirmar tu cita.</p>
                <Button variant="outline" className="text-white border-white hover:bg-white/20" onClick={() => window.location.reload()}>Volver al Inicio</Button>
            </div>
        </div>
      );
  }

  return null;
}