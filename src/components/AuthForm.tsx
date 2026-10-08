"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/action";
import { Feedback } from "./Feedback";

export function AuthForm({
  action,
  submit,
  newPassword,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  submit: string;
  newPassword?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="stack">
      <label>
        البريد الإلكتروني
        <input name="email" type="email" required autoComplete="email" className="ltr" />
      </label>
      <label>
        كلمة المرور
        <input
          name="password"
          type="password"
          required
          minLength={newPassword ? 8 : undefined}
          autoComplete={newPassword ? "new-password" : "current-password"}
        />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "جارٍ التنفيذ…" : submit}
      </button>
      <Feedback state={state} />
    </form>
  );
}
