import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Vehicle } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { Truck, Plus, Trash2, Edit2, Shield, User, X } from 'lucide-react';

export const VehicleManagement: React.FC = () => {
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [plateNumber, setPlateNumber] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState<'truck' | 'van' | 'car' | 'bike'>('truck');
  const [speedLimit, setSpeedLimit] = useState(60);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const res = await api.get('/vehicles');
      setVehicles(res.data.vehicles || []);
    } catch (e) {
      console.error('Failed to load vehicles', e);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/vehicles', {
        plateNumber,
        model,
        type,
        speedLimit: Number(speedLimit),
      });
      setShowAddModal(false);
      setPlateNumber('');
      setModel('');
      loadVehicles();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add vehicle.');
    }
  };

  const handleDeleteVehicle = async (id: string, plate: string) => {
    if (!window.confirm(`Are you sure you want to remove vehicle ${plate}?`)) return;
    try {
      await api.delete(`/vehicles/${id}`);
      loadVehicles();
    } catch (e) {
      alert('Failed to delete vehicle.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="h-5 w-5 text-emerald-500" />
            Fleet Vehicles & Driver Profiles
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Register vehicles, configure speed thresholds per class, and assign commercial drivers
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      {/* Vehicle Grid Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                {v.plateNumber}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  v.status === 'moving'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : v.status === 'arrived'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : v.status === 'idle'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {v.status}
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <span className="text-slate-400">Model:</span> <span className="font-semibold">{v.model}</span>
              </div>
              <div>
                <span className="text-slate-400">Class:</span> <span className="font-semibold capitalize">{v.type}</span>
              </div>
              <div>
                <span className="text-slate-400">Speed Limit:</span>{' '}
                <span className="font-bold text-slate-800 dark:text-white">{v.speedLimit} km/h</span>
              </div>
              <div>
                <span className="text-slate-400">Assigned Driver:</span>{' '}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {v.driver?.user?.name || 'Unassigned'}
                </span>
              </div>
              {v.driver?.safetyScore && (
                <div>
                  <span className="text-slate-400">Driver Safety:</span>{' '}
                  <span className="font-bold">{v.driver.safetyScore}/100</span>
                </div>
              )}
            </div>

            <div className="mt-4 border-t pt-3 flex justify-end gap-2 dark:border-slate-800">
              <button
                onClick={() => handleDeleteVehicle(v.id, v.plateNumber)}
                className="rounded-xl p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                title="Delete vehicle"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Register New Fleet Vehicle</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  License Plate Number
                </label>
                <input
                  type="text"
                  required
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. TN-09-XY-4321"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Make & Model
                </label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Tata Intra V30"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="truck">Truck</option>
                    <option value="van">Van</option>
                    <option value="car">Car</option>
                    <option value="bike">Bike</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Speed Limit (km/h)
                  </label>
                  <input
                    type="number"
                    value={speedLimit}
                    onChange={(e) => setSpeedLimit(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
