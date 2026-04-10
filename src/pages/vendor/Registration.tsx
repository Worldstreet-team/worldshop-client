import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { vendorService } from '@/services/vendorService';
import { toast } from '@/store/uiStore';

const registerSchema = z.object({
  storeName: z
    .string()
    .min(3, 'Store name must be at least 3 characters')
    .max(50, 'Store name must be at most 50 characters'),
  storeDescription: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .or(z.literal('')),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function VendorRegistration() {
  const navigate = useNavigate();
  const { user, syncClerkUser } = useAuthStore();
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      storeName: '',
      storeDescription: '',
    },
  });

  // Already a vendor — redirect
  if (user?.isVendor) {
    navigate('/vendor', { replace: true });
    return null;
  }

  const onSubmit = async (data: RegisterFormData) => {
    setServerError('');
    setIsSubmitting(true);

    try {
      await vendorService.register({
        storeName: data.storeName,
        storeDescription: data.storeDescription || undefined,
      });

      // Re-sync user profile to pick up vendor fields
      await syncClerkUser();

      toast.success('Your vendor account has been created!');
      navigate('/vendor');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message || 'Registration failed. Please try again.'
          : 'Registration failed. Please try again.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="vendor-registration">
      <div className="registration-header">
        <h1>Become a Vendor</h1>
        <p>Set up your store and start selling on WorldStreet.</p>
      </div>

      {serverError && (
        <div className="error-message">{serverError}</div>
      )}

      <form className="registration-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label htmlFor="storeName">Store Name *</label>
          <input
            id="storeName"
            type="text"
            placeholder="e.g. My Awesome Store"
            {...register('storeName')}
          />
          {errors.storeName && (
            <p className="field-error">{errors.storeName.message}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="storeDescription">Store Description</label>
          <textarea
            id="storeDescription"
            placeholder="Tell customers about your store (optional)"
            {...register('storeDescription')}
          />
          {errors.storeDescription && (
            <p className="field-error">{errors.storeDescription.message}</p>
          )}
        </div>

        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Creating Store...' : 'Create My Store'}
        </button>
      </form>
    </div>
  );
}
