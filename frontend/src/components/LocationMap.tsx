import { useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';

interface Props {
  lat: number;
  lon: number;
  onSelect: (lat: number, lon: number) => void;
}

function MapInteraction({ lat, lon, onSelect }: Props) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lon], map.getZoom(), { animate: true }); }, [lat, lon, map]);
  useMapEvents({ click: (event) => onSelect(event.latlng.lat, event.latlng.lng) });
  return <CircleMarker center={[lat, lon]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#6366f1', fillOpacity: 1 }}><Tooltip permanent direction="top">Lieu choisi</Tooltip></CircleMarker>;
}

export function LocationMap({ lat, lon, onSelect }: Props) {
  const center: LatLngExpression = [lat, lon];
  return <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900" aria-labelledby="map-title">
    <div className="p-5 md:p-6"><p className="text-sm font-bold uppercase tracking-wider text-emerald-300">Choix précis</p><h2 id="map-title" className="text-2xl font-black">Carte interactive</h2><p className="mt-2 text-sm text-slate-400">Cliquez sur la carte pour choisir les coordonnées. Le fuseau horaire sera détecté automatiquement.</p></div>
    <MapContainer center={center} zoom={7} scrollWheelZoom className="h-80 w-full" aria-label="Carte de sélection du lieu">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapInteraction lat={lat} lon={lon} onSelect={onSelect} />
    </MapContainer>
  </section>;
}
