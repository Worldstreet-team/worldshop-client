import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Info, MessageCircle, ShoppingBag, Store } from 'lucide-react';
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
  const [isNewProfile, setIsNewProfile] = useState(false);
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
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      dateOfBirth: '',
      gender: '',
    },
  });

  // ─── Fetch profile on mount (wait for auth) ────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await profileService.getProfile();
        if (cancelled) return;

        const p = res.data;
        setProfile(p);

        // Get fresh auth store user for fallback if profile has empty names
        const freshUser = useAuthStore.getState().user;

        reset({
          firstName: p.firstName || freshUser?.firstName || '',
          lastName: p.lastName || freshUser?.lastName || '',
          phone: p.phone ?? '',
          dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
          gender: (p.gender as ProfileFormData['gender']) ?? '',
        });
      } catch {
        // No profile yet or server error — show form with auth store data
        // Read fresh user from the store to avoid stale closure
        const freshUser = useAuthStore.getState().user;
        if (!cancelled) {
          setIsNewProfile(true);
          reset({
            firstName: freshUser?.firstName || '',
            lastName: freshUser?.lastName || '',
            phone: freshUser?.phone || '',
            dateOfBirth: '',
            gender: '',
          });
        }
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

      const res = await profileService.updateProfile(payload as Parameters<typeof profileService.updateProfile>[0]);
      const updated = res.data;
      setProfile(updated);
      setIsNewProfile(false);

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
      <div className="ws-page">
        <div className="ws-stack--lg">
          <div className="ws-skeleton" style={{ height: 32, width: '30%' }} />
          <div className="ws-skeleton" style={{ height: 280, borderRadius: 'var(--ws-radius-xl)' }} />
        </div>
      </div>
    );
  }

  // ─── Initials for avatar ───────────────────────────────────

  const initials =
    ((profile?.firstName || user?.firstName || '')[0] || '')
      .concat((profile?.lastName || user?.lastName || '')[0] || '')
      .toUpperCase() ||
    user?.firstName?.[0]?.toUpperCase() ||
    '?';

  const displayFirstName = profile?.firstName || user?.firstName || '';
  const displayLastName = profile?.lastName || user?.lastName || '';
  const displayEmail = profile?.email || user?.email || '';

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
    : '';

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="ws-page">
      <nav className="ws-crumbs" aria-label="Breadcrumb">
        <Link to="/account">My Account</Link>
        <ChevronRight size={12} aria-hidden />
        <span style={{ color: 'var(--ws-text-primary)', fontWeight: 500 }}>Profile</span>
      </nav>

      <div className="ws-detail">
        {/* ── Main form ───────────────────────────────── */}
        <main className="ws-stack--lg">
          <section className="ws-card">
            <div className="ws-sectionhead">
              <div>
                <h1 className="ws-h2">Personal Information</h1>
                <p className="ws-caption ws-muted">
                  {isNewProfile
                    ? 'Complete your profile so sellers know who they are talking to'
                    : 'Manage your personal details and preferences'}
                </p>
              </div>
            </div>

            {isNewProfile && (
              <div className="ws-alert ws-alert--info" style={{ marginBottom: 'var(--ws-space-4)' }}>
                <Info size={16} aria-hidden />
                <span>
                  <strong>Welcome to WorldStreet Shop.</strong> Fill in your details
                  below and hit save to set up your profile.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="ws-stack--lg">
              <div className="ws-formgrid">
                <div className="ws-formfield">
                  <label htmlFor="firstName" className="ws-formfield__label">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    className={`ws-field ${errors.firstName ? 'ws-field--invalid' : ''}`}
                    placeholder="Enter first name"
                    {...register('firstName')}
                  />
                  {errors.firstName && (
                    <span className="ws-formfield__error">{errors.firstName.message}</span>
                  )}
                </div>

                <div className="ws-formfield">
                  <label htmlFor="lastName" className="ws-formfield__label">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    className={`ws-field ${errors.lastName ? 'ws-field--invalid' : ''}`}
                    placeholder="Enter last name"
                    {...register('lastName')}
                  />
                  {errors.lastName && (
                    <span className="ws-formfield__error">{errors.lastName.message}</span>
                  )}
                </div>

                {/* Email — read only; Clerk owns it. */}
                <div className="ws-formfield">
                  <label htmlFor="email" className="ws-formfield__label">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    className="ws-field"
                    value={displayEmail}
                    disabled
                  />
                  <span className="ws-formfield__hint">
                    Email is managed by your WorldStreet account
                  </span>
                </div>

                <div className="ws-formfield">
                  <label htmlFor="phone" className="ws-formfield__label">Phone Number</label>
                  <input
                    id="phone"
                    type="tel"
                    className="ws-field"
                    placeholder="+234 XXX XXX XXXX"
                    {...register('phone')}
                  />
                </div>

                <div className="ws-formfield">
                  <label htmlFor="dateOfBirth" className="ws-formfield__label">Date of Birth</label>
                  <input id="dateOfBirth" type="date" className="ws-field" {...register('dateOfBirth')} />
                </div>

                <div className="ws-formfield">
                  <label htmlFor="gender" className="ws-formfield__label">Gender</label>
                  <select id="gender" className="ws-select" {...register('gender')}>
                    {genderOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="ws-btn ws-btn--primary"
                  disabled={isSaving || !isDirty}
                  aria-busy={isSaving || undefined}
                >
                  {isSaving && (
                    <span className="ws-btn__spinner" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
                      </svg>
                    </span>
                  )}
                  {isSaving ? 'Saving…' : isNewProfile ? 'Create Profile' : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>

          {/* ── Security ────────────────────────── */}
          <section className="ws-card">
            <div className="ws-sectionhead">
              <div>
                <h2 className="ws-h2">Security</h2>
                <p className="ws-caption ws-muted">Manage your password and account security</p>
              </div>
            </div>

            <div className="ws-listrow">
              <div className="ws-listrow__body">
                <span className="ws-listrow__title">Password</span>
                <span className="ws-listrow__sub">Change your account password</span>
              </div>
              <a
                href={`${(import.meta.env.VITE_LOGIN_URL || 'https://worldstreetgold.com/login').replace(/\/login\/?$/, '')}/account/security`}
                target="_blank"
                rel="noopener noreferrer"
                className="ws-btn ws-btn--sm ws-btn--secondary"
              >
                Change Password
              </a>
            </div>
          </section>
        </main>

        {/* ── Sidebar ─────────────────────────────────── */}
        <aside className="ws-aside">
          <div className="ws-card" style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 'var(--ws-space-2)' }}>
            <span className="ws-avatar ws-avatar--l" style={{ width: 72, height: 72, fontSize: 24 }}>
              {profile?.avatar ? <img src={profile.avatar} alt="" /> : initials}
            </span>
            <h2 className="ws-title">{displayFirstName} {displayLastName}</h2>
            <p className="ws-caption ws-muted">{displayEmail}</p>
            {memberSince && <p className="ws-caption ws-subtle">Member since {memberSince}</p>}
          </div>

          {/* Orders / addresses / wishlist went with the buying flows — these
              are the destinations that still exist. */}
          <div className="ws-card ws-card--flush">
            <div className="ws-inbox__head">Quick Links</div>
            <Link to="/account/messages" className="ws-listrow ws-listrow--link">
              <MessageCircle size={18} aria-hidden />
              <div className="ws-listrow__body">
                <span className="ws-listrow__title">My Messages</span>
              </div>
            </Link>
            <Link to="/listings" className="ws-listrow ws-listrow--link">
              <ShoppingBag size={18} aria-hidden />
              <div className="ws-listrow__body">
                <span className="ws-listrow__title">Browse listings</span>
              </div>
            </Link>
            <Link to="/vendor" className="ws-listrow ws-listrow--link">
              <Store size={18} aria-hidden />
              <div className="ws-listrow__body">
                <span className="ws-listrow__title">Sell on WorldStreet</span>
              </div>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
