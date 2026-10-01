"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered } from "lucide-react";

import { cn } from "@/lib/utils";

// Headings/blockquote/code-block/hr are all disabled -- a clinical note is
// short-form (bold, italic, line breaks, bullet/numbered lists), not a
// structured document; StarterKit's other defaults (bold/italic/lists/
// history) cover exactly what was asked for without a bespoke extension
// list to maintain.
function makeExtensions(placeholder: string) {
  return [
    StarterKit.configure({ heading: false, blockquote: false, codeBlock: false, horizontalRule: false }),
    Placeholder.configure({ placeholder }),
  ];
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      // Clicking a toolbar button would otherwise blur the editor first
      // (losing the text selection bold/italic needs to apply to) before
      // the click handler runs.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        active ? "bg-teal/15 text-teal-deep" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

/** Rich-text replacement for the old plain `<textarea>` behind "Ghi chú lâm
 * sàng thêm" -- bold, italic, line breaks, and bullet/numbered lists, saved
 * as an HTML string (DoctorReview.note, schema.prisma -- still just a plain
 * String column, no migration needed for this). Built on Tiptap
 * (@tiptap/react + starter-kit), a headless editor so it can be skinned to
 * match this app's own components instead of shipping a themed widget.
 *
 * `initialContent` is only read once, at mount (Tiptap owns its own
 * document after that, same as any rich-text editor) -- the parent
 * (doctor-confirmation-form.tsx) only ever needs to seed this from an
 * async source (a saved DoctorReview or a localStorage draft) once, before
 * this component renders at all, never mid-session, so there's no need for
 * imperative re-sync via editor.commands.setContent(). */
export function RichNoteEditor({
  initialContent,
  onChange,
  placeholder,
}: {
  initialContent: string;
  onChange: (html: string) => void;
  placeholder: string;
}) {
  const editor = useEditor({
    extensions: makeExtensions(placeholder),
    content: initialContent,
    // Required in Next.js App Router -- Tiptap otherwise renders once during
    // SSR and once on the client, which mismatches (ProseMirror's DOM isn't
    // deterministic across the two passes) and logs a hydration warning.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-28 max-w-none text-sm text-foreground outline-none [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:text-muted-foreground [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div className="rounded-xl border border-border bg-background transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <ToolbarButton
          label="In đậm"
          active={!!editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          label="In nghiêng"
          active={!!editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton
          label="Danh sách gạch đầu dòng"
          active={!!editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          label="Danh sách đánh số"
          active={!!editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} className="px-3.5 py-2.5" />
    </div>
  );
}
