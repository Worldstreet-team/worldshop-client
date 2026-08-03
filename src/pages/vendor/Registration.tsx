import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { storeService, type SubscriptionPlan } from '@/services/storeService';
import { NIGERIAN_STATES } from '@/utils/nigerianStates';
import { toast } from '@/store/uiStore';
import { toApiError } from '@/services/api';

/**
 * Store creation.
 *
 * Creating a store is what makes someone a seller — there is no separate
 * "become a vendor" step any more. The store is created in DRAFT and stays
 * invisible to buyers until the subscription is paid from the dashboard, so a
 * vendor can build their storefront before being asked for money.
 *
 * Location and contact details are collected here rather than later because
 * they are what the marketplace is for: buyers filter by state and reach
 * sellers directly.
 */

const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

const createStoreSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Store name must be at least 3 characters')
    .max(60, 'Store name must be at most 60 characters'),
  description: optionalText(1000),
  state: z.string().min(1, 'Select the state you operate from'),
  city: optionalText(60),
  address: optionalText(200),
  phone: z
    .string()
    .trim()
    .regex(PHONE_RE, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  whatsapp: z
    .string()
    .trim()
    .regex(PHONE_RE, 'Enter a valid WhatsApp number')
    .optional()
    .or(z.literal('')),
  website: z.string().trim().url('Enter a valid URL').max(200).optional().or(z.literal('')),
});

type CreateStoreFormData = z.infer<typeof createStoreSchema>;

const formatUsd = (minor: number) => `$${(minor / 100).toFixed(2)}`;

export default function VendorRegistration() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [checkingStore, setCheckingStore] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateStoreFormData>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: {
      name: '', description: '', state: '', city: '',
      address: '', phone: '', whatsapp: '', website: '',
    },
  });

  // One store per user — send anyone who already has one to their dashboard
  // rather than letting them fill in a form that will 409 on submit.
  useEffect(() => {
    let cancelled = false;

    storeService
      .getMyStore()
      .then(() => {
        if (!cancelled) navigate('/vendor', { replace: true });
      })
      .catch(() => {
        if (!cancelled) setCheckingStore(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Pricing is shown before the form is filled in, not sprung afterwards.
  useEffect(() => {
    let cancelled = false;

    storeService
      .getPlans()
      .then((res) => {
        if (!cancelled) setPlan(res.data[0] ?? null);
      })
      .catch(() => {
        // Non-fatal — the store can still be created, and payment comes later.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (data: CreateStoreFormData) => {
    setServerError('');
    setIsSubmitting(true);

    try {
      // Empty optionals are omitted rather than sent as "" — the API validates
      // email/url/phone formats and an empty string is a value, not an absence.
      await storeService.createStore({
        name: data.name,
        state: data.state,
        description: data.description || undefined,
        city: data.city || undefined,
        address: data.address || undefined,
        phone: data.phone || undefined,
        whatsapp: data.whatsapp || undefined,
        website: data.website || undefined,
      });

      toast.success('Store created. Add your products, then activate to go live.');
      navigate('/vendor');
    } catch (err: unknown) {
      const e = toApiError(err, 'Could not create your store. Please try again.');
      const fieldError = e.errors && Object.values(e.errors)[0];
      setServerError(fieldError || e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingStore) {
    return (
      <div className="ws-page">
        <div className="ws-page__head"><h1 className="ws-page__title">Create Your Store</h1></div>
        <div className="ws-skeleton" style={{ height: 320, borderRadius: 'var(--ws-radius-xl)' }} />
      </div>
    );
  }

  return (
    <div className="ws-page" style={{ maxWidth: 760 }}>
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">Create Your Store</h1>
          <p className="ws-page__sub">Set up your storefront on the WorldStreet marketplace.</p>
        </div>
      </div>

      {/* What they are signing up to, stated before the form rather than after. */}
      <div className="ws-alert ws-alert--info" style={{ marginBottom: 'var(--ws-space-6)' }}>
        <Info size={16} aria-hidden />
        <div>
          <strong style={{ display: 'block', color: 'var(--ws-text-primary)', marginBottom: 2 }}>
            {plan
              ? `${formatUsd(plan.amountMinor)} per month to stay visible`
              : 'A monthly subscription keeps your store visible'}
          </strong>
          Creating your store is free. It stays private until you activate the
          subscription from your dashboard, so you can add your products first.
          Buyers contact you directly — WorldStreet takes no commission on sales.
        </div>
      </div>

      {serverError && (
        <div className="ws-alert" role="alert" style={{ marginBottom: 'var(--ws-space-4)' }}>
          <AlertCircle size={16} aria-hidden />
          <span>{serverError}</span>
        </div>
      )}

      <form className="ws-card ws-stack--lg" onSubmit={handleSubmit(onSubmit)}>
        <div className="ws-formgrid">
          <div className="ws-formfield ws-formgrid__full">
            <label htmlFor="name" className="ws-formfield__label">Store Name *</label>
            <input id="name" type="text" className="ws-field" placeholder="e.g. Bella Fabrics" {...register('name')} />
            {errors.name && <p className="ws-formfield__error">{errors.name.message}</p>}
          </div>

          <div className="ws-formfield ws-formgrid__full">
            <label htmlFor="description" className="ws-formfield__label">About Your Store</label>
            <textarea
              id="description"
              className="ws-textarea"
              placeholder="What do you sell? What makes your store worth contacting?"
              {...register('description')}
            />
            {errors.description && <p className="ws-formfield__error">{errors.description.message}</p>}
          </div>

          {/* Buyers browse by state, so this one is required. */}
          <div className="ws-formfield">
            <label htmlFor="state" className="ws-formfield__label">State *</label>
            <select id="state" className="ws-select" {...register('state')}>
              <option value="">Select a state</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.state && <p className="ws-formfield__error">{errors.state.message}</p>}
          </div>

          <div className="ws-formfield">
            <label htmlFor="city" className="ws-formfield__label">City / Area</label>
            <input id="city" type="text" className="ws-field" placeholder="e.g. Ikeja" {...register('city')} />
            {errors.city && <p className="ws-formfield__error">{errors.city.message}</p>}
          </div>

          <div className="ws-formfield ws-formgrid__full">
            <label htmlFor="address" className="ws-formfield__label">Shop Address</label>
            <input
              id="address"
              type="text"
              className="ws-field"
              placeholder="Optional — shown to buyers if you have a physical shop"
              {...register('address')}
            />
            {errors.address && <p className="ws-formfield__error">{errors.address.message}</p>}
          </div>

          <div className="ws-formfield">
            <label htmlFor="phone" className="ws-formfield__label">Phone Number</label>
            <input id="phone" type="tel" className="ws-field" placeholder="e.g. 08031234567" {...register('phone')} />
            {errors.phone && <p className="ws-formfield__error">{errors.phone.message}</p>}
          </div>

          <div className="ws-formfield">
            <label htmlFor="whatsapp" className="ws-formfield__label">WhatsApp Number</label>
            <input
              id="whatsapp"
              type="tel"
              className="ws-field"
              placeholder="If different from your phone number"
              {...register('whatsapp')}
            />
            {errors.whatsapp && <p className="ws-formfield__error">{errors.whatsapp.message}</p>}
          </div>

          <div className="ws-formfield ws-formgrid__full">
            <label htmlFor="website" className="ws-formfield__label">Website or Social Page</label>
            <input
              id="website"
              type="url"
              className="ws-field"
              placeholder="https://instagram.com/yourstore"
              {...register('website')}
            />
            {errors.website && <p className="ws-formfield__error">{errors.website.message}</p>}
          </div>
        </div>

        <p className="ws-caption ws-muted">
          Buyers message you on WorldStreet first. Your phone and WhatsApp are
          shown on your store page so they can also reach you directly.
        </p>

        <div>
          <button type="submit" className="ws-btn ws-btn--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Store…' : 'Create My Store'}
          </button>
        </div>
      </form>
    </div>
  );
}
