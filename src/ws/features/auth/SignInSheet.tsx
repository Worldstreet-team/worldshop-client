"use client";
import { useEffect, useRef } from "react";
import { buttonClass } from "@ws/components/ui";
import { cancelSignIn, signIn, useAuthPrompt } from "./session";

export function SignInSheet() {
  const reason = useAuthPrompt();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (reason && !element?.open) element?.showModal();
    else if (!reason && element?.open) element.close();
  }, [reason]);
  return <dialog id="sign-in-sheet" ref={dialog} className="ws-modal" aria-labelledby="sign-in-title" onCancel={cancelSignIn} onClose={cancelSignIn}>
    <div className="ws-modal__panel ws-deal-stack">
      <h2 id="sign-in-title" className="ws-modal__title">Sign in</h2>
      <p>Sign in to {reason ?? "continue"}. We’ll bring you back to what you were doing.</p>
      <p className="ws-deal-muted">You sign in with your WorldStreet account, the same one you use across the WorldStreet apps.</p>
      <button className={buttonClass({})} onClick={signIn}>Continue to sign in</button>
      <button className={buttonClass({ variant: "ghost" })} onClick={cancelSignIn}>Cancel</button>
    </div>
  </dialog>;
}
