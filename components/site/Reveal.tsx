"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  stagger = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  /** Délai (s) entre l'apparition de chaque enfant direct : effet cascade. */
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        stagger > 0 ? Array.from(el.children) : el,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          delay,
          stagger,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            once: true,
          },
        }
      );
    }, ref);

    return () => context.revert();
  }, [delay, y, stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
