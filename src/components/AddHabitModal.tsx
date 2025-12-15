import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, MapPin, Smartphone, Footprints } from 'lucide-react';
import { PRESET_HABITS, PresetHabit, HabitType, MetricType, FrequencyType, DayOfWeek, AutoTrackType } from '../types';

interface AddHabitModalProps {
  onAddPreset: (preset: PresetHabit) => void;
  onAddCustom: (habit: PresetHabit) => void;
  onClose: () => void;
}

type ModalView = 'presets' | 'custom';

const EMOJI_OPTIONS = ['💪', '🧘', '📚', '💧', '🏃', '✍️', '🎯', '🌟', '🔥', '💡', '🎨', '🎵', '💤', '🥗', '🧠', '⏰', '🦷', '🏋️', '📵'];
const METRIC_TYPES: { value: MetricType; label: string; unit: string }[] = [
  { value: 'count', label: 'Aantal', unit: 'keer' },
  { value: 'duration', label: 'Duur', unit: 'minuten' },
  { value: 'distance', label: 'Afstand', unit: 'km' },
  { value: 'weight', label: 'Gewicht', unit: 'kg' },
  { value: 'percentage', label: 'Percentage', unit: '%' },
  { value: 'custom', label: 'Aangepast', unit: '' },
];

const AUTO_TRACK_OPTIONS: { value: AutoTrackType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'manual', label: 'Handmatig', icon: '✋', description: 'Zelf invullen' },
  { value: 'gps', label: 'GPS', icon: <MapPin className="w-4 h-4" />, description: 'Afstand via locatie' },
  { value: 'screentime', label: 'Schermtijd', icon: <Smartphone className="w-4 h-4" />, description: 'Telefoongebruik' },
  { value: 'steps', label: 'Stappen', icon: <Footprints className="w-4 h-4" />, description: 'Via bewegingssensor' },
];

export function AddHabitModal({ onAddPreset, onAddCustom, onClose }: AddHabitModalProps) {
  const [view, setView] = useState<ModalView>('presets');

  // Custom habit form state
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [habitType, setHabitType] = useState<HabitType>('boolean');
  const [metricType, setMetricType] = useState<MetricType>('count');
  const [goalValue, setGoalValue] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState('');
  const [frequency, setFrequency] = useState<FrequencyType>('daily');
  const [specificDays, setSpecificDays] = useState<DayOfWeek[]>([]);
  const [autoTrack, setAutoTrack] = useState<AutoTrackType>('manual');

  const handleAddCustom = () => {
    if (!name.trim()) return;

    const selectedMetric = METRIC_TYPES.find(m => m.value === metricType);

    const habit: PresetHabit = {
      name: name.trim(),
      emoji,
      type: habitType,
      direction: 'maximize',
      frequency,
      ...(habitType === 'quantifiable' && {
        metricType,
        goalValue,
        unit: metricType === 'custom' ? customUnit : selectedMetric?.unit,
      }),
      ...(frequency === 'specific_days' && { specificDays }),
    };

    onAddCustom(habit);
  };

  const toggleDay = (day: DayOfWeek) => {
    setSpecificDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md max-h-[90vh] bg-gradient-to-br from-vapor-dark to-vapor-darker rounded-2xl border border-white/10 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
            <h2 className="font-display font-bold text-xl text-white">
              {view === 'presets' ? 'Gewoonte toevoegen' : 'Eigen gewoonte'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-white/10 flex-shrink-0">
            <button
              onClick={() => setView('presets')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                view === 'presets'
                  ? 'text-vapor-cyan border-b-2 border-vapor-cyan'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Populaire gewoontes
            </button>
            <button
              onClick={() => setView('custom')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                view === 'custom'
                  ? 'text-vapor-cyan border-b-2 border-vapor-cyan'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Zelf maken
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto flex-1">
            {view === 'presets' ? (
              <div className="space-y-2">
                {PRESET_HABITS.map((preset, index) => (
                  <motion.button
                    key={preset.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onAddPreset(preset)}
                    className="w-full p-3 bg-vapor-darker/50 rounded-xl flex items-center gap-3 hover:bg-vapor-darker transition-colors group"
                  >
                    <span className="text-2xl">{preset.emoji}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-white">{preset.name}</div>
                      <div className="text-xs text-white/40">
                        {preset.type === 'boolean' ? 'Ja/Nee' : `${preset.goalValue} ${preset.unit}`}
                        {' • '}
                        {preset.frequency === 'daily' ? 'Dagelijks' : 'Aangepast'}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-vapor-cyan transition-colors" />
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Naam</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="bijv. Ochtend hardlopen"
                    className="w-full p-3 bg-vapor-darker/50 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-vapor-cyan/50"
                  />
                </div>

                {/* Emoji */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Icoon</label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((e) => (
                      <button
                        key={e}
                        onClick={() => setEmoji(e)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                          emoji === e
                            ? 'bg-vapor-cyan/30 ring-2 ring-vapor-cyan'
                            : 'bg-vapor-darker/50 hover:bg-vapor-darker'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Habit Type */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHabitType('boolean')}
                      className={`flex-1 py-3 rounded-lg transition-all ${
                        habitType === 'boolean'
                          ? 'bg-vapor-cyan/30 ring-2 ring-vapor-cyan text-white'
                          : 'bg-vapor-darker/50 text-white/60 hover:text-white'
                      }`}
                    >
                      Ja / Nee
                    </button>
                    <button
                      onClick={() => setHabitType('quantifiable')}
                      className={`flex-1 py-3 rounded-lg transition-all ${
                        habitType === 'quantifiable'
                          ? 'bg-vapor-cyan/30 ring-2 ring-vapor-cyan text-white'
                          : 'bg-vapor-darker/50 text-white/60 hover:text-white'
                      }`}
                    >
                      Meetbaar
                    </button>
                  </div>
                </div>

                {/* Quantifiable options */}
                {habitType === 'quantifiable' && (
                  <>
                    <div>
                      <label className="text-sm text-white/60 mb-2 block">Metriek type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {METRIC_TYPES.map((m) => (
                          <button
                            key={m.value}
                            onClick={() => setMetricType(m.value)}
                            className={`py-2 rounded-lg text-sm transition-all ${
                              metricType === m.value
                                ? 'bg-vapor-cyan/30 ring-2 ring-vapor-cyan text-white'
                                : 'bg-vapor-darker/50 text-white/60 hover:text-white'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Auto tracking */}
                    <div>
                      <label className="text-sm text-white/60 mb-2 block">Automatisch meten</label>
                      <div className="grid grid-cols-2 gap-2">
                        {AUTO_TRACK_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setAutoTrack(opt.value)}
                            className={`p-3 rounded-lg text-sm transition-all flex flex-col items-center gap-1 ${
                              autoTrack === opt.value
                                ? 'bg-vapor-cyan/30 ring-2 ring-vapor-cyan text-white'
                                : 'bg-vapor-darker/50 text-white/60 hover:text-white'
                            }`}
                          >
                            <span className="text-lg">{typeof opt.icon === 'string' ? opt.icon : opt.icon}</span>
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-[10px] text-white/40">{opt.description}</span>
                          </button>
                        ))}
                      </div>
                      {autoTrack !== 'manual' && (
                        <p className="text-xs text-vapor-cyan/70 mt-2">
                          {autoTrack === 'gps' && '📍 GPS tracking werkt alleen met toestemming en verbruikt batterij'}
                          {autoTrack === 'screentime' && '📱 Schermtijd data wordt opgehaald uit je apparaat'}
                          {autoTrack === 'steps' && '👟 Stappen worden gemeten via de bewegingssensor'}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-sm text-white/60 mb-2 block">Doel</label>
                        <input
                          type="number"
                          value={goalValue}
                          onChange={(e) => setGoalValue(parseInt(e.target.value) || 1)}
                          min={1}
                          className="w-full p-3 bg-vapor-darker/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vapor-cyan/50"
                        />
                      </div>
                      {metricType === 'custom' && (
                        <div className="flex-1">
                          <label className="text-sm text-white/60 mb-2 block">Eenheid</label>
                          <input
                            type="text"
                            value={customUnit}
                            onChange={(e) => setCustomUnit(e.target.value)}
                            placeholder="bijv. pagina's"
                            className="w-full p-3 bg-vapor-darker/50 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-vapor-cyan/50"
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Frequency */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Frequentie</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFrequency('daily')}
                      className={`flex-1 py-3 rounded-lg transition-all ${
                        frequency === 'daily'
                          ? 'bg-vapor-cyan/30 ring-2 ring-vapor-cyan text-white'
                          : 'bg-vapor-darker/50 text-white/60 hover:text-white'
                      }`}
                    >
                      Dagelijks
                    </button>
                    <button
                      onClick={() => setFrequency('specific_days')}
                      className={`flex-1 py-3 rounded-lg transition-all ${
                        frequency === 'specific_days'
                          ? 'bg-vapor-cyan/30 ring-2 ring-vapor-cyan text-white'
                          : 'bg-vapor-darker/50 text-white/60 hover:text-white'
                      }`}
                    >
                      Specifieke dagen
                    </button>
                  </div>
                </div>

                {/* Day selector */}
                {frequency === 'specific_days' && (
                  <div className="flex gap-2 justify-center">
                    {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as DayOfWeek[]).map((day) => {
                      const dayLabels: Record<DayOfWeek, string> = {
                        mon: 'Ma', tue: 'Di', wed: 'Wo', thu: 'Do', fri: 'Vr', sat: 'Za', sun: 'Zo'
                      };
                      return (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`w-10 h-10 rounded-lg text-xs font-medium transition-all ${
                            specificDays.includes(day)
                              ? 'bg-vapor-cyan/30 ring-2 ring-vapor-cyan text-white'
                              : 'bg-vapor-darker/50 text-white/60 hover:text-white'
                          }`}
                        >
                          {dayLabels[day]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer for custom */}
          {view === 'custom' && (
            <div className="p-4 border-t border-white/10 flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddCustom}
                disabled={!name.trim()}
                className="w-full py-3 bg-gradient-to-r from-vapor-pink to-vapor-cyan text-white font-semibold rounded-xl glow-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Gewoonte aanmaken
              </motion.button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
