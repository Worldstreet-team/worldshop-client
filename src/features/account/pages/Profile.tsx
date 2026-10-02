import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Check, ExternalLink, Info, MessagesSquare, ShoppingBag, Store } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/features/auth/store/authStore';
import { profileService } from '@/features/account/api';
import { toast } from '@/shared/store/uiStore';
import type { UserProfile, Gender } from '@/features/auth/types';
import CategoryHead from '@/features/catalog/components/CategoryHead';
import { VendorSectionHead } from '@/features/stores/components/vendor/VendorPage';
import { usePageTitle } from '@/shared/hooks/usePageTitle';

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
  { value: '', label: 'Not specified' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

const QUICK_LINKS = [
  { to: '/account/messages', label: 'Messages', Icon: MessagesSquare },
  { to: '/saved', label: 'Saved listings', Icon: Bookmark },
  { to: '/categories', label: 'Browse categories', Icon: ShoppingBag },
  { to: '/vendor', label: 'Sell on WorldStore', Icon: Store },
];

const securityUrl = `${(import.meta.env.VITE_LOGIN_URL || 'https://worldstreetgold.com/login').replace(/\/login\/?$/, '')}/account/security`;

// ─── Component ───────────────────────────────────────────────

export default function ProfilePage() {
  usePageTitle('Profile');
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

  const head = (
    <CategoryHead
      crumbs={[{ label: 'My account', to: '/account' }, { label: 'Profile' }]}
      title="Profile"
    >
      {isNewProfile
        ? 'Complete your profile so sellers know who they are talking to.'
        : 'Your personal details. Sellers see your name when you message them.'}
    </CategoryHead>
  );

  if (isFetching) {
    return (
      <div className="ws-wrap ws-cx">
        {head}
        <div className="ws-skeleton" style={{ height: 320, maxWidth: 820, marginTop: 32, borderRadius: 'var(--ws-radius-lg)' }} />
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
    <div className="ws-wrap ws-cx">
      {head}

      <div className="ws-acctprofile">
        <div className="ws-acctprofile__main">
          {isNewProfile && (
            <div className="ws-alert ws-alert--info">
              <Info size={16} aria-hidden />
              <span>
                <strong>Welcome to WorldStore.</strong> Fill in your details below and save to set up your profile.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="ws-vxform">
            <section>
              <VendorSectionHead title="Personal information" description="Your name is what sellers see when you message them." />
              <div className="ws-vxgroup">
                <div className="ws-vxfieldset">
                  <label htmlFor="firstName" className="ws-vxlabel">
                    First name<span aria-hidden className="ws-vxlabel__req">*</span>
                  </label>
                  <input id="firstName" type="text" className="ws-vxinput" placeholder="Enter first name" aria-invalid={!!errors.firstName} {...register('firstName')} />
                  {errors.firstName && <p className="ws-vxerror" role="alert">{errors.firstName.message}</p>}
                </div>
                <div className="ws-vxfieldset">
                  <label htmlFor="lastName" className="ws-vxlabel">
                    Last name<span aria-hidden className="ws-vxlabel__req">*</span>
                  </label>
                  <input id="lastName" type="text" className="ws-vxinput" placeholder="Enter last name" aria-invalid={!!errors.lastName} {...register('lastName')} />
                  {errors.lastName && <p className="ws-vxerror" role="alert">{errors.lastName.message}</p>}
                </div>
                {/* Email is read only: the WorldStreet account owns it. */}
                <div className="ws-vxfieldset">
                  <label htmlFor="email" className="ws-vxlabel">Email address</label>
                  <input id="email" type="email" className="ws-vxinput" value={displayEmail} disabled />
                  <span className="ws-vxhint">Managed by your WorldStreet account</span>
                </div>
                <div className="ws-vxfieldset">
                  <label htmlFor="phone" className="ws-vxlabel">Phone number</label>
                  <input id="phone" type="tel" className="ws-vxinput" placeholder="+234 XXX XXX XXXX" {...register('phone')} />
                </div>
                <div className="ws-vxfieldset">
                  <label htmlFor="dateOfBirth" className="ws-vxlabel">Date of birth</label>
                  <input id="dateOfBirth" type="date" className="ws-vxinput" {...register('dateOfBirth')} />
                </div>
                <div className="ws-vxfieldset">
                  <label htmlFor="gender" className="ws-vxlabel">Gender</label>
                  <select id="gender" className="ws-select ws-vxinput ws-vxinput--select" {...register('gender')}>
                    {genderOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <div className="ws-acctprofile__save">
              <button
                type="submit"
                className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--primary"
                disabled={isSaving || !isDirty}
                aria-busy={isSaving || undefined}
              >
                <Check size={16} aria-hidden />
                {isSaving ? 'Saving…' : isNewProfile ? 'Create profile' : 'Save changes'}
              </button>
              {!isDirty && !isNewProfile && <span className="ws-vxhint">Everything is up to date</span>}
            </div>
          </form>

          <section>
            <VendorSectionHead title="Security" description="Your password lives with your WorldStreet account." />
            <div className="ws-vxcard ws-acctprofile__row">
              <span>
                <span className="ws-acctprofile__rowtitle">Password</span>
                <span className="ws-vxhint">Change your account password</span>
              </span>
              <a href={securityUrl} target="_blank" rel="noopener noreferrer" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--outline">
                Change password
                <ExternalLink size={14} aria-hidden />
              </a>
            </div>
          </section>
        </div>

        <aside className="ws-acctprofile__side">
          <div className="ws-vxcard ws-acctprofile__card">
            <span className="ws-acctprofile__avatar">
              {profile?.avatar ? <img src={profile.avatar} alt="" /> : initials}
            </span>
            <p className="ws-acctprofile__name">{displayFirstName} {displayLastName}</p>
            <p className="ws-vxhint">{displayEmail}</p>
            {memberSince && <p className="ws-vxhint">Member since {memberSince}</p>}
          </div>

          {/* Orders, addresses and the wishlist went with the buying flows;
              these are the destinations that still exist. */}
          <nav className="ws-cxsections" aria-label="Account">
            <h2 className="ws-cxsections__title">Quick links</h2>
            <ul>
              {QUICK_LINKS.map(({ to, label, Icon }) => (
                <li key={to}>
                  <Link to={to} className="ws-cxsections__link">
                    <span className="ws-acctprofile__link">
                      <Icon size={16} aria-hidden />
                      {label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  );
}
