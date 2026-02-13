'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, X, Check, AlertCircle, TrendingUp, 
  Package, Users, Activity, ExternalLink,
  CheckCircle, AlertTriangle, Info
} from 'lucide-react';
// Asegúrate de que este import apunte al archivo que acabas de guardar
import { AlertEngine, NotificationService, type Alert, type AlertSeverity, type AlertType } from '@/lib/ml/alert-engine';
import { formatDistanceToNow, subDays, addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AlertCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | AlertSeverity>('all');
  
  // Instanciamos los servicios una sola vez
  const alertEngine = useMemo(() => new AlertEngine(), []);
  const notificationService = useMemo(() => new NotificationService(), []);

  useEffect(() => {
    loadAndAnalyze();

    // Loop de análisis (cada 30 seg para demo)
    const interval = setInterval(loadAndAnalyze, 30000);

    // Suscripción Realtime
    const unsubscribe = alertEngine.subscribe((alert: Alert) => {
      notificationService.sendBrowserNotification(alert);
      setAlerts([...alertEngine.getAlerts()]); 
      setUnreadCount(alertEngine.getAlerts({ unread: true }).length);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [alertEngine, notificationService]);

  const loadAndAnalyze = async () => {
    try {
      // Cargamos datos simulados diseñados para disparar alertas
      const [transactions, predictions, clients, inventory] = await Promise.all([
        fetchMockTransactions(),
        fetchMockPredictions(),
        fetchMockClients(),
        fetchMockInventory(),
      ]);

      alertEngine.analyzeAndGenerateAlerts({
        transactions,
        predictions,
        clients,
        inventory,
        externalFactors: { weather: 0.8 }
      });

      setAlerts([...alertEngine.getAlerts()]);
      setUnreadCount(alertEngine.getAlerts({ unread: true }).length);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  // --- MOCK DATA GENERATORS (Diseñados para activar el motor) ---

  const fetchMockTransactions = async () => {
    const txs = [];
    const today = new Date();
    // Generar 30 días de historia
    for (let i = 0; i < 30; i++) {
        const date = subDays(today, i);
        // Base de ventas normal (~$2000)
        let amount = 1500 + Math.random() * 1000;
        
        // ¡ANOMALÍA! Ayer vendimos muchísimo ($8000) para activar alerta
        if (i === 1) amount = 8000; 

        txs.push({
            id: `tx-${i}`,
            date: date.toISOString(),
            amount: amount,
            type: 'service',
            clientId: `client-${Math.floor(Math.random() * 10)}`
        });
    }
    return txs;
  };

  const fetchMockInventory = async () => {
      return [
          { id: 'p1', name: 'Shampoo Hipoalergénico', stock: 45 },
          { id: 'p2', name: 'Perfume Canino', stock: 8 }, // STOCK BAJO -> Alerta Inventory
          { id: 'p3', name: 'Correas Cuero', stock: 2 }   // CRÍTICO -> Alerta Inventory
      ];
  };

  const fetchMockClients = async () => {
      return [
          { id: 'c1', name: 'Juan Perez', last_visit: subDays(new Date(), 20).toISOString(), total_spent: 800 },
          { id: 'c2', name: 'Maria VIP', last_visit: subDays(new Date(), 60).toISOString(), total_spent: 6000 }, // VIP PERDIDO -> Alerta Customer
      ];
  };

  const fetchMockPredictions = async () => {
      return [{
          date: addDays(new Date(), 2).toISOString(),
          predictedRevenue: 8500, // ALTA DEMANDA -> Alerta Opportunity
          confidence: 0.85,
          recommendation: 'Reforzar turno de tarde.',
          factors: { weather: 0.9 }
      }];
  };

  // --- HANDLERS ---

  const handleMarkAsRead = (alertId: string) => {
    alertEngine.markAsRead(alertId);
    setAlerts([...alertEngine.getAlerts()]);
    setUnreadCount(alertEngine.getAlerts({ unread: true }).length);
  };

  const handleMarkAllAsRead = () => {
    alerts.forEach(alert => alertEngine.markAsRead(alert.id));
    setAlerts([...alertEngine.getAlerts()]);
    setUnreadCount(0);
  };

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(a => a.severity === filter);

  return (
    <>
      {/* Botón flotante (Campana) */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full h-14 w-14 shadow-xl bg-blue-600 hover:bg-blue-700 relative transition-transform hover:scale-105 active:scale-95"
        >
          <Bell className="h-6 w-6 text-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white animate-pulse border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </div>

      {/* Panel Lateral Deslizante */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end isolate">
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <Card className="relative w-full max-w-md h-full m-0 rounded-none border-l shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <CardTitle className="text-lg">Centro de Alertas</CardTitle>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 rounded-full h-8 w-8">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
                <FilterButton label="Todas" count={alerts.length} active={filter === 'all'} onClick={() => setFilter('all')} />
                <FilterButton label="Críticas" count={alerts.filter(a => a.severity === 'critical').length} active={filter === 'critical'} onClick={() => setFilter('critical')} variant="critical" />
                <FilterButton label="Avisos" count={alerts.filter(a => a.severity === 'warning').length} active={filter === 'warning'} onClick={() => setFilter('warning')} variant="warning" />
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
              {unreadCount > 0 && (
                <div className="p-2 border-b bg-slate-50 flex justify-between items-center shrink-0">
                  <span className="text-xs text-slate-500 font-medium px-2">{unreadCount} nuevas</span>
                  <Button size="sm" variant="ghost" onClick={handleMarkAllAsRead} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs h-8">
                    <CheckCircle className="h-3 w-3 mr-1.5" /> Marcar todo leído
                  </Button>
                </div>
              )}

              <ScrollArea className="flex-1">
                {filteredAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center p-6 text-slate-400">
                    <CheckCircle className="h-16 w-16 mb-4 opacity-20" />
                    <h3 className="font-semibold text-slate-600 mb-1">Todo limpio</h3>
                    <p className="text-sm">No tienes alertas en esta categoría.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredAlerts.map(alert => (
                      <AlertCard key={alert.id} alert={alert} onMarkAsRead={handleMarkAsRead} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      <CriticalAlertToast alerts={alerts.filter(a => a.severity === 'critical' && !a.read)} />
    </>
  );
}

// --- SUBCOMPONENTES ---

function FilterButton({ label, count, active, onClick, variant = 'default' }: any) {
  const styles = {
    default: active ? 'bg-white text-blue-600 shadow-sm' : 'bg-white/10 text-white hover:bg-white/20',
    critical: active ? 'bg-white text-red-600 shadow-sm' : 'bg-white/10 text-white hover:bg-white/20',
    warning: active ? 'bg-white text-orange-600 shadow-sm' : 'bg-white/10 text-white hover:bg-white/20'
  };

  return (
    <button onClick={onClick} className={`px-3 py-1 rounded-full text-xs font-medium transition-all border border-transparent ${styles[variant as keyof typeof styles]}`}>
      {label} {count > 0 && <span className="opacity-80 ml-1">({count})</span>}
    </button>
  );
}

function AlertCard({ alert, onMarkAsRead }: { alert: Alert; onMarkAsRead: (id: string) => void }) {
  const colors = {
    info: { border: 'border-l-blue-500', bg: 'bg-blue-50/50', icon: <Info className="h-5 w-5 text-blue-500" /> },
    warning: { border: 'border-l-orange-500', bg: 'bg-orange-50/50', icon: <AlertTriangle className="h-5 w-5 text-orange-500" /> },
    critical: { border: 'border-l-red-500', bg: 'bg-red-50/50', icon: <AlertCircle className="h-5 w-5 text-red-500" /> }
  };
  const typeIcons: Record<AlertType, any> = {
    opportunity: <TrendingUp className="h-3 w-3" />, risk: <AlertCircle className="h-3 w-3" />, anomaly: <Activity className="h-3 w-3" />,
    trend: <TrendingUp className="h-3 w-3" />, inventory: <Package className="h-3 w-3" />, customer: <Users className="h-3 w-3" />, performance: <Activity className="h-3 w-3" />
  };

  const c = colors[alert.severity];

  return (
    <div className={`p-4 border-l-4 ${c.border} ${!alert.read ? c.bg : 'bg-white'} hover:bg-slate-50 transition-colors group relative`}>
      <div className="flex gap-3">
        <div className="mt-0.5">{c.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h4 className={`text-sm font-semibold ${!alert.read ? 'text-slate-900' : 'text-slate-600'}`}>{alert.title}</h4>
            <span className="text-[10px] text-slate-400 shrink-0">{formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: es })}</span>
          </div>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">{alert.message}</p>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider h-5 px-1.5 bg-white flex items-center gap-1">
              {typeIcons[alert.type]} {alert.type}
            </Badge>
            {alert.action && (
              <Button size="sm" variant="outline" className="h-6 text-xs ml-auto gap-1" onClick={() => window.location.href = alert.action?.url || '#'}>
                {alert.action.label} <ExternalLink size={10} />
              </Button>
            )}
          </div>
        </div>
      </div>
      {!alert.read && (
        <button onClick={() => onMarkAsRead(alert.id)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Marcar como leída">
          <div className="h-2 w-2 bg-blue-500 rounded-full" />
        </button>
      )}
    </div>
  );
}

function CriticalAlertToast({ alerts }: { alerts: Alert[] }) {
  const [visible, setVisible] = useState<Alert | null>(null);
  useEffect(() => {
    if (alerts.length > 0 && !visible) {
      setVisible(alerts[0]);
      const timer = setTimeout(() => setVisible(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [alerts, visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-20 right-6 z-[60] w-full max-w-sm animate-in slide-in-from-top-5 duration-300">
      <div className="bg-white rounded-lg shadow-2xl border-l-4 border-red-500 p-4 flex gap-3 ring-1 ring-black/5">
        <div className="p-2 bg-red-100 rounded-full h-fit shrink-0"><AlertCircle className="h-5 w-5 text-red-600" /></div>
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 text-sm">{visible.title}</h4>
          <p className="text-sm text-slate-600 mt-1">{visible.message}</p>
          <div className="flex gap-2 mt-3">
            {visible.action && <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white">{visible.action.label}</Button>}
            <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-500" onClick={() => setVisible(null)}>Cerrar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}