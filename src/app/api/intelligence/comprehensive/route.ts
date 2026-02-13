import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { subDays, startOfDay, endOfDay, format, differenceInDays, parseISO } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const supabase = await createClient();
    
    const startDate = subDays(new Date(), days);
    const endDate = new Date();

    // 1. Datos
    const { data: appointments } = await supabase.from('appointments').select('*, clients(full_name), pets(name)').gte('start_time', startOfDay(startDate).toISOString());
    const { data: clients } = await supabase.from('clients').select('*');
    const { data: transactions } = await supabase.from('sales_transactions').select('*').gte('timestamp', startOfDay(startDate).toISOString());
    
    // 2. Análisis Básico
    const appointmentAnalysis = analyzeAppointments(appointments || []);
    const clientAnalysis = analyzeClients(clients || [], transactions || []);

    // 3. GENERACIÓN DE ALERTAS (INBOX INCLUIDO)
    const alerts = await generateIntelligentAlerts({
      appointments: appointments || [],
      clients: clients || [],
      transactions: transactions || []
    });

    return NextResponse.json({
      metrics: { appointments: appointmentAnalysis, clients: clientAnalysis },
      alerts, // Aquí van las solicitudes del Inbox
    });

  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// --- FUNCIONES DE ANÁLISIS ---

async function generateIntelligentAlerts(data: any) {
  const alerts = [];
  const now = new Date();

  // >>> LÓGICA DE INBOX: DETECTAR SOLICITUDES DEL KIOSKO <<<
  const pendingRequests = data.appointments.filter((a: any) => a.status === 'request');

  if (pendingRequests.length > 0) {
    alerts.push({
      id: `inbox-${now.getTime()}`,
      type: 'appointment',
      severity: 'info', // Nivel informativo/aviso
      title: `📬 Tienes ${pendingRequests.length} solicitud(es) de cita`,
      message: 'Clientes en espera de confirmación desde el Kiosko. Revisa el calendario.',
      action: { label: 'Ver Solicitudes', url: '/appointments' },
      timestamp: now
    });
  }

  // Alerta de Citas sin confirmar (próximas 24h)
  const unconfirmed = data.appointments.filter((a: any) => 
    a.status === 'scheduled' && !a.confirmed && 
    differenceInDays(new Date(a.start_time), now) <= 1 && 
    differenceInDays(new Date(a.start_time), now) >= 0
  );

  if (unconfirmed.length > 0) {
    alerts.push({
      id: `confirm-${now.getTime()}`,
      type: 'risk',
      severity: 'warning',
      title: `${unconfirmed.length} citas próximas sin confirmar`,
      message: 'Contacta a los clientes para asegurar asistencia.',
      action: { label: 'Ver Agenda', url: '/calendar' },
      timestamp: now
    });
  }

  return alerts;
}

function analyzeAppointments(appointments: any[]) {
  const total = appointments.length;
  const completed = appointments.filter(a => a.status === 'completed').length;
  return {
    total,
    completionRate: total ? (completed / total) * 100 : 0
  };
}

function analyzeClients(clients: any[], transactions: any[]) {
  return {
    total: clients.length,
    new: clients.filter(c => differenceInDays(new Date(), new Date(c.created_at)) < 30).length
  };
}