'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Clock, Plane, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeToEdit?: any | null; 
  onSuccess: () => void;
}

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lunes' },
  { id: 2, label: 'Martes' },
  { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' },
  { id: 5, label: 'Viernes' },
  { id: 6, label: 'Sábado' },
  { id: 0, label: 'Domingo' },
];

export default function StaffDialog({ open, onOpenChange, employeeToEdit, onSuccess }: StaffDialogProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
  // Datos Generales
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('stylist');
  const [color, setColor] = useState('#a855f7');

  // Datos de Horario
  const [schedules, setSchedules] = useState<any[]>([]);

  // Datos de Ausencias
  const [absences, setAbsences] = useState<any[]>([]);
  const [newAbsence, setNewAbsence] = useState({
      start_date: '',
      end_date: '',
      type: 'vacation',
      note: ''
  });

  useEffect(() => {
    if (open) {
        if (employeeToEdit) {
            setFirstName(employeeToEdit.first_name || '');
            setLastName(employeeToEdit.last_name || '');
            setRole(employeeToEdit.role || 'stylist');
            setColor(employeeToEdit.color || '#a855f7');
            fetchSchedules(employeeToEdit.id);
            fetchAbsences(employeeToEdit.id);
        } else {
            resetForm();
        }
        setActiveTab("details");
    }
  }, [open, employeeToEdit]);

  const resetForm = () => {
      setFirstName(''); setLastName(''); setRole('stylist'); setColor('#a855f7');
      setSchedules(DAYS_OF_WEEK.map(d => ({ day_of_week: d.id, start_time: '10:00', end_time: '18:30', is_working: d.id !== 0 })));
      setAbsences([]);
      setNewAbsence({ start_date: '', end_date: '', type: 'vacation', note: '' });
  };

  const fetchSchedules = async (empId: string) => {
      const { data } = await supabase.from('employee_schedules').select('*').eq('employee_id', empId);
      const merged = DAYS_OF_WEEK.map(d => {
          const found = data?.find((s:any) => s.day_of_week === d.id);
          return found ? { ...found, start_time: found.start_time.slice(0,5), end_time: found.end_time.slice(0,5) } 
                       : { day_of_week: d.id, start_time: '10:00', end_time: '18:30', is_working: d.id !== 0 };
      });
      setSchedules(merged);
  };

  const fetchAbsences = async (empId: string) => {
      const { data } = await supabase.from('employee_absences').select('*').eq('employee_id', empId).order('start_date', { ascending: false });
      if (data) setAbsences(data);
  };

  const handleScheduleChange = (dayId: number, field: string, value: any) => {
      setSchedules(prev => prev.map(s => s.day_of_week === dayId ? { ...s, [field]: value } : s));
  };

  const handleAddAbsence = async () => {
      if (!newAbsence.start_date || !newAbsence.end_date) return toast.error("Fechas requeridas");
      if (!employeeToEdit) return toast.error("Guarda el empleado primero");

      try {
          const { error } = await supabase.from('employee_absences').insert([{
              employee_id: employeeToEdit.id,
              start_date: newAbsence.start_date,
              end_date: newAbsence.end_date,
              type: newAbsence.type,
              note: newAbsence.note
          }]);
          if(error) throw error;
          toast.success("Ausencia registrada");
          fetchAbsences(employeeToEdit.id);
          setNewAbsence({ ...newAbsence, note: '' }); // Reset nota pero mantener fechas por comodidad
      } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteAbsence = async (id: string) => {
      const { error } = await supabase.from('employee_absences').delete().eq('id', id);
      if(!error) {
          setAbsences(prev => prev.filter(a => a.id !== id));
          toast.success("Ausencia eliminada");
      }
  };

  const handleSubmit = async () => {
    if (!firstName || !role) return toast.error("Nombre y Rol requeridos");
    setLoading(true);
    try {
        const empPayload = { first_name: firstName, last_name: lastName, role, color, ...(employeeToEdit ? {} : { active: true }) };
        let empId = employeeToEdit?.id;

        if (employeeToEdit) {
            await supabase.from('employees').update(empPayload).eq('id', empId);
        } else {
            const { data, error } = await supabase.from('employees').insert([empPayload]).select().single();
            if (error) throw error;
            empId = data.id;
        }

        const schedulePayload = schedules.map(s => ({
            employee_id: empId, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time, is_working: s.is_working
        }));
        await supabase.from('employee_schedules').upsert(schedulePayload, { onConflict: 'employee_id,day_of_week' });

        toast.success(employeeToEdit ? "Datos actualizados" : "Empleado creado");
        onSuccess();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const getAbsenceLabel = (type: string) => {
      switch(type) {
          case 'vacation': return { label: 'Vacaciones', color: 'bg-green-100 text-green-800' };
          case 'sick': return { label: 'Incapacidad', color: 'bg-red-100 text-red-800' };
          case 'permission': return { label: 'Permiso', color: 'bg-yellow-100 text-yellow-800' };
          case 'holiday': return { label: 'Festivo Oficial', color: 'bg-indigo-100 text-indigo-800' };
          default: return { label: 'Otro', color: 'bg-slate-100 text-slate-800' };
      }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-white z-10">
          <DialogTitle>{employeeToEdit ? 'Gestionar Empleado' : 'Nuevo Miembro'}</DialogTitle>
          <DialogDescription>Configuración de perfil, turnos y ausencias.</DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-2 bg-white">
                <TabsList className="grid w-full grid-cols-3 bg-slate-100">
                    <TabsTrigger value="details">Perfil</TabsTrigger>
                    <TabsTrigger value="schedule">Horario Base</TabsTrigger>
                    <TabsTrigger value="absences" disabled={!employeeToEdit}>Ausencias</TabsTrigger>
                </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 bg-white">
                {/* TAB 1: DATOS */}
                <TabsContent value="details" className="space-y-4 mt-0">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Nombre</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Apellido</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Rol</Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="stylist">Estilista</SelectItem>
                                    <SelectItem value="bather">Bañador</SelectItem>
                                    <SelectItem value="finisher">Terminador</SelectItem>
                                    <SelectItem value="reception">Recepción</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex gap-2">
                                <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-10 p-1 cursor-pointer"/>
                                <Input value={color} onChange={e => setColor(e.target.value)} className="flex-1 uppercase"/>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* TAB 2: HORARIOS */}
                <TabsContent value="schedule" className="space-y-2 mt-0">
                    <div className="bg-blue-50 p-3 rounded-md mb-2 text-xs text-blue-700 flex gap-2"><Clock size={14}/> Horario recurrente semanal.</div>
                    <div className="divide-y divide-slate-100 border rounded-lg">
                        {DAYS_OF_WEEK.map((day) => {
                            const sch = schedules.find(s => s.day_of_week === day.id) || {};
                            return (
                                <div key={day.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50">
                                    <div className="flex items-center gap-3 w-32">
                                        <Switch checked={sch.is_working} onCheckedChange={(val) => handleScheduleChange(day.id, 'is_working', val)}/>
                                        <span className={`text-sm ${sch.is_working ? 'text-slate-900' : 'text-slate-400'}`}>{day.label}</span>
                                    </div>
                                    {sch.is_working ? (
                                        <div className="flex items-center gap-2">
                                            <Input type="time" className="h-8 w-24 text-xs" value={sch.start_time} onChange={(e) => handleScheduleChange(day.id, 'start_time', e.target.value)}/>
                                            <span className="text-slate-400">-</span>
                                            <Input type="time" className="h-8 w-24 text-xs" value={sch.end_time} onChange={(e) => handleScheduleChange(day.id, 'end_time', e.target.value)}/>
                                        </div>
                                    ) : <span className="text-xs text-slate-400 italic pr-4">Descanso</span>}
                                </div>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* TAB 3: AUSENCIAS */}
                <TabsContent value="absences" className="space-y-4 mt-0">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                        <div className="flex gap-2">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs">Desde</Label>
                                <Input type="date" className="h-8 text-xs bg-white" value={newAbsence.start_date} onChange={(e) => setNewAbsence({...newAbsence, start_date: e.target.value})} />
                            </div>
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs">Hasta</Label>
                                <Input type="date" className="h-8 text-xs bg-white" value={newAbsence.end_date} onChange={(e) => setNewAbsence({...newAbsence, end_date: e.target.value})} />
                            </div>
                            <div className="w-32 space-y-1">
                                <Label className="text-xs">Tipo</Label>
                                <Select value={newAbsence.type} onValueChange={(val) => setNewAbsence({...newAbsence, type: val})}>
                                    <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vacation">Vacaciones</SelectItem>
                                        <SelectItem value="sick">Incapacidad</SelectItem>
                                        <SelectItem value="permission">Permiso</SelectItem>
                                        <SelectItem value="holiday">Día Festivo</SelectItem>
                                        <SelectItem value="other">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Input placeholder="Nota (Opcional)" className="h-8 text-xs bg-white" value={newAbsence.note} onChange={(e) => setNewAbsence({...newAbsence, note: e.target.value})} />
                        <Button size="sm" onClick={handleAddAbsence} className="w-full h-8 text-xs bg-slate-800 hover:bg-slate-900"><Plane size={12} className="mr-2"/> Registrar Ausencia</Button>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Historial</h4>
                        {absences.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">No hay ausencias registradas.</p>}
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            {absences.map((abs) => {
                                const style = getAbsenceLabel(abs.type);
                                return (
                                    <div key={abs.id} className="flex items-center justify-between p-2 rounded border border-slate-100 bg-white shadow-sm group">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className={`text-[10px] px-1.5 h-5 ${style.color}`}>{style.label}</Badge>
                                                <span className="text-xs font-medium text-slate-700">
                                                    {format(new Date(abs.start_date), 'd MMM', {locale: es})} - {format(new Date(abs.end_date), 'd MMM yyyy', {locale: es})}
                                                </span>
                                            </div>
                                            {abs.note && <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">{abs.note}</span>}
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteAbsence(abs.id)}>
                                            <Trash2 size={12}/>
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </TabsContent>
            </div>
        </Tabs>

        <div className="flex justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-slate-900 text-white">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Guardar Configuración
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}