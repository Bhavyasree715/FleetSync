import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Truck, MapPin, Clock, Phone, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const CustomerTracking: React.FC = () => {
  const { trackingCode } = useParams<{ trackingCode: string }>();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trackingCode) {
      loadPublicTracking(trackingCode);
      const interval = setInterval(() => loadPublicTracking(trackingCode), 5000);
      return () => clearInterval(interval);
    }
  }, [trackingCode]);

  const loadPublicTracking = async (code: string) => {
    try {
      const res = await api.get(`/trips/public/${code}`);
      setTrip(res.data.trip);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Trip not found.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white text-xs">
        Loading live tracking status...
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white p-4">
        <div className="max-w-md rounded-2xl bg-slate-800 p-6 text-center border border-slate-700">
          <h2 className="text-lg font-bold text-red-400">Tracking Code Not Found</h2>
          <p className="mt-2 text-xs text-slate-300">
            Please check your tracking number and try again.
          </p>
        </div>
      </div>
    );
  }

  const vehicleLat = trip.vehicle?.currentLat || trip.pickupLat;
  const vehicleLng = trip.vehicle?.currentLng || trip.pickupLng;

  const vehicleIcon = L.divIcon({
    html: `
      <div class="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 shadow-xl border-2 border-white ring-4 ring-emerald-500/30 text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
      </div>
    `,
    className: 'public-vehicle-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Brand Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight">
              Fleet<span className="text-emerald-400">Sync</span>
            </span>
            <span className="text-xs text-slate-400 ml-2">Live Tracking Portal</span>
          </div>
        </div>

        <span className="font-mono text-xs font-bold text-emerald-400">
          {trip.trackingCode}
        </span>
      </header>

      {/* Main Tracking Content */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Progress Timeline Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status</span>
              <h2 className="text-lg font-black text-emerald-400 capitalize">
                {trip.status.replace('_', ' ')}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Estimated ETA</span>
              <div className="text-lg font-black text-white">
                ~{trip.estimatedDurationMin} mins
              </div>
            </div>
          </div>

          {/* Stepper Progress bar */}
          <div className="mt-4 flex items-center justify-between text-xs font-semibold relative">
            <div className="flex flex-col items-center z-10">
              <span className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">
                ✓
              </span>
              <span className="mt-1 text-[11px] text-emerald-400">Dispatched</span>
            </div>
            <div className="flex-1 h-1 bg-emerald-500/50 mx-2" />
            <div className="flex flex-col items-center z-10">
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                  trip.status === 'in_progress' || trip.status === 'completed'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                2
              </span>
              <span className="mt-1 text-[11px] text-slate-300">In Transit</span>
            </div>
            <div
              className={`flex-1 h-1 mx-2 ${
                trip.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            />
            <div className="flex flex-col items-center z-10">
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                  trip.status === 'completed'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                3
              </span>
              <span className="mt-1 text-[11px] text-slate-400">Delivered</span>
            </div>
          </div>
        </div>

        {/* Live Map Frame */}
        <div className="h-[360px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative">
          <MapContainer
            center={[vehicleLat, vehicleLng]}
            zoom={13}
            className="h-full w-full z-0"
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution="&copy; OpenStreetMap"
            />

            {/* Live Vehicle Marker */}
            <Marker position={[vehicleLat, vehicleLng]} icon={vehicleIcon}>
              <Popup>
                <div className="text-xs p-1">
                  <p className="font-bold">Live Vehicle Location</p>
                  <p>Speed: {Math.round(trip.vehicle?.currentSpeed || 0)} km/h</p>
                </div>
              </Popup>
            </Marker>

            {/* Drop Destination Marker */}
            <Marker position={[trip.dropLat, trip.dropLng]}>
              <Popup>Destination: {trip.dropAddress}</Popup>
            </Marker>

            {/* Direct Line between Vehicle & Destination */}
            <Polyline
              positions={[
                [vehicleLat, vehicleLng],
                [trip.dropLat, trip.dropLng],
              ]}
              pathOptions={{ color: '#10b981', weight: 3, dashArray: '6 6' }}
            />
          </MapContainer>
        </div>

        {/* Shipment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs space-y-2">
            <h4 className="font-bold text-white text-sm">Delivery Addresses</h4>
            <div>
              <span className="text-slate-400 block text-[10px]">Pickup Origin</span>
              <span className="text-slate-200">{trip.pickupAddress}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Destination</span>
              <span className="text-slate-200">{trip.dropAddress}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs space-y-2">
            <h4 className="font-bold text-white text-sm">Driver & Vehicle Assigned</h4>
            <div>
              <span className="text-slate-400 block text-[10px]">Vehicle</span>
              <span className="text-slate-200 font-bold">{trip.vehicle?.plateNumber} ({trip.vehicle?.model})</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Driver Contact</span>
              <span className="text-emerald-400 font-semibold">{trip.driver?.user?.name || 'Assigned Driver'}</span>
              {trip.driver?.user?.phone && (
                <span className="text-slate-400 block">{trip.driver.user.phone}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
