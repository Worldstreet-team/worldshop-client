import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/userService';
import { toast } from '@/store/uiStore';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      const response = await authService.updateProfile(data);
      updateUser(response.data);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error((err as { message: string }).message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="container">
        <div className="page-header">
          <Link to="/account" className="back-link">
            <span className="material-icons">arrow_back</span>
            Back to Account
          </Link>
          <h1>My Profile</h1>
        </div>

        <div className="profile-content">
          <form onSubmit={handleSubmit(onSubmit)} className="profile-form">
            <div className="form-section">
              <h2>Personal Information</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    className={errors.firstName ? 'error' : ''}
                    {...register('firstName')}
                  />
                  {errors.firstName && (
                    <span className="error-message">{errors.firstName.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    className={errors.lastName ? 'error' : ''}
                    {...register('lastName')}
                  />
                  {errors.lastName && (
                    <span className="error-message">{errors.lastName.message}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="disabled"
                />
                <span className="helper-text">Email cannot be changed</span>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  {...register('phone')}
                />
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isLoading || !isDirty}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          <div className="profile-sidebar">
            <div className="security-section">
              <h2>Security</h2>
              <Link to="/auth/forgot-password" className="btn btn-secondary btn-block">
                Change Password
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
