'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CalendarRealtimeListener() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Suscribirse a cambios en la tabla 'appointments'
    const channel = supabase
      .channel('realtime-calendar')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar INSERT, UPDATE y DELETE
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          console.log('Cambio en agenda detectado:', payload);

          // 1. Notificación de NUEVA CITA
          if (payload.eventType === 'INSERT') {
            const date = new Date(payload.new.date);
            const dateStr = format(date, "d 'de' MMMM", { locale: es });
            const timeStr = format(date, "h:mm a");

            toast.success('📅 Nueva Cita Agendada', {
              description: `Se agregó una cita para el ${dateStr} a las ${timeStr}.`,
              duration: 5000,
            });
          } 
          
          // 2. Notificación de ACTUALIZACIÓN
          else if (payload.eventType === 'UPDATE') {
            // Puedes filtrar aquí si quieres ignorar cambios menores
            toast.info('✏️ Agenda Actualizada', {
              description: 'Se han modificado los detalles de una cita.',
              duration: 4000,
            });
          } 
          
          // 3. Notificación de ELIMINACIÓN
          else if (payload.eventType === 'DELETE') {
            toast.warning('🗑️ Cita Eliminada', {
              description: 'Se ha cancelado/removido una cita de la agenda.',
              duration: 4000,
            });
          }

          // 4. Actualizar la vista (importante para que aparezca/desaparezca del calendario sin recargar F5)
          router.refresh();
        }
      )
      .subscribe();

    // Limpieza al desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  // Este componente no renderiza nada visualmente
  return null;
}