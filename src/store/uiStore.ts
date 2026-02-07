import { create } from 'zustand';
import type { Toast } from '@/types/common.types';

interface UIState {
  // Toasts
  toasts: Toast[];
  
  // Modal
  isModalOpen: boolean;
  modalContent: React.ReactNode | null;
  modalTitle?: string;
  
  // Mobile menu
  isMobileMenuOpen: boolean;
  
  // Search
  isSearchOpen: boolean;
  searchQuery: string;
  
  // Cart sidebar
  isCartSidebarOpen: boolean;
  
  // Loading overlay
  isGlobalLoading: boolean;
  loadingMessage?: string;
}

interface UIActions {
  // Toast actions
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // Modal actions
  openModal: (content: React.ReactNode, title?: string) => void;
  closeModal: () => void;
  
  // Mobile menu actions
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  
  // Search actions
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;
  
  // Cart sidebar actions
  openCartSidebar: () => void;
  closeCartSidebar: () => void;
  toggleCartSidebar: () => void;
  
  // Loading actions
  setGlobalLoading: (loading: boolean, message?: string) => void;
}

const initialState: UIState = {
  toasts: [],
  isModalOpen: false,
  modalContent: null,
  modalTitle: undefined,
  isMobileMenuOpen: false,
  isSearchOpen: false,
  searchQuery: '',
  isCartSidebarOpen: false,
  isGlobalLoading: false,
  loadingMessage: undefined,
};

export const useUIStore = create<UIState & UIActions>()((set, get) => ({
  ...initialState,

  // Toast actions
  addToast: (toast) => {
    const id = crypto.randomUUID();
    const newToast: Toast = { ...toast, id };
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto remove after duration (default 5 seconds)
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },

  // Modal actions
  openModal: (content, title) => {
    set({
      isModalOpen: true,
      modalContent: content,
      modalTitle: title,
    });
  },

  closeModal: () => {
    set({
      isModalOpen: false,
      modalContent: null,
      modalTitle: undefined,
    });
  },

  // Mobile menu actions
  toggleMobileMenu: () => {
    set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen }));
  },

  closeMobileMenu: () => {
    set({ isMobileMenuOpen: false });
  },

  // Search actions
  openSearch: () => {
    set({ isSearchOpen: true });
  },

  closeSearch: () => {
    set({ isSearchOpen: false, searchQuery: '' });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  // Cart sidebar actions
  openCartSidebar: () => {
    set({ isCartSidebarOpen: true });
  },

  closeCartSidebar: () => {
    set({ isCartSidebarOpen: false });
  },

  toggleCartSidebar: () => {
    set((state) => ({ isCartSidebarOpen: !state.isCartSidebarOpen }));
  },

  // Loading actions
  setGlobalLoading: (loading, message) => {
    set({
      isGlobalLoading: loading,
      loadingMessage: loading ? message : undefined,
    });
  },
}));

// Convenience functions for toasts
export const toast = {
  success: (message: string, duration?: number) => 
    useUIStore.getState().addToast({ type: 'success', message, duration }),
  
  error: (message: string, duration?: number) => 
    useUIStore.getState().addToast({ type: 'error', message, duration }),
  
  warning: (message: string, duration?: number) => 
    useUIStore.getState().addToast({ type: 'warning', message, duration }),
  
  info: (message: string, duration?: number) => 
    useUIStore.getState().addToast({ type: 'info', message, duration }),
};
