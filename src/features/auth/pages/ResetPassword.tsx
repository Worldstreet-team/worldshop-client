import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/features/auth/api';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
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
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  if (!token) {
    return (
      <div style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 'var(--ws-space-3)' }}>
        <span className="ws-empty__icon" style={{ color: 'var(--ws-status-danger)' }}>
          <AlertCircle size={26} aria-hidden />
        </span>
        <h1 className="ws-auth__title">Invalid link</h1>
        <p className="ws-auth__lede">This password reset link is invalid or has expired.</p>
        <Link to="/auth/forgot-password" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--primary">
          Request a new link
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.resetPassword({ token, password: data.password });
      navigate('/admin/login', {
        state: { message: 'Password reset successful. Please sign in.' }
      });
    } catch (err) {
      setError((err as { message: string }).message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ws-stack--lg">
      <div>
        <h1 className="ws-auth__title">Reset password</h1>
        <p className="ws-auth__lede">Enter your new password below.</p>
      </div>

      {error && (
        <div className="ws-alert" role="alert">
          <AlertCircle size={16} aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="ws-stack--lg">
        <div className="ws-vxfieldset">
          <label htmlFor="password" className="ws-vxlabel">New password</label>
          {/* The reveal toggle is a real button inside the group, so it needs
              pointer events that .ws-inputgroup__icon deliberately removes. */}
          <div className="ws-inputgroup">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              className="ws-vxinput" aria-invalid={!!errors.password}
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
          {errors.password && <p className="ws-vxerror" role="alert">{errors.password.message}</p>}
        </div>

        <div className="ws-vxfieldset">
          <label htmlFor="confirmPassword" className="ws-vxlabel">Confirm password</label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            className="ws-vxinput" aria-invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="ws-vxerror" role="alert">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button type="submit" className="ws-ldbtn ws-ldbtn--primary ws-auth__submit" disabled={isLoading}>
          {isLoading ? 'Resetting…' : 'Reset password'}
        </button>
      </form>

      <p className="ws-auth__foot" style={{ textAlign: 'center' }}>
        Remember your password?{' '}
        <Link to="/admin/login" style={{ color: 'var(--ws-brand-gold-text)' }}>Sign in</Link>
      </p>
    </div>
  );
}
