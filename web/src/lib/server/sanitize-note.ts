import sanitizeHtml from "sanitize-html";

import { isRichTextEmpty } from "@/lib/utils";

// Matches RichNoteEditor's own extension set (components/doctor/rich-note-
// editor.tsx) -- bold/italic/lists/line breaks only. Sanitizing server-side,
// not just trusting Tiptap's controlled output, because this HTML is stored
// and will eventually be rendered elsewhere (e.g. a read-only case view for
// a second doctor) -- a defense-in-depth boundary check, same as any other
// input validation, not something that can only ever come from this form.
// Shared by both doctor-review routes (DR and multi-disease) so their notes
// can't quietly drift to different allowed-tag sets over time.
const NOTE_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "strong", "em", "ul", "ol", "li", "br"],
  allowedAttributes: {},
};

/** Returns null for an empty/whitespace-only note (so it stores as SQL NULL
 * instead of a stray "<p></p>"), otherwise the sanitized HTML. */
export function sanitizeNote(raw: string): string | null {
  return isRichTextEmpty(raw) ? null : sanitizeHtml(raw, NOTE_SANITIZE_OPTIONS);
}
