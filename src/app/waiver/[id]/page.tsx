'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import dynamic from 'next/dynamic'; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, CheckCircle2, Eraser, PenTool, FileText, Dog, User, ShieldCheck, AlertTriangle, Calendar, Download } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// Carga dinámica del canvas
const SignatureCanvas = dynamic(() => import('react-signature-canvas'), {
  ssr: false,
  loading: () => <div className="w-full h-48 bg-slate-100 rounded-xl animate-pulse"></div>
}) as any;

export default function WaiverPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const isReadOnly = searchParams.get('mode') === 'view';

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  
  const sigCanvas = useRef<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchClient = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('clients')
        .select('*, pets(*)')
        .eq('id', id)
        .single();
      
      if (error) console.error(error);
      else setClient(data);
      
      setLoading(false);
    };
    fetchClient();
  }, [id]);

  const clearSignature = () => sigCanvas.current?.clear();

  // SUBIR IMAGEN AL BUCKET
  const uploadSignatureToBucket = async (blob: Blob, clientId: string) => {
      const fileName = `waiver-${clientId}-${Date.now()}.png`;
      const { data, error } = await supabase.storage
          .from('signatures')
          .upload(fileName, blob, {
              cacheControl: '3600',
              upsert: false
          });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
          .from('signatures')
          .getPublicUrl(fileName);

      return publicUrl;
  };

  const saveSignature = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      toast.error("Por favor firma antes de continuar");
      return;
    }

    setSaving(true);
    
    try {
        const canvas = sigCanvas.current.getTrimmedCanvas();
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        
        if (!blob) throw new Error("Error al generar imagen");

        // 1. Subir firma
        const publicUrl = await uploadSignatureToBucket(blob, id as string);
        const now = new Date().toISOString();

        // 2. ACTUALIZAR MASCOTAS (Lógica "Por Mascota")
        // Guardamos el link de la firma y la fecha en CADA mascota del cliente
        const { error: petsError } = await supabase
            .from('pets')
            .update({ 
                waiver_signed: true,
                waiver_date: now,
                signature_url: publicUrl // <--- IMPORTANTE: Asegúrate de tener esta columna en 'pets'
            })
            .eq('client_id', id);

        if (petsError) throw petsError;

        setCompleted(true);
        toast.success("Contrato guardado correctamente");

    } catch (error: any) {
        console.error(error);
        toast.error("Error al guardar: " + error.message);
    } finally {
        setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400"/></div>;
  if (!client) return <div className="min-h-screen flex items-center justify-center text-slate-500">Documento no encontrado.</div>;

  if (completed) {
      return (
          <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="bg-white p-6 rounded-full shadow-sm mb-6 border border-green-100"><CheckCircle2 className="h-16 w-16 text-green-500"/></div>
              <h1 className="text-2xl font-bold text-green-800 mb-2">¡Gracias, {client.full_name.split(' ')[0]}!</h1>
              <p className="text-green-700 max-w-xs mx-auto text-sm">El acuerdo ha sido firmado y registrado en el expediente de tus mascotas.</p>
          </div>
      )
  }

  // EN MODO LECTURA: Buscamos la firma en la primera mascota que tenga una
  // (Ya que la firma es por mascota, tomamos la más reciente o válida)
  const signatureSrc = isReadOnly 
      ? (client.pets?.find((p:any) => p.signature_url)?.signature_url) 
      : null;
  
  const signedDate = isReadOnly
      ? (client.pets?.find((p:any) => p.waiver_date)?.waiver_date)
      : null;

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 flex justify-center items-start print:bg-white print:p-0">
      <Card className="w-full max-w-lg shadow-xl border-slate-200 overflow-hidden print:shadow-none print:border-none print:max-w-none">
        
        {/* HEADER */}
        <CardHeader className="text-center border-b bg-white pb-6 pt-8 print:pt-4 print:pb-4">
          {!isReadOnly && (
            <div className="mx-auto bg-slate-100 w-14 h-14 rounded-full flex items-center justify-center mb-3 print:hidden">
               <ShieldCheck className="text-slate-600" size={24}/>
            </div>
          )}
          <div className="flex justify-between items-center w-full">
             <div className="text-center w-full">
                <CardTitle className="text-xl font-bold text-slate-800 uppercase">Acuerdo de Servicio</CardTitle>
                <CardDescription className="text-slate-500 text-xs">Tail Society • Grooming & Care</CardDescription>
             </div>
             {isReadOnly && signatureSrc && (
                 <div className="absolute right-8 top-8 border-4 border-green-600 text-green-600 font-black p-2 rotate-[-15deg] opacity-30 text-sm uppercase hidden sm:block print:block">
                     FIRMADO
                 </div>
             )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-6 bg-slate-50/50 print:bg-white">
          
          {/* DATOS DEL CLIENTE Y MASCOTAS */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 print:border-none print:shadow-none print:p-0">
             <div className="flex items-center gap-2 text-sm text-slate-700">
                <User size={16} className="text-slate-400"/>
                <span className="font-semibold uppercase">{client.full_name}</span>
             </div>
             <div className="flex items-start gap-2 text-sm text-slate-700">
                <Dog size={16} className="text-slate-400 mt-0.5"/>
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Mascotas cubiertas:</span>
                    <span className="text-slate-800 font-medium">
                        {client.pets && client.pets.length > 0 
                            ? client.pets.map((p:any) => p.name).join(', ') 
                            : "Nuevas Mascotas"}
                    </span>
                </div>
             </div>
          </div>

          <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400 ml-1">3. Acuerdos de Servicio y Firma</label>
              
              {/* --- TEXTO LEGAL COMPLETO --- */}
              <div className={`bg-white p-5 rounded-xl border border-slate-200 text-[11px] text-slate-700 leading-relaxed text-justify shadow-inner print:shadow-none print:border-none print:p-0 ${isReadOnly ? 'h-auto' : 'h-96 overflow-y-auto scrollbar-thin'}`}>
                
                {/* 1. Naturaleza */}
                <div className="mb-4">
                    <strong className="text-slate-900 block mb-1 text-xs uppercase">1. Naturaleza del Servicio y Seguridad</strong>
                    <p className="mb-2">Entiendo que la estética canina es una actividad que involucra el trabajo directo con seres vivos, los cuales pueden tener movimientos repentinos e impredecibles. Acepto que, a pesar de los protocolos de seguridad y el manejo profesional de Tail Society, existen riesgos inherentes (como rasguños menores o irritación) al utilizar herramientas punzocortantes en animales en movimiento.</p>
                    <div className="bg-slate-50 p-2 border-l-2 border-slate-400 mt-2">
                        <strong>Política de Cero Sedantes:</strong> Tail Society NO utiliza ni administra tranquilizantes o sedantes bajo ninguna circunstancia. Si la mascota arriba bajo el efecto de sedantes previamente administrados por el dueño, el servicio será denegado por seguridad cardíaca del animal.
                    </div>
                </div>

                {/* 2. Suspensión */}
                <div className="mb-4">
                    <strong className="text-slate-900 block mb-1 text-xs uppercase">2. Suspensión y Admisión</strong>
                    <p className="mb-1">Nos reservamos el derecho de suspender o negar el servicio en cualquier momento si la mascota muestra signos de:</p>
                    <ul className="list-disc pl-4 mb-2 space-y-1">
                        <li><strong>Estrés severo o pánico:</strong> Priorizamos la integridad mental y física de la mascota.</li>
                        <li><strong>Agresividad incontrolable:</strong> Si la mascota intenta morder al personal o ataca a otros perros.</li>
                    </ul>
                    <p className="mt-2"><strong>Derecho de Admisión y Trato Digno:</strong> Tail Society mantiene una política de <strong>Cero Tolerancia al Maltrato</strong>. Nos reservamos el derecho de admisión ante cualquier conducta violenta, física o verbal, por parte de los propietarios hacia el personal o hacia las mascotas.</p>
                </div>

                {/* 3. Condiciones */}
                <div className="mb-4">
                    <strong className="text-slate-900 block mb-1 text-xs uppercase">3. Condiciones del Manto y Parásitos</strong>
                    
                    <p className="mb-2"><strong>Política de Nudos y Condiciones del manto:</strong> Si el pelaje presenta nudos pegados a la piel, por bienestar animal, NO se intentarán deshacer con cepillo, ya que esto causa dolor severo y daños a la piel. Se procederá obligatoriamente al <strong>rapado sanitario</strong>.</p>
                    
                    <p className="mb-2 bg-slate-50 p-2 italic border border-slate-100 rounded">
                        <strong>Liberación de Responsabilidad:</strong> Al retirar nudos apretados, es común descubrir (o que se generen) irritaciones, enrojecimientos o hematomas debido a la falta de circulación sanguínea previa. Tail Society no es responsable por estas condiciones provocadas por el estado del manto previo a la cita.
                    </p>

                    <div className="bg-red-50 p-2 rounded border border-red-100 text-red-900 mt-2 text-[10px] leading-snug">
                        Si se detectan ectoparásitos (pulgas/garrapatas), y estos no se declaran, se suspenderá el servicio de inmediato por integridad de las mascotas presentes y se aplicará un cargo automático de <strong>$500.00 MXN</strong> por fumigación y limpieza profunda del área.
                    </div>
                </div>

                {/* Privacidad y Cierre */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-[10px] text-slate-500 mb-2">Sus datos personales son tratados conforme a la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong>. Puede consultar nuestro Aviso de Privacidad Integral en nuestro sitio web.</p>
                    
                    <p className="font-bold text-slate-900 text-center">
                        Al marcar esta casilla y firmar, declaro que la información proporcionada es verídica y acepto las condiciones estipuladas.
                    </p>
                </div>
              </div>
          </div>

          {/* AREA DE FIRMA (VISUALIZACIÓN O CAPTURA) */}
          <div className="space-y-2">
            {!isReadOnly ? (
                // MODO FIRMA
                <>
                    <div className="flex justify-between items-end px-1">
                        <label className="text-xs font-bold uppercase text-slate-900">Tu Firma</label>
                        <button onClick={clearSignature} className="text-[10px] text-red-500 flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition-colors"><Eraser size={12}/> Borrar</button>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden shadow-sm touch-none relative">
                        <SignatureCanvas ref={sigCanvas} penColor="black" backgroundColor="white" canvasProps={{ className: 'w-full h-48 block', style: { width: '100%', height: '192px' } }} />
                    </div>
                    <p className="text-[10px] text-center text-slate-400 pt-1">Dibuja tu firma en el recuadro blanco usando tu dedo.</p>
                </>
            ) : (
                // MODO LECTURA
                <div className="mt-6 pt-4 border-t border-slate-200">
                    <div className="flex flex-col items-center justify-center gap-2">
                        {signatureSrc ? (
                             <div className="border-b border-slate-400 pb-2 mb-1 w-full max-w-[250px] flex justify-center">
                                 {/* IMAGEN DE LA FIRMA */}
                                 <img 
                                    src={signatureSrc} 
                                    alt="Firma del cliente" 
                                    className="h-24 object-contain"
                                 />
                             </div>
                        ) : (
                             <div className="text-red-500 text-xs font-bold border-b border-red-200 pb-1">Firma no disponible</div>
                        )}
                        
                        <p className="text-xs text-slate-700 uppercase font-bold mt-1">{client.full_name}</p>
                        
                        {signedDate && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Calendar size={10}/> Firmado el: {new Date(signedDate).toLocaleDateString('es-MX', {
                                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                        )}
                    </div>
                </div>
            )}
          </div>

        </CardContent>

        <CardFooter className="bg-white p-6 border-t print:hidden">
            {!isReadOnly ? (
                <Button onClick={saveSignature} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 text-base font-semibold shadow-lg shadow-slate-900/10">
                    {saving ? <Loader2 className="animate-spin mr-2"/> : <><FileText className="mr-2" size={18}/> Aceptar y Firmar</>}
                </Button>
            ) : (
                <Button onClick={handlePrint} variant="outline" className="w-full border-slate-300 text-slate-700 hover:bg-slate-50">
                    <Download className="mr-2" size={18}/> Descargar / Imprimir
                </Button>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}