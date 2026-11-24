import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Trip, Vehicle } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import {
  Send,
  Plus,
  MapPin,
  Clock,
  Shield,
  Truck,
  ExternalLink,
  RotateCcw,
  Check,
  ChevronRight,
  Copy,
} from 'lucide-react';

export const TripDispatch: React.FC = () => {
  const { t } = useLanguage();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRerouteModal, setShowRerouteModal] = useState<Trip | null>(null);

  // Form fields for new trip
  const [title, setTitle] = useState('');
  const [pickupAddress, setPickupAddress] = useState('Anna Nagar Logistics Depot, Chennai');
  const [pickupLat, setPickupLat] = useState(13.0850);
  const [pickupLng, setPickupLng] = useState(80.2100);
  const [dropAddress, setDropAddress] = useState('Tidel Park IT Corridor, OMR');
  const [dropLat, setDropLat] = useState(12.9850);
  const [dropLng, setDropLng] = useState(80.2450);
  const [priority, setPriority] = useState<'low' | 'normal' | 'urgent'>('normal');
  const [notes, setNotes] = useState('');

  // Candidates ranked for dispatch
  const [rankedCandidates, setRankedCandidates] = useState<any[]>([]);
  const [isRanking, setIsRanking] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const res = await api.get('/trips');
      setTrips(res.data.trips || []);
    } catch (e) {
      console.error('Failed to load trips', e);
    }
  };

  // Rank nearest vehicles when pickup changes or modal opens
  const fetchRankedVehicles = async () => {
    setIsRanking(true);
    try {
      const res = await api.post('/trips/rank-vehicles', {
        pickupLat,
        pickupLng,
      });
      setRankedCandidates(res.data.candidates || []);
    } catch (e) {
      console.error('Failed to rank vehicles', e);
    } finally {
      setIsRanking(false);
    }
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    fetchRankedVehicles();
  };

  const handleCreateTrip = async (assignedVehicleId?: string) => {
    try {
      await api.post('/trips', {
        title: title || 'Express Cargo Transit',
        pickupAddress,
        pickupLat,
        pickupLng,
        dropAddress,
        dropLat,
        dropLng,
        priority,
        notes,
        vehicleId: assignedVehicleId,
      });
      setShowCreateModal(false);
      loadTrips();
    } catch (e) {
      alert('Failed to dispatch trip.');
    }
  };

  const handleReroute = async (tripId: string, newDrop: string, newLat: number, newLng: number) => {
    try {
      await api.put(`/trips/${tripId}/reroute`, {
        newDropAddress: newDrop,
        newDropLat: newLat,
        newDropLng: newLng,
      });
      setShowRerouteModal(null);
      loadTrips();
      alert('Trip rerouted! Driver console updated with new route.');
    } catch (e) {
      alert('Failed to reroute trip.');
    }
  };

  const copyTrackingLink = (code: string) => {
    const url = `${window.location.origin}/track/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(code);
    setTimeout(() => setCopiedLink(null), 3000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="h-5 w-5 text-emerald-500" />
            {t.dispatch.availableVehicles}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Intelligent vehicle coordination, proximity ranking (Haversine + OSRM), and live rerouting
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" /> {t.dispatch.createTrip}
        </button>
      </div>

      {/* Trips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trips.map((trip) => {
          return (
            <div
              key={trip.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {trip.trackingCode}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      trip.status === 'in_progress'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : trip.status === 'completed'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {trip.status}
                  </span>
                </div>

                <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {trip.title}
                </h4>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-start gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Pickup</span>
                      <span>{trip.pickupAddress}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500 mt-1" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Destination</span>
                      <span>{trip.dropAddress}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-2 text-xs dark:bg-slate-800/60">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Distance</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {trip.distanceKm} km
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Estimated ETA</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      ~{trip.estimatedDurationMin} mins
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Assigned To</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {trip.vehicle?.plateNumber || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => copyTrackingLink(trip.trackingCode)}
                  className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  title="Share customer live tracking URL"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedLink === trip.trackingCode ? 'Link Copied!' : 'Share Link'}</span>
                </button>

                {trip.status === 'in_progress' && (
                  <button
                    onClick={() => setShowRerouteModal(trip)}
                    className="flex items-center gap-1 rounded-xl bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                  >
                    <RotateCcw className="h-3 w-3" /> Reroute
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create & Nearest Dispatch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Create Trip & Nearest Vehicle Dispatch
            </h3>
            <p className="text-xs text-slate-500">
              Algorithm ranks active fleet vehicles by proximity, traffic duration, and driver safety score.
            </p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Trip Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Critical Medical Batch"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e: any) => setPriority(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Pickup Location
                </label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Destination Address
                </label>
                <input
                  type="text"
                  value={dropAddress}
                  onChange={(e) => setDropAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Nearest Ranked Vehicles List */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Ranked Nearest Vehicles (ETA & Proximity)
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  Haversine + OSRM Road Distance
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {rankedCandidates.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-4 text-center text-xs text-slate-400">
                    No active vehicles nearby or calculation in progress...
                  </div>
                ) : (
                  rankedCandidates.map((c, index) => (
                    <div
                      key={c.vehicleId}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/80"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                          #{index + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {c.plateNumber} ({c.model})
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Driver: {c.driverName || 'Available'} • Safety Score: {c.safetyScore}/100
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right text-xs">
                          <span className="font-bold text-emerald-600 block">
                            ~{c.estimatedArrivalMin} min ETA
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {c.roadDistanceKm} km away
                          </span>
                        </div>

                        <button
                          onClick={() => handleCreateTrip(c.vehicleId)}
                          className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
                        >
                          Dispatch
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-4 dark:border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateTrip()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-emerald-600"
              >
                Save as Pending (Manual Dispatch)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reroute Modal */}
      {showRerouteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Reroute Live Trip: {showRerouteModal.trackingCode}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Change the destination on the fly. The driver will receive an instant WebSocket reroute push.
            </p>

            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                New Destination Address
              </label>
              <input
                type="text"
                defaultValue="Apollo Hospital Central Facility, Greams Road"
                id="newDropInput"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowRerouteModal(null)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = (document.getElementById('newDropInput') as HTMLInputElement).value;
                  handleReroute(showRerouteModal.id, input, 13.0600, 80.2520);
                }}
                className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
              >
                Confirm Reroute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
