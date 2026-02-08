'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
    User, CalendarRange, FileText, Upload, Trash2, CalendarIcon, 
    AlertCircle, Loader2 
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { updateEmployeeProfile, addEmployeeAbsence, registerDocument, deleteDocument } from '@/app/actions/staff-actions';

export default function StaffProfileDialog({ employee, isOpen, onClose }: { employee: any, isOpen: boolean, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  
  // --- TAB 1: DATOS GENERALES ---
  const [profileData, setProfileData] = useState({
    first_name: employee.first_name,
    last_name: employee.last_name,
    email: employee.email,
    phone: employee.phone,
    address: employee.address || '',
    role: employee.role, 
    show_in_calendar: employee.show_in_calendar
  });

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
        await updateEmployeeProfile(employee.id, profileData);
        toast.success("Perfil actualizado correctamente");
    } catch (e: any) { toast.error("Error al guardar: " + e.message); }
    finally { setLoading(false); }
  };

  // --- TAB 2: ASISTENCIA ---
  const [absenceData, setAbsenceData] = useState({ type: 'unjustified', start: new Date(), end: new Date(), reason: '' });
  
  const handleAddAbsence = async () => {
    if(!absenceData.reason) return toast.error("Escribe un motivo");
    setLoading(true);
    try {
        await addEmployeeAbsence(employee.id, absenceData.type, absenceData.start, absenceData.end, absenceData.reason);
        toast.success("Incidencia registrada");
        setAbsenceData({...absenceData, reason: ''}); 
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  // --- TAB 3: EXPEDIENTE ---
  const [uploading, setUploading] = useState(false);
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
        const supabase = createClient();
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const filePath = `${employee.id}/${Date.now()}_${cleanFileName}`;
        
        const { error: uploadError } = await supabase.storage.from('staff-documents').upload(filePath, file);
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('staff-documents').getPublicUrl(filePath);
        
        await registerDocument(employee.id, file.name, publicUrl, file.name.split('.').pop() || 'file');
        toast.success("Documento guardado");
    } catch (err: any) { toast.error("Error subiendo: " + err.message); }
    finally { setUploading(false); }
  };

  const handleDeleteDoc = async (id: string) => {
      if(!confirm("¿Estás seguro de borrar este documento?")) return;
      try { await deleteDocument(id); toast.success("Documento eliminado"); } catch(e:any){ toast.error(e.message); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold border border-slate-200 text-lg">
                {employee.first_name.charAt(0)}
            </div>
            <div>
                <p className="font-bold text-slate-900">{employee.first_name} {employee.last_name}</p>
                <p className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full w-fit">
                    {employee.role || 'Sin puesto'}
                </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-3 bg-slate-100">
            <TabsTrigger value="general" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <User className="h-4 w-4 mr-2"/> Datos
            </TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <CalendarRange className="h-4 w-4 mr-2"/> Asistencia
            </TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <FileText className="h-4 w-4 mr-2"/> Expediente
            </TabsTrigger>
          </TabsList>

          {/* --- TAB 1: DATOS PERSONALES --- */}
          <TabsContent value="general" className="space-y-5 py-4 px-1">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Apellido</Label>
                    <Input value={profileData.last_name} onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Correo Electrónico</Label>
                    <Input value={profileData.email} onChange={(e) => setProfileData({...profileData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} />
                </div>
                <div className="col-span-2 space-y-2">
                    <Label>Dirección Particular</Label>
                    <Input value={profileData.address} onChange={(e) => setProfileData({...profileData, address: e.target.value})} placeholder="Calle, Número, Colonia, CP" />
                </div>
                <div className="col-span-2 space-y-2">
                    <Label>Puesto / Rol</Label>
                    <Select value={profileData.role} onValueChange={(val) => setProfileData({...profileData, role: val})}>
                        <SelectTrigger><SelectValue placeholder="Selecciona un puesto" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Estilista">Estilista (Groomer)</SelectItem>
                            <SelectItem value="Bañador">Bañador</SelectItem>
                            <SelectItem value="Recepción">Recepción</SelectItem>
                            <SelectItem value="Gerencia">Gerencia</SelectItem>
                            <SelectItem value="Limpieza">Limpieza</SelectItem>
                            <SelectItem value="Auxiliar">Auxiliar General</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4"/> Mostrar en Agenda
                    </Label>
                    <p className="text-xs text-slate-500">
                        Si activas esto, el empleado podrá recibir citas en el calendario.
                    </p>
                </div>
                <Switch checked={profileData.show_in_calendar} onCheckedChange={(v) => setProfileData({...profileData, show_in_calendar: v})} />
            </div>

            <Button onClick={handleUpdateProfile} disabled={loading} className="w-full bg-slate-900 text-white hover:bg-slate-800">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Guardar Datos
            </Button>
          </TabsContent>

          {/* --- TAB 2: ASISTENCIA Y PERMISOS --- */}
          <TabsContent value="attendance" className="space-y-4 py-4 px-1">
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5 space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-800">
                        <AlertCircle className="h-4 w-4 text-orange-500"/> Registrar Nueva Incidencia
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo de Incidencia</Label>
                            <Select value={absenceData.type} onValueChange={(v) => setAbsenceData({...absenceData, type: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unjustified">Falta Injustificada (Descuenta $)</SelectItem>
                                    <SelectItem value="sick">Incapacidad Médica</SelectItem>
                                    <SelectItem value="vacation">Vacaciones</SelectItem>
                                    <SelectItem value="personal">Permiso Personal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 flex flex-col">
                            <Label>Fecha</Label>
                            
                            {/* AQUÍ ESTÁ LA CORRECCIÓN CLAVE: modal={true} */}
                            <Popover modal={true}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal border-slate-300">
                                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                                        {format(absenceData.start, "dd MMM yyyy", { locale: es })}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 z-50" align="start">
                                    <Calendar 
                                        mode="single" 
                                        selected={absenceData.start} 
                                        onSelect={(d) => d && setAbsenceData({...absenceData, start: d, end: d})} 
                                        locale={es}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Motivo / Observaciones</Label>
                        <Textarea 
                            placeholder="Ej. No avisó, o presentó receta médica..." 
                            value={absenceData.reason} 
                            onChange={(e) => setAbsenceData({...absenceData, reason: e.target.value})} 
                            className="resize-none"
                        />
                    </div>
                    <Button onClick={handleAddAbsence} disabled={loading} variant="destructive" className="w-full">
                        Registrar Incidencia
                    </Button>
                </CardContent>
            </Card>

            <div className="space-y-3 pt-2">
                <h3 className="font-semibold text-sm text-slate-600">Historial Reciente</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {employee.absences && employee.absences.length > 0 ? (
                        employee.absences.map((abs: any) => (
                            <div key={abs.id} className="flex justify-between items-center text-sm p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold capitalize text-xs px-2 py-0.5 rounded ${
                                            abs.type === 'unjustified' ? 'bg-red-100 text-red-700' : 
                                            abs.type === 'vacation' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {abs.type === 'unjustified' ? 'Falta' : 
                                             abs.type === 'vacation' ? 'Vacaciones' : 
                                             abs.type === 'sick' ? 'Incapacidad' : 'Permiso'}
                                        </span>
                                        <span className="text-xs text-slate-500">{format(new Date(abs.start_date), "dd MMM yyyy", {locale: es})}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 max-w-[250px] truncate">{abs.reason}</p>
                                </div>
                            </div>
                        ))
                    ) : <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg border border-dashed">Sin registros recientes.</p>}
                </div>
            </div>
          </TabsContent>

          {/* --- TAB 3: EXPEDIENTE DIGITAL --- */}
          <TabsContent value="files" className="space-y-4 py-4 px-1">
             <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer relative bg-slate-50/50">
                <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleFileUpload}
                    disabled={uploading}
                />
                <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                    <Upload className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Haz clic para subir documento</p>
                <p className="text-xs text-slate-400 mt-1">Soporta PDF, PNG, JPG (INE, Contratos, etc.)</p>
                {uploading && <p className="text-xs text-blue-600 font-bold mt-2 animate-pulse">Subiendo archivo...</p>}
             </div>

             <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Documentos Guardados</h3>
                {employee.documents && employee.documents.length > 0 ? (
                    employee.documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-blue-600 truncate block">
                                        {doc.name}
                                    </a>
                                    <span className="text-[10px] text-slate-400 uppercase font-medium">{doc.file_type} • {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteDoc(doc.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-6 text-slate-400 text-sm">La carpeta está vacía.</div>
                )}
             </div>
          </TabsContent>

        </Tabs>

        <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={onClose}>Cerrar Ventana</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}