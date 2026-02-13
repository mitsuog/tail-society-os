// src/app/api/intelligence/competitive/route.ts
import { NextResponse } from 'next/server';

const TAIL_SOCIETY_LOCATION = {
  lat: 25.6515,
  lng: -100.3895
};

const KNOWN_COMPETITORS = [
  'Ruffus & mila',
  'Carlota Spa Pet Grooming',
  'Pet Zone',
  'Cunino Estetica',
  'Veterinaria willys',
  'Bruna Estilistas Caninos',
  'Veterinaria Le Gua Gua',
  'Vetalia Monterrey',
  'La Casa de Renato Day Care & Spa',
  'Peluperro',
  'Dog Service',
  'Angelitos Dogs',
  'PetHome',
  'Petco Vasconcelos',
  'DogDay',
  'PetStars'
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const radius = parseInt(searchParams.get('radius') || '10000');

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    // Buscar competidores
    const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${TAIL_SOCIETY_LOCATION.lat},${TAIL_SOCIETY_LOCATION.lng}&radius=${radius}&type=pet_store&keyword=grooming+estética+canina&key=${apiKey}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== 'OK') {
      console.error('Google Places error:', searchData);
      return NextResponse.json({ 
        error: 'Google Places API error',
        details: searchData.status 
      }, { status: 500 });
    }

    // Procesar cada competidor
    const competitors = await Promise.all(
      searchData.results.slice(0, 20).map(async (place: any) => {
        const isKnown = KNOWN_COMPETITORS.some(name => 
          place.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(place.name.toLowerCase())
        );

        // Detalles completos
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,rating,user_ratings_total,price_level,formatted_address,formatted_phone_number,website,opening_hours,reviews,geometry&key=${apiKey}`;
        
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        if (detailsData.status !== 'OK') return null;

        const result = detailsData.result;
        
        const distance = calculateDistance(
          TAIL_SOCIETY_LOCATION.lat,
          TAIL_SOCIETY_LOCATION.lng,
          result.geometry.location.lat,
          result.geometry.location.lng
        );

        const reviewAnalysis = analyzeReviews(result.reviews || []);

        return {
          name: result.name,
          placeId: place.place_id,
          rating: result.rating || 0,
          reviewCount: result.user_ratings_total || 0,
          priceLevel: result.price_level || 2,
          distance: Math.round(distance),
          address: result.formatted_address || '',
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

    // Análisis SWOT
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

function analyzeReviews(reviews: any[]) {
  const strengths: Set<string> = new Set();
  const weaknesses: Set<string> = new Set();

  reviews.slice(0, 10).forEach(review => {
    const text = review.text.toLowerCase();
    
    if (review.rating >= 4) {
      if (text.includes('servicio') || text.includes('atención')) strengths.add('Excelente servicio');
      if (text.includes('calidad') || text.includes('trabajo')) strengths.add('Alta calidad');
      if (text.includes('limpio') || text.includes('limpieza')) strengths.add('Instalaciones limpias');
    } else if (review.rating <= 2) {
      if (text.includes('servicio') || text.includes('atención')) weaknesses.add('Mal servicio');
      if (text.includes('caro') || text.includes('precio')) weaknesses.add('Precios altos');
      if (text.includes('espera') || text.includes('tiempo')) weaknesses.add('Tiempos de espera');
    }
  });

  return {
    strengths: Array.from(strengths),
    weaknesses: Array.from(weaknesses)
  };
}

function generateCompetitiveAnalysis(competitors: any[]) {
  const avgRating = competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length;
  
  const swot = {
    strengths: [] as string[],
    weaknesses: [] as string[],
    opportunities: [] as string[],
    threats: [] as string[]
  };

  // Oportunidades
  const lowRatedCompetitors = competitors.filter(c => c.rating < 3.8);
  if (lowRatedCompetitors.length > 0) {
    swot.opportunities.push(`${lowRatedCompetitors.length} competidores con rating bajo - capturar clientes insatisfechos`);
  }

  // Amenazas
  const topRatedCompetitors = competitors.filter(c => c.rating >= 4.5);
  if (topRatedCompetitors.length >= 3) {
    swot.threats.push(`${topRatedCompetitors.length} competidores con rating excelente (≥4.5)`);
  }

  // Recomendaciones
  const recommendations: string[] = [];
  
  if (avgRating < 4.0) {
    recommendations.push('💡 Oportunidad: Rating promedio bajo - destaca con excelencia');
  }

  return {
    competitors: competitors.slice(0, 15),
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