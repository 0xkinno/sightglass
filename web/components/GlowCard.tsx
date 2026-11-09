"use client";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useRef } from "react";

/** A card with a cursor-tracking light and a restrained 3D tilt. Tilt is off for reduced motion. */
export function GlowCard({
  tone = "green",
  children,
  className = "",
  as = "div",
}: {
  tone?: "green" | "amber" | "port";
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li" | "article" | "section";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [3, -3]), { stiffness: 180, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-3, 3]), { stiffness: 180, damping: 18 });
  const cls = `glow-card glow-${tone} ${className}`.trim();
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };
  const M = (motion as unknown as Record<string, React.ElementType>)[as];
  return (
    <M
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cls}
      style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 1100 }}
    >
      {children}
    </M>
  );
}
