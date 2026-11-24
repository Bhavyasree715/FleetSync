import React, { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polygon,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { Vehicle, Geofence } from '../../types';

interface FleetMapProps {
  vehicles: Vehicle[];
  geofences?: Geofence[];
  selectedVehicleId?: string | null;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  center?: [number, number];
  zoom?: number;
  tileProvider?: 'osm' | 'carto_dark' | 'carto_light' | 'satellite';
}

// Map center controller helper
const ChangeMapView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
};

export const FleetMap: React.FC<FleetMapProps> = ({
  vehicles,
  geofences = [],
  selectedVehicleId,
  onSelectVehicle,
  center = [13.0400, 80.2200], // Default Chennai Metro
  zoom = 12,
  tileProvider = 'carto_light',
}) => {
  // Swappable Map Tile Layers
  const tileUrls = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
    },
    carto_light: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '&copy; CartoDB &copy; OpenStreetMap',
    },
    carto_dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; CartoDB &copy; OpenStreetMap',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri &copy; ArcGIS',
    },
  };

  const currentTile = tileUrls[tileProvider] || tileUrls.carto_light;

  // Custom vehicle marker generator with status colors and heading arrow
  const getVehicleMarkerIcon = (v: Vehicle, isSelected: boolean) => {
    const statusColors = {
      moving: '#10b981', // green
      arrived: '#3b82f6', // blue
      idle: '#f59e0b', // amber
      offline: '#6b7280', // grey
      alert: '#ef4444', // red
    };

    const color = statusColors[v.status] || '#6b7280';
    const isMoving = v.status === 'moving' && (v.currentSpeed || 0) > 3;
    const rotation = v.currentHeading || 0;

    const html = `
      <div class="relative flex flex-col items-center group cursor-pointer">
        <!-- Floating plate tag -->
        <div class="mb-1 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-tight shadow-md whitespace-nowrap ${
          isSelected
            ? 'bg-slate-900 text-white ring-2 ring-emerald-400'
            : 'bg-white text-slate-800 border border-slate-200'
        }">
          ${v.plateNumber}
        </div>

        <!-- Vehicle marker circle -->
        <div class="relative flex items-center justify-center w-8 h-8 rounded-full shadow-lg transition-transform duration-300 ${
          isSelected ? 'scale-125 ring-4 ring-emerald-500/50' : 'hover:scale-110'
        }" style="background-color: ${color};">
          
          <!-- Direction indicator pointer -->
          <div style="transform: rotate(${rotation}deg);" class="absolute inset-0 flex items-start justify-center">
            <div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-white -mt-1"></div>
          </div>

          <!-- Vehicle icon symbol inside -->
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
            <path d="M15 18H9"/>
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
            <circle cx="17" cy="18" r="2"/>
            <circle cx="7" cy="18" r="2"/>
          </svg>

          <!-- Ping pulse for active moving vehicles -->
          ${
            isMoving
              ? `<span class="absolute -inset-1 rounded-full animate-ping opacity-30" style="background-color: ${color};"></span>`
              : ''
          }
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-fleet-marker',
      iconSize: [60, 60],
      iconAnchor: [30, 45],
      popupAnchor: [0, -45],
    });
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner dark:border-slate-800 dark:bg-slate-950">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full z-0"
        scrollWheelZoom={true}
      >
        <ChangeMapView center={center} zoom={zoom} />

        <TileLayer
          url={currentTile.url}
          attribution={currentTile.attribution}
          maxZoom={19}
        />

        {/* Geofences rendering */}
        {geofences.map((fence) => {
          if (!fence.isActive) return null;

          if (fence.type === 'circle') {
            return (
              <Circle
                key={fence.id}
                center={[fence.centerLat, fence.centerLng]}
                radius={fence.radiusMeters}
                pathOptions={{
                  color: fence.color || '#3b82f6',
                  fillColor: fence.color || '#3b82f6',
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: '4 4',
                }}
              >
                <Popup>
                  <div className="p-1 text-xs">
                    <p className="font-bold text-slate-900">{fence.name}</p>
                    <p className="text-slate-500">Radius: {fence.radiusMeters}m</p>
                    <p className="text-emerald-600 font-medium">Alerts: Entry & Exit Active</p>
                  </div>
                </Popup>
              </Circle>
            );
          }

          if (fence.type === 'polygon' && fence.polygonGeoJson) {
            try {
              const positions = JSON.parse(fence.polygonGeoJson);
              return (
                <Polygon
                  key={fence.id}
                  positions={positions}
                  pathOptions={{
                    color: fence.color || '#8b5cf6',
                    fillColor: fence.color || '#8b5cf6',
                    fillOpacity: 0.15,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="p-1 text-xs">
                      <p className="font-bold text-slate-900">{fence.name}</p>
                      <p className="text-slate-500">Polygon Zone Boundary</p>
                    </div>
                  </Popup>
                </Polygon>
              );
            } catch {
              return null;
            }
          }

          return null;
        })}

        {/* Fleet Vehicles Markers */}
        {vehicles.map((v) => {
          if (!v.currentLat || !v.currentLng) return null;

          const isSelected = selectedVehicleId === v.id;

          return (
            <Marker
              key={v.id}
              position={[v.currentLat, v.currentLng]}
              icon={getVehicleMarkerIcon(v, isSelected)}
              eventHandlers={{
                click: () => onSelectVehicle && onSelectVehicle(v),
              }}
            >
              <Popup>
                <div className="p-1 min-w-[180px]">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="font-bold text-slate-900 text-sm">{v.plateNumber}</span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
                      style={{
                        backgroundColor:
                          v.status === 'moving'
                            ? '#10b981'
                            : v.status === 'arrived'
                            ? '#3b82f6'
                            : v.status === 'idle'
                            ? '#f59e0b'
                            : '#6b7280',
                      }}
                    >
                      {v.status}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <p>
                      <span className="font-medium text-slate-500">Model:</span> {v.model} ({v.type})
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">Speed:</span>{' '}
                      <span className="font-bold text-slate-800">{Math.round(v.currentSpeed)} km/h</span> /{' '}
                      {v.speedLimit} max
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">Battery:</span> {v.batteryLevel || 85}%
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">Driver:</span>{' '}
                      {v.driver?.user?.name || 'Unassigned'}
                    </p>
                  </div>

                  {onSelectVehicle && (
                    <button
                      onClick={() => onSelectVehicle(v)}
                      className="mt-2.5 w-full rounded-lg bg-emerald-600 py-1 text-center text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      View Vehicle Card
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
