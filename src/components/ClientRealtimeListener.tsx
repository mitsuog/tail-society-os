'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from "sonner";

export default function ClientRealtimeListener({ clientId }: { clientId: string }) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Suscribirse a cambios en la tabla 'pets' para este cliente específico
    const channel = supabase
      .channel(`client-watch-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Solo nos interesa si actualizan (ej. la firma)
          schema: 'public',
          table: 'pets',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          // Si detectamos que firmaron (waiver_signed cambió a true)
          if (payload.new.waiver_signed === true && payload.old.waiver_signed === false) {
             toast.success("¡Firma recibida! Actualizando perfil...");
          }
          
          // Refrescamos la data del servidor automáticamente
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, router, supabase]);

  return null; // Es invisible
}