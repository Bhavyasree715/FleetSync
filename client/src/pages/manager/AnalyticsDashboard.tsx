import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  Award,
  Zap,
  TrendingUp,
  Clock,
  Shield,
  Truck,
  Flame,
} from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [hotspots, setHotspots] = useState<any>(null);
  const [showHotspots, setShowHotspots] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [dashRes, hotRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/hotspots'),
      ]);
      setData(dashRes.data);
      setHotspots(hotRes.data);
    } catch (e) {
      console.error('Failed to load analytics', e);
    }
  };

  const stats = data?.stats || {};
  const leaderboard = data?.leaderboard || [];
  const dailyDistance = data?.dailyDistance || [];
  const fleetStatusData = data?.fleetStatusData || [];

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-500" />
            Fleet Analytics & Driver Safety Scorecard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Performance metrics, idle time analysis, daily travel distance, and driver safety leaderboards
          </p>
        </div>

        <button
          onClick={() => setShowHotspots(!showHotspots)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
            showHotspots
              ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200'
          }`}
        >
          <Flame className="h-4 w-4" />
          <span>{showHotspots ? 'Hide Overspeed Hotspots' : 'View Safety Hotspots'}</span>
        </button>
      </div>

      {/* Top KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Fleet Distance</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.totalDistance || 2450} <span className="text-xs font-normal text-slate-400">km</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-semibold">+12% vs last week</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Trips Completed</span>
            <Truck className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.completedTrips || 114}
          </div>
          <div className="mt-1 text-[11px] text-blue-600 font-semibold">{stats.activeTrips || 1} currently in transit</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Fleet Idle Time</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.idlePercentage || 14}%
          </div>
          <div className="mt-1 text-[11px] text-amber-600 font-semibold">Target: &lt; 20% idle ratio</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Overspeed Violations</span>
            <Zap className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-600">
            {stats.overspeedCount || 1}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Last 24 hours window</div>
        </div>
      </div>

      {/* Hotspots Panel if toggled */}
      {showHotspots && hotspots && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 dark:bg-red-950/20">
          <h3 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Flame className="h-4 w-4" /> Detected Overspeed Hotspots & Congestion Points
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <span className="font-bold text-slate-800 dark:text-white block">GST Road Highway Stretch</span>
              <span className="text-[11px] text-red-500">68-95 km/h recorded violations</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <span className="font-bold text-slate-800 dark:text-white block">OMR Toll Plaza Entry</span>
              <span className="text-[11px] text-amber-500">Average 18 mins idle delay</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <span className="font-bold text-slate-800 dark:text-white block">Koyambedu Market Circle</span>
              <span className="text-[11px] text-amber-500">High stop density zone</span>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Distance Bar Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
            Daily Fleet Distance Traveled (km)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyDistance}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="distanceKm" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fleet Status Pie Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
            Real-time Vehicle Status
          </h3>
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fleetStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {fleetStatusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3 dark:border-slate-800">
            {fleetStatusData.map((item: any) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 dark:text-slate-300">
                  {item.name}: <span className="font-bold">{item.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Driver Safety Score Leaderboard */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-500" />
              Driver Safety Score Leaderboard (0–100)
            </h3>
            <p className="text-xs text-slate-500">
              Evaluated on speed compliance, harsh braking, idle ratio, and on-time completion
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                <th className="pb-2">Rank</th>
                <th className="pb-2">Driver Name</th>
                <th className="pb-2">Vehicle Assigned</th>
                <th className="pb-2">Completed Trips</th>
                <th className="pb-2">Total Distance</th>
                <th className="pb-2 text-right">Safety Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {leaderboard.map((d: any) => {
                const isTop3 = d.rank <= 3;
                return (
                  <tr key={d.driverId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 font-bold">
                      {d.rank === 1 ? '🥇 #1' : d.rank === 2 ? '🥈 #2' : d.rank === 3 ? '🥉 #3' : `#${d.rank}`}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-800 dark:text-white">
                      {d.name}
                    </td>
                    <td className="py-2.5 font-mono text-slate-600 dark:text-slate-300">
                      {d.plate}
                    </td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">{d.totalTrips}</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">{d.totalDistanceKm} km</td>
                    <td className="py-2.5 text-right font-black">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${
                          d.safetyScore >= 90
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : d.safetyScore >= 80
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {d.safetyScore} / 100
                      </span>
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
