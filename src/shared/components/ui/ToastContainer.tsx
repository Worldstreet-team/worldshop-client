import { BadgeCheck, XCircle, AlertTriangle, Bell, X } from 'lucide-react';
import { useUIStore } from '@/shared/store/uiStore';

// 04-components defines three tones (Success / Danger / Neutral). The store's
// `warning` and `info` both land on Neutral's neutral chrome, differing only in
// the leading icon.
const TONE: Record<string, { cls: string; Icon: typeof BadgeCheck }> = {
  success: { cls: 'ws-toast--success', Icon: BadgeCheck },
  error: { cls: 'ws-toast--danger', Icon: XCircle },
  warning: { cls: 'ws-toast--neutral', Icon: AlertTriangle },
  info: { cls: 'ws-toast--neutral', Icon: Bell },
};

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="ws ws-toasts">
      {toasts.map((toast) => {
        const tone = TONE[toast.type] ?? TONE.info;
        const Icon = toast.icon ?? tone.Icon;

        return (
          <div key={toast.id} className={`ws-toast ${tone.cls}`} role="alert">
            <span className={`ws-toast__icon${toast.icon ? ' ws-toast__icon--fill' : ''}`} aria-hidden>
              <Icon size={18} />
            </span>
            <div className="ws-toast__text">
              <p className="ws-toast__title">{toast.message}</p>
              {toast.description && <p className="ws-toast__desc">{toast.description}</p>}
            </div>
            <button
              className="ws-toast__close"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
            >
              <X size={15} aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
