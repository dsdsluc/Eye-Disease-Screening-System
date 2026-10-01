import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function nowLabel() {
  return new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

/** Tiptap's getHTML() returns "<p></p>" (or similar) for an empty document,
 * never "" -- a plain falsy/length check against that HTML string always
 * reads as "has content" even when nothing was typed. Strips tags first so
 * "empty" means what a person looking at the editor would call empty. */
export function isRichTextEmpty(html: string): boolean {
  return html.replace(/<[^>]+>/g, "").trim().length === 0;
}
