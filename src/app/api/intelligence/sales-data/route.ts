import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { subDays, startOfDay, endOfDay } from 'date-fns';

/**
 * GET /api/intelligence/sales-data
 * Lee datos YA sincronizados por /api/integrations/zettle
 * Requisito: Tabla 'sales_transactions' debe existir y tener datos.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const supabase = await createClient();
    
    const startDate = subDays(new Date(), days);
    const endDate = new Date();

    // LEER de sales_transactions (Sincronizado previamente desde Zettle)
    const { data: transactions, error } = await supabase
      .from('sales_transactions')
      .select('*')
      .gte('timestamp', startOfDay(startDate).toISOString())
      .lte('timestamp', endOfDay(endDate).toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Supabase error fetching transactions:', error);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    // Análisis
    const insights = analyzeTransactions(transactions || []);

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Sales data API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function analyzeTransactions(transactions: any[]) {
  const totalRevenue = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const transactionCount = transactions.length;
  // Protección contra división por cero
  const avgTicket = transactionCount > 0 ? totalRevenue / transactionCount : 0;

  // Productos vs Servicios
  let productsRevenue = 0;
  let servicesRevenue = 0;

  transactions.forEach(t => {
    // Asumimos que la tabla tiene banderas booleanas o identificadores de tipo
    if (t.is_grooming) servicesRevenue += t.total_amount;
    if (t.is_store) productsRevenue += t.total_amount;
    
    // Fallback: Si no hay banderas, categorizar por lógica de negocio si es necesario
    // Ejemplo: if (!t.is_grooming && !t.is_store) { ... }
  });

  // Cálculo seguro de porcentajes
  const productsPercentage = totalRevenue > 0 ? (productsRevenue / totalRevenue) * 100 : 0;
  const servicesPercentage = totalRevenue > 0 ? (servicesRevenue / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    avgTicket,
    transactionCount,
    productsRevenue,
    servicesRevenue,
    productsPercentage,
    servicesPercentage,
    // Agregamos desglose diario para gráficos futuros si se requiere
    dailyData: groupTransactionsByDay(transactions) 
  };
}

// Helper opcional para gráficas de línea
function groupTransactionsByDay(transactions: any[]) {
    const grouped: Record<string, number> = {};
    transactions.forEach(t => {
        const date = t.timestamp.split('T')[0];
        grouped[date] = (grouped[date] || 0) + t.total_amount;
    });
    return Object.entries(grouped).map(([date, amount]) => ({ date, amount }));
}