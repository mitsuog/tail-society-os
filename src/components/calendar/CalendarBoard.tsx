'use client';

import { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  format, addMinutes, startOfDay, setHours, addDays, isSameDay, 
  differenceInMinutes, parseISO, startOfHour 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Scissors, Droplets, Wind, GripHorizontal, MoreVertical, Trash2, Edit, Clock } from 'lucide-react';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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
  startTime: Date;
  endTime: Date;
  duration: number;
  top: number;
  height: number;
  petName: string;
}

// --- Helpers ---
const getInitials = (first: string, last?: string) => {
  return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
};

export default function CalendarBoard({ currentDate, view, employees, appointments = [] }: CalendarBoardProps) {
  const supabase = createClient();
  const START_HOUR = 10;
  const END_HOUR = 19; 
  const PIXELS_PER_MINUTE = 1.8; 
  const SNAP_MINUTES = 15; 

  const [localAppts, setLocalAppts] = useState<any[]>(appointments);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);

  useEffect(() => {
    setLocalAppts(appointments);
  }, [appointments]);

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

  const columns = useMemo<ColumnData[]>(() => {
    if (view === 'day') {
      return employees.map(emp => ({
        id: emp.id,
        title: `${emp.first_name} ${emp.last_name || ''}`,
        subtitle: emp.role === 'stylist' ? 'Estilista' : 'Staff',
        type: 'employee' as const,
        data: emp,
        isToday: true
      }));
    } else {
      let daysToShow = view === '3day' ? 3 : 7;
      return Array.from({ length: daysToShow }).map((_, i) => {
        const date = addDays(currentDate, i);
        return {
          id: date.toISOString(), // Usamos el ISO como ID para persistir la fecha en el drop
          title: format(date, 'EEEE d', { locale: es }),
          subtitle: format(date, 'MMMM', { locale: es }),
          type: 'date' as const,
          data: date,
          isToday: isSameDay(date, new Date())
        };
      });
    }
  }, [view, currentDate, employees]);

  // --- Lógica de Posicionamiento ---
  const getAppointmentsForColumn = (col: ColumnData) => {
    const filtered = localAppts.filter(appt => {
      const apptDate = parseISO(appt.start_time);
      if (view === 'day') {
        return appt.employee_id === col.id && isSameDay(apptDate, currentDate);
      } else {
        return isSameDay(apptDate, col.data as Date);
      }
    });

    return filtered.map(appt => {
      const start = parseISO(appt.start_time);
      const end = parseISO(appt.end_time);
      const dayStart = setHours(startOfDay(start), START_HOUR);
      
      const top = Math.max(0, differenceInMinutes(start, dayStart) * PIXELS_PER_MINUTE);
      const height = differenceInMinutes(end, start) * PIXELS_PER_MINUTE;

      return {
        ...appt,
        top,
        height,
        colIndex: 0, // Simplificado
        totalCols: 1  // Simplificado
      };
    });
  };

  // --- Base de Datos ---
  const updateAppointment = async (id: string, newStart: Date, newEnd: Date, newColId?: string) => {
    try {
      let updatePayload: any = {
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
      };

      if (view === 'day' && newColId) {
        const emp = employees.find(e => e.id === newColId);
        const appt = localAppts.find(a => a.id === id);
        if (appt?.service?.name.toLowerCase().includes('corte') && emp?.role !== 'stylist') {
          toast.error("Solo los estilistas pueden realizar cortes.");
          setLocalAppts([...appointments]); 
          return;
        }
        updatePayload.employee_id = newColId;
      }

      const { error } = await supabase.from('appointment_services')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;
      toast.success("Agenda actualizada");
    } catch (error: any) {
      toast.error("Error al actualizar: " + error.message);
      setLocalAppts([...appointments]);
    }
  };

  // --- Handlers de Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, appt: any) => {
    e.dataTransfer.setData("apptId", appt.id);
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; 
    e.dataTransfer.setDragImage(img, 0, 0);
    setIsDragging(appt.id);
  };

  const handleDragOver = (e: React.DragEvent, col: ColumnData) => {
    e.preventDefault();
    if (!isDragging) return;

    const appt = localAppts.find(a => a.id === isDragging);
    if (!appt) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutesFromTop = Math.max(0, y / PIXELS_PER_MINUTE);
    const snappedMinutes = Math.round(minutesFromTop / SNAP_MINUTES) * SNAP_MINUTES;

    // Detectar la fecha base: si es vista multi-día usamos el ID de la columna (ISOString)
    const baseDate = col.type === 'date' ? new Date(col.id) : currentDate;
    const dayStart = setHours(startOfDay(baseDate), START_HOUR);
    const newStart = addMinutes(dayStart, snappedMinutes);
    
    const duration = differenceInMinutes(parseISO(appt.end_time), parseISO(appt.start_time));
    const newEnd = addMinutes(newStart, duration);

    setDragGhost({
      apptId: appt.id,
      colId: col.id,
      startTime: newStart,
      endTime: newEnd,
      duration,
      top: snappedMinutes * PIXELS_PER_MINUTE,
      height: duration * PIXELS_PER_MINUTE,
      petName: appt.appointment?.pet?.name || 'Mascota'
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragGhost) {
      const updated = localAppts.map(a => a.id === dragGhost.apptId ? { 
        ...a, 
        start_time: dragGhost.startTime.toISOString(), 
        end_time: dragGhost.endTime.toISOString(),
        ...(view === 'day' && { employee_id: dragGhost.colId })
      } : a);
      
      setLocalAppts(updated);
      updateAppointment(dragGhost.apptId, dragGhost.startTime, dragGhost.endTime, dragGhost.colId);
    }
    setIsDragging(null);
    setDragGhost(null);
  };

  const handleDragEnd = () => {
    setIsDragging(null);
    setDragGhost(null);
  };

  const handleResizeStart = (e: React.MouseEvent, appt: any) => {
    e.preventDefault();
    e.stopPropagation();
    // Lógica de resize se puede implementar aquí
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden select-none relative">
      {/* HEADER */}
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
                  <div className="text-center leading-none">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[130px]">{col.data.first_name} {col.data.last_name}</p>
                    <span className="text-[9px] text-slate-400 uppercase tracking-tight">{col.subtitle}</span>
                  </div>
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

      {/* BODY */}
      <div className="flex-1 overflow-y-auto relative bg-white" onDragLeave={() => setDragGhost(null)}>
        {/* Marcadores de Tiempo */}
        <div className="absolute top-0 left-0 w-14 h-full bg-slate-50/30 border-r border-slate-100 z-10 pointer-events-none">
          {timeSlots.map((slot, i) => (
            <div key={i} style={{ height: `${30 * PIXELS_PER_MINUTE}px` }} className="flex justify-center pt-1.5 border-b border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400">{format(slot, 'HH:mm')}</span>
            </div>
          ))}
        </div>

        {/* Grid de Columnas */}
        <div className="flex ml-14 relative min-h-full">
          {columns.map((col) => {
            const columnAppts = getAppointmentsForColumn(col);
            return (
              <div 
                key={col.id} 
                className="flex-1 min-w-[150px] border-r border-slate-100 relative"
                style={{ minHeight: `${(END_HOUR - START_HOUR + 1) * 60 * PIXELS_PER_MINUTE}px` }}
                onDragOver={(e) => handleDragOver(e, col)}
                onDrop={handleDrop}
              >
                {/* Líneas de fondo */}
                {timeSlots.map((_, i) => (
                  <div key={i} style={{ height: `${30 * PIXELS_PER_MINUTE}px` }} className="border-b border-slate-50 border-dashed w-full pointer-events-none"></div>
                ))}

                {/* Sombra de arrastre (Ghost) */}
                {dragGhost && dragGhost.colId === col.id && (
                  <div 
                    className="absolute left-1 right-1 z-50 rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/80 p-2 flex flex-col justify-center items-center text-blue-700 shadow-xl pointer-events-none"
                    style={{ top: `${dragGhost.top}px`, height: `${dragGhost.height}px` }}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                       <Clock size={12} />
                       {format(dragGhost.startTime, 'HH:mm')} - {format(dragGhost.endTime, 'HH:mm')}
                    </div>
                    <div className="text-[10px] font-medium opacity-80">{dragGhost.duration} min</div>
                  </div>
                )}

                {/* Citas Reales */}
                {columnAppts.map((appt) => {
                  const isBeingDragged = isDragging === appt.id;
                  return (
                    <div
                      key={appt.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, appt)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "absolute rounded-md p-1.5 text-[10px] z-20 shadow-sm hover:shadow-lg transition-all border flex flex-col overflow-hidden hover:z-30 group cursor-move",
                        "bg-purple-50 border-purple-200 text-purple-900",
                        isBeingDragged && "opacity-0"
                      )}
                      style={{
                        top: `${appt.top}px`,
                        height: `${appt.height}px`,
                        left: `${(100 / appt.totalCols) * appt.colIndex}%`,
                        width: `${100 / appt.totalCols}%`,
                      }}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-400"></div>
                      <div className="font-bold truncate">{appt.appointment?.pet?.name}</div>
                      <div className="text-[9px] opacity-70 truncate">{appt.service?.name}</div>
                      
                      <div 
                        className="absolute bottom-0 left-0 right-0 h-3 cursor-s-resize flex items-end justify-center opacity-0 group-hover:opacity-100"
                        onMouseDown={(e) => handleResizeStart(e, appt)}
                      >
                        <GripHorizontal size={12} className="text-purple-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}