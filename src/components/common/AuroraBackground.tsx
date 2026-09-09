/** Fixed, blurred colour glows behind the whole app (Frosted Aurora). */
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="aurora-glow"
        style={{ width: 360, height: 360, top: -80, left: -80, background: "var(--glow-1)" }}
      />
      <div
        className="aurora-glow"
        style={{ width: 320, height: 320, top: 160, right: -100, background: "var(--glow-2)" }}
      />
      <div
        className="aurora-glow"
        style={{ width: 300, height: 300, bottom: -60, left: "30%", background: "var(--glow-3)" }}
      />
    </div>
  );
}
