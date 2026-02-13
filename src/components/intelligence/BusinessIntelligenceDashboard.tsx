'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Importamos Scissors y AlertTriangle que faltaban
import { Brain, TrendingUp, DollarSign, Users, Trophy, RefreshCw, AlertTriangle, Scissors } from 'lucide-react';
// Ahora este import funcionará porque creaste el archivo en el Paso 1
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
          if (!res.ok) {
            console.warn(`[BI] ${name} falló con status: ${res.status}`);
            setErrors(prev => [...prev, `${name} (${res.status})`]);
            return null;
          }
          return await res.json();
        } catch (e) {
          console.error(`[BI] Error conectando con ${name}:`, e);
          return null;
        }
      };

      const [salesData, competitiveData, externalData] = await Promise.all([
        safeFetch('/api/intelligence/sales-data?days=30', 'Ventas'),
        safeFetch('/api/intelligence/competitive', 'Competencia'),
        safeFetch('/api/intelligence/external-data?days=7', 'Datos Externos')
      ]);

      setData({
        sales: salesData || { totalRevenue: 0, avgTicket: 0, servicesPercentage: 0, productsPercentage: 0 },
        competitive: competitiveData || { competitors: [], marketPosition: { totalCompetitors: 0, avgRating: 0 }, recommendations: [] },
        external: externalData || {}
      });

    } catch (error) {
      console.error('Error crítico cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
          <div className="relative mx-auto h-16 w-16">
             <Brain className="h-16 w-16 text-blue-600 animate-pulse absolute" />
             <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping"></div>
          </div>
          <p className="text-slate-600 font-medium">Procesando inteligencia de negocio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <Brain className="text-blue-600" /> Business Intelligence
          </h1>
          <p className="text-slate-500">Insights estratégicos de Tail Society</p>
        </div>
        <div className="flex gap-2">
            {errors.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                    <AlertTriangle size={14} />
                    <span>Sin datos de: {errors.join(', ')}</span>
                </div>
            )}
            <Button onClick={loadData} variant="outline" className="gap-2 bg-white shadow-sm hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" />
            Actualizar
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Ingresos (30d)</p>
                <p className="text-2xl font-bold mt-1 text-slate-900">
                  ${data?.sales?.totalRevenue?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-full">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Ticket Promedio</p>
                <p className="text-2xl font-bold mt-1 text-slate-900">
                  ${data?.sales?.avgTicket?.toFixed(0) || '0'}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Competidores</p>
                <p className="text-2xl font-bold mt-1 text-slate-900">
                  {data?.competitive?.marketPosition?.totalCompetitors || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                 <Trophy className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Rating Mercado</p>
                <p className="text-2xl font-bold mt-1 text-slate-900">
                  {data?.competitive?.marketPosition?.avgRating?.toFixed(1) || '0.0'}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-full">
                 <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="competitive" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-white p-1 border border-slate-200 rounded-xl h-auto">
          <TabsTrigger value="competitive" className="py-2.5 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Análisis Competitivo</TabsTrigger>
          <TabsTrigger value="sales" className="py-2.5 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Rendimiento Ventas</TabsTrigger>
          <TabsTrigger value="recommendations" className="py-2.5 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Recomendaciones AI</TabsTrigger>
        </TabsList>

        <TabsContent value="competitive" className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 <Trophy size={18} className="text-yellow-500"/> Competencia en San Pedro Garza García
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!data?.competitive?.competitors || data.competitive.competitors.length === 0) ? (
                  <div className="text-center py-8 text-slate-500">
                      No se encontraron datos de competidores. Revisa la configuración de Google API.
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data?.competitive?.competitors?.slice(0, 10).map((comp: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-blue-200 transition-colors">
                        <div>
                          <p className="font-bold text-slate-800">{comp.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{(comp.distance / 1000).toFixed(1)} km</span>
                             {comp.isKnownCompetitor && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">Directo</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-amber-500 flex items-center justify-end gap-1">
                             {comp.rating?.toFixed(1)} <span className="text-xs text-amber-300">★</span>
                          </p>
                          <p className="text-xs text-slate-400">{comp.reviewCount} reseñas</p>
                        </div>
                      </div>
                    ))}
                  </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Mix de Ventas: Productos vs Servicios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 pt-2">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium flex items-center gap-2"><Scissors size={16}/> Servicios (Grooming)</span>
                      <span className="font-bold text-blue-600">{data?.sales?.servicesPercentage?.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${data?.sales?.servicesPercentage || 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium flex items-center gap-2"><DollarSign size={16}/> Productos (Retail)</span>
                      <span className="font-bold text-green-600">{data?.sales?.productsPercentage?.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-600 rounded-full transition-all duration-1000" style={{ width: `${data?.sales?.productsPercentage || 0}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Brain size={20}/> Insights Estratégicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(!data?.competitive?.recommendations || data.competitive.recommendations.length === 0) ? (
                    <p className="text-slate-500 italic">No hay recomendaciones disponibles por el momento.</p>
                ) : (
                    data?.competitive?.recommendations?.map((rec: string, idx: number) => (
                    <div key={idx} className="p-4 bg-white rounded-lg border-l-4 border-l-blue-500 shadow-sm flex items-start gap-3">
                        <div className="mt-1 bg-blue-100 p-1 rounded-full text-blue-600 shrink-0">
                            <TrendingUp size={14} />
                        </div>
                        <p className="text-slate-700 leading-relaxed">{rec}</p>
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