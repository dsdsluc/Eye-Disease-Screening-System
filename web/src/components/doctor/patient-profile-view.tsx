"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import type { PatientProfile } from "@/lib/doctor";
import { PatientProfileCard } from "@/components/doctor/patient-profile-card";
import { PatientProfileEditForm } from "@/components/doctor/patient-profile-edit-form";

/** Owns the view/edit toggle for the patient chart's profile card
 * (app/doctor/patients/[id]) -- same small client-wrapper shape as
 * DoctorProfileView, kept separate from PatientProfileCard so that stays a
 * plain presentational component. No canEdit gate here (unlike
 * DoctorProfileView's session.id === doctor.id check): every /doctor/* page
 * is still auth-only, not per-doctor-scoped, matching PATCH /api/doctor/
 * patients/[id]'s own current phase-1 scope. */
export function PatientProfileView({ patient: initialPatient }: { patient: PatientProfile }) {
  const [patient, setPatient] = useState(initialPatient);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <PatientProfileEditForm
        patient={patient}
        onCancel={() => setEditing(false)}
        onSaved={(updated) => {
          setPatient(updated);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 self-end text-sm font-medium text-teal-deep transition-colors hover:text-teal"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
        Chỉnh sửa hồ sơ
      </button>
      <PatientProfileCard patient={patient} />
    </div>
  );
}
