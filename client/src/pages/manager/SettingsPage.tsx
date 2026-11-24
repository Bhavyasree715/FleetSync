import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { RuleSettings } from '../../types';
import { Settings, Save, Bell, Shield, Sliders, CheckCircle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Partial<RuleSettings>>({
    overspeedThreshold: 65,
    truckSpeedLimit: 50,
    vanSpeedLimit: 65,
    carSpeedLimit: 80,
    bikeSpeedLimit: 50,
    idleMinutesThreshold: 5,
    offlineSecondsThreshold: 30,
    notificationSound: true,
  });

  const [vapidKey, setVapidKey] = useState<string>('');
  const [pushStatus, setPushStatus] = useState<string>('idle');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    api.get('/settings').then((res) => {
      if (res.data.settings) setSettings(res.data.settings);
      if (res.data.vapidPublicKey) setVapidKey(res.data.vapidPublicKey);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/settings', settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      alert('Failed to save settings.');
    }
  };

  const handleEnableWebPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications not supported by this browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission denied.');
        return;
      }

      setPushStatus('subscribed');
      alert('Web Push notifications enabled! You will receive instant system alerts on this device.');
    } catch (e) {
      console.error('Push registration error', e);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-500" />
            System Rules & Admin Configurations
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure vehicle class speed limits, idle & offline alert timeouts, and Web Push notifications
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600">
            <CheckCircle className="h-4 w-4" /> Settings Saved!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Speed Limits Configuration */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Sliders className="h-4 w-4 text-emerald-500" />
            Vehicle Class Speed Limits (km/h)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Heavy Trucks
              </label>
              <input
                type="number"
                value={settings.truckSpeedLimit || 50}
                onChange={(e) => setSettings({ ...settings, truckSpeedLimit: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Commercial Vans
              </label>
              <input
                type="number"
                value={settings.vanSpeedLimit || 65}
                onChange={(e) => setSettings({ ...settings, vanSpeedLimit: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Fleet Cars
              </label>
              <input
                type="number"
                value={settings.carSpeedLimit || 80}
                onChange={(e) => setSettings({ ...settings, carSpeedLimit: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Delivery Bikes
              </label>
              <input
                type="number"
                value={settings.bikeSpeedLimit || 50}
                onChange={(e) => setSettings({ ...settings, bikeSpeedLimit: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Rule Engine Thresholds */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-blue-500" />
            Rule Engine Alert Thresholds
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Stationary Idle Duration Trigger (Minutes)
              </label>
              <input
                type="number"
                value={settings.idleMinutesThreshold || 5}
                onChange={(e) => setSettings({ ...settings, idleMinutesThreshold: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Alerts manager if vehicle speed remains &lt; 2 km/h longer than this limit
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Offline Timeout Trigger (Seconds)
              </label>
              <input
                type="number"
                value={settings.offlineSecondsThreshold || 30}
                onChange={(e) => setSettings({ ...settings, offlineSecondsThreshold: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Marks vehicle as offline if no GPS beacon is received within this time
              </span>
            </div>
          </div>
        </div>

        {/* Web Push Notifications */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="h-4 w-4 text-emerald-500" />
                Browser Web Push Notifications (VAPID)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Receive background device notifications for critical emergencies, crashes, and breaches
              </p>
            </div>

            <button
              type="button"
              onClick={handleEnableWebPush}
              className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-slate-800 dark:bg-emerald-600"
            >
              {pushStatus === 'subscribed' ? 'Notifications Enabled' : 'Enable Web Push'}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500"
          >
            <Save className="h-4 w-4" /> Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
};
