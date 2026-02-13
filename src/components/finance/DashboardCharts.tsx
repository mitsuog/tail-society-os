'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from 'lucide-react';

// --- GRÁFICA DE VENTAS + PREDICCIÓN ---
export function SalesForecastChart({ data, forecast }: { data: any[], forecast: any[] }) {
  // Combinar histórico y futuro para calcular la escala
  const allValues = [...data.map(d => d.total), ...forecast.map(f => f.predicted)];
  const maxVal = Math.max(...allValues, 100);

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="h-[220px] min-w-[600px] flex items-end gap-2 px-2 pt-8">
        
        {/* Histórico */}
        {data.map((item) => (
          <div key={item.isoDate} className="flex-1 flex flex-col items-center gap-2 group relative">
            <div className="relative w-full flex items-end justify-center h-full gap-1">
               <div className="w-2.5 bg-slate-800 rounded-t-sm opacity-80 hover:opacity-100 transition-all" style={{ height: `${(item.total / maxVal) * 100}%` }}></div>
            </div>
            <span className="text-[9px] text-slate-400 rotate-0 truncate w-full text-center">{item.month}</span>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] p-2 rounded pointer-events-none z-10 whitespace-nowrap shadow-xl">
               <p className="font-bold">{item.month}</p>
               <p>Total: ${Math.round(item.total).toLocaleString()}</p>
            </div>
          </div>
        ))}

        {/* Separador */}
        <div className="w-px h-full bg-slate-200 border-l border-dashed border-slate-400 mx-1"></div>

        {/* Predicción */}
        {forecast.map((item) => (
          <div key={item.isoDate} className="flex-1 flex flex-col items-center gap-2 group relative">
            <div className="relative w-full flex items-end justify-center h-full gap-1">
               <div className="w-2.5 bg-blue-400/50 border border-blue-400 border-dashed rounded-t-sm hover:bg-blue-400 transition-all" style={{ height: `${(item.predicted / maxVal) * 100}%` }}></div>
            </div>
            <span className="text-[9px] text-blue-500 font-medium rotate-0 truncate w-full text-center">{item.month}</span>
             <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white text-[10px] p-2 rounded pointer-events-none z-10 whitespace-nowrap shadow-xl">
               <p className="font-bold">PROYECCIÓN</p>
               <p>Est: ${Math.round(item.predicted).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- HEATMAP DE OCUPACIÓN ---
export function BusyTimesHeatmap({ data }: { data: any[] }) {
  // Encontrar valor máximo para opacidad
  const maxVal = Math.max(...data.map(d => Math.max(d.morning, d.midday, d.afternoon, d.late)), 1);
  const getOpacity = (val: number) => Math.max(0.1, val / maxVal);

  return (
    <div className="grid grid-cols-5 gap-2 text-xs">
      <div className="font-bold text-slate-400"></div>
      <div className="text-center text-slate-500 font-medium">9-12h</div>
      <div className="text-center text-slate-500 font-medium">12-15h</div>
      <div className="text-center text-slate-500 font-medium">15-18h</div>
      <div className="text-center text-slate-500 font-medium">18-21h</div>

      {data.map((day) => (
        <div key={day.day} className="contents group">
           <div className="font-bold text-slate-700 py-2 flex items-center">{day.day}</div>
           
           {['morning', 'midday', 'afternoon', 'late'].map((slot) => (
             <div 
               key={slot} 
               className="rounded-md flex items-center justify-center text-[10px] font-bold transition-all hover:scale-105 cursor-default relative"
               style={{ 
                 backgroundColor: `rgba(59, 130, 246, ${getOpacity(day[slot])})`, // Azul dinámico
                 color: getOpacity(day[slot]) > 0.5 ? 'white' : '#1e293b'
               }}
               title={`Venta: $${Math.round(day[slot]).toLocaleString()}`}
             >
                {day[slot] > 0 ? `$${(day[slot]/1000).toFixed(1)}k` : '-'}
             </div>
           ))}
        </div>
      ))}
    </div>
  );
}

// ... KPICard y TopProductsList se mantienen IGUAL que antes ...
export function KPICard({ title, value, subtext, icon, trend }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-slate-500 flex items-center mt-1">
          {trend > 0 ? <span className="text-emerald-600 flex items-center mr-1"><TrendingUp className="h-3 w-3 mr-1" /> +{trend}%</span> : <span className="text-rose-600 flex items-center mr-1"><TrendingDown className="h-3 w-3 mr-1" /> {trend}%</span>}
          {subtext}
        </p>
      </CardContent>
    </Card>
  );
}

export function TopProductsList({ products }: { products: any[] }) {
  return (
    <div className="space-y-4">
      {products.map((p, i) => (
        <div key={p.name} className="flex items-center">
          <div className="w-8 font-bold text-slate-400 text-sm">#{i + 1}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
               <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(p.revenue / products[0].revenue) * 100}%` }} />
            </div>
          </div>
          <div className="ml-4 text-right">
             <p className="text-sm font-bold text-slate-700">${Math.round(p.revenue).toLocaleString()}</p>
             <p className="text-xs text-slate-400">{p.quantity} vts</p>
          </div>
        </div>
      ))}
    </div>
  );
}