"use client";

import { createContext, useActionState, useContext } from "react";
import { useFormStatus } from "react-dom";
import type { AdminState } from "@/app/actions/admin";

const StateCtx = createContext<AdminState>({});

export function ActionForm({
  action,
  children,
  className = "",
  confirm,
}: {
  action: (prev: AdminState, formData: FormData) => Promise<AdminState>;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <StateCtx.Provider value={state}>
      <form
        action={formAction}
        className={className}
        onSubmit={(e) => {
          if (confirm && !window.confirm(confirm)) e.preventDefault();
        }}
      >
        {state.error && <p role="alert" className="mb-3 rounded-lg bg-danger/5 p-3 text-sm text-danger">{state.error}</p>}
        {state.message && <p role="status" className="mb-3 rounded-lg bg-olive/10 p-3 text-sm text-olive">{state.message}</p>}
        {children}
      </form>
    </StateCtx.Provider>
  );
}

export function FieldError({ name }: { name: string }) {
  const s = useContext(StateCtx);
  const msg = s.fields?.[name];
  return msg ? <p className="field-error">{msg}</p> : null;
}

export function Submit({ children, className = "btn-primary", pendingLabel = "Saving…" }: { children: React.ReactNode; className?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
