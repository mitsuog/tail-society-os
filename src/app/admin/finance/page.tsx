import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Users, ShoppingBag, Activity, BrainCircuit, CalendarClock, TrendingUp } from 'lucide-react'; // <--- AGREGADO AQUÍ
import { calculateRFM, analyzeSalesTrend, analyzeTopProducts, analyzeBusyTimes, Transaction } from '@/lib/analytics';
import { SalesForecastChart, KPICard, TopProductsList, BusyTimesHeatmap } from '@/components/finance/DashboardCharts';
import { DateRangePicker } from '@/components/finance/DateRangePicker';
import { fetchRecentZettlePurchases } from '@/lib/zettle';
import { subDays, format } from 'date-fns';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function FinancePage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { from, to } = await searchParams;

  // 1. DEFINIR FECHAS (Default: Últimos 30 días)
  const endDate = to ? new Date(to) : new Date();
  const startDate = from ? new Date(from) : subDays(new Date(), 30);
  
  // Convertir a string ISO para Zettle
  const startIso = startDate.toISOString();
  const endIso = format(endDate, 'yyyy-MM-dd'); // Zettle prefiere YYYY-MM-DD

  // 2. CARGA DE DATOS (Zettle + Catálogo)
  const [clientsRes, catalogRes] = await Promise.all([
    supabase.from('clients').select('id, full_name, email'),
    supabase.from('zettle_catalog').select('zettle_uuid, name, category')
  ]);

  // Mapas de Clasificación
  const uuidMap = new Map<string, string>();
  const nameMap = new Map<string, string>();
  catalogRes.data?.forEach((c: any) => {
      if (c.zettle_uuid) uuidMap.set(c.zettle_uuid, c.category);
      if (c.name) nameMap.set((c.name || '').trim().toLowerCase(), c.category);
  });

  // Fetch Zettle
  let zettleTransactions: any[] = [];
  try {
     const zettleRaw = await fetchRecentZettlePurchases(startIso, endIso);
     zettleTransactions = (zettleRaw as any).purchases || []; 
  } catch (e) {
     console.error("Error fetching Zettle:", e);
  }

  // 3. PROCESAMIENTO
  let totalServicesRevenue = 0;
  let totalProductsRevenue = 0;
  
  const processedTransactions: Transaction[] = zettleTransactions.map((z: any) => {
    const rawTotal = (z.amount || 0) - (z.gratuityAmount || 0);
    const amount = rawTotal / 100;

    let isGroomingTicket = false;
    let itemsList: string[] = [];
    let ticketType: 'service' | 'product' = 'product'; 

    if (z.products) {
        z.products.forEach((p: any) => {
            const pName = p.name || 'Item';
            itemsList.push(pName);
            
            let category = 'store';
            if (p.productUuid && uuidMap.has(p.productUuid)) category = uuidMap.get(p.productUuid)!;
            else if (p.variantUuid && uuidMap.has(p.variantUuid)) category = uuidMap.get(p.variantUuid)!;
            else {
                const cleanName = (pName).trim().toLowerCase();
                if (nameMap.has(cleanName)) category = nameMap.get(cleanName)!;
            }

            if (category === 'grooming') isGroomingTicket = true;
        });
    }

    if (isGroomingTicket) {
        ticketType = 'service';
        totalServicesRevenue += amount;
    } else {
        totalProductsRevenue += amount;
    }

    return {
        id: z.purchaseUUID,
        date: z.timestamp,
        amount: amount,
        clientId: undefined,
        type: ticketType,
        items: itemsList
    };
  });

  // Para RFM (Citas Supabase)
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, date, client_id, price_charged')
    .eq('status', 'completed')
    .gte('date', startIso) // Respetar filtro de fecha
    .lte('date', endDate.toISOString())
    .order('date', { ascending: false });

  const appointmentTransactions: Transaction[] = (appointments || []).map((a: any) => ({
      id: a.id,
      date: a.date,
      amount: a.price_charged || 0,
      clientId: a.client_id,
      type: 'service',
      items: []
  }));

  // 4. ALGORITMOS AVANZADOS
  const rfmSegments = calculateRFM(appointmentTransactions, clientsRes.data || []);
  const salesAnalysis = analyzeSalesTrend(processedTransactions); // Devuelve { history, forecast }
  const topProducts = analyzeTopProducts(processedTransactions.filter(t => t.type === 'product'));
  const busyTimes = analyzeBusyTimes(processedTransactions);
  
  // KPIs
  const totalRevenue = processedTransactions.reduce((sum, t) => sum + t.amount, 0);
  const ticketCount = processedTransactions.length || 1;
  const ticketAverage = totalRevenue / ticketCount;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 bg-slate-50/50 min-h-screen">
      
      {/* Header con Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
             <BrainCircuit className="text-indigo-600" /> Inteligencia de Negocio
           </h1>
           <p className="text-slate-500 text-sm">Análisis predictivo y financiero en tiempo real.</p>
        </div>
        <DateRangePicker />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard 
          title="Ingresos Totales" 
          value={`$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
          icon={<DollarSign className="h-4 w-4 text-emerald-500" />} 
          subtext="En el periodo seleccionado"
          trend={0} 
        />
        <KPICard 
          title="Ticket Promedio" 
          value={`$${Math.round(ticketAverage)}`} 
          icon={<Activity className="h-4 w-4 text-blue-500" />} 
          subtext={`${ticketCount} transacciones`}
          trend={0} 
        />
        <KPICard 
          title="Mix Servicios" 
          value={`$${totalServicesRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
          icon={<Users className="h-4 w-4 text-purple-500" />} 
          subtext="Grooming & Spa"
          trend={0} 
        />
        <KPICard 
          title="Mix Retail" 
          value={`$${totalProductsRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
          icon={<ShoppingBag className="h-4 w-4 text-orange-500" />} 
          subtext="Productos Tienda"
          trend={0} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        
        {/* IZQUIERDA: Gráficas Grandes */}
        <div className="lg:col-span-4 space-y-6">
           
           {/* 1. Predicción de Ventas */}
           <Card className="border-slate-200 shadow-sm overflow-hidden">
             <CardHeader className="bg-slate-50/50 pb-2">
               <CardTitle className="flex items-center gap-2 text-base">
                 <TrendingUp size={18} className="text-blue-600"/> Proyección de Ingresos (IA)
               </CardTitle>
               <CardDescription>
                 Histórico (Gris) + Predicción 7 días (Azul Punteado)
               </CardDescription>
             </CardHeader>
             <CardContent>
               {salesAnalysis?.history.length > 0 ? (
                 <SalesForecastChart data={salesAnalysis.history} forecast={salesAnalysis.forecast} />
               ) : (
                 <div className="h-[200px] flex items-center justify-center text-slate-400 border-dashed border-2 m-4 rounded">Sin datos suficientes</div>
               )}
             </CardContent>
           </Card>

           {/* 2. Mapa de Calor (Optimización de Staff) */}
           <Card className="border-slate-200 shadow-sm">
             <CardHeader className="pb-2">
               <CardTitle className="flex items-center gap-2 text-base">
                 <CalendarClock size={18} className="text-amber-600"/> Horarios Rentables
               </CardTitle>
               <CardDescription>Intensidad de ventas por día y bloque horario.</CardDescription>
             </CardHeader>
             <CardContent>
                <BusyTimesHeatmap data={busyTimes} />
             </CardContent>
           </Card>

        </div>

        {/* DERECHA: Listas y Segmentos */}
        <div className="lg:col-span-3 space-y-6">
           
           {/* Top Productos */}
           <Card className="border-slate-200 shadow-sm h-fit">
             <CardHeader className="pb-2">
               <CardTitle className="text-base">Top Productos</CardTitle>
             </CardHeader>
             <CardContent>
               <TopProductsList products={topProducts} />
             </CardContent>
           </Card>

           {/* Segmentación Clientes */}
           <Card className="border-slate-200 shadow-sm h-fit">
             <CardHeader className="pb-2">
               <CardTitle className="text-base">Segmentación (RFM)</CardTitle>
               <CardDescription>Salud de tu base de clientes</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
                {rfmSegments.slice(0, 5).map((client) => (
                    <div key={client.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${client.segment === 'VIP' ? 'bg-purple-500' : client.segment === 'En Riesgo' ? 'bg-red-500' : 'bg-slate-300'}`} />
                        <span className="font-medium text-slate-700 truncate max-w-[120px]">{client.name}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${client.segment === 'VIP' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                        {client.segment}
                      </span>
                    </div>
                ))}
             </CardContent>
           </Card>

        </div>
      </div>
    </div>
  );
}