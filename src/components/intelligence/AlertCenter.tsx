'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, X, Check, AlertCircle, TrendingUp, 
  Package, Users, Activity, ExternalLink,
  CheckCircle, AlertTriangle, Info
} from 'lucide-react';
import { AlertEngine, NotificationService, type Alert, type AlertSeverity, type AlertType } from '@/lib/ml/alert-engine';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AlertCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | AlertSeverity>('all');
  const [alertEngine] = useState(() => new AlertEngine());
  const [notificationService] = useState(() => new NotificationService());

  useEffect(() => {
    // Cargar datos iniciales y generar alertas
    loadAndAnalyze();

    // Actualizar cada 5 minutos
    const interval = setInterval(loadAndAnalyze, 5 * 60 * 1000);

    // Suscribirse a nuevas alertas
    const unsubscribe = alertEngine.subscribe((alert: Alert) => {
      // Mostrar notificación del navegador
      notificationService.sendBrowserNotification(alert);
      
      // Actualizar lista
      setAlerts(prev => [alert, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const loadAndAnalyze = async () => {
    try {
      // Cargar datos del sistema
      const [transactions, predictions, clients, inventory, externalFactors] = await Promise.all([
        fetchTransactions(),
        fetchPredictions(),
        fetchClients(),
        fetchInventory(),
        fetchExternalFactors()
      ]);

      // Generar alertas
      const newAlerts = alertEngine.analyzeAndGenerateAlerts({
        transactions,
        predictions,
        clients,
        inventory,
        externalFactors
      });

      setAlerts(alertEngine.getAlerts());
      setUnreadCount(alertEngine.getAlerts({ unread: true }).length);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  // Mock data fetchers
  const fetchTransactions = async () => {
    return Array(100).fill(0).map((_, i) => ({
      id: `t${i}`,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 500 + Math.random() * 5000,
      type: Math.random() > 0.5 ? 'service' : 'product',
      items: ['Item A', 'Item B'],
      clientId: `c${Math.floor(Math.random() * 50)}`
    }));
  };

  const fetchPredictions = async () => [];
  const fetchClients = async () => [];
  const fetchInventory = async () => [];
  const fetchExternalFactors = async () => ({});

  const handleMarkAsRead = (alertId: string) => {
    alertEngine.markAsRead(alertId);
    setAlerts(alertEngine.getAlerts());
    setUnreadCount(alertEngine.getAlerts({ unread: true }).length);
  };

  const handleMarkAllAsRead = () => {
    alerts.forEach(alert => alertEngine.markAsRead(alert.id));
    setAlerts(alertEngine.getAlerts());
    setUnreadCount(0);
  };

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(a => a.severity === filter);

  return (
    <>
      {/* Botón flotante */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full h-14 w-14 shadow-xl bg-blue-600 hover:bg-blue-700 relative"
        >
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </div>

      {/* Panel de alertas */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <Card className="relative w-full max-w-md h-full m-0 rounded-none border-l shadow-2xl animate-in slide-in-from-right">
            <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5" />
                  <CardTitle>Centro de Alertas</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Filtros */}
              <div className="flex gap-2 mt-4">
                <FilterButton
                  label="Todas"
                  count={alerts.length}
                  active={filter === 'all'}
                  onClick={() => setFilter('all')}
                />
                <FilterButton
                  label="Críticas"
                  count={alerts.filter(a => a.severity === 'critical').length}
                  active={filter === 'critical'}
                  onClick={() => setFilter('critical')}
                  variant="critical"
                />
                <FilterButton
                  label="Advertencias"
                  count={alerts.filter(a => a.severity === 'warning').length}
                  active={filter === 'warning'}
                  onClick={() => setFilter('warning')}
                  variant="warning"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0 h-[calc(100vh-180px)]">
              {/* Acciones rápidas */}
              {unreadCount > 0 && (
                <div className="p-3 border-b bg-slate-50 flex justify-between items-center">
                  <span className="text-sm text-slate-600">
                    {unreadCount} alertas sin leer
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleMarkAllAsRead}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar todas como leídas
                  </Button>
                </div>
              )}

              {/* Lista de alertas */}
              <ScrollArea className="h-full">
                {filteredAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                    <h3 className="font-semibold text-slate-900 mb-1">Todo en orden</h3>
                    <p className="text-sm text-slate-500">No hay alertas en este momento</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredAlerts.map(alert => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onMarkAsRead={handleMarkAsRead}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alertas críticas como toast */}
      <CriticalAlertToast alerts={alerts.filter(a => a.severity === 'critical' && !a.read)} />
    </>
  );
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function FilterButton({ 
  label, 
  count, 
  active, 
  onClick, 
  variant = 'default' 
}: { 
  label: string; 
  count: number; 
  active: boolean; 
  onClick: () => void; 
  variant?: 'default' | 'critical' | 'warning';
}) {
  const colors = {
    default: active ? 'bg-white text-blue-600' : 'bg-blue-500/20 text-white hover:bg-white/20',
    critical: active ? 'bg-red-100 text-red-700 border-red-300' : 'bg-red-500/20 text-white hover:bg-white/20',
    warning: active ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-orange-500/20 text-white hover:bg-white/20'
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${colors[variant]}`}
    >
      {label} {count > 0 && `(${count})`}
    </button>
  );
}

function AlertCard({ 
  alert, 
  onMarkAsRead 
}: { 
  alert: Alert; 
  onMarkAsRead: (id: string) => void;
}) {
  const severityConfig: Record<AlertSeverity, {
    icon: JSX.Element;
    bgColor: string;
    borderColor: string;
    iconColor: string;
    badgeColor: string;
  }> = {
    info: {
      icon: <Info className="h-5 w-5" />,
      bgColor: 'bg-blue-50',
      borderColor: 'border-l-blue-500',
      iconColor: 'text-blue-600',
      badgeColor: 'bg-blue-100 text-blue-700'
    },
    warning: {
      icon: <AlertTriangle className="h-5 w-5" />,
      bgColor: 'bg-orange-50',
      borderColor: 'border-l-orange-500',
      iconColor: 'text-orange-600',
      badgeColor: 'bg-orange-100 text-orange-700'
    },
    critical: {
      icon: <AlertCircle className="h-5 w-5" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-l-red-500',
      iconColor: 'text-red-600',
      badgeColor: 'bg-red-100 text-red-700'
    }
  };

  const typeIcons: Record<AlertType, any> = {
    opportunity: <TrendingUp className="h-4 w-4" />,
    risk: <AlertCircle className="h-4 w-4" />,
    anomaly: <Activity className="h-4 w-4" />,
    trend: <TrendingUp className="h-4 w-4" />,
    inventory: <Package className="h-4 w-4" />,
    customer: <Users className="h-4 w-4" />,
    performance: <Activity className="h-4 w-4" />
  };

  const config = severityConfig[alert.severity];

  return (
    <div className={`p-4 border-l-4 ${config.borderColor} ${!alert.read ? config.bgColor : 'bg-white'} hover:bg-slate-50 transition-colors`}>
      <div className="flex gap-3">
        {/* Icono */}
        <div className={`shrink-0 ${config.iconColor}`}>
          {config.icon}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-slate-900 text-sm leading-tight">
              {alert.title}
            </h4>
            {!alert.read && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onMarkAsRead(alert.id)}
                className="h-6 w-6 shrink-0"
                title="Marcar como leída"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>

          <p className="text-sm text-slate-600 mb-2 leading-relaxed">
            {alert.message}
          </p>

          {/* Metadata */}
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={`text-[10px] ${config.badgeColor} border-none`}>
              {typeIcons[alert.type]}
              <span className="ml-1 capitalize">{alert.type}</span>
            </Badge>
            <span className="text-xs text-slate-400">
              {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: es })}
            </span>
          </div>

          {/* Acción */}
          {alert.actionable && alert.action && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => {
                if (alert.action?.url) {
                  window.location.href = alert.action.url;
                } else if (alert.action?.callback) {
                  alert.action.callback();
                }
                onMarkAsRead(alert.id);
              }}
            >
              {alert.action.label}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function CriticalAlertToast({ alerts }: { alerts: Alert[] }) {
  const [visible, setVisible] = useState<Alert | null>(null);

  useEffect(() => {
    if (alerts.length > 0 && !visible) {
      setVisible(alerts[0]);
      
      // Auto-hide después de 10 segundos
      const timeout = setTimeout(() => setVisible(null), 10000);
      return () => clearTimeout(timeout);
    }
  }, [alerts]);

  if (!visible) return null;

  return (
    <div className="fixed top-6 right-6 z-50 max-w-md animate-in slide-in-from-top">
      <Card className="border-2 border-red-500 bg-red-50 shadow-2xl">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <div className="shrink-0">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-red-900 mb-1">🚨 {visible.title}</h4>
              <p className="text-sm text-red-800">{visible.message}</p>
              
              {visible.action && (
                <Button
                  size="sm"
                  className="mt-3 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => {
                    if (visible.action?.url) window.location.href = visible.action.url;
                    setVisible(null);
                  }}
                >
                  {visible.action.label}
                </Button>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setVisible(null)}
              className="shrink-0 h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}