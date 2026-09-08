import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/userService';

const setupPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SetupPasswordFormData = z.infer<typeof setupPasswordSchema>;

/**
 * Where an emailed admin setup link lands. Same shape as the reset page, but a
 * different endpoint and different copy: this is a first password, not a
 * replacement, so nothing is being overwritten.
 */
export default function SetupPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupPasswordFormData>({
    resolver: zodResolver(setupPasswordSchema),
  });

  if (!token) {
    return (
      <div style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 'var(--ws-space-3)' }}>
        <span className="ws-empty__icon" style={{ color: 'var(--ws-status-danger)' }}>
          <AlertCircle size={26} aria-hidden />
        </span>
        <h1 className="ws-h2">Invalid link</h1>
        <p className="ws-body ws-muted">This password setup link is invalid or has expired.</p>
        <Link to="/auth/forgot-password" className="ws-btn ws-btn--sm ws-btn--primary">
          Request a new link
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: SetupPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.setupPassword({ token, password: data.password });
      navigate('/admin/login', {
        state: { message: 'Password created. Please sign in.' },
      });
    } catch (err) {
      setError((err as { message: string }).message || 'Failed to set your password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ws-stack--lg">
      <div>
        <h1 className="ws-h2">Create your admin password</h1>
        <p className="ws-body ws-muted">
          Choose a password for the admin console. You'll use it to sign in from now on.
        </p>
      </div>

      {error && (
        <div className="ws-alert" role="alert">
          <AlertCircle size={16} aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="ws-stack--lg">
        <div className="ws-formfield">
          <label htmlFor="password" className="ws-formfield__label">Password</label>
          {/* The reveal toggle is a real button inside the group, so it needs
              pointer events that .ws-inputgroup__icon deliberately removes. */}
          <div className="ws-inputgroup">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
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

        <div className="ws-formfield">
          <label htmlFor="confirmPassword" className="ws-formfield__label">Confirm Password</label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Confirm your password"
            className={`ws-field ${errors.confirmPassword ? 'ws-field--invalid' : ''}`}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <span className="ws-formfield__error">{errors.confirmPassword.message}</span>
          )}
        </div>

        <button type="submit" className="ws-btn ws-btn--primary ws-btn--block" disabled={isLoading}>
          {isLoading ? 'Saving…' : 'Create password'}
        </button>
      </form>

      <p className="ws-caption ws-muted" style={{ textAlign: 'center' }}>
        Already set one up?{' '}
        <Link to="/admin/login" style={{ color: 'var(--ws-brand-gold-text)' }}>Sign in</Link>
      </p>
    </div>
  );
}
