// src/lib/zettle.ts
const CLIENT_ID = process.env.ZETTLE_CLIENT_ID!;
const API_KEY = process.env.ZETTLE_API_KEY!; // Esta es la "assertion" lista para usar

// 1. Obtener Token de Acceso (Exchange)
// Canjeamos tu API Key permanente por un token temporal de 2 horas
async function getAccessToken() {
  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('client_id', CLIENT_ID);
  params.append('assertion', API_KEY);

  const response = await fetch('https://oauth.zettle.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Zettle Auth Error Details:", errorText);
    throw new Error(`Error Auth Zettle: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// 2. Obtener Ventas Recientes
export async function fetchRecentZettlePurchases(startDate: string) {
  try {
    const token = await getAccessToken();
    
    // Traemos las últimas 50 ventas desde la fecha indicada
    const url = `https://purchase.izettle.com/purchases/v2?startDate=${startDate}&limit=50&descending=true`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error Fetching Purchases: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Zettle Service Error:", error);
    return null; // Retornamos null para manejarlo suavemente en el frontend
  }
}