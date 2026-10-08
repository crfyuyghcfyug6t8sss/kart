"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/action";
import { Feedback } from "./Feedback";

/** Generic form bound to a server action, with pending state and result message. */
export function ActionForm({
  action,
  children,
  submit,
  variant,
  confirm,
  className = "stack",
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  children?: React.ReactNode;
  submit: string;
  variant?: "secondary" | "danger";
  confirm?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <div>
        <button type="submit" className={variant} disabled={pending}>
          {pending ? "جارٍ التنفيذ…" : submit}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
