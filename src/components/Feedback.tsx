import type { ActionState } from "@/lib/action";

export function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error) return <div className="alert error" role="alert">{state.error}</div>;
  if (state.ok) return <div className="alert ok" role="status">{state.ok}</div>;
  return null;
}
