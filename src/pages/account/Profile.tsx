import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { profileService } from '@/services/profileService';
import { toast } from '@/store/uiStore';
import type { UserProfile, Gender } from '@/types/user.types';

// ─── Validation Schema ───────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY', '']).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// ─── Gender Display Map ──────────────────────────────────────

const genderOptions: { value: Gender | ''; label: string }[] = [
  { value: '', label: 'Prefer not to say' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

// ─── Component ───────────────────────────────────────────────

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
    },
  });

  // ─── Fetch profile on mount ────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await profileService.getProfile();
        if (cancelled) return;

        const p = res.data;
        setProfile(p);

        reset({
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone ?? '',
          dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
          gender: (p.gender as ProfileFormData['gender']) ?? '',
        });
      } catch {
        if (!cancelled) toast.error('Failed to load profile');
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [reset]);

  // ─── Submit handler ────────────────────────────────────────

  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (data.firstName) payload.firstName = data.firstName;
      if (data.lastName) payload.lastName = data.lastName;
      payload.phone = data.phone || null;
      payload.gender = data.gender || null;
      payload.dateOfBirth = data.dateOfBirth
        ? new Date(data.dateOfBirth).toISOString()
        : null;

      const res = await profileService.updateProfile(payload as any);
      const updated = res.data;
      setProfile(updated);

      // Sync first/last name back to auth store so header updates
      updateUser({ firstName: updated.firstName, lastName: updated.lastName });

      reset({
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone ?? '',
        dateOfBirth: updated.dateOfBirth ? updated.dateOfBirth.slice(0, 10) : '',
        gender: (updated.gender as ProfileFormData['gender']) ?? '',
      });

      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message || 'Failed to update profile',
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Loading state ─────────────────────────────────────────

  if (isFetching) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="profile-loading">
            <div className="profile-loading__spinner" />
            <p>Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Initials for avatar ───────────────────────────────────

  const initials =
    ((profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '')).toUpperCase() ||
    user?.firstName?.[0]?.toUpperCase() ||
    '?';

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
    : '';

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="profile-page">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="profile-breadcrumb">
          <Link to="/account">My Account</Link>
          <span className="profile-breadcrumb__separator">/</span>
          <span>Profile</span>
        </nav>

        <div className="profile-layout">
          {/* ── Sidebar ─────────────────────────────────── */}
          <aside className="profile-sidebar">
            <div className="profile-card">
              <div className="profile-card__avatar">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="Avatar" />
                ) : (
                  <span className="profile-card__initials">{initials}</span>
                )}
              </div>

              <h2 className="profile-card__name">
                {profile?.firstName} {profile?.lastName}
              </h2>
              <p className="profile-card__email">{profile?.email || user?.email}</p>

              {memberSince && (
                <p className="profile-card__member">
                  Member since {memberSince}
                </p>
              )}
            </div>

            <div className="profile-card profile-card--links">
              <h3 className="profile-card__heading">Quick Links</h3>
              <nav className="profile-nav">
                <Link to="/account/orders" className="profile-nav__link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
                  Order History
                </Link>
                <Link to="/account/addresses" className="profile-nav__link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  Saved Addresses
                </Link>
                <Link to="/account/wishlist" className="profile-nav__link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
                  My Wishlist
                </Link>
              </nav>
            </div>
          </aside>

          {/* ── Main form ───────────────────────────────── */}
          <main className="profile-main">
            <div className="profile-section">
              <div className="profile-section__header">
                <h1 className="profile-section__title">Personal Information</h1>
                <p className="profile-section__subtitle">
                  Manage your personal details and preferences
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="profile-form">
                <div className="profile-form__grid">
                  {/* First Name */}
                  <div className="form-field">
                    <label htmlFor="firstName" className="form-field__label">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      className={`form-field__input ${errors.firstName ? 'form-field__input--error' : ''}`}
                      placeholder="Enter first name"
                      {...register('firstName')}
                    />
                    {errors.firstName && (
                      <span className="form-field__error">{errors.firstName.message}</span>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="form-field">
                    <label htmlFor="lastName" className="form-field__label">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      className={`form-field__input ${errors.lastName ? 'form-field__input--error' : ''}`}
                      placeholder="Enter last name"
                      {...register('lastName')}
                    />
                    {errors.lastName && (
                      <span className="form-field__error">{errors.lastName.message}</span>
                    )}
                  </div>

                  {/* Email — read only */}
                  <div className="form-field">
                    <label htmlFor="email" className="form-field__label">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="form-field__input form-field__input--disabled"
                      value={profile?.email || user?.email || ''}
                      disabled
                    />
                    <span className="form-field__hint">
                      Email is managed by your WorldStreet account
                    </span>
                  </div>

                  {/* Phone */}
                  <div className="form-field">
                    <label htmlFor="phone" className="form-field__label">
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      className="form-field__input"
                      placeholder="+234 XXX XXX XXXX"
                      {...register('phone')}
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="form-field">
                    <label htmlFor="dateOfBirth" className="form-field__label">
                      Date of Birth
                    </label>
                    <input
                      id="dateOfBirth"
                      type="date"
                      className="form-field__input"
                      {...register('dateOfBirth')}
                    />
                  </div>

                  {/* Gender */}
                  <div className="form-field">
                    <label htmlFor="gender" className="form-field__label">
                      Gender
                    </label>
                    <select
                      id="gender"
                      className="form-field__input"
                      {...register('gender')}
                    >
                      {genderOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="profile-form__actions">
                  <button
                    type="submit"
                    className="btn-profile-save"
                    disabled={isSaving || !isDirty}
                  >
                    {isSaving ? (
                      <>
                        <span className="btn-spinner" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* ── Security Section ────────────────────────── */}
            <div className="profile-section profile-section--security">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Security</h2>
                <p className="profile-section__subtitle">
                  Manage your password and account security
                </p>
              </div>

              <div className="profile-security-row">
                <div className="profile-security-row__info">
                  <h4>Password</h4>
                  <p>Change your account password</p>
                </div>
                <a
                  href={`${import.meta.env.VITE_AUTH_SERVICE_URL || 'https://api.worldstreetgold.com'}/account/security`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-profile-secondary"
                >
                  Change Password
                </a>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
