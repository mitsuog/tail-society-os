import { differenceInDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// ==========================================
// TIPOS DE ALERTAS
// ==========================================
export type AlertType = 
  | 'opportunity' 
  | 'risk' 
  | 'anomaly' 
  | 'trend' 
  | 'inventory' 
  | 'customer' 
  | 'performance';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  actionable: boolean;
  action?: {
    label: string;
    url?: string;
    callback?: () => void;
  };
  metadata?: any;
  read: boolean;
}

// ==========================================
// MOTOR DE ALERTAS
// ==========================================
export class AlertEngine {
  private alerts: Alert[] = [];
  private subscribers: ((alert: Alert) => void)[] = [];

  /**
   * Analiza datos y genera alertas automáticamente
   */
  analyzeAndGenerateAlerts(data: {
    transactions: any[];
    predictions: any[];
    clients: any[];
    inventory: any[];
    externalFactors: any;
  }): Alert[] {
    const newAlerts: Alert[] = [];

    // 1. Detectar Anomalías en Ventas
    newAlerts.push(...this.detectSalesAnomalies(data.transactions));

    // 2. Alertas de Predicción
    newAlerts.push(...this.analyzePredictions(data.predictions, data.externalFactors));

    // 3. Alertas de Inventario
    newAlerts.push(...this.checkInventory(data.inventory, data.transactions));

    // 4. Alertas de Clientes
    newAlerts.push(...this.analyzeCustomerBehavior(data.clients, data.transactions));

    // 5. Alertas de Rendimiento
    newAlerts.push(...this.analyzePerformance(data.transactions));

    // Agregar y notificar (CON VALIDACIÓN DE DUPLICADOS)
    newAlerts.forEach(alert => {
      this.addAlert(alert);
    });

    return newAlerts;
  }

  /**
   * Detecta anomalías en patrones de ventas usando desviación estándar
   */
  private detectSalesAnomalies(transactions: any[]): Alert[] {
    const alerts: Alert[] = [];

    // Agrupar por día
    const dailySales = new Map<string, number>();
    transactions.forEach(t => {
      const date = t.date.split('T')[0];
      dailySales.set(date, (dailySales.get(date) || 0) + t.amount);
    });

    const values = Array.from(dailySales.values());
    if (values.length < 7) return alerts;

    // Calcular media y desviación estándar
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Detectar días anómalos (fuera de 2 desviaciones estándar)
    const today = format(new Date(), 'yyyy-MM-dd');
    const todaySales = dailySales.get(today) || 0;

    // CORRECCIÓN: Usamos 'today' en el ID para evitar duplicados si corre varias veces al día
    if (todaySales > mean + 2 * stdDev) {
      alerts.push({
        id: `anomaly-high-${today}`, 
        type: 'anomaly',
        severity: 'info',
        title: '🚀 ¡Ventas Excepcionales Hoy!',
        message: `Ventas $${todaySales.toLocaleString()} superan 2x la media ($${mean.toLocaleString()}). Analiza qué factores contribuyeron.`,
        timestamp: new Date(),
        actionable: true,
        action: {
          label: 'Ver detalles',
          url: '/analytics/daily-report'
        },
        read: false
      });
    } else if (todaySales < mean - 2 * stdDev) {
      alerts.push({
        id: `anomaly-low-${today}`,
        type: 'anomaly',
        severity: 'warning',
        title: '📉 Ventas Inusualmente Bajas',
        message: `Ventas $${todaySales.toLocaleString()} muy por debajo de la media. Considera promociones de emergencia.`,
        timestamp: new Date(),
        actionable: true,
        action: {
          label: 'Crear promoción',
          url: '/marketing/promotions/new'
        },
        read: false
      });
    }

    return alerts;
  }

  /**
   * Genera alertas basadas en predicciones ML
   */
  private analyzePredictions(predictions: any[], externalFactors: any): Alert[] {
    const alerts: Alert[] = [];

    predictions.forEach((pred, idx) => {
      // CORRECCIÓN: Usamos la fecha predicha en el ID en lugar del índice
      const dateKey = format(parseISO(pred.date), 'yyyy-MM-dd');

      // Alerta de alta demanda esperada
      if (pred.predictedRevenue > 8000 && pred.confidence > 0.8) {
        alerts.push({
          id: `opportunity-high-demand-${dateKey}`,
          type: 'opportunity',
          severity: 'info',
          title: `💰 Alta Demanda Esperada - ${format(parseISO(pred.date), 'EEEE d', { locale: es })}`,
          message: `El modelo predice ventas de $${Math.round(pred.predictedRevenue).toLocaleString()} con ${Math.round(pred.confidence * 100)}% confianza. ${pred.recommendation}`,
          timestamp: new Date(),
          actionable: true,
          action: {
            label: 'Ajustar agenda',
            url: '/staff/schedule'
          },
          metadata: { prediction: pred },
          read: false
        });
      }

      // Alerta de clima adverso
      if (pred.factors.weather < 0.3 && pred.confidence > 0.7) {
        alerts.push({
          id: `risk-weather-${dateKey}`,
          type: 'risk',
          severity: 'warning',
          title: `☔ Clima Adverso - ${format(parseISO(pred.date), 'EEEE d', { locale: es })}`,
          message: `Probabilidad de lluvia o mal clima. Prepara promociones especiales para compensar baja afluencia.`,
          timestamp: new Date(),
          actionable: true,
          action: {
            label: 'Ver recomendaciones',
            url: '/intelligence/recommendations'
          },
          read: false
        });
      }
    });

    return alerts;
  }

  /**
   * Alertas de inventario crítico
   */
  private checkInventory(inventory: any[], transactions: any[]): Alert[] {
    const alerts: Alert[] = [];

    // Calcular tasa de venta por producto
    const productSales = new Map<string, { count: number; lastSold: Date }>();
    
    transactions.forEach(t => {
      if (t.type === 'product') {
        t.items?.forEach((item: string) => {
          if (!productSales.has(item)) {
            productSales.set(item, { count: 0, lastSold: new Date(t.date) });
          }
          const stats = productSales.get(item)!;
          stats.count++;
          if (new Date(t.date) > stats.lastSold) {
            stats.lastSold = new Date(t.date);
          }
        });
      }
    });

    inventory.forEach(item => {
      const sales = productSales.get(item.name);
      
      // Stock crítico + alta demanda
      if (item.stock < 10 && sales && sales.count > 5) {
        const daysUntilStockout = Math.floor(item.stock / (sales.count / 30));
        
        alerts.push({
          id: `inventory-critical-${item.id}`,
          type: 'inventory',
          severity: daysUntilStockout < 3 ? 'critical' : 'warning',
          title: `📦 Stock Crítico: ${item.name}`,
          message: `Solo quedan ${item.stock} unidades. Al ritmo actual, se agotará en ${daysUntilStockout} días.`,
          timestamp: new Date(),
          actionable: true,
          action: {
            label: 'Reabastecer ahora',
            url: `/inventory/${item.id}/restock`
          },
          metadata: { item, daysUntilStockout },
          read: false
        });
      }

      // Producto sin movimiento
      if (sales && differenceInDays(new Date(), sales.lastSold) > 60) {
        alerts.push({
          id: `inventory-stale-${item.id}`,
          type: 'inventory',
          severity: 'info',
          title: `🗑️ Producto sin Movimiento: ${item.name}`,
          message: `No se ha vendido en más de 60 días. Considera descuento o discontinuar.`,
          timestamp: new Date(),
          actionable: true,
          action: {
            label: 'Crear promoción',
            url: `/marketing/promotions/new?product=${item.id}`
          },
          read: false
        });
      }
    });

    return alerts;
  }

  /**
   * Alertas de comportamiento de clientes
   */
  private analyzeCustomerBehavior(clients: any[], transactions: any[]): Alert[] {
    const alerts: Alert[] = [];
    const now = new Date();

    // Clientes VIP en riesgo
    const atRiskVIPs = clients.filter(c => {
      const daysSinceVisit = differenceInDays(now, parseISO(c.last_visit));
      return c.total_spent > 5000 && daysSinceVisit > 45 && daysSinceVisit < 90;
    });

    if (atRiskVIPs.length > 0) {
      alerts.push({
        id: 'customer-vip-risk', // ID Fijo: Se validará en addAlert para no duplicar
        type: 'customer',
        severity: 'warning',
        title: `⚠️ ${atRiskVIPs.length} Clientes VIP en Riesgo`,
        message: `Clientes de alto valor que no han visitado en más de 45 días. Envía campaña de reactivación urgente.`,
        timestamp: new Date(),
        actionable: true,
        action: {
          label: 'Enviar campaña',
          url: '/marketing/campaigns/reactivation'
        },
        metadata: { clients: atRiskVIPs },
        read: false
      });
    }

    // Detectar patrón de compra recurrente
    const recurringClients = clients.filter(c => {
      const clientTransactions = transactions.filter(t => t.clientId === c.id);
      if (clientTransactions.length < 3) return false;

      // Calcular intervalos entre visitas
      const dates = clientTransactions.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
      const intervals = [];
      for (let i = 1; i < dates.length; i++) {
        intervals.push(differenceInDays(dates[i], dates[i - 1]));
      }

      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      const lastVisit = dates[dates.length - 1];
      const daysSince = differenceInDays(now, lastVisit);

      // Cliente "debería" volver pronto
      return Math.abs(daysSince - avgInterval) < 3 && daysSince >= avgInterval - 2;
    });

    if (recurringClients.length > 0) {
      alerts.push({
        id: 'customer-recurring-expected',
        type: 'customer',
        severity: 'info',
        title: `🔔 ${recurringClients.length} Clientes Esperados Próximamente`,
        message: `Basado en patrones históricos, estos clientes deberían agendar cita pronto. Envía recordatorio proactivo.`,
        timestamp: new Date(),
        actionable: true,
        action: {
          label: 'Enviar recordatorio',
          url: '/marketing/campaigns/reminder'
        },
        metadata: { clients: recurringClients },
        read: false
      });
    }

    return alerts;
  }

  /**
   * Alertas de rendimiento del negocio
   */
  private analyzePerformance(transactions: any[]): Alert[] {
    const alerts: Alert[] = [];

    // Últimos 7 días vs 7 días anteriores
    const now = new Date();
    const last7Days = transactions.filter(t => differenceInDays(now, new Date(t.date)) <= 7);
    const previous7Days = transactions.filter(t => {
      const days = differenceInDays(now, new Date(t.date));
      return days > 7 && days <= 14;
    });

    const currentRevenue = last7Days.reduce((sum, t) => sum + t.amount, 0);
    const previousRevenue = previous7Days.reduce((sum, t) => sum + t.amount, 0);
    const change = ((currentRevenue - previousRevenue) / previousRevenue) * 100;

    if (Math.abs(change) > 15) {
      const isPositive = change > 0;
      alerts.push({
        id: 'performance-weekly', // ID Fijo
        type: 'performance',
        severity: isPositive ? 'info' : 'warning',
        title: isPositive ? '📈 Crecimiento Semanal Fuerte' : '📉 Caída en Rendimiento Semanal',
        message: `Ingresos ${isPositive ? 'aumentaron' : 'disminuyeron'} ${Math.abs(change).toFixed(1)}% vs semana anterior (${isPositive ? '+' : ''}$${Math.round(currentRevenue - previousRevenue).toLocaleString()}).`,
        timestamp: new Date(),
        actionable: !isPositive,
        action: !isPositive ? {
          label: 'Analizar causas',
          url: '/analytics/performance'
        } : undefined,
        metadata: { currentRevenue, previousRevenue, change },
        read: false
      });
    }

    return alerts;
  }

  /**
   * Agregar alerta y notificar suscriptores
   * CORRECCIÓN: Evita agregar alertas si el ID ya existe
   */
  private addAlert(alert: Alert) {
    // 1. Verificar si ya existe una alerta con este ID
    const exists = this.alerts.some(a => a.id === alert.id);
    
    if (exists) {
        // Si ya existe, no hacemos nada (o podríamos actualizar el timestamp si quisieras)
        return; 
    }

    // 2. Si no existe, la agregamos al inicio
    this.alerts.unshift(alert);
    
    // Limitar a últimas 100 alertas
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    // Notificar suscriptores
    this.notifySubscribers(alert);
  }

  /**
   * Suscribirse a nuevas alertas
   */
  subscribe(callback: (alert: Alert) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  /**
   * Notificar a todos los suscriptores
   */
  private notifySubscribers(alert: Alert) {
    this.subscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error notifying subscriber:', error);
      }
    });
  }

  /**
   * Obtener todas las alertas
   */
  getAlerts(filters?: { type?: AlertType; severity?: AlertSeverity; unread?: boolean }) {
    let filtered = [...this.alerts];

    if (filters?.type) {
      filtered = filtered.filter(a => a.type === filters.type);
    }

    if (filters?.severity) {
      filtered = filtered.filter(a => a.severity === filters.severity);
    }

    if (filters?.unread) {
      filtered = filtered.filter(a => !a.read);
    }

    return filtered;
  }

  /**
   * Marcar alerta como leída
   */
  markAsRead(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.read = true;
    }
  }

  /**
   * Limpiar alertas antiguas
   */
  clearOldAlerts(daysOld: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoffDate);
  }
}

// ==========================================
// SISTEMA DE NOTIFICACIONES PUSH
// ==========================================
export class NotificationService {
  /**
   * Envía notificación al navegador (Web Push API)
   */
  async sendBrowserNotification(alert: Alert) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        new Notification(alert.title, {
          body: alert.message,
          icon: this.getIconForType(alert.type),
          badge: '/icon-badge.png',
          tag: alert.id,
          requireInteraction: alert.severity === 'critical'
        });
      } catch (e) {
        // Ignorar errores de notificación si la pestaña está oculta o bloqueada
      }
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.sendBrowserNotification(alert);
      }
    }
  }

  /**
   * Envía notificación por email (integración con servicio)
   */
  async sendEmailNotification(alert: Alert, recipient: string) {
    // Integrar con SendGrid, Resend, etc.
    try {
      await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient,
          subject: alert.title,
          body: alert.message,
          severity: alert.severity
        })
      });
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  /**
   * Envía notificación por SMS (integración con Twilio)
   */
  async sendSMSNotification(alert: Alert, phoneNumber: string) {
    if (alert.severity !== 'critical') return; // Solo críticas por SMS

    try {
      await fetch('/api/notifications/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          message: `${alert.title}: ${alert.message}`
        })
      });
    } catch (error) {
      console.error('Error sending SMS:', error);
    }
  }

  private getIconForType(type: AlertType): string {
    const icons: Record<AlertType, string> = {
      opportunity: '/icons/opportunity.png',
      risk: '/icons/warning.png',
      anomaly: '/icons/alert.png',
      trend: '/icons/trending.png',
      inventory: '/icons/package.png',
      customer: '/icons/user.png',
      performance: '/icons/chart.png'
    };
    return icons[type] || '/icons/default.png';
  }
}