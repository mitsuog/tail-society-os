// ==========================================
// INTEGRACIÓN CON APIS EXTERNAS
// ==========================================

import { format, addDays } from 'date-fns';

export interface WeatherData {
  date: string;
  temperature: number;
  condition: string;
  precipitation: number;
  humidity: number;
  uvIndex: number;
  windSpeed: number;
}

export interface TrafficData {
  date: string;
  level: 'low' | 'medium' | 'high';
  delay_minutes: number;
  incidents: number;
}

export interface TrendsData {
  date: string;
  searchVolume: number;
  relativeInterest: number;
  topQueries: string[];
}

export interface LocationInsights {
  popularTimes: number[]; // 24 horas
  peakHours: number[];
  averageVisitDuration: number;
  nearbyCompetitors: number;
}

// ==========================================
// SERVICIO DE CLIMA
// ==========================================
export class WeatherService {
  private apiKey: string;
  private location: { lat: number; lng: number };

  constructor(location: { lat: number; lng: number }) {
    // Usar OpenWeatherMap o similar
    this.apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY || '';
    this.location = location;
  }

  /**
   * Obtiene pronóstico del clima para los próximos N días
   */
  async getForecast(days: number = 7): Promise<WeatherData[]> {
    try {
      // Si no hay API key, usar mock directamente
      if (!this.apiKey) {
        console.log('⚠️ No API key for weather, using mock data');
        return this.getMockWeatherData(days);
      }

      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${this.location.lat}&lon=${this.location.lng}&appid=${this.apiKey}&units=metric&cnt=${days * 8}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('Weather API request failed, using mock data');
        return this.getMockWeatherData(days);
      }

      const data = await response.json();
      
      // Verificar que data.list existe
      if (!data || !data.list || !Array.isArray(data.list)) {
        console.warn('Invalid weather data structure, using mock data');
        return this.getMockWeatherData(days);
      }

      return this.parseWeatherData(data);
    } catch (error) {
      console.warn('Error fetching weather, using mock data:', error);
      return this.getMockWeatherData(days);
    }
  }

  /**
   * Evalúa si el clima es favorable para el negocio
   */
  isWeatherFavorable(weather: WeatherData): {
    score: number;
    factors: string[];
  } {
    let score = 100;
    const factors: string[] = [];

    // Temperatura óptima: 15-28°C
    if (weather.temperature < 10) {
      score -= 20;
      factors.push('Temperatura muy baja');
    } else if (weather.temperature > 30) {
      score -= 15;
      factors.push('Temperatura muy alta');
    }

    // Precipitación
    if (weather.precipitation > 50) {
      score -= 30;
      factors.push('Lluvia intensa');
    } else if (weather.precipitation > 20) {
      score -= 15;
      factors.push('Lluvia moderada');
    }

    // UV alto es bueno (más paseos de perros)
    if (weather.uvIndex > 6) {
      score += 10;
      factors.push('Alto índice UV (más paseos)');
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      factors
    };
  }

  private parseWeatherData(data: any): WeatherData[] {
    const dailyData = new Map<string, WeatherData>();

    // Verificar que data.list existe y es un array
    if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
      console.warn('Invalid or empty weather data, returning mock data');
      return this.getMockWeatherData(7);
    }

    data.list.forEach((item: any) => {
      const date = format(new Date(item.dt * 1000), 'yyyy-MM-dd');
      
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          temperature: item.main.temp,
          condition: item.weather[0].main,
          precipitation: (item.rain?.['3h'] || 0) / 3,
          humidity: item.main.humidity,
          uvIndex: item.uvi || 5,
          windSpeed: item.wind.speed
        });
      }
    });

    const result = Array.from(dailyData.values());
    
    // Si no se obtuvo ningún dato, usar mock
    if (result.length === 0) {
      console.warn('No weather data parsed, returning mock data');
      return this.getMockWeatherData(7);
    }

    return result;
  }

  private getMockWeatherData(days: number): WeatherData[] {
    const data: WeatherData[] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = addDays(today, i);
      data.push({
        date: format(date, 'yyyy-MM-dd'),
        temperature: 20 + Math.random() * 8,
        condition: Math.random() > 0.7 ? 'Rain' : 'Clear',
        precipitation: Math.random() * 30,
        humidity: 50 + Math.random() * 30,
        uvIndex: 4 + Math.random() * 4,
        windSpeed: 5 + Math.random() * 10
      });
    }

    return data;
  }
}

// ==========================================
// SERVICIO DE TRÁFICO
// ==========================================
export class TrafficService {
  private location: { lat: number; lng: number };

  constructor(location: { lat: number; lng: number }) {
    this.location = location;
  }

  /**
   * Obtiene datos de tráfico en tiempo real y predicción
   */
  async getTrafficConditions(targetDate?: Date): Promise<TrafficData> {
    try {
      // Google Maps Traffic API o TomTom Traffic API
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${this.location.lat},${this.location.lng}&destinations=${this.location.lat},${this.location.lng}&departure_time=now&key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      return this.parseTrafficData(data, targetDate);
    } catch (error) {
      console.error('Error fetching traffic:', error);
      return this.getMockTrafficData();
    }
  }

  /**
   * Predice condiciones de tráfico basado en patrones históricos
   */
  predictTraffic(dayOfWeek: number, hour: number): TrafficData {
    // Lunes-Viernes 7-9am y 5-7pm = Alta
    // Sábado 10am-2pm = Media
    // Domingo = Baja
    
    let level: 'low' | 'medium' | 'high' = 'low';
    let delay = 0;

    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Lun-Vie
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        level = 'high';
        delay = 15 + Math.random() * 10;
      } else if (hour >= 12 && hour <= 14) {
        level = 'medium';
        delay = 5 + Math.random() * 5;
      }
    } else if (dayOfWeek === 6) { // Sábado
      if (hour >= 10 && hour <= 14) {
        level = 'medium';
        delay = 5 + Math.random() * 5;
      }
    }

    return {
      date: format(new Date(), 'yyyy-MM-dd'),
      level,
      delay_minutes: Math.round(delay),
      incidents: level === 'high' ? Math.floor(Math.random() * 3) : 0
    };
  }

  private parseTrafficData(data: any, targetDate?: Date): TrafficData {
    const duration = data.rows[0]?.elements[0]?.duration_in_traffic?.value || 0;
    const normalDuration = data.rows[0]?.elements[0]?.duration?.value || 0;
    const delay = (duration - normalDuration) / 60; // Minutos

    let level: 'low' | 'medium' | 'high' = 'low';
    if (delay > 15) level = 'high';
    else if (delay > 5) level = 'medium';

    return {
      date: format(targetDate || new Date(), 'yyyy-MM-dd'),
      level,
      delay_minutes: Math.round(delay),
      incidents: 0
    };
  }

  private getMockTrafficData(): TrafficData {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    return this.predictTraffic(dayOfWeek, hour);
  }
}

// ==========================================
// SERVICIO DE TENDENCIAS (GOOGLE TRENDS)
// ==========================================
export class TrendsService {
  private keyword: string;
  private location: string;

  constructor(keyword: string = 'estética canina', location: string = 'MX') {
    this.keyword = keyword;
    this.location = location;
  }

  /**
   * Obtiene tendencias de búsqueda
   */
  async getTrends(days: number = 30): Promise<TrendsData[]> {
    try {
      // Usar mock por defecto (la API de Google Trends requiere configuración especial)
      console.log('ℹ️ Using mock trends data (Google Trends API requires special setup)');
      return this.getMockTrendsData(days);
      
      // Para activar API real, descomenta y configura:
      // const url = `https://serpapi.com/search?engine=google_trends&q=${this.keyword}&data_type=TIMESERIES&geo=${this.location}`;
      // const response = await fetch(url);
      // const data = await response.json();
      // return this.parseTrendsData(data);
    } catch (error) {
      console.warn('Error fetching trends, using mock data:', error);
      return this.getMockTrendsData(days);
    }
  }

  /**
   * Analiza interés relativo y predice demanda
   */
  analyzeTrendImpact(trends: TrendsData[]): {
    momentum: 'rising' | 'stable' | 'declining';
    score: number;
    recommendation: string;
  } {
    if (trends.length < 2) {
      return { momentum: 'stable', score: 50, recommendation: 'Datos insuficientes' };
    }

    const recentAvg = trends.slice(-7).reduce((sum, t) => sum + t.relativeInterest, 0) / 7;
    const olderAvg = trends.slice(0, 7).reduce((sum, t) => sum + t.relativeInterest, 0) / 7;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    let momentum: 'rising' | 'stable' | 'declining' = 'stable';
    let recommendation = '';

    if (change > 20) {
      momentum = 'rising';
      recommendation = '📈 Tendencia alcista. Considera aumentar inventario y personal.';
    } else if (change < -20) {
      momentum = 'declining';
      recommendation = '📉 Tendencia a la baja. Implementa promociones agresivas.';
    } else {
      recommendation = '➡️ Tendencia estable. Mantén operaciones actuales.';
    }

    return {
      momentum,
      score: Math.round(recentAvg),
      recommendation
    };
  }

  private parseTrendsData(data: any): TrendsData[] {
    // Parsear respuesta de API
    return data.interest_over_time?.map((item: any) => ({
      date: item.date,
      searchVolume: item.value,
      relativeInterest: item.value,
      topQueries: []
    })) || [];
  }

  private getMockTrendsData(days: number): TrendsData[] {
    const data: TrendsData[] = [];
    const baseInterest = 50;

    for (let i = 0; i < days; i++) {
      const date = addDays(new Date(), -days + i);
      const trend = Math.sin(i * 0.2) * 20; // Simulación de tendencia
      
      data.push({
        date: format(date, 'yyyy-MM-dd'),
        searchVolume: Math.round(baseInterest + trend + Math.random() * 10),
        relativeInterest: Math.round(baseInterest + trend + Math.random() * 10),
        topQueries: ['grooming', 'baño perros', 'corte de pelo perros']
      });
    }

    return data;
  }
}

// ==========================================
// SERVICIO DE UBICACIÓN (GOOGLE PLACES)
// ==========================================
export class LocationInsightsService {
  private placeId: string;
  private location: { lat: number; lng: number };

  constructor(placeId: string, location: { lat: number; lng: number }) {
    this.placeId = placeId;
    this.location = location;
  }

  /**
   * Obtiene insights de Google My Business / Places
   */
  async getInsights(): Promise<LocationInsights> {
    try {
      // Si no hay API key de Google, usar mock
      if (!process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {
        console.log('ℹ️ No Google API key, using mock location insights');
        return this.getMockInsights();
      }

      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${this.placeId}&fields=opening_hours,user_ratings_total&key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('Google Places API request failed, using mock data');
        return this.getMockInsights();
      }

      const data = await response.json();
      return this.parseInsights(data);
    } catch (error) {
      console.warn('Error fetching location insights, using mock data:', error);
      return this.getMockInsights();
    }
  }

  /**
   * Busca competidores cercanos en rango de 5-10km
   */
  async getNearbyCompetitors(minRadius: number = 5000, maxRadius: number = 10000): Promise<{
    total: number;
    nearby: number;
    competitors: Array<{name: string; distance: number; rating: number}>;
  }> {
    try {
      // Si no hay API key de Google, usar mock
      if (!process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {
        console.log('ℹ️ No Google API key, using mock competitor data');
        return {
          total: 5,
          nearby: 3,
          competitors: [
            { name: 'Pet Grooming San Pedro', distance: 6500, rating: 4.5 },
            { name: 'Estética Canina Elite', distance: 7200, rating: 4.2 },
            { name: 'Dog Spa Garza García', distance: 8100, rating: 4.7 }
          ]
        };
      }

      // Búsqueda en rango extendido (5-10km)
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${this.location.lat},${this.location.lng}&radius=${maxRadius}&type=pet_store&keyword=grooming&key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('Google Places API request failed, using mock competitor data');
        return {
          total: 5,
          nearby: 3,
          competitors: [
            { name: 'Pet Grooming San Pedro', distance: 6500, rating: 4.5 },
            { name: 'Estética Canina Elite', distance: 7200, rating: 4.2 },
            { name: 'Dog Spa Garza García', distance: 8100, rating: 4.7 }
          ]
        };
      }

      const data = await response.json();

      const results = data.results || [];
      
      // Calcular distancias y filtrar por rango
      const competitors = results.map((place: any) => {
        const distance = this.calculateDistance(
          this.location.lat,
          this.location.lng,
          place.geometry.location.lat,
          place.geometry.location.lng
        );
        return {
          name: place.name,
          distance: Math.round(distance),
          rating: place.rating || 0
        };
      }).filter((c: any) => c.distance >= minRadius && c.distance <= maxRadius);

      return {
        total: results.length,
        nearby: competitors.length,
        competitors: competitors.slice(0, 10) // Top 10
      };
    } catch (error) {
      console.warn('Error fetching competitors, using mock data:', error);
      return {
        total: 5,
        nearby: 3,
        competitors: [
          { name: 'Pet Grooming San Pedro', distance: 6500, rating: 4.5 },
          { name: 'Estética Canina Elite', distance: 7200, rating: 4.2 },
          { name: 'Dog Spa Garza García', distance: 8100, rating: 4.7 }
        ]
      };
    }
  }

  /**
   * Calcula distancia entre dos puntos en metros (Haversine)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  }

  private parseInsights(data: any): LocationInsights {
    // Parsear datos de Popular Times si está disponible
    const popularTimes = Array(24).fill(0).map((_, i) => {
      // Simular patrón de afluencia (máx en horas de trabajo)
      if (i >= 9 && i <= 19) {
        return 40 + Math.random() * 40;
      }
      return Math.random() * 20;
    });

    return {
      popularTimes,
      peakHours: [10, 11, 15, 16, 17],
      averageVisitDuration: 45, // minutos
      nearbyCompetitors: 3
    };
  }

  private getMockInsights(): LocationInsights {
    return {
      popularTimes: [
        5, 8, 12, 35, 50, 65, 75, 80, 85, 90, // 0-9am
        95, 92, 88, 85, 80, 85, 90, 88, 85, 70, // 10-19
        50, 30, 15, 8 // 20-23
      ],
      peakHours: [10, 11, 15, 16, 17],
      averageVisitDuration: 45,
      nearbyCompetitors: 3
    };
  }
}

// ==========================================
// AGREGADOR DE DATOS EXTERNOS
// ==========================================
export class ExternalDataAggregator {
  private weather: WeatherService;
  private traffic: TrafficService;
  private trends: TrendsService;
  private location: LocationInsightsService;

  constructor(config: {
    location: { lat: number; lng: number };
    placeId: string;
    keyword?: string;
  }) {
    this.weather = new WeatherService(config.location);
    this.traffic = new TrafficService(config.location);
    this.trends = new TrendsService(config.keyword);
    this.location = new LocationInsightsService(config.placeId, config.location);
  }

  /**
   * Obtiene todos los datos externos de una vez
   */
  async getAllData(days: number = 7) {
    const [weather, trends, insights, competitorData] = await Promise.all([
      this.weather.getForecast(days),
      this.trends.getTrends(30),
      this.location.getInsights(),
      this.location.getNearbyCompetitors(5000, 10000) // 5-10km
    ]);

    return {
      weather,
      trends,
      insights,
      competitors: competitorData.nearby,
      competitorDetails: competitorData.competitors
    };
  }

  /**
   * Calcula un score de oportunidad de negocio para cada día
   */
  calculateBusinessOpportunityScore(
    weather: WeatherData,
    traffic: TrafficData,
    trends: TrendsData,
    insights: LocationInsights
  ): {
    score: number;
    factors: {
      weather: number;
      traffic: number;
      trends: number;
      location: number;
    };
    recommendation: string;
  } {
    // Score de clima (0-100)
    const weatherScore = this.weather.isWeatherFavorable(weather).score;

    // Score de tráfico (0-100)
    const trafficScore = traffic.level === 'low' ? 100 : traffic.level === 'medium' ? 60 : 30;

    // Score de tendencias (0-100)
    const trendsScore = trends.relativeInterest;

    // Score de ubicación basado en horarios pico
    const currentHour = new Date().getHours();
    const locationScore = insights.peakHours.includes(currentHour) ? 100 : 50;

    // Score ponderado
    const totalScore = (
      weatherScore * 0.3 +
      trafficScore * 0.2 +
      trendsScore * 0.3 +
      locationScore * 0.2
    );

    let recommendation = '';
    if (totalScore > 80) {
      recommendation = '🌟 Excelente oportunidad. Maximiza capacidad y considera promociones premium.';
    } else if (totalScore > 60) {
      recommendation = '✅ Buena oportunidad. Opera normalmente.';
    } else if (totalScore > 40) {
      recommendation = '⚠️ Oportunidad moderada. Considera ajustes de precio o promociones.';
    } else {
      recommendation = '🔴 Baja oportunidad. Implementa descuentos agresivos o cierra temprano.';
    }

    return {
      score: Math.round(totalScore),
      factors: {
        weather: weatherScore,
        traffic: trafficScore,
        trends: trendsScore,
        location: locationScore
      },
      recommendation
    };
  }
}