import React, { useState } from 'react';
import { ModelMetrics, DisasterType, WeatherData } from '../types/disaster';
import { calculateHeatIndex } from '../services/weatherService';
import { calculateFloodSeverity, calculateHeatSeverity, getScore } from '../services/mlPipeline';
import { Cpu, Sliders, ShieldCheck, AlertTriangle, Flame, CloudRain, Activity } from 'lucide-react';

interface MLInspectorProps {
  metrics: ModelMetrics;
  disasterType: DisasterType;
  regionName: string;
}

export const MLInspector: React.FC<MLInspectorProps> = ({ metrics, disasterType, regionName }) => {
  const isFlood = disasterType === 'flood';

  const [simTemp, setSimTemp] = useState<number>(isFlood ? 26 : 42);
  const [simWind, setSimWind] = useState<number>(isFlood ? 24 : 8);
  const [simPrecip, setSimPrecip] = useState<number>(isFlood ? 8.5 : 0);
  const [simHumidity, setSimHumidity] = useState<number>(isFlood ? 89 : 35);
  const [simSoil, setSimSoil] = useState<number>(isFlood ? 0.54 : 0.12);

  // Live simulation calculations
  const simHeatIndex = calculateHeatIndex(simTemp, simHumidity);

  const simWeather: WeatherData = {
    temperature: simTemp,
    windSpeed: simWind,
    precipitation: simPrecip,
    humidity: simHumidity,
    soilMoisture: simSoil,
    heatIndex: simHeatIndex,
    isLive: false,
    timestamp: 'Simulator',
  };

  let simPrediction: 'Safe' | 'Danger' | 'Heatwave' = 'Safe';
  let simSeverityLevel = 'N/A';
  let simScore = 0;

  if (isFlood) {
    const floodScore = simHumidity * 0.5 + simSoil * 100;
    const isDanger = floodScore >= metrics.thresholdUsed;
    simPrediction = isDanger ? 'Danger' : 'Safe';
    if (isDanger) {
      const res = calculateFloodSeverity(simWeather);
      simScore = res.score;
      simSeverityLevel = res.level;
    }
  } else {
    const isDanger = simHeatIndex >= metrics.thresholdUsed;
    simPrediction = isDanger ? 'Heatwave' : 'Safe';
    if (isDanger) {
      const res = calculateHeatSeverity(simWeather);
      simScore = res.score;
      simSeverityLevel = res.level;
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Models Performance Section */}
      <div className="rounded-2xl border border-white/10 dark:border-white/10 bg-[#121214] p-6 text-[#F6F5F2]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FF5A36]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold">Classifier Evaluation &amp; Thresholds</h3>
              <p className="text-xs text-neutral-400">
                Trained dynamically on {regionName} meteorological features &bull; {isFlood ? 'Flood Module' : 'Heatwave Module'}
              </p>
            </div>
          </div>
          <span className="font-mono text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300 self-start sm:self-center">
            ENSEMBLE RUNTIME ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Random Forest Card */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono mb-1">
              <span>RANDOM FOREST</span>
              <span>50 TREES</span>
            </div>
            <div className="font-display text-3xl font-bold tracking-tight text-white">
              {(metrics.rfAccuracy * 100).toFixed(1)}%
            </div>
            <div className="text-[11px] text-[#10B981] mt-1 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              Primary spatial decision model
            </div>
          </div>

          {/* Logistic Regression Card */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono mb-1">
              <span>LOGISTIC REGRESSION</span>
              <span>SIGMOID</span>
            </div>
            <div className="font-display text-3xl font-bold tracking-tight text-white">
              {(metrics.lrAccuracy * 100).toFixed(1)}%
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 font-mono">
              Secondary linear boundary verification
            </div>
          </div>

          {/* Dynamic Threshold Card */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono mb-1">
              <span>DYNAMIC THRESHOLD</span>
              <span>DATASET MEAN</span>
            </div>
            <div className="font-display text-3xl font-bold tracking-tight text-[#FF5A36]">
              {metrics.thresholdUsed}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 font-mono">
              {isFlood ? 'Mean(Humidity, Soil × 100)' : 'Mean Heat Index (°C)'}
            </div>
          </div>
        </div>

        {/* Feature Importance Distribution */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <h4 className="font-mono text-xs uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#FF5A36]" />
            Feature Importance Weight Matrix
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metrics.featureWeights.map((fw) => (
              <div key={fw.feature} className="p-3 rounded-lg bg-black/40 border border-white/5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-neutral-300">{fw.feature}</span>
                  <span className="font-mono font-bold text-white">{(fw.weight * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#FF5A36] h-full rounded-full transition-all duration-500"
                    style={{ width: `${fw.weight * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive What-If Simulator */}
      <div className="rounded-2xl border border-white/10 dark:border-white/10 bg-[#121214] p-6 text-[#F6F5F2]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FF5A36]">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">Interactive Telemetry Simulator</h3>
            <p className="text-xs text-neutral-400">
              Modulate meteorological inputs in real-time to observe algorithmic classification shifts and multi-factor severity scores.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-2 space-y-4">
            {isFlood ? (
              <>
                {/* Soil Moisture Slider */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-300">Soil Moisture (1-3cm depth)</span>
                    <span className="font-mono font-bold text-[#FF5A36]">{simSoil} m³/m³</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.01"
                    value={simSoil}
                    onChange={(e) => setSimSoil(parseFloat(e.target.value))}
                    className="w-full accent-[#FF5A36] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                    <span>0.1 (Dry)</span>
                    <span>Thresholds: 0.35 &bull; 0.50 &bull; 0.60</span>
                    <span>0.8 (Saturated)</span>
                  </div>
                </div>

                {/* Relative Humidity Slider */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-300">Relative Humidity</span>
                    <span className="font-mono font-bold text-white">{simHumidity}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    step="1"
                    value={simHumidity}
                    onChange={(e) => setSimHumidity(parseFloat(e.target.value))}
                    className="w-full accent-[#FF5A36] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                    <span>30%</span>
                    <span>Thresholds: 84% &bull; 90% &bull; 95%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Precipitation Slider */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-300">Hourly Precipitation</span>
                    <span className="font-mono font-bold text-white">{simPrecip} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="0.5"
                    value={simPrecip}
                    onChange={(e) => setSimPrecip(parseFloat(e.target.value))}
                    className="w-full accent-[#FF5A36] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                    <span>0 mm</span>
                    <span>Thresholds: 3mm &bull; 5mm &bull; 7mm</span>
                    <span>30 mm (Torrential)</span>
                  </div>
                </div>

                {/* Wind Speed Slider */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-300">Surface Wind Speed</span>
                    <span className="font-mono font-bold text-white">{simWind} km/h</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="60"
                    step="1"
                    value={simWind}
                    onChange={(e) => setSimWind(parseFloat(e.target.value))}
                    className="w-full accent-[#FF5A36] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                    <span>2 km/h</span>
                    <span>Thresholds: 7 &bull; 10 &bull; 20 km/h</span>
                    <span>60 km/h (Gale)</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Temperature Slider */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-300">Ambient Temperature</span>
                    <span className="font-mono font-bold text-[#FF5A36]">{simTemp}°C</span>
                  </div>
                  <input
                    type="range"
                    min="25"
                    max="50"
                    step="0.5"
                    value={simTemp}
                    onChange={(e) => setSimTemp(parseFloat(e.target.value))}
                    className="w-full accent-[#FF5A36] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                    <span>25°C</span>
                    <span>Tiers: &lt;35 (Low), &lt;45 (Med), &ge;45 (High)</span>
                    <span>50°C (Extreme)</span>
                  </div>
                </div>

                {/* Relative Humidity Slider for Heatwave */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-300">Relative Humidity</span>
                    <span className="font-mono font-bold text-white">{simHumidity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="1"
                    value={simHumidity}
                    onChange={(e) => setSimHumidity(parseFloat(e.target.value))}
                    className="w-full accent-[#FF5A36] cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-xs">
                  <span className="text-neutral-400">Calculated Heat Index: </span>
                  <span className="text-[#FF5A36] font-bold text-sm">{simHeatIndex}°C</span>
                  <div className="text-[10px] text-neutral-500 mt-1">
                    HI = Temp + (0.33 &times; Humidity) - 0.7
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Model Output Card */}
          <div className="p-5 rounded-xl bg-black/40 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-3">
                Classification Telemetry
              </div>

              {simPrediction === 'Safe' ? (
                <div className="p-4 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <div>
                      <div className="font-display font-bold text-base text-white">CLASSIFIED SAFE</div>
                      <div className="text-xs text-neutral-400 font-mono mt-0.5">Parameters within baseline</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#FF5A36]/10 border border-[#FF5A36]/30 text-[#FF5A36]">
                  <div className="flex items-center gap-2">
                    {isFlood ? <CloudRain className="w-5 h-5 shrink-0" /> : <Flame className="w-5 h-5 shrink-0" />}
                    <div>
                      <div className="font-display font-bold text-base text-white">
                        {isFlood ? 'FLOOD HAZARD DETECTED' : 'HEATWAVE WARNING'}
                      </div>
                      <div className="text-xs font-mono text-neutral-300 mt-0.5">
                        Severity: {simSeverityLevel} ({simScore} points)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Exact Formula Scoring Breakdown */}
              <div className="mt-5 pt-4 border-t border-white/10 space-y-2 text-xs font-mono">
                <div className="text-neutral-400 uppercase text-[10px]">Scoring Sub-metrics:</div>
                {isFlood ? (
                  <>
                    <div className="flex justify-between text-neutral-300">
                      <span>Wind Score:</span>
                      <span className="text-white">{getScore(simWind, [7, 10, 20])} / 3</span>
                    </div>
                    <div className="flex justify-between text-neutral-300">
                      <span>Precipitation:</span>
                      <span className="text-white">{getScore(simPrecip, [3, 5, 7])} / 3</span>
                    </div>
                    <div className="flex justify-between text-neutral-300">
                      <span>Humidity Score:</span>
                      <span className="text-white">{getScore(simHumidity, [84, 90, 95])} / 3</span>
                    </div>
                    <div className="flex justify-between text-neutral-300">
                      <span>Soil Score:</span>
                      <span className="text-white">{getScore(simSoil, [0.35, 0.5, 0.6])} / 3</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/10 font-bold">
                      <span className="text-white">Aggregate Score:</span>
                      <span className="text-[#FF5A36]">{simScore} / 12</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-neutral-300">
                      <span>Temperature Tier:</span>
                      <span className="text-white">
                        {simTemp < 35 ? 'Tier 1 (<35°C)' : simTemp < 45 ? 'Tier 2 (<45°C)' : 'Tier 3 (≥45°C)'}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-300">
                      <span>Calculated HI:</span>
                      <span className="text-white">{simHeatIndex}°C</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/10 font-bold">
                      <span className="text-white">Assigned Severity:</span>
                      <span className="text-[#FF5A36]">{simSeverityLevel}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 text-[10px] font-mono text-neutral-500">
              Evaluated via dynamic threshold formula logic.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
