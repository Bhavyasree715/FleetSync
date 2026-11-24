import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { Truck, Shield, Smartphone, Key, Mail, Lock, User, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState<'manager' | 'driver'>('manager');
  const [email, setEmail] = useState('manager@demo.com');
  const [password, setPassword] = useState('manager123');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.post('/auth/register', {
          email,
          password,
          name,
          role,
          phone,
          licenseNumber: role === 'driver' ? licenseNumber : undefined,
        });
        login(res.data.token, res.data.user);
        navigate(res.data.user.role === 'driver' ? '/driver' : '/map');
      } else {
        const res = await api.post('/auth/login', { email, password });
        login(res.data.token, res.data.user);
        navigate(res.data.user.role === 'driver' ? '/driver' : '/map');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (demoEmail: string, demoPass: string, demoRole: 'manager' | 'driver') => {
    setIsRegister(false);
    setEmail(demoEmail);
    setPassword(demoPass);
    setRole(demoRole);
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-8 relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/25">
            <Truck className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Fleet<span className="text-emerald-400">Sync</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Mobile Fleet Tracking & Intelligent Coordination System
          </p>
          <span className="inline-block mt-1 rounded bg-slate-800 px-2.5 py-0.5 text-[11px] font-mono text-emerald-400 border border-slate-700">
            ITA0316 Mobile Computing Project
          </span>
        </div>

        {/* Quick Demo Accounts Pill Bar */}
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-800/80 p-3 backdrop-blur">
          <div className="text-[11px] font-semibold text-slate-300 mb-2 flex items-center justify-between">
            <span>⚡ Instant Demo Profiles:</span>
            <span className="text-[10px] text-emerald-400 font-normal">Click to fill</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setDemoAccount('manager@demo.com', 'manager123', 'manager')}
              className={`rounded-lg p-2 text-left transition border ${
                email === 'manager@demo.com'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-semibold'
                  : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-700/60'
              }`}
            >
              <div className="font-bold flex items-center gap-1">
                <Shield className="h-3 w-3 text-emerald-400" /> Manager Console
              </div>
              <div className="text-[10px] text-slate-400">Priya Raman</div>
            </button>

            <button
              type="button"
              onClick={() => setDemoAccount('driver1@demo.com', 'driver123', 'driver')}
              className={`rounded-lg p-2 text-left transition border ${
                email === 'driver1@demo.com'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-semibold'
                  : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-700/60'
              }`}
            >
              <div className="font-bold flex items-center gap-1">
                <Smartphone className="h-3 w-3 text-teal-400" /> Driver 1 (Truck)
              </div>
              <div className="text-[10px] text-slate-400">Karthik S. (TN-01)</div>
            </button>
          </div>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-800/90 p-6 shadow-xl backdrop-blur">
          {/* Login / Register Tab selector */}
          <div className="mb-5 flex rounded-xl bg-slate-900 p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                !isRegister ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                isRegister ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Register New User
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selector for registration */}
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('driver')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                      role === 'driver'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                        : 'border-slate-700 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <Smartphone className="h-4 w-4" /> Driver
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('manager')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                      role === 'manager'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                        : 'border-slate-700 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <Shield className="h-4 w-4" /> Manager
                  </button>
                </div>
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {isRegister && role === 'driver' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Driving License No.</label>
                <input
                  type="text"
                  required
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="DL-TN-01-2022-12345"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:from-emerald-500 hover:to-teal-400 focus:outline-none disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In to Console'}
            </button>
          </form>
        </div>

        {/* Public customer tracking helper link */}
        <div className="mt-4 text-center">
          <a
            href="/track/FS-TRIP-1001"
            className="text-xs text-emerald-400 hover:underline"
          >
            Looking for customer shipment tracking? Click here &rarr;
          </a>
        </div>
      </div>
    </div>
  );
};
