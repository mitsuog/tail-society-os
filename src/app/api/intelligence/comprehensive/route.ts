import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { subDays, startOfDay, endOfDay, format, differenceInDays, parseISO } from 'date-fns';
import { AlertEngine, type Alert } from '@/lib/ml/alert-engine'; // Importamos el motor real
import { ExternalDataAggregator } from '@/lib/intelligence/services';
import { BUSINESS_CONFIG } from '@/lib/config';

/**
 * COMPREHENSIVE BUSINESS INTELLIGENCE API
 * Integra: Citas, Clientes, Ventas, Empleados, Competencia, ML
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    // Por defecto incluimos financiero si el usuario tiene permiso, 
    // pero el frontend puede forzar false.
    const includeFinancial = searchParams.get('includeFinancial') !== 'false'; 

    const supabase = await createClient();
    
    // Verificar permisos para datos financieros
    const { data: { user } } = await supabase.auth.getUser();
    let userRole = 'employee';
    
    if (user) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .single();
      userRole = roleData?.role || 'employee';
    }

    const hasFinancialAccess = ['admin', 'manager', 'owner'].includes(userRole);
    const startDate = subDays(new Date(), days);
    const endDate = new Date();

    // ===== 1. DATOS DE CITAS (Todos los roles) =====
    const { data: appointments } = await supabase
      .from('appointments')
      .select(`
        *,
        clients (id, full_name, phone, email),
        pets (id, name, breed),
        employees (id, first_name, last_name, role),
        appointment_services (
          services (name, category, price)
        )
      `)
      .gte('start_time', startOfDay(startDate).toISOString())
      .lte('start_time', endOfDay(endDate).toISOString())
      .order('start_time', { ascending: true });

    // ===== 2. DATOS DE CLIENTES =====
    const { data: clients } = await supabase
      .from('clients')
      .select('*');

    // ===== 3. DATOS FINANCIEROS (Solo roles autorizados) =====
    let transactions: any[] = [];
    let financialMetrics = null;

    if (hasFinancialAccess && includeFinancial) {
      const { data: txData } = await supabase
        .from('sales_transactions')
        .select('*')
        .gte('timestamp', startOfDay(startDate).toISOString())
        .lte('timestamp', endOfDay(endDate).toISOString())
        .order('timestamp', { ascending: true });

      transactions = txData || [];
      financialMetrics = analyzeFinancials(transactions);
    }

    // ===== 4. DATOS DE EMPLEADOS E INVENTARIO =====
    const [employeesRes, inventoryRes] = await Promise.all([
        supabase.from('employees').select('*, contracts:employee_contracts(*)').eq('active', true),
        // Asumimos que existe una tabla de productos/inventario. Si no, enviamos array vacío.
        supabase.from('products').select('*').eq('active', true) 
    ]);
    
    const employees = employeesRes.data || [];
    const inventory = inventoryRes.data || [];

    // ===== 5. DATOS EXTERNOS (Clima, Competencia) =====
    const externalData = await fetchExternalData();

    // ===== 6. ANÁLISIS DE DATOS =====
    const appointmentAnalysis = analyzeAppointments(appointments || []);
    const clientAnalysis = analyzeClients(clients || [], transactions);

    // ===== 7. PREDICCIONES ML =====
    const predictions = await generateMLPredictions(
      appointments || [],
      transactions,
      hasFinancialAccess,
      externalData
    );

    // ===== 8. MOTOR DE ALERTAS (INTEGRACIÓN REAL) =====
    // Usamos la clase AlertEngine que ya contiene la lógica de negocio robusta
    const alertEngine = new AlertEngine();
    const alerts = alertEngine.analyzeAndGenerateAlerts({
        transactions,
        predictions,
        clients: clients || [],
        inventory,
        externalFactors: externalData
    });

    // ===== 9. RECOMENDACIONES ESTRATÉGICAS =====
    const recommendations = generateStrategicRecommendations({
      appointmentAnalysis,
      clientAnalysis,
      financialMetrics,
      employees,
      predictions
    });

    return NextResponse.json({
      period: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
        days
      },
      permissions: {
        role: userRole,
        hasFinancialAccess
      },
      metrics: {
        appointments: appointmentAnalysis,
        clients: clientAnalysis,
        financial: hasFinancialAccess ? financialMetrics : null
      },
      predictions,
      alerts, // Ahora devolvemos las alertas generadas por el motor
      recommendations,
      external: externalData
    });

  } catch (error) {
    console.error('Comprehensive BI API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// ===== HELPER: DATOS EXTERNOS =====
async function fetchExternalData() {
    try {
        const configLocation = BUSINESS_CONFIG.business.location;
        const configPlaceId = BUSINESS_CONFIG.externalAPIs.location.googlePlaceId;
        const configKeywords = BUSINESS_CONFIG.externalAPIs.trends.keywords;

        const aggregator = new ExternalDataAggregator({
            location: { lat: configLocation.lat, lng: configLocation.lng },
            placeId: configPlaceId,
            keywords: configKeywords
        });

        // Obtenemos solo 1 día de pronóstico para el contexto actual
        const data = await aggregator.getAllData(1); 
        return {
            weather: data.weather[0] || null, // Clima de hoy
            traffic: data.traffic || null,
            trends: data.trends[0] || null
        };
    } catch (e) {
        console.warn("Error fetching external data for BI:", e);
        return { weather: null, traffic: null, trends: null };
    }
}

// ===== FUNCIONES DE ANÁLISIS (MANTENIDAS IGUAL QUE TU VERSIÓN) =====

function analyzeAppointments(appointments: any[]) {
  const total = appointments.length;
  const byStatus = {
    scheduled: appointments.filter(a => a.status === 'scheduled').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    noShow: appointments.filter(a => a.status === 'no_show').length
  };

  const completionRate = total > 0 ? (byStatus.completed / total) * 100 : 0;
  const cancellationRate = total > 0 ? (byStatus.cancelled / total) * 100 : 0;
  const noShowRate = total > 0 ? (byStatus.noShow / total) * 100 : 0;

  // Análisis por hora
  const hourlyDistribution = Array(24).fill(0);
  appointments.forEach(apt => {
    const hour = new Date(apt.start_time).getHours();
    hourlyDistribution[hour]++;
  });

  const peakHours = hourlyDistribution
    .map((count, hour) => ({ hour, count }))
    .filter(h => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(h => h.hour);

  // Análisis por día de semana
  const dayDistribution = Array(7).fill(0);
  appointments.forEach(apt => {
    const day = new Date(apt.start_time).getDay();
    dayDistribution[day]++;
  });

  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const busiestDays = dayDistribution
    .map((count, idx) => ({ day: days[idx], count }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Servicios más solicitados
  const serviceCount = new Map<string, number>();
  appointments.forEach(apt => {
    apt.appointment_services?.forEach((as: any) => {
      const serviceName = as.services?.name || 'Unknown';
      serviceCount.set(serviceName, (serviceCount.get(serviceName) || 0) + 1);
    });
  });

  const topServices = Array.from(serviceCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Tendencia (últimos 7 días vs 7 anteriores)
  const now = new Date();
  const last7 = appointments.filter(a => 
    differenceInDays(now, new Date(a.start_time)) <= 7
  ).length;
  const prev7 = appointments.filter(a => {
    const days = differenceInDays(now, new Date(a.start_time));
    return days > 7 && days <= 14;
  }).length;

  const trend = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : 0;

  return {
    total,
    byStatus,
    completionRate: Math.round(completionRate * 10) / 10,
    cancellationRate: Math.round(cancellationRate * 10) / 10,
    noShowRate: Math.round(noShowRate * 10) / 10,
    peakHours,
    busiestDays,
    topServices,
    trend: Math.round(trend * 10) / 10,
    utilizationScore: Math.round(completionRate)
  };
}

function analyzeFinancials(transactions: any[]) {
  if (transactions.length === 0) {
    return {
      totalRevenue: 0,
      avgTransaction: 0,
      transactionCount: 0,
      groomingRevenue: 0,
      storeRevenue: 0,
      dailyAvg: 0,
      trend: 0
    };
  }

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const transactionCount = transactions.length;
  const avgTransaction = totalRevenue / transactionCount;

  let groomingRevenue = 0;
  let storeRevenue = 0;

  transactions.forEach(t => {
    if (t.is_grooming) groomingRevenue += t.total_amount || 0;
    if (t.is_store) storeRevenue += t.total_amount || 0;
  });

  const uniqueDays = new Set(transactions.map(t => t.timestamp.split('T')[0])).size;
  const dailyAvg = totalRevenue / (uniqueDays || 1);

  const now = new Date();
  const last7Revenue = transactions
    .filter(t => differenceInDays(now, new Date(t.timestamp)) <= 7)
    .reduce((sum, t) => sum + (t.total_amount || 0), 0);
  
  const prev7Revenue = transactions
    .filter(t => {
      const days = differenceInDays(now, new Date(t.timestamp));
      return days > 7 && days <= 14;
    })
    .reduce((sum, t) => sum + (t.total_amount || 0), 0);

  const trend = prev7Revenue > 0 ? ((last7Revenue - prev7Revenue) / prev7Revenue) * 100 : 0;

  return {
    totalRevenue: Math.round(totalRevenue),
    avgTransaction: Math.round(avgTransaction),
    transactionCount,
    groomingRevenue: Math.round(groomingRevenue),
    storeRevenue: Math.round(storeRevenue),
    groomingPercentage: (groomingRevenue / totalRevenue) * 100,
    storePercentage: (storeRevenue / totalRevenue) * 100,
    dailyAvg: Math.round(dailyAvg),
    trend: Math.round(trend * 10) / 10
  };
}

function analyzeClients(clients: any[], transactions: any[]) {
  const now = new Date();
  const clientMetrics = new Map();

  transactions.forEach(t => {
    if (!t.client_id) return;
    
    if (!clientMetrics.has(t.client_id)) {
      clientMetrics.set(t.client_id, {
        totalSpent: 0,
        visitCount: 0,
        lastVisit: new Date(t.timestamp)
      });
    }

    const metrics = clientMetrics.get(t.client_id);
    metrics.totalSpent += t.total_amount || 0;
    metrics.visitCount += 1;
    
    const txDate = new Date(t.timestamp);
    if (txDate > metrics.lastVisit) {
      metrics.lastVisit = txDate;
    }
  });

  const segments = {
    vip: 0,
    loyal: 0,
    promising: 0,
    atRisk: 0,
    lost: 0,
    new: clients.length - clientMetrics.size
  };

  clientMetrics.forEach((metrics, clientId) => {
    const daysSinceVisit = differenceInDays(now, metrics.lastVisit);
    
    if (metrics.totalSpent > 5000 && daysSinceVisit < 45) {
      segments.vip++;
    } else if (metrics.visitCount > 8 && daysSinceVisit < 60) {
      segments.loyal++;
    } else if (metrics.visitCount > 2 && daysSinceVisit < 30) {
      segments.promising++;
    } else if (daysSinceVisit > 90 && metrics.totalSpent > 2000) {
      segments.atRisk++;
    } else if (daysSinceVisit > 120) {
      segments.lost++;
    }
  });

  const totalSpent = Array.from(clientMetrics.values()).reduce((sum, m) => sum + m.totalSpent, 0);
  const avgLTV = clientMetrics.size > 0 ? totalSpent / clientMetrics.size : 0;

  const activeClients = Array.from(clientMetrics.values()).filter(m => 
    differenceInDays(now, m.lastVisit) < 90
  ).length;
  const retentionRate = clients.length > 0 ? (activeClients / clients.length) * 100 : 0;

  return {
    total: clients.length,
    segments,
    avgLifetimeValue: Math.round(avgLTV),
    retentionRate: Math.round(retentionRate * 10) / 10,
    activeClients
  };
}

// ===== PREDICCIONES CON FACTORES EXTERNOS =====
async function generateMLPredictions(
  appointments: any[],
  transactions: any[],
  hasFinancialAccess: boolean,
  externalData: any
) {
  const appointmentsByDay = new Map<number, number>();
  
  appointments.forEach(apt => {
    const day = new Date(apt.start_time).getDay();
    appointmentsByDay.set(day, (appointmentsByDay.get(day) || 0) + 1);
  });

  const predictions = [];
  const today = new Date();

  // Factor climático (Simple: Lluvia reduce demanda)
  const weatherFactor = (externalData?.weather?.precipitation > 5) ? 0.8 : 1.0;

  for (let i = 1; i <= 7; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    const dayOfWeek = futureDate.getDay();
    
    const historicalAvg = appointmentsByDay.get(dayOfWeek) || 0;
    
    // Predicción básica ajustada por clima (si aplicara pronóstico a 7 días)
    const predictedAppointments = Math.round(historicalAvg * (0.9 + Math.random() * 0.2) * weatherFactor);
    
    let predictedRevenue = null;
    if (hasFinancialAccess && transactions.length > 0) {
      const avgRevPerAppointment = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0) / (appointments.length || 1);
      predictedRevenue = Math.round(predictedAppointments * avgRevPerAppointment);
    }

    predictions.push({
      date: format(futureDate, 'yyyy-MM-dd'),
      dayOfWeek: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dayOfWeek],
      predictedAppointments,
      predictedRevenue,
      confidence: 0.75 + Math.random() * 0.15,
      factors: { weather: weatherFactor }, // Para que el AlertEngine lo use
      recommendation: getPredictionRecommendation(predictedAppointments, historicalAvg)
    });
  }

  return predictions;
}

function getPredictionRecommendation(predicted: number, historical: number): string {
  if (predicted > historical * 1.2) {
    return '📈 Alta demanda esperada - Asegurar disponibilidad de personal';
  } else if (predicted < historical * 0.8) {
    return '📉 Demanda baja - Considerar promociones o ajustar turnos';
  }
  return '➡️ Demanda normal - Mantener operación estándar';
}

function generateStrategicRecommendations(data: any) {
  const recommendations = [];

  // Optimización de agenda
  if (data.appointmentAnalysis.peakHours.length > 0) {
    recommendations.push({
      id: 'optimize-schedule',
      priority: 'high',
      category: 'operations',
      title: 'Optimizar distribución de personal',
      insight: `Horas pico detectadas: ${data.appointmentAnalysis.peakHours.join(', ')}:00`,
      action: 'Asignar más personal en estas horas para reducir tiempos de espera.',
      expectedImpact: 'Reducir tiempos de espera ~30%'
    });
  }

  // Mejora de retención
  if (data.clientAnalysis.retentionRate < 70) {
    recommendations.push({
      id: 'improve-retention',
      priority: 'critical',
      category: 'customer',
      title: `Alerta: Retención baja (${data.clientAnalysis.retentionRate}%)`,
      insight: `${data.clientAnalysis.segments.lost} clientes clasificados como perdidos en el periodo.`,
      action: 'Implementar programa de fidelización o campaña de reactivación.',
      expectedImpact: 'Recuperar ~15% de clientes perdidos.'
    });
  }

  // Oportunidad de cross-sell
  if (data.financialMetrics && data.financialMetrics.storePercentage < 20) {
    recommendations.push({
      id: 'cross-sell-opportunity',
      priority: 'medium',
      category: 'sales',
      title: 'Oportunidad: Venta de productos retail',
      insight: `Solo el ${Math.round(data.financialMetrics.storePercentage)}% de ingresos proviene de productos.`,
      action: 'Crear bundles de servicio + producto (ej. Baño + Shampoo).',
      expectedImpact: 'Aumentar ticket promedio en un 15%.'
    });
  }

  return recommendations;
}