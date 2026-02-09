'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  format, addMinutes, startOfDay, setHours, addDays, isSameDay, 
  differenceInMinutes, parseISO, endOfDay, getDay, isWithinInterval, subDays,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Clock, Scissors, Droplets, Sparkles, Box, 
  PawPrint, FileText, Plane, AlertCircle,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Plus, GripHorizontal, Flag
} from 'lucide-react';
import { toast } from "sonner";
import AppointmentDetailDialog from '@/components/appointments/AppointmentDetailDialog';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';

// --- Interfaces ---
interface Employee {
  id: string; first_name: string; last_name: string; role: string; avatar_url: string | null; color: string;
}

interface Holiday {
    id: string;
    date: string;
    name: string;
}

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

interface ContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    date: Date;
    startTime: Date;
    employeeId?: string;
    colId: string;
}

const ROLE_TRANSLATIONS: Record<string, string> = {
    stylist: 'Estilista',
    bather: 'Bañador',
    finisher: 'Terminador',
    reception: 'Recepción',
    admin: 'Administrador'
};

// --- Utils ---
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

// --- Tooltip Component ---
const AppointmentTooltip = ({ data, position, userRole }: { data: any, position: { x: number, y: number } | null, userRole: string }) => {
    if (!data || !position) return null;
    const style: React.CSSProperties = { top: position.y + 10, left: position.x + 10, position: 'fixed', zIndex: 9999 };
    if (typeof window !== 'undefined') {
        if (position.x > window.innerWidth - 220) style.left = position.x - 210;
        if (position.y > window.innerHeight - 150) style.top = position.y - 140;
    }
    const styles = getServiceCategoryStyles(data.service?.category);
    const CategoryIcon = styles.icon;
    let clientName = data.appointment?.client?.full_name || '';
    if (userRole === 'employee') { clientName = clientName.split(' ')[0] + ' (Cliente)'; }

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
            </div>
        </div>, document.body
    );
};

// --- Context Menu Component ---
const QuickScheduleMenu = ({ contextMenu, onClose, onSchedule }: { contextMenu: ContextMenuState, onClose: () => void, onSchedule: () => void }) => {
    let left = contextMenu.x;
    let top = contextMenu.y;
    if (typeof window !== 'undefined') {
        if (left > window.innerWidth - 180) left = left - 180;
        if (top > window.innerHeight - 100) top = top - 100;
    }

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div 
                className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-slate-200 p-2 w-48 animate-in fade-in zoom-in-95 duration-100"
                style={{ top, left }}
            >
                <div className="text-xs font-semibold text-slate-500 mb-2 px-2 py-1 border-b border-slate-100">
                    {format(contextMenu.startTime, 'HH:mm')} - {format(addMinutes(contextMenu.startTime, 30), 'HH:mm')}
                </div>
                <Button 
                    size="sm" 
                    variant="default" 
                    className="w-full justify-start text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={onSchedule}
                >
                    <Plus size={14} className="mr-2"/> Agendar Cita
                </Button>
            </div>
        </>,
        document.body
    );
};

export default function CalendarBoard({ currentDate, view, employees, appointments = [], userRole = 'employee' }: CalendarBoardProps) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const START_HOUR = 9;
  const END_HOUR = 20;
  const PIXELS_PER_MINUTE = 1.8; 
  const SNAP_MINUTES = 15; 

  const columns = useMemo<ColumnData[]>(() => {
    if (view === 'day') {
      return employees.map(emp => ({ id: emp.id, title: emp.first_name, subtitle: ROLE_TRANSLATIONS[emp.role] || emp.role, data: emp, type: 'employee', isToday: true }));
    } else {
      let daysToShow = view === '3day' ? 3 : 7;
      return Array.from({ length: daysToShow }).map((_, i) => {
        const date = addDays(currentDate, i);
        return { id: format(date, 'yyyy-MM-dd'), title: format(date, 'EEEE d', { locale: es }), subtitle: format(date, 'MMMM', { locale: es }), type: 'date', data: date, isToday: isSameDay(date, new Date()) };
      });
    }
  }, [view, currentDate, employees]);

  // Estados
  const [localAppts, setLocalAppts] = useState<any[]>(appointments);
  const [schedules, setSchedules] = useState<any[]>([]); 
  const [absences, setAbsences] = useState<any[]>([]); 
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [touchDragStart, setTouchDragStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [isDragStarted, setIsDragStarted] = useState(false);
  const dragDistanceRef = useRef(0);
  const MIN_DRAG_DISTANCE = 5; 
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);
  const [resizing, setResizing] = useState<ResizingState | null>(null);
  const [hoveredResizeId, setHoveredResizeId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); 
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [tooltipData, setTooltipData] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{x:number, y:number} | null>(null);
  const [hoveredClient, setHoveredClient] = useState<string | null>(null);
  
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newApptData, setNewApptData] = useState<{ employeeId?: string; date: Date; startTime: Date } | null>(null);
  
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ghostRef = useRef<DragGhost | null>(null);

  const canEdit = useMemo(() => ['admin', 'manager', 'receptionist'].includes(userRole || ''), [userRole]);

  const handleRefresh = useCallback(() => { setRefreshKey(prev => prev + 1); }, []);

  const handleNavigate = (type: 'date' | 'view', value: any) => {
    const params = new URLSearchParams(searchParams.toString());
    if (type === 'date') params.set('date', format(value, 'yyyy-MM-dd'));
    else if (type === 'view') params.set('view', value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleDateStep = (direction: 'prev' | 'next') => {
      const step = view === 'week' ? 7 : view === '3day' ? 3 : 1;
      const newDate = direction === 'next' ? addDays(currentDate, step) : subDays(currentDate, step);
      handleNavigate('date', newDate);
  };

  useEffect(() => { setLocalAppts(appointments); }, [appointments]);

  useEffect(() => {
    const fetchData = async () => {
      let startRange, endRange;
      if (view === 'month') {
          const monthStart = startOfMonth(currentDate);
          const monthEnd = endOfMonth(monthStart);
          startRange = startOfWeek(monthStart, { weekStartsOn: 1 }); 
          endRange = endOfWeek(monthEnd, { weekStartsOn: 1 });
      } else {
          startRange = startOfDay(currentDate);
          endRange = endOfDay(view === '3day' ? addDays(currentDate, 2) : view === 'week' ? addDays(currentDate, 6) : currentDate);
      }
      const { data: apptData } = await supabase.from('appointment_services')
        .select(`*, appointment:appointments (id, notes, pet:pets (id, name, breed), client:clients (id, full_name)), service:services (name, category, duration_minutes)`)
        .gte('start_time', startRange.toISOString()).lte('end_time', endRange.toISOString());
      if (apptData) setLocalAppts(apptData);

      const { data: schedData } = await supabase.from('employee_schedules').select('*');
      if (schedData) setSchedules(schedData);

      const { data: absData } = await supabase.from('employee_absences').select('*');
      if (absData) setAbsences(absData);

      const { data: holData } = await supabase.from('official_holidays').select('*');
      if (holData) setHolidays(holData);
    };
    fetchData();
  }, [currentDate, view, refreshKey, supabase]);

  // --- RESIZE LOGIC ---
  useEffect(() => {
      if (!resizing) return;

      const handleMove = (e: MouseEvent | TouchEvent) => {
          if (e.cancelable) e.preventDefault(); 
          const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
          const deltaPixels = clientY - resizing.initialY;
          const deltaMinutes = Math.round(deltaPixels / PIXELS_PER_MINUTE);
          let snappedDuration = Math.max(15, Math.round((resizing.originalDuration + deltaMinutes) / SNAP_MINUTES) * SNAP_MINUTES);
          
          setResizing(prev => prev ? ({ ...prev, newDuration: snappedDuration }) : null);
      };

      const handleEnd = async () => {
          if (!resizing) return;
          const appt = localAppts.find(a => a.id === resizing.apptId);
          if (appt && resizing.newDuration !== resizing.originalDuration) {
              const start = parseISO(appt.start_time);
              const newEnd = addMinutes(start, resizing.newDuration);
              setLocalAppts(prev => prev.map(a => a.id === resizing.apptId ? { ...a, end_time: newEnd.toISOString() } : a));
              try {
                  await supabase.from('appointment_services').update({ end_time: newEnd.toISOString() }).eq('id', resizing.apptId);
                  toast.success("Duración actualizada");
              } catch {
                  toast.error("Error al guardar");
                  handleRefresh();
              }
          }
          setResizing(null);
          setHoveredResizeId(null);
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
  }, [resizing, localAppts, supabase, handleRefresh]);

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, appt: any) => {
      if (!canEdit) return;
      e.stopPropagation();
      if (e.cancelable && 'touches' in e) e.preventDefault();
      
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const start = parseISO(appt.start_time);
      const end = parseISO(appt.end_time);
      
      setResizing({ 
          apptId: appt.id, 
          initialY: clientY, 
          originalDuration: differenceInMinutes(end, start), 
          newDuration: differenceInMinutes(end, start), 
          startYTime: 0 
      });
      setTooltipData(null); 
      setIsDragging(null);
      setContextMenu(null);
  };

  const handleApptClick = (appt: any) => { 
      if (!isDragging && !resizing) { 
          setTooltipData(null); 
          setSelectedAppt(appt); 
          setIsDetailOpen(true); 
          setContextMenu(null);
      }
  };

  const handleMouseEnter = (e: React.MouseEvent, appt: any) => { 
      if (!isDragging && !resizing && !contextMenu) { 
          const cid = appt.appointment?.client?.id; 
          if(cid) setHoveredClient(cid); 
          tooltipTimeoutRef.current = setTimeout(() => { 
              setTooltipData(appt); 
              setTooltipPos({ x: e.clientX, y: e.clientY }); 
          }, 400); 
      }
  };

  const handleMouseLeave = () => { 
      if(tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current); 
      setTooltipData(null); 
      setHoveredClient(null); 
  };

  const updateAppointment = async (id: string, newStart: Date, newEnd: Date, newColId?: string) => {
    if (!canEdit) { toast.error("No tienes permisos para modificar citas."); return; }
    try {
      let updatePayload: any = { start_time: newStart.toISOString(), end_time: newEnd.toISOString() };
      if (view === 'day' && newColId) updatePayload.employee_id = newColId;
      await supabase.from('appointment_services').update(updatePayload).eq('id', id);
      toast.success("Actualizado"); handleRefresh();
    } catch (e: any) { toast.error(e.message); setLocalAppts([...appointments]); }
  };

  const handleEmptySlotClick = (e: React.MouseEvent, col: ColumnData) => {
      if (isDragging || resizing || !canEdit) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const snappedMinutes = Math.round(Math.max(0, clickY / PIXELS_PER_MINUTE) / SNAP_MINUTES) * SNAP_MINUTES;
      const baseDate = col.type === 'date' ? col.data : currentDate;
      const startTime = addMinutes(setHours(startOfDay(baseDate), START_HOUR), snappedMinutes);

      setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          date: baseDate,
          startTime: startTime,
          employeeId: col.type === 'employee' ? col.id : undefined,
          colId: col.id
      });
  };

  const handleDragStart = (e: React.DragEvent | React.TouchEvent, appt: any) => { 
      if (!canEdit) return;
      
      const target = e.target as HTMLElement;
      if (target.classList.contains('resize-handle') || target.closest('.resize-handle')) {
          e.preventDefault();
          return;
      }

      setTooltipData(null);
      setContextMenu(null);
      dragDistanceRef.current = 0;
      
      if ('dataTransfer' in e) { 
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData("apptId", appt.id);
          try {
              const dragImg = document.createElement('div');
              dragImg.style.position = 'absolute'; dragImg.style.top = '-1000px';
              document.body.appendChild(dragImg);
              e.dataTransfer.setDragImage(dragImg, 0, 0);
              setTimeout(() => { if(document.body.contains(dragImg)) document.body.removeChild(dragImg); }, 50);
          } catch(err) {}
          
          setTimeout(() => setIsDragging(appt.id), 0);
      } else if ('touches' in e) { 
          const touch = e.touches[0];
          setTouchDragStart({ x: touch.clientX, y: touch.clientY, time: Date.now() });
          setIsDragging(appt.id);
      }
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
    if (!ghostRef.current || ghostRef.current.colId !== newGhost.colId || Math.abs(ghostRef.current.top - newGhost.top) > 1) { 
        ghostRef.current = newGhost; 
        setDragGhost(newGhost); 
    }
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

  const handleTouchMove = useCallback((e: TouchEvent, appt: any, col: ColumnData, colIndex: number) => {
    if (!isDragging || !touchDragStart) return;
    const touch = e.touches[0];
    const distance = Math.sqrt(Math.pow(touch.clientX - touchDragStart.x, 2) + Math.pow(touch.clientY - touchDragStart.y, 2));
    
    if (distance > MIN_DRAG_DISTANCE && !isDragStarted) { setIsDragStarted(true); e.preventDefault(); }
    if (!isDragStarted) return;
    dragDistanceRef.current = distance;
    
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const columnElement = elements.find(el => el.hasAttribute('data-column-id'));
    if (columnElement) {
        const colId = columnElement.getAttribute('data-column-id');
        const column = columns.find(c => c.id === colId);
        if (column) {
            const rect = columnElement.getBoundingClientRect();
            const snappedMinutes = Math.round(Math.max(0, (touch.clientY - rect.top) / PIXELS_PER_MINUTE) / SNAP_MINUTES) * SNAP_MINUTES;
            const baseDate = column.type === 'date' ? column.data : currentDate;
            const newStart = addMinutes(setHours(startOfDay(baseDate), START_HOUR), snappedMinutes);
            const duration = differenceInMinutes(parseISO(appt.end_time), parseISO(appt.start_time));
            const newGhost = { apptId: appt.id, colId: column.id, colIndex: columns.findIndex(c => c.id === column.id), startTime: newStart, endTime: addMinutes(newStart, duration), duration, top: snappedMinutes * PIXELS_PER_MINUTE, height: duration * PIXELS_PER_MINUTE, petName: appt.appointment?.pet?.name };
            setDragGhost(newGhost);
            ghostRef.current = newGhost;
        }
    }
  }, [isDragging, touchDragStart, isDragStarted, columns, currentDate, PIXELS_PER_MINUTE, SNAP_MINUTES, START_HOUR]);

  const handleTouchEnd = useCallback((e: TouchEvent, appt: any) => {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();
    
    if (dragDistanceRef.current < MIN_DRAG_DISTANCE) {
        setIsDragging(null); setTouchDragStart(null); setIsDragStarted(false); setDragGhost(null); ghostRef.current = null;
        handleApptClick(appt);
        return;
    }
    const final = ghostRef.current;
    if (final) {
        setLocalAppts(prev => prev.map(a => a.id === final.apptId ? { ...a, start_time: final.startTime.toISOString(), end_time: final.endTime.toISOString(), employee_id: view === 'day' ? final.colId : a.employee_id } : a));
        updateAppointment(final.apptId, final.startTime, final.endTime, view === 'day' ? final.colId : undefined);
    }
    setIsDragging(null); setTouchDragStart(null); setIsDragStarted(false); setDragGhost(null); ghostRef.current = null;
  }, [isDragging, view, updateAppointment]);

  const handleReactTouchMove = useCallback((e: React.TouchEvent, appt: any, col: ColumnData, colIndex: number) => { handleTouchMove(e.nativeEvent, appt, col, colIndex); }, [handleTouchMove]);
  const handleReactTouchEnd = useCallback((e: React.TouchEvent, appt: any) => { handleTouchEnd(e.nativeEvent, appt); }, [handleTouchEnd]);

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
      let height = Math.max(20, differenceInMinutes(end, start) * PIXELS_PER_MINUTE);
      if (resizing && resizing.apptId === appt.id) {
          height = Math.max(20, resizing.newDuration * PIXELS_PER_MINUTE);
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

  const timeSlots = useMemo(() => {
    const slots = [];
    let time = setHours(startOfDay(currentDate), START_HOUR);
    const endTime = setHours(startOfDay(currentDate), END_HOUR);
    while (time <= endTime) { slots.push(time); time = addMinutes(time, 30); }
    return slots;
  }, [currentDate, START_HOUR, END_HOUR]);

  // --- CALCULO UNIFICADO DE DATOS (Día, 3Días, Semana) ---
  const calculateColumnData = useCallback((col: ColumnData) => {
      let colAppointments = [];
      let capacityMinutes = 0;
      const checkDate = col.type === 'date' ? col.data : currentDate;
      const holiday = holidays.find(h => h.date === format(checkDate, 'yyyy-MM-dd'));
      const isHoliday = !!holiday;

      if (col.type === 'employee') {
          // Lógica de Vista DÍA (Por Empleado)
          colAppointments = localAppts.filter(a => a.employee_id === col.id && isSameDay(parseISO(a.start_time), currentDate));
          
          if (!isHoliday) { 
              const empSchedule = schedules.find(s => s.employee_id === col.id && s.day_of_week === getDay(currentDate));
              const isAbsent = absences.some(abs => 
                  abs.employee_id === col.id && 
                  isWithinInterval(startOfDay(currentDate), { start: startOfDay(parseISO(abs.start_date)), end: endOfDay(parseISO(abs.end_date)) })
              );

              if (empSchedule && empSchedule.is_working && !isAbsent) {
                  const [hStart, mStart] = empSchedule.start_time.split(':').map(Number);
                  const [hEnd, mEnd] = empSchedule.end_time.split(':').map(Number);
                  capacityMinutes = (hEnd * 60 + mEnd) - (hStart * 60 + mStart);
              }
          }
      } else { 
          // Lógica de Vista FECHAS (3 Días / Semana)
          colAppointments = localAppts.filter(a => isSameDay(parseISO(a.start_time), col.data));
          
          if (!isHoliday) {
              const dayOfWeek = getDay(col.data);
              employees.forEach(emp => {
                  const empSchedule = schedules.find(s => s.employee_id === emp.id && s.day_of_week === dayOfWeek);
                  // REVISAR AUSENCIA PARA CADA EMPLEADO EN ESA FECHA
                  const isAbsent = absences.some(abs => 
                      abs.employee_id === emp.id && 
                      isWithinInterval(startOfDay(col.data), { start: startOfDay(parseISO(abs.start_date)), end: endOfDay(parseISO(abs.end_date)) })
                  );

                  if (empSchedule && empSchedule.is_working && !isAbsent) {
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
  }, [localAppts, schedules, currentDate, employees, resizing, holidays, absences]);

  // --- CALCULO ESTADISTICAS (VISTA MENSUAL) ---
  const getDayStats = useCallback((date: Date) => {
      let totalCapacity = 0;
      const dayOfWeek = getDay(date);
      const isHoliday = holidays.some(h => h.date === format(date, 'yyyy-MM-dd'));

      if (!isHoliday) {
          employees.forEach(emp => {
              const schedule = schedules.find(s => s.employee_id === emp.id && s.day_of_week === dayOfWeek);
              const isAbsent = absences.some(abs => 
                  abs.employee_id === emp.id && 
                  isWithinInterval(startOfDay(date), { start: startOfDay(parseISO(abs.start_date)), end: endOfDay(parseISO(abs.end_date)) })
              );

              if (schedule && schedule.is_working && !isAbsent) {
                  const [hStart, mStart] = schedule.start_time.split(':').map(Number);
                  const [hEnd, mEnd] = schedule.end_time.split(':').map(Number);
                  const minutes = (hEnd * 60 + mEnd) - (hStart * 60 + mStart);
                  totalCapacity += minutes;
              }
          });
      }

      const dayAppts = localAppts.filter(a => isSameDay(parseISO(a.start_time), date));
      const bookedMinutes = dayAppts.reduce((acc, curr) => {
          const start = parseISO(curr.start_time);
          const end = parseISO(curr.end_time);
          return acc + differenceInMinutes(end, start);
      }, 0);

      const percentage = totalCapacity > 0 ? Math.round((bookedMinutes / totalCapacity) * 100) : 0;
      
      let color = 'bg-slate-200';
      let textColor = 'text-slate-400';

      if (totalCapacity > 0) {
          if (percentage >= 85) { color = 'bg-emerald-500'; textColor = 'text-emerald-600'; }
          else if (percentage >= 65) { color = 'bg-amber-500'; textColor = 'text-amber-600'; }
          else { color = 'bg-blue-500'; textColor = 'text-blue-600'; }
      }

      return { percentage: Math.min(percentage, 100), color, textColor, count: dayAppts.length, totalCapacity };
  }, [employees, schedules, localAppts, absences, holidays]);

  const getColumnStats = useCallback((col: ColumnData) => {
      const { colAppointments, capacityMinutes, bookedMinutes } = calculateColumnData(col);
      const percentage = capacityMinutes > 0 ? Math.min(Math.round((bookedMinutes / capacityMinutes) * 100), 100) : 0;
      const uniquePets = new Set();
      colAppointments.forEach(appt => { if (appt.appointment?.pet?.id) uniquePets.add(appt.appointment.pet.id); });
      const count = uniquePets.size;
      let barColor = 'bg-blue-500'; 
      if (percentage >= 85) barColor = 'bg-emerald-500'; else if (percentage >= 65) barColor = 'bg-amber-500'; 
      return { count, percentage, barColor };
  }, [calculateColumnData]);

  const monthDays = useMemo(() => {
      if (view !== 'month') return [];
      const monthStart = startOfMonth(currentDate); const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate, view]);

  const getNonWorkingBlocks = useCallback((col: ColumnData) => {
    if (col.type !== 'employee') return [];
    const empSchedule = schedules.find(s => s.employee_id === col.id && s.day_of_week === getDay(currentDate));
    const TOTAL_HEIGHT = (END_HOUR - START_HOUR + 1) * 60 * PIXELS_PER_MINUTE;
    if (!empSchedule || !empSchedule.is_working) return [{ top: 0, height: TOTAL_HEIGHT }];
    const blocks = [];
    const [hStart, mStart] = empSchedule.start_time.split(':').map(Number);
    const empStartMins = hStart * 60 + mStart; const globalStartMins = START_HOUR * 60;
    if (empStartMins > globalStartMins) blocks.push({ top: 0, height: (empStartMins - globalStartMins) * PIXELS_PER_MINUTE });
    const [hEnd, mEnd] = empSchedule.end_time.split(':').map(Number);
    const empEndMins = hEnd * 60 + mEnd; const minutesFromGlobalStart = empEndMins - globalStartMins;
    const topOfBottomBlock = minutesFromGlobalStart * PIXELS_PER_MINUTE;
    if (topOfBottomBlock < TOTAL_HEIGHT) blocks.push({ top: topOfBottomBlock, height: TOTAL_HEIGHT - topOfBottomBlock });
    return blocks;
  }, [schedules, currentDate, START_HOUR, END_HOUR, PIXELS_PER_MINUTE]);

  const getAbsenceOverlay = useCallback((col: ColumnData) => {
      const TOTAL_HEIGHT = (END_HOUR - START_HOUR + 1) * 60 * PIXELS_PER_MINUTE;
      const checkDate = col.type === 'date' ? col.data : currentDate;
      const holiday = holidays.find(h => h.date === format(checkDate, 'yyyy-MM-dd'));
      if (holiday) return { height: TOTAL_HEIGHT, bgColor: 'bg-emerald-50', stripeColor: '#d1fae5', label: 'Día Festivo', note: holiday.name, icon: Flag, isHoliday: true };
      if (col.type === 'employee') {
          const activeAbsence = absences.find(abs => {
              const rangeStart = parseISO(abs.start_date); const rangeEnd = parseISO(abs.end_date);
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

  return (
    <>
      {/* 1. AJUSTE DE ALTURA PARA MÓVIL (dvh) 
         Esto asegura que la barra del navegador (Safari/Chrome) no tape el final
      */}
      <div className="flex flex-col h-[calc(100dvh-8rem)] md:h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden select-none relative">
        <div className="flex flex-col lg:flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200 gap-4 shrink-0">
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => handleDateStep('prev')}><ChevronLeft size={16} /></Button>
                <div className="relative group">
                     <Button variant="outline" className="min-w-[200px] justify-start text-left pl-3 font-semibold">
                        <CalendarIcon size={16} className="mr-2 text-slate-500"/>
                        <span className="capitalize">{format(currentDate, "EEEE d MMMM", { locale: es })}</span>
                    </Button>
                    <input type="date" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => handleNavigate('date', parseISO(e.target.value))} />
                </div>
                <Button variant="outline" size="icon" onClick={() => handleDateStep('next')}><ChevronRight size={16} /></Button>
                <Button size="sm" variant="ghost" onClick={() => handleNavigate('date', new Date())}>Hoy</Button>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-lg">
                {['day', '3day', 'week', 'month'].map((v) => (
                    <button key={v} onClick={() => handleNavigate('view', v)} className={cn("px-3 py-1 text-xs font-bold rounded-md transition-all", view === v ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700")}>
                        {v === 'day' ? 'Día' : v === '3day' ? '3 Días' : v === 'week' ? 'Semana' : 'Mes'}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handleRefresh}><Filter size={16} /></Button>
                {canEdit && (
                    <Button 
                        className="bg-blue-600 text-white gap-2" 
                        onClick={() => {
                            setNewApptData({ date: currentDate, startTime: new Date() });
                            setIsCreateDialogOpen(true);
                        }}
                    >
                        <Plus size={16}/> Nueva Cita
                    </Button>
                )}
            </div>
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="flex-1 overflow-auto relative w-full h-full bg-slate-50/30 touch-pan-x touch-pan-y" onClick={() => setContextMenu(null)}>
            {view === 'month' ? (
                // VISTA MENSUAL (Sin cambios mayores, solo h-full asegurado)
                <div className="flex flex-col min-h-full bg-white p-4">
                    <div className="grid grid-cols-7 mb-2 border-b border-slate-200 pb-2">
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                            <div key={d} className="text-center text-xs font-bold text-slate-500 uppercase tracking-wide">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr gap-1">
                        {monthDays.map(day => {
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const stats = getDayStats(day); 
                            const isToday = isSameDay(day, new Date());
                            const holiday = holidays.find(h => h.date === format(day, 'yyyy-MM-dd'));
                            return (
                                <div key={day.toISOString()} onClick={() => { handleNavigate('date', day); handleNavigate('view', 'day'); }} className={cn("border rounded-lg p-2 flex flex-col justify-between cursor-pointer hover:border-slate-400 transition-colors relative min-h-[100px]", isCurrentMonth ? "bg-white border-slate-100" : "bg-slate-50/50 border-slate-50 text-slate-400", isToday && "ring-2 ring-blue-500 ring-offset-2 z-10", holiday && "bg-emerald-50 border-emerald-100")}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={cn("text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full", isToday ? "bg-blue-600 text-white" : "text-slate-700")}>{format(day, 'd')}</span>
                                        {holiday && <div className="flex justify-end"><Flag size={12} className="text-emerald-600 mr-1 mt-1"/></div>}
                                        {!holiday && stats.count > 0 && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 rounded-full">{stats.count}</span>}
                                    </div>
                                    <div className="flex-1 flex flex-col gap-1">
                                        {holiday ? (
                                            <span className="text-[10px] font-bold text-emerald-700 leading-tight text-center mt-2">{holiday.name}</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1 content-start">
                                                {localAppts.filter(a => isSameDay(parseISO(a.start_time), day)).slice(0, 5).map((appt, i) => (<div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stringToColor(appt.appointment?.client?.full_name || '') }}></div>))}
                                            </div>
                                        )}
                                    </div>
                                    {!holiday && (
                                        <div className="mt-2 w-full">
                                            <div className="flex justify-between items-end mb-0.5">
                                                <span className="text-[9px] text-slate-400 font-medium">Ocupación</span>
                                                <span className={cn("text-[9px] font-bold", stats.textColor)}>{stats.percentage}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className={cn("h-full rounded-full transition-all duration-500", stats.color)} style={{ width: `${stats.percentage}%` }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                // --- VISTAS DÍA / SEMANA (CORRECCIÓN MÓVIL AQUI) ---
                <div className="flex flex-col min-w-[1000px] h-full relative">
                    
                    {/* CABECERA STICKY (Nombres de Empleados) */}
                    <div className="flex sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm w-full">
                        <div className="sticky left-0 top-0 z-50 w-14 shrink-0 bg-white border-r border-slate-200 h-[100px]"></div>
                        <div className="flex flex-1">
                            {columns.map((col) => {
                                const stats = getColumnStats(col);
                                return (
                                    <div key={col.id} className={cn("flex-1 min-w-[150px] border-r border-slate-200/60 p-2 flex flex-col justify-between gap-1 h-[100px]", col.isToday && view !== 'day' ? "bg-blue-50/50" : "")}>
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
                                                <span className={cn("font-bold", stats.percentage >= 85 ? "text-emerald-600" : stats.percentage >= 65 ? "text-amber-600" : "text-blue-600")}>{stats.percentage}%</span>
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

                    {/* CUERPO DEL CALENDARIO (Grid) */}
                    <div className="flex flex-1 relative bg-white h-fit min-h-full" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                        {/* COLUMNA DE HORAS (Sticky Izquierda) */}
                        <div className="sticky left-0 z-30 w-14 bg-white border-r border-slate-200 h-fit min-h-full shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            {timeSlots.map((slot, i) => (<div key={i} style={{ height: `${30 * PIXELS_PER_MINUTE}px` }} className="flex justify-center pt-1.5 border-b border-slate-50 bg-white"><span className="text-[10px] font-semibold text-slate-400">{format(slot, 'HH:mm')}</span></div>))}
                        </div>

                        {/* COLUMNAS DE DATOS */}
                        <div className="flex flex-1 relative h-fit min-h-full">
                            {dragGhost && (<div className="absolute z-50 rounded-lg border-2 border-dashed border-blue-400 bg-blue-100/80 p-2 flex flex-col justify-center items-center text-blue-700 pointer-events-none" style={{ top: `${dragGhost.top}px`, height: `${dragGhost.height}px`, left: `${(dragGhost.colIndex * (100 / columns.length))}%`, width: `${100 / columns.length}%`, marginLeft: '2px', maxWidth: 'calc(' + (100 / columns.length) + '% - 4px)' }}><div className="font-bold text-xs flex items-center gap-1"><Clock size={12} />{format(dragGhost.startTime, 'HH:mm')}</div></div>)}

                            {columns.map((col, colIndex) => {
                            const columnAppts = getAppointmentsForColumn(col);
                            const nonWorkingBlocks = getNonWorkingBlocks(col); 
                            const absenceOverlay = getAbsenceOverlay(col); 

                            return (
                                <div key={col.id} className="flex-1 min-w-[150px] border-r border-slate-100 relative group/col cursor-pointer" style={{ minHeight: `${(END_HOUR - START_HOUR + 1) * 60 * PIXELS_PER_MINUTE}px` }} 
                                    onDragOver={(e) => handleDragOver(e, col, colIndex)} 
                                    data-column-id={col.id}
                                    onClick={(e) => handleEmptySlotClick(e, col)}
                                >
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
                                    const isBeingDragged = isDragging === appt.id;
                                    const showResizeHandle = hoveredResizeId === appt.id || isBeingResized;

                                    return (
                                    <div key={appt.id} 
                                        draggable={!absenceOverlay && !resizing && canEdit} 
                                        onDragStart={(e) => handleDragStart(e, appt)} 
                                        onClick={(e) => { e.stopPropagation(); handleApptClick(appt); }} 
                                        onMouseEnter={(e) => handleMouseEnter(e, appt)} 
                                        onMouseLeave={handleMouseLeave}
                                        onTouchStart={(e) => { if (!absenceOverlay && !resizing && canEdit) { const target = e.target as HTMLElement; if (!target.closest('.resize-handle')) handleDragStart(e, appt); } }}
                                        onTouchMove={(e: any) => { if (isDragging && !resizing) handleReactTouchMove(e, appt, col, colIndex); }}
                                        onTouchEnd={(e: any) => { if (isDragging && !resizing) handleReactTouchEnd(e, appt); }}

                                        className={cn(
                                            "absolute rounded-lg shadow-sm border overflow-hidden transition-all duration-200 ring-1 ring-white flex flex-col p-1.5 group/appt", 
                                            styles.container, 
                                            isBeingDragged ? "opacity-30 cursor-grabbing" : "opacity-100", 
                                            !isBeingDragged && !resizing && canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                                            isDimmed ? "opacity-40 scale-95" : "hover:z-50 hover:shadow-lg", 
                                            isFamily ? "ring-2 ring-offset-1 z-40 scale-[1.02] shadow-md" : "", 
                                            isBeingResized ? "z-50 ring-2 ring-blue-400 shadow-xl scale-[1.02]" : ""
                                        )}
                                        style={{ 
                                            top: `${appt.top}px`, 
                                            height: `${appt.height}px`, 
                                            left: `${appt.leftPct}%`, 
                                            width: `${appt.widthPct}%`, 
                                            zIndex: absenceOverlay ? 20 : 25, 
                                            borderColor: isFamily ? stringToColor(appt.appointment?.client?.full_name||'') : undefined,
                                            touchAction: 'none',
                                            WebkitUserSelect: 'none',
                                            userSelect: 'none'
                                        }}>
                                        <div className={cn("absolute left-0 top-0 bottom-0 w-1", styles.accentBar)}></div>
                                        <div className="pl-2 w-full overflow-hidden flex flex-col h-full pointer-events-none select-none">
                                            <div className="flex justify-between items-center w-full"><span className={cn("font-bold truncate text-[11px]", styles.text)}>{appt.appointment?.pet?.name}</span>{appt.height > 30 && <span className="text-[9px] opacity-60 font-mono ml-1 shrink-0">{format(parseISO(appt.start_time), 'HH:mm')} - {isBeingResized ? format(addMinutes(parseISO(appt.start_time), resizing.newDuration), 'HH:mm') : format(parseISO(appt.end_time), 'HH:mm')}</span>}</div>
                                            {appt.height > 45 && (<div className="flex items-center gap-1 mt-auto"><CategoryIcon size={10} className={styles.subtext} /><span className={cn("font-medium uppercase tracking-tight line-clamp-1 text-[9px]", styles.subtext)}>{appt.service?.name}</span></div>)}
                                        </div>
                                        
                                        {!absenceOverlay && canEdit && (
                                            <div 
                                                className={cn("resize-handle absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize z-50 flex items-center justify-center hover:bg-black/5 transition-opacity", showResizeHandle ? "opacity-100" : "opacity-0")}
                                                onMouseEnter={() => setHoveredResizeId(appt.id)}
                                                onMouseLeave={() => setHoveredResizeId(null)}
                                                onMouseDown={(e) => handleResizeStart(e, appt)} 
                                                onTouchStart={(e) => handleResizeStart(e, appt)}
                                                onClick={(e) => e.stopPropagation()}
                                                draggable={true}
                                                onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                            >
                                                <div className="w-8 h-1 bg-slate-400/40 rounded-full mb-1 pointer-events-none"></div>
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
      
      {contextMenu && contextMenu.visible && (
          <QuickScheduleMenu 
              contextMenu={contextMenu} 
              onClose={() => setContextMenu(null)}
              onSchedule={() => {
                  setNewApptData({
                      employeeId: contextMenu.employeeId,
                      date: contextMenu.date,
                      startTime: contextMenu.startTime
                  });
                  setIsCreateDialogOpen(true);
                  setContextMenu(null);
              }}
          />
      )}

      <AppointmentDetailDialog open={isDetailOpen} onOpenChange={setIsDetailOpen} appointment={selectedAppt} employees={employees} onUpdate={handleRefresh} />
      
      {/* INTEGRACIÓN DEL DIÁLOGO DE NUEVA CITA */}
      <NewAppointmentDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        initialDate={newApptData?.date ? format(newApptData.date, 'yyyy-MM-dd') : undefined}
        initialTime={newApptData?.startTime ? format(newApptData.startTime, 'HH:mm') : undefined}
        initialEmployeeId={newApptData?.employeeId}
        onSuccess={async () => {
          handleRefresh();
          await new Promise(resolve => setTimeout(resolve, 300));
          setIsCreateDialogOpen(false);
          setNewApptData(null);
          toast.success("Cita creada exitosamente");
        }}
      />
    </>
  );
}