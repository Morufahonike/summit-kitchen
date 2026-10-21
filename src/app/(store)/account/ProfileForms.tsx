"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction, type AuthState } from "@/app/actions/auth";
import { COUNTRIES } from "@/lib/countries";

type Addr = { fullName: string; line1: string; line2: string; city: string; state: string; postalCode: string; country: string };

export function ProfileForms({ user, address }: { user: { name: string; email: string; phone: string }; address: Addr | null }) {
  const [p, pAction, pPending] = useActionState<AuthState, FormData>(updateProfileAction, {});
  const [pw, pwAction, pwPending] = useActionState<AuthState, FormData>(changePasswordAction, {});
  const a = address ?? { fullName: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "NG" };
  return (
    <div className="space-y-8">
      <form action={pAction} className="card space-y-4 p-6">
        <h2 className="font-display text-2xl">Details & address</h2>
        {p.ok && <p role="status" className="text-sm text-olive">Saved.</p>}
        <p className="text-sm text-muted">{user.email}</p>
        <div><label className="label" htmlFor="p-name">Name</label><input id="p-name" name="name" defaultValue={user.name} className="input" />{p.fields?.name && <p className="field-error">{p.fields.name}</p>}</div>
        <div><label className="label" htmlFor="p-phone">Phone</label><input id="p-phone" name="phone" type="tel" defaultValue={user.phone} className="input" />{p.fields?.phone && <p className="field-error">{p.fields.phone}</p>}</div>
        <div><label className="label" htmlFor="p-l1">Street address</label><input id="p-l1" name="line1" defaultValue={a.line1} className="input" /></div>
        <div><label className="label" htmlFor="p-l2">Apartment (optional)</label><input id="p-l2" name="line2" defaultValue={a.line2} className="input" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="p-city">City</label><input id="p-city" name="city" defaultValue={a.city} className="input" /></div>
          <div><label className="label" htmlFor="p-state">State</label><input id="p-state" name="state" defaultValue={a.state} className="input" /></div>
          <div><label className="label" htmlFor="p-pc">Postal code</label><input id="p-pc" name="postalCode" defaultValue={a.postalCode} className="input" /></div>
          <div><label className="label" htmlFor="p-c">Country</label><select id="p-c" name="country" defaultValue={a.country} className="input">{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
        </div>
        <input type="hidden" name="fullName" value={a.fullName} />
        <button className="btn-primary w-full" disabled={pPending}>{pPending ? "Saving…" : "Save details"}</button>
      </form>
      <form action={pwAction} className="card space-y-4 p-6">
        <h2 className="font-display text-2xl">Change password</h2>
        {pw.ok && <p role="status" className="text-sm text-olive">Password updated. Other devices have been signed out.</p>}
        {pw.error && <p role="alert" className="text-sm text-danger">{pw.error}</p>}
        <div><label className="label" htmlFor="pw-c">Current password</label><input id="pw-c" name="current" type="password" autoComplete="current-password" className="input" />{pw.fields?.current && <p className="field-error">{pw.fields.current}</p>}</div>
        <div><label className="label" htmlFor="pw-n">New password</label><input id="pw-n" name="password" type="password" autoComplete="new-password" className="input" />{pw.fields?.password && <p className="field-error">{pw.fields.password}</p>}</div>
        <button className="btn-outline w-full" disabled={pwPending}>{pwPending ? "Updating…" : "Update password"}</button>
      </form>
    </div>
  );
}
