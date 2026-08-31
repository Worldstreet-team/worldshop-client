import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { mallService } from '@/services/mallService';
import type { SubscriptionPlan } from '@/services/storeService';
import { NIGERIAN_STATES } from '@/utils/nigerianStates';
import { toast } from '@/store/uiStore';
import { toApiError } from '@/services/api';

/**
 * Mall creation.
 *
 * A mall is a paid umbrella: one subscription covers every substore the owner
 * creates inside it. Like a store, it is created in DRAFT and stays invisible
 * until the subscription is paid from the dashboard, so the owner can build
 * out substores and catalogues before being asked for money.
 */

const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

const createMallSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Mall name must be at least 3 characters')
    .max(60, 'Mall name must be at most 60 characters'),
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

type CreateMallFormData = z.infer<typeof createMallSchema>;

const formatUsd = (minor: number) => `$${(minor / 100).toFixed(2)}`;

export default function MallRegistration() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plan, setPlan] = useState<(SubscriptionPlan & { substoreLimit: number | null }) | null>(null);
  const [checkingMall, setCheckingMall] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateMallFormData>({
    resolver: zodResolver(createMallSchema),
    defaultValues: {
      name: '', description: '', state: '', city: '',
      address: '', phone: '', whatsapp: '', website: '',
    },
  });

  // One mall per user — send anyone who already has one to their dashboard
  // rather than letting them fill in a form that will 409 on submit.
  useEffect(() => {
    let cancelled = false;

    mallService
      .getMyMall()
      .then(() => {
        if (!cancelled) navigate('/mall', { replace: true });
      })
      .catch(() => {
        if (!cancelled) setCheckingMall(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Pricing is shown before the form is filled in, not sprung afterwards.
  useEffect(() => {
    let cancelled = false;

    mallService
      .getPlans()
      .then((res) => {
        if (!cancelled) setPlan(res.data[0] ?? null);
      })
      .catch(() => {
        // Non-fatal — the mall can still be created, and payment comes later.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (data: CreateMallFormData) => {
    setServerError('');
    setIsSubmitting(true);

    try {
      await mallService.createMall({
        name: data.name,
        state: data.state,
        description: data.description || undefined,
        city: data.city || undefined,
        address: data.address || undefined,
        phone: data.phone || undefined,
        whatsapp: data.whatsapp || undefined,
        website: data.website || undefined,
      });

      toast.success('Mall created. Add your substores, then activate to go live.');
      navigate('/mall');
    } catch (err: unknown) {
      const e = toApiError(err, 'Could not create your mall. Please try again.');
      const fieldError = e.errors && Object.values(e.errors)[0];
      setServerError(fieldError || e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingMall) {
    return (
      <div className="ws-page">
        <div className="ws-page__head"><h1 className="ws-page__title">Create Your Mall</h1></div>
        <div className="ws-skeleton" style={{ height: 320, borderRadius: 'var(--ws-radius-xl)' }} />
      </div>
    );
  }

  return (
    <div className="ws-page" style={{ maxWidth: 760 }}>
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">Create Your Mall</h1>
          <p className="ws-page__sub">
            Run multiple storefronts under one roof on the WorldStore marketplace.
          </p>
        </div>
      </div>

      {/* What they are signing up to, stated before the form rather than after. */}
      <div className="ws-alert ws-alert--info" style={{ marginBottom: 'var(--ws-space-6)' }}>
        <Info size={16} aria-hidden />
        <div>
          <strong style={{ display: 'block', color: 'var(--ws-text-primary)', marginBottom: 2 }}>
            {plan
              ? `${formatUsd(plan.amountMinor)} per month covers your mall and all its substores`
              : 'A monthly subscription keeps your mall and all its substores visible'}
          </strong>
          Creating your mall is free. It stays private until you activate the
          subscription from your dashboard, so you can set up your substores
          first.{plan?.substoreLimit ? ` Your plan includes up to ${plan.substoreLimit} substores` : ''}
          {plan?.substoreLimit ? ' — none of them needs its own subscription.' : ''}
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
            <label htmlFor="name" className="ws-formfield__label">Mall Name *</label>
            <input id="name" type="text" className="ws-field" placeholder="e.g. Lagos Mega Mall" {...register('name')} />
            {errors.name && <p className="ws-formfield__error">{errors.name.message}</p>}
          </div>

          <div className="ws-formfield ws-formgrid__full">
            <label htmlFor="description" className="ws-formfield__label">About Your Mall</label>
            <textarea
              id="description"
              className="ws-textarea"
              placeholder="What kind of stores will shoppers find here?"
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
            <label htmlFor="address" className="ws-formfield__label">Mall Address</label>
            <input
              id="address"
              type="text"
              className="ws-field"
              placeholder="Optional — shown to buyers if you have a physical location"
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
              placeholder="https://instagram.com/yourmall"
              {...register('website')}
            />
            {errors.website && <p className="ws-formfield__error">{errors.website.message}</p>}
          </div>
        </div>

        <div>
          <button type="submit" className="ws-btn ws-btn--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Mall…' : 'Create My Mall'}
          </button>
        </div>
      </form>
    </div>
  );
}
