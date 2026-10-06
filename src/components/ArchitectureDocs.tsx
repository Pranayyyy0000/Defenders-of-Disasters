import React from 'react';
import { Network, Database, Shield, Radio, BookOpen, Layers, Users, ExternalLink } from 'lucide-react';

export const ArchitectureDocs: React.FC = () => {
  return (
    <div className="space-y-6 text-[#F6F5F2]">
      {/* Overview Card */}
      <div className="rounded-2xl border border-white/10 bg-[#121214] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FF5A36]">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">System Architecture &amp; Methodology</h2>
            <p className="text-xs text-neutral-400">
              Defenders of Disasters &bull; Multi-Disaster Autonomous Emergency Response Framework
            </p>
          </div>
        </div>

        <p className="text-sm text-neutral-300 leading-relaxed mb-6 font-sans">
          Defenders of Disasters combines machine learning hazard classification, live meteorological
          telemetry pipelines, GIS evacuation corridor routing, 13-language regional translation, and automated SMS dissemination.
        </p>

        {/* ASCII Architecture Diagram */}
        <div className="bg-black/50 text-neutral-300 p-5 rounded-xl font-mono text-xs overflow-x-auto border border-white/5">
          <div className="text-[#FF5A36] font-bold mb-2">// CONTROL ROOM ARCHITECTURE</div>
          <pre>{`┌───────────────────────────┐     ┌────────────────────────────┐     ┌───────────────────────────┐
│       INGESTION LAYER     │     │      ANALYTICS ENGINE      │     │      DISPATCH LAYER       │
│                           │     │                            │     │                           │
│ • GPS Coordinates         │────▶│ • Open-Meteo Realtime API  │────▶│ • Interactive Leaflet GIS │
│ • Location Regional Sets  │     │ • Dual ML Pipeline (RF+LR) │     │ • Evacuation Corridors    │
│ • Designated Shelters     │     │ • Dynamic Threshold Logic  │     │ • 13 Regional Languages   │
│ • Realtime Stations       │     │ • Severity Score Matrix    │     │ • Twilio SMS Alerts       │
└───────────────────────────┘     └────────────────────────────┘     └───────────────────────────┘`}</pre>
        </div>
      </div>

      {/* Dual Pipeline Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Flood Module */}
        <div className="rounded-2xl border border-white/10 bg-[#121214] p-6">
          <div className="flex items-center gap-2.5 text-white font-bold text-base mb-3 font-display">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A36]" />
            <h3>Flood &amp; Inundation Module</h3>
          </div>
          <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
            Tested on monsoon flood plains including <strong>Kerala (Malappuram)</strong> and <strong>Assam (Dhubri)</strong>.
          </p>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <span className="text-neutral-400 block mb-1">METEOROLOGICAL PARAMETERS:</span>
              <div className="text-neutral-200">Precipitation &bull; Relative Humidity (2m) &bull; Soil Moisture (1-3cm) &bull; Wind Speed</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <span className="text-neutral-400 block mb-1">CLASSIFICATION FORMULA:</span>
              <div className="text-[#FF5A36]">score = humidity &times; 0.5 + soil_moisture &times; 100</div>
              <div className="text-neutral-500 text-[11px] mt-0.5">Threshold: Mean of dataset humidity &amp; soil moisture</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <span className="text-neutral-400 block mb-1">SEVERITY MATRIX:</span>
              <div className="text-neutral-300">&le; 2: Low &bull; &le; 5: Medium &bull; &gt; 5: High (Critical)</div>
            </div>
          </div>
        </div>

        {/* Heatwave Module */}
        <div className="rounded-2xl border border-white/10 bg-[#121214] p-6">
          <div className="flex items-center gap-2.5 text-white font-bold text-base mb-3 font-display">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A36]" />
            <h3>Heatwave &amp; Thermal Stress Module</h3>
          </div>
          <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
            Targeted for arid inland zones including <strong>Bihar</strong> and <strong>Telangana (Hyderabad)</strong>.
          </p>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <span className="text-neutral-400 block mb-1">METEOROLOGICAL PARAMETERS:</span>
              <div className="text-neutral-200">Ambient Temperature &bull; Humidity &bull; Heat Index (HI) &bull; Wind Speed</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <span className="text-neutral-400 block mb-1">HEAT INDEX FORMULA:</span>
              <div className="text-[#FF5A36]">HI = Temperature + (0.33 &times; Humidity) - 0.7</div>
              <div className="text-neutral-500 text-[11px] mt-0.5">Evaluated against mean Heat Index</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <span className="text-neutral-400 block mb-1">THERMAL SEVERITY TIERS:</span>
              <div className="text-neutral-300">&lt; 35°C: Low &bull; &lt; 45°C: Medium &bull; &ge; 45°C: High</div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Credits & Authors */}
      <div className="rounded-2xl border border-white/10 bg-[#121214] p-6">
        <div className="flex items-center gap-2.5 text-white font-bold text-base mb-4 font-display">
          <Users className="w-5 h-5 text-[#FF5A36]" />
          <h3>Academic Attribution</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3.5 bg-white/5 rounded-xl border border-white/5">
            <div className="font-bold text-white font-display text-sm">Sk. Abdul Rajak</div>
            <div className="text-neutral-400">23BQ1A04E4</div>
            <div className="text-neutral-500 mt-1">VVIT, Nambur &bull; ECE Department</div>
          </div>

          <div className="p-3.5 bg-white/5 rounded-xl border border-white/5">
            <div className="font-bold text-white font-display text-sm">T. Kushwanth</div>
            <div className="text-neutral-400">24BQ5A0420</div>
            <div className="text-neutral-500 mt-1">VVIT, Nambur &bull; ECE Department</div>
          </div>

          <div className="p-3.5 bg-white/5 rounded-xl border border-white/5">
            <div className="font-bold text-white font-display text-sm">V. Jaswanth</div>
            <div className="text-neutral-400">23BQ1A04H3</div>
            <div className="text-neutral-500 mt-1">VVIT, Nambur &bull; ECE Department</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400 font-mono">
          <div>Course Instructor: Mrs. M Ramya Harika &bull; HOD: Dr. Sk. Enaul Haq</div>
          <div>Vasireddy Venkatadri Institute of Technology (VVIT), JNTUK</div>
        </div>
      </div>
    </div>
  );
};
