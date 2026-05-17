"use client";

import { useState, type FormEvent } from "react";
import { submitInquiry } from "@/lib/submit";
import { TextField, TextArea, SelectField, FormRow, FormFeedback } from "./fields";

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
const YES_NO = ["Yes", "No", "Not sure yet"];

const empty = {
  name: "",
  email: "",
  phone: "",
  company: "",
  project_name: "",
  project_type: "",
  city: "",
  event_date: "",
  rental_start: "",
  rental_end: "",
  budget: "",
  delivery_needed: "",
  pickup_possible: "",
  notes: "",
};

export function RentalRequestForm({
  selectedItems,
  onSubmitted,
}: {
  selectedItems: { id: string; title: string }[];
  onSubmitted?: () => void;
}) {
  const [f, setF] = useState(empty);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string>();

  const set = (k: keyof typeof empty) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(undefined);
    const res = await submitInquiry("rental", f, { selected_items: selectedItems });
    if (res.ok) {
      setStatus("success");
      setF(empty);
      onSubmitted?.();
    } else {
      setStatus("error");
      setError(res.error);
    }
  }

  if (status === "success") {
    return (
      <FormFeedback
        status="success"
        successMessage="Rental request received. Availability is confirmed manually — we'll come back to you with a hold and a quote."
      />
    );
  }

  return (
    <form className="form" onSubmit={onSubmit}>
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
        <TextField
          name="company"
          label="Company / studio"
          value={f.company}
          onChange={set("company")}
        />
      </FormRow>
      <FormRow>
        <TextField
          name="project_name"
          label="Project name"
          value={f.project_name}
          onChange={set("project_name")}
        />
        <SelectField
          name="project_type"
          label="Project type"
          required
          value={f.project_type}
          onChange={set("project_type")}
          options={PROJECT_TYPES}
        />
      </FormRow>
      <FormRow>
        <TextField name="city" label="City" required value={f.city} onChange={set("city")} />
        <TextField
          name="event_date"
          label="Event date"
          type="date"
          value={f.event_date}
          onChange={set("event_date")}
        />
      </FormRow>
      <FormRow>
        <TextField
          name="rental_start"
          label="Rental start"
          type="date"
          value={f.rental_start}
          onChange={set("rental_start")}
        />
        <TextField
          name="rental_end"
          label="Rental end"
          type="date"
          value={f.rental_end}
          onChange={set("rental_end")}
        />
      </FormRow>
      <FormRow>
        <SelectField
          name="delivery_needed"
          label="Delivery needed?"
          value={f.delivery_needed}
          onChange={set("delivery_needed")}
          options={YES_NO}
        />
        <SelectField
          name="pickup_possible"
          label="Pickup possible?"
          value={f.pickup_possible}
          onChange={set("pickup_possible")}
          options={YES_NO}
        />
      </FormRow>
      <FormRow>
        <TextField
          name="budget"
          label="Budget"
          hint="A range is fine. Flexible deals exist for cultural work."
          value={f.budget}
          onChange={set("budget")}
        />
      </FormRow>
      <TextArea
        name="notes"
        label="Notes"
        rows={4}
        value={f.notes}
        onChange={set("notes")}
        placeholder="Anything else we should know — the room, the references, the constraints."
      />

      <FormFeedback status={status} error={error} successMessage="" />
      <button type="submit" className="btn btn--accent" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Submit rental request"}
      </button>
    </form>
  );
}
