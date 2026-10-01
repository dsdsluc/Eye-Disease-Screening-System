import { cn } from "@/lib/utils";

type ScopeFrameProps = {
  children: React.ReactNode;
  ringColor?: string;
  size?: number;
  className?: string;
  /** Interior fill. Defaults to the dark "looking into a scope" surface,
   * which only makes sense once a photo covers it (Hero, Results). An empty
   * dropzone with nothing to show yet should pass a light variant instead --
   * a solid black circle on a light page reads as broken, not intentional. */
  interiorClassName?: string;
};

const TICK_COUNT = 60;
const TICKS = Array.from({ length: TICK_COUNT }, (_, i) => i);

/**
 * The signature element: a circular aperture with a tick-marked bezel, like
 * looking through a fundus camera eyepiece. Used for both the upload target
 * and the graded-image display so the same "looking into the scope" framing
 * carries through the whole flow.
 */
export function ScopeFrame({
  children,
  ringColor = "var(--color-border)",
  size = 320,
  className,
  interiorClassName = "bg-ink-raised",
}: ScopeFrameProps) {
  return (
    // clamp() against the viewport, not a percentage of the parent: a %/w-full
    // width needs a definite-width containing block, and this component keeps
    // landing inside flex/grid ancestors that shrink-to-fit by default (no
    // stretch), which silently resolves that percentage to 0. vw sidesteps
    // the whole parent-chain question.
    <div
      className={cn("relative aspect-square shrink-0", className)}
      style={{ width: `clamp(${Math.min(size, 180)}px, 90vw, ${size}px)` }}
    >
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {TICKS.map((i) => {
          const angle = (i / TICK_COUNT) * 360;
          const long = i % 5 === 0;
          const rOuter = 99;
          const rInner = long ? 90 : 94;
          const rad = (angle * Math.PI) / 180;
          // Fixed precision: full float-to-string can differ in the last digit
          // between server and client, which trips React's hydration check.
          const x1 = (100 + rOuter * Math.cos(rad)).toFixed(2);
          const y1 = (100 + rOuter * Math.sin(rad)).toFixed(2);
          const x2 = (100 + rInner * Math.cos(rad)).toFixed(2);
          const y2 = (100 + rInner * Math.sin(rad)).toFixed(2);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={ringColor}
              strokeWidth={long ? 1.5 : 0.75}
              strokeLinecap="round"
              className="transition-colors duration-500"
            />
          );
        })}
      </svg>
      <div className={cn("absolute inset-[13%] overflow-hidden rounded-full ring-1 ring-border/60", interiorClassName)}>
        {children}
      </div>
    </div>
  );
}
