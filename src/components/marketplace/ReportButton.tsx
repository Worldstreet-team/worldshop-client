import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  reportService,
  REASONS_BY_TARGET,
  type ReportTargetType,
  type ReportReason,
} from '@/services/reportService';
import { useUIStore } from '@/store/uiStore';

/**
 * Report a listing, store or review.
 *
 * Deliberately understated — a prominent "Report" button next to every listing
 * invites idle clicking, and the queue is ranked by how many distinct people
 * flag a thing, so noise directly degrades the signal an admin works from.
 *
 * Two outcomes are not errors and are not worded as such:
 *   - **409** means you already reported this. That is the dedupe guard working;
 *     one person cannot inflate the count.
 *   - **401** means sign in first, so we send them to login rather than failing.
 */

type ApiError = { response?: { status?: number; data?: { message?: string } } };
const errMessage = (err: unknown, fallback: string) =>
  (err as ApiError).response?.data?.message || fallback;
const errStatus = (err: unknown) => (err as ApiError).response?.status;

export default function ReportButton({
  targetType,
  targetId,
  label = 'Report',
  targetName,
}: {
  targetType: ReportTargetType;
  targetId: string;
  label?: string;
  /** Shown in the dialog so it is obvious what is being reported. */
  targetName?: string;
}) {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reasons = REASONS_BY_TARGET[targetType];
  const noun = targetType.toLowerCase();

  const openDialog = () => {
    if (!isSignedIn) {
      navigate(`/auth/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError('Choose a reason.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await reportService.create({
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      });
      setDone(true);
      addToast({ type: 'success', message: 'Thanks — our team will review this.' });
    } catch (err: unknown) {
      // Already reported is the dedupe guard working, not a failure.
      if (errStatus(err) === 409) {
        setDone(true);
        addToast({ type: 'info', message: 'You have already reported this — our team is looking at it.' });
      } else {
        setError(errMessage(err, 'Could not submit your report'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    setOpen(false);
    setError(null);
    if (done) {
      setReason('');
      setDetails('');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: '#98a2b3', fontSize: '0.8rem', textDecoration: 'underline',
        }}
      >
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Report this ${noun}`}
          onClick={close}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(16,24,40,0.5)',
            display: 'grid', placeItems: 'center', padding: '1rem', zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 10, padding: '1.25rem', width: '100%', maxWidth: 440 }}
          >
            {done ? (
              <>
                <h3 style={{ margin: '0 0 0.5rem' }}>Report received</h3>
                <p style={{ color: '#475467', fontSize: '0.92rem' }}>
                  Thanks for flagging this. Our team reviews reports and takes
                  action where needed — we will not always be able to tell you
                  the outcome.
                </p>
                <button className="btn-primary" onClick={close} style={{ marginTop: '0.75rem' }}>Close</button>
              </>
            ) : (
              <form onSubmit={submit}>
                <h3 style={{ margin: '0 0 0.25rem' }}>Report this {noun}</h3>
                {targetName && (
                  <p style={{ color: '#667085', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>{targetName}</p>
                )}

                {error && (
                  <div style={{ background: '#fef3f2', border: '1px solid #fda29b', color: '#b42318', padding: '0.5rem 0.75rem', borderRadius: 6, marginBottom: '0.75rem', fontSize: '0.88rem' }}>
                    {error}
                  </div>
                )}

                <fieldset style={{ border: 'none', padding: 0, margin: '0 0 0.75rem' }}>
                  <legend style={{ fontSize: '0.85rem', color: '#475467', marginBottom: '0.4rem' }}>
                    What is wrong with it?
                  </legend>
                  <div style={{ display: 'grid', gap: '0.35rem' }}>
                    {reasons.map((r) => (
                      <label key={r.value} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="reason"
                          value={r.value}
                          checked={reason === r.value}
                          onChange={() => setReason(r.value)}
                        />
                        {r.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <textarea
                  rows={3}
                  placeholder="Anything else that would help us look into it (optional)"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={1000}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #e4e7ec', borderRadius: 6 }}
                />

                <p style={{ fontSize: '0.78rem', color: '#98a2b3', marginTop: '0.5rem', lineHeight: 1.4 }}>
                  Reports are not anonymous to WorldStreet, but the seller is not
                  told who reported them.
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit report'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
