"use client";

import { useFormState, useFormStatus } from "react-dom";

import { initialState, triggerByronIngest, type ActionState } from "./actions";

const SubmitButton = () => {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
    >
      {pending ? "Ingesting..." : "Re-ingest Byron DCP"}
    </button>
  );
};

export function AdminByronIngestForm({ token }: { token: string }) {
  const [state, formAction] = useFormState<ActionState, FormData>(triggerByronIngest, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <SubmitButton />

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      {state.result ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-900">
          <p className="mb-2 font-semibold">Ingest response</p>
          <pre className="overflow-auto text-xs text-slate-800">{JSON.stringify(state.result, null, 2)}</pre>
        </div>
      ) : null}
    </form>
  );
}
