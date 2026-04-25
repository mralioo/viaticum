/* Shared UI helpers for Medion KIS */

const Tag = ({ tone = "", children, dot = false }) => (
  <span className={"tag " + tone}>
    {dot && <span className="dot" />}
    {children}
  </span>
);

const Avatar = ({ name, tone, size = "" }) => {
  const initials = name.split(/[\s,]+/).filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase();
  const palette = ["#0d8a8a", "#5b4cbf", "#2563a8", "#b97509", "#1f7a4d", "#7c8a9c"];
  const idx = (name.charCodeAt(0) + name.length) % palette.length;
  return <span className={"av " + size} style={{ background: tone || palette[idx] }}>{initials}</span>;
};

const SeverityDot = ({ s }) => {
  const map = { critical: "red", watch: "amber", stable: "green" };
  return <span className={"status-dot " + (map[s] || "gray")} />;
};

const Sparkline = ({ data = [], color = "#0d8a8a", w = 80, h = 24, fill = true }) => {
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 2 - ((v - min) / span) * (h - 4),
  ]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const area = d + ` L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      {fill && <path d={area} fill={color} opacity="0.12" />}
      <path d={d} stroke={color} strokeWidth="1.5" fill="none" />
    </svg>
  );
};

// Vital "monitor" line — animated dashed wave for ICU
const VitalWave = ({ color = "#0d8a8a", height = 36, label, value, unit, trend }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "var(--bg-sunken)", borderRadius: 8 }}>
    <div style={{ minWidth: 56 }}>
      <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}<span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500, marginLeft: 4 }}>{unit}</span></div>
    </div>
    <div style={{ flex: 1, height }}>
      <Sparkline data={trend} color={color} w={180} h={height} />
    </div>
  </div>
);

const ProgressDots = ({ total, done, color }) => (
  <div style={{ display: "flex", gap: 3 }}>
    {Array.from({ length: total }).map((_, i) => (
      <span key={i} style={{
        width: 6, height: 6, borderRadius: "50%",
        background: i < done ? (color || "var(--teal)") : "var(--line-strong)"
      }} />
    ))}
  </div>
);

const EmptyState = ({ title, hint, icon = "info" }) => (
  <div style={{ padding: 36, textAlign: "center", color: "var(--ink-3)" }}>
    <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--bg-sunken)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
      <Icon name={icon} size={20} />
    </div>
    <div style={{ fontWeight: 600, color: "var(--ink-2)", fontSize: 13 }}>{title}</div>
    {hint && <div style={{ fontSize: 12, marginTop: 3 }}>{hint}</div>}
  </div>
);

Object.assign(window, { Tag, Avatar, SeverityDot, Sparkline, VitalWave, ProgressDots, EmptyState });
