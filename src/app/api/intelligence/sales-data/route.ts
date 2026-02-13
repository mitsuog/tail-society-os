// src/app/api/intelligence/sales-data/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { subDays, startOfDay, endOfDay } from 'date-fns';

/**
 * GET /api/intelligence/sales-data
 * Lee datos YA sincronizados por /api/integrations/zettle
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const supabase = await createClient();
    
    const startDate = subDays(new Date(), days);
    const endDate = new Date();

    // LEER de sales_transactions (ya sincronizado por el otro endpoint)
    const { data: transactions, error } = await supabase
      .from('sales_transactions')
      .select('*')
      .gte('timestamp', startOfDay(startDate).toISOString())
      .lte('timestamp', endOfDay(endDate).toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching transactions:', error);
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
  const avgTicket = totalRevenue / (transactionCount || 1);

  // Productos vs Servicios
  let productsRevenue = 0;
  let servicesRevenue = 0;

  transactions.forEach(t => {
    if (t.is_grooming) servicesRevenue += t.total_amount;
    if (t.is_store) productsRevenue += t.total_amount;
  });

  return {
    totalRevenue,
    avgTicket,
    transactionCount,
    productsRevenue,
    servicesRevenue,
    productsPercentage: (productsRevenue / totalRevenue) * 100,
    servicesPercentage: (servicesRevenue / totalRevenue) * 100
  };
}