'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, TrendingUp, CloudRain, Car, Search, MapPin,
  Lightbulb, AlertCircle, CheckCircle, Clock, 
  DollarSign, Users, Package, Zap, RefreshCw,
  ChevronRight, Sparkles
} from 'lucide-react';
import { 
  MultiFactorPredictor, 
  RecommendationEngine,
  type BusinessRecommendation,
  type MLPrediction
} from '@/lib/ml/business-intelligence';
import {
  ExternalDataAggregator,
  WeatherService,
  TrafficService,
  TrendsService
} from '@/lib/ml/external-data';
import { CompetitorAnalysis } from '@/components/intelligence/CompetitorAnalysis';

export default function BusinessIntelligenceDashboard() {
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<MLPrediction[]>([]);
  const [recommendations, setRecommendations] = useState<BusinessRecommendation[]>([]);
  const [externalData, setExternalData] = useState<any>(null);
  const [opportunityScore, setOpportunityScore] = useState<number>(0);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadIntelligenceData();
  }, []);

  const loadIntelligenceData = async () => {
    setLoading(true);
    try {
      // 1. Cargar datos del sistema
      const historicalData = await fetchHistoricalData();
      const clients = await fetchClients();
      const inventory = await fetchInventory();
      const employees = await fetchEmployees();

      // 2. Configurar agregador de datos externos
      const aggregator = new ExternalDataAggregator({
        location: { lat: 25.6866, lng: -100.3161 }, // Monterrey
        placeId: 'YOUR_GOOGLE_PLACE_ID',
        keyword: 'estética canina monterrey'
      });

      // 3. Obtener datos externos
      const external = await aggregator.getAllData(7);
      setExternalData(external);

      // 4. Entrenar modelo ML
      const predictor = new MultiFactorPredictor();
      const externalFactors = external.weather.map((w: any, i: number) => ({
        weather: w,
        traffic: { level: 'medium' as const, delay_minutes: 5 },
        trends: external.trends[i] || external.trends[0],
        competition: { nearbyActivity: 50, marketShare: 50 }
      }));

      await predictor.train(historicalData, externalFactors);

      // 5. Generar predicciones
      const lastDate = new Date(historicalData[historicalData.length - 1].date);
      const forecastData = await predictor.predict(lastDate, 7, externalFactors);
      setPredictions(forecastData);

      // 6. Generar recomendaciones
      const recEngine = new RecommendationEngine();
      const recs = recEngine.generateRecommendations(
        historicalData,
        clients,
        inventory,
        employees,
        forecastData
      );
      setRecommendations(recs);

      // 7. Calcular score de oportunidad
      const todayWeather = external.weather[0];
      const todayTrends = external.trends[external.trends.length - 1];
      const score = aggregator.calculateBusinessOpportunityScore(
        todayWeather,
        { 
          date: format(new Date(), 'yyyy-MM-dd'),
          level: 'medium' as const, 
          delay_minutes: 5, 
          incidents: 0 
        },
        todayTrends,
        external.insights
      );
      setOpportunityScore(score.score);

    } catch (error) {
      console.error('Error loading intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock data fetchers
  const fetchHistoricalData = async () => {
    return Array(30).fill(0).map((_, i) => ({
      date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total: 3000 + Math.random() * 5000,
      type: 'mixed'
    }));
  };

  const fetchClients = async () => [];
  const fetchInventory = async () => [];
  const fetchEmployees = async () => [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <Brain className="h-16 w-16 text-blue-600 animate-pulse mx-auto" />
          <p className="text-slate-600">Analizando datos con IA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Inteligencia de Negocios
            </h1>
          </div>
          <p className="text-slate-600">Decisiones impulsadas por Machine Learning y datos en tiempo real</p>
        </div>
        <Button onClick={loadIntelligenceData} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Score de Oportunidad */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-600">Score de Oportunidad Hoy</h3>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold text-blue-600">{opportunityScore}</span>
                <span className="text-xl text-slate-400">/100</span>
              </div>
              <Progress value={opportunityScore} className="w-64 h-2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {externalData && (
                <>
                  <OpportunityFactorCard
                    icon={<CloudRain />}
                    label="Clima"
                    value={externalData.weather[0]?.temperature || 0}
                    unit="°C"
                    favorable={externalData.weather[0]?.precipitation < 20}
                  />
                  <OpportunityFactorCard
                    icon={<Car />}
                    label="Tráfico"
                    value="Bajo"
                    favorable={true}
                  />
                  <OpportunityFactorCard
                    icon={<Search />}
                    label="Tendencias"
                    value={externalData.trends[externalData.trends.length - 1]?.relativeInterest || 50}
                    unit="/100"
                    favorable={true}
                  />
                  <OpportunityFactorCard
                    icon={<MapPin />}
                    label="Afluencia"
                    value="Alta"
                    favorable={true}
                  />
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="predictions">Predicciones</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
          <TabsTrigger value="external">Factores Externos</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Ingresos Proyectados (7d)"
              value={`$${predictions.reduce((sum, p) => sum + p.predictedRevenue, 0).toLocaleString()}`}
              icon={<DollarSign />}
              trend="+12%"
              color="green"
            />
            <MetricCard
              title="Confianza Promedio"
              value={`${Math.round(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length * 100)}%`}
              icon={<Zap />}
              trend="Alta"
              color="blue"
            />
            <MetricCard
              title="Recomendaciones Activas"
              value={recommendations.length.toString()}
              icon={<Lightbulb />}
              trend={`${recommendations.filter(r => r.priority === 'critical' || r.priority === 'high').length} urgentes`}
              color="orange"
            />
          </div>

          {/* Top Recommendations Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                Recomendaciones Prioritarias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.slice(0, 3).map(rec => (
                  <RecommendationCard key={rec.id} recommendation={rec} compact />
                ))}
              </div>
              <Button 
                variant="ghost" 
                className="w-full mt-4"
                onClick={() => setActiveTab('recommendations')}
              >
                Ver todas las recomendaciones
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictions */}
        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Predicción de Ingresos (ML Multi-Factor)</CardTitle>
              <CardDescription>
                Análisis predictivo considerando historial, clima, tráfico, tendencias y estacionalidad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PredictionChart predictions={predictions} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {predictions.map((pred, idx) => (
              <PredictionDayCard key={idx} prediction={pred} />
            ))}
          </div>
        </TabsContent>

        {/* Recommendations */}
        <TabsContent value="recommendations" className="space-y-4">
          {['critical', 'high', 'medium', 'low'].map(priority => {
            const filtered = recommendations.filter(r => r.priority === priority);
            if (filtered.length === 0) return null;

            return (
              <div key={priority}>
                <h3 className="text-sm font-medium text-slate-600 mb-3 uppercase tracking-wider">
                  Prioridad {priority === 'critical' ? '🔴 Crítica' : priority === 'high' ? '🟠 Alta' : priority === 'medium' ? '🟡 Media' : '🟢 Baja'}
                </h3>
                <div className="space-y-3">
                  {filtered.map(rec => (
                    <RecommendationCard key={rec.id} recommendation={rec} />
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* External Factors */}
        <TabsContent value="external" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WeatherCard weather={externalData?.weather || []} />
            <TrendsCard trends={externalData?.trends || []} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LocationInsightsCard insights={externalData?.insights} />
            {externalData?.competitorDetails && (
              <CompetitorAnalysis
                competitors={externalData.competitorDetails}
                total={externalData.competitors}
                nearby={externalData.competitorDetails.length}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function OpportunityFactorCard({ icon, label, value, unit, favorable }: any) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
      <div className={`p-2 rounded-lg ${favorable ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-bold text-slate-900">
          {value}{unit && <span className="text-xs text-slate-400 ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, trend, color }: any) {
  const colorClasses: any = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-slate-400 mt-1">{trend}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ recommendation, compact = false }: { recommendation: BusinessRecommendation; compact?: boolean }) {
  const priorityColors: any = {
    critical: 'border-red-500 bg-red-50',
    high: 'border-orange-500 bg-orange-50',
    medium: 'border-yellow-500 bg-yellow-50',
    low: 'border-green-500 bg-green-50'
  };

  const categoryIcons: any = {
    inventory: <Package className="h-4 w-4" />,
    staffing: <Users className="h-4 w-4" />,
    marketing: <Sparkles className="h-4 w-4" />,
    pricing: <DollarSign className="h-4 w-4" />,
    customer: <Users className="h-4 w-4" />
  };

  return (
    <Card className={`border-l-4 ${priorityColors[recommendation.priority]}`}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white rounded-lg">
            {categoryIcons[recommendation.category]}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-slate-900">{recommendation.title}</h4>
              <Badge variant="outline" className="text-xs">
                {Math.round(recommendation.confidence * 100)}% confianza
              </Badge>
            </div>
            
            {!compact && (
              <>
                <p className="text-sm text-slate-600 mb-2">{recommendation.description}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <AlertCircle className="h-3 w-3" />
                  <span><strong>Impacto:</strong> {recommendation.impact}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  <Lightbulb className="h-3 w-3" />
                  <span><strong>Acción:</strong> {recommendation.action}</span>
                </div>
                {recommendation.expectedROI && (
                  <p className="text-xs text-green-600 mt-2">
                    💰 ROI Esperado: ${recommendation.expectedROI.toLocaleString()}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PredictionChart({ predictions }: { predictions: MLPrediction[] }) {
  const maxValue = Math.max(...predictions.map(p => p.predictedRevenue));

  return (
    <div className="h-64 flex items-end gap-2">
      {predictions.map((pred, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
          <div className="relative w-full flex items-end justify-center h-full">
            <div 
              className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg cursor-pointer hover:from-blue-700 hover:to-blue-500 transition-all"
              style={{ height: `${(pred.predictedRevenue / maxValue) * 100}%` }}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl whitespace-nowrap z-10">
                <p className="font-bold mb-1">{new Date(pred.date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })}</p>
                <p>${Math.round(pred.predictedRevenue).toLocaleString()}</p>
                <p className="text-slate-300 mt-1">{Math.round(pred.confidence * 100)}% confianza</p>
                <div className="mt-2 pt-2 border-t border-slate-700 text-[10px]">
                  <p>☁️ Clima: {Math.round(pred.factors.weather * 100)}%</p>
                  <p>🚗 Tráfico: {Math.round(pred.factors.traffic * 100)}%</p>
                  <p>📈 Tendencias: {Math.round(pred.factors.trends * 100)}%</p>
                </div>
              </div>
            </div>
          </div>
          <span className="text-xs text-slate-500">
            {new Date(pred.date).toLocaleDateString('es-MX', { weekday: 'short' })}
          </span>
        </div>
      ))}
    </div>
  );
}

function PredictionDayCard({ prediction }: { prediction: MLPrediction }) {
  const date = new Date(prediction.date);
  const confidenceColor = prediction.confidence > 0.8 ? 'text-green-600' : prediction.confidence > 0.6 ? 'text-yellow-600' : 'text-red-600';

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-4 space-y-2">
        <div className="text-center">
          <p className="text-xs text-slate-500">{date.toLocaleDateString('es-MX', { weekday: 'short' })}</p>
          <p className="text-lg font-bold">{date.getDate()}</p>
        </div>
        <div className="text-center border-t pt-2">
          <p className="text-xs text-slate-500">Proyección</p>
          <p className="text-sm font-bold text-blue-600">
            ${(prediction.predictedRevenue / 1000).toFixed(1)}k
          </p>
        </div>
        <div className={`text-center text-xs ${confidenceColor} font-medium`}>
          {Math.round(prediction.confidence * 100)}%
        </div>
      </CardContent>
    </Card>
  );
}

function WeatherCard({ weather }: { weather: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudRain className="h-5 w-5" />
          Pronóstico del Clima (7 días)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {weather.slice(0, 7).map((day, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
              <span className="text-sm font-medium">
                {new Date(day.date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-sm">{day.condition}</span>
                <span className="text-sm font-bold">{Math.round(day.temperature)}°C</span>
                {day.precipitation > 20 && (
                  <Badge variant="destructive" className="text-xs">
                    {Math.round(day.precipitation)}% lluvia
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendsCard({ trends }: { trends: any[] }) {
  const recentTrends = trends.slice(-7);
  const maxInterest = Math.max(...recentTrends.map(t => t.relativeInterest));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Tendencias de Búsqueda
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-32 flex items-end gap-1">
          {recentTrends.map((trend, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-purple-200 rounded-t" style={{ height: `${(trend.relativeInterest / maxInterest) * 100}%` }}></div>
              <span className="text-[10px] text-slate-400">
                {new Date(trend.date).getDate()}
              </span>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-600 mt-4">
          Interés actual: <strong>{recentTrends[recentTrends.length - 1]?.relativeInterest || 50}/100</strong>
        </p>
      </CardContent>
    </Card>
  );
}

function LocationInsightsCard({ insights }: { insights: any }) {
  if (!insights) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Insights de Ubicación
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-slate-600 mb-2">Horarios Pico</h4>
            <div className="flex gap-2">
              {insights.peakHours.map((hour: number) => (
                <Badge key={hour} variant="outline">
                  {hour}:00
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-600 mb-2">Competencia</h4>
            <p className="text-2xl font-bold text-slate-900">{insights.nearbyCompetitors}</p>
            <p className="text-xs text-slate-500">establecimientos cercanos</p>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-medium text-slate-600 mb-2">Afluencia por Hora</h4>
          <div className="h-24 flex items-end gap-1">
            {insights.popularTimes.slice(9, 20).map((val: number, idx: number) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full bg-blue-200 rounded-t" 
                  style={{ height: `${val}%` }}
                  title={`${9 + idx}:00 - ${val}% ocupación`}
                ></div>
                <span className="text-[9px] text-slate-400">{9 + idx}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}