// src/lib/zettle.ts

const CLIENT_ID = process.env.ZETTLE_CLIENT_ID!;
const API_KEY = process.env.ZETTLE_API_KEY!;

// 1. Obtener Token de Acceso
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
    const txt = await response.text();
    throw new Error(`Error Auth Zettle (${response.status}): ${txt}`);
  }
  const data = await response.json();
  return data.access_token;
}

// 2. Traer Ventas (Con Paginación Automática y Cierre de Día Correcto)
export async function fetchRecentZettlePurchases(startDate: string, endDate?: string) {
  try {
    const token = await getAccessToken();
    let allPurchases: any[] = [];
    let moreDataAvailable = true;
    let lastHash = '';

    // AJUSTE DE FECHA: Asegurar que incluya hasta el último segundo del día final
    let finalEndDate = endDate;
    if (endDate && endDate.length === 10) { 
        finalEndDate = `${endDate}T23:59:59`;
    }

    console.log(`📡 Zettle Sync: Buscando desde ${startDate} hasta ${finalEndDate || 'Hoy'}`);

    while (moreDataAvailable) {
        let url = `https://purchase.izettle.com/purchases/v2?startDate=${startDate}&limit=100&descending=true`;
        
        if (finalEndDate) url += `&endDate=${finalEndDate}`;
        if (lastHash) url += `&lastPurchaseHash=${lastHash}`;

        const response = await fetch(url, {
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            }
        });

        if (!response.ok) throw new Error(`Error Zettle API: ${response.statusText}`);
        
        const data = await response.json();
        
        if (data.purchases && data.purchases.length > 0) {
            allPurchases = [...allPurchases, ...data.purchases];
            lastHash = data.lastPurchaseHash; // Llave para siguiente página
            
            // Si devuelve menos de 100, es la última página
            if (data.purchases.length < 100) moreDataAvailable = false;
        } else {
            moreDataAvailable = false;
        }
    }

    console.log(`✅ Zettle Sync: ${allPurchases.length} transacciones recuperadas.`);
    return { purchases: allPurchases };

  } catch (error) {
    console.error("❌ Zettle Service Error:", error);
    return { purchases: [] };
  }
}

// 3. NUEVO: Traer Librería de Productos (Para el Catálogo Maestro)
export async function fetchZettleProductLibrary() {
  try {
    const token = await getAccessToken();
    
    // Endpoint oficial para traer todos los productos de la cuenta
    const response = await fetch('https://products.izettle.com/organizations/self/library', {
        headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
        }
    });

    if (!response.ok) throw new Error(`Error fetching library: ${response.statusText}`);
    
    const data = await response.json();
    return data.products || []; 

  } catch (error) {
    console.error("Zettle Library Error:", error);
    return [];
  }
}