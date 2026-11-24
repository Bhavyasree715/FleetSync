import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  MapPin,
  Bell,
  Send,
  History,
  BarChart3,
  FileText,
  Truck,
  Shield,
  Wrench,
  Settings,
  Smartphone,
} from 'lucide-react';

interface SidebarProps {
  unreadAlertCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  unreadAlertCount = 0,
  isOpen = false,
  onClose,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    { to: '/map', label: t.nav.liveMap, icon: MapPin },
    { to: '/alerts', label: t.nav.alerts, icon: Bell, badge: unreadAlertCount },
    { to: '/dispatch', label: t.nav.dispatch, icon: Send },
    { to: '/history', label: t.nav.history, icon: History },
    { to: '/analytics', label: t.nav.analytics, icon: BarChart3 },
    { to: '/reports', label: t.nav.reports, icon: FileText },
    { to: '/vehicles', label: t.nav.vehicles, icon: Truck },
    { to: '/geofences', label: t.nav.geofences, icon: Shield },
    { to: '/maintenance', label: t.nav.maintenance, icon: Wrench },
    { to: '/settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 dark:border-slate-800 md:hidden">
          <span className="text-base font-bold text-slate-900 dark:text-white">FleetSync Menu</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400">
            ✕
          </button>
        </div>

        {/* Driver quick switch pill */}
        <div className="p-4">
          <NavLink
            to="/driver"
            onClick={onClose}
            className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 p-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-400"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span>{t.nav.driverView}</span>
            </div>
            <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] text-white">Live GPS</span>
          </NavLink>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 dark:bg-emerald-600'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        {/* System Footer info */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>ITA0316 Mobile Computing</span>
            <span className="font-mono">v1.0.0</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>OSM Leaflet Engine Online</span>
          </div>
        </div>
      </aside>
    </>
  );
};
