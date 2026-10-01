"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Loader2, RefreshCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScopeFrame } from "@/components/scope-frame";

type CameraState = "idle" | "starting" | "streaming" | "unsupported" | "denied" | "error";

/** getUserMedia-based capture target for /cataract -- an alternative to
 * UploadDropzone's file picker for the same `onCapture(file)` contract, so
 * the parent page (app/cataract/page.tsx) can swap between the two without
 * caring which one produced the file. inference/cataract_engine.py sees a
 * plain uploaded image either way; a camera capture and a disk upload are
 * indistinguishable once they're a File, so nothing outside the web layer
 * needs to change for this.
 *
 * Reuses ScopeFrame's circular aperture as the live viewport: the ring IS
 * the alignment guide (center your eye inside the circle) instead of a
 * separate overlay, matching UploadDropzone's own framing exactly.
 */
export function CameraCapture({
  onCapture,
  disabled,
}: {
  onCapture: (file: File) => void;
  disabled: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("idle");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(
    async (mode: "user" | "environment") => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("unsupported");
        return;
      }
      setState("starting");
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setState("streaming");
      } catch (err) {
        setState(err instanceof DOMException && err.name === "NotAllowedError" ? "denied" : "error");
      }
    },
    [stopStream]
  );

  // Stop the camera on unmount (leaving a stream open after navigating away
  // would keep the device's camera-in-use indicator lit) and whenever the
  // parent disables this (a screen is already in flight). Only releases the
  // hardware here -- `effectiveState` below (not a synced setState) is what
  // makes the UI actually show "idle" again while disabled.
  useEffect(() => {
    if (disabled) stopStream();
    return () => stopStream();
  }, [disabled, stopStream]);

  const effectiveState = disabled ? "idle" : state;

  const handleSwitchCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startStream(next);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    // Center-crop to square so the captured file matches the circular
    // framing the user actually saw, instead of the sensor's raw 16:9/4:3.
    const side = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - side) / 2;
    const sy = (video.videoHeight - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, side, side);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopStream();
        setState("idle");
        onCapture(new File([blob], `camera-capture-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  };

  // <video> stays mounted across every state (just hidden when not
  // streaming) so `videoRef.current` already exists by the time
  // getUserMedia resolves inside startStream -- it used to only render once
  // state flipped to "streaming", which is one render too late: the ref
  // would still be null at the point startStream tries to attach the
  // stream to it.
  const overlay =
    effectiveState === "starting" ? (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.5} />
        <span className="text-xs">Đang mở camera…</span>
      </div>
    ) : effectiveState === "denied" || effectiveState === "unsupported" || effectiveState === "error" ? (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
        <AlertTriangle className="h-6 w-6 text-sev-3" strokeWidth={1.5} />
        <span className="text-xs leading-snug">
          {effectiveState === "denied"
            ? "Trình duyệt đã chặn quyền truy cập camera. Hãy cho phép rồi thử lại."
            : effectiveState === "unsupported"
              ? "Trình duyệt này không hỗ trợ mở camera. Hãy dùng cách tải ảnh lên thay thế."
              : "Không mở được camera. Thử lại hoặc dùng cách tải ảnh lên."}
        </span>
      </div>
    ) : effectiveState === "idle" ? (
      <button
        type="button"
        disabled={disabled}
        onClick={() => startStream(facingMode)}
        className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground transition-colors hover:text-gold-deep disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Camera className="h-7 w-7" strokeWidth={1.5} />
        <span className="font-condensed text-xs uppercase tracking-[0.25em]">Mở camera</span>
      </button>
    ) : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <ScopeFrame size={340} interiorClassName="bg-linear-to-br from-secondary to-background">
        <div className="relative h-full w-full">
          <video
            ref={videoRef}
            muted
            playsInline
            className={cn(
              "h-full w-full object-cover",
              facingMode === "user" && "-scale-x-100",
              effectiveState !== "streaming" && "hidden"
            )}
          />
          {overlay && <div className="absolute inset-0 bg-secondary">{overlay}</div>}
        </div>
      </ScopeFrame>
      {effectiveState === "streaming" && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSwitchCamera}
            title="Đổi camera trước/sau"
            className="glossy shadow-bubble flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCcw className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={handleCapture}
            className="glossy shadow-bubble rounded-full border border-gold-deep bg-gold-deep px-6 py-2.5 font-condensed text-xs uppercase tracking-[0.25em] text-white transition-transform active:scale-95"
          >
            Chụp ảnh
          </button>
        </div>
      )}
    </div>
  );
}
