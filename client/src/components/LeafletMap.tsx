'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LeafletMapProps {
  players: any[];
  center: [number, number]; // [lat, lng]
  onSelectPlayer: (player: any) => void;
  onSendRequest: (player: any) => void;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  players,
  center,
  onSelectPlayer,
  onSendRequest,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Map instance if not initialized
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // User location marker
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div style="background-color: #10b981; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(16, 185, 129, 0.7); position: relative;">
            <div style="position: absolute; inset: -4px; border-radius: 50%; border: 2px solid #10b981; opacity: 0.5; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      L.marker(center, { icon: userIcon })
        .addTo(map)
        .bindPopup('<strong style="font-size: 13px;">Your Location</strong>');

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView(center, mapInstanceRef.current.getZoom());
    }

    return () => {
      // Map instance preserved across re-renders
    };
  }, [center]);

  // Update markers when players array changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    players.forEach((player) => {
      const lat = player.fuzzedLocation?.lat || player.location?.coordinates?.[1];
      const lng = player.fuzzedLocation?.lng || player.location?.coordinates?.[0];

      if (!lat || !lng) return;

      const playerIcon = L.divIcon({
        className: 'custom-player-marker',
        html: `
          <div style="
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
            border: 2px solid white;
          ">
            <span>🏸</span>
            <span>${player.name.split(' ')[0]}</span>
            <span style="background: rgba(255,255,255,0.25); padding: 1px 4px; border-radius: 6px; font-size: 9px;">${player.matchingScore || 85}%</span>
          </div>
        `,
        iconSize: [80, 28],
        iconAnchor: [40, 14],
      });

      const marker = L.marker([lat, lng], { icon: playerIcon }).addTo(markersLayerRef.current!);

      const popupContent = document.createElement('div');
      popupContent.style.minWidth = '180px';
      popupContent.innerHTML = `
        <div style="padding: 4px;">
          <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">${player.name}</h4>
          <p style="margin: 2px 0 6px; font-size: 11px; color: #64748b;">${player.locality} • ${player.approximateDistance || '~2 km'}</p>
          <div style="margin-bottom: 8px;">
            <span style="background: #ecfdf5; color: #065f46; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px;">
              ${player.matchingScore || 85}% Match
            </span>
          </div>
          <button id="view-profile-${player.id}" style="
            width: 100%;
            background: #10b981;
            color: white;
            border: none;
            padding: 6px 10px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
          ">
            View Profile & Invite
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`view-profile-${player.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectPlayer(player);
          };
        }
      });
    });
  }, [players, onSelectPlayer, onSendRequest]);

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full min-h-[450px]" />
    </div>
  );
};
