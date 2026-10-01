"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import type { DoctorProfile } from "@/lib/doctor";
import { DoctorProfileCard } from "@/components/doctor/doctor-profile-card";
import { DoctorProfileEditForm } from "@/components/doctor/doctor-profile-edit-form";

/** Owns the view/edit toggle for /doctor/profile -- kept as one small
 * client wrapper instead of making DoctorProfileCard itself stateful, so
 * the card stays a plain presentational component (easy to reuse read-only
 * elsewhere later, e.g. a "xem hồ sơ bác sĩ" link from a patient-facing
 * page). `canEdit` comes from the server page (session.id === doctor.id)
 * -- this component doesn't re-check identity, it just doesn't render the
 * edit entry point when the page didn't grant it. */
export function DoctorProfileView({ doctor: initialDoctor, canEdit }: { doctor: DoctorProfile; canEdit: boolean }) {
  const [doctor, setDoctor] = useState(initialDoctor);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <DoctorProfileEditForm
        doctor={doctor}
        onCancel={() => setEditing(false)}
        onSaved={(updated) => {
          setDoctor(updated);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 self-end text-sm font-medium text-teal-deep transition-colors hover:text-teal"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
          Chỉnh sửa hồ sơ
        </button>
      )}
      <DoctorProfileCard doctor={doctor} />
    </div>
  );
}
