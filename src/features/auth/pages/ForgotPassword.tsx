import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/features/auth/api';

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
        <h1 className="ws-auth__title">Check your email</h1>
        <p className="ws-auth__lede">
          If an admin account exists for that address, we've sent it a link.
          Please check your inbox.
        </p>
        <Link to="/admin/login" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--primary">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="ws-stack--lg">
      <div>
        <h1 className="ws-auth__title">Admin password link</h1>
        <p className="ws-auth__lede">
          Enter your email address and we'll send you a link to set or reset your
          admin password.
        </p>
      </div>

      {error && (
        <div className="ws-alert" role="alert">
          <AlertCircle size={16} aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="ws-stack--lg">
        <div className="ws-vxfieldset">
          <label htmlFor="email" className="ws-vxlabel">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            className="ws-vxinput" aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && <p className="ws-vxerror" role="alert">{errors.email.message}</p>}
        </div>

        <button type="submit" className="ws-ldbtn ws-ldbtn--primary ws-auth__submit" disabled={isLoading}>
          {isLoading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="ws-auth__foot" style={{ textAlign: 'center' }}>
        Remember your password?{' '}
        <Link to="/admin/login" style={{ color: 'var(--ws-brand-gold-text)' }}>Sign in</Link>
      </p>
    </div>
  );
}
