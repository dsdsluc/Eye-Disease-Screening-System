// Shared between every doctor-side patient display (patient-card.tsx,
// patient-profile-card.tsx, app/doctor/patients/[id]/page.tsx) so gender
// labels and age math can't drift between them.

export const GENDER_LABEL: Record<string, string> = { female: "Nữ", male: "Nam", other: "Khác" };

export const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: "female", label: "Nữ" },
  { value: "male", label: "Nam" },
  { value: "other", label: "Khác" },
];

export const BLOOD_TYPE_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export function ageFrom(dateOfBirth: Date | string): number {
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthdayThisYear =
    now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthdayThisYear) age -= 1;
  return age;
}
