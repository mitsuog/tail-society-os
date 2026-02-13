import { differenceInDays, parseISO, format, addDays, getDay, getHours } from 'date-fns';
import { es } from 'date-fns/locale';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  clientId?: string; 
  type: 'service' | 'product';
  items: string[]; 
}

export interface ClientProfile {
  id: string;
  name: string;
  totalSpent: number;
  visitCount: number;
  lastVisit: string;
  segment: 'VIP' | 'Leal' | 'Prometedor' | 'Nuevo' | 'En Riesgo' | 'Perdido';
  score: number; 
}

// --- 1. RFM (Segmentación) ---
export function calculateRFM(transactions: Transaction[], clients: any[]): ClientProfile[] {
  const now = new Date();
  const clientMap = new Map<string, ClientProfile>();

  transactions.forEach(t => {
    if (!t.clientId) return;
    if (!clientMap.has(t.clientId)) {
      const clientName = clients.find(c => c.id === t.clientId)?.full_name || 'Desconocido';
      clientMap.set(t.clientId, {
        id: t.clientId, name: clientName, totalSpent: 0, visitCount: 0, lastVisit: t.date, segment: 'Nuevo', score: 0
      });
    }
    const profile = clientMap.get(t.clientId)!;
    profile.totalSpent += t.amount;
    profile.visitCount += 1;
    if (new Date(t.date) > new Date(profile.lastVisit)) profile.lastVisit = t.date;
  });

  return Array.from(clientMap.values()).map(profile => {
    const recencyDays = differenceInDays(now, parseISO(profile.lastVisit));
    let segment: ClientProfile['segment'] = 'Nuevo';
    if (profile.totalSpent > 5000 && recencyDays < 45) segment = 'VIP';
    else if (profile.visitCount > 8 && recencyDays < 60) segment = 'Leal';
    else if (profile.visitCount > 2 && recencyDays < 30) segment = 'Prometedor';
    else if (recencyDays > 90 && profile.totalSpent > 2000) segment = 'En Riesgo';
    else if (recencyDays > 120) segment = 'Perdido';
    return { ...profile, segment };
  }).sort((a, b) => b.totalSpent - a.totalSpent); 
}

// --- 2. TENDENCIAS + PREDICCIÓN (Regresión Lineal) ---
export function analyzeSalesTrend(transactions: Transaction[]) {
  const trendMap = new Map<string, { isoDate: string; month: string; services: number; products: number; total: number }>();

  // Agrupación
  transactions.forEach(t => {
    const dateObj = new Date(t.date);
    if (isNaN(dateObj.getTime())) return;
    const dayKey = dateObj.toISOString().split('T')[0]; 
    const label = format(dateObj, 'dd MMM', { locale: es });

    if (!trendMap.has(dayKey)) {
      trendMap.set(dayKey, { isoDate: dayKey, month: label, services: 0, products: 0, total: 0 });
    }
    const entry = trendMap.get(dayKey)!;
    entry.total += t.amount;
    if (t.type === 'service') entry.services += t.amount;
    else entry.products += t.amount;
  });

  const historicalData = Array.from(trendMap.values()).sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  // --- ALGORITMO: Regresión Lineal Simple (Mínimos Cuadrados) ---
  // y = mx + b
  const n = historicalData.length;
  if (n < 2) return { history: historicalData, forecast: [] };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  historicalData.forEach((point, i) => {
    const x = i; // Día indexado (0, 1, 2...)
    const y = point.total;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Generar Proyección (Próximos 7 días)
  const forecast = [];
  const lastDate = new Date(historicalData[n - 1].isoDate);

  for (let i = 1; i <= 7; i++) {
    const futureX = n - 1 + i;
    const predictedAmount = slope * futureX + intercept;
    const futureDate = addDays(lastDate, i);
    
    forecast.push({
      isoDate: futureDate.toISOString().split('T')[0],
      month: format(futureDate, 'dd MMM', { locale: es }),
      predicted: Math.max(0, predictedAmount) // No ventas negativas
    });
  }

  return { history: historicalData, forecast };
}

// --- 3. TOP PRODUCTOS ---
export function analyzeTopProducts(transactions: Transaction[]) {
  const productMap = new Map<string, { name: string; revenue: number; quantity: number }>();
  transactions.filter(t => t.type === 'product').forEach(t => {
    t.items.forEach(item => {
      if (!productMap.has(item)) productMap.set(item, { name: item, revenue: 0, quantity: 0 });
      const p = productMap.get(item)!;
      p.revenue += (t.amount / (t.items.length || 1)); 
      p.quantity += 1;
    });
  });
  return Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10); 
}

// --- 4. MAPA DE CALOR (Horarios Rentables) ---
export function analyzeBusyTimes(transactions: Transaction[]) {
  // Matriz 7 días x 4 bloques horarios (Mañana, Mediodía, Tarde, Cierre)
  const heatmap = Array(7).fill(0).map(() => ({ morning: 0, midday: 0, afternoon: 0, late: 0, total: 0 }));
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  transactions.forEach(t => {
    const d = new Date(t.date);
    const dayIdx = getDay(d); // 0-6
    const hour = getHours(d);

    let slot: 'morning' | 'midday' | 'afternoon' | 'late' = 'morning';
    if (hour >= 9 && hour < 12) slot = 'morning';
    else if (hour >= 12 && hour < 15) slot = 'midday';
    else if (hour >= 15 && hour < 18) slot = 'afternoon';
    else if (hour >= 18) slot = 'late';

    heatmap[dayIdx][slot] += t.amount;
    heatmap[dayIdx].total += t.amount;
  });

  return heatmap.map((val, i) => ({ day: days[i], ...val }));
}