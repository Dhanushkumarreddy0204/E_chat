import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';

export function AuthScreen({ title, description, children }) {
  return (
    <main className="auth-layout">
      <aside className="auth-media" aria-label="EChat">
        <img className="auth-photo" src={import.meta.env.BASE_URL + 'echat-table.webp'} alt="" fetchPriority="high" />
        <p className="max-w-sm font-display text-[clamp(36px,5vw,74px)] leading-[.96] tracking-[-.06em]">Good things are worth sharing.</p>
      </aside>
      <section className="auth-main">
        <div className="auth-corner"><ThemeToggle /></div>
        <div className="auth-form">
          <div className="mb-3"><Brand /></div>
          <div className="grid gap-2 pb-3">
            <h1 className="page-title">{title}</h1>
            <p className="text-sm text-text-secondary">{description}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

export function PasswordField({ autoComplete, minLength }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-label">
      <label htmlFor="password">Password</label>
      <div className="relative">
        <input id="password" name="password" required minLength={minLength}
          type={visible ? 'text' : 'password'} autoComplete={autoComplete} className="field !pr-12" />
        <button type="button" className="icon-button absolute right-1 top-1" onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Hide password' : 'Show password'}>
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

export function AuthSubmit({ loading, children }) {
  return (
    <button type="submit" disabled={loading} className="pill-button primary-button mt-1 w-full !min-h-12">
      {loading ? <><LoaderCircle size={17} className="animate-spin" /> Please wait</> : children}
    </button>
  );
}

export function authError(error, fallback) {
  const detail = error.response?.data?.detail;
  return typeof detail === 'string' ? detail : detail?.[0]?.msg || fallback;
}
