import { NextResponse } from 'next/server';
import { ExternalDataAggregator } from '@/lib/intelligence/services';
import { BUSINESS_CONFIG } from '@/lib/config';

export async function GET(request: Request) {
  try {
    // 1. Extraer configuración
    const location = BUSINESS_CONFIG.business.location;
    const placeId = BUSINESS_CONFIG.externalAPIs.location.googlePlaceId;
    const keywords = BUSINESS_CONFIG.externalAPIs.trends.keywords;

    // 2. Instanciar Agregador
    const aggregator = new ExternalDataAggregator({
      location: { lat: location.lat, lng: location.lng },
      placeId: placeId,
      keywords: keywords
    });

    // 3. Obtener Datos
    const data = await aggregator.getAllData(7);

    // 4. Calcular Oportunidad
    // FIX: Aseguramos que el objeto de tráfico tenga la fecha requerida
    const trafficData = data.traffic || { 
      date: new Date().toISOString(), // <--- ESTO ES LO QUE FALTABA
      level: 'medium', 
      delay_minutes: 0, 
      incidents: 0 
    };

    const opportunity = aggregator.calculateBusinessOpportunityScore(
      data.weather[0],
      trafficData, 
      data.trends[0]
    );

    return NextResponse.json({
      ...data,
      opportunity
    });

  } catch (error) {
    console.error('External Data API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch external data' }, { status: 500 });
  }
}