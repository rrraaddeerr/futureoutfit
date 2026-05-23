"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AccessForm({ from }: { from: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "submitting" }
    | { kind: "error"; message: string }
    | { kind: "welcome"; label: string }
  >({ kind: "idle" });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code.trim() || status.kind === "submitting") return;
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, from }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        label?: string;
        redirect?: string;
      };
      if (!res.ok || !data.ok) {
        setStatus({
          kind: "error",
          message: data.error ?? "Something went sideways. Try again.",
        });
        return;
      }
      setStatus({ kind: "welcome", label: data.label ?? "Guest" });
      const dest = data.redirect ?? from ?? "/";
      setTimeout(() => {
        router.push(dest);
        router.refresh();
      }, 900);
    } catch {
      setStatus({
        kind: "error",
        message: "Couldn't reach the door. Try again.",
      });
    }
  }

  if (status.kind === "welcome") {
    return (
      <div className="access-form access-form--welcome" role="status" aria-live="polite">
        <div className="access-form__welcome-label">Welcome, {status.label}.</div>
        <div className="access-form__welcome-sub">Stepping inside…</div>
      </div>
    );
  }

  return (
    <form className="access-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="access-code" className="access-form__label">
        Invite code
      </label>
      <div className="access-form__row">
        <input
          id="access-code"
          name="code"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (status.kind === "error") setStatus({ kind: "idle" });
          }}
          placeholder="ENTER CODE"
          className="access-form__input"
          disabled={status.kind === "submitting"}
          aria-invalid={status.kind === "error"}
          aria-describedby={status.kind === "error" ? "access-error" : undefined}
        />
        <button
          type="submit"
          className="access-form__submit"
          disabled={status.kind === "submitting" || !code.trim()}
        >
          {status.kind === "submitting" ? "Opening…" : "Open"}
        </button>
      </div>
      {status.kind === "error" ? (
        <div id="access-error" className="access-form__error" role="alert">
          {status.message}
        </div>
      ) : null}
    </form>
  );
}
