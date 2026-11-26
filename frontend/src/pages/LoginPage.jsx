import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthScreen, PasswordField, AuthSubmit, authError } from '../components/common/AuthScreen';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setError('');
    setLoading(true);
    try {
      await login(values.get('identifier').trim(), values.get('password'));
      navigate('/');
    } catch (failure) {
      setError(authError(failure, 'Could not sign in. Try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen title="Welcome back" description="Sign in to see your feed and messages.">
      <form className="grid gap-4" onSubmit={submit} aria-busy={loading}>
        <label className="auth-label">Email or username
          <input className="field" name="identifier" autoComplete="username" required />
        </label>
        <PasswordField autoComplete="current-password" />
        {error && <p className="form-error" role="alert">{error}</p>}
        <AuthSubmit loading={loading}>Sign in</AuthSubmit>
      </form>
      <p className="mt-2 text-center text-sm text-text-secondary">
        New to EChat? <Link to="/register" className="font-semibold text-brand-400 hover:underline">Create an account</Link>
      </p>
    </AuthScreen>
  );
}
