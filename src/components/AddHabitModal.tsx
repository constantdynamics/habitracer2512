import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { PRESET_HABITS, PresetHabit, HabitType, MetricType, FrequencyType, DayOfWeek } from '../types';

interface AddHabitModalProps {
  onAddPreset: (preset: PresetHabit) => void;
  onAddCustom: (habit: PresetHabit) => void;
  onClose: () => void;
}

type ModalView = 'presets' | 'custom';

const EMOJI_OPTIONS = ['💪', '🧘', '📚', '💧', '🏃', '✍️', '🎯', '🌟', '🔥', '💡', '🎨', '🎵', '💤', '🥗', '🧠', '⏰'];
const METRIC_TYPES: { value: MetricType; label: string; unit: string }[] = [
  { value: 'count', label: 'Count', unit: 'times' },
  { value: 'duration', label: 'Duration', unit: 'minutes' },
  { value: 'distance', label: 'Distance', unit: 'km' },
  { value: 'weight', label: 'Weight', unit: 'kg' },
  { value: 'percentage', label: 'Percentage', unit: '%' },
  { value: 'custom', label: 'Custom', unit: '' },
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
              {view === 'presets' ? 'Add Habit' : 'Custom Habit'}
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
              Popular Habits
            </button>
            <button
              onClick={() => setView('custom')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                view === 'custom'
                  ? 'text-vapor-cyan border-b-2 border-vapor-cyan'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Create Custom
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
                        {preset.type === 'boolean' ? 'Yes/No' : `${preset.goalValue} ${preset.unit}`}
                        {' • '}
                        {preset.frequency === 'daily' ? 'Daily' : 'Custom'}
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
                  <label className="text-sm text-white/60 mb-2 block">Habit Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Morning run"
                    className="w-full p-3 bg-vapor-darker/50 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-vapor-cyan/50"
                  />
                </div>

                {/* Emoji */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Icon</label>
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
                      Yes / No
                    </button>
                    <button
                      onClick={() => setHabitType('quantifiable')}
                      className={`flex-1 py-3 rounded-lg transition-all ${
                        habitType === 'quantifiable'
                          ? 'bg-vapor-cyan/30 ring-2 ring-vapor-cyan text-white'
                          : 'bg-vapor-darker/50 text-white/60 hover:text-white'
                      }`}
                    >
                      Measurable
                    </button>
                  </div>
                </div>

                {/* Quantifiable options */}
                {habitType === 'quantifiable' && (
                  <>
                    <div>
                      <label className="text-sm text-white/60 mb-2 block">Metric Type</label>
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

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-sm text-white/60 mb-2 block">Goal</label>
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
                          <label className="text-sm text-white/60 mb-2 block">Unit</label>
                          <input
                            type="text"
                            value={customUnit}
                            onChange={(e) => setCustomUnit(e.target.value)}
                            placeholder="e.g., pages"
                            className="w-full p-3 bg-vapor-darker/50 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-vapor-cyan/50"
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Frequency */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Frequency</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFrequency('daily')}
                      className={`flex-1 py-3 rounded-lg transition-all ${
                        frequency === 'daily'
                          ? 'bg-vapor-cyan/30 ring-2 ring-vapor-cyan text-white'
                          : 'bg-vapor-darker/50 text-white/60 hover:text-white'
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setFrequency('specific_days')}
                      className={`flex-1 py-3 rounded-lg transition-all ${
                        frequency === 'specific_days'
                          ? 'bg-vapor-cyan/30 ring-2 ring-vapor-cyan text-white'
                          : 'bg-vapor-darker/50 text-white/60 hover:text-white'
                      }`}
                    >
                      Specific Days
                    </button>
                  </div>
                </div>

                {/* Day selector */}
                {frequency === 'specific_days' && (
                  <div className="flex gap-2 justify-center">
                    {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as DayOfWeek[]).map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`w-10 h-10 rounded-lg text-xs font-medium transition-all ${
                          specificDays.includes(day)
                            ? 'bg-vapor-cyan/30 ring-2 ring-vapor-cyan text-white'
                            : 'bg-vapor-darker/50 text-white/60 hover:text-white'
                        }`}
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1, 2)}
                      </button>
                    ))}
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
                Create Habit
              </motion.button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
