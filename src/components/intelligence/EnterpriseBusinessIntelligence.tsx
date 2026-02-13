'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, TrendingUp, DollarSign, Users, Calendar,
  Trophy, AlertTriangle, RefreshCw, TrendingDown,
  Clock, CheckCircle, XCircle, UserX, Zap,
  Target, Lightbulb, BarChart3, PieChart
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function EnterpriseBusinessIntelligence() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeView, setActiveView] = useState('executive');
  const [includeFinancial, setIncludeFinancial] = useState(true);

  useEffect(() => {
    loadComprehensiveData();
  }, [includeFinancial]);

  const loadComprehensiveData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/intelligence/comprehensive?days=30&includeFinancial=${includeFinancial}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error loading BI data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <Brain className="h-20 w-20 text-blue-600 animate-pulse mx-auto" />
            <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping" />
          </div>
          <div>
            <p className="text-xl font-semibold text-slate-900">Procesando Inteligencia de Negocios</p>
            <p className="text-sm text-slate-500 mt-2">Analizando citas, clientes, ventas, ML predictions...</p>
          </div>
        </div>
      </div>
    );
  }

  const hasFinancialAccess = data?.permissions?.hasFinancialAccess;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Business Intelligence
                </h1>
                <p className="text-slate-600">Sistema Empresarial de Análisis Integrado</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-white">
              Rol: {data?.permissions?.role}
            </Badge>
            <Button onClick={loadComprehensiveData} className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Citas (30d)"
            value={data?.metrics?.appointments?.total || 0}
            change={data?.metrics?.appointments?.trend}
            icon={<Calendar className="h-6 w-6" />}
            color="blue"
          />
          
          <KPICard
            title="Tasa de Completación"
            value={`${data?.metrics?.appointments?.completionRate || 0}%`}
            subtitle={`${data?.metrics?.appointments?.byStatus?.completed || 0} completadas`}
            icon={<CheckCircle className="h-6 w-6" />}
            color="green"
          />

          {hasFinancialAccess && data?.metrics?.financial && (
            <>
              <KPICard
                title="Ingresos (30d)"
                value={`$${(data.metrics.financial.totalRevenue || 0).toLocaleString()}`}
                change={data.metrics.financial.trend}
                icon={<DollarSign className="h-6 w-6" />}
                color="emerald"
              />
              
              <KPICard
                title="Ticket Promedio"
                value={`$${data.metrics.financial.avgTransaction || 0}`}
                subtitle={`${data.metrics.financial.transactionCount} transacciones`}
                icon={<TrendingUp className="h-6 w-6" />}
                color="purple"
              />
            </>
          )}

          {!hasFinancialAccess && (
            <>
              <KPICard
                title="Clientes Activos"
                value={data?.metrics?.clients?.activeClients || 0}
                subtitle={`${data?.metrics?.clients?.total || 0} total`}
                icon={<Users className="h-6 w-6" />}
                color="purple"
              />
              
              <KPICard
                title="Retención"
                value={`${data?.metrics?.clients?.retentionRate || 0}%`}
                icon={<Target className="h-6 w-6" />}
                color="orange"
              />
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeView} onValueChange={setActiveView} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 bg-white p-1 border rounded-xl h-auto">
            {hasFinancialAccess && (
              <TabsTrigger value="executive" className="py-3">
                💼 Vista Ejecutiva
              </TabsTrigger>
            )}
            <TabsTrigger value="operations" className="py-3">
              📊 Operaciones
            </TabsTrigger>
            <TabsTrigger value="clients" className="py-3">
              👥 Clientes
            </TabsTrigger>
            <TabsTrigger value="predictions" className="py-3">
              🔮 Predicciones ML
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="py-3">
              💡 Recomendaciones
            </TabsTrigger>
          </TabsList>

          {/* Vista Ejecutiva (Solo con acceso financiero) */}
          {hasFinancialAccess && (
            <TabsContent value="executive" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Mix de Ingresos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPie>
                        <Pie
                          data={[
                            { name: 'Servicios Grooming', value: data?.metrics?.financial?.groomingRevenue || 0 },
                            { name: 'Productos Retail', value: data?.metrics?.financial?.storeRevenue || 0 }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: $${entry.value.toLocaleString()}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[0, 1].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Métricas Financieras Clave</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Servicios</span>
                        <span className="text-sm font-bold text-blue-600">
                          {Math.round(data?.metrics?.financial?.groomingPercentage || 0)}%
                        </span>
                      </div>
                      <Progress value={data?.metrics?.financial?.groomingPercentage || 0} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Productos</span>
                        <span className="text-sm font-bold text-green-600">
                          {Math.round(data?.metrics?.financial?.storePercentage || 0)}%
                        </span>
                      </div>
                      <Progress value={data?.metrics?.financial?.storePercentage || 0} className="h-2" />
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Promedio Diario</span>
                        <span className="text-xl font-bold text-slate-900">
                          ${data?.metrics?.financial?.dailyAvg?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Vista Operaciones */}
          <TabsContent value="operations" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Estado de Citas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Completadas</span>
                      </div>
                      <span className="text-2xl font-bold text-green-600">
                        {data?.metrics?.appointments?.byStatus?.completed || 0}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Agendadas</span>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">
                        {data?.metrics?.appointments?.byStatus?.scheduled || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-orange-600" />
                        <span className="font-medium">Canceladas</span>
                      </div>
                      <span className="text-2xl font-bold text-orange-600">
                        {data?.metrics?.appointments?.byStatus?.cancelled || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <UserX className="h-5 w-5 text-red-600" />
                        <span className="font-medium">No Show</span>
                      </div>
                      <span className="text-2xl font-bold text-red-600">
                        {data?.metrics?.appointments?.byStatus?.noShow || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Horarios Pico</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600 mb-4">
                      Horas con mayor demanda de citas:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {data?.metrics?.appointments?.peakHours?.map((hour: number) => (
                        <Badge key={hour} variant="secondary" className="text-lg px-4 py-2">
                          {hour}:00
                        </Badge>
                      ))}
                    </div>

                    <div className="pt-6">
                      <p className="text-sm font-medium text-slate-700 mb-2">Días más ocupados:</p>
                      {data?.metrics?.appointments?.busiestDays?.map((day: any) => (
                        <div key={day.day} className="flex items-center justify-between p-2 bg-slate-50 rounded mb-2">
                          <span className="font-medium">{day.day}</span>
                          <Badge>{day.count} citas</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top 10 Servicios</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.metrics?.appointments?.topServices || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vista Clientes */}
          <TabsContent value="clients" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Segmentación RFM</CardTitle>
                  <CardDescription>Recencia, Frecuencia, Valor Monetario</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <SegmentCard
                      label="VIP"
                      count={data?.metrics?.clients?.segments?.vip || 0}
                      color="purple"
                      description="Alto valor, activos"
                    />
                    <SegmentCard
                      label="Leales"
                      count={data?.metrics?.clients?.segments?.loyal || 0}
                      color="blue"
                      description="Visitas frecuentes"
                    />
                    <SegmentCard
                      label="Prometedores"
                      count={data?.metrics?.clients?.segments?.promising || 0}
                      color="green"
                      description="Crecimiento potencial"
                    />
                    <SegmentCard
                      label="En Riesgo"
                      count={data?.metrics?.clients?.segments?.atRisk || 0}
                      color="orange"
                      description="Requieren atención"
                    />
                    <SegmentCard
                      label="Perdidos"
                      count={data?.metrics?.clients?.segments?.lost || 0}
                      color="red"
                      description=">120 días sin visita"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Métricas de Clientes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Tasa de Retención</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {data?.metrics?.clients?.retentionRate || 0}%
                      </span>
                    </div>
                    <Progress value={data?.metrics?.clients?.retentionRate || 0} className="h-2" />
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Lifetime Value Promedio</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${data?.metrics?.clients?.avgLifetimeValue?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Clientes Activos</span>
                      <span className="text-2xl font-bold text-slate-900">
                        {data?.metrics?.clients?.activeClients || 0}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      De {data?.metrics?.clients?.total || 0} totales
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Predicciones ML */}
          <TabsContent value="predictions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Predicciones Machine Learning (7 días)
                </CardTitle>
                <CardDescription>
                  Basado en patrones históricos, tendencias y factores externos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                  {data?.predictions?.map((pred: any, idx: number) => (
                    <PredictionCard key={idx} prediction={pred} hasFinancialAccess={hasFinancialAccess} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recomendaciones */}
          <TabsContent value="recommendations" className="space-y-4">
            {data?.recommendations?.map((rec: any) => (
              <Card key={rec.id} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Lightbulb className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{rec.title}</h3>
                        <Badge variant={rec.priority === 'critical' ? 'destructive' : 'default'}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-slate-600 mb-3">{rec.insight}</p>
                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-700">Acción Recomendada</p>
                          <p className="text-sm text-slate-600">{rec.action}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Impacto Esperado</p>
                          <p className="text-sm font-semibold text-green-600">{rec.expectedImpact}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Alertas Section */}
        {data?.alerts && data.alerts.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <AlertTriangle className="h-5 w-5" />
                Alertas Activas ({data.alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.alerts.map((alert: any) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{alert.title}</p>
                      <p className="text-sm text-slate-600">{alert.message}</p>
                    </div>
                    {alert.action && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={alert.action.url}>{alert.action.label}</a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ===== COMPONENTES AUXILIARES =====

function KPICard({ title, value, change, subtitle, icon, color }: any) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  return (
    <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-bold mt-2 text-slate-900">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {change >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(change).toFixed(1)}%
                </span>
              </div>
            )}
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} bg-opacity-10`}>
            <div className={`${colorClasses[color as keyof typeof colorClasses].replace('bg-', 'text-')}`}>
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SegmentCard({ label, count, color, description }: any) {
  const colors = {
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    red: 'bg-red-100 text-red-700 border-red-200'
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${colors[color as keyof typeof colors]}`}>
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs opacity-75">{description}</p>
      </div>
      <span className="text-2xl font-bold">{count}</span>
    </div>
  );
}

function PredictionCard({ prediction, hasFinancialAccess }: any) {
  const confidence = Math.round(prediction.confidence * 100);
  
  return (
    <Card className="text-center hover:shadow-lg transition-shadow">
      <CardContent className="pt-4 space-y-2">
        <div>
          <p className="text-xs text-slate-500">{prediction.dayOfWeek}</p>
          <p className="text-lg font-bold">{new Date(prediction.date).getDate()}</p>
        </div>
        <div className="border-t pt-2">
          <p className="text-xs text-slate-500">Citas</p>
          <p className="text-xl font-bold text-blue-600">{prediction.predictedAppointments}</p>
        </div>
        {hasFinancialAccess && prediction.predictedRevenue && (
          <div className="border-t pt-2">
            <p className="text-xs text-slate-500">Revenue</p>
            <p className="text-sm font-bold text-green-600">
              ${(prediction.predictedRevenue / 1000).toFixed(1)}k
            </p>
          </div>
        )}
        <div className="border-t pt-2">
          <p className="text-xs text-slate-500">Confianza</p>
          <p className="text-xs font-semibold text-slate-700">{confidence}%</p>
        </div>
      </CardContent>
    </Card>
  );
}