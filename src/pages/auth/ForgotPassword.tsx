import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/userService';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.requestPasswordReset(data.email);
      setIsSuccess(true);
    } catch (err) {
      setError((err as { message: string }).message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 'var(--ws-space-3)' }}>
        <span className="ws-empty__icon">
          <MailCheck size={26} aria-hidden />
        </span>
        <h1 className="ws-h2">Check your email</h1>
        <p className="ws-body ws-muted">
          We've sent password reset instructions to your email address.
          Please check your inbox.
        </p>
        <Link to="/auth/login" className="ws-btn ws-btn--sm ws-btn--primary">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="ws-stack--lg">
      <div>
        <h1 className="ws-h2">Forgot password?</h1>
        <p className="ws-body ws-muted">
          Enter your email address and we'll send you a link to reset your password.
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
          <label htmlFor="email" className="ws-formfield__label">Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            className={`ws-field ${errors.email ? 'ws-field--invalid' : ''}`}
            {...register('email')}
          />
          {errors.email && <span className="ws-formfield__error">{errors.email.message}</span>}
        </div>

        <button type="submit" className="ws-btn ws-btn--primary ws-btn--block" disabled={isLoading}>
          {isLoading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="ws-caption ws-muted" style={{ textAlign: 'center' }}>
        Remember your password?{' '}
        <Link to="/auth/login" style={{ color: 'var(--ws-brand-gold-text)' }}>Sign in</Link>
      </p>
    </div>
  );
}
