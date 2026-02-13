'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompetitorAnalysis } from '@/components/intelligence/CompetitorAnalysis';
import { 
  Brain, TrendingUp, DollarSign, Users, Trophy, 
  RefreshCw, AlertTriangle, Scissors, Zap 
} from 'lucide-react';

export default function BusinessIntelligenceDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setErrors([]);
    try {
      const safeFetch = async (url: string, name: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`${res.status}`);
          return await res.json();
        } catch (e) {
          console.warn(`[BI] Fallo en ${name}`, e);
          setErrors(prev => [...prev, name]);
          return null; // Fallback manejado en el estado
        }
      };

      // Carga paralela de todas las fuentes de inteligencia
      const [salesData, competitiveData, externalData] = await Promise.all([
        safeFetch('/api/intelligence/sales-data?days=30', 'Ventas'),
        safeFetch('/api/intelligence/competitive', 'Competencia'),
        safeFetch('/api/intelligence/external-data?days=7', 'Entorno')
      ]);

      setData({
        sales: salesData || { totalRevenue: 0, avgTicket: 0, servicesPercentage: 0, productsPercentage: 0 },
        competitive: competitiveData || { competitors: [], nearby: 0, total: 0, marketPosition: { avgRating: 0 }, recommendations: [] },
        external: externalData || { opportunity: { score: 50, recommendation: 'Datos limitados' } }
      });

    } catch (error) {
      console.error('Error crítico dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-4">
        <div className="relative">
           <Brain className="h-12 w-12 text-blue-600 animate-pulse" />
           <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping" />
        </div>
        <p className="text-slate-600 font-medium animate-pulse">Analizando datos del negocio...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Brain className="text-blue-600 h-8 w-8" /> 
            Business Intelligence
          </h1>
          <p className="text-sm md:text-base text-slate-500">
            Insights estratégicos para <span className="font-semibold text-blue-700">Tail Society</span>
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {errors.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 flex-1 md:flex-none">
                    <AlertTriangle size={14} />
                    <span>Revisar: {errors.join(', ')}</span>
                </div>
            )}
            <Button onClick={loadData} variant="outline" className="gap-2 shadow-sm bg-white active:scale-95 transition-transform ml-auto md:ml-0">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Ingresos (30d)" 
          value={`$${data?.sales?.totalRevenue?.toLocaleString() || '0'}`} 
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          color="emerald"
        />
        <KPICard 
          title="Ticket Promedio" 
          value={`$${data?.sales?.avgTicket?.toFixed(0) || '0'}`} 
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          color="blue"
        />
        <KPICard 
          title="Oportunidad Hoy" 
          value={`${data?.external?.opportunity?.score || 50}/100`}
          subtext={data?.external?.opportunity?.recommendation}
          icon={<Zap className="h-5 w-5 text-amber-500" />}
          color="amber"
        />
        <KPICard 
          title="Rating Mercado" 
          value={data?.competitive?.marketPosition?.avgRating?.toFixed(1) || '-'} 
          subtext={`${data?.competitive?.total || 0} competidores cerca`}
          icon={<Users className="h-5 w-5 text-purple-600" />}
          color="purple"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="competitive" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
          <TabsTrigger value="competitive" className="py-3 text-sm md:text-base data-[state=active]:bg-slate-100 data-[state=active]:text-blue-700 data-[state=active]:font-semibold rounded-lg transition-all">
            Competencia
          </TabsTrigger>
          <TabsTrigger value="sales" className="py-3 text-sm md:text-base data-[state=active]:bg-slate-100 data-[state=active]:text-blue-700 data-[state=active]:font-semibold rounded-lg transition-all">
            Ventas
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="py-3 text-sm md:text-base data-[state=active]:bg-slate-100 data-[state=active]:text-blue-700 data-[state=active]:font-semibold rounded-lg transition-all">
            AI Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="competitive" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CompetitorAnalysis 
            competitors={data?.competitive?.competitors || []}
            total={data?.competitive?.total || 0}
            nearby={data?.competitive?.nearby || 0}
          />
        </TabsContent>

        <TabsContent value="sales" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-blue-500"/> Mix de Negocio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-700">Servicios (Grooming/Spa)</span>
                    <span className="font-bold text-blue-600">{data?.sales?.servicesPercentage?.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${data?.sales?.servicesPercentage || 0}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-700">Productos (Retail)</span>
                    <span className="font-bold text-emerald-600">{data?.sales?.productsPercentage?.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${data?.sales?.productsPercentage || 0}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Brain size={20}/> Recomendaciones Estratégicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(!data?.competitive?.recommendations || data.competitive.recommendations.length === 0) ? (
                    <div className="text-center py-8 text-slate-400 italic">
                      No hay suficientes datos para generar recomendaciones aún.
                    </div>
                ) : (
                    data?.competitive?.recommendations?.map((rec: string, idx: number) => (
                    <div key={idx} className="p-4 bg-white rounded-xl border border-blue-100 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
                        <div className="mt-1 bg-blue-100 p-1.5 rounded-full text-blue-600 shrink-0">
                            <TrendingUp size={16} />
                        </div>
                        <p className="text-slate-700 leading-relaxed text-sm md:text-base">{rec}</p>
                    </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Subcomponente KPI simple
function KPICard({ title, value, icon, color, subtext }: any) {
  const colors: any = {
    emerald: 'bg-emerald-50 border-emerald-500',
    blue: 'bg-blue-50 border-blue-500',
    purple: 'bg-purple-50 border-purple-500',
    amber: 'bg-amber-50 border-amber-500'
  };

  return (
    <Card className={`border-l-4 ${colors[color]} shadow-sm hover:shadow-md transition-all`}>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtext && <p className="text-xs text-slate-500 truncate max-w-[140px]">{subtext}</p>}
          </div>
          <div className={`p-2.5 rounded-xl bg-white shadow-sm`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}