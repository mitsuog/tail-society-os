import { format, addDays } from 'date-fns';

// Interfaces
export interface WeatherData { date: string; temperature: number; condition: string; precipitation: number; humidity: number; uvIndex: number; windSpeed: number; }
export interface TrafficData { date: string; level: 'low' | 'medium' | 'high'; delay_minutes: number; incidents: number; }
export interface TrendsData { date: string; searchVolume: number; relativeInterest: number; topQueries: string[]; }
export interface LocationInsights { popularTimes: number[]; peakHours: number[]; averageVisitDuration: number; nearbyCompetitors: number; }

// 1. CLIMA (Open-Meteo - Gratis y Real)
export class WeatherService {
  private location: { lat: number; lng: number };

  constructor(location: { lat: number; lng: number }) {
    this.location = location;
  }

  async getForecast(days: number = 7): Promise<WeatherData[]> {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.location.lat}&longitude=${this.location.lng}&daily=temperature_2m_max,precipitation_sum,rain_sum,windspeed_10m_max,uv_index_max&timezone=auto&forecast_days=${days}`;
      const response = await fetch(url);
      if (!response.ok) return this.getMockWeatherData(days);
      const data = await response.json();
      return this.parseOpenMeteoData(data);
    } catch (error) {
      console.error('Weather API error:', error);
      return this.getMockWeatherData(days);
    }
  }

  isWeatherFavorable(weather: WeatherData): { score: number; factors: string[] } {
    let score = 100;
    const factors: string[] = [];
    if (weather.temperature < 10) { score -= 20; factors.push('Frío intenso'); }
    else if (weather.temperature > 35) { score -= 15; factors.push('Calor extremo'); }
    if (weather.precipitation > 5) { score -= 30; factors.push('Lluvia pronosticada'); }
    if (weather.uvIndex > 8) { score -= 5; factors.push('UV Extremo'); }
    return { score: Math.max(0, Math.min(100, score)), factors };
  }

  private parseOpenMeteoData(data: any): WeatherData[] {
    if (!data.daily) return this.getMockWeatherData(7);
    return data.daily.time.map((time: string, index: number) => ({
      date: time,
      temperature: data.daily.temperature_2m_max[index],
      condition: data.daily.precipitation_sum[index] > 5 ? 'Rain' : 'Clear',
      precipitation: data.daily.precipitation_sum[index],
      humidity: 50, // Estimado
      uvIndex: data.daily.uv_index_max[index],
      windSpeed: data.daily.windspeed_10m_max[index]
    }));
  }

  private getMockWeatherData(days: number): WeatherData[] {
    return Array.from({ length: days }).map((_, i) => ({
      date: format(addDays(new Date(), i), 'yyyy-MM-dd'),
      temperature: 24, condition: 'Clear', precipitation: 0, humidity: 40, uvIndex: 6, windSpeed: 10
    }));
  }
}

// 2. TRÁFICO (Google Distance Matrix)
export class TrafficService {
  private location: { lat: number; lng: number };
  private apiKey: string;

  constructor(location: { lat: number; lng: number }) {
    this.location = location;
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
  }

  async getTrafficConditions(): Promise<TrafficData> {
    try {
      if (!this.apiKey) return this.getMockTrafficData();
      
      // Medimos tráfico desde "Centrito Valle" hacia "Tail Society"
      const CENTRITO = "25.657257,-100.366135";
      const DESTINO = `${this.location.lat},${this.location.lng}`;
      
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${CENTRITO}&destinations=${DESTINO}&departure_time=now&traffic_model=best_guess&key=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK') return this.getMockTrafficData();
      
      const element = data.rows?.[0]?.elements?.[0];
      if (!element || element.status !== 'OK') return this.getMockTrafficData();

      const delayMins = Math.round(((element.duration_in_traffic?.value || 0) - (element.duration?.value || 0)) / 60);
      
      return {
        date: format(new Date(), 'yyyy-MM-dd'),
        level: delayMins > 10 ? 'high' : delayMins > 3 ? 'medium' : 'low',
        delay_minutes: Math.max(0, delayMins),
        incidents: 0
      };
    } catch {
      return this.getMockTrafficData();
    }
  }

  private getMockTrafficData(): TrafficData {
    return { date: format(new Date(), 'yyyy-MM-dd'), level: 'medium', delay_minutes: 0, incidents: 0 };
  }
}

// 3. TENDENCIAS (Mock)
export class TrendsService {
  private keywords: string[];
  constructor(keywords: string[]) { this.keywords = keywords; }

  async getTrends(days: number = 30): Promise<TrendsData[]> {
    return Array.from({ length: days }).map((_, i) => ({
      date: format(addDays(new Date(), - (days - i)), 'yyyy-MM-dd'),
      searchVolume: Math.round(50 + Math.sin(i/5)*20 + Math.random()*10),
      relativeInterest: Math.round(50 + Math.sin(i/5)*20),
      topQueries: this.keywords
    }));
  }
}

// 4. UBICACIÓN E INSIGHTS
export class LocationInsightsService {
  private placeId: string;
  private location: { lat: number; lng: number };
  private apiKey: string;

  constructor(placeId: string, location: { lat: number; lng: number }) {
    this.placeId = placeId;
    this.location = location;
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
  }

  async getInsights(): Promise<LocationInsights> {
    try {
      if (!this.apiKey) return this.getMockInsights();
      
      // Obtener detalles básicos
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${this.placeId}&fields=opening_hours&key=${this.apiKey}`;
      await fetch(url); 
      
      // Contar competidores cercanos para el dashboard general
      const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${this.location.lat},${this.location.lng}&radius=5000&type=pet_store&keyword=grooming&key=${this.apiKey}`;
      const nearbyRes = await fetch(nearbyUrl);
      const nearbyData = await nearbyRes.json();
      
      return {
        popularTimes: this.getMockInsights().popularTimes,
        peakHours: [11, 12, 16, 17],
        averageVisitDuration: 60,
        nearbyCompetitors: nearbyData.results?.length || 0
      };
    } catch {
      return this.getMockInsights();
    }
  }

  private getMockInsights(): LocationInsights {
    return { popularTimes: Array(24).fill(20), peakHours: [11, 17], averageVisitDuration: 60, nearbyCompetitors: 5 };
  }
}

// AGREGADOR PRINCIPAL
export class ExternalDataAggregator {
  private weather: WeatherService;
  private traffic: TrafficService;
  private trends: TrendsService;
  private location: LocationInsightsService;

  constructor(config: { location: { lat: number; lng: number }; placeId: string; keywords: string[]; }) {
    this.weather = new WeatherService(config.location);
    this.traffic = new TrafficService(config.location);
    this.trends = new TrendsService(config.keywords);
    this.location = new LocationInsightsService(config.placeId, config.location);
  }

  async getAllData(days: number = 7) {
    const [weather, trends, insights, traffic] = await Promise.all([
      this.weather.getForecast(days),
      this.trends.getTrends(30),
      this.location.getInsights(),
      this.traffic.getTrafficConditions()
    ]);
    return { weather, trends, insights, traffic };
  }

  calculateBusinessOpportunityScore(weather: WeatherData, traffic: TrafficData, trends: TrendsData) {
    const weatherScore = this.weather.isWeatherFavorable(weather).score;
    const trafficScore = traffic.level === 'low' ? 100 : traffic.level === 'medium' ? 60 : 30;
    const trendScore = trends.relativeInterest;
    
    const total = Math.round((weatherScore * 0.4) + (trafficScore * 0.2) + (trendScore * 0.4));
    
    let recommendation = "Operación normal.";
    if (total > 80) recommendation = "🔥 ¡Día de Alta Oportunidad! Refuerza personal.";
    else if (total < 40) recommendation = "⚠️ Baja afluencia esperada. Prepara promociones.";

    return { score: total, factors: { weather: weatherScore, traffic: trafficScore, trends: trendScore }, recommendation };
  }
}