import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { queueLocationPoint, syncQueuedPoints, getQueuedPointsCount } from '../../services/offlineQueue';
import { Trip, Vehicle } from '../../types';
import { SignatureModal } from '../../components/driver/SignatureModal';
import { TripChatModal } from '../../components/chat/TripChatModal';
import {
  Navigation,
  Play,
  Square,
  AlertOctagon,
  Battery,
  Wifi,
  WifiOff,
  MapPin,
  CheckCircle,
  MessageSquare,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export const DriverView: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [isTracking, setIsTracking] = useState(false);
  const [gpsGranted, setGpsGranted] = useState<boolean | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [heading, setHeading] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number>(95);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedPoints, setQueuedPoints] = useState(0);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [showPodModal, setShowPodModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [sosStatus, setSosStatus] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const socketRef = useRef(getSocket());

  // Load driver vehicle and active trip
  useEffect(() => {
    loadDriverData();

    // Check battery API if supported
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }

    // Monitor online/offline events for IndexedDB sync
    const handleOnline = async () => {
      setIsOnline(true);
      const synced = await syncQueuedPoints();
      const count = await getQueuedPointsCount();
      setQueuedPoints(count);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check of queued points
    getQueuedPointsCount().then(setQueuedPoints);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      stopTracking();
    };
  }, []);

  const loadDriverData = async () => {
    try {
      const res = await api.get('/trips?status=in_progress');
      if (res.data.trips && res.data.trips.length > 0) {
        setActiveTrip(res.data.trips[0]);
      } else {
        const assigned = await api.get('/trips?status=assigned');
        if (assigned.data.trips && assigned.data.trips.length > 0) {
          setActiveTrip(assigned.data.trips[0]);
        }
      }

      if (user?.driverId) {
        const meRes = await api.get('/auth/me');
        if (meRes.data.user?.vehicle) {
          setVehicle(meRes.data.user.vehicle);
        }
      }
    } catch (e) {
      console.error('Failed to load driver trips', e);
    }
  };

  // Request GPS Permissions
  const requestGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsGranted(true);
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAccuracy(Math.round(pos.coords.accuracy));
      },
      (err) => {
        console.warn('GPS denied or unavailable:', err.message);
        setGpsGranted(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Start Geolocation Tracking
  const startTracking = () => {
    if (!navigator.geolocation) return;

    setIsTracking(true);

    // Use watchPosition to stream coordinates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const spd = Math.max(0, Math.round((pos.coords.speed || 0) * 3.6)); // m/s to km/h
        const hdg = pos.coords.heading || 0;
        const acc = Math.round(pos.coords.accuracy);

        setCoords({ lat, lng });
        setCurrentSpeed(spd);
        setHeading(hdg);
        setAccuracy(acc);

        // Location payload
        const payload = {
          vehicleId: vehicle?.id || user?.vehicleId || 'simulated-vehicle',
          tripId: activeTrip?.id,
          lat,
          lng,
          speed: spd,
          heading: hdg,
          accuracy: acc,
          battery: batteryLevel,
          timestamp: new Date().toISOString(),
        };

        // If online, stream over WebSocket; else queue in IndexedDB
        if (navigator.onLine && socketRef.current.connected) {
          socketRef.current.emit('driver:location', payload);
        } else {
          // Offline fallback
          queueLocationPoint(payload).then(async () => {
            const count = await getQueuedPointsCount();
            setQueuedPoints(count);
          });
        }
      },
      (err) => {
        console.error('Geolocation watch error:', err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setCurrentSpeed(0);
  };

  // SOS button handler
  const handleTriggerSos = async () => {
    const confirm = window.confirm('🚨 EMERGENCY: Send immediate SOS breakdown / accident alert to fleet dispatch?');
    if (!confirm) return;

    try {
      await api.post('/alerts/sos', {
        vehicleId: vehicle?.id || user?.vehicleId,
        lat: coords?.lat || 13.0600,
        lng: coords?.lng || 80.2200,
        speed: currentSpeed,
        note: 'Breakdown reported on road. Require mechanic or dispatch assistance.',
      });
      setSosStatus('🚨 SOS Alert Broadcasted to Dispatch!');
      setTimeout(() => setSosStatus(null), 6000);
    } catch (e) {
      alert('Failed to send SOS.');
    }
  };

  // Submit proof of delivery
  const handleCompleteTrip = async (data: { signatureData: string; proofPhotoUrl?: string; notes?: string }) => {
    if (!activeTrip) return;
    try {
      await api.post(`/trips/${activeTrip.id}/pod`, data);
      setShowPodModal(false);
      setActiveTrip(null);
      stopTracking();
      alert('Delivery completed successfully! Great job.');
      loadDriverData();
    } catch (e) {
      alert('Failed to complete delivery.');
    }
  };

  const speedLimit = vehicle?.speedLimit || 60;
  const isOverspeeding = currentSpeed > speedLimit;

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-20">
      {/* Top Mobile Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur">
        <div>
          <div className="text-xs font-semibold text-slate-400">Driver Shift View</div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>{vehicle?.plateNumber || 'TN-01-AB-1234'}</span>
            <span className="text-[10px] text-emerald-400 font-mono">({vehicle?.model || 'Truck'})</span>
          </div>
        </div>

        {/* Live / Offline connection badge */}
        <div className="flex items-center gap-2">
          {queuedPoints > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
              {queuedPoints} Queued
            </span>
          )}
          <div
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isOnline
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}
          >
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span className="text-[11px]">{isOnline ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* GPS Permission banner if not granted */}
        {gpsGranted !== true && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> GPS Access Required
            </h4>
            <p className="mt-1 text-xs text-slate-300">
              {t.driver.gpsPrompt}
            </p>
            <button
              onClick={requestGps}
              className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
            >
              {t.driver.enableGps}
            </button>
          </div>
        )}

        {/* SOS confirmation alert banner */}
        {sosStatus && (
          <div className="rounded-xl border border-red-500 bg-red-600/90 p-3 text-xs font-bold text-white text-center animate-bounce">
            {sosStatus}
          </div>
        )}

        {/* Large Digital Speedometer Gauge */}
        <div className="relative flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-800/80 p-8 shadow-2xl backdrop-blur">
          {/* Circular speed ring visual */}
          <div className="relative flex h-56 w-56 items-center justify-center rounded-full border-8 border-slate-700/60 shadow-inner">
            <div
              className={`absolute inset-0 rounded-full border-8 transition-colors duration-300 ${
                isOverspeeding
                  ? 'border-red-500 shadow-lg shadow-red-500/50 animate-pulse'
                  : currentSpeed > 0
                  ? 'border-emerald-500 shadow-lg shadow-emerald-500/30'
                  : 'border-transparent'
              }`}
            ></div>

            <div className="text-center z-10">
              <div
                className={`text-6xl font-black tracking-tight ${
                  isOverspeeding ? 'text-red-400' : 'text-white'
                }`}
              >
                {currentSpeed}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">
                KM / H
              </div>

              {isOverspeeding && (
                <div className="mt-2 rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white animate-bounce">
                  OVERSPEED LIMIT {speedLimit}
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar below speed */}
          <div className="mt-6 flex w-full items-center justify-around border-t border-slate-700/60 pt-4 text-center">
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Speed Limit</div>
              <div className="text-sm font-bold text-slate-200">{speedLimit} km/h</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Heading</div>
              <div className="text-sm font-bold text-slate-200">{Math.round(heading)}°</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Accuracy</div>
              <div className="text-sm font-bold text-slate-200">±{accuracy || 4}m</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Battery</div>
              <div className="text-sm font-bold text-slate-200">{batteryLevel}%</div>
            </div>
          </div>
        </div>

        {/* Big Tracking Action Button (One-hand friendly) */}
        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={`w-full rounded-2xl py-5 text-base font-black uppercase tracking-wider shadow-xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 ${
            isTracking
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-red-600/30 hover:from-red-500 hover:to-rose-500'
              : 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-400'
          }`}
        >
          {isTracking ? (
            <>
              <Square className="h-6 w-6 fill-current" /> {t.driver.stopTracking}
            </>
          ) : (
            <>
              <Play className="h-6 w-6 fill-current" /> {t.driver.startTracking}
            </>
          )}
        </button>

        {/* Assigned Trip Card */}
        {activeTrip ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-800/90 p-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="text-xs font-bold text-emerald-400">
                {activeTrip.trackingCode}
              </span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                {activeTrip.status}
              </span>
            </div>

            <h4 className="mt-2 text-sm font-bold text-white">{activeTrip.title}</h4>

            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 mt-1"></span>
                <div>
                  <span className="text-[10px] text-slate-400 block">Pickup:</span>
                  <span>{activeTrip.pickupAddress}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400 mt-1"></span>
                <div>
                  <span className="text-[10px] text-slate-400 block">Destination:</span>
                  <span>{activeTrip.dropAddress}</span>
                </div>
              </div>
            </div>

            {/* Trip Action Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeTrip.dropLat},${activeTrip.dropLng}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-500"
              >
                <Navigation className="h-4 w-4" /> Navigate
              </a>

              <button
                onClick={() => setShowChatModal(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
              >
                <MessageSquare className="h-4 w-4 text-emerald-400" /> Chat Dispatch
              </button>
            </div>

            <button
              onClick={() => setShowPodModal(true)}
              className="mt-2 w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-500 flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="h-4 w-4" /> {t.driver.completeTrip}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-6 text-center text-xs text-slate-400">
            {t.driver.noTrip}
          </div>
        )}

        {/* Emergency SOS Button */}
        <button
          onClick={handleTriggerSos}
          className="w-full rounded-2xl border-2 border-red-500/50 bg-red-950/40 py-3.5 text-xs font-bold text-red-400 hover:bg-red-900/50 flex items-center justify-center gap-2 transition"
        >
          <AlertOctagon className="h-4 w-4 text-red-500 animate-pulse" />
          <span>{t.driver.sosButton}</span>
        </button>
      </div>

      {/* Signature & POD Modal */}
      {activeTrip && (
        <SignatureModal
          isOpen={showPodModal}
          onClose={() => setShowPodModal(false)}
          onSubmit={handleCompleteTrip}
        />
      )}

      {/* Chat Modal */}
      {activeTrip && (
        <TripChatModal
          tripId={activeTrip.id}
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
        />
      )}
    </div>
  );
};
