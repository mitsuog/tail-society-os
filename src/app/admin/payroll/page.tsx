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
    ArrowUpCircle, Coins, ChevronLeft, ChevronRight, Download, Eye, AlertTriangle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { getPayrollPreview, savePayrollRun } from '@/app/actions/payroll-actions';
import { toast } from "sonner";
import { downloadSingleReceipt, previewReceipt } from "@/utils/payroll-receipt-generator";

// --- Interfaces ---
interface PayrollDetail {
    employee: { id: string; name: string; role: string; color: string };
    days_worked: number;
    lost_days: number;
    commission_type: string;
    participation_pct: number;
    calculation_note: string;
    full_salary_weekly?: number;
    salary_penalty?: number;
    payout_bank: number;
    payout_cash_salary: number;
    payout_commission: number;
    payout_cash_total: number;
    total_payout: number;
    commission_bonus: number;
    commission_penalty: number;
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
  // Estado inicial: Semana actual
  const [date, setDate] = useState<{ from: Date; to: Date } | undefined>(() => {
    const now = new Date();
    return { 
        from: startOfWeek(now, { weekStartsOn: 1 }), 
        to: endOfWeek(now, { weekStartsOn: 1 }) 
    };
  });

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [data, setData] = useState<PayrollData | null>(null);

  // --- LÓGICA DE SINCRONIZACIÓN Y CARGA ---
  const syncAndLoadData = async (currentDate: { from: Date; to: Date } | undefined) => {
    if (!currentDate?.from || !currentDate?.to) return;
    
    setLoading(true);
    try {
      const startStr = format(currentDate.from, 'yyyy-MM-dd');
      const endStr = format(currentDate.to, 'yyyy-MM-dd');

      // 1. SINCRONIZAR ZETTLE
      setLoadingMessage('Sincronizando ventas con Zettle...');
      
      try {
          const syncRes = await fetch(`/api/integrations/zettle?startDate=${startStr}&endDate=${endStr}`, {
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache' }
          });

          if (!syncRes.ok) {
              console.error("Zettle API Error:", syncRes.status, await syncRes.text());
              toast.warning("Error conectando con Zettle. Se usarán datos locales.");
          } else {
              const syncJson = await syncRes.json();
              if (!syncJson.success) {
                  console.warn("Zettle Sync Warning:", syncJson.message);
                  toast.info(`Nota Zettle: ${syncJson.message}`);
              }
          }
      } catch (networkError) {
          console.error("Fallo de red Zettle:", networkError);
          toast.warning("Sin conexión a Zettle. Calculando con datos existentes.");
      }

      // 2. CALCULAR NÓMINA
      setLoadingMessage('Calculando comisiones y nómina...');
      const result = await getPayrollPreview(startStr, endStr);
      setData(result);

    } catch (error: any) {
      toast.error(error.message || "Error crítico al cargar nómina");
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  useEffect(() => {
    if (date?.from && date?.to) {
        syncAndLoadData(date);
    }
  }, [date]);

  const handlePrevWeek = () => {
      if (date?.from && date?.to) {
          setDate({ from: subWeeks(date.from, 1), to: subWeeks(date.to, 1) });
      }
  };

  const handleNextWeek = () => {
      if (date?.from && date?.to) {
          setDate({ from: addWeeks(date.from, 1), to: addWeeks(date.to, 1) });
      }
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

  const handlePreview = (detail: PayrollDetail) => { if(data) previewReceipt(detail, data.period); };
  const handleDownload = (detail: PayrollDetail) => { if(data) downloadSingleReceipt(detail, data.period); };
  const formatMoney = (amount: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

  // Cálculos de Totales
  const totalBank = data?.details.reduce((acc, item) => acc + (item.payout_bank || 0), 0) || 0;
  const totalCashSalary = data?.details.reduce((acc, item) => acc + (item.payout_cash_salary || 0), 0) || 0;
  const totalCommission = data?.details.reduce((acc, item) => acc + (item.payout_commission || 0), 0) || 0;
  const totalDeductionsGlobal = data?.details.reduce((acc, item) => acc + (item.salary_penalty || 0) + (item.commission_penalty || 0), 0) || 0;
  const totalNet = data?.details.reduce((acc, item) => acc + (item.total_payout || 0), 0) || 0;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50/30">
        
        <div className="flex-1 overflow-y-auto w-full">
            <div className="max-w-7xl mx-auto p-2 md:p-6 space-y-4 md:space-y-8 pb-24">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 md:p-6 rounded-xl border shadow-sm">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Nómina</h1>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">Gestión de pagos semanal</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-1 w-full sm:w-auto justify-between sm:justify-start">
                        <Button variant="ghost" size="icon" onClick={handlePrevWeek} disabled={loading}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    className={cn("w-full sm:w-[260px] justify-center text-center font-medium bg-white border-slate-200 shadow-sm text-xs md:text-sm truncate px-2", !date && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-3 w-3 md:h-4 md:w-4 text-slate-500 shrink-0" />
                                    {date?.from ? (
                                        date.to ? 
                                        `${format(date.from, "dd MMM", { locale: es })} - ${format(date.to, "dd MMM", { locale: es })}` 
                                        : format(date.from, "dd MMM", { locale: es })
                                    ) : <span>Seleccionar periodo</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-50" align="start">
                                {/* FIX: initialFocus eliminado y onSelect tipado manualmente */}
                                <Calendar
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={(range) => {
                                        if (range?.from) {
                                            setDate({ 
                                                from: range.from, 
                                                to: range.to || range.from 
                                            });
                                        }
                                    }}
                                    numberOfMonths={1}
                                    locale={es}
                                    weekStartsOn={1}
                                    className="rounded-md border shadow pointer-events-auto"
                                />
                            </PopoverContent>
                        </Popover>

                        <Button variant="ghost" size="icon" onClick={handleNextWeek} disabled={loading}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="hidden sm:block h-6 w-px bg-slate-200 mx-1"></div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="ghost" size="sm" onClick={() => syncAndLoadData(date)} disabled={loading} className="text-slate-500 hover:text-blue-600 flex-1 sm:flex-none justify-center">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>

                        <Button onClick={handleSavePayroll} disabled={!data || loading} className="bg-slate-900 hover:bg-slate-800 text-white shadow-md flex-1 sm:flex-none text-xs md:text-sm">
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
                <div className="animate-in fade-in duration-500 space-y-4 md:space-y-6">
                
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <Card className="overflow-hidden border-blue-100 shadow-sm">
                        <div className="bg-blue-50/50 p-3 border-b border-blue-100 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
                                <Scissors className="h-4 w-4" /> Grooming
                            </div>
                            <Badge variant="secondary" className="bg-white text-blue-700 border border-blue-200 text-[10px] md:text-xs">
                                {data.tiers_applied?.grooming?.name}
                            </Badge>
                        </div>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-slate-500 text-xs">Venta Total</span>
                                <span className="text-lg md:text-xl font-bold text-slate-900">{formatMoney(data.financials.totalGrooming)}</span>
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
                            <Badge variant="secondary" className="bg-white text-purple-700 border border-purple-200 text-[10px] md:text-xs">
                                {data.tiers_applied?.total?.name}
                            </Badge>
                        </div>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-slate-500 text-xs">Venta Global</span>
                                <span className="text-lg md:text-xl font-bold text-slate-900">{formatMoney(data.financials.totalRevenue)}</span>
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
                                <span className="text-xl md:text-2xl font-bold text-green-700 tracking-tight">
                                    {formatMoney(data.cash_flow?.total_cash_needed || 0)}
                                </span>
                                <p className="text-[10px] text-slate-400">Total en Sobres</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Auditoría */}
                <Accordion type="single" collapsible className="w-full bg-white rounded-lg border shadow-sm px-4">
                    <AccordionItem value="audit" className="border-none">
                        <AccordionTrigger className="hover:no-underline py-3 text-sm text-slate-500">
                            <div className="flex items-center gap-2">
                                <Calculator className="h-4 w-4" />
                                <span>Ver desglose diario</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="pb-4 overflow-x-auto">
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
                                                <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
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
                <Card className="shadow-sm border-slate-200 overflow-hidden">
                    <CardContent className="p-0">
                    <div className="overflow-x-auto w-full">
                        <Table className="min-w-[800px]">
                            <TableHeader>
                            <TableRow className="hover:bg-transparent border-slate-100 bg-slate-50/50">
                                <TableHead className="pl-4 md:pl-6 h-10 w-[200px] text-xs font-bold text-slate-700 sticky left-0 bg-slate-50/95 z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)]">COLABORADOR</TableHead>
                                <TableHead className="text-center h-10 text-xs font-bold text-slate-700">DÍAS</TableHead>
                                <TableHead className="text-right h-10 text-xs font-bold text-slate-500">DEPÓSITO</TableHead>
                                <TableHead className="text-right h-10 text-xs font-bold text-orange-600/80">SUELDO EFEC.</TableHead>
                                <TableHead className="text-right h-10 text-xs font-bold text-green-600/80">COMISIÓN</TableHead>
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
                                    <TableCell className="pl-4 md:pl-6 py-3 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)]">
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0" 
                                                style={{ backgroundColor: item.employee.color || '#94a3b8' }}
                                            >
                                                {item.employee.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-sm text-slate-900 truncate max-w-[120px]">{item.employee.name}</span>
                                                <span className="text-[10px] text-slate-400 truncate">
                                                    {item.participation_pct}% {item.commission_type === 'grooming' ? 'Grooming' : 'Tienda'}
                                                </span>
                                            </div>
                                        </div>
                                        {item.commission_bonus > 0 && (
                                            <div className="ml-11 mt-1">
                                                <span className="text-[9px] text-green-700 bg-green-50 px-1 rounded flex items-center w-fit whitespace-nowrap">
                                                    <ArrowUpCircle size={8} className="mr-1"/> +{formatMoney(item.commission_bonus)}
                                                </span>
                                            </div>
                                        )}
                                    </TableCell>
                                    
                                    <TableCell className="text-center py-3">
                                        <div className="inline-flex flex-col items-center">
                                            <span className="font-bold text-sm text-slate-700">{item.days_worked}</span>
                                            {item.lost_days > 0 && (
                                                <span className="text-[9px] text-red-500 font-medium whitespace-nowrap">
                                                    -{item.lost_days} Faltas
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-right py-3 font-mono text-sm text-slate-600 bg-slate-50/30 border-l border-white">
                                        {formatMoney(item.payout_bank)}
                                    </TableCell>

                                    <TableCell className="text-right py-3 font-mono font-medium text-sm text-orange-700 bg-orange-50/30 border-l border-white">
                                        {formatMoney(item.payout_cash_salary)}
                                    </TableCell>

                                    <TableCell className="text-right py-3 font-mono font-medium text-sm text-green-700 bg-green-50/30 border-l border-white">
                                        {formatMoney(item.payout_commission)}
                                    </TableCell>

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

                                    <TableCell className="text-right pr-6 py-3">
                                        <span className="text-sm font-bold text-slate-900">
                                            {formatMoney(item.total_payout)}
                                        </span>
                                    </TableCell>

                                    <TableCell className="text-center py-3 pr-6">
                                        <div className="flex justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <Button 
                                                variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                                onClick={(e) => { e.stopPropagation(); handlePreview(item); }}
                                            >
                                                <Eye size={14} />
                                            </Button>
                                            <Button 
                                                variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-slate-100"
                                                onClick={(e) => { e.stopPropagation(); handleDownload(item); }}
                                            >
                                                <Download size={14} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    </TableRow>
                                );
                            })}

                            <TableRow className="bg-slate-900 hover:bg-slate-900 border-t-2 border-slate-800">
                                <TableCell colSpan={2} className="pl-6 py-3 font-bold text-white text-xs uppercase tracking-wider text-right pr-4 sticky left-0 bg-slate-900 z-10">
                                    Totales:
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
                    </div>
                    </CardContent>
                </Card>
                </div>
            )}
            </div>
        </div>
    </div>
  );
}