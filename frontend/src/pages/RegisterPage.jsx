import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Lock, User, Mail, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !fullName || !password) return;

    try {
      setLoading(true);
      setError('');
      await register({
        username: username.trim(),
        email: email.trim(),
        full_name: fullName.trim(),
        password: password,
      });
      navigate('/');
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.detail || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-4 py-8 relative overflow-hidden">
      {/* Glow Blobs */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-brand-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-brand-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm border border-brand-100 p-5 sm:p-8 space-y-5 sm:space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-xl bg-brand-500 mx-auto flex items-center justify-center shadow-xs">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-brand-700 tracking-wider">Join EChat</h1>
          <p className="text-xs text-brand-700 font-medium">Create your profile and start connecting</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-brand-100 border border-brand-300 text-brand-600 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-brand-700">Full Name</label>
            <div className="relative mt-1">
              <input
                type="text"
                required
                placeholder="e.g. Dhanush Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white border border-brand-200 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-brand-900 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-xs"
              />
              <User className="w-4 h-4 text-brand-600 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-700">Username</label>
            <div className="relative mt-1">
              <input
                type="text"
                required
                placeholder="e.g. dhanush"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="w-full bg-white border border-brand-200 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-brand-900 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-xs"
              />
              <span className="text-xs text-brand-600 absolute left-3.5 top-2.5 font-bold">@</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-700">Email Address</label>
            <div className="relative mt-1">
              <input
                type="email"
                required
                placeholder="dhanush@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-brand-200 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-brand-900 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-xs"
              />
              <Mail className="w-4 h-4 text-brand-600 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-700">Password</label>
            <div className="relative mt-1">
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-brand-200 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-brand-900 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-xs"
              />
              <Lock className="w-4 h-4 text-brand-600 absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-xl bg-brand-500 text-white font-bold text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            <span>Create Account</span>
          </button>
        </form>

        <div className="text-center text-xs text-brand-700">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 font-bold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
