'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, TrendingUp, AlertCircle } from 'lucide-react';

interface Competitor {
  name: string;
  distance: number;
  rating: number;
}

interface CompetitorAnalysisProps {
  competitors: Competitor[];
  total: number;
  nearby: number;
}

export function CompetitorAnalysis({ competitors, total, nearby }: CompetitorAnalysisProps) {
  // Calcular insights
  const avgRating = competitors.length > 0 
    ? competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length 
    : 0;
  
  const closestCompetitor = competitors.length > 0
    ? competitors.reduce((min, c) => c.distance < min.distance ? c : min)
    : null;

  const highRatedCompetitors = competitors.filter(c => c.rating >= 4.5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          Análisis de Competencia (5-10 km)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">{nearby}</p>
            <p className="text-xs text-slate-500">Competidores</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">{avgRating.toFixed(1)}</p>
            <p className="text-xs text-slate-500">Rating Promedio</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">
              {closestCompetitor ? `${(closestCompetitor.distance / 1000).toFixed(1)}` : '-'}
            </p>
            <p className="text-xs text-slate-500">km más cercano</p>
          </div>
        </div>

        {/* Lista de Competidores */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-600">Principales Competidores</h4>
          {competitors.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              No se encontraron competidores en el rango especificado
            </p>
          ) : (
            competitors.slice(0, 5).map((competitor, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm text-slate-900">{competitor.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {(competitor.distance / 1000).toFixed(1)} km
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs text-slate-600 font-medium">
                        {competitor.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge 
                  variant={competitor.rating >= 4.5 ? "default" : "secondary"}
                  className="ml-2"
                >
                  {competitor.rating >= 4.5 ? '⭐ Top' : 'Standard'}
                </Badge>
              </div>
            ))
          )}
        </div>

        {/* Insights */}
        <div className="border-t pt-4 space-y-2">
          <h4 className="text-sm font-medium text-slate-600">💡 Insights</h4>
          
          {highRatedCompetitors.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-orange-900">
                  {highRatedCompetitors.length} competidores con rating ≥4.5
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Mantén calidad premium para competir en este mercado
                </p>
              </div>
            </div>
          )}

          {closestCompetitor && closestCompetitor.distance < 7000 && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-900">
                  Competidor cercano a {(closestCompetitor.distance / 1000).toFixed(1)} km
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Diferénciate con servicios exclusivos o mejor atención
                </p>
              </div>
            </div>
          )}

          {avgRating < 4.0 && (
            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
              <Star className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-green-900">
                  Oportunidad: Rating promedio bajo ({avgRating.toFixed(1)})
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Puedes destacar fácilmente con excelente servicio
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}