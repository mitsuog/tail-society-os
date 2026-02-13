import { NextResponse } from 'next/server';
import { BUSINESS_CONFIG } from '@/lib/config';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const radius = searchParams.get('radius') || '5000';
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    
    // Usamos la ubicación definida en la configuración central
    const location = BUSINESS_CONFIG.business.location;

    if (!apiKey) {
      return NextResponse.json({ competitors: [], nearby: 0, total: 0 });
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&type=pet_store&keyword=grooming&key=${apiKey}`;
    
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google API Error: ${data.status}`);
    }

    const results = data.results || [];
    
    // Procesamos para el frontend
    const competitors = results.slice(0, 15).map((c: any) => ({
        name: c.name,
        rating: c.rating || 0,
        // Distancia aproximada (mock visual ya que nearbysearch no la da exacta sin matrix api)
        distance: Math.floor(Math.random() * 4000) + 500, 
        address: c.vicinity
    })).sort((a: any, b: any) => b.rating - a.rating);

    // CORRECCIÓN AQUÍ: Agregamos tipos explícitos a 'acc' y 'c'
    const avgRating = competitors.reduce((acc: number, c: any) => acc + c.rating, 0) / (competitors.length || 1);

    return NextResponse.json({
        competitors,
        nearby: results.length,
        total: results.length,
        marketPosition: { 
            avgRating: avgRating, 
            totalCompetitors: results.length 
        }
    });

  } catch (error) {
    console.error('Competitive API Error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}