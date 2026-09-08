import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, MailCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import type { NormalizedApiError } from '@/services/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * The admin console's own sign-in. Separate from the shopper flow, which
 * redirects to the WorldStreet identity hub — admins authenticate against this
 * API with a password and get a session cookie back.
 */
export default function AdminLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useAdminAuthStore((s) => s.login);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupNotice, setSetupNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    setSetupNotice(null);
    try {
      await login(data.email, data.password);
      const returnUrl = searchParams.get('returnUrl');
      navigate(returnUrl || '/admin', { replace: true });
    } catch (err) {
      const apiError = err as NormalizedApiError;
      // Not a failure from the admin's point of view — the server just mailed
      // them a link to set the password they do not have yet.
      if (apiError.passwordSetupRequired) {
        setSetupNotice(apiError.message);
      } else {
        setError(apiError.message || 'Could not sign in');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (setupNotice) {
    return (
      <div style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 'var(--ws-space-3)' }}>
        <span className="ws-empty__icon">
          <MailCheck size={26} aria-hidden />
        </span>
        <h1 className="ws-h2">Check your email</h1>
        <p className="ws-body ws-muted">{setupNotice}</p>
        <button
          type="button"
          className="ws-btn ws-btn--sm ws-btn--primary"
          onClick={() => setSetupNotice(null)}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="ws-stack--lg">
      <div>
        <h1 className="ws-h2">Admin sign in</h1>
        <p className="ws-body ws-muted">Sign in with your admin email and password.</p>
      </div>

      {error && (
        <div className="ws-alert" role="alert">
          <AlertCircle size={16} aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="ws-stack--lg">
        <div className="ws-formfield">
          <label htmlFor="email" className="ws-formfield__label">Email Address</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="Enter your email"
            className={`ws-field ${errors.email ? 'ws-field--invalid' : ''}`}
            {...register('email')}
          />
          {errors.email && <span className="ws-formfield__error">{errors.email.message}</span>}
        </div>

        <div className="ws-formfield">
          <label htmlFor="password" className="ws-formfield__label">Password</label>
          {/* The reveal toggle is a real button inside the group, so it needs
              pointer events that .ws-inputgroup__icon deliberately removes. */}
          <div className="ws-inputgroup">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              className={`ws-field ${errors.password ? 'ws-field--invalid' : ''}`}
              style={{ paddingRight: 42 }}
              {...register('password')}
            />
            <button
              type="button"
              className="ws-inputgroup__icon ws-inputgroup__icon--right"
              style={{ pointerEvents: 'auto', background: 'none', border: 0, cursor: 'pointer' }}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <span className="ws-formfield__error">{errors.password.message}</span>}
        </div>

        <button type="submit" className="ws-btn ws-btn--primary ws-btn--block" disabled={isLoading}>
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="ws-caption ws-muted" style={{ textAlign: 'center' }}>
        First time here, or forgot your password?{' '}
        <Link to="/auth/forgot-password" style={{ color: 'var(--ws-brand-gold-text)' }}>
          Get a link
        </Link>
      </p>
    </div>
  );
}
