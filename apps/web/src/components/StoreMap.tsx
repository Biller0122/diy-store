'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  district: string;
  phone: string;
  lat: number;
  lng: number;
  hours: { weekday: string; weekend: string };
}

interface StoreMapProps {
  stores: StoreLocation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const ORANGE_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" fill="none">
  <ellipse cx="16" cy="40" rx="6" ry="2" fill="rgba(0,0,0,0.3)"/>
  <path d="M16 2C9.37 2 4 7.37 4 14c0 9 12 26 12 26s12-17 12-26C28 7.37 22.63 2 16 2z" fill="#FF4500" stroke="#E03D00" stroke-width="1.5"/>
  <circle cx="16" cy="14" r="5" fill="white" fill-opacity="0.9"/>
  <text x="16" y="18" text-anchor="middle" font-size="7" font-weight="bold" fill="#FF4500">🔨</text>
</svg>
`;

const ORANGE_ACTIVE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" fill="none">
  <ellipse cx="18" cy="46" rx="7" ry="2.5" fill="rgba(0,0,0,0.4)"/>
  <path d="M18 2C10.27 2 4 8.27 4 16c0 10.5 14 30 14 30s14-19.5 14-30C32 8.27 25.73 2 18 2z" fill="#FF4500" stroke="#F59E0B" stroke-width="2"/>
  <circle cx="18" cy="16" r="7" fill="white" fill-opacity="0.95"/>
  <text x="18" y="21" text-anchor="middle" font-size="9" font-weight="bold" fill="#FF4500">🔨</text>
</svg>
`;

function makeIcon(active = false) {
  const svg = active ? ORANGE_ACTIVE : ORANGE_ICON;
  const size: [number, number] = active ? [36, 48] : [32, 42];
  const anchor: [number, number] = active ? [18, 46] : [16, 40];
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: [0, -anchor[1] + 10],
  });
}

export default function StoreMap({ stores, selectedId, onSelect }: StoreMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [47.8864, 106.9057],
      zoom: 12,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CartoDB',
      maxZoom: 19,
    }).addTo(map);

    stores.forEach((store) => {
      const marker = L.marker([store.lat, store.lng], { icon: makeIcon(false) })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:sans-serif;min-width:180px">
            <p style="font-weight:700;margin:0 0 4px;color:#FF4500">${store.name}</p>
            <p style="font-size:12px;margin:0 0 2px;color:#888">${store.address}</p>
            <p style="font-size:12px;margin:0;color:#888">📞 ${store.phone}</p>
          </div>`,
          { className: 'dark-popup' }
        )
        .on('click', () => onSelect(store.id));

      markersRef.current[store.id] = marker;
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update marker icons and fly when selectedId changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    stores.forEach((store) => {
      const m = markersRef.current[store.id];
      if (!m) return;
      const active = store.id === selectedId;
      m.setIcon(makeIcon(active));
      if (active) m.setZIndexOffset(1000);
      else m.setZIndexOffset(0);
    });

    if (selectedId) {
      const store = stores.find((s) => s.id === selectedId);
      if (store) {
        map.flyTo([store.lat, store.lng], 15, { animate: true, duration: 0.8 });
        markersRef.current[selectedId]?.openPopup();
      }
    }
  }, [selectedId, stores]);

  return (
    <>
      <style>{`
        .dark-popup .leaflet-popup-content-wrapper {
          background: #16161F;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          color: #FAFAFA;
        }
        .dark-popup .leaflet-popup-tip {
          background: #16161F;
        }
        .dark-popup .leaflet-popup-close-button {
          color: #A1A1AA !important;
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />
    </>
  );
}
