"use client";
import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** Counts up to a FACTS value when it scrolls into view. The final text is always the exact value. */
export function CountUp({ value, factKey }: { value: number; factKey?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (!inView || reduce) return;
    setShown(0);
    const c = animate(0, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
  }, [inView, reduce, value]);
  return (
    <span ref={ref} data-fact={factKey}>
      {shown.toLocaleString("en-US")}
    </span>
  );
}
