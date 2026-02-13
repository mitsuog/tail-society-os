import { NextResponse } from 'next/server';
import { ExternalDataAggregator } from '@/lib/intelligence/services';
import { BUSINESS_CONFIG } from '@/lib/config';

// ESTA ES LA CLAVE: "export async function GET" tiene que estar escrita exactamente así
export async function GET(request: Request) {
  try {
    // 1. Leemos la configuración central (BUSINESS_CONFIG)
    const location = BUSINESS_CONFIG.business.location;
    const placeId = BUSINESS_CONFIG.externalAPIs.location.googlePlaceId;
    const keywords = BUSINESS_CONFIG.externalAPIs.trends.keywords;

    // 2. Instanciamos el servicio con esos datos
    const aggregator = new ExternalDataAggregator({
      location: { lat: location.lat, lng: location.lng },
      placeId: placeId,
      keywords: keywords
    });

    // 3. Obtenemos la data (Weather, Traffic, Trends, Insights)
    const data = await aggregator.getAllData(7);

    // 4. Calculamos el puntaje de oportunidad
    const opportunity = aggregator.calculateBusinessOpportunityScore(
      data.weather[0],
      data.traffic,
      data.trends[0]
    );

    return NextResponse.json({
      ...data,
      opportunity
    });

  } catch (error) {
    console.error('External Data API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}