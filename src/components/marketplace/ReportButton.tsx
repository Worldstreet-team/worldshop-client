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
import { toApiError } from '@/services/api';

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

const errMessage = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  const fieldError = e.errors && Object.values(e.errors)[0];
  return fieldError || e.message;
};
const errStatus = (err: unknown) => toApiError(err, '').statusCode;

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
      <button type="button" onClick={openDialog} className="ws-btn ws-btn--link ws-caption">
        {label}
      </button>

      {open && (
        <div
          className="ws ws-scrim"
          role="dialog"
          aria-modal="true"
          aria-label={`Report this ${noun}`}
          onClick={close}
        >
          <div className="ws-modal" onClick={(e) => e.stopPropagation()}>
            {done ? (
              <>
                <div className="ws-modal__head">
                  <h3 className="ws-modal__title">Report received</h3>
                </div>
                <p className="ws-modal__body">
                  Thanks for flagging this. Our team reviews reports and takes
                  action where needed — we will not always be able to tell you
                  the outcome.
                </p>
                <div className="ws-modal__foot">
                  <button className="ws-btn ws-btn--primary" onClick={close}>Close</button>
                </div>
              </>
            ) : (
              <form onSubmit={submit} className="ws-stack">
                <div className="ws-modal__head">
                  <div>
                    <h3 className="ws-modal__title">Report this {noun}</h3>
                    {targetName && <p className="ws-caption ws-muted">{targetName}</p>}
                  </div>
                </div>

                {error && (
                  <div className="ws-alert" role="alert">
                    <span>{error}</span>
                  </div>
                )}

                <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                  <legend className="ws-formfield__label" style={{ marginBottom: 'var(--ws-space-2)' }}>
                    What is wrong with it?
                  </legend>
                  <div className="ws-stack">
                    {reasons.map((r) => (
                      <label key={r.value} className="ws-check">
                        <input
                          type="radio"
                          name="reason"
                          className="ws-check__input"
                          value={r.value}
                          checked={reason === r.value}
                          onChange={() => setReason(r.value)}
                        />
                        <span className="ws-check__label">{r.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <textarea
                  className="ws-textarea"
                  rows={3}
                  placeholder="Anything else that would help us look into it (optional)"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={1000}
                />

                <p className="ws-caption ws-subtle">
                  Reports are not anonymous to WorldStreet, but the seller is not
                  told who reported them.
                </p>

                <div className="ws-modal__foot">
                  <button type="button" className="ws-btn ws-btn--ghost" onClick={close}>Cancel</button>
                  <button type="submit" className="ws-btn ws-btn--primary" disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
