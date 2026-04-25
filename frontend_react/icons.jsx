/* Inline SVG icon set for Medion KIS — stroke-based, currentColor */
const Icon = ({ name, size = 16, ...rest }) => {
  const s = size;
  const p = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", ...rest };
  switch (name) {
    case "dashboard": return <svg {...p}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>;
    case "patients": return <svg {...p}><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.7-3.4 3.4-5.5 6.5-5.5s5.8 2.1 6.5 5.5"/><circle cx="17" cy="6" r="2.5"/><path d="M21.5 14c-.4-2-1.9-3.5-4-3.8"/></svg>;
    case "patient": return <svg {...p}><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/></svg>;
    case "ward": return <svg {...p}><path d="M3 21V8l9-5 9 5v13"/><path d="M3 21h18"/><rect x="9" y="13" width="6" height="8"/><path d="M12 7v3M10.5 8.5h3"/></svg>;
    case "icu": return <svg {...p}><path d="M3 12h4l2-5 3 10 2-5h7"/></svg>;
    case "or": return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="2.5"/></svg>;
    case "imaging": return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="5"/><path d="M12 7v10M7 12h10"/></svg>;
    case "meds": return <svg {...p}><rect x="3" y="8" width="18" height="8" rx="4"/><path d="M12 8v8"/></svg>;
    case "doc": return <svg {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h6"/></svg>;
    case "rezept": return <svg {...p}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/><circle cx="17" cy="17" r="2.5"/></svg>;
    case "ueber": return <svg {...p}><path d="M3 7h13M13 4l3 3-3 3"/><path d="M21 17H8M11 14l-3 3 3 3"/></svg>;
    case "settings": return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case "search": return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "bell": return <svg {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case "msg": return <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case "plus": return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case "x": return <svg {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case "chevR": return <svg {...p}><path d="m9 6 6 6-6 6"/></svg>;
    case "chevL": return <svg {...p}><path d="m15 6-6 6 6 6"/></svg>;
    case "chevD": return <svg {...p}><path d="m6 9 6 6 6-6"/></svg>;
    case "filter": return <svg {...p}><path d="M3 4h18l-7 9v6l-4 2v-8z"/></svg>;
    case "more": return <svg {...p}><circle cx="12" cy="6" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="18" r="1.2"/></svg>;
    case "edit": return <svg {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/></svg>;
    case "print": return <svg {...p}><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
    case "save": return <svg {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>;
    case "warn": return <svg {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>;
    case "info": return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>;
    case "check": return <svg {...p}><path d="M20 6 9 17l-5-5"/></svg>;
    case "clock": return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "calendar": return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>;
    case "phone": return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.4 2.1L7.9 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></svg>;
    case "egk": return <svg {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5 16h6M14 9h5M14 13h5"/></svg>;
    case "shield": return <svg {...p}><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6z"/></svg>;
    case "lock": return <svg {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></svg>;
    case "logout": return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>;
    case "drop": return <svg {...p}><path d="M12 2 6 11a6 6 0 0 0 12 0z"/></svg>;
    case "syringe": return <svg {...p}><path d="m18 2 4 4M15 5l4 4M14 6l-9 9v4h4l9-9-4-4z"/></svg>;
    case "stetho": return <svg {...p}><path d="M5 3v6a4 4 0 1 0 8 0V3M9 13v3a5 5 0 0 0 10 0v-2"/><circle cx="19" cy="13" r="2"/></svg>;
    case "qr": return <svg {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v3M14 20h7"/></svg>;
    case "zoom-in": return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/></svg>;
    case "zoom-out": return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6"/></svg>;
    case "expand": return <svg {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>;
    case "mic": return <svg {...p}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/></svg>;
    case "send": return <svg {...p}><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>;
    case "sparkle": return <svg {...p}><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/></svg>;
    default: return <svg {...p}><circle cx="12" cy="12" r="9"/></svg>;
  }
};

window.Icon = Icon;
