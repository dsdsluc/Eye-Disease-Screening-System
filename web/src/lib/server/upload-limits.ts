import { NextResponse } from "next/server";

// Mirrors inference/main.py's MAX_UPLOAD_BYTES (plans/archetechture.txt
// audit finding #3, 2026-09-04/06) -- kept in sync by hand since web/ and
// inference/ are separate processes/languages with nothing shared between
// them. 20MB comfortably covers real photos (the largest sample image in
// this repo is ~5.6MB).
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Rejects a request based on its Content-Length header ALONE, before the
 * body is read at all -- every real client hitting these routes (a browser
 * fetch() with a File/FormData body) sets this header accurately for a
 * known-size upload, so this catches the common case for free and for
 * (near) zero cost: no formData()/arrayBuffer() call, no buffering.
 *
 * This was added after discovering that inference/'s own MAX_UPLOAD_BYTES
 * check (main.py's _save_upload_to_temp) only guards inference/ itself --
 * every route here was still calling req.formData()/file.arrayBuffer(),
 * which buffers the ENTIRE upload into this Node process's memory BEFORE
 * ever forwarding to inference, regardless of what inference would go on to
 * do with it. Six routes had this gap (cataract, cataract/crop-preview,
 * glaucoma, multidisease, scans, doctor/new-case); this is the one guard
 * point for all of them.
 *
 * Known gap: a client that omits Content-Length (e.g. deliberately using
 * chunked transfer-encoding) bypasses this check entirely -- catching that
 * would require streaming the body with a running byte cap instead of a
 * single header check, a bigger change not done here. Low priority while
 * this system has no untrusted public traffic yet.
 */
export function rejectIfTooLarge(req: Request): NextResponse | null {
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File quá lớn (giới hạn ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB).` },
      { status: 413 }
    );
  }
  return null;
}
