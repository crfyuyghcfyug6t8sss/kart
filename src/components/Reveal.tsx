"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/action";
import { Feedback } from "./Feedback";

/** Fetches sensitive data on demand (card details / PIN) and shows it only in this browser. */
export function Reveal({
  action,
  label,
  fields,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  label: string;
  fields: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const data = state?.data;
  if (data) {
    if (data.url) {
      return (
        <a href={data.url} target="_blank" rel="noreferrer noopener" className="btn secondary">
          فتح صفحة بيانات البطاقة
        </a>
      );
    }
    return (
      <div className="stack" style={{ gap: 6 }}>
        {Object.entries(fields).map(([key, title]) => (
          <div key={key} className="row between">
            <span className="muted">{title}</span>
            <strong className="ltr" style={{ fontVariantNumeric: "tabular-nums" }}>
              {data[key] || "—"}
            </strong>
          </div>
        ))}
      </div>
    );
  }
  return (
    <form action={formAction}>
      <button type="submit" className="secondary" disabled={pending}>
        {pending ? "جارٍ التحميل…" : label}
      </button>
      <Feedback state={state?.error ? state : null} />
    </form>
  );
}
