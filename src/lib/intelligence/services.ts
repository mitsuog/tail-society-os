// ==========================================
// INTEGRACIÓN CON APIS EXTERNAS (Optimizado)
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
// SERVICIO DE CLIMA (OpenWeatherMap)
// ==========================================
export class WeatherService {
  private apiKey: string;
  private location: { lat: number; lng: number };

  constructor(location: { lat: number; lng: number }) {
    this.apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY || '';
    this.location = location;
  }

  async getForecast(days: number = 7): Promise<WeatherData[]> {
    try {
      if (!this.apiKey) {
        console.warn('⚠️ Faltan NEXT_PUBLIC_WEATHER_API_KEY. Usando datos simulados.');
        return this.getMockWeatherData(days);
      }

      // API Call: 5 Day / 3 Hour Forecast
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${this.location.lat}&lon=${this.location.lng}&appid=${this.apiKey}&units=metric&cnt=${days * 8}`; // 8 periodos de 3h = 24h
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`Weather API Error: ${response.status} ${response.statusText}`);
        return this.getMockWeatherData(days);
      }

      const data = await response.json();
      return this.parseWeatherData(data);
    } catch (error) {
      console.error('Error fetching weather:', error);
      return this.getMockWeatherData(days);
    }
  }

  isWeatherFavorable(weather: WeatherData): { score: number; factors: string[] } {
    let score = 100;
    const factors: string[] = [];

    if (weather.temperature < 10) {
      score -= 20; factors.push('Frío intenso');
    } else if (weather.temperature > 35) {
      score -= 15; factors.push('Calor extremo');
    }

    if (weather.precipitation > 50) {
      score -= 30; factors.push('Lluvia intensa');
    } else if (weather.precipitation > 20) {
      score -= 15; factors.push('Lluvia moderada');
    }

    if (weather.uvIndex > 6) {
      score += 10; factors.push('Buen clima para paseos');
    }

    return { score: Math.max(0, Math.min(100, score)), factors };
  }

  private parseWeatherData(data: any): WeatherData[] {
    const dailyData = new Map<string, WeatherData>();

    if (!data.list) return this.getMockWeatherData(7);

    data.list.forEach((item: any) => {
      const date = format(new Date(item.dt * 1000), 'yyyy-MM-dd');
      // Tomamos el primer registro del día (o el mediodía si quisieramos filtrar más)
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          temperature: item.main.temp,
          condition: item.weather[0].main,
          precipitation: (item.pop || 0) * 100, // Probability of precipitation
          humidity: item.main.humidity,
          uvIndex: 5, // La API standard gratuita no siempre trae UV exacto, usamos promedio
          windSpeed: item.wind.speed
        });
      }
    });

    return Array.from(dailyData.values());
  }

  private getMockWeatherData(days: number): WeatherData[] {
    const data: WeatherData[] = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const date = addDays(today, i);
      data.push({
        date: format(date, 'yyyy-MM-dd'),
        temperature: 22 + Math.random() * 5,
        condition: Math.random() > 0.8 ? 'Rain' : 'Clear',
        precipitation: Math.random() * 10,
        humidity: 40 + Math.random() * 20,
        uvIndex: 6,
        windSpeed: 10
      });
    }
    return data;
  }
}

// ==========================================
// SERVICIO DE TRÁFICO (Google Distance Matrix)
// ==========================================
export class TrafficService {
  private location: { lat: number; lng: number };
  private apiKey: string;

  constructor(location: { lat: number; lng: number }) {
    this.location = location;
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
  }

  async getTrafficConditions(targetDate?: Date): Promise<TrafficData> {
    try {
      if (!this.apiKey) {
        console.warn('⚠️ Falta NEXT_PUBLIC_GOOGLE_API_KEY para tráfico.');
        return this.getMockTrafficData();
      }

      // TRUCO: Para medir la congestión "de la zona", medimos el tiempo desde
      // "Centrito Valle" (punto neurálgico cercano) hacia "Tail Society".
      // Si usas origen=destino, la API devuelve 0 segundos.
      const CENTRITO_VALLE = "25.657257,-100.366135";
      const DESTINO = `${this.location.lat},${this.location.lng}`;

      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${CENTRITO_VALLE}&destinations=${DESTINO}&departure_time=now&traffic_model=best_guess&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
         return this.getMockTrafficData();
      }

      return this.parseTrafficData(data, targetDate);
    } catch (error) {
      console.error('Error fetching traffic:', error);
      return this.getMockTrafficData();
    }
  }

  private parseTrafficData(data: any, targetDate?: Date): TrafficData {
    const element = data.rows?.[0]?.elements?.[0];
    
    if (!element || element.status !== 'OK') return this.getMockTrafficData();

    // duration = tiempo sin tráfico
    // duration_in_traffic = tiempo real ahora
    const durationNormal = element.duration?.value || 0;
    const durationReal = element.duration_in_traffic?.value || durationNormal;
    
    // Si el tiempo real es 30% mayor al normal, hay tráfico pesado
    const delaySeconds = durationReal - durationNormal;
    const delayMinutes = Math.round(delaySeconds / 60);

    let level: 'low' | 'medium' | 'high' = 'low';
    if (delayMinutes > 10) level = 'high';
    else if (delayMinutes > 3) level = 'medium';

    return {
      date: format(targetDate || new Date(), 'yyyy-MM-dd'),
      level,
      delay_minutes: Math.max(0, delayMinutes),
      incidents: 0 // La API básica no da conteo de incidentes
    };
  }

  private getMockTrafficData(): TrafficData {
    const hour = new Date().getHours();
    // Simulación: Tráfico alto en horas pico de San Pedro
    let level: 'low' | 'medium' | 'high' = 'low';
    if ((hour >= 8 && hour <= 9) || (hour >= 18 && hour <= 19)) level = 'high';
    
    return {
      date: format(new Date(), 'yyyy-MM-dd'),
      level,
      delay_minutes: level === 'high' ? 15 : 2,
      incidents: 0
    };
  }
}

// ==========================================
// SERVICIO DE TENDENCIAS (Mock Inteligente)
// ==========================================
export class TrendsService {
  private keyword: string;

  constructor(keyword: string = 'estética canina') {
    this.keyword = keyword;
  }

  // NOTA: Google Trends NO tiene API pública gratuita oficial. 
  // Se requiere scraping o servicios de pago como SerpApi.
  // Mantenemos esto como Mock para asegurar estabilidad sin costos extra ocultos.
  async getTrends(days: number = 30): Promise<TrendsData[]> {
    return this.getMockTrendsData(days);
  }

  analyzeTrendImpact(trends: TrendsData[]) {
    // Lógica simple de análisis de la serie de tiempo
    const recent = trends.slice(-5);
    const avgRecent = recent.reduce((a, b) => a + b.relativeInterest, 0) / recent.length;
    
    let momentum: 'rising' | 'stable' | 'declining' = 'stable';
    if (avgRecent > 75) momentum = 'rising';
    else if (avgRecent < 40) momentum = 'declining';

    return {
      momentum,
      score: Math.round(avgRecent),
      recommendation: momentum === 'rising' ? 'Tendencia en alza: Aumenta pauta publicitaria.' : 'Demanda estable.'
    };
  }

  private getMockTrendsData(days: number): TrendsData[] {
    const data: TrendsData[] = [];
    const today = new Date();
    
    // Generar una curva senoidal para simular estacionalidad realista
    for (let i = 0; i < days; i++) {
      const date = addDays(today, - (days - i));
      const base = 50;
      const noise = Math.random() * 20;
      const trend = Math.sin(i / 5) * 20; // Ola suave
      
      data.push({
        date: format(date, 'yyyy-MM-dd'),
        searchVolume: Math.round((base + trend + noise) * 10),
        relativeInterest: Math.min(100, Math.round(base + trend + noise)),
        topQueries: ['baño perro', 'corte perro san pedro', 'veterinaria cerca']
      });
    }
    return data;
  }
}

// ==========================================
// SERVICIO DE UBICACIÓN (Google Places)
// ==========================================
export class LocationInsightsService {
  private placeId: string;
  private apiKey: string;
  private location: { lat: number; lng: number };

  constructor(placeId: string, location: { lat: number; lng: number }) {
    this.placeId = placeId;
    this.location = location;
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
  }

  async getInsights(): Promise<LocationInsights> {
    try {
      if (!this.apiKey) return this.getMockInsights();

      // Obtenemos detalles del lugar
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${this.placeId}&fields=opening_hours,user_ratings_total,rating&key=${this.apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== 'OK') return this.getMockInsights();

      // Buscamos competidores cercanos (radio 2km)
      const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${this.location.lat},${this.location.lng}&radius=2000&type=pet_store&key=${this.apiKey}`;
      const nearbyRes = await fetch(nearbyUrl);
      const nearbyData = await nearbyRes.json();
      
      const nearbyCount = nearbyData.results ? nearbyData.results.length : 0;

      return {
        // Google Places API estándar NO devuelve "Popular Times" (eso es dato privado de Google Maps frontend).
        // Usamos un mock realista basado en horario comercial.
        popularTimes: this.getMockInsights().popularTimes, 
        peakHours: [11, 12, 16, 17],
        averageVisitDuration: 60,
        nearbyCompetitors: nearbyCount
      };

    } catch (e) {
      console.error('Location API Error', e);
      return this.getMockInsights();
    }
  }

  // También se usa para buscar competidores en detalle desde el otro endpoint
  async getNearbyCompetitors(minRadius: number, maxRadius: number) {
      // Este método se implementa mejor directamente en la ruta de API para no duplicar lógica,
      // pero lo mantenemos aquí por compatibilidad si se usa.
      return { total: 0, nearby: 0, competitors: [] }; 
  }

  private getMockInsights(): LocationInsights {
    return {
      popularTimes: [0,0,0,0,0,0,0,0, 15, 30, 55, 75, 80, 60, 50, 65, 85, 90, 70, 40, 20, 0, 0, 0],
      peakHours: [11, 16, 17],
      averageVisitDuration: 60,
      nearbyCompetitors: 5
    };
  }
}

// ==========================================
// AGREGADOR PRINCIPAL
// ==========================================
export class ExternalDataAggregator {
  private weather: WeatherService;
  private traffic: TrafficService;
  private trends: TrendsService;
  private location: LocationInsightsService;

  constructor(config: { location: { lat: number; lng: number }; placeId: string; keyword?: string; }) {
    this.weather = new WeatherService(config.location);
    this.traffic = new TrafficService(config.location);
    this.trends = new TrendsService(config.keyword);
    this.location = new LocationInsightsService(config.placeId, config.location);
  }

  async getAllData(days: number = 7) {
    const [weather, trends, insights] = await Promise.all([
      this.weather.getForecast(days),
      this.trends.getTrends(30),
      this.location.getInsights()
    ]);

    // Tráfico al momento
    const traffic = await this.traffic.getTrafficConditions();

    return {
      weather,
      trends,
      insights,
      traffic
    };
  }

  calculateBusinessOpportunityScore(weather: WeatherData, traffic: TrafficData, trends: TrendsData, insights: LocationInsights) {
    const weatherScore = this.weather.isWeatherFavorable(weather).score;
    
    let trafficScore = 100;
    if (traffic.level === 'high') trafficScore = 40;
    if (traffic.level === 'medium') trafficScore = 70;

    const trendScore = trends.relativeInterest; // 0-100

    // Ponderación: El clima y la tendencia pesan más para decidir si "es buen día para ir"
    const totalScore = Math.round((weatherScore * 0.4) + (trafficScore * 0.2) + (trendScore * 0.4));

    let recommendation = "Operación normal.";
    if (totalScore > 80) recommendation = "🔥 ¡Día de Alta Oportunidad! Refuerza personal y stock.";
    else if (totalScore < 40) recommendation = "⚠️ Baja afluencia esperada. Lanza promos flash.";

    return {
      score: totalScore,
      factors: { weather: weatherScore, traffic: trafficScore, trends: trendScore },
      recommendation
    };
  }
}