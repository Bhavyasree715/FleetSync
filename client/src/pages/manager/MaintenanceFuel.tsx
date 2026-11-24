import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Vehicle } from '../../types';
import { Wrench, Fuel, Plus, AlertCircle, CheckCircle, Calendar } from 'lucide-react';

export const MaintenanceFuel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'maintenance' | 'fuel'>('maintenance');
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mRes, fRes, vRes] = await Promise.all([
        api.get('/maintenance'),
        api.get('/fuel'),
        api.get('/vehicles'),
      ]);
      setMaintenanceLogs(mRes.data.logs || []);
      setFuelLogs(fRes.data.logs || []);
      setVehicles(vRes.data.vehicles || []);
    } catch (e) {
      console.error('Failed to load maintenance/fuel data', e);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="h-5 w-5 text-emerald-500" />
            Maintenance Schedules & Fuel Telemetry
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Preventative service reminders by odometer km/date, and fuel economy tracker (cost per km)
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'maintenance'
                ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Wrench className="h-3.5 w-3.5 text-emerald-500" /> Maintenance Logs
          </button>
          <button
            onClick={() => setActiveTab('fuel')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'fuel'
                ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Fuel className="h-3.5 w-3.5 text-blue-500" /> Fuel Refills
          </button>
        </div>
      </div>

      {activeTab === 'maintenance' ? (
        <div className="space-y-3">
          {maintenanceLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {log.vehicle?.plateNumber}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      log.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
                <h4 className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {log.serviceType}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scheduled Date: {new Date(log.scheduledDate).toLocaleDateString()} • Scheduled Km: {log.scheduledKm || 'N/A'}
                </p>
                {log.notes && (
                  <p className="text-[11px] text-slate-400 mt-1 italic">{log.notes}</p>
                )}
              </div>

              <div className="text-right">
                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                  ₹{log.cost}
                </span>
                <span className="text-[10px] text-slate-400">Total Invoiced</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {fuelLogs.map((fuel) => (
            <div
              key={fuel.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                  {fuel.vehicle?.plateNumber}
                </span>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {fuel.liters} Liters Refill ({fuel.station || 'Commercial Fuel Outlet'})
                </h4>
                <p className="text-xs text-slate-500">
                  Odometer: {fuel.odometerKm} km • Filled on: {new Date(fuel.filledAt).toLocaleDateString()}
                </p>
              </div>

              <div className="text-right">
                <span className="text-sm font-bold text-emerald-600 block">
                  ₹{fuel.totalCost}
                </span>
                <span className="text-[10px] text-slate-400">
                  ₹{(fuel.totalCost / (fuel.liters || 1)).toFixed(1)} / L
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
