'use client'; // Agregamos esto para evitar problemas en Next.js App Router

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

export function CompetitorAnalysis({ competitors = [], total = 0, nearby = 0 }: CompetitorAnalysisProps) {
  // Cálculos seguros (evitando división por cero)
  const safeCompetitors = Array.isArray(competitors) ? competitors : [];
  
  const avgRating = safeCompetitors.length > 0 
    ? safeCompetitors.reduce((sum, c) => sum + c.rating, 0) / safeCompetitors.length 
    : 0;
  
  const closestCompetitor = safeCompetitors.length > 0
    ? [...safeCompetitors].sort((a, b) => a.distance - b.distance)[0]
    : null;

  const highRatedCompetitors = safeCompetitors.filter(c => c.rating >= 4.5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          Análisis de Competencia (Zona San Pedro)
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
          <h4 className="text-sm font-medium text-slate-600">Top Competidores</h4>
          {safeCompetitors.length === 0 ? (
            <div className="text-center py-6 bg-slate-50 rounded border border-dashed">
              <p className="text-sm text-slate-500">No se encontraron datos.</p>
              <p className="text-xs text-slate-400">Verifica tu API Key de Google.</p>
            </div>
          ) : (
            safeCompetitors.slice(0, 5).map((competitor, idx) => (
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
      </CardContent>
    </Card>
  );
}