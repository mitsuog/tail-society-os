'use client'; 

import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
    CalendarIcon, Loader2, RefreshCw, Save, Scissors, Store, Calculator,
    ArrowUpCircle, Coins, ChevronLeft, ChevronRight, Download, Eye, AlertCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { getPayrollPreview, savePayrollRun } from '@/app/actions/payroll-actions';
import { toast } from "sonner";
import { downloadSingleReceipt, previewReceipt } from "@/utils/payroll-receipt-generator";

// Interfaces
interface PayrollDetail {
    employee: { id: string; name: string; role: string; color: string };
    days_worked: number;
    lost_days: number;
    commission_type: string;
    participation_pct: number;
    calculation_note: string;
    // Campos financieros
    full_salary_weekly?: number;
    salary_penalty?: number;     // <--- Descuento Sueldo Base
    payout_bank: number;
    payout_cash_salary: number;
    payout_commission: number;
    payout_cash_total: number;
    total_payout: number;
    commission_bonus: number;
    commission_penalty: number;  // <--- Descuento Comisión
}

interface PayrollData {
    period: { start: string; end: string };
    financials: { totalGrooming: number; totalStore: number; totalRevenue: number };
    dailyBreakdown?: any[];
    tiers_applied?: {
        grooming: { name: string; percentage: number };
        total: { name: string; percentage: number };
    };
    pools?: {
        grooming: number;
        total: number;
        redistributed?: number;
    };
    cash_flow?: {
        total_cash_needed: number;
    };
    details: PayrollDetail[];
}

export default function PayrollPage() {
  const [date, setDate] = useState<{ from: Date; to: Date }>(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return { from: start, to: end };
  });

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [data, setData] = useState<PayrollData | null>(null);

  const syncAndLoadData = async (currentDate: { from: Date; to: Date }) => {
    if (!currentDate.from || !currentDate.to) return;
    
    setLoading(true);
    try {
      const startStr = format(currentDate.from, 'yyyy-MM-dd');
      const endStr = format(currentDate.to, 'yyyy-MM-dd');

      setLoadingMessage('Sincronizando ventas...');
      const syncRes = await fetch(`/api/integrations/zettle?startDate=${startStr}&endDate=${endStr}`);
      const syncJson = await syncRes.json();
      
      if (!syncJson.success) console.warn("Advertencia de Sync:", syncJson.message);

      setLoadingMessage('Calculando nómina...');
      const result = await getPayrollPreview(startStr, endStr);
      setData(result);

    } catch (error: any) {
      toast.error(error.message || "Error al cargar datos");
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  useEffect(() => {
    if (date.from && date.to) {
        syncAndLoadData(date);
    }
  }, [date]);

  const handlePrevWeek = () => {
      setDate(prev => ({ from: subWeeks(prev.from, 1), to: subWeeks(prev.to, 1) }));
  };

  const handleNextWeek = () => {
      setDate(prev => ({ from: addWeeks(prev.from, 1), to: addWeeks(prev.to, 1) }));
  };

  const handleSavePayroll = async () => {
    if (!data) return;
    try {
      await savePayrollRun(data);
      toast.success("Nómina guardada exitosamente.");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handlePreview = (detail: PayrollDetail) => {
      if(!data) return;
      previewReceipt(detail, data.period);
  };

  const handleDownload = (detail: PayrollDetail) => {
      if(!data) return;
      downloadSingleReceipt(detail, data.period);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
  };

  // Totales
  const totalBank = data?.details.reduce((acc, item) => acc + (item.payout_bank || 0), 0) || 0;
  const totalCashSalary = data?.details.reduce((acc, item) => acc + (item.payout_cash_salary || 0), 0) || 0;
  const totalCommission = data?.details.reduce((acc, item) => acc + (item.payout_commission || 0), 0) || 0;
  // Total Deducciones
  const totalDeductionsGlobal = data?.details.reduce((acc, item) => acc + (item.salary_penalty || 0) + (item.commission_penalty || 0), 0) || 0;
  const totalNet = data?.details.reduce((acc, item) => acc + (item.total_payout || 0), 0) || 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 pb-20">
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nómina y Comisiones</h1>
          <p className="text-slate-500 mt-1">Gestión de pagos semanal</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto bg-slate-50 p-2 rounded-lg border border-slate-100">
             
             <div className="flex items-center gap-1">
                 <Button variant="ghost" size="icon" onClick={handlePrevWeek} disabled={loading}>
                    <ChevronLeft className="h-4 w-4" />
                 </Button>
                 
                 <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className={cn("w-[260px] justify-center text-center font-medium bg-white border-slate-200 shadow-sm", !date && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                        {date?.from ? (
                            date.to ? 
                            `${format(date.from, "dd MMM", { locale: es })} - ${format(date.to, "dd MMM", { locale: es })}` 
                            : format(date.from, "dd MMM", { locale: es })
                        ) : <span>Seleccionar periodo</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={(range: any) => {
                            if (range?.from) {
                                if (!range.to) setDate({ from: range.from, to: range.from });
                                else setDate({ from: range.from, to: range.to });
                            }
                        }}
                        numberOfMonths={2}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>

                  <Button variant="ghost" size="icon" onClick={handleNextWeek} disabled={loading}>
                    <ChevronRight className="h-4 w-4" />
                 </Button>
             </div>

              <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>

              <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="ghost" size="sm" onClick={() => syncAndLoadData(date)} disabled={loading} className="text-slate-500 hover:text-blue-600" title="Forzar actualización">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>

                  <Button onClick={handleSavePayroll} disabled={!data || loading} className="bg-slate-900 hover:bg-slate-800 text-white shadow-md flex-1 sm:flex-none">
                     <Save className="mr-2 h-4 w-4"/> Guardar
                  </Button>
              </div>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white/50 rounded-xl border border-dashed border-slate-200">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-slate-500 animate-pulse font-medium">{loadingMessage}</p>
        </div>
      )}

      {!loading && data && (
        <div className="animate-in fade-in duration-500 space-y-6">
          
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="overflow-hidden border-blue-100 shadow-sm">
                <div className="bg-blue-50/50 p-3 border-b border-blue-100 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
                        <Scissors className="h-4 w-4" /> Grooming
                    </div>
                    <Badge variant="secondary" className="bg-white text-blue-700 border border-blue-200 text-xs">
                        {data.tiers_applied?.grooming?.name}
                    </Badge>
                </div>
                <CardContent className="p-4">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-slate-500 text-xs">Venta Total</span>
                        <span className="text-xl font-bold text-slate-900">{formatMoney(data.financials.totalGrooming)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Pool ({(data.tiers_applied?.grooming?.percentage || 0) * 100}%)</span>
                        <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {formatMoney(data.pools?.grooming || 0)}
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden border-purple-100 shadow-sm">
                <div className="bg-purple-50/50 p-3 border-b border-purple-100 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-purple-800 font-semibold text-sm">
                        <Store className="h-4 w-4" /> Tienda
                    </div>
                    <Badge variant="secondary" className="bg-white text-purple-700 border border-purple-200 text-xs">
                        {data.tiers_applied?.total?.name}
                    </Badge>
                </div>
                <CardContent className="p-4">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-slate-500 text-xs">Venta Global</span>
                        <span className="text-xl font-bold text-slate-900">{formatMoney(data.financials.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Pool ({((data.tiers_applied?.total?.percentage || 0) * 100).toFixed(1)}%)</span>
                        <span className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                            {formatMoney(data.pools?.total || 0)}
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden border-green-100 shadow-sm bg-green-50/30">
                <div className="bg-green-100/50 p-3 border-b border-green-100 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-green-800 font-semibold text-sm">
                        <Coins className="h-4 w-4" /> Efectivo a Retirar
                    </div>
                </div>
                <CardContent className="p-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-2xl font-bold text-green-700 tracking-tight">
                            {formatMoney(data.cash_flow?.total_cash_needed || 0)}
                        </span>
                        <p className="text-[10px] text-slate-400">Suma de Sobres (Sueldo Efec. + Comisiones)</p>
                    </div>
                </CardContent>
            </Card>
          </div>

          {/* AUDITORÍA */}
          <Accordion type="single" collapsible className="w-full bg-white rounded-lg border shadow-sm px-4">
            <AccordionItem value="audit" className="border-none">
                <AccordionTrigger className="hover:no-underline py-3 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        <span>Ver desglose de ventas por día</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="pb-4">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50">
                                    <TableHead className="w-[150px] text-xs">Fecha</TableHead>
                                    <TableHead className="text-right text-xs">Grooming</TableHead>
                                    <TableHead className="text-right text-xs">Tienda</TableHead>
                                    <TableHead className="text-right font-bold text-slate-900 text-xs">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.dailyBreakdown?.map((day: any) => (
                                    <TableRow key={day.date}>
                                        <TableCell className="font-mono text-xs text-slate-500">
                                            {format(new Date(day.date + 'T12:00:00'), 'EEEE dd', { locale: es })}
                                        </TableCell>
                                        <TableCell className="text-right text-xs font-mono">{formatMoney(day.grooming)}</TableCell>
                                        <TableCell className="text-right text-xs font-mono">{formatMoney(day.store)}</TableCell>
                                        <TableCell className="text-right font-bold text-xs font-mono">{formatMoney(day.total)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* TABLA PRINCIPAL */}
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100 bg-slate-50/50">
                    <TableHead className="pl-6 h-10 w-[20%] text-xs font-bold text-slate-700">COLABORADOR</TableHead>
                    <TableHead className="text-center h-10 text-xs font-bold text-slate-700">DÍAS</TableHead>
                    <TableHead className="text-right h-10 text-xs font-bold text-slate-500">DEPÓSITO</TableHead>
                    <TableHead className="text-right h-10 text-xs font-bold text-orange-600/80">SUELDO EFEC.</TableHead>
                    <TableHead className="text-right h-10 text-xs font-bold text-green-600/80">COMISIÓN</TableHead>
                    {/* NUEVA COLUMNA DE DEDUCCIONES */}
                    <TableHead className="text-right h-10 text-xs font-bold text-red-600/80">DEDUCCIONES</TableHead>
                    <TableHead className="text-right h-10 pr-6 text-xs font-bold text-slate-900">TOTAL NETO</TableHead>
                    <TableHead className="text-center h-10 text-xs font-bold text-slate-700 w-[100px]">RECIBO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.details.map((item) => {
                      const totalDeduction = (item.salary_penalty || 0) + (item.commission_penalty || 0);
                      
                      return (
                        <TableRow key={item.employee.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                          {/* COL 1: EMPLEADO + BONOS */}
                          <TableCell className="pl-6 py-3">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm" 
                                    style={{ backgroundColor: item.employee.color || '#94a3b8' }}
                                >
                                    {item.employee.name.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-sm text-slate-900">{item.employee.name}</span>
                                    <span className="text-[10px] text-slate-400">
                                        {item.participation_pct}% {item.commission_type === 'grooming' ? 'Grooming' : 'Tienda'}
                                    </span>
                                </div>
                            </div>
                            {/* SOLO MOSTRAMOS BONO POSITIVO AQUÍ */}
                            {item.commission_bonus > 0 && (
                                <div className="ml-11 mt-1">
                                    <span className="text-[9px] text-green-700 bg-green-50 px-1 rounded flex items-center w-fit">
                                        <ArrowUpCircle size={8} className="mr-1"/> +{formatMoney(item.commission_bonus)} Bono
                                    </span>
                                </div>
                            )}
                          </TableCell>
                          
                          {/* COL 2: DÍAS */}
                          <TableCell className="text-center py-3">
                            <div className="inline-flex flex-col items-center">
                                <span className="font-bold text-sm text-slate-700">{item.days_worked}</span>
                                {item.lost_days > 0 && (
                                    <span className="text-[9px] text-red-500 font-medium flex items-center">
                                        -{item.lost_days} Faltas
                                    </span>
                                )}
                            </div>
                          </TableCell>

                          {/* COL 3: DEPÓSITO */}
                          <TableCell className="text-right py-3 font-mono text-sm text-slate-600 bg-slate-50/30 border-l border-white">
                            {formatMoney(item.payout_bank)}
                          </TableCell>

                          {/* COL 4: SUELDO EFECTIVO */}
                          <TableCell className="text-right py-3 font-mono font-medium text-sm text-orange-700 bg-orange-50/30 border-l border-white">
                            {formatMoney(item.payout_cash_salary)}
                          </TableCell>

                          {/* COL 5: COMISIONES */}
                          <TableCell className="text-right py-3 font-mono font-medium text-sm text-green-700 bg-green-50/30 border-l border-white">
                            {formatMoney(item.payout_commission)}
                          </TableCell>

                          {/* COL 6: DEDUCCIONES (NUEVO) */}
                          <TableCell className="text-right py-3 font-mono text-sm border-l border-white bg-red-50/30 text-red-600">
                            {totalDeduction > 0 ? (
                                <div className="flex flex-col items-end">
                                    <span className="font-bold">-{formatMoney(totalDeduction)}</span>
                                    <div className="flex flex-col items-end gap-0.5 mt-0.5">
                                        {(item.salary_penalty || 0) > 0 && (
                                            <span className="text-[9px] text-red-400 opacity-90 whitespace-nowrap">
                                                Sal: {formatMoney(item.salary_penalty || 0)}
                                            </span>
                                        )}
                                        {(item.commission_penalty || 0) > 0 && (
                                            <span className="text-[9px] text-red-400 opacity-90 whitespace-nowrap">
                                                Com: {formatMoney(item.commission_penalty || 0)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : <span className="text-slate-300">-</span>}
                          </TableCell>

                          {/* COL 7: TOTAL */}
                          <TableCell className="text-right pr-6 py-3">
                            <span className="text-sm font-bold text-slate-900">
                                {formatMoney(item.total_payout)}
                            </span>
                          </TableCell>

                          {/* COL 8: ACCIONES */}
                          <TableCell className="text-center py-3 pr-6">
                            <div className="flex justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <Button 
                                    variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                    onClick={(e) => { e.stopPropagation(); handlePreview(item); }}
                                    title="Ver Recibo"
                                >
                                    <Eye size={14} />
                                </Button>
                                <Button 
                                    variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-slate-100"
                                    onClick={(e) => { e.stopPropagation(); handleDownload(item); }}
                                    title="Descargar PDF"
                                >
                                    <Download size={14} />
                                </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                  })}

                  {/* FILA DE TOTALES */}
                  <TableRow className="bg-slate-900 hover:bg-slate-900 border-t-2 border-slate-800">
                      <TableCell colSpan={2} className="pl-6 py-3 font-bold text-white text-xs uppercase tracking-wider text-right pr-4">
                          Totales Generales:
                      </TableCell>
                      <TableCell className="text-right py-3 font-mono font-bold text-sm text-slate-300">
                          {formatMoney(totalBank)}
                      </TableCell>
                      <TableCell className="text-right py-3 font-mono font-bold text-sm text-orange-300">
                          {formatMoney(totalCashSalary)}
                      </TableCell>
                      <TableCell className="text-right py-3 font-mono font-bold text-sm text-green-300">
                          {formatMoney(totalCommission)}
                      </TableCell>
                      <TableCell className="text-right py-3 font-mono font-bold text-sm text-red-300">
                          -{formatMoney(totalDeductionsGlobal)}
                      </TableCell>
                      <TableCell className="text-right py-3 font-mono font-bold text-base text-white">
                          {formatMoney(totalNet)}
                      </TableCell>
                      <TableCell></TableCell>
                  </TableRow>

                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}