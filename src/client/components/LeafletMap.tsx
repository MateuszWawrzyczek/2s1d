import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';

interface LeafletMapProps {
  mapX?: number | null;
  mapY?: number | null;
  previewX?: number | null;
  previewY?: number | null;
  onLocationSelect?: (x: number, y: number) => void;
}

const redMarkerHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 41" width="25" height="41"><path d="M12 0C5.373 0 0 5.373 0 12c0 7.633 10.63 27.618 11.26 28.718.344.59.85.59 1.196 0C13.085 39.618 24 19.633 24 12 24 5.373 18.627 0 12 0zm0 18c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z" fill="#ef4444"/></svg>`;
const redIcon = L.divIcon({
  className: 'custom-red-icon',
  html: redMarkerHtml,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function MapEvents({
  onLocationSelect,
}: {
  onLocationSelect?: (x: number, y: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lng, e.latlng.lat);
      }
    },
  });
  return null;
}

export default function LeafletMap({
  mapX,
  mapY,
  previewX,
  previewY,
  onLocationSelect,
}: LeafletMapProps) {
  const defaultLat = 50.0646;
  const defaultLng = 19.9236;

  // Używamy podglądu lub oryginalnych współrzędnych do wycentrowania mapy
  const centerLat =
    typeof previewY === 'number'
      ? previewY
      : typeof mapY === 'number'
        ? mapY
        : defaultLat;
  const centerLng =
    typeof previewX === 'number'
      ? previewX
      : typeof mapX === 'number'
        ? mapX
        : defaultLng;

  const hasOriginalCoordinates =
    typeof mapX === 'number' && typeof mapY === 'number';
  const hasPreviewCoordinates =
    typeof previewX === 'number' && typeof previewY === 'number';

  return (
    <div
      style={{
        height: '300px',
        width: '100%',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
      }}
    >
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hasOriginalCoordinates && (
          <Marker
            position={[mapY, mapX]}
            opacity={hasPreviewCoordinates ? 0.5 : 1}
          />
        )}
        {hasPreviewCoordinates && (
          <Marker position={[previewY, previewX]} icon={redIcon} />
        )}
        <MapEvents onLocationSelect={onLocationSelect} />
      </MapContainer>
    </div>
  );
}
