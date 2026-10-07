"use client";

import { signIn } from "next-auth/react";
import { GoogleIcon } from "@/components/icons";

interface SignInPromptProps {
  open: boolean;
  onClose: () => void;
  /** Where Google sends the user back to after signing in. */
  callbackUrl: string;
  message: string;
}

/** Shown the first time someone tries to submit a listing or an ad — we
 * need an account to know who a submission belongs to (so it can be edited
 * later), so this is the one gate before anything gets posted. */
export default function SignInPrompt({ open, onClose, callbackUrl, message }: SignInPromptProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card-elevated w-full max-w-sm p-6 text-center">
        <p className="text-lg font-bold text-[color:var(--foreground)]">Sign in to continue</p>
        <p className="mt-1.5 text-sm text-[color:var(--muted)]">{message}</p>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-full border border-[rgba(43,22,8,0.15)] bg-white py-2.5 text-sm font-semibold text-[color:var(--foreground)] shadow-sm transition-colors hover:bg-[rgba(43,22,8,0.03)]"
        >
          <GoogleIcon className="h-5 w-5" />
          Continue with Google
        </button>
        <button type="button" onClick={onClose} className="btn-ghost mt-2 w-full justify-center py-2 text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
