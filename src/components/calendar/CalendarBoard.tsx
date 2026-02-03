'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  format, addMinutes, startOfDay, setHours, addDays, isSameDay, 
  differenceInMinutes, parseISO, endOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { 
  GripHorizontal, Clock, Scissors, Droplets, Sparkles, Box, 
  User, PawPrint, FileText, Users
} from 'lucide-react';
import { toast } from "sonner";
import AppointmentDetailDialog from '@/components/appointments/AppointmentDetailDialog';

// --- Interfaces ---
interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url: string | null;
  color: string;
}

interface CalendarBoardProps {
  currentDate: Date;
  view: 'day' | '3day' | 'week' | 'month';
  employees: Employee[];
  appointments?: any[]; 
}

type ColumnData = 
  | { type: 'employee'; id: string; title: string; subtitle: string; data: Employee; isToday: boolean }
  | { type: 'date'; id: string; title: string; subtitle: string; data: Date; isToday: boolean };

interface DragGhost {
  apptId: string;
  colId: string;
  colIndex: number; 
  startTime: Date;
  endTime: Date;
  duration: number;
  top: number;
  height: number;
  petName: string;
}

// --- UTILS: COLORES & HASHING ---
const getServiceCategoryStyles = (category: string = 'general') => {
  switch (category?.toLowerCase()) {
      case 'cut': return { 
          container: 'bg-purple-50 hover:bg-purple-100 border-purple-200', 
          accentBar: 'bg-purple-500', text: 'text-purple-900', subtext: 'text-purple-700', icon: Scissors,
          tooltipBg: 'bg-purple-50', tooltipBorder: 'border-purple-200'
      };
      case 'bath': return { 
          container: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200', 
          accentBar: 'bg-cyan-500', text: 'text-cyan-900', subtext: 'text-cyan-700', icon: Droplets,
          tooltipBg: 'bg-cyan-50', tooltipBorder: 'border-cyan-200'
      };
      case 'addon': return { 
          container: 'bg-amber-50 hover:bg-amber-100 border-amber-200', 
          accentBar: 'bg-amber-500', text: 'text-amber-900', subtext: 'text-amber-700', icon: Sparkles,
          tooltipBg: 'bg-amber-50', tooltipBorder: 'border-amber-200'
      };
      default: return { 
          container: 'bg-slate-50 hover:bg-slate-100 border-slate-200', 
          accentBar: 'bg-slate-500', text: 'text-slate-900', subtext: 'text-slate-500', icon: Box,
          tooltipBg: 'bg-white', tooltipBorder: 'border-slate-200'
      };
  }
};

const getInitials = (first: string, last?: string) => `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();

// Generar color único y consistente para el cliente
const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Colores pasteles saturados para visibilidad
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 60%)`; 
};

// ============================================================================
// COMPONENTE TOOLTIP
// ============================================================================
const AppointmentTooltip = ({ data, position }: { data: any, position: { x: number, y: number } | null }) => {
    if (!data || !position) return null;

    const style: React.CSSProperties = {
        top: position.y + 10,
        left: position.x + 10,
        position: 'fixed',
        zIndex: 9999,
    };

    if (typeof window !== 'undefined') {
        if (position.x > window.innerWidth - 220) style.left = position.x - 210;
        if (position.y > window.innerHeight - 150) style.top = position.y - 140;
    }

    const styles = getServiceCategoryStyles(data.service?.category);
    const CategoryIcon = styles.icon;
    const clientName = data.appointment?.client?.full_name || 'Desconocido';
    const familyColor = stringToColor(clientName);

    return createPortal(
        <div className={cn("w-56 rounded-xl shadow-2xl border p-3 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 pointer-events-none ring-1 ring-black/5", styles.tooltipBg, styles.tooltipBorder)} style={style}>
            {/* Indicador de Familia */}
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/80 px-1.5 py-0.5 rounded-full border border-black/5 shadow-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: familyColor }}></div>
                <span className="text-[9px] font-medium text-slate-500 truncate max-w-[80px]">{clientName.split(' ')[0]}</span>
            </div>

            <div className="flex items-start justify-between mb-2 pb-2 border-b border-black/5 mt-1">
                <div>
                    <h4 className={cn("font-bold text-sm", styles.text)}>{data.appointment?.pet?.name}</h4>
                    <div className="flex items-center gap-1 opacity-70 mt-0.5"><PawPrint size={10}/> <span>{data.appointment?.pet?.breed || 'Sin raza'}</span></div>
                </div>
            </div>
            
            <div className="space-y-2">
                <div className="flex justify-between items-center bg-white/40 p-1.5 rounded">
                    <div className="flex items-center gap-2"><CategoryIcon size={12} className={styles.subtext}/><span className="font-semibold uppercase tracking-tight opacity-90">{data.service?.name}</span></div>
                    <div className={cn("font-mono font-bold opacity-70", styles.text)}>{format(parseISO(data.start_time), 'HH:mm')}</div>
                </div>
                
                {data.appointment?.client?.full_name && (
                    <div className="flex items-center gap-2 opacity-70 pl-1">
                        <Users size={12}/> <span className="font-medium">{data.appointment?.client?.full_name}</span>
                    </div>
                )}
                
                {data.appointment?.notes && (
                    <div className="mt-2 p-2 bg-yellow-50/80 rounded border border-yellow-100 text-yellow-800 text-[10px] flex gap-1.5 items-start">
                        <FileText size={10} className="mt-0.5 shrink-0"/> <span className="line-clamp-3">{data.appointment?.notes}</span>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function CalendarBoard({ currentDate, view, employees, appointments = [] }: CalendarBoardProps) {
  const supabase = createClient();
  const router = useRouter();
  
  // CONFIGURACIÓN
  const START_HOUR = 10;
  const END_HOUR = 19; 
  const PIXELS_PER_MINUTE = 1.8; 
  const SNAP_MINUTES = 15; 

  // ESTADOS
  const [localAppts, setLocalAppts] = useState<any[]>(appointments);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); 
  
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // ESTADOS INTERACTIVOS (Tooltip & Familia)
  const [tooltipData, setTooltipData] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{x:number, y:number} | null>(null);
  const [hoveredClient, setHoveredClient] = useState<string | null>(null); // ID o Nombre del cliente en foco
  
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ghostRef = useRef<DragGhost | null>(null);

  useEffect(() => {
    setLocalAppts(appointments);
  }, [appointments]);

  // --- REFRESCO ---
  const handleRefresh = useCallback(async () => {
    setRefreshKey(prev => prev + 1); 
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (refreshKey === 0) return;
    const fetchFreshData = async () => {
      let startRange = startOfDay(currentDate);
      let endRange = endOfDay(currentDate);
      if (view === 'week' || view === '3day') {
         startRange = addDays(startOfDay(currentDate), -1);
         endRange = addDays(endOfDay(currentDate), 7);
      }
      const { data, error } = await supabase
        .from('appointment_services')
        .select(`*, appointment:appointments (id, notes, pet:pets (name, breed), client:clients (id, full_name)), service:services (name, category, duration_minutes)`)
        .gte('start_time', startRange.toISOString())
        .lte('end_time', endRange.toISOString());
      if (!error && data) setLocalAppts(data);
    };
    fetchFreshData();
  }, [refreshKey, currentDate, view]);

  // 1. SLOTS
  const timeSlots = useMemo(() => {
    const slots = [];
    let time = setHours(startOfDay(currentDate), START_HOUR);
    const endTime = setHours(startOfDay(currentDate), END_HOUR);
    while (time <= endTime) {
      slots.push(time);
      time = addMinutes(time, 30);
    }
    return slots;
  }, [currentDate]);

  // 2. COLUMNAS
  const columns = useMemo<ColumnData[]>(() => {
    if (view === 'day') {
      return employees.map(emp => ({
        id: emp.id,
        title: `${emp.first_name} ${emp.last_name || ''}`,
        subtitle: emp.role === 'stylist' ? 'Estilista' : 'Staff',
        type: 'employee' as const, data: emp, isToday: true
      }));
    } else {
      let daysToShow = view === '3day' ? 3 : 7;
      return Array.from({ length: daysToShow }).map((_, i) => {
        const date = addDays(currentDate, i);
        const dateId = format(date, 'yyyy-MM-dd');
        return {
          id: dateId, title: format(date, 'EEEE d', { locale: es }), subtitle: format(date, 'MMMM', { locale: es }),
          type: 'date' as const, data: date, isToday: isSameDay(date, new Date())
        };
      });
    }
  }, [view, currentDate, employees]);

  // 3. LAYOUT ENGINE (SIDE-BY-SIDE)
  const getAppointmentsForColumn = useCallback((col: ColumnData) => {
    const colAppts = localAppts.filter(appt => {
      const apptStart = parseISO(appt.start_time);
      if (view === 'day') return appt.employee_id === col.id && isSameDay(apptStart, currentDate);
      else return format(apptStart, 'yyyy-MM-dd') === col.id;
    });

    const items = colAppts.map(appt => {
      const start = parseISO(appt.start_time);
      const end = parseISO(appt.end_time);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const offsetMinutes = startMinutes - (START_HOUR * 60);
      const top = Math.max(0, offsetMinutes * PIXELS_PER_MINUTE);
      const height = Math.max(20, differenceInMinutes(end, start) * PIXELS_PER_MINUTE);
      return { ...appt, _start: start.getTime(), _end: end.getTime(), top, height };
    });

    items.sort((a, b) => a._start - b._start || (b._end - b._start) - (a._end - a._start));

    const lanes: any[][] = [];
    items.forEach(item => {
        let placed = false;
        for (let i = 0; i < lanes.length; i++) {
            const lastInLane = lanes[i][lanes[i].length - 1];
            if (lastInLane._end <= item._start) {
                lanes[i].push(item);
                item.laneIndex = i;
                placed = true;
                break;
            }
        }
        if (!placed) {
            lanes.push([item]);
            item.laneIndex = lanes.length - 1;
        }
    });

    return items.map(item => {
        const overlapping = items.filter(other => item.id !== other.id && Math.max(item._start, other._start) < Math.min(item._end, other._end));
        const maxLaneNearby = overlapping.reduce((max, curr) => Math.max(max, curr.laneIndex || 0), item.laneIndex);
        const totalCols = maxLaneNearby + 1;
        return { ...item, widthPct: 100 / totalCols, leftPct: (100 / totalCols) * item.laneIndex };
    });
  }, [localAppts, view, currentDate]);

  // 4. UPDATE DB
  const updateAppointment = async (id: string, newStart: Date, newEnd: Date, newColId?: string) => {
    try {
      let updatePayload: any = { start_time: newStart.toISOString(), end_time: newEnd.toISOString() };
      if (view === 'day' && newColId) updatePayload.employee_id = newColId;
      const { error } = await supabase.from('appointment_services').update(updatePayload).eq('id', id);
      if (error) throw error;
      toast.success("Movimiento guardado");
      handleRefresh(); 
    } catch (error: any) {
      toast.error("Error: " + error.message);
      setLocalAppts([...appointments]); 
    }
  };

  const handleApptClick = (appt: any) => {
    if (isDragging) return;
    setTooltipData(null);
    setSelectedAppt(appt);
    setIsDetailOpen(true);
  };

  // --- INTERACCIONES MOUSE (HOVER & TOOLTIP) ---
  const handleMouseEnter = (e: React.MouseEvent, appt: any) => {
      if (isDragging) return;
      
      // Activar Foco Familiar (inmediato)
      const clientId = appt.appointment?.client?.id || appt.appointment?.client?.full_name;
      if (clientId) setHoveredClient(clientId);

      // Activar Tooltip (con delay)
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = setTimeout(() => {
          setTooltipData(appt);
          setTooltipPos({ x: e.clientX, y: e.clientY });
      }, 400); 
  };

  const handleMouseLeave = () => {
      // Limpiar Foco y Tooltip
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
      setTooltipData(null);
      setHoveredClient(null);
  };

  // --- DRAG HANDLERS ---
  const handleDragStart = (e: React.DragEvent, appt: any) => {
    e.stopPropagation();
    setTooltipData(null);
    setHoveredClient(null);
    e.dataTransfer.setData("apptId", appt.id);
    e.dataTransfer.effectAllowed = "move";
    const img = new Image(); img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; 
    e.dataTransfer.setDragImage(img, 0, 0);
    setTimeout(() => setIsDragging(appt.id), 0);
  };

  const handleDragOver = (e: React.DragEvent, col: ColumnData, colIndex: number) => {
    e.preventDefault(); e.stopPropagation();
    if (!isDragging) return;
    const appt = localAppts.find(a => a.id === isDragging);
    if (!appt) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutesFromTop = Math.max(0, y / PIXELS_PER_MINUTE);
    const snappedMinutes = Math.round(minutesFromTop / SNAP_MINUTES) * SNAP_MINUTES;

    const baseDate = col.type === 'date' ? col.data : currentDate;
    const dayStart = setHours(startOfDay(baseDate), START_HOUR);
    const newStart = addMinutes(dayStart, snappedMinutes);
    const duration = differenceInMinutes(parseISO(appt.end_time), parseISO(appt.start_time));
    const newEnd = addMinutes(newStart, duration);

    const newGhostState: DragGhost = {
      apptId: appt.id, colId: col.id, colIndex, startTime: newStart, endTime: newEnd, duration,
      top: snappedMinutes * PIXELS_PER_MINUTE, height: duration * PIXELS_PER_MINUTE,
      petName: appt.appointment?.pet?.name || 'Mascota'
    };

    if (!ghostRef.current || ghostRef.current.colId !== newGhostState.colId || Math.abs(ghostRef.current.top - newGhostState.top) > 1) {
        ghostRef.current = newGhostState;
        setDragGhost(newGhostState);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    const finalGhost = ghostRef.current || dragGhost;
    if (!finalGhost) return;

    const updated = localAppts.map(a => a.id === finalGhost.apptId ? { 
      ...a, start_time: finalGhost.startTime.toISOString(), end_time: finalGhost.endTime.toISOString(),
      ...(view === 'day' && { employee_id: finalGhost.colId }) 
    } : a);
    setLocalAppts(updated);
    
    const newEmployeeId = view === 'day' ? finalGhost.colId : undefined;
    updateAppointment(finalGhost.apptId, finalGhost.startTime, finalGhost.endTime, newEmployeeId);
    
    ghostRef.current = null; setIsDragging(null); setDragGhost(null);
  };

  const handleResizeStart = (e: React.MouseEvent, appt: any, colIndex: number) => {
    e.preventDefault(); e.stopPropagation();
    setTooltipData(null);
    const startY = e.clientY;
    const startHeight = differenceInMinutes(parseISO(appt.end_time), parseISO(appt.start_time)) * PIXELS_PER_MINUTE;
    const currentColId = view === 'day' ? appt.employee_id : format(parseISO(appt.start_time), 'yyyy-MM-dd');
    const start = parseISO(appt.start_time);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const offsetMinutes = startMinutes - (START_HOUR * 60);
    const top = Math.max(0, offsetMinutes * PIXELS_PER_MINUTE);

    setIsDragging(appt.id); 

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeightRaw = startHeight + deltaY;
      const rawMinutes = newHeightRaw / PIXELS_PER_MINUTE;
      const snappedMinutes = Math.max(15, Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES);
      const calculatedHeight = snappedMinutes * PIXELS_PER_MINUTE;
      const newEnd = addMinutes(parseISO(appt.start_time), snappedMinutes);
      
      const ghostState: DragGhost = {
          apptId: appt.id, colId: currentColId, colIndex, startTime: start, endTime: newEnd, duration: snappedMinutes,
          top: top, height: calculatedHeight, petName: appt.appointment?.pet?.name
      };
      ghostRef.current = ghostState;
      setDragGhost(ghostState);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      const final = ghostRef.current;
      if(final) {
          const updated = localAppts.map(a => a.id === appt.id ? { ...a, end_time: final.endTime.toISOString() } : a);
          setLocalAppts(updated);
          updateAppointment(appt.id, final.startTime, final.endTime); 
      }
      ghostRef.current = null; setIsDragging(null); setDragGhost(null);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <>
      <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden select-none relative">
        <div className="flex border-b border-slate-200 bg-slate-50/95 sticky top-0 z-40 backdrop-blur-sm">
          <div className="w-14 shrink-0 border-r border-slate-200 bg-white/50"></div>
          <div className="flex flex-1 overflow-x-auto scrollbar-hide">
            {columns.map((col) => (
              <div key={col.id} className={cn("flex-1 min-w-[150px] border-r border-slate-200/60 p-2 flex flex-col items-center justify-center gap-1 min-h-[66px]", col.isToday && view !== 'day' ? "bg-blue-50/50" : "")}>
                {col.type === 'employee' ? (
                  <>
                    <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm" style={{ border: `2px solid ${col.data.color}` }}>
                      <AvatarImage src={col.data.avatar_url || ''} />
                      <AvatarFallback className="text-[10px] font-bold bg-slate-100">{getInitials(col.data.first_name, col.data.last_name)}</AvatarFallback>
                    </Avatar>
                    <p className="text-xs font-bold mt-1 text-slate-700">{col.data.first_name}</p>
                  </>
                ) : (
                  <div className="text-center">
                    <p className={cn("text-xs font-bold capitalize", col.isToday ? "text-blue-700" : "text-slate-700")}>{col.title}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{col.subtitle}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative bg-white" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
          <div className="absolute top-0 left-0 w-14 h-full bg-slate-50/30 border-r border-slate-100 z-10 pointer-events-none">
            {timeSlots.map((slot, i) => (
              <div key={i} style={{ height: `${30 * PIXELS_PER_MINUTE}px` }} className="flex justify-center pt-1.5 border-b border-slate-100">
                <span className="text-[10px] font-semibold text-slate-400">{format(slot, 'HH:mm')}</span>
              </div>
            ))}
          </div>

          <div className="flex ml-14 relative min-h-full">
            {dragGhost && (
              <div 
                className="absolute z-50 rounded-lg border-2 border-dashed border-blue-400 bg-blue-100/80 p-2 flex flex-col justify-center items-center text-blue-700 shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-75"
                style={{ top: `${dragGhost.top}px`, height: `${dragGhost.height}px`, left: `${(dragGhost.colIndex * (100 / columns.length))}%`, width: `${100 / columns.length}%`, marginLeft: '2px', maxWidth: 'calc(' + (100 / columns.length) + '% - 4px)' }}
              >
                  <div className="font-bold text-xs flex items-center gap-1"><Clock size={12} />{format(dragGhost.startTime, 'HH:mm')}</div>
                  <div className="text-[10px] opacity-80">{dragGhost.duration} min</div>
              </div>
            )}

            {columns.map((col, colIndex) => {
              const columnAppts = getAppointmentsForColumn(col);
              return (
                <div 
                  key={col.id} 
                  className={cn("flex-1 min-w-[150px] border-r border-slate-100 relative transition-colors", dragGhost?.colId === col.id ? "bg-blue-50/20" : "")}
                  style={{ minHeight: `${(END_HOUR - START_HOUR + 1) * 60 * PIXELS_PER_MINUTE}px` }}
                  onDragOver={(e) => handleDragOver(e, col, colIndex)} 
                >
                  {timeSlots.map((_, i) => <div key={i} style={{ height: `${30 * PIXELS_PER_MINUTE}px` }} className="border-b border-slate-50 border-dashed w-full pointer-events-none"></div>)}

                  {columnAppts.map((appt) => {
                    const isBeingDragged = isDragging === appt.id;
                    const styles = getServiceCategoryStyles(appt.service?.category);
                    const CategoryIcon = styles.icon;
                    const isMicro = appt.height < 40; 
                    const isShort = appt.height >= 40 && appt.height < 80;
                    const isTall = appt.height >= 80;

                    // LÓGICA DE GRUPO FAMILIAR
                    const clientId = appt.appointment?.client?.id || appt.appointment?.client?.full_name;
                    const clientName = appt.appointment?.client?.full_name || 'C';
                    const isFamilyHovered = hoveredClient && hoveredClient === clientId;
                    const isDimmed = hoveredClient && !isFamilyHovered; // Si hay foco y no soy familia, me apago
                    const familyColor = stringToColor(clientName); // Color único por cliente

                    return (
                      <div
                        key={appt.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, appt)}
                        onClick={(e) => { e.stopPropagation(); handleApptClick(appt); }}
                        onMouseEnter={(e) => handleMouseEnter(e, appt)}
                        onMouseLeave={handleMouseLeave}
                        className={cn(
                          "absolute rounded-lg shadow-sm border overflow-hidden group cursor-pointer select-none transition-all duration-300 ring-1 ring-white",
                          styles.container,
                          isMicro ? "flex flex-row items-center px-1" : "flex flex-col p-1.5",
                          isBeingDragged ? "opacity-30 pointer-events-none grayscale" : "opacity-100",
                          
                          // EFECTOS VISUALES DE FOCO
                          isDimmed ? "opacity-40 grayscale-[0.5] scale-[0.98]" : "hover:z-50 hover:shadow-lg",
                          isFamilyHovered ? "ring-2 ring-offset-1 z-40 scale-[1.02] shadow-md" : ""
                        )}
                        style={{ 
                            top: `${appt.top}px`, height: `${appt.height}px`, left: `${appt.leftPct}%`, width: `${appt.widthPct}%`, maxWidth: '100%', zIndex: 20,
                            // Aplicar color de familia al anillo si está en hover
                            borderColor: isFamilyHovered ? familyColor : undefined,
                            boxShadow: isFamilyHovered ? `0 4px 12px -2px ${familyColor}40` : undefined
                        }}
                      >
                        <div className={cn("absolute left-0 top-0 bottom-0 w-1", styles.accentBar)}></div>
                        
                        {/* Indicador de Familia (Puntito de color) */}
                        <div 
                            className="absolute top-1 right-1 w-2 h-2 rounded-full border border-white/50 shadow-sm z-10" 
                            style={{ backgroundColor: familyColor }}
                            title={`Familia: ${clientName}`}
                        ></div>

                        <div className={cn("pl-2 w-full overflow-hidden", isMicro ? "flex items-center gap-2" : "flex flex-col h-full")}>
                            <div className={cn("flex justify-between items-center w-full", isMicro ? "w-auto" : "")}>
                                <span className={cn("font-bold truncate leading-none", styles.text, isMicro ? "text-[10px]" : "text-[11px]")}>{appt.appointment?.pet?.name}</span>
                                {!isMicro && <span className="text-[9px] opacity-60 font-mono ml-1 shrink-0">{format(parseISO(appt.start_time), 'HH:mm')}</span>}
                            </div>
                            {!isMicro && (
                                <>
                                    {isTall && appt.appointment?.pet?.breed && <div className="text-[9px] opacity-70 truncate flex items-center gap-1 mt-0.5 leading-none"><span className="truncate">{appt.appointment?.pet?.breed}</span></div>}
                                    <div className={cn("flex items-center gap-1", isShort ? "mt-0.5" : "mt-auto")}>
                                        <CategoryIcon size={10} className={styles.subtext} />
                                        <span className={cn("font-medium uppercase tracking-tight line-clamp-1 leading-none", styles.subtext, "text-[9px]")}>{appt.service?.name}</span>
                                    </div>
                                    {isTall && appt.appointment?.client?.full_name && (
                                        <div className="text-[9px] text-slate-400 truncate flex items-center gap-1 mt-0.5 border-t border-black/5 pt-0.5"><User size={8} /> <span className="truncate">{appt.appointment?.client?.full_name.split(' ')[0]}</span></div>
                                    )}
                                </>
                            )}
                            {isMicro && <span className={cn("text-[9px] uppercase opacity-70 ml-2 truncate", styles.subtext)}>{appt.service?.name}</span>}
                        </div>
                        
                        {!isDragging && !isMicro && (
                          <div className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-black/10 flex justify-center items-end opacity-0 group-hover:opacity-100 transition-opacity z-50"
                            onMouseDown={(e) => handleResizeStart(e, appt, colIndex)} onClick={(e) => e.stopPropagation()} 
                          >
                            <div className="w-6 h-0.5 rounded-full bg-slate-400/50 mb-0.5"></div>
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

      <AppointmentTooltip data={tooltipData} position={tooltipPos} />

      <AppointmentDetailDialog 
         open={isDetailOpen} onOpenChange={setIsDetailOpen}
         appointment={selectedAppt} employees={employees} onUpdate={handleRefresh}
      />
    </>
  );
}