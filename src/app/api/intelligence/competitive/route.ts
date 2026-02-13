import { NextResponse } from 'next/server';

// 1. UBICACIÓN REAL VERIFICADA (Gómez Morín 404, Local E5)
const TAIL_SOCIETY_LOCATION = {
  lat: 25.6473805,
  lng: -100.3586705
};

// 2. LISTA DE COMPETIDORES (Ajustada a tu zona real)
const KNOWN_COMPETITORS = [
  'Petco Gómez Morín',
  'Petland San Pedro',
  'Ruffus & mila',
  'Carlota Spa Pet Grooming',
  'Pet Zone',
  'Cunino Estetica',
  'Veterinaria willys',
  'Bruna Estilistas Caninos',
  'Veterinaria Le Gua Gua',
  'Vetalia Monterrey',
  'La Casa de Renato',
  'Peluperro',
  'Dog Service',
  'Angelitos Dogs',
  'PetHome',
  'DogDay',
  'PetStars'
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Radio de 5km es suficiente para tu zona densa (Gómez Morín/Centrito)
    const radius = parseInt(searchParams.get('radius') || '5000'); 
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    
    if (!apiKey) {
      console.warn("No API Key configured for Competitive Intelligence");
      return NextResponse.json({ 
        competitors: [], 
        marketPosition: { avgRating: 0, totalCompetitors: 0 },
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        recommendations: ["Configura la API Key de Google"]
      });
    }

    // 1. Búsqueda de Lugares (Search)
    const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${TAIL_SOCIETY_LOCATION.lat},${TAIL_SOCIETY_LOCATION.lng}&radius=${radius}&type=pet_store&keyword=grooming&key=${apiKey}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    // Manejo de ZERO_RESULTS
    if (searchData.status === 'ZERO_RESULTS') {
        return NextResponse.json({
            competitors: [],
            marketPosition: { avgRating: 0, totalCompetitors: 0 },
            swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
            recommendations: ["No se encontraron competidores en el radio seleccionado. Intenta aumentar el radio."]
        });
    }

    if (searchData.status !== 'OK') {
      console.error('Google Places error:', searchData);
      return NextResponse.json({ error: 'Google API Error', details: searchData.status }, { status: 500 });
    }

    // 2. Procesar cada competidor (Detalles)
    const competitors = await Promise.all(
      searchData.results.slice(0, 15).map(async (place: any) => {
        const isKnown = KNOWN_COMPETITORS.some(name => 
          place.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(place.name.toLowerCase())
        );

        // Llamada de Detalles
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,rating,user_ratings_total,price_level,formatted_address,formatted_phone_number,website,opening_hours,reviews,geometry&key=${apiKey}`;
        
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        const result = detailsData.status === 'OK' ? detailsData.result : place;
        const geometry = result.geometry || place.geometry;
        
        const distance = calculateDistance(
          TAIL_SOCIETY_LOCATION.lat,
          TAIL_SOCIETY_LOCATION.lng,
          geometry.location.lat,
          geometry.location.lng
        );

        const reviewAnalysis = analyzeReviews(result.reviews || []);

        return {
          name: result.name,
          placeId: place.place_id,
          rating: result.rating || 0,
          reviewCount: result.user_ratings_total || 0,
          priceLevel: result.price_level || 2,
          distance: Math.round(distance),
          address: result.formatted_address || place.vicinity || '',
          phone: result.formatted_phone_number,
          website: result.website,
          openNow: result.opening_hours?.open_now || false,
          isKnownCompetitor: isKnown,
          strengths: reviewAnalysis.strengths,
          weaknesses: reviewAnalysis.weaknesses
        };
      })
    );

    const validCompetitors = competitors.filter(c => c !== null);

    // 3. Generar Análisis Final
    const analysis = generateCompetitiveAnalysis(validCompetitors);

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Competitive analysis error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// --- FUNCIONES AUXILIARES (Sin cambios) ---

function analyzeReviews(reviews: any[]) {
  const strengths: Set<string> = new Set();
  const weaknesses: Set<string> = new Set();

  if (!reviews) return { strengths: [], weaknesses: [] };

  reviews.slice(0, 5).forEach(review => {
    const text = review.text?.toLowerCase() || '';
    
    if (review.rating >= 4) {
      if (text.includes('servicio') || text.includes('atención') || text.includes('amable')) strengths.add('Excelente servicio');
      if (text.includes('calidad') || text.includes('trabajo') || text.includes('corte')) strengths.add('Alta calidad en corte');
      if (text.includes('limpio') || text.includes('olor')) strengths.add('Instalaciones limpias');
    } else if (review.rating <= 3) {
      if (text.includes('servicio') || text.includes('actitud')) weaknesses.add('Mal servicio al cliente');
      if (text.includes('caro') || text.includes('precio')) weaknesses.add('Precios altos');
      if (text.includes('espera') || text.includes('tiempo') || text.includes('tardaron')) weaknesses.add('Tiempos de espera largos');
    }
  });

  return {
    strengths: Array.from(strengths),
    weaknesses: Array.from(weaknesses)
  };
}

function generateCompetitiveAnalysis(competitors: any[]) {
  const avgRating = competitors.length > 0 
    ? competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length 
    : 0;
  
  const swot = {
    strengths: [] as string[],
    weaknesses: [] as string[],
    opportunities: [] as string[],
    threats: [] as string[]
  };

  const lowRatedCompetitors = competitors.filter(c => c.rating < 4.0);
  if (lowRatedCompetitors.length > 0) {
    swot.opportunities.push(`${lowRatedCompetitors.length} competidores cercanos tienen rating bajo (<4.0). Oportunidad de captar clientes insatisfechos.`);
  }

  const topRatedCompetitors = competitors.filter(c => c.rating >= 4.7);
  if (topRatedCompetitors.length >= 2) {
    swot.threats.push(`Hay ${topRatedCompetitors.length} competidores 'Top Tier' (Rating 4.7+) en la zona. La excelencia en el servicio es obligatoria.`);
  }

  const recommendations: string[] = [];
  if (avgRating < 4.2) {
    recommendations.push('💡 El estándar de la zona es moderado. Una campaña de "Calidad Premium" podría destacar rápidamente.');
  } else {
    recommendations.push('🔥 Zona altamente competitiva. Enfócate en la experiencia del cliente y programas de lealtad para diferenciarte.');
  }

  return {
    competitors: competitors.sort((a, b) => a.distance - b.distance),
    marketPosition: {
      avgRating,
      totalCompetitors: competitors.length
    },
    swot,
    recommendations
  };
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}