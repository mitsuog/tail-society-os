// ==========================================
// CONFIGURACIÓN DEL SISTEMA DE BI
// ==========================================

export const BUSINESS_CONFIG = {
  // Información del Negocio
  business: {
    name: 'Tail Society
    location: {
      lat: 25.6866, // Monterrey, Nuevo León
      lng: -100.3161,
      address: 'Av. Manuel Gomez Morin 404 Local E5 Villas de Aragon San Pedro Garza Garcia'
      timezone: 'America/Monterrey'
    },
    hours: {
      monday: { open: '09:00', close: '19:00' },
      tuesday: { open: '09:00', close: '19:00' },
      wednesday: { open: '09:00', close: '19:00' },
      thursday: { open: '09:00', close: '19:00' },
      friday: { open: '09:00', close: '19:00' },
      saturday: { open: '09:00', close: '17:00' },
      sunday: null // Cerrado
    }
  },

  // Configuración de Machine Learning
  ml: {
    // Red Neuronal
    neuralNetwork: {
      layers: [64, 32, 16, 1], // Neuronas por capa
      dropout: 0.2,
      learningRate: 0.001,
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2
    },

    // Features para entrenamiento
    features: {
      temporal: true,      // Día, mes, tendencia
      weather: true,       // Clima
      traffic: true,       // Tráfico
      trends: true,        // Google Trends
      lags: [1, 2, 7],    // Días anteriores (1d, 2d, 1 semana)
      seasonality: true    // Componente estacional
    },

    // Parámetros de predicción
    prediction: {
      daysAhead: 7,              // Días a predecir
      confidenceThreshold: 0.7,   // Mínimo para alertas
      updateInterval: 6 * 60 * 60 * 1000 // 6 horas
    }
  },

  // Configuración de Alertas
  alerts: {
    // Umbrales para detección de anomalías
    anomaly: {
      stdDevThreshold: 2,        // Desviaciones estándar
      minDataPoints: 7           // Mínimo de días para calcular
    },

    // Inventario
    inventory: {
      criticalStock: 10,          // Stock crítico
      staleProductDays: 60,       // Días sin venta
      reorderPoint: 15            // Punto de reorden
    },

    // Clientes
    customer: {
      vipThreshold: 5000,         // $ para ser VIP
      atRiskDays: 45,             // Días sin visita = riesgo
      lostDays: 90,               // Días sin visita = perdido
      loyalVisits: 8              // Visitas para ser leal
    },

    // Rendimiento
    performance: {
      significantChange: 15,      // % cambio significativo
      comparisonPeriod: 7         // Días para comparar
    },

    // Notificaciones
    notifications: {
      browser: true,              // Notificaciones del navegador
      email: {
        enabled: true,
        critical: true,           // Enviar críticas por email
        dailyDigest: true,        // Resumen diario
        recipients: ['owner@business.com']
      },
      sms: {
        enabled: false,           // Desactivado por defecto
        criticalOnly: true,       // Solo alertas críticas
        phoneNumbers: ['+52XXXXXXXXXX']
      }
    }
  },

  // Configuración de APIs Externas
  externalAPIs: {
    weather: {
      provider: 'openweathermap',
      updateInterval: 3 * 60 * 60 * 1000, // 3 horas
      cacheTime: 5 * 60 * 1000,           // 5 minutos
      fallbackToMock: true                 // Usar datos sintéticos si falla
    },

    traffic: {
      provider: 'google',
      updateInterval: 15 * 60 * 1000,     // 15 minutos
      peakHoursOnly: true                  // Solo analizar horas pico
    },

    trends: {
      provider: 'serpapi', // o 'mock'
      keywords: [
        'estética canina monterrey',
        'grooming perros',
        'baño mascotas'
      ],
      updateInterval: 24 * 60 * 60 * 1000 // Diario
    },

    location: {
      googlePlaceId: process.env.GOOGLE_PLACE_ID || '',
      updateInterval: 7 * 24 * 60 * 60 * 1000 // Semanal
    }
  },

  // Configuración de Recomendaciones
  recommendations: {
    // Priorización
    priorities: {
      critical: {
        minConfidence: 0.9,
        autoNotify: true,
        requiresAction: true
      },
      high: {
        minConfidence: 0.8,
        autoNotify: true,
        requiresAction: false
      },
      medium: {
        minConfidence: 0.7,
        autoNotify: false,
        requiresAction: false
      },
      low: {
        minConfidence: 0.6,
        autoNotify: false,
        requiresAction: false
      }
    },

    // Categorías habilitadas
    categories: {
      inventory: true,
      staffing: true,
      marketing: true,
      pricing: true,
      customer: true
    },

    // Límites
    maxRecommendations: 20,
    expirationDays: 7
  },

  // Score de Oportunidad
  opportunityScore: {
    weights: {
      weather: 0.3,
      traffic: 0.2,
      trends: 0.3,
      location: 0.2
    },

    thresholds: {
      excellent: 80,    // > 80 = Excelente
      good: 60,         // 60-80 = Bueno
      moderate: 40,     // 40-60 = Moderado
      poor: 0           // < 40 = Pobre
    }
  },

  // Segmentación de Clientes (RFM)
  customerSegmentation: {
    vip: {
      minSpent: 5000,
      maxDaysSinceVisit: 45
    },
    loyal: {
      minVisits: 8,
      maxDaysSinceVisit: 60
    },
    promising: {
      minVisits: 2,
      maxDaysSinceVisit: 30
    },
    atRisk: {
      minSpent: 2000,
      minDaysSinceVisit: 90
    },
    lost: {
      minDaysSinceVisit: 120
    }
  },

  // Cache y Performance
  cache: {
    enableCache: true,
    defaultTTL: 5 * 60 * 1000,      // 5 minutos
    maxSize: 100,                    // MB
    strategy: 'memory' // 'memory' | 'redis' | 'file'
  },

  // Logging y Debugging
  logging: {
    enabled: true,
    level: 'info', // 'debug' | 'info' | 'warn' | 'error'
    logPredictions: true,
    logRecommendations: true,
    logAlerts: true
  },

  // Features Beta
  beta: {
    sentimentAnalysis: false,
    voiceCommands: false,
    aiChatbot: false,
    advancedForecasting: false
  }
};

// ==========================================
// VALIDACIÓN DE CONFIGURACIÓN
// ==========================================
export function validateConfig() {
  const errors: string[] = [];

  // Validar coordenadas
  if (!BUSINESS_CONFIG.business.location.lat || !BUSINESS_CONFIG.business.location.lng) {
    errors.push('❌ Coordenadas de ubicación no configuradas');
  }

  // Validar API keys
  if (!process.env.NEXT_PUBLIC_WEATHER_API_KEY && BUSINESS_CONFIG.externalAPIs.weather.fallbackToMock === false) {
    errors.push('⚠️ Weather API key no configurada (usando datos mock)');
  }

  if (!process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {
    errors.push('⚠️ Google API key no configurada (funcionalidad limitada)');
  }

  // Validar configuración de ML
  if (BUSINESS_CONFIG.ml.neuralNetwork.epochs < 50) {
    errors.push('⚠️ Epochs muy bajos, considera aumentar a 100+');
  }

  if (BUSINESS_CONFIG.ml.prediction.confidenceThreshold > 0.9) {
    errors.push('⚠️ Umbral de confianza muy alto, pocas predicciones pasarán');
  }

  // Mostrar resultados
  if (errors.length > 0) {
    console.warn('🔧 Configuración requiere atención:');
    errors.forEach(err => console.warn(err));
  } else {
    console.log('✅ Configuración validada correctamente');
  }

  return errors.length === 0;
}

// ==========================================
// HELPERS DE CONFIGURACIÓN
// ==========================================

/**
 * Obtiene configuración específica por clave
 */
export function getConfig<K extends keyof typeof BUSINESS_CONFIG>(
  key: K
): typeof BUSINESS_CONFIG[K] {
  return BUSINESS_CONFIG[key];
}

/**
 * Actualiza configuración en runtime
 */
export function updateConfig<K extends keyof typeof BUSINESS_CONFIG>(
  key: K,
  value: Partial<typeof BUSINESS_CONFIG[K]>
) {
  BUSINESS_CONFIG[key] = {
    ...BUSINESS_CONFIG[key],
    ...value
  };
}

/**
 * Obtiene horario de operación para un día
 */
export function getBusinessHours(dayOfWeek: number) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayKey = days[dayOfWeek];
  return BUSINESS_CONFIG.business.hours[dayKey];
}

/**
 * Verifica si el negocio está abierto en un momento dado
 */
export function isBusinessOpen(date: Date = new Date()): boolean {
  const dayOfWeek = date.getDay();
  const hours = getBusinessHours(dayOfWeek);
  
  if (!hours) return false;

  const currentTime = date.getHours() * 60 + date.getMinutes();
  const [openHour, openMin] = hours.open.split(':').map(Number);
  const [closeHour, closeMin] = hours.close.split(':').map(Number);
  
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  return currentTime >= openTime && currentTime <= closeTime;
}

/**
 * Exporta configuración como JSON (para backup)
 */
export function exportConfig() {
  return JSON.stringify(BUSINESS_CONFIG, null, 2);
}

/**
 * Importa configuración desde JSON
 */
export function importConfig(json: string) {
  try {
    const config = JSON.parse(json);
    Object.assign(BUSINESS_CONFIG, config);
    validateConfig();
    return true;
  } catch (error) {
    console.error('Error importando configuración:', error);
    return false;
  }
}

// Validar al cargar
if (typeof window !== 'undefined') {
  validateConfig();
}