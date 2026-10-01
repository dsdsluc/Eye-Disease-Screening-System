// Client for /api/doctor/reviews/[scanId] (DR), /api/doctor/screening-
// reviews/[screeningId] (multi-disease) -- "Ghi chú & xác nhận của bác sĩ"
// (components/doctor/doctor-confirmation-form.tsx) and its multi-disease
// counterpart (components/doctor/screening-confirmation-form.tsx) -- and
// /api/doctor/new-case (components/doctor/new-case-wizard.tsx). Same
// httpOnly-cookie session as lib/account.ts, so these are plain same-origin
// fetches too.

import type { DiseaseLabel, Recommendation } from "@/lib/multidisease";
import type { GlaucomaLabel } from "@/lib/glaucoma";
import type { CataractLabel } from "@/lib/cataract";

export type DoctorReview = {
  id: string;
  scanId: string;
  doctorId: string;
  doctorName: string;
  doctorGrade: number;
  note: string | null;
  followUp: string;
  createdAt: string;
  updatedAt: string;
};

export type ScreeningReview = {
  id: string;
  screeningId: string;
  doctorId: string;
  doctorName: string;
  confirmedLabels: DiseaseLabel[];
  recommendation: Recommendation;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

async function parseOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? fallback);
  }
  return res.json();
}

export async function getDoctorReview(scanId: string): Promise<DoctorReview | null> {
  const res = await fetch(`/api/doctor/reviews/${scanId}`, { cache: "no-store" });
  if (res.status === 404) return null;
  const data = await parseOrThrow<{ review: DoctorReview }>(res, "Không tải được ghi chú bác sĩ.");
  return data.review;
}

export async function saveDoctorReview(
  scanId: string,
  input: { doctorGrade: number; note: string; followUp: string }
): Promise<DoctorReview> {
  const res = await fetch(`/api/doctor/reviews/${scanId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseOrThrow<{ review: DoctorReview }>(res, "Không lưu được ghi chú bác sĩ.");
  return data.review;
}

export async function getScreeningReview(screeningId: string): Promise<ScreeningReview | null> {
  const res = await fetch(`/api/doctor/screening-reviews/${screeningId}`, { cache: "no-store" });
  if (res.status === 404) return null;
  const data = await parseOrThrow<{ review: ScreeningReview }>(res, "Không tải được xác nhận của bác sĩ.");
  return data.review;
}

export async function saveScreeningReview(
  screeningId: string,
  input: { confirmedLabels: DiseaseLabel[]; recommendation: Recommendation; note: string }
): Promise<ScreeningReview> {
  const res = await fetch(`/api/doctor/screening-reviews/${screeningId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseOrThrow<{ review: ScreeningReview }>(res, "Không lưu được xác nhận của bác sĩ.");
  return data.review;
}

export type GlaucomaReview = {
  id: string;
  glaucomaScreeningId: string;
  doctorId: string;
  doctorName: string;
  confirmedLabel: GlaucomaLabel;
  note: string | null;
  followUp: string;
  createdAt: string;
  updatedAt: string;
};

export type CataractReview = {
  id: string;
  cataractScreeningId: string;
  doctorId: string;
  doctorName: string;
  confirmedLabel: CataractLabel;
  note: string | null;
  followUp: string;
  createdAt: string;
  updatedAt: string;
};

export async function getGlaucomaReview(screeningId: string): Promise<GlaucomaReview | null> {
  const res = await fetch(`/api/doctor/glaucoma-reviews/${screeningId}`, { cache: "no-store" });
  if (res.status === 404) return null;
  const data = await parseOrThrow<{ review: GlaucomaReview }>(res, "Không tải được ghi chú bác sĩ.");
  return data.review;
}

export async function saveGlaucomaReview(
  screeningId: string,
  input: { confirmedLabel: GlaucomaLabel; note: string; followUp: string }
): Promise<GlaucomaReview> {
  const res = await fetch(`/api/doctor/glaucoma-reviews/${screeningId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseOrThrow<{ review: GlaucomaReview }>(res, "Không lưu được ghi chú bác sĩ.");
  return data.review;
}

export async function getCataractReview(screeningId: string): Promise<CataractReview | null> {
  const res = await fetch(`/api/doctor/cataract-reviews/${screeningId}`, { cache: "no-store" });
  if (res.status === 404) return null;
  const data = await parseOrThrow<{ review: CataractReview }>(res, "Không tải được ghi chú bác sĩ.");
  return data.review;
}

export async function saveCataractReview(
  screeningId: string,
  input: { confirmedLabel: CataractLabel; note: string; followUp: string }
): Promise<CataractReview> {
  const res = await fetch(`/api/doctor/cataract-reviews/${screeningId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseOrThrow<{ review: CataractReview }>(res, "Không lưu được ghi chú bác sĩ.");
  return data.review;
}

export type NewCaseInput = {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nationalId: string;
  address: string;
  occupation: string;
  bloodType: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  diabetesDurationYears: string;
  hba1c: string;
  bloodPressure: string;
  note: string;
  alsoScreenMultidisease: boolean;
  file: File;
};

export async function createNewCase(
  input: NewCaseInput
): Promise<{ patientId: string; scanId: string; multidiseaseScreeningId: string | null }> {
  const form = new FormData();
  for (const [key, value] of Object.entries(input)) {
    if (key === "file") continue;
    form.append(key, String(value));
  }
  form.append("file", input.file);

  const res = await fetch("/api/doctor/new-case", { method: "POST", body: form });
  return parseOrThrow(res, "Không tạo được ca khám.");
}

export type DoctorProfile = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  specialty: string | null;
  licenseNumber: string | null;
  hospital: string | null;
  yearsOfExperience: number | null;
  education: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export type DoctorProfileInput = {
  fullName: string;
  title: string;
  specialty: string;
  licenseNumber: string;
  hospital: string;
  yearsOfExperience: string;
  phone: string;
  education: string;
  bio: string;
  avatarUrl: string;
};

export async function updateDoctorProfile(input: DoctorProfileInput): Promise<DoctorProfile> {
  const res = await fetch("/api/doctor/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseOrThrow<{ doctor: DoctorProfile }>(res, "Không lưu được hồ sơ bác sĩ.");
  return data.doctor;
}

export type PatientProfile = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  nationalId: string | null;
  address: string | null;
  occupation: string | null;
  bloodType: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  medicalHistory: string | null;
  insuranceNumber: string | null;
  createdAt: string;
};

export type PatientProfileInput = {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nationalId: string;
  address: string;
  occupation: string;
  bloodType: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  medicalHistory: string;
  insuranceNumber: string;
};

export async function updatePatientProfile(patientId: string, input: PatientProfileInput): Promise<PatientProfile> {
  const res = await fetch(`/api/doctor/patients/${patientId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseOrThrow<{ patient: PatientProfile }>(res, "Không lưu được hồ sơ bệnh nhân.");
  return data.patient;
}
