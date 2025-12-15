import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Bell, Volume2, Vibrate, Download, Upload, Trash2, Info } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateSettings } from '../store/uiSlice';
import { db } from '../db';

export function Settings() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { settings } = useAppSelector((state) => state.ui);

  const handleExport = async () => {
    const habits = await db.habits.toArray();
    const entries = await db.entries.toArray();
    const streaks = await db.streaks.toArray();

    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      habits,
      entries,
      streaks,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habitracer-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.version && data.habits && data.entries) {
          // Clear existing data
          await db.habits.clear();
          await db.entries.clear();
          await db.streaks.clear();

          // Import new data
          await db.habits.bulkAdd(data.habits);
          await db.entries.bulkAdd(data.entries);
          if (data.streaks) {
            await db.streaks.bulkAdd(data.streaks);
          }

          alert('Data succesvol geïmporteerd! Pagina wordt herladen...');
          window.location.reload();
        } else {
          alert('Ongeldig backup bestand formaat');
        }
      } catch {
        alert('Importeren mislukt. Controleer het bestandsformaat.');
      }
    };
    input.click();
  };

  const handleClearData = async () => {
    if (confirm('Weet je zeker dat je ALLE data wilt verwijderen? Dit kan niet ongedaan worden!')) {
      if (confirm('Echt zeker? Al je gewoontes en voortgang worden permanent verwijderd.')) {
        await db.habits.clear();
        await db.entries.clear();
        await db.streaks.clear();
        await db.onboarding.clear();
        window.location.reload();
      }
    }
  };

  return (
    <div className="min-h-screen pb-8">
      <div className="grid-overlay" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-vapor-dark/80 backdrop-blur-lg border-b border-white/10 safe-area-top">
        <div className="px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold text-xl text-white">Instellingen</h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-vapor-dark/80 to-vapor-darker/80 rounded-xl border border-white/10 overflow-hidden"
        >
          <div className="p-4 border-b border-white/10">
            <h2 className="font-medium text-white">Voorkeuren</h2>
          </div>

          <div className="divide-y divide-white/5">
            {/* Notifications */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-vapor-pink/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-vapor-pink" />
                </div>
                <div>
                  <div className="text-white font-medium">Meldingen</div>
                  <div className="text-sm text-white/40">Dagelijkse herinneringen</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => dispatch(updateSettings({ notifications: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-vapor-darker rounded-full peer peer-checked:bg-vapor-cyan transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>

            {/* Sound Effects */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-vapor-cyan/20 flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-vapor-cyan" />
                </div>
                <div>
                  <div className="text-white font-medium">Geluidseffecten</div>
                  <div className="text-sm text-white/40">Viering geluiden</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.soundEffects}
                  onChange={(e) => dispatch(updateSettings({ soundEffects: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-vapor-darker rounded-full peer peer-checked:bg-vapor-cyan transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>

            {/* Haptic Feedback */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-vapor-gold/20 flex items-center justify-center">
                  <Vibrate className="w-5 h-5 text-vapor-gold" />
                </div>
                <div>
                  <div className="text-white font-medium">Haptische feedback</div>
                  <div className="text-sm text-white/40">Trillen bij acties</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hapticFeedback}
                  onChange={(e) => dispatch(updateSettings({ hapticFeedback: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-vapor-darker rounded-full peer peer-checked:bg-vapor-cyan transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
          </div>
        </motion.div>

        {/* Data Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-vapor-dark/80 to-vapor-darker/80 rounded-xl border border-white/10 overflow-hidden"
        >
          <div className="p-4 border-b border-white/10">
            <h2 className="font-medium text-white">Gegevens</h2>
          </div>

          <div className="divide-y divide-white/5">
            {/* Export */}
            <button
              onClick={handleExport}
              className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Download className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-left">
                <div className="text-white font-medium">Exporteer data</div>
                <div className="text-sm text-white/40">Download je data als JSON</div>
              </div>
            </button>

            {/* Import */}
            <button
              onClick={handleImport}
              className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-left">
                <div className="text-white font-medium">Importeer data</div>
                <div className="text-sm text-white/40">Herstel vanuit backup</div>
              </div>
            </button>

            {/* Clear Data */}
            <button
              onClick={handleClearData}
              className="w-full p-4 flex items-center gap-3 hover:bg-red-500/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-left">
                <div className="text-red-400 font-medium">Wis alle data</div>
                <div className="text-sm text-white/40">Verwijder alles permanent</div>
              </div>
            </button>
          </div>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-vapor-dark/80 to-vapor-darker/80 rounded-xl border border-white/10 p-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-vapor-purple/20 flex items-center justify-center">
              <Info className="w-5 h-5 text-vapor-purple" />
            </div>
            <div>
              <div className="text-white font-medium">HabitRacer</div>
              <div className="text-sm text-white/40">Versie 1.0.0</div>
            </div>
          </div>
          <p className="text-sm text-white/60">
            Race tegen je verleden om betere gewoontes op te bouwen. Alle data wordt lokaal op je apparaat opgeslagen.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
