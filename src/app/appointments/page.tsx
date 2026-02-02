'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client'; 
import CalendarBoard from '@/components/calendar/CalendarBoard';
import CalendarControls from '@/components/calendar/CalendarControls';
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog'; 
import { Loader2, Plus, Filter } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek } from 'date-fns';

export default function AppointmentsPage() {
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<'day' | '3day' | 'week' | 'month'>('day');
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  // 1. Cargar Empleados (Solo una vez)
  useEffect(() => {
    const fetchStaff = async () => {
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('active', true)
        .order('role');
      if (data) setEmployees(data);
      setLoading(false);
    };
    fetchStaff();
  }, []);

  // 2. Cargar Citas (Dinámico según fecha/vista)
  useEffect(() => {
    const fetchAppointments = async () => {
      // Definir rango de fechas según la vista
      let start = startOfDay(date);
      let end = endOfDay(date);

      if (view === '3day') {
        end = endOfDay(addDays(date, 2));
      } else if (view === 'week') {
        // Opcional: ajustar si quieres que empiece en lunes siempre
        end = endOfDay(addDays(date, 6)); 
      }

      // Consulta Maestra: Traemos el bloque de tiempo + info de mascota y servicio
      const { data, error } = await supabase
        .from('appointment_services')
        .select(`
          id, start_time, end_time, employee_id,
          service:services (name),
          appointment:appointments (
            id, status, notes,
            pet:pets (name, breed),
            client:clients (full_name)
          )
        `)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString());

      if (error) {
        console.error('Error fetching appointments:', error);
      } else {
        setAppointments(data || []);
      }
    };

    fetchAppointments();
    
    // Suscripción en tiempo real (opcional para ver cambios al instante)
    const channel = supabase
      .channel('realtime-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_services' }, fetchAppointments)
      .subscribe();

    return () => { supabase.removeChannel(channel); };

  }, [date, view]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] gap-4 p-4 animate-in fade-in">
      
      {/* HEADER SUPERIOR */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        
        {/* Controles de Navegación */}
        <CalendarControls 
          currentDate={date} 
          onDateChange={setDate} 
          view={view} 
          onViewChange={setView} 
        />

        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
           <div className="hidden xl:flex gap-3 text-[10px] text-slate-500 font-medium mr-2 border-r border-slate-100 pr-4">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#a855f7]"></div>Estilistas</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div>Terminadores</div>
           </div>
           
           <Button variant="outline" size="icon" className="h-9 w-9 text-slate-500">
             <Filter size={16} />
           </Button>
           
           <NewAppointmentDialog />
        </div>
      </div>

      {/* EL TABLERO */}
      <div className="flex-1 min-h-0 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden relative">
         <CalendarBoard 
           currentDate={date}
           view={view}
           employees={employees}
           appointments={appointments} // Pasamos la data real
         />
      </div>
    </div>
  );
}