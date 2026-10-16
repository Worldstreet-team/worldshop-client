import { useEffect } from "react";
import { toast } from "@ws/components/ui";
import { useUIStore } from "@/shared/store/uiStore";

/*
 * The legacy pages still call uiStore's addToast, but the layout that rendered those
 * toasts (MainLayout's ToastContainer) is gone from the new shell. Each one is handed
 * to the shell's own toast stack and dropped from the store, so a save on an embedded
 * legacy page still says it saved.
 */
const TONE = { success: "gain", error: "loss", warning: "warning", info: undefined } as const;

export function LegacyToasts() {
  useEffect(
    () =>
      useUIStore.subscribe((state) => {
        for (const t of state.toasts) {
          toast({ message: t.description ? `${t.message}. ${t.description}` : t.message, tone: TONE[t.type], duration: t.duration });
          state.removeToast(t.id);
        }
      }),
    [],
  );
  return null;
}
