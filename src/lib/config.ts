// ==========================================
// CONFIGURACIÓN CENTRAL DEL NEGOCIO (Tail Society)
// ==========================================

export const BUSINESS_CONFIG = {
  // Información del Negocio
  business: {
    name: 'Tail Society',
    location: {
      // Coordenadas VERIFICADAS: Av. Manuel Gomez Morin 404, San Pedro
      lat: 25.6473805,
      lng: -100.3586705,
      address: 'Av. Manuel Gomez Morin 404 Local E5, San Pedro Garza Garcia',
      timezone: 'America/Monterrey'
    },
    hours: {
      monday: { open: '10:00', close: '18:30' },
      tuesday: { open: '10:00', close: '18:30' },
      wednesday: { open: '10:00', close: '18:30' },
      thursday: { open: '10:00', close: '18:30' },
      friday: { open: '10:00', close: '18:30' },
      saturday: { open: '10:00', close: '18:00' },
      sunday: null // Cerrado
    }
  },

  // Configuración de APIs Externas
  externalAPIs: {
    weather: {
      provider: 'open-meteo', // Gratis, sin key
      updateInterval: 3 * 60 * 60 * 1000, 
    },
    traffic: {
      provider: 'google',
      updateInterval: 15 * 60 * 1000,
    },
    trends: {
      provider: 'mock', // Google Trends no tiene API gratis
      keywords: ['estética canina san pedro', 'grooming', 'spgg mascotas'],
      updateInterval: 24 * 60 * 60 * 1000 
    },
    location: {
      // ID de Google Maps para tu local
      googlePlaceId: process.env.NEXT_PUBLIC_GOOGLE_PLACE_ID || 'ChIJGzVIMwy9YoYRl1NSTHIuX9w',
      updateInterval: 7 * 24 * 60 * 60 * 1000 
    }
  },

  // Pesos para el Score de Oportunidad
  opportunityScore: {
    weights: {
      weather: 0.3,
      traffic: 0.2,
      trends: 0.3,
      location: 0.2
    }
  }
};