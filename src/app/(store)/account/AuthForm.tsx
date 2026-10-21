"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type AuthState } from "@/app/actions/auth";
import { LogoMark } from "@/components/Logo";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? loginAction : registerAction, {});
  const f = state.fields ?? {};
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="container-x grid min-h-[70vh] place-items-center py-14">
      <div className="card w-full max-w-md p-8 sm:p-10">
        <LogoMark className="mx-auto h-7 w-auto" />
        <h1 className="mt-5 text-center font-display text-3xl">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-2 text-center text-sm text-muted">{mode === "login" ? "Sign in to view orders and check out faster." : "Track orders and save your delivery details."}</p>
        <form action={action} className="mt-8 space-y-4" noValidate>
          <input type="hidden" name="next" value={next} />
          {state.error && <p role="alert" className="rounded-lg bg-danger/5 p-3 text-sm text-danger">{state.error}</p>}
          {mode === "register" && (
            <div>
              <label htmlFor="a-name" className="label">Full name</label>
              <input id="a-name" name="name" autoComplete="name" required className="input" aria-invalid={!!f.name} />
              {f.name && <p className="field-error">{f.name}</p>}
            </div>
          )}
          <div>
            <label htmlFor="a-email" className="label">Email</label>
            <input id="a-email" name="email" type="email" autoComplete="email" required className="input" aria-invalid={!!f.email} />
            {f.email && <p className="field-error">{f.email}</p>}
          </div>
          <div>
            <label htmlFor="a-pw" className="label">Password</label>
            <input id="a-pw" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required className="input" aria-invalid={!!f.password} />
            {f.password && <p className="field-error">{f.password}</p>}
            {mode === "register" && !f.password && <p className="mt-1 text-xs text-muted">At least 10 characters with a letter and a number.</p>}
          </div>
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {mode === "login" ? (
            <>New to Summit Kitchen? <Link href={`/account/register${q}`} className="font-semibold text-olive underline">Create an account</Link></>
          ) : (
            <>Already have an account? <Link href={`/account/login${q}`} className="font-semibold text-olive underline">Sign in</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
