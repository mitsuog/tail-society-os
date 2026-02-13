// src/lib/intelligence/realtime-alerts.ts
import { createClient } from '@/utils/supabase/client';

export class RealtimeAlertSystem {
  private supabase = createClient();
  private subscriptions: any[] = [];

  /**
   * Suscribirse a cambios en citas en tiempo real
   */
  subscribeToAppointmentChanges(callback: (alert: any) => void) {
    const channel = this.supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          // Generar alerta según el tipo de cambio
          if (payload.eventType === 'INSERT') {
            callback({
              type: 'appointment',
              severity: 'info',
              title: '📅 Nueva cita agendada',
              message: `Cita creada para ${new Date(payload.new.start_time).toLocaleString()}`,
              timestamp: new Date()
            });
          } else if (payload.eventType === 'UPDATE') {
            if (payload.old.status !== payload.new.status) {
              callback({
                type: 'appointment',
                severity: payload.new.status === 'cancelled' ? 'warning' : 'info',
                title: `Cambio de estado: ${payload.new.status}`,
                message: `Cita actualizada`,
                timestamp: new Date()
              });
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.push(channel);
  }

  /**
   * Desuscribirse de todas las suscripciones
   */
  unsubscribeAll() {
    this.subscriptions.forEach(sub => {
      this.supabase.removeChannel(sub);
    });
    this.subscriptions = [];
  }
}