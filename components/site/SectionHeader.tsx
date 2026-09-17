import type { ReactNode } from "react";
import charter from "@/settings/charter";

function Squiggle({ color = charter.orange }: { color?: string }) {
  return (
    <svg width="64" height="10" viewBox="0 0 64 10" fill="none" aria-hidden="true">
      <path
        d="M1 6.5C6 1.5 10 1.5 15 6.5C20 11.5 24 11.5 29 6.5C34 1.5 38 1.5 43 6.5C48 11.5 52 11.5 57 6.5C60 3.8 61.5 3 63 2.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className = "",
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  const isCenter = align === "center";
  return (
    <div className={`${isCenter ? "text-center" : "text-left"} ${className}`}>
      <span
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
        style={{ color: charter.orange }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: charter.orange }} />
        {eyebrow}
      </span>
      <h2
        className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
        style={{ color: charter.ink }}
      >
        {title}
      </h2>
      <div className={`mt-2 ${isCenter ? "flex justify-center" : ""}`}>
        <Squiggle />
      </div>
      {description && (
        <p
          className={`mt-4 text-base leading-relaxed ${isCenter ? "mx-auto max-w-xl" : "max-w-lg"}`}
          style={{ color: charter.inkSoft }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
