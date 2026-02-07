import { useState } from 'react';
import { Link } from 'react-router-dom';
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
      <div className="auth-page forgot-password-page">
        <div className="success-message">
          <span className="material-icons">mark_email_read</span>
          <h1>Check Your Email</h1>
          <p>
            We've sent password reset instructions to your email address.
            Please check your inbox.
          </p>
          <Link to="/auth/login" className="btn btn-primary">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page forgot-password-page">
      <h1>Forgot Password?</h1>
      <p className="auth-subtitle">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      {error && (
        <div className="alert alert-error">
          <span className="material-icons">error</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            className={errors.email ? 'error' : ''}
            {...register('email')}
          />
          {errors.email && <span className="error-message">{errors.email.message}</span>}
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <p className="auth-footer">
        Remember your password?{' '}
        <Link to="/auth/login">Sign in</Link>
      </p>
    </div>
  );
}
