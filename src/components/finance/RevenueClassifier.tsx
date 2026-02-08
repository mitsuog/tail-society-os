'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  Loader2, ChevronLeft, ChevronRight, DollarSign, 
  Trophy, Calendar, RefreshCw, Lock 
} from 'lucide-react';

// Importamos el clasificador y las acciones del servidor
import RevenueClassifier from '@/components/finance/RevenueClassifier';
import { getPayrollPreview, savePayrollRun } from '@/app/actions/payroll-actions';

export default function PayrollPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false); 
  const [data, setData] = useState<any>(null);

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const endDate = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Cargar datos (Previsualización de Nómina)
  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getPayrollPreview(
        format(startDate, 'yyyy-MM-dd'), 
        format(endDate, 'yyyy-MM-dd')
      );
      setData(result);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentDate]);

  // --- Sincronizar con Zettle ---
  const handleSyncZettle = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/integrations/zettle');
      const json = await res.json();
      
      if (json.success) {
        toast.success(json.message);
        loadData(); // Recargamos para ver los nuevos montos clasificados
      } else {
        toast.error("Error Zettle: " + (json.error || json.message));
      }
    } catch (e) {
      toast.error("Error de conexión con Zettle");
    } finally {
      setSyncing(false);
    }
  };

  // --- Cerrar y Pagar ---
  const handleClosePayroll = async () => {
    if(!confirm("¿Estás seguro de cerrar esta nómina? Se generarán los recibos históricos y no podrán modificarse.")) return;
    
    try {
        await savePayrollRun(data);
        toast.success("Nómina cerrada y guardada en historial.");
        // Aquí podrías redirigir a una vista de "Detalle de Nómina Cerrada" o limpiar
    } catch (e: any) {
        toast.error(e.message);
    }
  };

  const handlePrevWeek = () => setCurrentDate(subDays(currentDate, 7));
  const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const formatMoney = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  const formatPercent = (val: number) => `${(val * 100).toFixed(2)}%`;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Nómina Semanal</h1>
          <p className="text-slate-500">Gestión de comisiones y salarios.</p>
        </div>
        
        <div className="flex gap-2 items-center">
            {/* BOTÓN CONFIGURACIÓN (CLASIFICADOR) */}
            <RevenueClassifier />

            {/* BOTÓN ZETTLE */}
            <Button variant="outline" onClick={handleSyncZettle} disabled={syncing || loading} className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 ml-1">
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Traer Ventas Zettle'}
            </Button>

            <div className="flex items-center gap-4 bg-white p-1 rounded-lg border shadow-sm ml-2">
                <Button variant="ghost" size="icon" onClick={handlePrevWeek}><ChevronLeft /></Button>
                <div className="flex items-center gap-2 px-2 w-48 justify-center">
                    <Calendar className="text-slate-400" size={16}/>
                    <span className="text-sm font-medium">
                        {format(startDate, 'd MMM', { locale: es })} - {format(endDate, 'd MMM', { locale: es })}
                    </span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleNextWeek}><ChevronRight /></Button>
            </div>
        </div>
      </div>

      {loading ? (
         <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-slate-400 h-8 w-8"/></div>
      ) : data ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900 text-white border-none shadow-xl">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-400">Ventas Totales</CardTitle></CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{formatMoney(data.financials.totalRevenue)}</div>
                    <div className="flex gap-4 mt-2 text-xs text-slate-400">
                        <span>✂️ Grooming: {formatMoney(data.financials.totalGrooming)}</span>
                        <span>🛍️ Tienda: {formatMoney(data.financials.totalStore)}</span>
                    </div>
                </CardContent>
            </Card>

            <Card className={`${data.tier.name.includes('Oro') ? 'bg-yellow-50 border-yellow-200' : 'bg-white'}`}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-600">Nivel Alcanzado</CardTitle>
                    <Trophy className={`h-5 w-5 ${data.tier.name.includes('Oro') ? 'text-yellow-600' : 'text-slate-300'}`} />
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-bold text-slate-900">{formatPercent(data.tier.percentage)}</div>
                        <Badge variant="outline" className="uppercase tracking-widest text-[10px]">{data.tier.name}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Meta siguiente: {data.tier.max_sales ? formatMoney(data.tier.max_sales + 1) : 'Máximo'}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">Nómina Total</CardTitle></CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-green-700">
                        {formatMoney(data.details.reduce((sum:any, d:any) => sum + d.total_payout, 0))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">A dispersar esta semana</p>
                </CardContent>
            </Card>
          </div>

          {/* Tabla */}
          <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead className="text-center">Asistencia</TableHead>
                        <TableHead className="text-right">Sueldo Base</TableHead>
                        <TableHead className="text-right">Comisión ({formatPercent(data.tier.percentage)})</TableHead>
                        <TableHead className="text-right">A Pagar</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.details.map((row: any) => (
                        <TableRow key={row.employee.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8 border">
                                        <AvatarFallback style={{backgroundColor: row.employee.color + '20', color: row.employee.color}} className="text-xs font-bold">
                                            {row.employee.name.substring(0,2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium text-sm">{row.employee.name}</div>
                                        <div className="text-[10px] text-slate-500 uppercase">{row.employee.role}</div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge variant={row.days_worked < 6 ? "destructive" : "secondary"} className="font-mono">
                                    {row.days_worked}/6 días
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                                {formatMoney(row.payout_base)}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex flex-col items-end">
                                    <span className="text-blue-700 font-medium">{formatMoney(row.payout_commission)}</span>
                                    <span className="text-[10px] text-slate-400">Base: {formatMoney(row.commission_base)}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900 bg-slate-50/50">
                                {formatMoney(row.total_payout)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>

          <div className="flex justify-end pt-4">
             <Button size="lg" onClick={handleClosePayroll} className="bg-green-700 hover:bg-green-800 text-white shadow-lg shadow-green-900/20">
                <Lock className="mr-2 h-4 w-4" />
                Cerrar y Guardar Nómina
             </Button>
          </div>
        </>
      ) : (
          <div className="text-center py-12 text-slate-400">No hay datos para esta semana.</div>
      )}
    </div>
  );
}