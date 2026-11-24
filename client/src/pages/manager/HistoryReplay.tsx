import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Vehicle } from '../../types';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Navigation,
  Gauge,
  Calendar,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const HistoryReplay: React.FC = () => {
  const [searchParams] = useSearchParams();
  const vehicleIdFromQuery = searchParams.get('vehicleId');

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicleIdFromQuery || '');
  const [points, setPoints] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loading, setLoading] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    api.get('/vehicles').then((res) => {
      const vList = res.data.vehicles || [];
      setVehicles(vList);
      if (!selectedVehicleId && vList.length > 0) {
        setSelectedVehicleId(vList[1]?.id || vList[0]?.id); // Pick vehicle 1 (has completed trip in seed)
      }
    });
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      loadHistoryPoints(selectedVehicleId);
    }
  }, [selectedVehicleId]);

  const loadHistoryPoints = async (vId: string) => {
    setLoading(true);
    setIsPlaying(false);
    setCurrentIndex(0);
    try {
      const res = await api.get(`/tracking/history/${vId}`);
      const history = res.data.points || [];
      setPoints(history);
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setLoading(false);
    }
  };

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= points.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, points.length]);

  const currentPoint = points[currentIndex];
  const polylineCoords: [number, number][] = points.map((p) => [p.lat, p.lng]);

  const mapCenter: [number, number] =
    currentPoint ? [currentPoint.lat, currentPoint.lng] : [13.0067, 80.2025];

  // Animated vehicle icon
  const movingIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 shadow-xl border-2 border-white ring-4 ring-emerald-500/30">
        <div style="transform: rotate(${currentPoint?.heading || 0}deg);" class="absolute inset-0 flex items-start justify-center">
          <div class="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-white -mt-0.5"></div>
        </div>
        <span class="text-[10px] font-black text-white">FS</span>
      </div>
    `,
    className: 'replay-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Header & Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-500" />
            Route History & Incident Replay
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Interactive timeline scrub, path reconstruction, and speed telemetry analysis
          </p>
        </div>

        {/* Vehicle Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Select Vehicle:
          </label>
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plateNumber} ({v.model})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Map Replay + Speed Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Map View */}
        <div className="lg:col-span-2 h-[460px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative dark:border-slate-800">
          {points.length > 0 ? (
            <MapContainer
              center={mapCenter}
              zoom={13}
              className="h-full w-full z-0"
              scrollWheelZoom={true}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution="&copy; CartoDB &copy; OpenStreetMap"
              />

              {/* Full route trajectory */}
              <Polyline
                positions={polylineCoords}
                pathOptions={{
                  color: '#10b981',
                  weight: 4,
                  opacity: 0.8,
                  lineCap: 'round',
                }}
              />

              {/* Start & End Point Markers */}
              {points.length > 0 && (
                <Marker position={[points[0].lat, points[0].lng]}>
                  <Popup>Start Point</Popup>
                </Marker>
              )}
              {points.length > 1 && (
                <Marker position={[points[points.length - 1].lat, points[points.length - 1].lng]}>
                  <Popup>Destination Point</Popup>
                </Marker>
              )}

              {/* Current Playback Marker */}
              {currentPoint && (
                <Marker
                  position={[currentPoint.lat, currentPoint.lng]}
                  icon={movingIcon}
                >
                  <Popup>
                    <div className="text-xs p-1">
                      <p className="font-bold">Recorded Point #{currentIndex + 1}</p>
                      <p>Speed: {Math.round(currentPoint.speed)} km/h</p>
                      <p>Time: {new Date(currentPoint.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-100 text-xs text-slate-500 dark:bg-slate-900">
              {loading ? 'Loading route history points...' : 'No historical points found for this vehicle.'}
            </div>
          )}
        </div>

        {/* Right Telemetry & Speed Profile */}
        <div className="flex flex-col gap-4">
          {/* Current scrubber telemetry card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Playback Telemetry
            </h4>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                <span className="text-[10px] text-slate-400 block">Current Speed</span>
                <span className="text-lg font-black text-emerald-600">
                  {currentPoint ? Math.round(currentPoint.speed) : 0} <span className="text-xs font-normal">km/h</span>
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                <span className="text-[10px] text-slate-400 block">Heading</span>
                <span className="text-lg font-black text-slate-800 dark:text-white">
                  {currentPoint ? Math.round(currentPoint.heading) : 0}°
                </span>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500 space-y-1">
              <div>
                <span className="font-medium text-slate-400">Timestamp: </span>
                {currentPoint ? new Date(currentPoint.timestamp).toLocaleString() : 'N/A'}
              </div>
              <div>
                <span className="font-medium text-slate-400">Coordinates: </span>
                {currentPoint ? `${currentPoint.lat.toFixed(4)}, ${currentPoint.lng.toFixed(4)}` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Speed profile graph */}
          <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              Speed Profile (km/h)
            </h4>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points}>
                  <XAxis dataKey="timestamp" hide />
                  <YAxis width={28} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="speed"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Playback Scrubber Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
        {/* Timeline Slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-slate-500">
            {currentIndex + 1} / {Math.max(1, points.length)}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, points.length - 1)}
            value={currentIndex}
            onChange={(e) => setCurrentIndex(Number(e.target.value))}
            className="flex-1 accent-emerald-500 cursor-pointer"
          />
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={points.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play Replay'}</span>
            </button>

            <button
              onClick={() => setCurrentIndex(0)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              title="Rewind to start"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Speed multiplier selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-medium mr-1">Speed:</span>
            {[1, 2, 4, 8].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                  playbackSpeed === spd
                    ? 'bg-slate-900 text-white dark:bg-emerald-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
