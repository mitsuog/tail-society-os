import * as tf from '@tensorflow/tfjs';
import { format, addDays, getDay, getHours, parseISO, differenceInDays } from 'date-fns';

// ==========================================
// TIPOS DE DATOS
// ==========================================
export interface MLPrediction {
  date: string;
  predictedRevenue: number;
  confidence: number;
  factors: {
    historical: number;
    weather: number;
    traffic: number;
    trends: number;
    seasonality: number;
  };
  recommendation: string;
}

export interface BusinessRecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'inventory' | 'staffing' | 'marketing' | 'pricing' | 'customer';
  title: string;
  description: string;
  impact: string;
  action: string;
  confidence: number;
  expectedROI?: number;
}

export interface ExternalFactors {
  weather: {
    temperature: number;
    condition: string;
    precipitation: number;
    uvIndex: number;
  };
  traffic: {
    level: 'low' | 'medium' | 'high';
    delay_minutes: number;
  };
  trends: {
    searchVolume: number;
    relativeInterest: number;
  };
  competition: {
    nearbyActivity: number;
    marketShare: number;
  };
}

// ==========================================
// MODELO DE PREDICCIÓN MULTI-FACTOR
// ==========================================
export class MultiFactorPredictor {
  private model: tf.LayersModel | null = null;
  private scaler: { mean: number[]; std: number[] } | null = null;

  /**
   * Entrena un modelo de red neuronal con datos históricos y factores externos
   */
  async train(historicalData: any[], externalData: ExternalFactors[]) {
    // Preparar datos de entrenamiento
    const features: number[][] = [];
    const labels: number[] = [];

    historicalData.forEach((day, idx) => {
      const date = parseISO(day.date);
      const external = externalData[idx] || this.getDefaultExternalFactors();

      // Feature engineering
      const featureVector = [
        // Temporales
        getDay(date), // Día de la semana (0-6)
        date.getDate(), // Día del mes
        date.getMonth(), // Mes
        idx, // Tendencia temporal

        // Factores externos
        external.weather.temperature,
        external.weather.precipitation,
        external.weather.uvIndex,
        external.traffic.delay_minutes,
        this.trafficToNumeric(external.traffic.level),
        external.trends.searchVolume,
        external.trends.relativeInterest,

        // Lag features (ventas de días anteriores)
        idx > 0 ? historicalData[idx - 1].total : 0,
        idx > 1 ? historicalData[idx - 2].total : 0,
        idx > 6 ? historicalData[idx - 7].total : 0, // Semana anterior
      ];

      features.push(featureVector);
      labels.push(day.total);
    });

    // Normalización
    this.scaler = this.calculateScaler(features);
    const normalizedFeatures = this.normalize(features, this.scaler);

    // Crear modelo de red neuronal
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [features[0].length], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'linear' })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    // Entrenamiento
    const xs = tf.tensor2d(normalizedFeatures);
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    await this.model.fit(xs, ys, {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      verbose: 0,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 20 === 0) {
            console.log(`Época ${epoch}: loss = ${logs?.loss.toFixed(4)}`);
          }
        }
      }
    });

    xs.dispose();
    ys.dispose();
  }

  /**
   * Predice ventas futuras considerando múltiples factores
   */
  async predict(
    lastDate: Date,
    daysAhead: number,
    externalFactors: ExternalFactors[]
  ): Promise<MLPrediction[]> {
    if (!this.model || !this.scaler) {
      throw new Error('Modelo no entrenado');
    }

    const predictions: MLPrediction[] = [];

    for (let i = 1; i <= daysAhead; i++) {
      const futureDate = addDays(lastDate, i);
      const external = externalFactors[i - 1] || this.getDefaultExternalFactors();

      const featureVector = [
        getDay(futureDate),
        futureDate.getDate(),
        futureDate.getMonth(),
        i,
        external.weather.temperature,
        external.weather.precipitation,
        external.weather.uvIndex,
        external.traffic.delay_minutes,
        this.trafficToNumeric(external.traffic.level),
        external.trends.searchVolume,
        external.trends.relativeInterest,
        0, 0, 0 // Lags (simplificado)
      ];

      const normalized = this.normalize([featureVector], this.scaler);
      const input = tf.tensor2d(normalized);
      const prediction = this.model.predict(input) as tf.Tensor;
      const value = (await prediction.data())[0];

      input.dispose();
      prediction.dispose();

      // Calcular confianza basada en factores
      const confidence = this.calculateConfidence(external);

      predictions.push({
        date: format(futureDate, 'yyyy-MM-dd'),
        predictedRevenue: Math.max(0, value),
        confidence,
        factors: {
          historical: 0.3,
          weather: this.weatherImpact(external.weather),
          traffic: this.trafficImpact(external.traffic),
          trends: this.trendsImpact(external.trends),
          seasonality: 0.15
        },
        recommendation: this.generateRecommendation(value, external, confidence)
      });
    }

    return predictions;
  }

  // ==========================================
  // HELPERS
  // ==========================================
  private calculateScaler(data: number[][]): { mean: number[]; std: number[] } {
    const numFeatures = data[0].length;
    const mean: number[] = new Array(numFeatures).fill(0);
    const std: number[] = new Array(numFeatures).fill(0);

    // Calcular media
    data.forEach(row => {
      row.forEach((val, idx) => {
        mean[idx] += val;
      });
    });
    mean.forEach((val, idx) => {
      mean[idx] = val / data.length;
    });

    // Calcular desviación estándar
    data.forEach(row => {
      row.forEach((val, idx) => {
        std[idx] += Math.pow(val - mean[idx], 2);
      });
    });
    std.forEach((val, idx) => {
      std[idx] = Math.sqrt(val / data.length);
    });

    return { mean, std };
  }

  private normalize(data: number[][], scaler: { mean: number[]; std: number[] }): number[][] {
    return data.map(row =>
      row.map((val, idx) => {
        const s = scaler.std[idx] === 0 ? 1 : scaler.std[idx];
        return (val - scaler.mean[idx]) / s;
      })
    );
  }

  private trafficToNumeric(level: string): number {
    const map: any = { low: 0, medium: 1, high: 2 };
    return map[level] || 0;
  }

  private getDefaultExternalFactors(): ExternalFactors {
    return {
      weather: { temperature: 20, condition: 'clear', precipitation: 0, uvIndex: 5 },
      traffic: { level: 'medium', delay_minutes: 5 },
      trends: { searchVolume: 50, relativeInterest: 50 },
      competition: { nearbyActivity: 50, marketShare: 50 }
    };
  }

  private calculateConfidence(factors: ExternalFactors): number {
    let confidence = 0.7; // Base

    // Clima favorable aumenta confianza
    if (factors.weather.precipitation < 20 && factors.weather.temperature > 15) {
      confidence += 0.15;
    }

    // Tráfico bajo aumenta confianza
    if (factors.traffic.level === 'low') {
      confidence += 0.1;
    }

    // Tendencias altas aumentan confianza
    if (factors.trends.relativeInterest > 60) {
      confidence += 0.05;
    }

    return Math.min(0.95, confidence);
  }

  private weatherImpact(weather: any): number {
    let impact = 0.5;
    if (weather.precipitation > 50) impact -= 0.3;
    if (weather.temperature < 10 || weather.temperature > 35) impact -= 0.2;
    return Math.max(0, Math.min(1, impact));
  }

  private trafficImpact(traffic: any): number {
    return traffic.level === 'low' ? 0.8 : traffic.level === 'medium' ? 0.5 : 0.2;
  }

  private trendsImpact(trends: any): number {
    return trends.relativeInterest / 100;
  }

  private generateRecommendation(revenue: number, factors: ExternalFactors, confidence: number): string {
    if (revenue > 8000 && confidence > 0.8) {
      return '🚀 Día de alta demanda esperada. Considera tener personal extra.';
    }
    if (factors.weather.precipitation > 50) {
      return '☔ Lluvia esperada. Prepara promociones de emergencia.';
    }
    if (factors.traffic.level === 'high') {
      return '🚗 Tráfico intenso. Recuerda a clientes llegar con tiempo.';
    }
    return '✅ Día regular. Operaciones normales.';
  }
}

// ==========================================
// MOTOR DE RECOMENDACIONES
// ==========================================
export class RecommendationEngine {
  /**
   * Genera recomendaciones automáticas basadas en análisis completo
   */
  generateRecommendations(
    transactions: any[],
    clients: any[],
    inventory: any[],
    employees: any[],
    predictions: MLPrediction[]
  ): BusinessRecommendation[] {
    const recommendations: BusinessRecommendation[] = [];

    // 1. Análisis de Inventario
    recommendations.push(...this.analyzeInventory(inventory, transactions));

    // 2. Análisis de Personal
    recommendations.push(...this.analyzeStaffing(employees, predictions));

    // 3. Análisis de Clientes
    recommendations.push(...this.analyzeCustomers(clients, transactions));

    // 4. Análisis de Precios
    recommendations.push(...this.analyzePricing(transactions));

    // 5. Oportunidades de Marketing
    recommendations.push(...this.analyzeMarketing(clients, transactions, predictions));

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private analyzeInventory(inventory: any[], transactions: any[]): BusinessRecommendation[] {
    const recs: BusinessRecommendation[] = [];

    // Detectar productos con bajo stock y alta demanda
    const productSales = new Map<string, number>();
    transactions.forEach(t => {
      if (t.type === 'product') {
        t.items.forEach((item: string) => {
          productSales.set(item, (productSales.get(item) || 0) + 1);
        });
      }
    });

    inventory.forEach(item => {
      const sales = productSales.get(item.name) || 0;
      if (item.stock < 10 && sales > 5) {
        recs.push({
          id: `inv-${item.id}`,
          priority: 'high',
          category: 'inventory',
          title: `Stock Crítico: ${item.name}`,
          description: `Quedan solo ${item.stock} unidades y se vende frecuentemente (${sales} ventas recientes)`,
          impact: 'Riesgo de perder ventas por falta de stock',
          action: `Reabastecer al menos 50 unidades`,
          confidence: 0.9,
          expectedROI: sales * item.price * 0.3
        });
      }
    });

    return recs;
  }

  private analyzeStaffing(employees: any[], predictions: MLPrediction[]): BusinessRecommendation[] {
    const recs: BusinessRecommendation[] = [];

    // Detectar días de alta demanda
    const highDemandDays = predictions.filter(p => p.predictedRevenue > 8000);
    
    if (highDemandDays.length > 0 && employees.length < 3) {
      recs.push({
        id: 'staff-shortage',
        priority: 'high',
        category: 'staffing',
        title: 'Personal Insuficiente para Picos de Demanda',
        description: `Se esperan ${highDemandDays.length} días de alta demanda próximamente`,
        impact: 'Clientes insatisfechos por tiempos de espera largos',
        action: 'Contratar personal temporal o ajustar horarios',
        confidence: 0.85
      });
    }

    return recs;
  }

  private analyzeCustomers(clients: any[], transactions: any[]): BusinessRecommendation[] {
    const recs: BusinessRecommendation[] = [];

    // Detectar clientes en riesgo
    const now = new Date();
    const atRiskClients = clients.filter(c => {
      const lastVisit = parseISO(c.last_visit);
      const daysSince = differenceInDays(now, lastVisit);
      return daysSince > 60 && c.total_spent > 2000;
    });

    if (atRiskClients.length > 0) {
      recs.push({
        id: 'customers-atrisk',
        priority: 'medium',
        category: 'customer',
        title: `${atRiskClients.length} Clientes Valiosos en Riesgo`,
        description: 'Clientes de alto valor que no han regresado en más de 60 días',
        impact: `Posible pérdida de $${atRiskClients.reduce((s, c) => s + c.total_spent, 0).toLocaleString()} en valor de vida`,
        action: 'Enviar campaña de reactivación con descuento del 20%',
        confidence: 0.75,
        expectedROI: atRiskClients.length * 500
      });
    }

    return recs;
  }

  private analyzePricing(transactions: any[]): BusinessRecommendation[] {
    const recs: BusinessRecommendation[] = [];

    // Análisis de elasticidad de precios
    const serviceRevenue = transactions.filter(t => t.type === 'service')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const productRevenue = transactions.filter(t => t.type === 'product')
      .reduce((sum, t) => sum + t.amount, 0);

    if (productRevenue < serviceRevenue * 0.15) {
      recs.push({
        id: 'pricing-upsell',
        priority: 'medium',
        category: 'pricing',
        title: 'Oportunidad de Cross-Selling en Productos',
        description: 'Los productos representan menos del 15% de ingresos',
        impact: 'Aumento potencial del 30% en margen de ganancia',
        action: 'Implementar bundles de servicio + producto con 10% descuento',
        confidence: 0.7,
        expectedROI: productRevenue * 0.5
      });
    }

    return recs;
  }

  private analyzeMarketing(clients: any[], transactions: any[], predictions: MLPrediction[]): BusinessRecommendation[] {
    const recs: BusinessRecommendation[] = [];

    // Detectar días bajos para promociones
    const lowDays = predictions.filter(p => p.predictedRevenue < 3000);
    
    if (lowDays.length > 2) {
      recs.push({
        id: 'marketing-promo',
        priority: 'low',
        category: 'marketing',
        title: 'Promoción Recomendada para Días Bajos',
        description: `${lowDays.length} días con demanda baja esperada`,
        impact: 'Aumentar ocupación en días tradicionalmente lentos',
        action: 'Lanzar promoción "Happy Hour" con 25% descuento en horarios específicos',
        confidence: 0.65,
        expectedROI: 2000
      });
    }

    return recs;
  }
}