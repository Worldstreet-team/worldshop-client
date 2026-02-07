import { useUIStore } from '@/store/uiStore';

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`toast toast-${toast.type}`}
          role="alert"
        >
          <div className="toast-icon">
            {toast.type === 'success' && <span className="material-icons">check_circle</span>}
            {toast.type === 'error' && <span className="material-icons">error</span>}
            {toast.type === 'warning' && <span className="material-icons">warning</span>}
            {toast.type === 'info' && <span className="material-icons">info</span>}
          </div>
          <p className="toast-message">{toast.message}</p>
          <button 
            className="toast-close"
            onClick={() => removeToast(toast.id)}
            aria-label="Close notification"
          >
            <span className="material-icons">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}
