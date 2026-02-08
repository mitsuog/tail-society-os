'use server'

import { createClient } from "@/utils/supabase/server";
import { addDays, subDays, parseISO } from 'date-fns';

const safeNum = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
};

function getMonterreyDateString(utcTimestamp: string) {
  if (!utcTimestamp) return '';
  const date = new Date(utcTimestamp);
  const monterreyMillis = date.getTime() - (6 * 60 * 60 * 1000);
  return new Date(monterreyMillis).toISOString().slice(0, 10);
}

export async function getPayrollPreview(startDate: string, endDate: string) {
  const supabase = await createClient();

  // 1. VENTAS
  const queryStart = subDays(parseISO(startDate), 1).toISOString();
  const queryEnd = addDays(parseISO(endDate), 2).toISOString(); 

  const { data: transactions } = await supabase
    .from('sales_transactions')
    .select('*')
    .gte('timestamp', queryStart)
    .lte('timestamp', queryEnd);

  let totalGrooming = 0;
  let totalStore = 0;
  const dailyMap: Record<string, { grooming: number, store: number, total: number }> = {};

  transactions?.forEach((t: any) => {
      const localDate = getMonterreyDateString(t.timestamp);
      if (localDate >= startDate && localDate <= endDate) {
          if (!dailyMap[localDate]) dailyMap[localDate] = { grooming: 0, store: 0, total: 0 };
          let tGrooming = 0;
          let tStore = 0;
          if (t.items && Array.isArray(t.items) && t.items.length > 0) {
              t.items.forEach((item: any) => {
                  const amount = safeNum(item.amount);
                  if (item.category === 'grooming') tGrooming += amount;
                  else tStore += amount;
              });
          } else {
              const total = safeNum(t.total_amount);
              if (t.is_grooming) tGrooming += total;
              else tStore += total;
          }
          totalGrooming += tGrooming;
          totalStore += tStore;
          dailyMap[localDate].grooming += tGrooming;
          dailyMap[localDate].store += tStore;
          dailyMap[localDate].total += (tGrooming + tStore);
      }
  });

  const dailyBreakdown = Object.keys(dailyMap).sort().map(date => ({
      date, grooming: dailyMap[date].grooming, store: dailyMap[date].store, total: dailyMap[date].total
  }));

  const totalRevenue = Math.round((totalGrooming + totalStore) * 100) / 100;
  totalGrooming = Math.round(totalGrooming * 100) / 100;

  // 2. POOLS
  const { data: tiers } = await supabase.from('commission_tiers').select('*');
  const groomingTierFound = tiers?.find((t: any) => 
      t.type === 'grooming' && totalGrooming >= safeNum(t.min_sales) && totalGrooming <= (t.max_sales ? safeNum(t.max_sales) : Infinity)
  );
  const groomingTier = { name: groomingTierFound?.name || 'Sin Nivel', percentage: safeNum(groomingTierFound?.percentage) };
  const groomingPoolTotal = totalGrooming * groomingTier.percentage;

  const totalTierFound = tiers?.find((t: any) => 
      t.type === 'total' && totalRevenue >= safeNum(t.min_sales) && totalRevenue <= (t.max_sales ? safeNum(t.max_sales) : Infinity)
  );
  const totalTier = { name: totalTierFound?.name || 'Sin Nivel', percentage: safeNum(totalTierFound?.percentage) };
  const totalPoolTotal = totalRevenue * totalTier.percentage;

  // 3. CÁLCULO EMPLEADOS
  const { data: employees } = await supabase.from('employees').select(`
      id, first_name, last_name, role, color, commission_type, participation_pct,
      contracts:employee_contracts (base_salary_weekly, is_active, metadata), 
      absences:employee_absences (type, start_date, end_date)
  `).eq('active', true);

  let redistributionPot = 0; 
  let beneficiariesCount = 0; 
  let totalCashNeeded = 0;

  const initialCalculations = employees?.map((emp: any) => {
    const contract = emp.contracts?.find((c: any) => c.is_active) || emp.contracts?.[0];
    const totalWeeklySalary = safeNum(contract?.base_salary_weekly);
    const meta = contract?.metadata || {};
    const bankTarget = safeNum(meta.bank_dispersion) || totalWeeklySalary; 
    const cashTarget = safeNum(meta.cash_difference) || 0;

    // Faltas
    const empAbsences = Array.isArray(emp.absences) ? emp.absences : [];
    const absences = empAbsences.filter((abs: any) => (
        abs.start_date <= endDate && abs.end_date >= startDate && abs.type === 'unjustified'
    ));
    const unjustifiedDays = absences.length;
    const daysPaid = Math.max(0, 7 - unjustifiedDays);
    
    // Desglose proporcional de sueldo
    const payoutBank = (bankTarget / 7) * daysPaid;
    const payoutCashBase = (cashTarget / 7) * daysPaid;
    const payoutBaseTotal = payoutBank + payoutCashBase;
    
    // Comisiones
    const participation = safeNum(emp.participation_pct) / 100;
    let theoreticalCommission = 0;
    let poolName = "";

    if (emp.commission_type === 'grooming') {
        theoreticalCommission = groomingPoolTotal * participation;
        poolName = "Grooming";
    } else if (emp.commission_type === 'total') {
        theoreticalCommission = totalPoolTotal * participation;
        poolName = "Total";
    }

    let commissionPenalty = 0;
    if (unjustifiedDays > 0 && theoreticalCommission > 0) {
        const penaltyFactor = Math.min(1, unjustifiedDays / 6); 
        commissionPenalty = theoreticalCommission * penaltyFactor;
    }

    redistributionPot += commissionPenalty;
    const isBeneficiary = unjustifiedDays === 0;
    if (isBeneficiary) beneficiariesCount++;

    return {
        ...emp,
        unjustifiedDays,
        payoutBaseTotal,
        payoutBank,       
        payoutCashBase,   
        poolName,
        theoreticalCommission,
        commissionPenalty,
        payoutCommissionInitial: theoreticalCommission - commissionPenalty,
        isBeneficiary
    };
  }) || [];

  const bonusPerPerson = beneficiariesCount > 0 ? (redistributionPot / beneficiariesCount) : 0;

  const payrollDetails = initialCalculations.map((emp) => {
    const bonus = emp.isBeneficiary ? bonusPerPerson : 0;
    const finalCommission = emp.payoutCommissionInitial + bonus;
    
    const totalCashPayout = emp.payoutCashBase + finalCommission;
    totalCashNeeded += totalCashPayout;

    let notes = [];
    if (emp.unjustifiedDays > 0) notes.push(`-${emp.unjustifiedDays} faltas`);
    else if (bonus > 0) notes.push(`+Bono $${Math.round(bonus)}`);
    
    const baseNote = `${safeNum(emp.participation_pct)}% ${emp.poolName}`;
    const fullNote = notes.length > 0 ? `${baseNote} (${notes.join(', ')})` : baseNote;

    return {
      employee: { id: emp.id, name: `${emp.first_name} ${emp.last_name}`, role: emp.role, color: emp.color },
      days_worked: 6 - emp.unjustifiedDays, 
      lost_days: emp.unjustifiedDays,
      commission_type: emp.commission_type,
      participation_pct: safeNum(emp.participation_pct),
      calculation_note: fullNote,
      
      // DATOS FINANCIEROS EXPORTADOS PARA UI
      payout_bank: emp.payoutBank,             // Columna 1
      payout_cash_salary: emp.payoutCashBase,  // Columna 2 (Nuevo)
      payout_commission: finalCommission,      // Columna 3
      payout_cash_total: totalCashPayout,      // Suma Col 2+3 (Para el total efectivo)
      
      total_payout: emp.payoutBaseTotal + finalCommission, // Total Neto
      
      // Detalles extra
      commission_bonus: bonus,
      commission_penalty: emp.commissionPenalty,
    };
  });

  return {
    period: { start: startDate, end: endDate },
    financials: { totalGrooming, totalStore, totalRevenue },
    dailyBreakdown,
    tiers_applied: { grooming: groomingTier, total: totalTier },
    pools: { grooming: groomingPoolTotal, total: totalPoolTotal, redistributed: redistributionPot },
    cash_flow: { total_cash_needed: totalCashNeeded }, 
    details: payrollDetails
  };
}

export async function savePayrollRun(data: any) {
    const supabase = await createClient();
    const { data: runData, error: runError } = await supabase.from('payroll_runs').insert({
        start_date: data.period.start,
        end_date: data.period.end,
        total_grooming_sales: data.financials.totalGrooming,
        total_store_sales: data.financials.totalStore,
        applied_tier_percentage: 0, 
        metadata: { tiers: data.tiers_applied, pools: data.pools, cash_flow: data.cash_flow }, 
        status: 'paid'
    }).select().single();

    if (runError) throw new Error("Error: " + runError.message);

    const receipts = data.details.map((d: any) => ({
        payroll_run_id: runData.id, 
        employee_id: d.employee.id, 
        base_salary_payout: d.payout_bank + d.payout_cash_salary, 
        commission_payout: d.payout_commission,
        days_worked: d.days_worked, 
        unjustified_absences: d.lost_days, 
        total_payout: d.total_payout, 
        notes: d.calculation_note,
        metadata: { 
            bank_deposit: d.payout_bank, 
            cash_payment: d.payout_cash_total,
            breakdown: {
                cash_salary: d.payout_cash_salary,
                cash_commission: d.payout_commission
            }
        }
    }));
    
    const { error: receiptsError } = await supabase.from('payroll_receipts').insert(receipts);
    if (receiptsError) throw new Error("Error: " + receiptsError.message);
    return { success: true, id: runData.id };
}