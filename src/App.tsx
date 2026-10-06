/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RegionKey,
  DisasterType,
  MonitoredZone,
  ReliefCamp,
  SupportedLanguage,
  SMSAlertLog,
} from './types/disaster';
import {
  LANGUAGES,
  KERALA_LOCATIONS,
  ASSAM_LOCATIONS,
  BIHAR_LOCATIONS,
  HYDERABAD_LOCATIONS,
  generateReliefCampsForLocations,
} from './data/defaultData';
import { fetchWeatherForLocation } from './services/weatherService';
import { trainAndEvaluatePipeline } from './services/mlPipeline';
import { buildEvacuationRoutes, findNearestReliefCamp } from './services/routingService';
import { TRANSLATIONS } from './services/translationService';
import { DisasterMap } from './components/DisasterMap';
import { MLInspector } from './components/MLInspector';
import { AlertCenter } from './components/AlertCenter';
import { SituationReport } from './components/SituationReport';
import { ArchitectureDocs } from './components/ArchitectureDocs';
import { TelemetryGlobe3D } from './components/TelemetryGlobe3D';
import { EmergencyHelpModal } from './components/EmergencyHelpModal';
import {
  ShieldAlert,
  Globe2,
  RefreshCw,
  MapPin,
  Flame,
  CloudRain,
  Cpu,
  FileSpreadsheet,
  BookOpen,
  Building,
  Navigation2,
  Plus,
  Radio,
  Sun,
  Moon,
  LifeBuoy,
  PhoneCall,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Compass,
} from 'lucide-react';

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 600;
    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + (value - start) * easeOut));

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };

    requestAnimationFrame(updateCounter);
  }, [value]);

  return <span>{displayValue}</span>;
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<RegionKey>('kerala');
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [activeTab, setActiveTab] = useState<'map' | 'ml' | 'alerts' | 'report' | 'docs'>('map');
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [alertLogs, setAlertLogs] = useState<SMSAlertLog[]>([]);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Custom location modal state
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customLat, setCustomLat] = useState('11.05');
  const [customLon, setCustomLon] = useState('76.08');
  const [customDisasterType, setCustomDisasterType] = useState<DisasterType>('flood');
  const [customZonesList, setCustomZonesList] = useState<MonitoredZone[]>([]);

  const trans = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  // Toggle Dark Mode Class on Root
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Determine active locations based on region
  const { baseLocations, disasterType, regionName, centerCoords, defaultZoom } = useMemo(() => {
    switch (selectedRegion) {
      case 'assam':
        return {
          baseLocations: ASSAM_LOCATIONS,
          disasterType: 'flood' as DisasterType,
          regionName: 'Assam (Dhubri)',
          centerCoords: [26.12, 90.0] as [number, number],
          defaultZoom: 10,
        };
      case 'bihar':
        return {
          baseLocations: BIHAR_LOCATIONS,
          disasterType: 'heatwave' as DisasterType,
          regionName: 'Bihar State',
          centerCoords: [25.8, 85.5] as [number, number],
          defaultZoom: 7,
        };
      case 'hyderabad':
        return {
          baseLocations: HYDERABAD_LOCATIONS,
          disasterType: 'heatwave' as DisasterType,
          regionName: 'Telangana (Hyderabad)',
          centerCoords: [17.43, 78.44] as [number, number],
          defaultZoom: 11,
        };
      case 'custom':
        return {
          baseLocations: [],
          disasterType: customDisasterType,
          regionName: 'Custom Coordinates',
          centerCoords: (customZonesList.length > 0 ? [customZonesList[0].lat, customZonesList[0].lon] : [20.5937, 78.9629]) as [number, number],
          defaultZoom: 9,
        };
      case 'kerala':
      default:
        return {
          baseLocations: KERALA_LOCATIONS,
          disasterType: 'flood' as DisasterType,
          regionName: 'Kerala (Malappuram)',
          centerCoords: [11.05, 76.12] as [number, number],
          defaultZoom: 10,
        };
    }
  }, [selectedRegion, customDisasterType, customZonesList]);

  // Relief Camps (derived from current locations using +1km shift rule)
  const reliefCamps: ReliefCamp[] = useMemo(() => {
    if (selectedRegion === 'custom') {
      return generateReliefCampsForLocations(
        customZonesList.map((z) => ({
          id: z.id,
          name: z.name,
          lat: z.lat,
          lon: z.lon,
          state: z.state,
          district: z.district,
          disasterType: z.disasterType,
        }))
      );
    }
    return generateReliefCampsForLocations(baseLocations);
  }, [selectedRegion, baseLocations, customZonesList]);

  // Monitored zones data with weather
  const [monitoredZones, setMonitoredZones] = useState<MonitoredZone[]>([]);

  // Fetch or refresh weather for current region
  const loadWeatherData = async () => {
    setIsLoadingWeather(true);
    try {
      const locs = selectedRegion === 'custom' ? customZonesList : baseLocations;

      const weatherPromises = locs.map(async (loc) => {
        const weather = await fetchWeatherForLocation(loc.lat, loc.lon, loc.name, disasterType);
        return {
          id: loc.id,
          name: loc.name,
          lat: loc.lat,
          lon: loc.lon,
          state: loc.state,
          district: loc.district,
          disasterType,
          weather,
        };
      });

      const weatherResults = await Promise.all(weatherPromises);

      // Run ML Pipeline with dynamic threshold
      const { predictions } = trainAndEvaluatePipeline(
        weatherResults.map((r) => ({ id: r.id, weather: r.weather })),
        disasterType
      );

      // Connect Relief Camps and Routes
      const populatedZones: MonitoredZone[] = weatherResults.map((item) => {
        const pred = predictions.get(item.id) || {
          prediction: 'Safe',
          probability: 0.5,
          score: 0,
          severityLevel: 'N/A',
        };

        const isDanger = pred.prediction === 'Danger' || pred.prediction === 'Heatwave';
        const nearest = isDanger ? findNearestReliefCamp(item.lat, item.lon, reliefCamps) : undefined;

        return {
          ...item,
          mlPrediction: pred.prediction,
          severityScore: pred.score,
          severityLevel: pred.severityLevel,
          nearestCamp: nearest || undefined,
        };
      });

      setMonitoredZones(populatedZones);
      if (populatedZones.length > 0 && !selectedZoneId) {
        setSelectedZoneId(populatedZones[0].id);
      }
    } finally {
      setIsLoadingWeather(false);
    }
  };

  useEffect(() => {
    loadWeatherData();
  }, [selectedRegion]);

  // ML Metrics calculated for the active dataset
  const { metrics } = useMemo(() => {
    return trainAndEvaluatePipeline(
      monitoredZones.map((z) => ({ id: z.id, weather: z.weather })),
      disasterType
    );
  }, [monitoredZones, disasterType]);

  // Evacuation and Risk Routes
  const routes = useMemo(() => {
    const dangerList = monitoredZones
      .filter((z) => z.mlPrediction === 'Danger' || z.mlPrediction === 'Heatwave')
      .map((z) => ({ name: z.name, lat: z.lat, lon: z.lon }));

    const safeList = monitoredZones
      .filter((z) => z.mlPrediction === 'Safe')
      .map((z) => ({ name: z.name, lat: z.lat, lon: z.lon }));

    return buildEvacuationRoutes(dangerList, safeList, reliefCamps);
  }, [monitoredZones, reliefCamps]);

  // Selected Zone Details
  const activeSelectedZone = useMemo(() => {
    return monitoredZones.find((z) => z.id === selectedZoneId) || monitoredZones[0] || null;
  }, [monitoredZones, selectedZoneId]);

  // Statistics
  const stats = useMemo(() => {
    const safeCount = monitoredZones.filter((z) => z.mlPrediction === 'Safe').length;
    const dangerCount = monitoredZones.filter(
      (z) => z.mlPrediction === 'Danger' || z.mlPrediction === 'Heatwave'
    ).length;
    const highCount = monitoredZones.filter((z) => z.severityLevel === 'High').length;
    return {
      total: monitoredZones.length,
      safe: safeCount,
      danger: dangerCount,
      highSeverity: highCount,
      camps: reliefCamps.length,
      routesCount: routes.length,
    };
  }, [monitoredZones, reliefCamps, routes]);

  const handleAddCustomLocation = () => {
    if (!customName.trim()) return;
    const latNum = parseFloat(customLat);
    const lonNum = parseFloat(customLon);
    if (isNaN(latNum) || isNaN(lonNum)) return;

    const newZone: MonitoredZone = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      lat: latNum,
      lon: lonNum,
      state: 'Custom',
      district: 'User Monitored',
      disasterType: customDisasterType,
      weather: {
        temperature: customDisasterType === 'heatwave' ? 41.5 : 27,
        windSpeed: customDisasterType === 'flood' ? 22 : 8,
        precipitation: customDisasterType === 'flood' ? 12 : 0,
        humidity: customDisasterType === 'flood' ? 91 : 32,
        soilMoisture: customDisasterType === 'flood' ? 0.58 : 0.1,
        heatIndex: 45,
        isLive: false,
        timestamp: new Date().toLocaleTimeString(),
      },
      mlPrediction: 'Danger',
      severityScore: 7,
      severityLevel: 'High',
    };

    setCustomZonesList([...customZonesList, newZone]);
    setSelectedRegion('custom');
    setCustomName('');
    setShowAddCustom(false);
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'bg-[#0A0A0B] text-[#F6F5F2]' : 'bg-[#F6F5F2] text-[#0A0A0B]'}`}>
      {/* Top Calm Control Room Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0A0B]/85 dark:bg-[#0A0A0B]/85 border-b border-white/10 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand & Live Indicator */}
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#FF5A36] animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base sm:text-lg tracking-tight">
                  Defenders of Disasters
                </span>
                <span className="hidden sm:inline-block font-mono text-[10px] text-neutral-400 border border-white/10 px-2 py-0.5 rounded-full">
                  CONTROL ROOM
                </span>
              </div>
            </div>
          </div>

          {/* Persistent One-Tap Emergency Action + Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 1-Tap Emergency SOS Trigger */}
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#FF5A36] hover:bg-[#E84D2A] text-white text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-lg shadow-[#FF5A36]/25 cursor-pointer active:scale-95"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>I NEED HELP</span>
            </button>

            {/* Language Switcher */}
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs">
              <Globe2 className="w-3.5 h-3.5 text-neutral-400 mr-1.5 shrink-0" />
              <select
                value={currentLanguage}
                onChange={(e) => setCurrentLanguage(e.target.value as SupportedLanguage)}
                className="bg-transparent text-white font-mono text-xs focus:outline-hidden cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-[#121214] text-white">
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Dark / Light Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Switch to Editorial Light' : 'Switch to Control Room Dark'}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#FF5A36]" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Region Selector Bar */}
        <div className="border-t border-white/5 bg-black/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Region pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 font-mono">
              <span className="text-[11px] text-neutral-400 mr-1 hidden md:inline">REGION:</span>
              <button
                onClick={() => setSelectedRegion('kerala')}
                className={`px-3 py-1 rounded-lg text-xs transition ${
                  selectedRegion === 'kerala' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                KERALA (FLOOD)
              </button>
              <button
                onClick={() => setSelectedRegion('assam')}
                className={`px-3 py-1 rounded-lg text-xs transition ${
                  selectedRegion === 'assam' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                ASSAM (FLOOD)
              </button>
              <button
                onClick={() => setSelectedRegion('bihar')}
                className={`px-3 py-1 rounded-lg text-xs transition ${
                  selectedRegion === 'bihar' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                BIHAR (HEATWAVE)
              </button>
              <button
                onClick={() => setSelectedRegion('hyderabad')}
                className={`px-3 py-1 rounded-lg text-xs transition ${
                  selectedRegion === 'hyderabad' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                HYDERABAD (HEAT)
              </button>
            </div>

            {/* Weather Sync action */}
            <button
              onClick={loadWeatherData}
              disabled={isLoadingWeather}
              className="flex items-center gap-1.5 text-neutral-400 hover:text-white font-mono text-[11px] transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWeather ? 'animate-spin text-[#FF5A36]' : ''}`} />
              <span>{isLoadingWeather ? 'SYNCING...' : 'LIVE REFRESH'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* HERO SECTION: Single headline, single sentence, 1 action, and 3D globe */}
        <section className="relative rounded-3xl border border-white/10 dark:border-white/10 bg-[#121214] text-[#F6F5F2] overflow-hidden p-6 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 font-mono text-[11px] text-neutral-300">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A36]" />
                AUTONOMOUS DISASTER MITIGATION &bull; VERSION 2.5
              </div>

              <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.08] text-white">
                Early hazard detection. <br />
                Calm, algorithmic response.
              </h1>

              <p className="text-neutral-400 text-sm sm:text-base leading-relaxed max-w-xl font-sans">
                Real-time meteorological monitoring and machine learning hazard classification across India, paired with instant evacuation routing and 13-language emergency broadcast.
              </p>

              {/* Primary Action Button */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setActiveTab('map');
                    const mapEl = document.getElementById('control-room-tabs');
                    mapEl?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-6 py-3.5 rounded-xl bg-white text-black hover:bg-neutral-200 font-display font-bold text-sm transition flex items-center gap-2 group cursor-pointer"
                >
                  <span>Launch Operations Map</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => setIsHelpModalOpen(true)}
                  className="px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white font-mono text-xs transition"
                >
                  Emergency Helplines (112 / 1078)
                </button>
              </div>

              {/* Live Telemetry Status Bar */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs font-mono text-neutral-400">
                <div>
                  <span className="text-neutral-500 block text-[10px]">CURRENT FOCUS</span>
                  <span className="text-white font-bold">{regionName}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">HAZARD ENGINE</span>
                  <span className="text-[#FF5A36] font-bold">{disasterType.toUpperCase()} MONITOR</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">ML CLASSIFIER</span>
                  <span className="text-white font-bold">{(metrics.rfAccuracy * 100).toFixed(1)}% ACCURACY</span>
                </div>
              </div>
            </div>

            {/* Right: 3D Interactive Telemetry Globe */}
            <div className="lg:col-span-5 h-[340px] sm:h-[400px] rounded-2xl bg-black/40 border border-white/5 relative overflow-hidden flex items-center justify-center">
              <TelemetryGlobe3D isDark={isDarkMode} />
            </div>
          </div>
        </section>

        {/* ASYMMETRIC STATS GRID: Large numbers, clean typography, animated counters */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-white/10 dark:border-white/10 bg-[#121214] text-[#F6F5F2]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">MONITORED ZONES</span>
            <div className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-1">
              <AnimatedNumber value={stats.total} />
            </div>
            <p className="text-xs text-neutral-400 mt-1">{regionName} GPS nodes</p>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 dark:border-white/10 bg-[#121214] text-[#F6F5F2]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#FF5A36]">ACTIVE HAZARDS</span>
            <div className="font-display text-3xl sm:text-4xl font-extrabold text-[#FF5A36] mt-1">
              <AnimatedNumber value={stats.danger} />
            </div>
            <p className="text-xs text-neutral-400 mt-1">{stats.highSeverity} high severity alert(s)</p>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 dark:border-white/10 bg-[#121214] text-[#F6F5F2]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#10B981]">NOMINAL ZONES</span>
            <div className="font-display text-3xl sm:text-4xl font-extrabold text-[#10B981] mt-1">
              <AnimatedNumber value={stats.safe} />
            </div>
            <p className="text-xs text-neutral-400 mt-1">Conditions below threshold</p>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 dark:border-white/10 bg-[#121214] text-[#F6F5F2]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">SHELTER CORRIDORS</span>
            <div className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-1">
              <AnimatedNumber value={stats.camps} />
            </div>
            <p className="text-xs text-neutral-400 mt-1">{stats.routesCount} calculated escape routes</p>
          </div>
        </section>

        {/* OPERATION TABS (CONTROL ROOM) */}
        <section id="control-room-tabs" className="space-y-6">
          {/* Segmented Control Bar */}
          <div className="p-1 rounded-2xl bg-[#121214] border border-white/10 flex flex-wrap gap-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'map' ? 'bg-white text-black font-bold shadow-md' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>GIS MAP &amp; ROUTING</span>
            </button>
            <button
              onClick={() => setActiveTab('ml')}
              className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'ml' ? 'bg-white text-black font-bold shadow-md' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>ML CLASSIFIER LAB</span>
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'alerts' ? 'bg-white text-black font-bold shadow-md' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-[#FF5A36]" />
              <span>SMS BROADCAST</span>
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'report' ? 'bg-white text-black font-bold shadow-md' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>SITUATION AUDIT</span>
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'docs' ? 'bg-white text-black font-bold shadow-md' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>ARCHITECTURE</span>
            </button>
          </div>

          {/* TAB 1: GIS MAP & ROUTING */}
          {activeTab === 'map' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Map Canvas */}
              <div className="lg:col-span-8 rounded-2xl border border-white/10 dark:border-white/10 bg-[#121214] p-3 h-[620px] flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 text-xs font-mono text-neutral-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#FF5A36]" />
                    <span className="text-white font-bold">{regionName}</span>
                    <span>&bull; {disasterType.toUpperCase()} MODE</span>
                  </div>
                  <span className="hidden sm:inline">SELECT ANY ZONE MARKER FOR TELEMETRY</span>
                </div>
                <div className="flex-1 w-full rounded-xl overflow-hidden">
                  <DisasterMap
                    zones={monitoredZones}
                    camps={reliefCamps}
                    routes={routes}
                    selectedZoneId={selectedZoneId}
                    onSelectZone={(id) => setSelectedZoneId(id)}
                    language={currentLanguage}
                    centerCoords={centerCoords}
                    zoomLevel={defaultZoom}
                    isDark={isDarkMode}
                  />
                </div>
              </div>

              {/* Zone Telemetry Inspector Panel */}
              <div className="lg:col-span-4 space-y-4">
                {activeSelectedZone ? (
                  <div className="rounded-2xl border border-white/10 dark:border-white/10 bg-[#121214] p-5 text-[#F6F5F2] space-y-5">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-display text-xl font-bold text-white">{activeSelectedZone.name}</h3>
                        <p className="text-xs text-neutral-400">
                          {activeSelectedZone.district}, {activeSelectedZone.state} &bull; [{activeSelectedZone.lat.toFixed(2)}, {activeSelectedZone.lon.toFixed(2)}]
                        </p>
                      </div>
                      <span
                        className={`font-mono text-[11px] font-bold px-2.5 py-1 rounded-md ${
                          activeSelectedZone.mlPrediction === 'Safe'
                            ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30'
                            : 'bg-[#FF5A36]/15 text-[#FF5A36] border border-[#FF5A36]/30'
                        }`}
                      >
                        {activeSelectedZone.mlPrediction.toUpperCase()}
                      </span>
                    </div>

                    {/* Multilingual Advisory Callout */}
                    <div
                      className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                        activeSelectedZone.mlPrediction === 'Safe'
                          ? 'bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]'
                          : 'bg-[#FF5A36]/10 border-[#FF5A36]/20 text-neutral-200'
                      }`}
                    >
                      <div className="font-mono text-[10px] uppercase font-bold tracking-wider mb-1 opacity-75">
                        {LANGUAGES.find((l) => l.code === currentLanguage)?.name} Advisory
                      </div>
                      <div className="font-sans">
                        {activeSelectedZone.mlPrediction === 'Safe'
                          ? trans.safeAreaNotice
                          : disasterType === 'flood'
                          ? trans.evacuateToShelter
                          : trans.heatwaveWarning}
                      </div>
                    </div>

                    {/* Meteorological Readouts */}
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 mb-2">
                        ENVIRONMENTAL OBSERVATIONS
                      </div>
                      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-neutral-500 text-[10px] block">{trans.windSpeed}</span>
                          <span className="text-white font-bold text-sm">
                            {activeSelectedZone.weather.windSpeed} km/h
                          </span>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-neutral-500 text-[10px] block">{trans.precipitation}</span>
                          <span className="text-white font-bold text-sm">
                            {activeSelectedZone.weather.precipitation} mm
                          </span>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-neutral-500 text-[10px] block">{trans.humidity}</span>
                          <span className="text-white font-bold text-sm">
                            {activeSelectedZone.weather.humidity}%
                          </span>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-neutral-500 text-[10px] block">
                            {disasterType === 'flood' ? trans.soilMoisture : trans.heatIndex}
                          </span>
                          <span className="text-[#FF5A36] font-bold text-sm">
                            {disasterType === 'flood'
                              ? `${activeSelectedZone.weather.soilMoisture} m³/m³`
                              : `${activeSelectedZone.weather.heatIndex}°C`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Shelter Card */}
                    {activeSelectedZone.nearestCamp && (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-mono text-[#10B981]">
                          <Building className="w-3.5 h-3.5" />
                          <span>ASSIGNED EVACUATION SHELTER</span>
                        </div>
                        <div className="font-display font-bold text-sm text-white">
                          {activeSelectedZone.nearestCamp.camp.name}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {activeSelectedZone.nearestCamp.camp.type}
                        </div>
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between font-mono text-xs text-neutral-300">
                          <span>{activeSelectedZone.nearestCamp.distanceKm} km away</span>
                          <span>~{activeSelectedZone.nearestCamp.durationMin} mins transit</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-[#121214] p-8 text-center text-xs text-neutral-500 font-mono">
                    Select a zone marker on the GIS map.
                  </div>
                )}

                {/* Add Custom Location Test */}
                <div className="rounded-2xl border border-white/10 bg-[#121214] p-4 text-[#F6F5F2]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-display font-bold text-xs text-white">Test Custom Location</h4>
                      <p className="text-[11px] text-neutral-400">Inject coordinates anywhere in India</p>
                    </div>
                    <button
                      onClick={() => setShowAddCustom(!showAddCustom)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {showAddCustom && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-white/10 text-xs">
                      <div>
                        <label className="block text-[10px] font-mono text-neutral-400 mb-0.5">LOCATION NAME</label>
                        <input
                          type="text"
                          placeholder="e.g. Kozhikode Harbor"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-mono text-neutral-400 mb-0.5">LATITUDE</label>
                          <input
                            type="text"
                            value={customLat}
                            onChange={(e) => setCustomLat(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-neutral-400 mb-0.5">LONGITUDE</label>
                          <input
                            type="text"
                            value={customLon}
                            onChange={(e) => setCustomLon(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-neutral-400 mb-0.5">DISASTER MODULE</label>
                        <select
                          value={customDisasterType}
                          onChange={(e) => setCustomDisasterType(e.target.value as DisasterType)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                        >
                          <option value="flood">Flood Module</option>
                          <option value="heatwave">Heatwave Module</option>
                        </select>
                      </div>
                      <button
                        onClick={handleAddCustomLocation}
                        className="w-full mt-2 py-2 bg-[#FF5A36] hover:bg-[#E84D2A] text-white font-bold rounded-lg text-xs font-mono transition"
                      >
                        RUN CLASSIFIER
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ML CLASSIFIER LAB */}
          {activeTab === 'ml' && (
            <MLInspector metrics={metrics} disasterType={disasterType} regionName={regionName} />
          )}

          {/* TAB 3: SMS BROADCAST */}
          {activeTab === 'alerts' && (
            <AlertCenter
              zones={monitoredZones}
              disasterType={disasterType}
              regionName={regionName}
              language={currentLanguage}
              onLanguageChange={setCurrentLanguage}
              alertLogs={alertLogs}
              onAddAlertLog={(log) => setAlertLogs([log, ...alertLogs])}
            />
          )}

          {/* TAB 4: SITUATION AUDIT */}
          {activeTab === 'report' && (
            <SituationReport zones={monitoredZones} disasterType={disasterType} regionName={regionName} />
          )}

          {/* TAB 5: ARCHITECTURE */}
          {activeTab === 'docs' && <ArchitectureDocs />}
        </section>
      </div>

      {/* Emergency Help Modal */}
      <EmergencyHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        nearestCamp={activeSelectedZone?.nearestCamp?.camp || reliefCamps[0] || null}
        onNavigateToMap={() => {
          setActiveTab('map');
          const mapEl = document.getElementById('control-room-tabs');
          mapEl?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Minimal Editorial Footer */}
      <footer className="mt-16 border-t border-white/10 py-8 text-xs font-mono text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A36]" />
            <span className="text-neutral-400 font-bold font-display">DEFENDERS OF DISASTERS</span>
            <span>&bull; CALM CONTROL ROOM PLATFORM</span>
          </div>
          <div>VVIT Machine Learning Lab &bull; Sk. Abdul Rajak &bull; T. Kushwanth &bull; V. Jaswanth</div>
        </div>
      </footer>
    </div>
  );
}
