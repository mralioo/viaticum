/* Stationsübersicht — ward overview */

function Wards({ openPatient }) {
  const [active, setActive] = React.useState("INT-3");
  const station = STATIONS.find(s => s.code === active);
  const patientsHere = PATIENTS.filter(p => p.station === active);

  // Generate bed grid for the station
  const beds = [];
  const rooms = Math.ceil(station.beds / 2);
  for (let r = 0; r < rooms; r++) {
    const roomNum = (active === "INT-3" ? 311 : 200) + r;
    for (let b of ["A", "B"]) {
      const idx = r * 2 + (b === "B" ? 1 : 0);
      if (idx >= station.beds) continue;
      const patient = patientsHere.find(p => p.room === String(roomNum) && p.bed === b);
      beds.push({ room: String(roomNum), bed: b, patient });
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Stationsübersicht</h1>
          <div className="page-sub">{station.name} · {station.floor} · Leitung: {station.lead}</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="print" size={14}/> Belegungsplan</button>
          <button className="btn primary"><Icon name="plus" size={14}/> Aufnahme</button>
        </div>
      </div>

      {/* Station selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
        {STATIONS.map(s => {
          const occ = Math.round((s.occupied / s.beds) * 100);
          return (
            <button key={s.code} onClick={() => setActive(s.code)}
              style={{
                padding: "10px 14px", border: "1px solid", borderRadius: 10,
                background: s.code === active ? "var(--bg-elev)" : "transparent",
                borderColor: s.code === active ? "var(--teal)" : "var(--line)",
                cursor: "pointer", textAlign: "left", minWidth: 150,
                boxShadow: s.code === active ? "0 0 0 3px var(--teal-soft)" : "none"
              }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{s.code}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{s.occupied}/{s.beds} · {occ}%</div>
            </button>
          );
        })}
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="kpi"><div className="lbl">Belegung</div><div className="val">{Math.round(station.occupied / station.beds * 100)}%</div></div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="kpi"><div className="lbl">Belegt</div><div className="val">{station.occupied}</div></div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="kpi"><div className="lbl">Frei</div><div className="val" style={{ color: "var(--green)" }}>{station.free}</div></div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="kpi"><div className="lbl">Isolation</div><div className="val" style={{ color: "var(--amber)" }}>{station.isolation}</div></div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="kpi"><div className="lbl">Pflegeaufwand Ø</div><div className="val" style={{ fontSize: 22 }}>PKMS-A2</div></div>
        </div>
      </div>

      {/* Bed grid */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h">
          <div><h3>Bettenplan</h3><div className="sub">{station.beds} Betten · Klick auf Patient öffnet Akte</div></div>
          <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--ink-3)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span className="status-dot green"/>Stabil</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span className="status-dot amber"/>Beobachtung</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span className="status-dot red"/>Kritisch</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, border: "1.5px dashed var(--line-strong)" }}/>Frei</span>
          </div>
        </div>
        <div className="card-b" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {beds.map((b, i) => {
            if (!b.patient) {
              return (
                <div key={i} style={{
                  border: "1.5px dashed var(--line-strong)", borderRadius: 10,
                  padding: 14, minHeight: 110, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
                  color: "var(--ink-4)", background: "var(--bg-sunken)"
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".05em" }}>Zi. {b.room} · {b.bed}</div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>frei</div>
                  <button className="btn sm" style={{ marginTop: 8 }}>+ Aufnahme</button>
                </div>
              );
            }
            const p = b.patient;
            return (
              <div key={i} onClick={() => openPatient(p.id)} style={{
                border: "1px solid var(--line)", borderRadius: 10, padding: 12, cursor: "pointer", background: "var(--bg-elev)",
                position: "relative"
              }}>
                <div style={{ position: "absolute", top: 10, right: 10 }}><SeverityDot s={p.severity}/></div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Zi. {p.room} · {p.bed}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{p.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{p.sex === "w" ? "♀" : "♂"} {p.age}J · seit {p.los} Tg.</div>
                <div style={{ fontSize: 12, marginTop: 8, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.primary.split(" — ")[1] || p.primary}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                  {p.dnr && <Tag tone="red">DNR</Tag>}
                  {p.allergies[0] !== "Keine bekannt" && <Tag tone="amber">Allergie</Tag>}
                  <Tag tone="teal">{p.attending.replace("Dr. ", "")}</Tag>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's events */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="card-h"><h3>Heute auf der Station</h3></div>
          <div className="card-b" style={{ padding: 0 }}>
            {[
              { t: "07:30", e: "Morgenvisite", p: "Dr. Weber + Team", tone: "teal" },
              { t: "09:00", e: "TTE — Frau Müller (Zi. 312)", p: "Funktionsdiagnostik", tone: "blue" },
              { t: "10:30", e: "Aufnahme — Hr. Berger (Zi. 314)", p: "Notaufnahme", tone: "amber" },
              { t: "11:00", e: "Konsil Neurologie — Hr. Krause", p: "Dr. Richter", tone: "violet" },
              { t: "14:00", e: "Entlassung — Frau Roth (CHIR-2)", p: "Sozialdienst", tone: "green" },
            ].map((r, i, arr) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none" }}>
                <div style={{ width: 50, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.t}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{r.e}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{r.p}</div>
                </div>
                <Tag tone={r.tone}>geplant</Tag>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>Hygiene & Hinweise</h3></div>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: 12, background: "var(--amber-soft)", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--amber)", fontWeight: 600, fontSize: 12.5 }}>
                <Icon name="warn" size={14}/> Isolation aktiv
              </div>
              <div style={{ fontSize: 12, marginTop: 4, color: "var(--ink-2)" }}>
                Zi. 318 — MRSA Kontaktisolation. Schutzkleidung am Vorraum.
              </div>
            </div>
            <div style={{ padding: 12, background: "var(--blue-soft)", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--blue)", fontWeight: 600, fontSize: 12.5 }}>
                <Icon name="info" size={14}/> Pflegeüberleitung
              </div>
              <div style={{ fontSize: 12, marginTop: 4, color: "var(--ink-2)" }}>
                Frau Fischer (Zi. 315) — Verlegung Geriatrische Reha morgen 10:00.
              </div>
            </div>
            <div style={{ padding: 12, background: "var(--green-soft)", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green)", fontWeight: 600, fontSize: 12.5 }}>
                <Icon name="check" size={14}/> Hygiene-Audit
              </div>
              <div style={{ fontSize: 12, marginTop: 4, color: "var(--ink-2)" }}>
                Letzte Begehung 18.04.2026 — keine Beanstandungen.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Wards = Wards;
