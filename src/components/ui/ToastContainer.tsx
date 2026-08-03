import { CheckCircle2, XCircle, AlertTriangle, Bell, X } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

// 04-components defines three tones (Success / Danger / Neutral). The store's
// `warning` and `info` both land on Neutral's neutral chrome, differing only in
// the leading icon.
const TONE: Record<string, { cls: string; Icon: typeof CheckCircle2 }> = {
  success: { cls: 'ws-toast--success', Icon: CheckCircle2 },
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
        const { cls, Icon } = TONE[toast.type] ?? TONE.info;

        return (
          <div key={toast.id} className={`ws-toast ${cls}`} role="alert">
            <Icon size={16} aria-hidden />
            <p>{toast.message}</p>
            <button
              className="ws-toast__close"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
            >
              <X size={13} aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
