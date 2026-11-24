import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Geofence } from '../../types';
import { Shield, Plus, Trash2, Edit, Check, X, MapPin } from 'lucide-react';

export const GeofenceEditor: React.FC = () => {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'circle' | 'polygon'>('circle');
  const [centerLat, setCenterLat] = useState(13.0694);
  const [centerLng, setCenterLng] = useState(80.1948);
  const [radiusMeters, setRadiusMeters] = useState(800);
  const [alertOnEntry, setAlertOnEntry] = useState(true);
  const [alertOnExit, setAlertOnExit] = useState(true);
  const [color, setColor] = useState('#3b82f6');

  useEffect(() => {
    loadGeofences();
  }, []);

  const loadGeofences = async () => {
    try {
      const res = await api.get('/geofences');
      setGeofences(res.data.geofences || []);
    } catch (e) {
      console.error('Failed to load geofences', e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/geofences', {
        name,
        type,
        centerLat: Number(centerLat),
        centerLng: Number(centerLng),
        radiusMeters: Number(radiusMeters),
        alertOnEntry,
        alertOnExit,
        color,
      });
      setShowModal(false);
      setName('');
      loadGeofences();
    } catch (e) {
      alert('Failed to create geofence.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this geofence boundary?')) return;
    try {
      await api.delete(`/geofences/${id}`);
      loadGeofences();
    } catch (e) {
      alert('Failed to delete.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            Geofence Zones & Virtual Perimeter Alerts
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define circular depot areas or polygonal tech corridor perimeters with automatic breach alerts
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" /> Create Geofence
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {geofences.map((fence) => (
          <div
            key={fence.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: fence.color || '#3b82f6' }}
                />
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {fence.name}
                </span>
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {fence.type}
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <p>
                <span className="text-slate-400">Center:</span> {fence.centerLat.toFixed(4)}, {fence.centerLng.toFixed(4)}
              </p>
              <p>
                <span className="text-slate-400">Radius:</span> {fence.radiusMeters} meters
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px]">
                <span className={`px-2 py-0.5 rounded font-semibold ${fence.alertOnEntry ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                  Entry Alert: {fence.alertOnEntry ? 'ON' : 'OFF'}
                </span>
                <span className={`px-2 py-0.5 rounded font-semibold ${fence.alertOnExit ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                  Exit Alert: {fence.alertOnExit ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>

            <div className="mt-4 border-t pt-3 flex justify-end dark:border-slate-800">
              <button
                onClick={() => handleDelete(fence.id)}
                className="rounded-xl p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                title="Delete geofence"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create Geofence Zone</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Geofence Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Marina Beach Restricted Corridor"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={centerLat}
                    onChange={(e) => setCenterLat(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={centerLng}
                    onChange={(e) => setCenterLng(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Radius (Meters)
                </label>
                <input
                  type="number"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alertOnEntry}
                    onChange={(e) => setAlertOnEntry(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Alert on Entry</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alertOnExit}
                    onChange={(e) => setAlertOnExit(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Alert on Exit</span>
                </label>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
                >
                  Save Geofence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
