import React, { useState } from 'react';
import { DisasterType, SMSAlertLog, SupportedLanguage, MonitoredZone } from '../types/disaster';
import { LANGUAGES } from '../data/defaultData';
import { TRANSLATIONS } from '../services/translationService';
import { dispatchSMSAlert, playEmergencyAlertSound } from '../services/smsService';
import { Send, Smartphone, Volume2, ShieldAlert, CheckCheck, Clock, Settings, Bell, Radio } from 'lucide-react';

interface AlertCenterProps {
  zones: MonitoredZone[];
  disasterType: DisasterType;
  regionName: string;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  alertLogs: SMSAlertLog[];
  onAddAlertLog: (log: SMSAlertLog) => void;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({
  zones,
  disasterType,
  regionName,
  language,
  onLanguageChange,
  alertLogs,
  onAddAlertLog,
}) => {
  const [recipientNumber, setRecipientNumber] = useState('+919876543210');
  const [isSending, setIsSending] = useState(false);
  const [showTwilioConfig, setShowTwilioConfig] = useState(false);
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [fromNumber, setFromNumber] = useState('+1234567890');

  const dangerZones = zones
    .filter((z) => z.mlPrediction === 'Danger' || z.mlPrediction === 'Heatwave')
    .map((z) => `${z.name} (${z.severityLevel})`);

  const trans = TRANSLATIONS[language] || TRANSLATIONS.en;
  const isFlood = disasterType === 'flood';

  const previewMessage = `${isFlood ? '🚨 FLOOD EMERGENCY ALERT' : '🔥 HEATWAVE CRISIS WARNING'}
${trans.smsAlertTitle}

Region: ${regionName}
Active Hazard Zones: ${dangerZones.length > 0 ? dangerZones.slice(0, 3).join(', ') : 'None active'}

Advisory:
${isFlood ? trans.evacuateToShelter : trans.heatwaveWarning}

${trans.smsCallToAction}
${window.location.origin}

[Disaster Response Team - Defenders of Disasters]`;

  const handleSendSMS = async () => {
    setIsSending(true);
    try {
      const log = await dispatchSMSAlert({
        disasterType,
        regionName,
        dangerZones: dangerZones.length > 0 ? dangerZones : ['Nominal / Test Zone'],
        recipientNumber,
        language,
        mapUrl: window.location.origin,
        accountSid: accountSid || undefined,
        authToken: authToken || undefined,
        fromNumber: fromNumber || undefined,
      });

      onAddAlertLog(log);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-white/10 dark:border-white/10 bg-[#121214] p-6 text-[#F6F5F2]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#FF5A36]/15 border border-[#FF5A36]/30 flex items-center justify-center text-[#FF5A36]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight">Emergency Alert Broadcast Console</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Simulated &amp; Twilio REST transmission across 13 Indian regional languages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => playEmergencyAlertSound()}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono text-neutral-300 transition"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#FF5A36]" />
              <span>SIREN TEST</span>
            </button>
            <button
              onClick={() => setShowTwilioConfig(!showTwilioConfig)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono text-neutral-300 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{showTwilioConfig ? 'HIDE KEYS' : 'TWILIO KEYS'}</span>
            </button>
          </div>
        </div>

        {/* Optional Twilio Configuration Drawer */}
        {showTwilioConfig && (
          <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <label className="block text-neutral-400 mb-1">TWILIO ACCOUNT SID</label>
              <input
                type="text"
                placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={accountSid}
                onChange={(e) => setAccountSid(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-neutral-600 focus:outline-hidden focus:border-[#FF5A36]"
              />
            </div>
            <div>
              <label className="block text-neutral-400 mb-1">TWILIO AUTH TOKEN</label>
              <input
                type="password"
                placeholder="Auth Token"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-neutral-600 focus:outline-hidden focus:border-[#FF5A36]"
              />
            </div>
            <div>
              <label className="block text-neutral-400 mb-1">SENDER PHONE NUMBER</label>
              <input
                type="text"
                placeholder="+1234567890"
                value={fromNumber}
                onChange={(e) => setFromNumber(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-neutral-600 focus:outline-hidden focus:border-[#FF5A36]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Broadcast Controls & Mobile Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Broadcast Controls */}
        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#121214] p-6 text-[#F6F5F2] space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="font-display font-bold text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#FF5A36]" />
              Broadcast Emergency Advisory
            </h3>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#FF5A36]/15 text-[#FF5A36] border border-[#FF5A36]/30">
              {dangerZones.length} Zones Impacted
            </span>
          </div>

          {/* Language Selector */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-neutral-400 mb-2">
              Select Advisory Language (13 Regional Languages)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => onLanguageChange(lang.code)}
                  className={`p-2 rounded-xl text-left transition border ${
                    language === lang.code
                      ? 'bg-[#FF5A36] text-white border-[#FF5A36]'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-neutral-300'
                  }`}
                >
                  <div className="text-[10px] opacity-75">{lang.name}</div>
                  <div className="font-bold text-xs">{lang.nativeName}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Number */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-neutral-400 mb-1.5">
              Target Phone Number (E.164 Format)
            </label>
            <input
              type="text"
              value={recipientNumber}
              onChange={(e) => setRecipientNumber(e.target.value)}
              placeholder="+919876543210"
              className="w-full font-mono text-sm bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-hidden focus:border-[#FF5A36]"
            />
          </div>

          {/* Target Zones Summary */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-xs">
            <div className="font-mono text-[11px] uppercase text-neutral-400 mb-1.5">Active Hazard Clusters:</div>
            {dangerZones.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {dangerZones.map((z, idx) => (
                  <span key={idx} className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#FF5A36]/15 text-[#FF5A36] border border-[#FF5A36]/20">
                    {z}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 italic">No hazard zones active. Test simulation message will be dispatched.</p>
            )}
          </div>

          {/* Dispatch Button */}
          <button
            onClick={handleSendSMS}
            disabled={isSending}
            className="w-full py-3.5 px-4 bg-[#FF5A36] hover:bg-[#E84D2A] text-white font-bold rounded-xl shadow-lg shadow-[#FF5A36]/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>
              {isSending ? 'Broadcasting Emergency Message...' : `Dispatch ${isFlood ? 'Flood' : 'Heatwave'} Warning SMS`}
            </span>
          </button>
        </div>

        {/* Right Preview: Sleek Control Room Terminal Mockup */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[320px] bg-[#0A0A0B] rounded-[36px] p-3 shadow-2xl border border-white/10">
            {/* Phone Speaker & Notch */}
            <div className="flex justify-center items-center gap-2 mb-2">
              <div className="w-12 h-1 bg-neutral-800 rounded-full" />
              <div className="w-2.5 h-2.5 bg-neutral-900 rounded-full border border-neutral-800" />
            </div>

            {/* Screen */}
            <div className="bg-[#121214] rounded-[26px] p-3.5 min-h-[460px] flex flex-col justify-between border border-white/5">
              <div>
                <div className="text-center pb-2 border-b border-white/5 text-[10px] text-neutral-500 font-mono">
                  <span className="font-bold text-white block text-xs">GOVT-EMERGENCY</span>
                  DEFENDERS OF DISASTERS
                </div>

                <div className="text-center text-[10px] text-neutral-600 font-mono my-2.5">
                  Live Alert &bull; {new Date().toLocaleTimeString()}
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-xs p-3 text-neutral-200 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                  {previewMessage}
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                <span>SIM 1 &bull; 5G READY</span>
                <span className="text-[#10B981] font-bold">EMERGENCY PRIORITY</span>
              </div>
            </div>
            <div className="w-24 h-1 bg-neutral-800 rounded-full mx-auto mt-2.5" />
          </div>
        </div>
      </div>

      {/* Broadcast Transmission History */}
      <div className="rounded-2xl border border-white/10 bg-[#121214] p-6 text-[#F6F5F2]">
        <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-neutral-400" />
          Dispatch Audit Log ({alertLogs.length})
        </h3>

        {alertLogs.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 font-mono text-xs">
            No emergency alerts dispatched yet in this operational session.
          </div>
        ) : (
          <div className="space-y-2.5 font-mono text-xs">
            {alertLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[#FF5A36] uppercase">{log.disasterType}</span>
                    <span className="text-white font-bold">{log.region}</span>
                    <span className="text-neutral-500">&bull; {log.timestamp}</span>
                  </div>
                  <div className="text-neutral-400 text-[11px]">
                    To: {log.recipient} &bull; {log.dangerZonesCount} risk zones included
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px] font-bold">
                    {log.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
