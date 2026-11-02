import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Lock, User, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) return;

    try {
      setLoading(true);
      setError('');
      await login(identifier, password);
      navigate('/');
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.detail || 'Invalid username/email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-4 py-8 relative overflow-hidden">
      {/* Background Neon Blobs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-20 right-1/3 w-80 h-80 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm border border-brand-100 p-5 sm:p-8 space-y-6 sm:space-y-7 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-xl bg-brand-500 mx-auto flex items-center justify-center shadow-xs">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-brand-700 tracking-wider">ECHAT</h1>
          <p className="text-xs text-brand-700 font-medium">Real-Time Social & Messaging Platform</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-brand-100 border border-brand-300 text-brand-600 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-brand-700">Username or Email</label>
            <div className="relative mt-1">
              <input
                type="text"
                required
                placeholder="username or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-white border border-brand-200 rounded-xl py-3 pl-10 pr-4 text-xs sm:text-sm text-brand-900 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors shadow-xs"
              />
              <User className="w-4 h-4 text-brand-600 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-700">Password</label>
            <div className="relative mt-1">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-brand-200 rounded-xl py-3 pl-10 pr-4 text-xs sm:text-sm text-brand-900 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors shadow-xs"
              />
              <Lock className="w-4 h-4 text-brand-600 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            <span>Sign In</span>
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center text-xs text-brand-700">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-400 font-bold hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};
