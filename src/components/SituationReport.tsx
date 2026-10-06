import React, { useState } from 'react';
import { MonitoredZone, DisasterType } from '../types/disaster';
import { Download, FileText, Printer, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

interface SituationReportProps {
  zones: MonitoredZone[];
  disasterType: DisasterType;
  regionName: string;
}

export const SituationReport: React.FC<SituationReportProps> = ({ zones, disasterType, regionName }) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [embeddedMap, setEmbeddedMap] = useState<'none' | 'flood' | 'heatwave'>('none');

  const isFlood = disasterType === 'flood';

  const filteredZones = zones.filter((z) => {
    if (filterSeverity === 'all') return true;
    if (filterSeverity === 'Safe') return z.mlPrediction === 'Safe';
    return z.severityLevel === filterSeverity;
  });

  const exportCSV = () => {
    const headers = [
      'Location',
      'District',
      'State',
      'DisasterType',
      'ML_Prediction',
      'Severity_Level',
      'Severity_Score',
      'Temperature_C',
      'WindSpeed_kmh',
      'Precipitation_mm',
      'Humidity_pct',
      'SoilMoisture',
      'HeatIndex_C',
      'NearestReliefCamp',
      'DistanceKm',
      'TravelDurationMin',
    ];

    const rows = zones.map((z) => [
      `"${z.name}"`,
      `"${z.district}"`,
      `"${z.state}"`,
      z.disasterType,
      z.mlPrediction,
      z.severityLevel,
      z.severityScore,
      z.weather.temperature,
      z.weather.windSpeed,
      z.weather.precipitation,
      z.weather.humidity,
      z.weather.soilMoisture,
      z.weather.heatIndex,
      `"${z.nearestCamp?.camp.name || 'N/A'}"`,
      z.nearestCamp?.distanceKm || 0,
      z.nearestCamp?.durationMin || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `defenders_disaster_report_${regionName.toLowerCase()}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(zones, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `defenders_report_${regionName.toLowerCase()}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="rounded-2xl border border-white/10 dark:border-white/10 bg-[#121214] p-6 text-[#F6F5F2] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#FF5A36]" />
            Regional Assessment &amp; Evacuation Logistics Audit
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Region: {regionName} &bull; Monitored Zones: {zones.length} &bull; Timestamp: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs font-mono rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" /> CSV EXPORT
          </button>
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs font-mono rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" /> JSON EXPORT
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#FF5A36] hover:bg-[#E84D2A] text-white text-xs font-bold rounded-xl transition shadow-lg shadow-[#FF5A36]/20"
          >
            <Printer className="w-3.5 h-3.5" /> PRINT BRIEF
          </button>
        </div>
      </div>

      {/* Embedded Folium GIS Maps */}
      <div className="rounded-2xl border border-white/10 bg-[#121214] p-5 text-[#F6F5F2]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-display font-bold text-sm">Standalone Folium GIS Output Files</h3>
            <p className="text-xs text-neutral-400">
              Direct access to static GIS builds: <code className="text-[#FF5A36]">flood_map.html</code> &bull; <code className="text-[#FF5A36]">heatwave_map.html</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEmbeddedMap(embeddedMap === 'flood' ? 'none' : 'flood')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
                embeddedMap === 'flood'
                  ? 'bg-[#FF5A36] text-white border-[#FF5A36]'
                  : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white'
              }`}
            >
              {embeddedMap === 'flood' ? 'HIDE FLOOD MAP' : 'VIEW FLOOD_MAP.HTML'}
            </button>
            <button
              onClick={() => setEmbeddedMap(embeddedMap === 'heatwave' ? 'none' : 'heatwave')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
                embeddedMap === 'heatwave'
                  ? 'bg-[#FF5A36] text-white border-[#FF5A36]'
                  : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white'
              }`}
            >
              {embeddedMap === 'heatwave' ? 'HIDE HEAT MAP' : 'VIEW HEATWAVE_MAP.HTML'}
            </button>
          </div>
        </div>

        {embeddedMap !== 'none' && (
          <div className="mt-4 rounded-xl border border-white/10 overflow-hidden bg-black">
            <div className="p-2.5 bg-black/60 border-b border-white/10 flex items-center justify-between text-xs font-mono text-neutral-400">
              <span>outputs/{embeddedMap}_map.html</span>
              <a
                href={`/outputs/${embeddedMap}_map.html`}
                target="_blank"
                rel="noreferrer"
                className="text-[#FF5A36] hover:underline flex items-center gap-1"
              >
                Open in new tab <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <iframe
              src={`/outputs/${embeddedMap}_map.html`}
              className="w-full h-[450px] border-0"
              title={`${embeddedMap} Map Viewer`}
            />
          </div>
        )}
      </div>

      {/* Filter and Table */}
      <div className="rounded-2xl border border-white/10 bg-[#121214] overflow-hidden text-[#F6F5F2]">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-neutral-400 mr-2">FILTER:</span>
            <button
              onClick={() => setFilterSeverity('all')}
              className={`px-2.5 py-1 rounded-lg ${filterSeverity === 'all' ? 'bg-[#FF5A36] text-white' : 'bg-white/5 text-neutral-400 hover:text-white'}`}
            >
              ALL ({zones.length})
            </button>
            <button
              onClick={() => setFilterSeverity('High')}
              className={`px-2.5 py-1 rounded-lg ${filterSeverity === 'High' ? 'bg-[#FF5A36] text-white' : 'bg-white/5 text-neutral-400 hover:text-white'}`}
            >
              HIGH ({zones.filter((z) => z.severityLevel === 'High').length})
            </button>
            <button
              onClick={() => setFilterSeverity('Medium')}
              className={`px-2.5 py-1 rounded-lg ${filterSeverity === 'Medium' ? 'bg-[#FF5A36] text-white' : 'bg-white/5 text-neutral-400 hover:text-white'}`}
            >
              MEDIUM ({zones.filter((z) => z.severityLevel === 'Medium').length})
            </button>
            <button
              onClick={() => setFilterSeverity('Low')}
              className={`px-2.5 py-1 rounded-lg ${filterSeverity === 'Low' ? 'bg-[#FF5A36] text-white' : 'bg-white/5 text-neutral-400 hover:text-white'}`}
            >
              LOW ({zones.filter((z) => z.severityLevel === 'Low').length})
            </button>
            <button
              onClick={() => setFilterSeverity('Safe')}
              className={`px-2.5 py-1 rounded-lg ${filterSeverity === 'Safe' ? 'bg-[#10B981] text-white' : 'bg-white/5 text-neutral-400 hover:text-white'}`}
            >
              SAFE ({zones.filter((z) => z.mlPrediction === 'Safe').length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-black/40 border-b border-white/10 text-neutral-400 font-mono text-[11px]">
                <th className="py-3 px-4">LOCATION</th>
                <th className="py-3 px-3">DISTRICT</th>
                <th className="py-3 px-3">STATUS</th>
                <th className="py-3 px-3">SEVERITY</th>
                {isFlood ? (
                  <>
                    <th className="py-3 px-3">PRECIP</th>
                    <th className="py-3 px-3">HUMIDITY</th>
                    <th className="py-3 px-3">SOIL MOISTURE</th>
                    <th className="py-3 px-3">WIND</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-3">TEMP</th>
                    <th className="py-3 px-3">HEAT INDEX</th>
                    <th className="py-3 px-3">HUMIDITY</th>
                    <th className="py-3 px-3">WIND</th>
                  </>
                )}
                <th className="py-3 px-4">ASSIGNED SHELTER</th>
                <th className="py-3 px-3">CORRIDOR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-neutral-300">
              {filteredZones.map((z) => {
                const isDanger = z.mlPrediction === 'Danger' || z.mlPrediction === 'Heatwave';
                return (
                  <tr key={z.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-bold text-white font-display">{z.name}</td>
                    <td className="py-3 px-3 text-neutral-400">{z.district}, {z.state}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] ${
                          isDanger ? 'bg-[#FF5A36]/15 text-[#FF5A36]' : 'bg-[#10B981]/15 text-[#10B981]'
                        }`}
                      >
                        {z.mlPrediction.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {isDanger ? (
                        <span className="text-[#FF5A36] font-bold">
                          {z.severityLevel} ({z.severityScore})
                        </span>
                      ) : (
                        <span className="text-neutral-500">-</span>
                      )}
                    </td>

                    {isFlood ? (
                      <>
                        <td className="py-3 px-3 font-mono">{z.weather.precipitation}mm</td>
                        <td className="py-3 px-3 font-mono">{z.weather.humidity}%</td>
                        <td className="py-3 px-3 font-mono">{z.weather.soilMoisture}</td>
                        <td className="py-3 px-3 font-mono">{z.weather.windSpeed}km/h</td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-3 font-mono font-bold text-white">{z.weather.temperature}°C</td>
                        <td className="py-3 px-3 font-mono font-bold text-[#FF5A36]">{z.weather.heatIndex}°C</td>
                        <td className="py-3 px-3 font-mono">{z.weather.humidity}%</td>
                        <td className="py-3 px-3 font-mono">{z.weather.windSpeed}km/h</td>
                      </>
                    )}

                    <td className="py-3 px-4">
                      {z.nearestCamp ? (
                        <div>
                          <div className="font-semibold text-white">{z.nearestCamp.camp.name}</div>
                          <div className="text-[10px] text-neutral-500">{z.nearestCamp.camp.type}</div>
                        </div>
                      ) : (
                        <span className="text-neutral-500 font-mono">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-400">
                      {z.nearestCamp ? (
                        <span>
                          {z.nearestCamp.distanceKm}km &bull; {z.nearestCamp.durationMin}m
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
