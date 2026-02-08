'use server'

import { createClient } from "@/utils/supabase/server";

export async function getPayrollPreview(startDate: string, endDate: string) {
  const supabase = await createClient();

  // ---------------------------------------------------------
  // 1. OBTENER VENTAS Y DESGLOSAR POR ÍTEM
  // ---------------------------------------------------------
  const { data: transactions, error: salesError } = await supabase
    .from('sales_transactions')
    .select('*')
    .gte('timestamp', startDate)
    .lte('timestamp', endDate);

  if (salesError) throw new Error("Error obteniendo ventas: " + salesError.message);

  let totalGrooming = 0;
  let totalStore = 0;

  // Recorremos cada venta para sumar con precisión
  transactions?.forEach((t: any) => {
      // CASO A: Venta con desglose de ítems (Lo ideal, viene de la API o Excel)
      if (t.items && Array.isArray(t.items) && t.items.length > 0) {
          t.items.forEach((item: any) => {
              // IMPORTANTE: Leemos 'amount' que route.ts ya convirtió a Pesos
              // Si no existe amount, calculamos unit_price * quantity
              const amount = Number(item.amount) || (Number(item.unit_price) * Number(item.quantity)) || 0;
              
              const name = (item.name || '').toLowerCase();
              const cat = (item.category || item.category?.name || '').toLowerCase();
              
              // Lógica de clasificación por ítem
              const isItemGrooming = 
                  cat.includes('grooming') || 
                  cat.includes('servicio') ||
                  name.includes('corte') || 
                  name.includes('baño') ||
                  name.includes('deslanado') ||
                  name.includes('cepillado') ||
                  t.is_grooming; // Hereda del padre si el padre fue marcado manual

              if (isItemGrooming) {
                  totalGrooming += amount;
              } else {
                  totalStore += amount;
              }
          });
      } 
      // CASO B: Venta manual sin ítems (Fallback)
      else {
          const total = Number(t.total_amount) || 0;
          if (t.is_grooming) totalGrooming += total;
          else totalStore += total;
      }
  });

  const totalRevenue = totalGrooming + totalStore;

  // ---------------------------------------------------------
  // 2. DETERMINAR TIER (NIVEL DE COMISIÓN)
  // ---------------------------------------------------------
  const { data: tiers } = await supabase
    .from('commission_tiers')
    .select('*')
    .order('min_sales', { ascending: true });

  let appliedTier = { name: 'Base', percentage: 0.10, max_sales: null }; // Default
  
  if (tiers) {
    const match = tiers.find((t: any) => {
        const min = Number(t.min_sales);
        const max = t.max_sales ? Number(t.max_sales) : Infinity;
        // La meta se basa en Venta Total (Grooming + Tienda)
        return totalRevenue >= min && totalRevenue <= max;
    });
    if (match) appliedTier = match;
  }

  // ---------------------------------------------------------
  // 3. CALCULAR NÓMINA (LÓGICA DE POOL/SPLIT)
  // ---------------------------------------------------------
  const { data: employees } = await supabase
    .from('employees')
    .select(`
      id, first_name, last_name, role, color,
      contracts:employee_contracts (base_salary_weekly, start_date, end_date, is_active),
      absences:employee_absences (type, start_date, end_date)
    `)
    .eq('active', true);

  // A. Calcular "Días Trabajados" de cada uno
  const employeeStats = employees?.map((emp: any) => {
    const contract = emp.contracts.find((c: any) => c.is_active) || emp.contracts[0];
    const baseSalary = contract ? Number(contract.base_salary_weekly) : 0;

    // Filtrar ausencias en la semana
    const absencesInWeek = emp.absences.filter((abs: any) => {
        return (abs.start_date <= endDate && abs.end_date >= startDate);
    });

    let lostDays = 0;
    absencesInWeek.forEach((abs: any) => {
       // Solo descontamos si no son vacaciones o festivos pagados
       if (abs.type !== 'vacation' && abs.type !== 'holiday') {
           lostDays += 1; 
       }
    });

    const daysWorked = Math.max(0, 6 - lostDays); // Semana de 6 días
    
    return { ...emp, baseSalary, daysWorked, lostDays };
  }) || [];

  // B. Calcular la BOLSA (Pool) de Comisiones
  const percent = Number(appliedTier.percentage);
  const groomingCommissionPool = totalGrooming * percent; // El dinero a repartir entre estilistas
  
  // C. Calcular Divisor (Total de días trabajados por el equipo de Grooming)
  const totalGroomingDays = employeeStats
    .filter(e => e.role !== 'reception') // Recepción no entra en el split de grooming
    .reduce((sum, e) => sum + e.daysWorked, 0);

  // D. Procesar pago individual
  const payrollDetails = employeeStats.map((emp) => {
    let commissionPayout = 0;
    let explanation = "";

    if (emp.role === 'reception') {
        // RECEPCIÓN: Gana % sobre TODO (Grooming + Tienda)
        // No comparte bolsa, es directo ajustado por sus días trabajados
        const potentialCommission = totalRevenue * percent;
        commissionPayout = potentialCommission * (emp.daysWorked / 6);
        explanation = `(Total $${totalRevenue.toLocaleString()} * ${percent*100}%) * (${emp.daysWorked}/6 días)`;

    } else {
        // GROOMERS: Se reparten la bolsa de Grooming
        if (totalGroomingDays > 0) {
            const dailyShareValue = groomingCommissionPool / totalGroomingDays;
            commissionPayout = dailyShareValue * emp.daysWorked;
            explanation = `Pool Grooming ($${groomingCommissionPool.toLocaleString()}) / ${totalGroomingDays} días equipo * ${emp.daysWorked} mis días`;
        } else {
            commissionPayout = 0;
            explanation = "Sin ventas de grooming o sin días trabajados por el equipo";
        }
    }

    // Sueldo Base (Prorrateado por días trabajados)
    const salaryPayout = (emp.baseSalary / 6) * emp.daysWorked;

    return {
      employee: { 
        id: emp.id, 
        name: `${emp.first_name} ${emp.last_name}`, 
        role: emp.role, 
        color: emp.color 
      },
      base_salary_full: emp.baseSalary,
      days_worked: emp.daysWorked,
      lost_days: emp.lostDays,
      
      // Datos informativos para la tabla
      commission_base: emp.role === 'reception' ? totalRevenue : totalGrooming,
      commission_rate: percent,
      calculation_note: explanation,

      payout_base: salaryPayout,
      payout_commission: commissionPayout,
      total_payout: salaryPayout + commissionPayout
    };
  });

  return {
    period: { start: startDate, end: endDate },
    financials: { totalGrooming, totalStore, totalRevenue },
    tier: appliedTier,
    details: payrollDetails
  };
}

// ---------------------------------------------------------
// 4. FUNCIÓN DE CIERRE (GUARDAR EN HISTORIAL)
// ---------------------------------------------------------
export async function savePayrollRun(data: any) {
  const supabase = await createClient();

  // Crear cabecera
  const { data: runData, error: runError } = await supabase
    .from('payroll_runs')
    .insert({
      start_date: data.period.start,
      end_date: data.period.end,
      total_grooming_sales: data.financials.totalGrooming,
      total_store_sales: data.financials.totalStore,
      applied_tier_percentage: data.tier.percentage,
      status: 'paid'
    })
    .select()
    .single();

  if (runError) throw new Error("Error creando nómina: " + runError.message);

  // Crear recibos
  const receipts = data.details.map((d: any) => ({
    payroll_run_id: runData.id,
    employee_id: d.employee.id,
    base_salary_payout: d.payout_base,
    commission_payout: d.payout_commission,
    days_worked: d.days_worked,
    unjustified_absences: d.lost_days,
    total_payout: d.total_payout,
    notes: d.calculation_note // Guardamos la explicación matemática
  }));

  const { error: receiptsError } = await supabase.from('payroll_receipts').insert(receipts);

  if (receiptsError) {
    // Si falla el detalle, borramos la cabecera para no dejar basura
    await supabase.from('payroll_runs').delete().eq('id', runData.id);
    throw new Error("Error guardando recibos: " + receiptsError.message);
  }

  return { success: true, id: runData.id };
}