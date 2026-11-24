import React, { useState, useEffect } from 'react';
import { FleetMap } from '../../components/map/FleetMap';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { Vehicle, Geofence } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import {
  Search,
  Filter,
  Navigation,
  Battery,
  AlertTriangle,
  Clock,
  Layers,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react';

export const LiveMap: React.FC = () => {
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tileProvider, setTileProvider] = useState<'carto_light' | 'carto_dark' | 'osm' | 'satellite'>('carto_light');
  const [showGeofences, setShowGeofences] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.0400, 80.2200]);
  const [mapZoom, setMapZoom] = useState(12);

  // Fetch initial fleet and geofences
  useEffect(() => {
    loadFleetData();

    const socket = getSocket();

    // Listen for live vehicle updates (< 1s latency)
    const handleVehicleUpdate = (updatedVehicle: any) => {
      setVehicles((prev) => {
        const index = prev.findIndex((v) => v.id === updatedVehicle.vehicleId);
        if (index >= 0) {
          const copy = [...prev];
          copy[index] = {
            ...copy[index],
            status: updatedVehicle.status,
            currentLat: updatedVehicle.lat,
            currentLng: updatedVehicle.lng,
            currentSpeed: updatedVehicle.speed,
            currentHeading: updatedVehicle.heading,
            batteryLevel: updatedVehicle.batteryLevel,
            accuracy: updatedVehicle.accuracy,
            lastActiveAt: updatedVehicle.lastActiveAt,
          };
          return copy;
        }
        return prev;
      });

      // Update selected vehicle if it's the one that received update
      setSelectedVehicle((prev) => {
        if (prev && prev.id === updatedVehicle.vehicleId) {
          return {
            ...prev,
            status: updatedVehicle.status,
            currentLat: updatedVehicle.lat,
            currentLng: updatedVehicle.lng,
            currentSpeed: updatedVehicle.speed,
            currentHeading: updatedVehicle.heading,
            batteryLevel: updatedVehicle.batteryLevel,
          };
        }
        return prev;
      });
    };

    socket.on('vehicle:update', handleVehicleUpdate);

    return () => {
      socket.off('vehicle:update', handleVehicleUpdate);
    };
  }, []);

  const loadFleetData = async () => {
    try {
      const [vehRes, geoRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/geofences'),
      ]);
      setVehicles(vehRes.data.vehicles || []);
      setGeofences(geoRes.data.geofences || []);
    } catch (e) {
      console.error('Failed to load fleet data', e);
    }
  };

  const handleSelectVehicle = (v: Vehicle) => {
    setSelectedVehicle(v);
    if (v.currentLat && v.currentLng) {
      setMapCenter([v.currentLat, v.currentLng]);
      setMapZoom(14);
    }
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchPlate = v.plateNumber.toLowerCase().includes(q);
      const matchModel = v.model.toLowerCase().includes(q);
      const matchDriver = v.driver?.user?.name?.toLowerCase().includes(q);
      if (!matchPlate && !matchModel && !matchDriver) return false;
    }
    return true;
  });

  // KPI counts
  const totalCount = vehicles.length;
  const movingCount = vehicles.filter((v) => v.status === 'moving').length;
  const idleCount = vehicles.filter((v) => v.status === 'idle').length;
  const arrivedCount = vehicles.filter((v) => v.status === 'arrived').length;
  const offlineCount = vehicles.filter((v) => v.status === 'offline').length;

  return (
    <div className="relative flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Left Sidebar: Vehicle List & Filters */}
      <div className="z-10 flex w-80 flex-col border-r border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 shadow-md">
        {/* KPI Status Summary Bar */}
        <div className="border-b border-slate-200 p-3 dark:border-slate-800">
          <div className="grid grid-cols-5 gap-1 text-center">
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg p-1 transition ${statusFilter === 'all' ? 'bg-slate-200 dark:bg-slate-700 font-bold' : ''}`}
            >
              <div className="text-xs font-bold text-slate-800 dark:text-white">{totalCount}</div>
              <div className="text-[10px] text-slate-500">All</div>
            </button>
            <button
              onClick={() => setStatusFilter('moving')}
              className={`rounded-lg p-1 transition ${statusFilter === 'moving' ? 'bg-emerald-100 dark:bg-emerald-950/50 font-bold' : ''}`}
            >
              <div className="text-xs font-bold text-emerald-600">{movingCount}</div>
              <div className="text-[10px] text-slate-500">Moving</div>
            </button>
            <button
              onClick={() => setStatusFilter('arrived')}
              className={`rounded-lg p-1 transition ${statusFilter === 'arrived' ? 'bg-blue-100 dark:bg-blue-950/50 font-bold' : ''}`}
            >
              <div className="text-xs font-bold text-blue-600">{arrivedCount}</div>
              <div className="text-[10px] text-slate-500">Arrived</div>
            </button>
            <button
              onClick={() => setStatusFilter('idle')}
              className={`rounded-lg p-1 transition ${statusFilter === 'idle' ? 'bg-amber-100 dark:bg-amber-950/50 font-bold' : ''}`}
            >
              <div className="text-xs font-bold text-amber-600">{idleCount}</div>
              <div className="text-[10px] text-slate-500">Idle</div>
            </button>
            <button
              onClick={() => setStatusFilter('offline')}
              className={`rounded-lg p-1 transition ${statusFilter === 'offline' ? 'bg-slate-200 dark:bg-slate-700 font-bold' : ''}`}
            >
              <div className="text-xs font-bold text-slate-500">{offlineCount}</div>
              <div className="text-[10px] text-slate-500">Offline</div>
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vehicle, model, driver..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Vehicle Item List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredVehicles.map((v) => {
            const isSelected = selectedVehicle?.id === v.id;
            return (
              <div
                key={v.id}
                onClick={() => handleSelectVehicle(v)}
                className={`cursor-pointer rounded-xl p-3 border transition ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
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

                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{v.model}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {Math.round(v.currentSpeed)} km/h
                  </span>
                </div>

                {v.driver?.user && (
                  <div className="mt-1 text-[11px] text-slate-400">
                    Driver: <span className="font-medium text-slate-600 dark:text-slate-300">{v.driver.user.name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Map Area */}
      <div className="relative flex-1 h-full w-full">
        {/* Floating Controls Bar (Map Provider, Geofences toggle) */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center gap-1 text-xs">
            <Layers className="h-4 w-4 text-slate-500" />
            <select
              value={tileProvider}
              onChange={(e: any) => setTileProvider(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="carto_light">Carto Light</option>
              <option value="carto_dark">Carto Dark</option>
              <option value="osm">OSM Standard</option>
              <option value="satellite">Satellite</option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          <button
            onClick={() => setShowGeofences(!showGeofences)}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
              showGeofences
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Geofences</span>
          </button>
        </div>

        {/* Map Canvas */}
        <FleetMap
          vehicles={filteredVehicles}
          geofences={showGeofences ? geofences : []}
          selectedVehicleId={selectedVehicle?.id}
          onSelectVehicle={handleSelectVehicle}
          center={mapCenter}
          zoom={mapZoom}
          tileProvider={tileProvider}
        />

        {/* Vehicle Details Floating Drawer Card */}
        {selectedVehicle && (
          <div className="absolute bottom-6 right-6 z-20 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedVehicle.plateNumber}
                </h4>
                <p className="text-[11px] text-slate-500">{selectedVehicle.model} ({selectedVehicle.type})</p>
              </div>
              <button
                onClick={() => setSelectedVehicle(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                <span className="text-[10px] text-slate-400 block">Status</span>
                <span className="font-bold text-emerald-600 uppercase">{selectedVehicle.status}</span>
              </div>
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                <span className="text-[10px] text-slate-400 block">Speed</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {Math.round(selectedVehicle.currentSpeed)} km/h
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                <span className="text-[10px] text-slate-400 block">Battery Level</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedVehicle.batteryLevel || 85}%
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                <span className="text-[10px] text-slate-400 block">Speed Limit</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedVehicle.speedLimit} km/h
                </span>
              </div>
            </div>

            <div className="mt-3 border-t pt-2 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <p>
                <span className="text-slate-400">Driver:</span>{' '}
                <span className="font-semibold">{selectedVehicle.driver?.user?.name || 'Unassigned'}</span>
              </p>
              {selectedVehicle.driver?.user?.phone && (
                <p>
                  <span className="text-slate-400">Phone:</span> {selectedVehicle.driver.user.phone}
                </p>
              )}
            </div>

            <a
              href={`/history?vehicleId=${selectedVehicle.id}`}
              className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              <span>View Route History Replay</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
