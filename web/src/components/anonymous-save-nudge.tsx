import Link from "next/link";

/** Shown under a fresh result on /upload and /multidisease when there's no
 * session -- an anonymous result is never persisted (see each route's own
 * comment on why), and nothing else on either page tells the visitor that.
 * Without this, someone who isn't logged in has no way to know their result
 * disappears the moment they navigate away or try another photo. */
export function AnonymousSaveNudge() {
  return (
    <div className="border-t border-border/60 px-6 py-4 sm:px-10">
      <p className="text-sm text-muted-foreground">
        Kết quả này sẽ không được lưu lại.{" "}
        <Link href="/login" className="font-medium text-teal-deep hover:underline">
          Đăng nhập
        </Link>{" "}
        để tự động lưu vào sổ khám mắt của bạn.
      </p>
    </div>
  );
}
