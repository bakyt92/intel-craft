import { useEffect, useRef } from "react";

interface Props {
  className?: string;
}

export const GradientBackdrop = ({ className }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
    };
    window.addEventListener("pointermove", handler);
    return () => window.removeEventListener("pointermove", handler);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(60%_60%_at_var(--mx)_var(--my),black,transparent_70%)]` + (className ? ` ${className}` : "")}
      style={{
        background: `radial-gradient(800px 800px at var(--mx) var(--my), hsl(var(--primary) / 0.12), transparent 60%),
                     radial-gradient(600px 600px at calc(var(--mx) * 0.6) calc(var(--my) * 0.6), hsl(var(--accent) / 0.10), transparent 60%)`,
        transition: "var(--transition-smooth)",
      }}
    />
  );
};
