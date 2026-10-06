import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PhoneCall, X, ShieldAlert, Check, MapPin, AlertCircle, Compass } from 'lucide-react';
import { ReliefCamp } from '../types/disaster';

interface EmergencyHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  nearestCamp?: ReliefCamp | null;
  onNavigateToMap: () => void;
}

const EMERGENCY_CONTACTS = [
  { label: 'National Emergency', number: '112', desc: 'Police, Fire, Medical Unified Response' },
  { label: 'NDMA Disaster Helpline', number: '1078', desc: 'National Disaster Management Authority' },
  { label: 'State Relief Operations', number: '1070', desc: 'State Emergency Operation Centre (SEOC)' },
  { label: 'Ambulance & Trauma', number: '108', desc: 'Emergency Medical Evacuation' },
];

const INITIAL_CHECKLIST = [
  { id: 'water', text: 'Store 3-4 liters of boiled drinking water per person', checked: false },
  { id: 'docs', text: 'Seal identity cards, land deeds & medical papers in waterproof bags', checked: false },
  { id: 'power', text: 'Keep smartphones and emergency power banks fully charged', checked: false },
  { id: 'meds', text: 'Prepare first-aid essentials and 7 days of prescription medications', checked: false },
  { id: 'torch', text: 'Keep LED flashlight with spare dry cells within reach', checked: false },
  { id: 'mains', text: 'Turn off household gas valve and main electric circuit breaker before leaving', checked: false },
];

export const EmergencyHelpModal: React.FC<EmergencyHelpModalProps> = ({
  isOpen,
  onClose,
  nearestCamp,
  onNavigateToMap,
}) => {
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);

  const toggleCheck = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const completedCount = checklist.filter((i) => i.checked).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-2xl bg-[#121214] text-[#F6F5F2] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#1A1A1E]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF5A36]/15 border border-[#FF5A36]/30 flex items-center justify-center text-[#FF5A36]">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight">Immediate Emergency Response</h2>
                  <p className="text-xs text-neutral-400">One-tap helplines, shelter navigation, and survival checklist</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Nearest Shelter Callout */}
              {nearestCamp ? (
                <div className="p-4 rounded-xl bg-[#FF5A36]/10 border border-[#FF5A36]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#FF5A36] font-bold">
                      Designated Safe Shelter
                    </span>
                    <h3 className="font-display text-base font-bold text-white mt-0.5">{nearestCamp.name}</h3>
                    <p className="text-xs text-neutral-300 mt-0.5">
                      {nearestCamp.type} &bull; Capacity: {nearestCamp.capacity} evacuees
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToMap();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#FF5A36] hover:bg-[#E84D2A] text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 self-start sm:self-center shadow-lg shadow-[#FF5A36]/20"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>View Evacuation Route</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">Interactive Evacuation Routing Active</h4>
                    <p className="text-xs text-neutral-400">Select any hazard zone on the map to see route corridors.</p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToMap();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-medium"
                  >
                    Open Map
                  </button>
                </div>
              )}

              {/* Direct Dial Helplines */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold mb-3">
                  National Disaster Helplines (Toll-Free)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EMERGENCY_CONTACTS.map((contact) => (
                    <a
                      key={contact.number}
                      href={`tel:${contact.number}`}
                      className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-[#FF5A36] transition-colors">
                          {contact.label}
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">{contact.desc}</div>
                      </div>
                      <div className="flex items-center gap-2 pl-3">
                        <span className="font-mono text-base font-bold text-white group-hover:text-[#FF5A36]">
                          {contact.number}
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-[#FF5A36]/20 text-[#FF5A36] flex items-center justify-center">
                          <PhoneCall className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Interactive Evacuation Checklist with animated ticks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                    Evacuation Preparedness Checklist
                  </h4>
                  <span className="text-xs font-mono text-[#FF5A36]">
                    {completedCount} / {checklist.length} Completed
                  </span>
                </div>

                <div className="space-y-2">
                  {checklist.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className={`w-full p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                        item.checked
                          ? 'bg-emerald-950/20 border-emerald-800/40 text-neutral-200'
                          : 'bg-white/5 border-white/5 hover:border-white/10 text-neutral-300'
                      }`}
                    >
                      <motion.div
                        initial={false}
                        animate={{
                          scale: item.checked ? [1, 1.2, 1] : 1,
                          backgroundColor: item.checked ? '#10B981' : 'transparent',
                        }}
                        transition={{ duration: 0.2 }}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                          item.checked ? 'border-emerald-500 text-black' : 'border-neutral-500'
                        }`}
                      >
                        {item.checked && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          >
                            <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                          </motion.div>
                        )}
                      </motion.div>
                      <span className={`text-xs ${item.checked ? 'line-through opacity-70' : ''}`}>
                        {item.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-[#1A1A1E] flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-[#FF5A36]" />
                In immediate mortal danger, call 112 directly.
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
