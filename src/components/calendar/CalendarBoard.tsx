'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  format, addMinutes, startOfDay, setHours, addDays, isSameDay, 
  differenceInMinutes, parseISO, endOfDay, getDay, isWithinInterval, subDays,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth // <--- AQUÍ ESTÁ LA CORRECCIÓN
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Clock, Scissors, Droplets, Sparkles, Box, 
  User, PawPrint, FileText, Plane, AlertCircle,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Plus, GripHorizontal, Flag
} from 'lucide-react';
import { toast } from "sonner";
import AppointmentDetailDialog from '@/components/appointments/AppointmentDetailDialog';

// --- Interfaces ---
interface Employee {
  id: string; first_name: string; last_name: string; role: string; avatar_url: string | null; color: string;
}

interface Holiday {
    id: string;
    date: string;
    name: string;
}

// ⚠️ AQUÍ ESTÁ EL ARREGLO DEL ERROR: Agregamos userRole a la interfaz
interface CalendarBoardProps {
  currentDate: Date;
  view: 'day' | '3day' | 'week' | 'month';
  employees: Employee[];
  appointments?: any[]; 
  userRole?: 'admin' | 'manager' | 'receptionist' | 'employee';
}

type ColumnData = 
  | { type: 'employee'; id: string; title: string; subtitle: string; data: Employee; isToday: boolean }
  | { type: 'date'; id: string; title: string; subtitle: string; data: Date; isToday: boolean };

interface DragGhost {
  apptId: string; colId: string; colIndex: number; 
  startTime: Date; endTime: Date; duration: number;
  top: number; height: number; petName: string;
}

interface ResizingState {
    apptId: string;
    initialY: number;
    originalDuration: number;
    newDuration: number;
    startYTime: number; 
}

// --- TRADUCCIÓN DE ROLES ---
const ROLE_TRANSLATIONS: Record<string, string> = {
    stylist: 'Estilista',
    bather: 'Bañador',
    finisher: 'Terminador',
    reception: 'Recepción',
    admin: 'Administrador'
};

// --- UTILS ---
const getServiceCategoryStyles = (category: string = 'general') => {
  switch (category?.toLowerCase()) {
      case 'cut': return { container: 'bg-purple-50 hover:bg-purple-100 border-purple-200', accentBar: 'bg-purple-500', text: 'text-purple-900', subtext: 'text-purple-700', icon: Scissors, tooltipBg: 'bg-purple-50', tooltipBorder: 'border-purple-200' };
      case 'bath': return { container: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200', accentBar: 'bg-cyan-500', text: 'text-cyan-900', subtext: 'text-cyan-700', icon: Droplets, tooltipBg: 'bg-cyan-50', tooltipBorder: 'border-cyan-200' };
      case 'addon': return { container: 'bg-amber-50 hover:bg-amber-100 border-amber-200', accentBar: 'bg-amber-500', text: 'text-amber-900', subtext: 'text-amber-700', icon: Sparkles, tooltipBg: 'bg-amber-50', tooltipBorder: 'border-amber-200' };
      default: return { container: 'bg-slate-50 hover:bg-slate-100 border-slate-200', accentBar: 'bg-slate-500', text: 'text-slate-900', subtext: 'text-slate-500', icon: Box, tooltipBg: 'bg-white', tooltipBorder: 'border-slate-200' };
  }
};
const getInitials = (first: string, last?: string) => `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
const stringToColor = (str: string) => { let hash = 0; for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); } return `hsl(${Math.abs(hash) % 360}, 70%, 60%)`; };

// --- TOOLTIP ---
const AppointmentTooltip = ({ data, position, userRole }: { data: any, position: { x: number, y: number } | null, userRole: string }) => {
    if (!data || !position) return null;
    const style: React.CSSProperties = { top: position.y + 10, left: position.x + 10, position: 'fixed', zIndex: 9999 };
    if (typeof window !== 'undefined') {
        if (position.x > window.innerWidth - 220) style.left = position.x - 210;
        if (position.y > window.innerHeight - 150) style.top = position.y - 140;
    }
    const styles = getServiceCategoryStyles(data.service?.category);
    const CategoryIcon = styles.icon;

    // Lógica de enmascaramiento para el Tooltip
    let clientName = data.appointment?.client?.full_name || '';
    if (userRole === 'employee') {
        clientName = clientName.split(' ')[0] + ' (Cliente)'; // Solo primer nombre
    }

    return createPortal(
        <div className={cn("w-56 rounded-xl shadow-2xl border p-3 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 pointer-events-none ring-1 ring-black/5", styles.tooltipBg, styles.tooltipBorder)} style={style}>
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/80 px-1.5 py-0.5 rounded-full border border-black/5 shadow-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stringToColor(data.appointment?.client?.full_name || '') }}></div>
                <span className="text-[9px] font-medium text-slate-500 truncate max-w-[80px]">{clientName}</span>
            </div>
            <div className="flex items-start justify-between mb-2 pb-2 border-b border-black/5 mt-1">
                <div>
                    <h4 className={cn("font-bold text-sm", styles.text)}>{data.appointment?.pet?.name}</h4>
                    <div className="flex items-center gap-1 opacity-70 mt-0.5"><PawPrint size={10}/> <span>{data.appointment?.pet?.breed}</span></div>
                </div>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-center bg-white/40 p-1.5 rounded">
                    <div className="flex items-center gap-2"><CategoryIcon size={12} className={styles.subtext}/><span className="font-semibold uppercase tracking-tight opacity-90">{data.service?.name}</span></div>
                    <div className={cn("font-mono font-bold opacity-70", styles.text)}>{format(parseISO(data.start_time), 'HH:mm')}</div>
                </div>
                {data.appointment?.notes && <div className="mt-2 p-2 bg-yellow-50/80 rounded border border-yellow-100 text-yellow-800 text-[10px] flex gap-1.5 items-start"><FileText size={10} className="mt-0.5 shrink-0"/> <span className="line-clamp-3">{data.appointment?.notes}</span></div>}
            </div>
        </div>, document.body
    );
};

// --- COMPONENTE PRINCIPAL ---
export default function CalendarBoard({ currentDate, view, employees, appointments = [], userRole = 'employee' }: CalendarBoardProps) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const START_HOUR = 9;
  const END_HOUR = 20;
  const PIXELS_PER_MINUTE = 1.8; 
  const SNAP_MINUTES = 15; 

  // Estados
  const [localAppts, setLocalAppts] = useState<any[]>(appointments);
  const [schedules, setSchedules] = useState<any[]>([]); 
  const [absences, setAbsences] = useState<any[]>([]); 
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);
  const [resizing, setResizing] = useState<ResizingState | null>(null);

  const [refreshKey, setRefreshKey] = useState(0); 
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [tooltipData, setTooltipData] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{x:number, y:number} | null>(null);
  const [hoveredClient, setHoveredClient] = useState<string | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ghostRef = useRef<DragGhost | null>(null);

  // --- PERMISOS ---
  // El empleado NO puede editar (arrastrar/redimensionar) ni ver datos completos
  const canEdit = userRole === 'admin' || userRole === 'manager' || userRole === 'receptionist';

  // --- HANDLERS ---
  const handleRefresh = useCallback(() => { setRefreshKey(prev => prev + 1); }, []);

  const handleNavigate = (type: 'date' | 'view', value: any) => {
    const params = new URLSearchParams(searchParams.toString());
    if (type === 'date') params.set('date', format(value, 'yyyy-MM-dd'));
    else if (type === 'view') params.set('view', value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleDateStep = (direction: 'prev' | 'next') => {
      if (view === 'month') {
          const newDate = direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
          handleNavigate('date', newDate);
      } else {
          const step = view === 'week' ? 7 : view === '3day' ? 3 : 1;
          const newDate = direction === 'next' ? addDays(currentDate, step) : subDays(currentDate, step);
          handleNavigate('date', newDate);
      }
  };

  // --- EFECTOS ---
  useEffect(() => { setLocalAppts(appointments); }, [appointments]);

  useEffect(() => {
    const fetchData = async () => {
      let startRange, endRange;

      if (view === 'month') {
          const monthStart = startOfMonth(currentDate);
          const monthEnd = endOfMonth(monthStart);
          startRange = startOfWeek(monthStart, { weekStartsOn: 1 }); 
          endRange = endOfWeek(monthEnd, { weekStartsOn: 1 });
      } else if (view === 'week' || view === '3day') { 
          startRange = startOfDay(currentDate); 
          endRange = addDays(endOfDay(currentDate), view === '3day' ? 2 : 6); 
      } else {
          startRange = startOfDay(currentDate);
          endRange = endOfDay(currentDate);
      }
      
      const { data: apptData } = await supabase.from('appointment_services')
        .select(`*, appointment:appointments (id, notes, pet:pets (id, name, breed), client:clients (id, full_name)), service:services (name, category, duration_minutes)`)
        .gte('start_time', startRange.toISOString()).lte('end_time', endRange.toISOString());
      if (apptData) setLocalAppts(apptData);

      const { data: schedData } = await supabase.from('employee_schedules').select('*');
      if (schedData) setSchedules(schedData);

      const { data: absData } = await supabase.from('employee_absences').select('*')
        .lte('start_date', endRange.toISOString()).gte('end_date', startRange.toISOString());
      if (absData) setAbsences(absData);

      const { data: holData } = await supabase.from('official_holidays').select('*')
        .gte('date', format(startRange, 'yyyy-MM-dd'))
        .lte('date', format(endRange, 'yyyy-MM-dd'));
      if (holData) setHolidays(holData);
    };
    fetchData();
  }, [currentDate, view, refreshKey]);

  useEffect(() => {
      if (!resizing) return;

      const handleMove = (e: MouseEvent | TouchEvent) => {
          const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
          const deltaPixels = clientY - resizing.initialY;
          const deltaMinutes = Math.round(deltaPixels / PIXELS_PER_MINUTE);
          let rawNewDuration = resizing.originalDuration + deltaMinutes;
          let snappedDuration = Math.round(rawNewDuration / SNAP_MINUTES) * SNAP_MINUTES;
          if (snappedDuration < 15) snappedDuration = 15;
          setResizing(prev => prev ? ({ ...prev, newDuration: snappedDuration }) : null);
      };

      const handleEnd = async () => {
          if (!resizing) return;
          const appt = localAppts.find(a => a.id === resizing.apptId);
          if (appt) {
              const start = parseISO(appt.start_time);
              const newEnd = addMinutes(start, resizing.newDuration);
              setLocalAppts(prev => prev.map(a => a.id === resizing.apptId ? { ...a, end_time: newEnd.toISOString() } : a));
              try {
                  await supabase.from('appointment_services').update({ end_time: newEnd.toISOString() }).eq('id', resizing.apptId);
                  toast.success("Duración actualizada");
              } catch (error) {
                  toast.error("Error al actualizar");
                  handleRefresh(); 
              }
          }
          setResizing(null);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);

      return () => {
          window.removeEventListener('mousemove', handleMove);
          window.removeEventListener('mouseup', handleEnd);
          window.removeEventListener('touchmove', handleMove);
          window.removeEventListener('touchend', handleEnd);
      };
  }, [resizing, localAppts, supabase, handleRefresh, PIXELS_PER_MINUTE, SNAP_MINUTES]);

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, appt: any) => {
      // Si no puede editar, no hace nada
      if (!canEdit) return;

      e.stopPropagation(); 
      e.preventDefault(); 
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const start = parseISO(appt.start_time);
      const end = parseISO(appt.end_time);
      const duration = differenceInMinutes(end, start);
      const startYTime = start.getHours() * 60 + start.getMinutes();
      setResizing({ apptId: appt.id, initialY: clientY, originalDuration: duration, newDuration: duration, startYTime });
      setTooltipData(null); 
  };

  const columns = useMemo<ColumnData[]>(() => {
    if (view === 'day') {
      return employees.map(emp => ({ 
          id: emp.id, 
          title: `${emp.first_name}`, 
          subtitle: ROLE_TRANSLATIONS[emp.role] || emp.role, 
          data: emp, 
          type: 'employee',
          isToday: true 
      }));
    } else {
      let daysToShow = view === '3day' ? 3 : 7;
      return Array.from({ length: daysToShow }).map((_, i) => {
        const date = addDays(currentDate, i);
        return { id: format(date, 'yyyy-MM-dd'), title: format(date, 'EEEE d', { locale: es }), subtitle: format(date, 'MMMM', { locale: es }), type: 'date', data: date, isToday: isSameDay(date, new Date()) };
      });
    }
  }, [view, currentDate, employees]);

  const calculateColumnData = useCallback((col: ColumnData) => {
      let colAppointments = [];
      let capacityMinutes = 0;
      
      const checkDate = col.type === 'date' ? col.data : currentDate;
      const holiday = holidays.find(h => h.date === format(checkDate, 'yyyy-MM-dd'));
      const isHoliday = !!holiday;

      if (col.type === 'employee') {
          colAppointments = localAppts.filter(a => a.employee_id === col.id && isSameDay(parseISO(a.start_time), currentDate));
          if (!isHoliday) { 
              const empSchedule = schedules.find(s => s.employee_id === col.id && s.day_of_week === getDay(currentDate));
              if (empSchedule && empSchedule.is_working) {
                  const [hStart, mStart] = empSchedule.start_time.split(':').map(Number);
                  const [hEnd, mEnd] = empSchedule.end_time.split(':').map(Number);
                  capacityMinutes = (hEnd * 60 + mEnd) - (hStart * 60 + mStart);
              }
          }
      } else { 
          colAppointments = localAppts.filter(a => isSameDay(parseISO(a.start_time), col.data));
          if (!isHoliday) {
              const dayOfWeek = getDay(col.data);
              employees.forEach(emp => {
                  const empSchedule = schedules.find(s => s.employee_id === emp.id && s.day_of_week === dayOfWeek);
                  if (empSchedule && empSchedule.is_working) {
                      const [hStart, mStart] = empSchedule.start_time.split(':').map(Number);
                      const [hEnd, mEnd] = empSchedule.end_time.split(':').map(Number);
                      capacityMinutes += (hEnd * 60 + mEnd) - (hStart * 60 + mStart);
                  }
              });
          }
      }

      const bookedMinutes = colAppointments.reduce((acc, curr) => {
          if (resizing && resizing.apptId === curr.id) return acc + resizing.newDuration;
          const start = parseISO(curr.start_time);
          const end = parseISO(curr.end_time);
          return acc + differenceInMinutes(end, start);
      }, 0);

      return { colAppointments, capacityMinutes, bookedMinutes };
  }, [localAppts, schedules, currentDate, employees, resizing, holidays]);

  const globalStats = useMemo(() => {
      if (view === 'month') return null; 
      let totalCapacity = 0;
      let totalBooked = 0;
      const allUniquePets = new Set();

      columns.forEach(col => {
          const { colAppointments, capacityMinutes, bookedMinutes } = calculateColumnData(col);
          totalCapacity += capacityMinutes;
          totalBooked += bookedMinutes;
          colAppointments.forEach(appt => { if (appt.appointment?.pet?.id) allUniquePets.add(appt.appointment.pet.id); });
      });

      const percentage = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;
      let color = 'bg-red-500';
      let textColor = 'text-red-600';
      if (percentage >= 85) { color = 'bg-emerald-500'; textColor = 'text-emerald-600'; }
      else if (percentage >= 65) { color = 'bg-amber-500'; textColor = 'text-amber-600'; }

      return { percentage, color, textColor, totalPets: allUniquePets.size };
  }, [columns, calculateColumnData, view]);

  const getColumnStats = useCallback((col: ColumnData) => {
      const { colAppointments, capacityMinutes, bookedMinutes } = calculateColumnData(col);
      const percentage = capacityMinutes > 0 ? Math.min(Math.round((bookedMinutes / capacityMinutes) * 100), 100) : 0;
      const uniquePets = new Set();
      colAppointments.forEach(appt => { if (appt.appointment?.pet?.id) uniquePets.add(appt.appointment.pet.id); });
      const count = uniquePets.size;

      let barColor = 'bg-red-500'; 
      if (percentage >= 85) barColor = 'bg-emerald-500'; 
      else if (percentage >= 65) barColor = 'bg-amber-500'; 

      return { count, percentage, barColor };
  }, [calculateColumnData]);

  const timeSlots = useMemo(() => {
    const slots = [];
    let time = setHours(startOfDay(currentDate), START_HOUR);
    const endTime = setHours(startOfDay(currentDate), END_HOUR);
    while (time <= endTime) { slots.push(time); time = addMinutes(time, 30); }
    return slots;
  }, [currentDate, START_HOUR, END_HOUR]);

  const monthDays = useMemo(() => {
      if (view !== 'month') return [];
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
      const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate, view]);

  const getNonWorkingBlocks = useCallback((col: ColumnData) => {
    if (col.type !== 'employee') return [];
    const empSchedule = schedules.find(s => s.employee_id === col.id && s.day_of_week === getDay(currentDate));
    const TOTAL_HEIGHT = (END_HOUR - START_HOUR + 1) * 60 * PIXELS_PER_MINUTE;
    if (!empSchedule || !empSchedule.is_working) return [{ top: 0, height: TOTAL_HEIGHT }];
    const blocks = [];
    const [hStart, mStart] = empSchedule.start_time.split(':').map(Number);
    const empStartMins = hStart * 60 + mStart;
    const globalStartMins = START_HOUR * 60;
    if (empStartMins > globalStartMins) blocks.push({ top: 0, height: (empStartMins - globalStartMins) * PIXELS_PER_MINUTE });
    const [hEnd, mEnd] = empSchedule.end_time.split(':').map(Number);
    const empEndMins = hEnd * 60 + mEnd;
    const minutesFromGlobalStart = empEndMins - globalStartMins;
    const topOfBottomBlock = minutesFromGlobalStart * PIXELS_PER_MINUTE;
    if (topOfBottomBlock < TOTAL_HEIGHT) blocks.push({ top: topOfBottomBlock, height: TOTAL_HEIGHT - topOfBottomBlock });
    return blocks;
  }, [schedules, currentDate, START_HOUR, END_HOUR, PIXELS_PER_MINUTE]);

  const getAbsenceOverlay = useCallback((col: ColumnData) => {
      const TOTAL_HEIGHT = (END_HOUR - START_HOUR + 1) * 60 * PIXELS_PER_MINUTE;
      const checkDate = col.type === 'date' ? col.data : currentDate;

      const holiday = holidays.find(h => h.date === format(checkDate, 'yyyy-MM-dd'));
      if (holiday) {
          return { height: TOTAL_HEIGHT, bgColor: 'bg-emerald-50', stripeColor: '#d1fae5', label: 'Día Festivo', note: holiday.name, icon: Flag, isHoliday: true };
      }

      if (col.type === 'employee') {
          const activeAbsence = absences.find(abs => {
              const rangeStart = parseISO(abs.start_date);
              const rangeEnd = parseISO(abs.end_date);
              return abs.employee_id === col.id && isWithinInterval(startOfDay(currentDate), { start: startOfDay(rangeStart), end: endOfDay(rangeEnd) });
          });
          if (activeAbsence) {
              let bgColor = 'bg-slate-100'; let stripeColor = '#cbd5e1'; let label = 'Ausente'; let icon = AlertCircle;
              switch(activeAbsence.type) {
                  case 'vacation': bgColor = 'bg-teal-50'; stripeColor = '#99f6e4'; label = 'Vacaciones'; icon = Plane; break;
                  case 'sick': bgColor = 'bg-red-50'; stripeColor = '#fecaca'; label = 'Incapacidad'; icon = AlertCircle; break;
                  case 'permission': bgColor = 'bg-amber-50'; stripeColor = '#fde68a'; label = 'Permiso'; icon = Clock; break;
                  case 'holiday': bgColor = 'bg-indigo-50'; stripeColor = '#c7d2fe'; label = 'Día Festivo'; icon = Sparkles; break;
              }
              return { height: TOTAL_HEIGHT, bgColor, stripeColor, label, note: activeAbsence.note, icon, isHoliday: false };
          }
      }
      return null;
  }, [absences, currentDate, START_HOUR, END_HOUR, PIXELS_PER_MINUTE, holidays]);

  const getAppointmentsForColumn = useCallback((col: ColumnData) => {
    const colAppts = localAppts.filter(appt => {
      const apptStart = parseISO(appt.start_time);
      if (view === 'day') return appt.employee_id === col.id && isSameDay(apptStart, currentDate);
      else return format(apptStart, 'yyyy-MM-dd') === col.id;
    });
    const items = colAppts.map(appt => {
      const start = parseISO(appt.start_time);
      const end = parseISO(appt.end_time);
      const top = Math.max(0, ((start.getHours() * 60 + start.getMinutes()) - (START_HOUR * 60)) * PIXELS_PER_MINUTE);
      let height;
      if (resizing && resizing.apptId === appt.id) {
          height = Math.max(20, resizing.newDuration * PIXELS_PER_MINUTE);
      } else {
          height = Math.max(20, differenceInMinutes(end, start) * PIXELS_PER_MINUTE);
      }
      return { ...appt, _start: start.getTime(), _end: end.getTime(), top, height };
    });
    const lanes: any[][] = [];
    items.sort((a,b) => a._start - b._start);
    items.forEach(item => {
        let placed = false;
        for(let i=0; i<lanes.length; i++) { if(lanes[i][lanes[i].length-1]._end <= item._start) { lanes[i].push(item); item.laneIndex = i; placed=true; break; } }
        if(!placed) { lanes.push([item]); item.laneIndex = lanes.length-1; }
    });
    return items.map(item => ({ ...item, widthPct: 100/lanes.length, leftPct: (100/lanes.length) * item.laneIndex }));
  }, [localAppts, view, currentDate, resizing, PIXELS_PER_MINUTE]); 

  const updateAppointment = async (id: string, newStart: Date, newEnd: Date, newColId?: string) => {
    // PROTECCIÓN DE ROL
    if (!canEdit) {
        toast.error("No tienes permisos para modificar citas.");
        return;
    }
    try {
      let updatePayload: any = { start_time: newStart.toISOString(), end_time: newEnd.toISOString() };
      if (view === 'day' && newColId) updatePayload.employee_id = newColId;
      await supabase.from('appointment_services').update(updatePayload).eq('id', id);
      toast.success("Actualizado"); handleRefresh();
    } catch (e: any) { toast.error(e.message); setLocalAppts([...appointments]); }
  };

  const handleDragStart = (e: React.DragEvent, appt: any) => { 
      // PROTECCIÓN DE ROL
      if (!canEdit) return;
      e.stopPropagation(); setTooltipData(null); e.dataTransfer.setData("apptId", appt.id); setTimeout(() => setIsDragging(appt.id), 0); 
  };
  
  const handleDragOver = (e: React.DragEvent, col: ColumnData, colIndex: number) => {
    e.preventDefault(); e.stopPropagation();
    if (!isDragging) return;
    const appt = localAppts.find(a => a.id === isDragging);
    if (!appt) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const snappedMinutes = Math.round(Math.max(0, (e.clientY - rect.top) / PIXELS_PER_MINUTE) / SNAP_MINUTES) * SNAP_MINUTES;
    const baseDate = col.type === 'date' ? col.data : currentDate;
    const newStart = addMinutes(setHours(startOfDay(baseDate), START_HOUR), snappedMinutes);
    const duration = differenceInMinutes(parseISO(appt.end_time), parseISO(appt.start_time));
    const newGhost = { apptId: appt.id, colId: col.id, colIndex, startTime: newStart, endTime: addMinutes(newStart, duration), duration, top: snappedMinutes * PIXELS_PER_MINUTE, height: duration * PIXELS_PER_MINUTE, petName: appt.appointment?.pet?.name };
    if (!ghostRef.current || ghostRef.current.colId !== newGhost.colId || Math.abs(ghostRef.current.top - newGhost.top) > 1) { ghostRef.current = newGhost; setDragGhost(newGhost); }
  };
  
  const handleDrop = (e: React.DragEvent) => { 
      e.preventDefault(); e.stopPropagation(); 
      const final = ghostRef.current; 
      if (final) { 
          setLocalAppts(prev => prev.map(a => a.id === final.apptId ? { ...a, start_time: final.startTime.toISOString(), end_time: final.endTime.toISOString(), employee_id: view === 'day' ? final.colId : a.employee_id } : a)); 
          updateAppointment(final.apptId, final.startTime, final.endTime, view === 'day' ? final.colId : undefined); 
      } 
      ghostRef.current = null; setIsDragging(null); setDragGhost(null); 
  };
  
  const handleApptClick = (appt: any) => { if (!isDragging && !resizing) { setTooltipData(null); setSelectedAppt(appt); setIsDetailOpen(true); }};
  const handleMouseEnter = (e: React.MouseEvent, appt: any) => { if(!isDragging && !resizing) { const cid = appt.appointment?.client?.id; if(cid) setHoveredClient(cid); tooltipTimeoutRef.current = setTimeout(() => { setTooltipData(appt); setTooltipPos({ x: e.clientX, y: e.clientY }); }, 400); }};
  const handleMouseLeave = () => { if(tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current); setTooltipData(null); setHoveredClient(null); };

  return (
    <>
      <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden select-none relative">
        <div className="flex flex-col lg:flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200 gap-4">
            <div className="flex items-center gap-2 w-full lg:w-auto">
                <Button variant="outline" size="icon" className="h-9 w-9 text-slate-600 shrink-0" onClick={() => handleDateStep('prev')}><ChevronLeft size={16} /></Button>
                <div className="relative group flex-1 lg:flex-none">
                    <Button variant="outline" className={cn("h-9 gap-2 font-semibold w-full lg:min-w-[220px] justify-start text-left bg-white border-slate-300 text-slate-700 hover:bg-slate-50 relative z-10 pl-3")}>
                        <CalendarIcon size={16} className="text-slate-500 mb-0.5"/>
                        <span className="capitalize text-sm truncate">
                            {view === 'month' ? format(currentDate, "MMMM yyyy", { locale: es }) : format(currentDate, "EEEE d 'de' MMMM", { locale: es })}
                        </span>
                    </Button>
                    <input type="date" className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full" value={format(currentDate, 'yyyy-MM-dd')} onClick={(e) => { try { (e.currentTarget as any).showPicker(); } catch(e){} }} onChange={(e) => handleNavigate('date', parseISO(e.target.value))} />
                </div>
                <Button variant="outline" size="icon" className="h-9 w-9 text-slate-600 shrink-0" onClick={() => handleDateStep('next')}><ChevronRight size={16} /></Button>
                <Button size="sm" variant="ghost" className="text-xs h-9 ml-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shrink-0" onClick={() => handleNavigate('date', new Date())}>Hoy</Button>
            </div>
            
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 w-full lg:w-auto justify-center">
                {[{ id: 'day', label: 'Día' }, { id: '3day', label: '3 Días' }, { id: 'week', label: 'Semana' }, { id: 'month', label: 'Mes' }].map((v) => (
                    <button key={v.id} onClick={() => handleNavigate('view', v.id)} className={cn("px-4 py-1.5 text-xs font-medium rounded-md transition-all flex-1 lg:flex-none text-center", view === v.id ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50")}>{v.label}</button>
                ))}
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                {globalStats && (
                    <div className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm rounded-lg px-3 py-1.5 h-9 mr-2">
                        <div className="flex flex-col items-end leading-none border-r border-slate-100 pr-3 mr-1">
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide">Ocupación Total</span>
                            <div className="flex items-center gap-1.5">
                                <span className={cn("text-xs font-bold", globalStats.textColor)}>{globalStats.percentage}%</span>
                                <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={cn("h-full", globalStats.color)} style={{ width: `${globalStats.percentage}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                            <PawPrint size={14} className="text-slate-400"/>
                            <span className="text-xs font-bold">{globalStats.totalPets}</span>
                        </div>
                    </div>
                )}

                <Button variant="outline" size="icon" onClick={handleRefresh} className="h-9 w-9 text-slate-400 hover:text-slate-700 shrink-0"><Filter size={16} /></Button>
                {/* SOLO ADMIN, MANAGER O RECEPTIONIST PUEDEN CREAR CITA */}
                {canEdit && (
                    <Button className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm text-xs h-9 gap-2 shrink-0 px-4"><Plus size={16}/> <span>Nueva Cita</span></Button>
                )}
            </div>
        </div>

        <div className="flex-1 overflow-auto relative w-full h-full bg-slate-50/30">
            {view === 'month' ? (
                <div className="flex flex-col h-full bg-white p-4">
                    <div className="grid grid-cols-7 mb-2 border-b border-slate-200 pb-2">
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                            <div key={d} className="text-center text-xs font-bold text-slate-500 uppercase tracking-wide">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr gap-1">
                        {monthDays.map(day => {
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const dayAppts = localAppts.filter(a => isSameDay(parseISO(a.start_time), day));
                            const isToday = isSameDay(day, new Date());
                            const holiday = holidays.find(h => h.date === format(day, 'yyyy-MM-dd'));
                            
                            return (
                                <div key={day.toISOString()} onClick={() => { handleNavigate('date', day); handleNavigate('view', 'day'); }} className={cn("border rounded-lg p-2 flex flex-col gap-1 cursor-pointer hover:border-slate-400 transition-colors relative min-h-[80px]", isCurrentMonth ? "bg-white border-slate-100" : "bg-slate-50/50 border-slate-50 text-slate-400", isToday && "ring-2 ring-blue-500 ring-offset-2 z-10", holiday && "bg-emerald-50 border-emerald-100")}>
                                    <div className="flex justify-between items-start">
                                        <span className={cn("text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full", isToday ? "bg-blue-600 text-white" : "text-slate-700")}>{format(day, 'd')}</span>
                                        {holiday && <div className="flex justify-end"><Flag size={12} className="text-emerald-600 mr-1 mt-1"/><span className="text-[9px] font-bold text-emerald-700 leading-tight max-w-[60px] text-right">{holiday.name}</span></div>}
                                        {!holiday && dayAppts.length > 0 && <span className="text-[10px] font-bold text-slate-400">{dayAppts.length} citas</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-auto">
                                        {dayAppts.slice(0, 6).map((appt, i) => (<div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stringToColor(appt.appointment?.client?.full_name || '') }}></div>))}
                                        {dayAppts.length > 6 && <span className="text-[9px] text-slate-400">+</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="flex h-full overflow-hidden flex-col">
                    <div className="flex sticky top-0 z-40 bg-white min-w-max border-b border-slate-200 shadow-sm w-full">
                        <div className="sticky left-0 top-0 z-50 w-14 shrink-0 bg-white border-r border-slate-200 h-[80px]"></div>
                        <div className="flex flex-1">
                            {columns.map((col) => {
                                const stats = getColumnStats(col);
                                return (
                                    <div key={col.id} className={cn("flex-1 min-w-[150px] border-r border-slate-200/60 p-2 flex flex-col justify-between gap-1 h-[80px]", col.isToday && view !== 'day' ? "bg-blue-50/50" : "")}>
                                        <div className="flex items-start justify-between w-full">
                                            {col.type === 'employee' ? (
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8 ring-1 ring-slate-200" style={{ border: `2px solid ${col.data.color}` }}>
                                                        <AvatarImage src={col.data.avatar_url || ''} />
                                                        <AvatarFallback className="text-[10px] font-bold bg-slate-100 text-slate-600">{getInitials(col.data.first_name, col.data.last_name)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col leading-tight">
                                                        <span className="text-xs font-bold text-slate-800 truncate max-w-[80px]">{col.data.first_name}</span>
                                                        <span className="text-[9px] text-slate-400 uppercase tracking-tight">{col.subtitle}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className={cn("text-xs font-bold capitalize", col.isToday ? "text-blue-700" : "text-slate-800")}>{col.title}</span>
                                                    <span className="text-[10px] text-slate-400 uppercase">{col.subtitle}</span>
                                                </div>
                                            )}
                                            <div className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border border-slate-200">
                                                <PawPrint size={10} className="text-slate-400" /> {stats.count}
                                            </div>
                                        </div>
                                        <div className="w-full space-y-1">
                                            <div className="flex justify-between items-end text-[9px] text-slate-400 px-0.5">
                                                <span>Ocupación</span>
                                                <span className={cn("font-bold", stats.percentage >= 85 ? "text-emerald-600" : stats.percentage >= 65 ? "text-amber-600" : "text-red-500")}>{stats.percentage}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
                                                <div className={cn("h-full transition-all duration-500 rounded-full", stats.barColor)} style={{ width: `${stats.percentage}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex min-w-max relative flex-1 overflow-auto" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                        <div className="sticky left-0 z-30 w-14 bg-white border-r border-slate-200 h-fit min-h-full">
                            {timeSlots.map((slot, i) => (<div key={i} style={{ height: `${30 * PIXELS_PER_MINUTE}px` }} className="flex justify-center pt-1.5 border-b border-slate-50 bg-white"><span className="text-[10px] font-semibold text-slate-400">{format(slot, 'HH:mm')}</span></div>))}
                        </div>

                        <div className="flex flex-1 relative bg-white h-fit min-h-full">
                            {dragGhost && (<div className="absolute z-50 rounded-lg border-2 border-dashed border-blue-400 bg-blue-100/80 p-2 flex flex-col justify-center items-center text-blue-700 pointer-events-none" style={{ top: `${dragGhost.top}px`, height: `${dragGhost.height}px`, left: `${(dragGhost.colIndex * (100 / columns.length))}%`, width: `${100 / columns.length}%`, marginLeft: '2px', maxWidth: 'calc(' + (100 / columns.length) + '% - 4px)' }}><div className="font-bold text-xs flex items-center gap-1"><Clock size={12} />{format(dragGhost.startTime, 'HH:mm')}</div></div>)}

                            {columns.map((col, colIndex) => {
                            const columnAppts = getAppointmentsForColumn(col);
                            const nonWorkingBlocks = getNonWorkingBlocks(col); 
                            const absenceOverlay = getAbsenceOverlay(col); 

                            return (
                                <div key={col.id} className="flex-1 min-w-[150px] border-r border-slate-100 relative" style={{ minHeight: `${(END_HOUR - START_HOUR + 1) * 60 * PIXELS_PER_MINUTE}px` }} onDragOver={(e) => handleDragOver(e, col, colIndex)}>
                                {timeSlots.map((_, i) => <div key={i} style={{ height: `${30 * PIXELS_PER_MINUTE}px` }} className="border-b border-slate-50 border-dashed w-full pointer-events-none"></div>)}
                                
                                {!absenceOverlay && nonWorkingBlocks.map((block, i) => (<div key={i} className="absolute left-0 right-0 bg-slate-100/50 backdrop-grayscale z-10 pointer-events-none" style={{ top: block.top, height: block.height, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #e2e8f0 10px, #e2e8f0 12px)' }}></div>))}

                                {absenceOverlay && (
                                    <div className={cn("absolute inset-0 z-30 flex flex-col items-center justify-center p-4 text-center border-l-4 border-l-transparent bg-opacity-90 backdrop-blur-sm", absenceOverlay.bgColor)} 
                                        style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${absenceOverlay.stripeColor} 10px, ${absenceOverlay.stripeColor} 12px)` }}>
                                        <div className="bg-white/90 p-3 rounded-xl shadow-sm border border-slate-200/50 flex flex-col items-center max-w-[90%]">
                                            <absenceOverlay.icon className="h-6 w-6 mb-1 text-slate-500" />
                                            <span className="font-bold text-sm text-slate-800 uppercase tracking-wide">{absenceOverlay.label}</span>
                                            {absenceOverlay.note && <span className="text-xs text-slate-500 mt-1 italic line-clamp-3">"{absenceOverlay.note}"</span>}
                                        </div>
                                    </div>
                                )}

                                {columnAppts.map((appt) => {
                                    const styles = getServiceCategoryStyles(appt.service?.category);
                                    const CategoryIcon = styles.icon;
                                    const isDimmed = hoveredClient && hoveredClient !== appt.appointment?.client?.id;
                                    const isFamily = hoveredClient === appt.appointment?.client?.id;
                                    const isBeingResized = resizing && resizing.apptId === appt.id;

                                    return (
                                    <div key={appt.id} draggable={!absenceOverlay && !resizing && canEdit} onDragStart={(e) => handleDragStart(e, appt)} onClick={(e) => { e.stopPropagation(); handleApptClick(appt); }} onMouseEnter={(e) => handleMouseEnter(e, appt)} onMouseLeave={handleMouseLeave}
                                        className={cn("absolute rounded-lg shadow-sm border overflow-hidden cursor-pointer transition-all duration-200 ring-1 ring-white flex flex-col p-1.5 group/appt", styles.container, isDragging === appt.id ? "opacity-30" : "opacity-100", isDimmed ? "opacity-40 scale-95" : "hover:z-50 hover:shadow-lg", isFamily ? "ring-2 ring-offset-1 z-40 scale-[1.02] shadow-md" : "", isBeingResized ? "z-50 ring-2 ring-blue-400 shadow-xl scale-[1.02]" : "")}
                                        style={{ top: `${appt.top}px`, height: `${appt.height}px`, left: `${appt.leftPct}%`, width: `${appt.widthPct}%`, zIndex: absenceOverlay ? 20 : 25, borderColor: isFamily ? stringToColor(appt.appointment?.client?.full_name||'') : undefined }}>
                                        <div className={cn("absolute left-0 top-0 bottom-0 w-1", styles.accentBar)}></div>
                                        <div className="pl-2 w-full overflow-hidden flex flex-col h-full pointer-events-none">
                                            <div className="flex justify-between items-center w-full"><span className={cn("font-bold truncate text-[11px]", styles.text)}>{appt.appointment?.pet?.name}</span>{appt.height > 30 && <span className="text-[9px] opacity-60 font-mono ml-1 shrink-0">{format(parseISO(appt.start_time), 'HH:mm')} - {isBeingResized ? format(addMinutes(parseISO(appt.start_time), resizing.newDuration), 'HH:mm') : format(parseISO(appt.end_time), 'HH:mm')}</span>}</div>
                                            {appt.height > 45 && (<div className="flex items-center gap-1 mt-auto"><CategoryIcon size={10} className={styles.subtext} /><span className={cn("font-medium uppercase tracking-tight line-clamp-1 text-[9px]", styles.subtext)}>{appt.service?.name}</span></div>)}
                                        </div>
                                        
                                        {!absenceOverlay && canEdit && (
                                            <div className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize z-50 flex items-center justify-center opacity-0 group-hover/appt:opacity-100 hover:bg-slate-400/20 transition-opacity" onMouseDown={(e) => handleResizeStart(e, appt)} onTouchStart={(e) => handleResizeStart(e, appt)}>
                                                <GripHorizontal className="w-3 h-3 text-slate-500/50" />
                                            </div>
                                        )}
                                    </div>
                                    );
                                })}
                                </div>
                            );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
      <AppointmentTooltip data={tooltipData} position={tooltipPos} userRole={userRole} />
      <AppointmentDetailDialog open={isDetailOpen} onOpenChange={setIsDetailOpen} appointment={selectedAppt} employees={employees} onUpdate={handleRefresh} />
    </>
  );
}