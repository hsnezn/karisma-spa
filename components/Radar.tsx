'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const StaffIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const SpaIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const BookingIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface User {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'booking' | 'waiting' | 'active';
  locationName: string;
  nearbySpaId?: string;
}

interface SpaLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface RadarProps {
  onUserClick: (user: any) => void;
}

// Component to handle map centering
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Component to handle marker dragging
function DraggableStaffMarker({ position, onDragEnd }: { position: [number, number], onDragEnd: (lat: number, lng: number) => void }) {
  const markerRef = React.useRef<L.Marker>(null);
  const eventHandlers = React.useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          onDragEnd(lat, lng);
        }
      },
    }),
    [onDragEnd],
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      icon={StaffIcon}
      ref={markerRef}
    >
      <Popup>
        <div className="font-bold">You are here</div>
        <div className="text-xs text-slate-500">Drag to fix location</div>
      </Popup>
    </Marker>
  );
}

const Radar: React.FC<RadarProps> = ({ onUserClick }) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([14.5995, 120.9842]);
  const [staffLocation, setStaffLocation] = useState<[number, number] | null>(null);
  const [spaLocations, setSpaLocations] = useState<SpaLocation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [gpsDebug, setGpsDebug] = useState<string>("Locating...");

  const updateNearbyUsers = (lat: number, lng: number, spaId?: string) => {
    const nearbyUsers: User[] = [
      { id: `u-${Date.now()}-1`, name: 'John Doe', lat: lat + 0.001, lng: lng + 0.0005, status: 'booking', locationName: 'Nearby St.', nearbySpaId: spaId },
      { id: `u-${Date.now()}-2`, name: 'Jane Smith', lat: lat - 0.0005, lng: lng - 0.0015, status: 'waiting', locationName: 'Local Ave.', nearbySpaId: spaId },
      { id: `u-${Date.now()}-3`, name: 'Mike Ross', lat: lat + 0.0015, lng: lng - 0.001, status: 'active', locationName: 'Corner Rd.', nearbySpaId: spaId },
      { id: `u-${Date.now()}-4`, name: 'Rachel Zane', lat: lat - 0.001, lng: lng + 0.002, status: 'booking', locationName: 'Village Blvd.', nearbySpaId: spaId },
    ];
    setUsers(prev => [...prev, ...nearbyUsers]);
  };

  useEffect(() => {
    if (navigator.geolocation) {
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          // Only update if we get a significantly better or first reading
          setMapCenter([latitude, longitude]);
          setStaffLocation([latitude, longitude]);
          
          if (users.length === 0) {
            updateNearbyUsers(latitude, longitude);
          }
          
          setGpsDebug(`Accuracy: ${Math.round(accuracy)}m`);
        },
        () => {
          setGpsDebug("GPS unavailable - using default location");
          if (users.length === 0) updateNearbyUsers(14.5995, 120.9842);
        },
        options
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [users.length]);

  const handleAddSpaLocation = () => {
    if (!staffLocation) return;
    const newSpa: SpaLocation = {
      id: `spa-${Date.now()}`,
      name: `Karisma Branch ${spaLocations.length + 1}`,
      lat: staffLocation[0],
      lng: staffLocation[1]
    };
    setSpaLocations(prev => [...prev, newSpa]);
    updateNearbyUsers(newSpa.lat, newSpa.lng, newSpa.id);
    setGpsDebug(`Added ${newSpa.name}!`);
  };

  const handleDragEnd = (lat: number, lng: number) => {
    setStaffLocation([lat, lng]);
    updateNearbyUsers(lat, lng);
    setGpsDebug("Location updated via drag");
  };

  const requestLocation = () => {
    setGpsDebug("Requesting GPS...");
    if (navigator.geolocation) {
      // Check if we are in a secure context
      if (window.isSecureContext === false) {
        setGpsDebug("Error: Map requires a Secure Connection (HTTPS)");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setMapCenter([latitude, longitude]);
          setStaffLocation([latitude, longitude]);
          updateNearbyUsers(latitude, longitude);
          setGpsDebug(`Accuracy: ${Math.round(accuracy)}m`);
        },
        (error) => {
          let msg = "GPS Error";
          if (error.code === 1) msg = "Permission Denied. Please use HTTPS and check browser settings.";
          if (error.code === 2) msg = "Position Unavailable (Check your signal)";
          if (error.code === 3) msg = "Request Timed Out";
          setGpsDebug(msg);
          alert("Location Error: Please ensure you are using a secure (https) connection and have allowed location access in your browser settings.");
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    } else {
      setGpsDebug("Browser doesn't support GPS");
    }
  };

  return (
    <div className="relative w-full h-[450px] md:h-[600px] rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-200">
      {/* Controls Overlay */}
      <div className="absolute top-2 md:top-4 left-0 right-0 z-[1000] px-2 md:px-4 flex flex-row md:flex-col gap-2 justify-center">
        <button 
          onClick={handleAddSpaLocation}
          className="flex-1 md:flex-none bg-emerald-600 text-white px-2 py-2 md:px-6 md:py-3 rounded-xl font-bold shadow-2xl hover:bg-emerald-700 transition-all transform active:scale-95 flex items-center justify-center gap-1 md:gap-2 text-[10px] md:text-base"
        >
          <span>📍</span> <span className="hidden xs:inline">Register Branch</span><span className="xs:hidden">Branch</span>
        </button>
        
        <button 
          onClick={requestLocation}
          className="flex-1 md:flex-none bg-blue-600 text-white px-2 py-2 md:px-6 md:py-3 rounded-xl font-bold shadow-2xl hover:bg-blue-700 transition-all transform active:scale-95 flex items-center justify-center gap-1 md:gap-2 text-[10px] md:text-base"
        >
          <span>🛰️</span> <span className="hidden xs:inline">Update Location</span><span className="xs:hidden">GPS</span>
        </button>
      </div>

      <MapContainer 
        center={mapCenter} 
        zoom={17} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={mapCenter} />

        {staffLocation && (
          <DraggableStaffMarker 
            position={staffLocation} 
            onDragEnd={handleDragEnd} 
          />
        )}

        {spaLocations.map((spa) => (
          <Marker 
            key={spa.id} 
            position={[spa.lat, spa.lng]} 
            icon={SpaIcon}
          >
            <Popup>
              <div className="font-bold text-emerald-800">✨ {spa.name}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Active Branch</div>
            </Popup>
          </Marker>
        ))}

        {users.map((user) => (
          <Marker 
            key={user.id} 
            position={[user.lat, user.lng]}
            icon={user.status === 'booking' ? BookingIcon : user.status === 'active' ? SpaIcon : DefaultIcon}
          >
            <Popup>
              <div className="p-2 min-w-[150px]">
                <h3 className="font-bold text-slate-800">{user.name}</h3>
                <p className="text-xs text-slate-500 mb-2">{user.locationName}</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase ${
                    user.status === 'booking' ? 'bg-amber-500' :
                    user.status === 'active' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}>
                    {user.status}
                  </span>
                </div>
                <button
                  onClick={() => onUserClick(user)}
                  className="w-full bg-emerald-600 text-white py-1.5 rounded text-xs font-bold hover:bg-emerald-700 transition-colors"
                >
                  Open Chat
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend Overlay */}
      <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 right-2 md:right-auto bg-white/95 p-2 md:p-3 rounded-xl border border-slate-200 shadow-lg z-[1000] flex md:flex-col items-center md:items-start justify-between md:justify-start gap-2">
        <div className="md:mb-2 md:pb-2 md:border-b border-slate-100 flex flex-col gap-0.5 md:gap-1">
          <div className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-tighter">GPS Status</div>
          <div className="text-[9px] md:text-[11px] font-mono font-bold text-emerald-600 truncate max-w-[100px] md:max-w-none">
            {gpsDebug}
          </div>
        </div>
        <div className="flex md:flex-col gap-2 md:space-y-2 text-[8px] md:text-[10px] font-bold text-slate-600">
          <div className="flex items-center gap-1 md:gap-2">
            <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-amber-500" /> <span className="hidden xs:inline">NEW BOOKING</span><span className="xs:hidden">NEW</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-emerald-500" /> <span className="hidden xs:inline">ACTIVE SESSION</span><span className="xs:hidden">ACTIVE</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-blue-500" /> <span className="hidden xs:inline">WAITING</span><span className="xs:hidden">WAIT</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Radar;
