"use client";

import type { ChangeEvent, ReactNode } from "react";

interface BaseProps {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
}

function Label({ name, label, required, hint }: BaseProps) {
  return (
    <span className="field__label">
      <label htmlFor={name}>
        {label}
        {required && <span className="field__req"> *</span>}
      </label>
      {hint && <span className="field__hint">{hint}</span>}
    </span>
  );
}

export function TextField({
  name,
  label,
  required,
  hint,
  type = "text",
  value,
  onChange,
  placeholder,
}: BaseProps & {
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="field">
      <Label name={name} label={label} required={required} hint={hint} />
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field__control"
      />
    </div>
  );
}

export function TextArea({
  name,
  label,
  required,
  hint,
  value,
  onChange,
  rows = 4,
  placeholder,
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div className="field field--wide">
      <Label name={name} label={label} required={required} hint={hint} />
      <textarea
        id={name}
        name={name}
        required={required}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field__control"
      />
    </div>
  );
}

export function SelectField({
  name,
  label,
  required,
  hint,
  value,
  onChange,
  options,
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="field">
      <Label name={name} label={label} required={required} hint={hint} />
      <select
        id={name}
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field__control"
      >
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FileField({
  name,
  label,
  hint,
  onChange,
}: BaseProps & {
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="field field--wide">
      <Label name={name} label={label} hint={hint} />
      <input
        id={name}
        name={name}
        type="file"
        multiple
        accept="image/*,.pdf"
        onChange={onChange}
        className="field__control field__control--file"
      />
    </div>
  );
}

export function FormRow({ children }: { children: ReactNode }) {
  return <div className="form-row">{children}</div>;
}

/**
 * Off-screen honeypot field. Real visitors never see or fill it; bots that
 * auto-fill every input give themselves away. Read in the form's submit
 * handler via FormData and discarded server-side if populated.
 */
export function Honeypot() {
  return (
    <div className="hp-field" aria-hidden="true">
      <label htmlFor="hp_website">Leave this field empty</label>
      <input
        id="hp_website"
        name="hp_website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}

/** Reads the honeypot value from a submitted form element. */
export function readHoneypot(form: HTMLFormElement): string {
  return String(new FormData(form).get("hp_website") ?? "");
}

export function FormFeedback({
  status,
  error,
  successMessage,
}: {
  status: "idle" | "submitting" | "success" | "error";
  error?: string;
  successMessage: string;
}) {
  if (status === "success") {
    return (
      <p className="form-feedback form-feedback--ok" role="status">
        {successMessage}
      </p>
    );
  }
  if (status === "error") {
    return (
      <p className="form-feedback form-feedback--err" role="alert">
        {error ?? "Something went wrong. Please retry."}
      </p>
    );
  }
  return null;
}
