/* Dashboard — Tagesübersicht */

function Dashboard({ goto, openPatient }) {
  const occupiedTotal = STATIONS.reduce((a, s) => a + s.occupied, 0);
  const bedsTotal = STATIONS.reduce((a, s) => a + s.beds, 0);
  const occRate = Math.round((occupiedTotal / bedsTotal) * 100);
  const opsToday = OP_PROCEDURES.length;
  const opsDone = OP_PROCEDURES.filter(o => o.status === "completed").length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Guten Morgen, Dr. Weber</h1>
          <div className="page-sub">Freitag, 24. April 2026 · 7:32 Uhr · Innere Medizin 3 — Kardiologie</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="calendar" size={14}/> Kalender</button>
          <button className="btn primary"><Icon name="plus" size={14}/> Patient aufnehmen</button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 18 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="kpi">
            <div className="lbl">Belegung Klinik</div>
            <div className="val">{occRate}<span style={{ fontSize: 14, color: "var(--ink-3)" }}>%</span></div>
            <div className="delta">{occupiedTotal} / {bedsTotal} Betten · 4 Notaufnahmen letzte 24h</div>
          </div>
          <div className="bar" style={{ marginTop: 10 }}><i style={{ width: occRate + "%" }}/></div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="kpi">
            <div className="lbl">Meine Patienten heute</div>
            <div className="val">14</div>
            <div className="delta"><span style={{ color: "var(--red)" }}>2 kritisch</span> · 3 Neuaufnahmen · 4 Entlassungen geplant</div>
          </div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="kpi">
            <div className="lbl">OP-Plan</div>
            <div className="val">{opsDone} / {opsToday}</div>
            <div className="delta">Eingriffe abgeschlossen · 1 Notfall in Vorbereitung</div>
          </div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="kpi">
            <div className="lbl">Offene Aufgaben</div>
            <div className="val">{TASKS.length}</div>
            <div className="delta"><span style={{ color: "var(--amber)" }}>2 hochpriorisiert</span> · 3 Befunde zur Freigabe</div>
          </div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="kpi">
            <div className="lbl">TI-Status</div>
            <div className="val" style={{ fontSize: 16, fontWeight: 600, color: "var(--green)", display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <span className="status-dot green"/> Online
            </div>
            <div className="delta" style={{ marginTop: 6 }}>eRezept · KIM · eAU · ePA verbunden</div>
          </div>
        </div>
      </div>

      {/* Two-column: agenda + tasks/alerts */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
        {/* Agenda */}
        <div className="card">
          <div className="card-h">
            <div>
              <h3>Mein Tag</h3>
              <div className="sub">Freitag · 8 Termine</div>
            </div>
            <button className="btn sm ghost"><Icon name="calendar" size={13}/> Wochenansicht</button>
          </div>
          <div className="card-b flush">
            {AGENDA.map((a, i) => {
              const colorMap = { visite: "teal", konferenz: "violet", aufklärung: "blue", termin: "teal", konsil: "amber", team: "gray", entlassung: "green" };
              return (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "70px 4px 1fr auto",
                  gap: 14, padding: "12px 16px",
                  borderBottom: i < AGENDA.length - 1 ? "1px solid var(--line)" : "none",
                  alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{a.time}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{a.duration}</div>
                  </div>
                  <div style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: `var(--${colorMap[a.type]})` }} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{a.location} · {a.attendees} {a.attendees === 1 ? "Teilnehmer" : "Teilnehmende"}</div>
                  </div>
                  {a.patient && <Tag tone="teal">{a.patient.split(",")[0]}</Tag>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Critical patients */}
          <div className="card">
            <div className="card-h">
              <div>
                <h3>Kritische Patienten</h3>
                <div className="sub">Aktuell überwachungspflichtig</div>
              </div>
              <button className="btn sm ghost" onClick={() => goto("icu")}>Zur ITS</button>
            </div>
            <div className="card-b flush">
              {PATIENTS.filter(p => p.severity !== "stable").slice(0, 4).map((p, i, arr) => (
                <div key={p.id} onClick={() => openPatient(p.id)} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none",
                  cursor: "pointer"
                }}>
                  <SeverityDot s={p.severity} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.station} · {p.primary.split("—")[1]?.trim() || p.primary}</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 11, color: "var(--ink-3)" }}>
                    <div style={{ fontWeight: 600, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>HF {p.vitals.hr} · SpO₂ {p.vitals.spo2}%</div>
                    <div>RR {p.vitals.sys}/{p.vitals.dia}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks inbox */}
          <div className="card">
            <div className="card-h">
              <div>
                <h3>Posteingang</h3>
                <div className="sub">{TASKS.length} offen</div>
              </div>
              <button className="btn sm ghost">Alle</button>
            </div>
            <div className="card-b flush">
              {TASKS.slice(0, 5).map((t, i, arr) => {
                const prioMap = { high: "red", med: "amber", low: "gray" };
                return (
                  <div key={t.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none"
                  }}>
                    <span className={"status-dot " + prioMap[t.prio]} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{t.text}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.from} · {t.time}</div>
                    </div>
                    <button className="btn sm ghost"><Icon name="check" size={13}/></button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stations strip */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h">
          <div>
            <h3>Stationen</h3>
            <div className="sub">Belegung & freie Betten</div>
          </div>
          <button className="btn sm ghost" onClick={() => goto("wards")}>Stationsübersicht</button>
        </div>
        <div className="card-b" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {STATIONS.map(s => {
            const pct = Math.round((s.occupied / s.beds) * 100);
            return (
              <div key={s.code} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.code}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>{s.occupied}/{s.beds}</div>
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name.replace(s.code + " — ", "")}</div>
                <div className={"bar " + (pct > 90 ? "amber" : "")} style={{ marginTop: 10 }}><i style={{ width: pct + "%" }}/></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginTop: 6, color: "var(--ink-3)" }}>
                  <span>{s.free} frei</span>
                  {s.isolation > 0 && <span style={{ color: "var(--amber)", fontWeight: 600 }}>{s.isolation} Isolation</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
