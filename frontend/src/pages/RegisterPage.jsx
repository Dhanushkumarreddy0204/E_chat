import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthScreen, PasswordField, AuthSubmit, authError } from '../components/common/AuthScreen';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setError('');
    setLoading(true);
    try {
      await register({
        full_name: values.get('full_name').trim(),
        username: values.get('username').trim(),
        email: values.get('email').trim(),
        password: values.get('password'),
      });
      navigate('/');
    } catch (failure) {
      setError(authError(failure, 'Could not create your account. Try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen title="Create your account" description="Join EChat to share posts, stories, and clips.">
      <form className="grid gap-3" onSubmit={submit} aria-busy={loading}>
        <label className="auth-label">Full name
          <input className="field" name="full_name" autoComplete="name" required />
        </label>
        <label className="auth-label">Username
          <input className="field" name="username" autoComplete="username" minLength={3} maxLength={30} required />
        </label>
        <label className="auth-label">Email
          <input className="field" name="email" type="email" autoComplete="email" required />
        </label>
        <PasswordField autoComplete="new-password" minLength={6} />
        <p className="-mt-1 text-xs text-text-secondary">Use at least six characters.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <AuthSubmit loading={loading}>Create account</AuthSubmit>
      </form>
      <p className="mt-1 text-center text-sm text-text-secondary">
        Already have an account? <Link to="/login" className="font-semibold text-brand-400 hover:underline">Sign in</Link>
      </p>
    </AuthScreen>
  );
}
