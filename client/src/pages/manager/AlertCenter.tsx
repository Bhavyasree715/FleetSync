import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { Alert } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  Clock,
  CheckCircle,
  MapPin,
  Volume2,
  VolumeX,
} from 'lucide-react';

export const AlertCenter: React.FC = () => {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    loadAlerts();

    const socket = getSocket();

    const handleNewAlert = (newAlert: Alert) => {
      setAlerts((prev) => [newAlert, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Play chime if sound enabled
      if (soundEnabled) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = newAlert.severity === 'critical' ? 880 : 540;
          gain.gain.value = 0.2;
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        } catch {
          // Audio context might be restricted
        }
      }
    };

    socket.on('alert:new', handleNewAlert);

    return () => {
      socket.off('alert:new', handleNewAlert);
    };
  }, [soundEnabled]);

  const loadAlerts = async () => {
    try {
      const res = await api.get('/alerts');
      setAlerts(res.data.alerts || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (e) {
      console.error('Failed to load alerts', e);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      const res = await api.put(`/alerts/${alertId}/acknowledge`);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, isAcknowledged: true } : a))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Failed to acknowledge alert', e);
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      await api.put('/alerts/acknowledge-all');
      setAlerts((prev) => prev.map((a) => ({ ...a, isAcknowledged: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to acknowledge all', e);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    return true;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-emerald-500" />
            {t.alerts.title}
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                {unreadCount} Active
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time rule engine alerts: Overspeed, Geofence breach, Idle duration, SOS panic
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            title={soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-500" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleAcknowledgeAll}
              className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500"
            >
              Acknowledge All ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800 text-xs">
        <span className="text-slate-400 font-medium">Type:</span>
        {['all', 'overspeed', 'geofence_entry', 'geofence_exit', 'idle', 'sos'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`rounded-lg px-2.5 py-1 capitalize font-semibold transition ${
              filterType === type
                ? 'bg-slate-900 text-white dark:bg-emerald-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {type.replace('_', ' ')}
          </button>
        ))}

        <span className="text-slate-400 font-medium ml-3">Severity:</span>
        {['all', 'critical', 'warning', 'info'].map((sev) => (
          <button
            key={sev}
            onClick={() => setFilterSeverity(sev)}
            className={`rounded-lg px-2.5 py-1 capitalize font-semibold transition ${
              filterSeverity === sev
                ? 'bg-slate-900 text-white dark:bg-emerald-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {sev}
          </button>
        ))}
      </div>

      {/* Alert Feed Cards */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            <CheckCircle className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {t.alerts.noAlerts}
            </p>
          </div>
        ) : (
          filteredAlerts.map((a) => {
            const isCritical = a.severity === 'critical';
            const isWarning = a.severity === 'warning';

            return (
              <div
                key={a.id}
                className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-sm transition sm:flex-row sm:items-center sm:justify-between ${
                  !a.isAcknowledged
                    ? isCritical
                      ? 'border-red-500/40 bg-red-500/5 dark:bg-red-950/20'
                      : isWarning
                      ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20'
                      : 'border-blue-500/40 bg-blue-500/5 dark:bg-blue-950/20'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 opacity-75'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 rounded-xl p-2 ${
                      isCritical
                        ? 'bg-red-500 text-white'
                        : isWarning
                        ? 'bg-amber-500 text-white'
                        : 'bg-blue-500 text-white'
                    }`}
                  >
                    {isCritical ? (
                      <ShieldAlert className="h-5 w-5" />
                    ) : isWarning ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <Bell className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {a.vehicle?.plateNumber || 'Fleet Vehicle'}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[10px] font-bold uppercase ${
                          isCritical
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : isWarning
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        }`}
                      >
                        {a.type}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(a.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                      {a.message}
                    </p>

                    {a.lat && a.lng && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                        <MapPin className="h-3 w-3" />
                        <span>GPS: {a.lat.toFixed(4)}, {a.lng.toFixed(4)}</span>
                        {a.speed !== undefined && a.speed !== null && (
                          <span className="ml-2 font-semibold">Speed: {Math.round(a.speed)} km/h</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center">
                  {a.isAcknowledged ? (
                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      Acknowledged
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(a.id)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
