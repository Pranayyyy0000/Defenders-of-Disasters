import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MonitoredZone, ReliefCamp, EvacuationRoute, SupportedLanguage } from '../types/disaster';
import { TRANSLATIONS } from '../services/translationService';
import { Layers, Maximize2, Shield, Eye, Compass, Route as RouteIcon } from 'lucide-react';

interface DisasterMapProps {
  zones: MonitoredZone[];
  camps: ReliefCamp[];
  routes: EvacuationRoute[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  language: SupportedLanguage;
  centerCoords: [number, number];
  zoomLevel: number;
  isDark?: boolean;
}

type TileProvider = 'dark' | 'carto-light' | 'osm' | 'satellite';

export const DisasterMap: React.FC<DisasterMapProps> = ({
  zones,
  camps,
  routes,
  selectedZoneId,
  onSelectZone,
  language,
  centerCoords,
  zoomLevel,
  isDark = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const [activeTile, setActiveTile] = useState<TileProvider>(isDark ? 'dark' : 'carto-light');
  const [showSafeZones, setShowSafeZones] = useState(true);
  const [showDangerZones, setShowDangerZones] = useState(true);
  const [showCamps, setShowCamps] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);

  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const trans = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: centerCoords,
        zoom: zoomLevel,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

      layersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }
  }, []);

  // Sync default basemap with theme
  useEffect(() => {
    setActiveTile(isDark ? 'dark' : 'carto-light');
  }, [isDark]);

  // Update Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    let attribution = '&copy; <a href="https://carto.com/">CARTO</a>';

    if (activeTile === 'carto-light') {
      url = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      attribution = '&copy; <a href="https://carto.com/">CARTO</a>';
    } else if (activeTile === 'osm') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    } else if (activeTile === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri &mdash; Maxar';
    }

    const tile = L.tileLayer(url, { attribution, maxZoom: 19 });
    tile.addTo(map);
    tileLayerRef.current = tile;
  }, [activeTile]);

  // Update view when center changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(centerCoords, zoomLevel, { animate: true });
    }
  }, [centerCoords, zoomLevel]);

  // Render Markers and Routes
  useEffect(() => {
    if (!mapInstanceRef.current || !layersGroupRef.current) return;
    const layerGroup = layersGroupRef.current;
    layerGroup.clearLayers();

    // 1. Evacuation & Risk Polylines
    if (showRoutes) {
      routes.forEach((route) => {
        const isCampRoute = route.type === 'danger-to-camp';
        const polyline = L.polyline([route.fromCoords, route.toCoords], {
          color: isCampRoute ? '#FF5A36' : '#94A3B8',
          weight: isCampRoute ? 3.5 : 1.5,
          opacity: isCampRoute ? 0.9 : 0.4,
          dashArray: isCampRoute ? undefined : '4, 8',
        });

        const popupContent = `
          <div style="font-family: 'DM Sans', sans-serif; font-size: 12px; line-height: 1.4; min-width: 190px;">
            <div style="font-family: 'Space Grotesk', sans-serif; font-weight: 700; color: ${
              isCampRoute ? '#FF5A36' : '#64748B'
            }; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; font-size: 11px;">
              ${isCampRoute ? 'Evacuation Corridor' : 'Risk Proximity'}
            </div>
            <div><strong>${trans.from}:</strong> ${route.fromLocation}</div>
            <div><strong>${trans.to}:</strong> ${route.toLocation}</div>
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(120,120,120,0.2); display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 11px;">
              <span>${route.distanceKm} km</span>
              <span>~${route.durationMin} mins</span>
            </div>
          </div>
        `;
        polyline.bindPopup(popupContent);
        layerGroup.addLayer(polyline);
      });
    }

    // 2. Relief Camps (Minimalist Blue/White Pins)
    if (showCamps) {
      camps.forEach((camp) => {
        const campIcon = L.divIcon({
          className: 'custom-camp-pin',
          html: `
            <div style="
              background: #0A0A0B;
              color: #F6F5F2;
              width: 28px;
              height: 28px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px rgba(0,0,0,0.4);
              border: 1px solid rgba(255,255,255,0.3);
              font-family: 'Space Grotesk', sans-serif;
              font-size: 11px;
              font-weight: 700;
            ">
              H
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -16],
        });

        const marker = L.marker([camp.lat, camp.lon], { icon: campIcon });

        const campPopup = `
          <div style="font-family: 'DM Sans', sans-serif; min-width: 210px;">
            <div style="font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 700; color: #10B981; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
              ${trans.reliefCamp}
            </div>
            <div style="font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 14px; margin-bottom: 4px;">
              ${camp.name}
            </div>
            <div style="font-size: 12px; color: #64748B; margin-bottom: 6px;">
              ${camp.type}
            </div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 6px 8px; background: rgba(120,120,120,0.1); border-radius: 6px;">
              Capacity: ${camp.capacity} evacuees
            </div>
          </div>
        `;

        marker.bindPopup(campPopup);
        layerGroup.addLayer(marker);
      });
    }

    // 3. Monitored Zones
    zones.forEach((zone) => {
      const isDanger = zone.mlPrediction === 'Danger' || zone.mlPrediction === 'Heatwave';

      if (isDanger && !showDangerZones) return;
      if (!isDanger && !showSafeZones) return;

      let strokeColor = '#10B981';
      let fillColor = '#10B981';
      let radius = 28;

      if (isDanger) {
        if (zone.severityLevel === 'High') {
          strokeColor = '#FF5A36';
          fillColor = '#FF5A36';
          radius = 42;
        } else if (zone.severityLevel === 'Medium') {
          strokeColor = '#F59E0B';
          fillColor = '#F59E0B';
          radius = 34;
        } else {
          strokeColor = '#EAB308';
          fillColor = '#EAB308';
          radius = 28;
        }
      }

      const isSelected = selectedZoneId === zone.id;

      const circle = L.circleMarker([zone.lat, zone.lon], {
        radius: isSelected ? radius + 6 : radius,
        color: isSelected ? '#FFFFFF' : strokeColor,
        weight: isSelected ? 3 : 1.5,
        fillColor,
        fillOpacity: isDanger ? 0.35 : 0.15,
      });

      const weather = zone.weather;
      const isFlood = zone.disasterType === 'flood';

      const popupHtml = `
        <div style="font-family: 'DM Sans', sans-serif; min-width: 220px; font-size: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: ${strokeColor};">
              ${isDanger ? (isFlood ? trans.dangerZone : trans.heatwaveZone) : trans.safeZone}
            </span>
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: rgba(120,120,120,0.15);">
              ${isDanger ? `${zone.severityLevel} Level` : 'Nominal'}
            </span>
          </div>

          <div style="font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 15px; margin-bottom: 2px;">
            ${zone.name}
          </div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 8px;">
            ${zone.district}, ${zone.state}
          </div>

          ${
            zone.riskAssessment
              ? `
            <div style="margin-bottom: 8px; padding: 6px 8px; border-radius: 8px; background: ${
              zone.riskAssessment.riskLevel === 'CRITICAL'
                ? 'rgba(255,90,54,0.18)'
                : zone.riskAssessment.riskLevel === 'HIGH'
                ? 'rgba(255,90,54,0.12)'
                : zone.riskAssessment.riskLevel === 'MODERATE'
                ? 'rgba(245,158,11,0.12)'
                : 'rgba(16,185,129,0.12)'
            }; border: 1px solid ${
              zone.riskAssessment.riskLevel === 'CRITICAL' || zone.riskAssessment.riskLevel === 'HIGH'
                ? 'rgba(255,90,54,0.3)'
                : zone.riskAssessment.riskLevel === 'MODERATE'
                ? 'rgba(245,158,11,0.3)'
                : 'rgba(16,185,129,0.3)'
            };">
              <div style="display: flex; justify-content: space-between; align-items: center; font-family: 'Space Grotesk', sans-serif;">
                <span style="font-weight: 700; font-size: 12px; color: ${
                  zone.riskAssessment.riskLevel === 'CRITICAL' || zone.riskAssessment.riskLevel === 'HIGH'
                    ? '#FF5A36'
                    : zone.riskAssessment.riskLevel === 'MODERATE'
                    ? '#F59E0B'
                    : '#10B981'
                };">
                  Risk Score: ${zone.riskAssessment.riskScore} / 100
                </span>
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: ${
                  zone.riskAssessment.riskLevel === 'CRITICAL' || zone.riskAssessment.riskLevel === 'HIGH'
                    ? '#FF5A36'
                    : zone.riskAssessment.riskLevel === 'MODERATE'
                    ? '#F59E0B'
                    : '#10B981'
                }; color: white;">
                  ${zone.riskAssessment.riskLevel}
                </span>
              </div>
              <div style="font-size: 10px; color: #94A3B8; margin-top: 5px;">
                <strong style="color: #CBD5E1;">Contributing factors:</strong>
                <ul style="margin: 3px 0 0 12px; padding: 0;">
                  ${zone.riskAssessment.factorSummaries.map((f) => `<li>${f}</li>`).join('')}
                </ul>
              </div>
            </div>
          `
              : ''
          }

          <div style="background: rgba(120,120,120,0.08); border-radius: 8px; padding: 8px; margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px;">
            ${
              isFlood
                ? `
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                <div>Rain: ${weather.precipitation}mm</div>
                <div>Hum: ${weather.humidity}%</div>
                <div>Soil: ${weather.soilMoisture}</div>
                <div>Wind: ${weather.windSpeed}km/h</div>
              </div>
            `
                : `
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                <div>Temp: ${weather.temperature}°C</div>
                <div>HI: ${weather.heatIndex}°C</div>
                <div>Hum: ${weather.humidity}%</div>
                <div>Wind: ${weather.windSpeed}km/h</div>
              </div>
            `
            }
          </div>

          <div style="font-size: 11px; line-height: 1.4; padding: 6px 8px; border-left: 2px solid ${strokeColor}; background: rgba(120,120,120,0.05);">
            ${isDanger ? (isFlood ? trans.evacuateToShelter : trans.heatwaveWarning) : trans.safeAreaNotice}
          </div>
        </div>
      `;

      circle.bindPopup(popupHtml);
      circle.on('click', () => onSelectZone(zone.id));
      layerGroup.addLayer(circle);
    });
  }, [zones, camps, routes, showSafeZones, showDangerZones, showCamps, showRoutes, selectedZoneId, language, trans]);

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-white/10 dark:border-white/10 bg-[#0A0A0B]">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Basemap & Layer Control (Top Left) */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
        {/* Basemap switcher */}
        <div className="bg-[#121214]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 shadow-xl text-xs">
          <Layers className="w-3.5 h-3.5 text-neutral-400 mr-1" />
          <button
            onClick={() => setActiveTile('dark')}
            className={`px-2 py-1 rounded-lg font-mono text-[11px] transition ${
              activeTile === 'dark' ? 'bg-[#FF5A36] text-white font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            DARK
          </button>
          <button
            onClick={() => setActiveTile('carto-light')}
            className={`px-2 py-1 rounded-lg font-mono text-[11px] transition ${
              activeTile === 'carto-light' ? 'bg-[#FF5A36] text-white font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            LIGHT
          </button>
          <button
            onClick={() => setActiveTile('satellite')}
            className={`px-2 py-1 rounded-lg font-mono text-[11px] transition ${
              activeTile === 'satellite' ? 'bg-[#FF5A36] text-white font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            SAT
          </button>
          <button
            onClick={() => setActiveTile('osm')}
            className={`px-2 py-1 rounded-lg font-mono text-[11px] transition ${
              activeTile === 'osm' ? 'bg-[#FF5A36] text-white font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            STREETS
          </button>
        </div>

        {/* Feature toggles */}
        <div className="bg-[#121214]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 flex items-center gap-3 shadow-xl text-[11px] font-mono text-neutral-300">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showDangerZones}
              onChange={(e) => setShowDangerZones(e.target.checked)}
              className="rounded accent-[#FF5A36] w-3 h-3"
            />
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#FF5A36]" />
              HAZARD
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showSafeZones}
              onChange={(e) => setShowSafeZones(e.target.checked)}
              className="rounded accent-[#10B981] w-3 h-3"
            />
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              SAFE
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showCamps}
              onChange={(e) => setShowCamps(e.target.checked)}
              className="rounded accent-white w-3 h-3"
            />
            <span>SHELTERS</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showRoutes}
              onChange={(e) => setShowRoutes(e.target.checked)}
              className="rounded accent-[#FF5A36] w-3 h-3"
            />
            <span>ROUTES</span>
          </label>
        </div>
      </div>

      {/* Control Room Legend (Bottom Left) */}
      <div className="absolute bottom-5 left-4 z-[400] bg-[#121214]/90 backdrop-blur-md p-3.5 rounded-xl border border-white/10 text-xs text-neutral-300 w-56 shadow-2xl">
        <div className="flex items-center justify-between font-mono text-[10px] text-neutral-400 uppercase tracking-wider mb-2">
          <span>Telemetry Legend</span>
          <span className="text-[#FF5A36] font-bold">LIVE GIS</span>
        </div>
        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A36]" />
              High Hazard Level
            </span>
            <span className="text-[#FF5A36] font-bold">&gt;5 pts</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
              Medium Hazard
            </span>
            <span className="text-[#F59E0B]">&le;5 pts</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              Nominal / Safe
            </span>
            <span className="text-[#10B981]">Safe</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/10">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-white text-black text-[8px] flex items-center justify-center font-bold">
                H
              </span>
              Relief Shelter
            </span>
            <span className="text-white">500 cap</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-[#FF5A36]" />
              Evacuation Corridor
            </span>
            <span className="text-[#FF5A36]">Route</span>
          </div>
        </div>
      </div>

      {/* Recenter View Button (Top Right) */}
      <button
        onClick={() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView(centerCoords, zoomLevel, { animate: true });
          }
        }}
        title="Reset camera center"
        className="absolute top-4 right-4 z-[400] bg-[#121214]/90 backdrop-blur-md p-2 rounded-xl border border-white/10 text-neutral-300 hover:text-white transition shadow-xl"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  );
};
