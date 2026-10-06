import React, { useState } from 'react';
import { ModelMetrics, DisasterType, WeatherData } from '../types/disaster';
import { calculateHeatIndex } from '../services/weatherService';
import { calculateFloodSeverity, calculateHeatSeverity, getScore } from '../services/mlPipeline';
import {
  Cpu,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CloudRain,
  Activity,
  Info,
  CheckCircle2,
  Table,
  Layers,
} from 'lucide-react';

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

  const cm = metrics.confusionMatrix || { trueNegative: 0, falsePositive: 0, falseNegative: 0, truePositive: 0 };

  return (
    <div className="space-y-6">
      {/* Critical Methodology Note: Proxy Label Notice */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 text-amber-200">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-[#FF5A36] shrink-0 mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-display font-bold text-sm text-white">
              Evaluation Methodology Notice: Heuristic Proxy Labels
            </h4>
            <p className="text-xs text-neutral-300 leading-relaxed font-sans">
              {metrics.disclaimer}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] font-mono text-neutral-400">
              <span>Split: 75% Train / 25% Test</span>
              <span>Reproducible Seed: random_state={metrics.randomState}</span>
              <span>Train Samples: {metrics.trainCount}</span>
              <span>Held-Out Test Samples: {metrics.testCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Held-Out Test Set Validation Metrics */}
      <div className="rounded-2xl border border-white/10 dark:border-white/10 bg-[#121214] p-6 text-[#F6F5F2]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FF5A36]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold">Held-Out Test Evaluation Metrics</h3>
              <p className="text-xs text-neutral-400">
                Evaluated on unseen test split &bull; {regionName} &bull; {isFlood ? 'Flood Module' : 'Heatwave Module'}
              </p>
            </div>
          </div>
          <span className="font-mono text-xs px-3 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 self-start sm:self-center">
            VALIDATED TEST SPLIT
          </span>
        </div>

        {/* 4 Core Metrics Grid: Accuracy, Precision, Recall, F1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono mb-1">
              <span>ACCURACY</span>
              <span>TEST SET</span>
            </div>
            <div className="font-display text-3xl font-bold tracking-tight text-white">
              {(metrics.rfAccuracy * 100).toFixed(1)}%
            </div>
            <div className="text-[11px] text-[#10B981] mt-1 font-mono">Random Forest</div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono mb-1">
              <span>PRECISION</span>
              <span>POSITIVE</span>
            </div>
            <div className="font-display text-3xl font-bold tracking-tight text-white">
              {(metrics.precision * 100).toFixed(1)}%
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 font-mono">True Pos / (TP + FP)</div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono mb-1">
              <span>RECALL</span>
              <span>SENSITIVITY</span>
            </div>
            <div className="font-display text-3xl font-bold tracking-tight text-white">
              {(metrics.recall * 100).toFixed(1)}%
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 font-mono">True Pos / (TP + FN)</div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono mb-1">
              <span>F1-SCORE</span>
              <span>HARMONIC</span>
            </div>
            <div className="font-display text-3xl font-bold tracking-tight text-[#FF5A36]">
              {(metrics.f1Score * 100).toFixed(1)}%
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 font-mono">Balanced F-Measure</div>
          </div>
        </div>

        {/* Confusion Matrix & Classification Report Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 pt-6 border-t border-white/10">
          {/* Confusion Matrix */}
          <div className="lg:col-span-5 space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#FF5A36]" />
              Confusion Matrix (Test Split)
            </h4>

            <div className="bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-xs">
              <div className="grid grid-cols-3 gap-2 text-center items-center">
                <div />
                <div className="text-[10px] text-neutral-500 uppercase">Pred Safe (0)</div>
                <div className="text-[10px] text-neutral-500 uppercase">Pred Hazard (1)</div>

                <div className="text-[10px] text-neutral-400 uppercase text-left">Actual Safe</div>
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/30 font-bold text-[#10B981]">
                  TN: {cm.trueNegative}
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-neutral-300">
                  FP: {cm.falsePositive}
                </div>

                <div className="text-[10px] text-neutral-400 uppercase text-left">Actual Hazard</div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-neutral-300">
                  FN: {cm.falseNegative}
                </div>
                <div className="p-2.5 rounded-lg bg-[#FF5A36]/15 border border-[#FF5A36]/30 font-bold text-[#FF5A36]">
                  TP: {cm.truePositive}
                </div>
              </div>
            </div>
          </div>

          {/* Classification Report Table */}
          <div className="lg:col-span-7 space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Table className="w-3.5 h-3.5 text-[#FF5A36]" />
              Classification Report Breakdown
            </h4>

            <div className="bg-black/40 border border-white/5 rounded-xl overflow-hidden font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] text-neutral-500 uppercase">
                    <th className="p-2.5">Class</th>
                    <th className="p-2.5">Precision</th>
                    <th className="p-2.5">Recall</th>
                    <th className="p-2.5">F1</th>
                    <th className="p-2.5">Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-neutral-300 text-[11px]">
                  {metrics.classificationReport.map((row) => (
                    <tr key={row.className} className="hover:bg-white/5">
                      <td className="p-2.5 font-bold text-white">{row.className}</td>
                      <td className="p-2.5">{row.precision}</td>
                      <td className="p-2.5">{row.recall}</td>
                      <td className="p-2.5 text-[#FF5A36]">{row.f1}</td>
                      <td className="p-2.5 text-neutral-400">{row.support}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Feature Importance Distribution */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <h4 className="font-mono text-xs uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#FF5A36]" />
            Random Forest Gini Feature Importance
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metrics.featureWeights.map((fw) => (
              <div key={fw.feature} className="p-3 rounded-lg bg-black/40 border border-white/5">
                <div className="flex justify-between text-xs mb-1.5 font-mono">
                  <span className="text-neutral-300">{fw.feature}</span>
                  <span className="font-bold text-white">{(fw.weight * 100).toFixed(0)}%</span>
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
