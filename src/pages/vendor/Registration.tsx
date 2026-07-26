import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { storeService, type SubscriptionPlan } from '@/services/storeService';
import { NIGERIAN_STATES } from '@/utils/nigerianStates';
import { toast } from '@/store/uiStore';

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
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Could not create your store. Please try again.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingStore) {
    return (
      <div className="vendor-registration">
        <div className="registration-header"><h1>Create Your Store</h1></div>
        <p style={{ color: '#667085' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="vendor-registration">
      <div className="registration-header">
        <h1>Create Your Store</h1>
        <p>Set up your storefront on the WorldStreet marketplace.</p>
      </div>

      {/* What they are signing up to, stated before the form rather than after. */}
      <div
        style={{
          display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
          padding: '1rem', borderRadius: 8, background: '#f8f9fc',
          border: '1px solid #e4e7ec', marginBottom: '1.5rem',
        }}
      >
        <span className="material-icons" style={{ color: '#475467' }}>info</span>
        <div style={{ fontSize: '0.92rem', color: '#475467', lineHeight: 1.5 }}>
          <strong style={{ display: 'block', color: '#101828', marginBottom: 2 }}>
            {plan
              ? `${formatUsd(plan.amountMinor)} per month to stay visible`
              : 'A monthly subscription keeps your store visible'}
          </strong>
          Creating your store is free. It stays private until you activate the
          subscription from your dashboard, so you can add your products first.
          Buyers contact you directly — WorldStreet takes no commission on sales.
        </div>
      </div>

      {serverError && <div className="error-message">{serverError}</div>}

      <form className="registration-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label htmlFor="name">Store Name *</label>
          <input id="name" type="text" placeholder="e.g. Bella Fabrics" {...register('name')} />
          {errors.name && <p className="field-error">{errors.name.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="description">About Your Store</label>
          <textarea
            id="description"
            placeholder="What do you sell? What makes your store worth contacting?"
            {...register('description')}
          />
          {errors.description && <p className="field-error">{errors.description.message}</p>}
        </div>

        {/* Buyers browse by state, so this one is required. */}
        <div className="form-group">
          <label htmlFor="state">State *</label>
          <select id="state" {...register('state')}>
            <option value="">Select a state</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.state && <p className="field-error">{errors.state.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="city">City / Area</label>
          <input id="city" type="text" placeholder="e.g. Ikeja" {...register('city')} />
          {errors.city && <p className="field-error">{errors.city.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="address">Shop Address</label>
          <input
            id="address"
            type="text"
            placeholder="Optional — shown to buyers if you have a physical shop"
            {...register('address')}
          />
          {errors.address && <p className="field-error">{errors.address.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input id="phone" type="tel" placeholder="e.g. 08031234567" {...register('phone')} />
          {errors.phone && <p className="field-error">{errors.phone.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="whatsapp">WhatsApp Number</label>
          <input
            id="whatsapp"
            type="tel"
            placeholder="If different from your phone number"
            {...register('whatsapp')}
          />
          {errors.whatsapp && <p className="field-error">{errors.whatsapp.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="website">Website or Social Page</label>
          <input
            id="website"
            type="url"
            placeholder="https://instagram.com/yourstore"
            {...register('website')}
          />
          {errors.website && <p className="field-error">{errors.website.message}</p>}
        </div>

        <p style={{ fontSize: '0.85rem', color: '#667085', marginBottom: '1rem' }}>
          Buyers message you on WorldStreet first. Your phone and WhatsApp are
          shown on your store page so they can also reach you directly.
        </p>

        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Creating Store…' : 'Create My Store'}
        </button>
      </form>
    </div>
  );
}
