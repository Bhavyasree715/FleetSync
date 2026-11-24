import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Language } from '../../translations';
import {
  Truck,
  Sun,
  Moon,
  Globe,
  LogOut,
  Play,
  Square,
  AlertTriangle,
  Zap,
  Menu,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../services/api';

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSimulating: boolean;
  onSimulationChange: (simulating: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  isSimulating,
  onSimulationChange,
}) => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isSimLoading, setIsSimLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleToggleSimulation = async () => {
    setIsSimLoading(true);
    try {
      if (isSimulating) {
        await api.post('/simulation/stop');
        onSimulationChange(false);
        showNotification('🛑 Simulation stopped.');
      } else {
        await api.post('/simulation/start');
        onSimulationChange(true);
        showNotification('🚀 Fleet simulation active: 8 vehicles moving on Chennai routes.');
      }
    } catch (e) {
      console.error('Simulation toggle failed', e);
    } finally {
      setIsSimLoading(false);
    }
  };

  const handleTriggerOverspeed = async () => {
    try {
      const res = await api.post('/simulation/trigger-overspeed');
      showNotification(`⚡ ${res.data.message || 'Triggered overspeed violation demo!'}`);
    } catch (e) {
      showNotification('Start simulation first to demo overspeed.');
    }
  };

  const handleTriggerSos = async () => {
    try {
      const res = await api.post('/simulation/trigger-sos');
      showNotification(`🚨 ${res.data.message || 'Triggered SOS emergency demo!'}`);
    } catch (e) {
      showNotification('Start simulation first to demo SOS.');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-md shadow-emerald-500/20">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Fleet<span className="text-emerald-500">Sync</span>
              </span>
              <span className="hidden text-xs font-semibold text-emerald-600 dark:text-emerald-400 sm:inline-block sm:ml-2">
                ITA0316 PWA
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls & Simulation Demo Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user?.role === 'manager' && (
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800/60">
              <button
                onClick={handleToggleSimulation}
                disabled={isSimLoading}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  isSimulating
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
                title="Toggle simulated moving vehicles"
              >
                {isSimulating ? (
                  <>
                    <Square className="h-3 w-3 fill-current" />
                    <span className="hidden sm:inline">Simulating</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 fill-current" />
                    <span className="hidden sm:inline">Simulate</span>
                  </>
                )}
              </button>

              {isSimulating && (
                <>
                  <button
                    onClick={handleTriggerOverspeed}
                    className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                    title="Simulate Overspeed Alert"
                  >
                    <Zap className="h-3 w-3" />
                    <span className="hidden md:inline">Overspeed</span>
                  </button>

                  <button
                    onClick={handleTriggerSos}
                    className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-500/20 dark:text-red-400"
                    title="Simulate SOS Panic Alert"
                  >
                    <ShieldAlert className="h-3 w-3" />
                    <span className="hidden md:inline">SOS</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Language Switcher */}
          <div className="relative flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Globe className="mr-1 h-3.5 w-3.5 text-slate-400" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent font-medium outline-none cursor-pointer"
              aria-label="Select language"
            >
              <option value="en" className="dark:bg-slate-800">English</option>
              <option value="ta" className="dark:bg-slate-800">தமிழ்</option>
              <option value="hi" className="dark:bg-slate-800">हिन्दी</option>
            </select>
          </div>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-2 dark:border-slate-800 sm:pl-3">
              <div className="hidden text-right lg:block">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  {user.name}
                </div>
                <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                  {user.role}
                </div>
              </div>
              <button
                onClick={logout}
                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                title={t.nav.logout}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Floating Demo Toast */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-3 text-xs font-medium text-white shadow-xl backdrop-blur">
          <AlertTriangle className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </>
  );
};
