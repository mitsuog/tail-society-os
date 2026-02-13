'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, TrendingUp, DollarSign, Users, Trophy, RefreshCw } from 'lucide-react';

export default function BusinessIntelligenceDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesData, competitiveData, externalData] = await Promise.all([
        fetch('/api/intelligence/sales-data?days=30').then(r => r.json()),
        fetch('/api/intelligence/competitive').then(r => r.json()),
        fetch('/api/intelligence/external-data?days=7').then(r => r.json())
      ]);

      setData({
        sales: salesData,
        competitive: competitiveData,
        external: externalData
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <Brain className="h-16 w-16 text-blue-600 animate-pulse mx-auto" />
          <p className="text-slate-600">Analizando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Business Intelligence - Tail Society
          </h1>
          <p className="text-slate-600">Análisis competitivo y factores externos</p>
        </div>
        <Button onClick={loadData} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Ingresos (30d)</p>
                <p className="text-2xl font-bold mt-1">
                  ${data?.sales?.totalRevenue?.toLocaleString() || '0'}
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Ticket Promedio</p>
                <p className="text-2xl font-bold mt-1">
                  ${data?.sales?.avgTicket?.toFixed(0) || '0'}
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Competidores</p>
                <p className="text-2xl font-bold mt-1">
                  {data?.competitive?.marketPosition?.totalCompetitors || 0}
                </p>
              </div>
              <Trophy className="h-10 w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Rating Promedio Mercado</p>
                <p className="text-2xl font-bold mt-1">
                  {data?.competitive?.marketPosition?.avgRating?.toFixed(1) || '0.0'}
                </p>
              </div>
              <Users className="h-10 w-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="competitive">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="competitive">Análisis Competitivo</TabsTrigger>
          <TabsTrigger value="sales">Rendimiento Ventas</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="competitive">
          <Card>
            <CardHeader>
              <CardTitle>Competencia en San Pedro Garza García</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.competitive?.competitors?.slice(0, 10).map((comp: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-semibold">{comp.name}</p>
                      <p className="text-sm text-slate-500">{(comp.distance / 1000).toFixed(1)} km</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-yellow-600">⭐ {comp.rating?.toFixed(1)}</p>
                      <p className="text-xs text-slate-400">{comp.reviewCount} reseñas</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Productos vs Servicios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Servicios</span>
                      <span>{data?.sales?.servicesPercentage?.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${data?.sales?.servicesPercentage || 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Productos</span>
                      <span>{data?.sales?.productsPercentage?.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div className="h-full bg-green-600 rounded-full" style={{ width: `${data?.sales?.productsPercentage || 0}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Recomendaciones Estratégicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.competitive?.recommendations?.map((rec: string, idx: number) => (
                  <div key={idx} className="p-4 bg-blue-50 rounded-lg border-l-4 border-l-blue-500">
                    <p>{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}