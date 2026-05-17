"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { submitInquiry } from "@/lib/submit";
import {
  TextField,
  TextArea,
  SelectField,
  FileField,
  FormRow,
  FormFeedback,
  Honeypot,
  readHoneypot,
} from "./fields";

const PROJECT_TYPES = [
  "Music / touring",
  "Fashion / editorial",
  "Nightlife / club",
  "Festival",
  "Brand activation",
  "Film / photo",
  "Private / cultural",
  "Other",
];

const empty = {
  name: "",
  email: "",
  phone: "",
  project_type: "",
  city: "",
  deadline: "",
  budget: "",
  what_are_you_trying_to_make_happen: "",
  consulting_needed_for: "",
};

export function ConsultForm() {
  const [f, setF] = useState(empty);
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string>();

  const set = (k: keyof typeof empty) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files ?? []).map((x) => ({ name: x.name, size: x.size })));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const hp = readHoneypot(e.currentTarget);
    setStatus("submitting");
    setError(undefined);
    const res = await submitInquiry("consult", f, { attachments: files, hp });
    if (res.ok) {
      setStatus("success");
      setF(empty);
      setFiles([]);
    } else {
      setStatus("error");
      setError(res.error);
    }
  }

  if (status === "success") {
    return (
      <FormFeedback
        status="success"
        successMessage="Consult request received. Rader will be in touch directly — usually within two business days."
      />
    );
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <Honeypot />
      <FormRow>
        <TextField name="name" label="Name" required value={f.name} onChange={set("name")} />
        <TextField
          name="email"
          label="Email"
          type="email"
          required
          value={f.email}
          onChange={set("email")}
        />
      </FormRow>
      <FormRow>
        <TextField
          name="phone"
          label="Phone"
          type="tel"
          value={f.phone}
          onChange={set("phone")}
        />
        <TextField name="city" label="City" required value={f.city} onChange={set("city")} />
      </FormRow>
      <FormRow>
        <SelectField
          name="project_type"
          label="Project type"
          required
          value={f.project_type}
          onChange={set("project_type")}
          options={PROJECT_TYPES}
        />
        <TextField
          name="deadline"
          label="Deadline"
          type="date"
          value={f.deadline}
          onChange={set("deadline")}
        />
      </FormRow>
      <FormRow>
        <TextField
          name="budget"
          label="Budget"
          hint="A range is fine. We make room for meaningful work."
          value={f.budget}
          onChange={set("budget")}
        />
      </FormRow>
      <TextArea
        name="what_are_you_trying_to_make_happen"
        label="What are you trying to make happen?"
        required
        rows={5}
        value={f.what_are_you_trying_to_make_happen}
        onChange={set("what_are_you_trying_to_make_happen")}
        placeholder="The project, the problem, the world you're building. Paste reference links here too."
      />
      <TextArea
        name="consulting_needed_for"
        label="What do you need consulting for?"
        rows={3}
        value={f.consulting_needed_for}
        onChange={set("consulting_needed_for")}
        placeholder="Sourcing, creative direction, logistics, infrastructure, problem-solving…"
      />
      <FileField
        name="references_upload"
        label="References"
        hint="Attach images or PDFs. Large files can also be linked in the message above."
        onChange={onFiles}
      />
      {files.length > 0 && (
        <p className="form-files">{files.map((x) => x.name).join(", ")}</p>
      )}

      <FormFeedback status={status} error={error} successMessage="" />
      <button type="submit" className="btn btn--accent" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Request consult"}
      </button>
    </form>
  );
}
