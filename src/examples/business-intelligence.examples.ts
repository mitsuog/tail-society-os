// ==========================================
// EJEMPLOS DE USO - SISTEMA DE BI
// ==========================================

import { 
  MultiFactorPredictor, 
  RecommendationEngine 
} from '@/lib/ml/business-intelligence';
import { 
  ExternalDataAggregator, 
  WeatherService 
} from '@/lib/ml/external-data';
import { 
  AlertEngine, 
  NotificationService 
} from '@/lib/ml/alert-engine';
import { BUSINESS_CONFIG } from '@/config/business-intelligence.config';

// ==========================================
// EJEMPLO 1: Predicción Simple de Ventas
// ==========================================

async function ejemplo1_PrediccionSimple() {
  console.log('📊 EJEMPLO 1: Predicción de Ventas para los Próximos 7 Días');
  console.log('─'.repeat(60));

  // 1. Obtener datos históricos (últimos 30 días)
  const historicalData = await fetch('/api/sales/history?days=30')
    .then(r => r.json());

  // 2. Obtener factores externos
  const externalData = await fetch('/api/intelligence/external-data?days=7')
    .then(r => r.json());

  // 3. Crear y entrenar predictor
  const predictor = new MultiFactorPredictor();
  
  console.log('🔄 Entrenando modelo...');
  await predictor.train(historicalData, externalData.data.weather);
  
  // 4. Generar predicciones
  const lastDate = new Date(historicalData[historicalData.length - 1].date);
  const predictions = await predictor.predict(
    lastDate, 
    7, 
    externalData.data.weather
  );

  // 5. Mostrar resultados
  console.log('\n✅ Predicciones generadas:\n');
  predictions.forEach(pred => {
    console.log(`📅 ${pred.date}:`);
    console.log(`   💰 Ingresos estimados: $${Math.round(pred.predictedRevenue).toLocaleString()}`);
    console.log(`   🎯 Confianza: ${Math.round(pred.confidence * 100)}%`);
    console.log(`   💡 ${pred.recommendation}\n`);
  });

  return predictions;
}

// ==========================================
// EJEMPLO 2: Análisis de Oportunidad de Negocio
// ==========================================

async function ejemplo2_AnalisisOportunidad() {
  console.log('🎯 EJEMPLO 2: Score de Oportunidad para Hoy');
  console.log('─'.repeat(60));

  // 1. Configurar agregador
  const aggregator = new ExternalDataAggregator({
    location: BUSINESS_CONFIG.business.location,
    placeId: process.env.GOOGLE_PLACE_ID || '',
    keyword: 'estética canina monterrey'
  });

  // 2. Obtener datos
  const data = await aggregator.getAllData(1);

  // 3. Calcular score
  const todayWeather = data.weather[0];
  const todayTrends = data.trends[0];
  const trafficData = {
    date: new Date().toISOString().split('T')[0], // Add date property
    level: 'medium' as const,
    delay_minutes: 5,
    incidents: 0
  };

  const score = aggregator.calculateBusinessOpportunityScore(
    todayWeather,
    trafficData,
    todayTrends,
    data.insights
  );

  // 4. Mostrar análisis
  console.log(`\n🌟 Score Total: ${score.score}/100`);
  console.log('\n📊 Desglose por Factor:');
  console.log(`   ☁️ Clima: ${score.factors.weather}/100`);
  console.log(`   🚗 Tráfico: ${score.factors.traffic}/100`);
  console.log(`   📈 Tendencias: ${score.factors.trends}/100`);
  console.log(`   📍 Ubicación: ${score.factors.location}/100`);
  console.log(`\n💡 Recomendación: ${score.recommendation}`);

  return score;
}

// ==========================================
// EJEMPLO 3: Sistema de Alertas Completo
// ==========================================

async function ejemplo3_SistemaAlertas() {
  console.log('🚨 EJEMPLO 3: Generación y Gestión de Alertas');
  console.log('─'.repeat(60));

  // 1. Crear motor de alertas
  const alertEngine = new AlertEngine();
  const notifier = new NotificationService();

  // 2. Cargar datos del negocio
  const transactions = await fetch('/api/sales/transactions').then(r => r.json());
  const clients = await fetch('/api/clients').then(r => r.json());
  const inventory = await fetch('/api/inventory').then(r => r.json());
  const predictions = await fetch('/api/intelligence/predictions').then(r => r.json());

  // 3. Generar alertas
  console.log('\n🔍 Analizando datos...');
  const alerts = alertEngine.analyzeAndGenerateAlerts({
    transactions,
    predictions,
    clients,
    inventory,
    externalFactors: {}
  });

  // 4. Suscribirse a nuevas alertas
  alertEngine.subscribe((alert) => {
    console.log(`\n🔔 Nueva alerta: ${alert.title}`);
    
    // Notificar según severidad
    if (alert.severity === 'critical') {
      notifier.sendBrowserNotification(alert);
      // notifier.sendSMSNotification(alert, '+52XXXXXXXXXX');
    }
  });

  // 5. Mostrar resumen
  console.log(`\n✅ Total de alertas: ${alerts.length}`);
  console.log(`   🔴 Críticas: ${alerts.filter(a => a.severity === 'critical').length}`);
  console.log(`   🟠 Advertencias: ${alerts.filter(a => a.severity === 'warning').length}`);
  console.log(`   🔵 Informativas: ${alerts.filter(a => a.severity === 'info').length}`);

  // 6. Mostrar alertas críticas
  const critical = alerts.filter(a => a.severity === 'critical');
  if (critical.length > 0) {
    console.log('\n🚨 ALERTAS CRÍTICAS:\n');
    critical.forEach(alert => {
      console.log(`   ${alert.title}`);
      console.log(`   ${alert.message}`);
      console.log(`   ➡️ ${alert.action?.label}\n`);
    });
  }

  return alerts;
}

// ==========================================
// EJEMPLO 4: Recomendaciones Personalizadas
// ==========================================

async function ejemplo4_RecomendacionesPersonalizadas() {
  console.log('💡 EJEMPLO 4: Motor de Recomendaciones');
  console.log('─'.repeat(60));

  // 1. Cargar datos
  const transactions = await fetch('/api/sales/transactions').then(r => r.json());
  const clients = await fetch('/api/clients').then(r => r.json());
  const inventory = await fetch('/api/inventory').then(r => r.json());
  const employees = await fetch('/api/employees').then(r => r.json());
  const predictions = await fetch('/api/intelligence/predictions').then(r => r.json());

  // 2. Generar recomendaciones
  const engine = new RecommendationEngine();
  const recommendations = engine.generateRecommendations(
    transactions,
    clients,
    inventory,
    employees,
    predictions
  );

  // 3. Filtrar por prioridad
  const highPriority = recommendations.filter(
    r => r.priority === 'critical' || r.priority === 'high'
  );

  // 4. Mostrar recomendaciones
  console.log(`\n✅ Total: ${recommendations.length} recomendaciones`);
  console.log(`\n🎯 Top 5 Recomendaciones de Alta Prioridad:\n`);

  highPriority.slice(0, 5).forEach((rec, idx) => {
    console.log(`${idx + 1}. ${rec.title}`);
    console.log(`   📝 ${rec.description}`);
    console.log(`   💥 Impacto: ${rec.impact}`);
    console.log(`   ✅ Acción: ${rec.action}`);
    console.log(`   📊 Confianza: ${Math.round(rec.confidence * 100)}%`);
    if (rec.expectedROI) {
      console.log(`   💰 ROI Esperado: $${rec.expectedROI.toLocaleString()}`);
    }
    console.log('');
  });

  return recommendations;
}

// ==========================================
// EJEMPLO 5: Análisis Completo Diario
// ==========================================

async function ejemplo5_AnalisisDiario() {
  console.log('📊 EJEMPLO 5: Análisis Completo de Inteligencia de Negocios');
  console.log('='.repeat(60));

  try {
    // 1. Score de Oportunidad
    console.log('\n1️⃣ Calculando Score de Oportunidad...');
    const score = await ejemplo2_AnalisisOportunidad();

    // 2. Predicciones
    console.log('\n2️⃣ Generando Predicciones...');
    const predictions = await ejemplo1_PrediccionSimple();

    // 3. Recomendaciones
    console.log('\n3️⃣ Generando Recomendaciones...');
    const recommendations = await ejemplo4_RecomendacionesPersonalizadas();

    // 4. Alertas
    console.log('\n4️⃣ Analizando Alertas...');
    const alerts = await ejemplo3_SistemaAlertas();

    // 5. Resumen ejecutivo
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN EJECUTIVO');
    console.log('='.repeat(60));

    const totalPredicted = predictions.reduce((sum, p) => sum + p.predictedRevenue, 0);
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;

    console.log(`\n💰 Ingresos proyectados (7 días): $${Math.round(totalPredicted).toLocaleString()}`);
    console.log(`🎯 Confianza promedio: ${Math.round(avgConfidence * 100)}%`);
    console.log(`🌟 Score de oportunidad hoy: ${score.score}/100`);
    console.log(`💡 Recomendaciones activas: ${recommendations.length}`);
    console.log(`🚨 Alertas críticas: ${alerts.filter(a => a.severity === 'critical').length}`);

    // Próximas acciones
    console.log('\n🎯 PRÓXIMAS ACCIONES RECOMENDADAS:');
    const criticalRecs = recommendations
      .filter(r => r.priority === 'critical')
      .slice(0, 3);

    if (criticalRecs.length > 0) {
      criticalRecs.forEach((rec, idx) => {
        console.log(`\n${idx + 1}. ${rec.title}`);
        console.log(`   ➡️ ${rec.action}`);
      });
    } else {
      console.log('\n✅ No hay acciones críticas pendientes');
    }

    console.log('\n' + '='.repeat(60));

    return {
      score,
      predictions,
      recommendations,
      alerts,
      summary: {
        totalPredicted,
        avgConfidence,
        opportunityScore: score.score,
        activeRecommendations: recommendations.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length
      }
    };

  } catch (error) {
    console.error('❌ Error en análisis:', error);
    throw error;
  }
}

// ==========================================
// EJEMPLO 6: Integración con UI (React Hook)
// ==========================================

import { useState, useEffect } from 'react';

export function useBusinessIntelligence() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIntelligence();
  }, []);

  const loadIntelligence = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar todo en paralelo
      const [predictions, recommendations, alerts, score] = await Promise.all([
        fetch('/api/intelligence/predictions').then(r => r.json()),
        fetch('/api/intelligence/recommendations').then(r => r.json()),
        fetch('/api/intelligence/alerts').then(r => r.json()),
        fetch('/api/intelligence/opportunity-score').then(r => r.json())
      ]);

      setData({
        predictions,
        recommendations,
        alerts,
        score
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    data,
    reload: loadIntelligence
  };
}

// Uso en componente:
// const { data, loading, error, reload } = useBusinessIntelligence();

// ==========================================
// EJEMPLO 7: Automatización de Reportes
// ==========================================

async function ejemplo7_ReporteDiarioAutomatico() {
  console.log('📧 EJEMPLO 7: Generación de Reporte Diario Automático');
  console.log('─'.repeat(60));

  // 1. Ejecutar análisis completo
  const analysis = await ejemplo5_AnalisisDiario();

  // 2. Generar HTML del reporte
  const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563eb; }
    .metric { background: #f1f5f9; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .critical { background: #fee2e2; border-left: 4px solid #dc2626; }
    .good { background: #dcfce7; border-left: 4px solid #16a34a; }
  </style>
</head>
<body>
  <h1>🧠 Reporte Diario de Inteligencia de Negocios</h1>
  <p>Fecha: ${new Date().toLocaleDateString('es-MX', { dateStyle: 'full' })}</p>
  
  <h2>📊 Resumen Ejecutivo</h2>
  <div class="metric ${analysis.summary.opportunityScore > 70 ? 'good' : ''}">
    <strong>Score de Oportunidad:</strong> ${analysis.summary.opportunityScore}/100
  </div>
  <div class="metric">
    <strong>Ingresos Proyectados (7d):</strong> $${Math.round(analysis.summary.totalPredicted).toLocaleString()}
  </div>
  
  <h2>🚨 Alertas Críticas</h2>
  ${analysis.alerts.filter((a: any) => a.severity === 'critical').map((alert: any) => `
    <div class="metric critical">
      <strong>${alert.title}</strong><br>
      ${alert.message}
    </div>
  `).join('')}
  
  <h2>💡 Top Recomendaciones</h2>
  ${analysis.recommendations.slice(0, 3).map((rec: any) => `
    <div class="metric">
      <strong>${rec.title}</strong><br>
      ${rec.description}<br>
      <em>Acción: ${rec.action}</em>
    </div>
  `).join('')}
</body>
</html>
  `;

  // 3. Enviar por email
  const sent = await fetch('/api/notifications/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: BUSINESS_CONFIG.alerts.notifications.email.recipients,
      subject: `Reporte Diario - ${new Date().toLocaleDateString('es-MX')}`,
      html: reportHTML
    })
  });

  console.log(sent.ok ? '✅ Reporte enviado' : '❌ Error enviando reporte');

  return reportHTML;
}

// ==========================================
// EXPORTAR EJEMPLOS
// ==========================================

export const ejemplos = {
  prediccionSimple: ejemplo1_PrediccionSimple,
  analisisOportunidad: ejemplo2_AnalisisOportunidad,
  sistemaAlertas: ejemplo3_SistemaAlertas,
  recomendaciones: ejemplo4_RecomendacionesPersonalizadas,
  analisisDiario: ejemplo5_AnalisisDiario,
  reporteAutomatico: ejemplo7_ReporteDiarioAutomatico
};

// ==========================================
// EJECUTAR EJEMPLO EN CONSOLA
// ==========================================

// Descomenta para ejecutar:
// if (typeof window !== 'undefined') {
//   (window as any).ejemplosBI = ejemplos;
//   console.log('✅ Ejemplos cargados. Usa: ejemplosBI.analisisDiario()');
// }