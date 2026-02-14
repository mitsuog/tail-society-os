'use server'

import { createClient } from "@/utils/supabase/server";
import { addDays, subDays, parseISO, eachDayOfInterval, format, isWithinInterval, isSameDay } from 'date-fns';

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

  // 1. OBTENER VENTAS
  const queryStart = subDays(parseISO(startDate), 1).toISOString();
  const queryEnd = addDays(parseISO(endDate), 2).toISOString(); 

  const { data: transactions } = await supabase
    .from('sales_transactions')
    .select('*')
    .gte('timestamp', queryStart)
    .lte('timestamp', queryEnd);

  // Mapa diario de ventas
  const dailyMap: Record<string, { grooming: number, store: number, total: number }> = {};
  let periodTotalGrooming = 0;
  let periodTotalStore = 0;

  transactions?.forEach((t: any) => {
      const localDate = getMonterreyDateString(t.timestamp);
      if (localDate >= startDate && localDate <= endDate) {
          if (!dailyMap[localDate]) dailyMap[localDate] = { grooming: 0, store: 0, total: 0 };
          
          let tGrooming = 0;
          let tStore = 0;
          
          if (t.items && Array.isArray(t.items) && t.items.length > 0) {
              t.items.forEach((item: any) => {
                  const amount = safeNum(item.amount);
                  if (item.category === 'grooming' || t.is_grooming) tGrooming += amount;
                  else tStore += amount;
              });
          } else {
              const total = safeNum(t.total_amount);
              if (t.is_grooming) tGrooming += total;
              else tStore += total;
          }
          
          dailyMap[localDate].grooming += tGrooming;
          dailyMap[localDate].store += tStore;
          dailyMap[localDate].total += (tGrooming + tStore);

          periodTotalGrooming += tGrooming;
          periodTotalStore += tStore;
      }
  });

  const dailyBreakdown = Object.keys(dailyMap).sort().map(date => ({
      date, grooming: dailyMap[date].grooming, store: dailyMap[date].store, total: dailyMap[date].total
  }));

  const periodTotalRevenue = Math.round((periodTotalGrooming + periodTotalStore) * 100) / 100;
  periodTotalGrooming = Math.round(periodTotalGrooming * 100) / 100;

  // 2. POOLS Y TIERS
  const { data: tiers } = await supabase.from('commission_tiers').select('*');
  
  const groomingTierFound = tiers?.find((t: any) => 
      t.type === 'grooming' && periodTotalGrooming >= safeNum(t.min_sales) && periodTotalGrooming <= (t.max_sales ? safeNum(t.max_sales) : Infinity)
  );
  const groomingPct = safeNum(groomingTierFound?.percentage); 

  const totalTierFound = tiers?.find((t: any) => 
      t.type === 'total' && periodTotalRevenue >= safeNum(t.min_sales) && periodTotalRevenue <= (t.max_sales ? safeNum(t.max_sales) : Infinity)
  );
  const totalPct = safeNum(totalTierFound?.percentage); 

  // 3. EMPLEADOS
  const { data: employees } = await supabase.from('employees').select(`
      id, first_name, last_name, role, color, commission_type, participation_pct,
      contracts:employee_contracts!fk_staff_contracts (id, base_salary_weekly, is_active, metadata), 
      absences:employee_absences!fk_staff_absences (id, type, start_date, end_date)
  `).eq('active', true);

  if (!employees || employees.length === 0) {
    return {
      period: { start: startDate, end: endDate },
      financials: { totalGrooming: periodTotalGrooming, totalStore: periodTotalStore, totalRevenue: periodTotalRevenue },
      dailyBreakdown,
      tiers_applied: { grooming: { name: groomingTierFound?.name, percentage: groomingPct }, total: { name: totalTierFound?.name, percentage: totalPct } },
      pools: { grooming: 0, total: 0, redistributed: 0 },
      cash_flow: { total_cash_needed: 0 }, 
      details: []
    };
  }

  // 4. CÁLCULO DE NÓMINA (LÓGICA NUEVA: DÍA A DÍA ROBUSTA)
  
  const empCalculations = employees.map((emp: any) => ({
      ...emp,
      accCommission: 0,     // Comisión ganada (estando presente)
      accBonus: 0,          // Bono por redistribución (ganado por faltas ajenas)
      lostCommission: 0,    // Comisión perdida por estar ausente (para mostrar en deducciones)
      penaltySalaryDays: 0, // Días que se descontarán del sueldo (Injustificadas)
      totalAbsentDays: 0    // Total de ausencias (Just + Injust)
  }));

  const daysInterval = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });

  daysInterval.forEach((dayObj) => {
      const dateStr = format(dayObj, 'yyyy-MM-dd');
      const sales = dailyMap[dateStr] || { grooming: 0, store: 0, total: 0 };

      // Bolsa de dinero disponible HOY
      const dailyGroomingPool = sales.grooming * groomingPct;
      const dailyTotalPool = sales.total * totalPct;

      // Grupos para repartir el dinero de HOY
      const groups: Record<string, { present: any[], absent: any[] }> = {
          'grooming': { present: [], absent: [] },
          'total': { present: [], absent: [] },
          'none': { present: [], absent: [] }
      };

      // Paso 1: Clasificar asistencia
      empCalculations.forEach((emp: any) => {
          const absences = Array.isArray(emp.absences) ? emp.absences : [];
          
          // Detección robusta de ausencia
          const absenceToday = absences.find((abs: any) => {
              const start = parseISO(abs.start_date);
              const end = parseISO(abs.end_date);
              return isWithinInterval(dayObj, { start, end }) || isSameDay(dayObj, start) || isSameDay(dayObj, end);
          });

          if (absenceToday) {
              emp.totalAbsentDays++;
              
              const typeRaw = (absenceToday.type || '').toLowerCase().trim();
              const isUnjustified = 
                  typeRaw === 'unjustified' || 
                  typeRaw === 'absent_unjustified' || 
                  typeRaw.includes('injust'); 

              if (isUnjustified) {
                  // Si es injustificada: SE DESCUENTA SUELDO
                  emp.penaltySalaryDays++;
              }
              // Si es Justificada (sick, vacation): NO entra aquí, cobra su sueldo base normal.
              
              // PERO, en AMBOS casos, al no estar presente, pierde la comisión del día
              if (groups[emp.commission_type]) groups[emp.commission_type].absent.push(emp);

          } else {
              // PRESENTE: Gana comisión y bono
              if (groups[emp.commission_type]) groups[emp.commission_type].present.push(emp);
          }
      });

      // Paso 2: Calcular Dinero y Redistribuir
      ['grooming', 'total'].forEach(type => {
          const poolValue = type === 'grooming' ? dailyGroomingPool : dailyTotalPool;
          if (poolValue <= 0) return;

          const group = groups[type];
          let potToRedistribute = 0;
          
          // A. Calcular pérdidas de los ausentes
          group.absent.forEach((emp: any) => {
              const share = safeNum(emp.participation_pct) / 100;
              const lostAmount = poolValue * share;
              
              emp.lostCommission += lostAmount; // Registramos cuánto perdió hoy para mostrarlo en recibo
              potToRedistribute += lostAmount;  // Lo sumamos al bote común
          });

          // B. Repartir a los presentes
          if (group.present.length > 0) {
              const bonusPerPerson = potToRedistribute / group.present.length;

              group.present.forEach((emp: any) => {
                  const share = safeNum(emp.participation_pct) / 100;
                  emp.accCommission += (poolValue * share); // Su parte normal
                  emp.accBonus += bonusPerPerson;           // Su bono extra (reparto)
              });
          }
      });
  });

  // 5. AGREGACIÓN FINAL
  let totalCashNeeded = 0;
  let totalRedistributedStats = 0;

  const payrollDetails = empCalculations.map((emp: any) => {
    const contractsArray = Array.isArray(emp.contracts) ? emp.contracts : [];
    const contract = contractsArray.find((c: any) => c.is_active) || contractsArray[0] || null;
    const totalWeeklySalary = contract ? safeNum(contract.base_salary_weekly) : 0;
    const meta = contract?.metadata || {};
    
    // Dispersión
    const bankTarget = safeNum(meta.bank_dispersion) || 0; 
    const cashTarget = safeNum(meta.cash_difference) || 0;
    const fullBankWeekly = (bankTarget === 0 && cashTarget === 0) ? totalWeeklySalary : bankTarget;
    const fullCashWeekly = cashTarget;

    // Descuentos Sueldo (Solo Injustificadas)
    const dailyBank = fullBankWeekly / 7;
    const dailyCash = fullCashWeekly / 7;
    
    const salaryPenaltyBank = dailyBank * emp.penaltySalaryDays;
    const salaryPenaltyCash = dailyCash * emp.penaltySalaryDays;
    const salaryPenaltyTotal = salaryPenaltyBank + salaryPenaltyCash;
    
    const payoutBank = Math.max(0, fullBankWeekly - salaryPenaltyBank);
    const payoutCashBase = Math.max(0, fullCashWeekly - salaryPenaltyCash);
    
    // Comisiones Finales
    // Nota: accCommission ya es lo ganado por días trabajados.
    // lostCommission es meramente informativo para la deducción visual.
    const finalCommission = emp.accCommission + emp.accBonus;
    totalRedistributedStats += emp.accBonus;

    const totalCashPayout = payoutCashBase + finalCommission;
    const payoutBaseTotal = payoutBank + payoutCashBase; // Solo base
    totalCashNeeded += totalCashPayout;

    // Notas
    let notes = [];
    if (emp.penaltySalaryDays > 0) notes.push(`-${emp.penaltySalaryDays} falta(s) injust.`);
    
    const justifCount = emp.totalAbsentDays - emp.penaltySalaryDays;
    if (justifCount > 0) notes.push(`${justifCount} justif.`);
    
    if (emp.accBonus > 0) notes.push(`+Bono redist. $${Math.round(emp.accBonus)}`);
    
    const baseNote = `${emp.participation_pct}% ${emp.commission_type === 'total' ? 'Total' : 'Grooming'}`;
    const fullNote = notes.length > 0 ? `${baseNote} (${notes.join(', ')})` : baseNote;

    return {
      employee: { 
        id: emp.id, 
        name: `${emp.first_name} ${emp.last_name}`, 
        role: emp.role, 
        color: emp.color 
      },
      commission_type: emp.commission_type || 'none',
      participation_pct: safeNum(emp.participation_pct),
      days_worked: 7 - emp.penaltySalaryDays,
      lost_days: emp.penaltySalaryDays,
      
      full_salary_weekly: fullBankWeekly + fullCashWeekly,
      
      // Multas
      salary_penalty: Math.round(salaryPenaltyTotal * 100) / 100,
      commission_penalty: Math.round(emp.lostCommission * 100) / 100, // <--- AQUI ESTABA LA CLAVE, ahora sí mandamos el valor.
      
      payout_bank: Math.round(payoutBank * 100) / 100,
      payout_cash_salary: Math.round(payoutCashBase * 100) / 100,
      
      payout_commission: Math.round(finalCommission * 100) / 100,
      payout_cash_total: Math.round(totalCashPayout * 100) / 100,
      
      total_payout: Math.round((payoutBaseTotal + finalCommission) * 100) / 100,
      
      commission_bonus: Math.round(emp.accBonus * 100) / 100,
      calculation_note: fullNote,
    };
  });

  return {
    period: { start: startDate, end: endDate },
    financials: { 
      totalGrooming: Math.round(periodTotalGrooming * 100) / 100, 
      totalStore: Math.round(periodTotalStore * 100) / 100, 
      totalRevenue: Math.round(periodTotalRevenue * 100) / 100 
    },
    dailyBreakdown,
    tiers_applied: { grooming: { name: groomingTierFound?.name, percentage: groomingPct }, total: { name: totalTierFound?.name, percentage: totalPct } },
    pools: { 
      grooming: Math.round((periodTotalGrooming * groomingPct) * 100) / 100, 
      total: Math.round((periodTotalRevenue * totalPct) * 100) / 100, 
      redistributed: Math.round(totalRedistributedStats * 100) / 100 
    },
    cash_flow: { total_cash_needed: Math.round(totalCashNeeded * 100) / 100 }, 
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
        applied_tier_percentage: data.tiers_applied.grooming.percentage, 
        metadata: { tiers: data.tiers_applied, pools: data.pools, cash_flow: data.cash_flow }, 
        status: 'paid'
    }).select().single();

    if (runError) throw new Error("Error al guardar nómina: " + runError.message);

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
                full_salary_weekly: d.full_salary_weekly,
                salary_penalty: d.salary_penalty,
                cash_salary: d.payout_cash_salary,
                cash_commission: d.payout_commission,
                bonus: d.commission_bonus,
                penalty: d.commission_penalty
            }
        }
    }));
    
    const { error: receiptsError } = await supabase.from('payroll_receipts').insert(receipts);
    if (receiptsError) throw new Error("Error al guardar recibos: " + receiptsError.message);
    
    return { success: true, id: runData.id };
}