/* OP-Planung — OR scheduling, daily Gantt */

function ORPlanning({ openPatient }) {
  const [day, setDay] = React.useState("Heute · Fr 24.04.");
  const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const px = (h, m = 0) => ((h - 7) * 60 + m) * 1.4;
  const parseT = (t) => {
    if (t === "—") return null;
    const [hh, mm] = t.split(":").map(Number);
    return px(hh, mm);
  };

  return (
    <div className="page" style={{ maxWidth: 1800 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">OP-Planung</h1>
          <div className="page-sub">{day} · 4 Säle · {OP_PROCEDURES.length} Eingriffe geplant · 1 Notfall</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="chevL" size={14}/></button>
          <button className="btn">{day}</button>
          <button className="btn"><Icon name="chevR" size={14}/></button>
          <button className="btn"><Icon name="filter" size={14}/> Saal</button>
          <button className="btn primary"><Icon name="plus" size={14}/> OP anmelden</button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 14 }}>
        {[
          ["Eingriffe heute", "12", "geplant"],
          ["Abgeschlossen", "4", "33%"],
          ["Laufend", "2", "OP-1, OP-2"],
          ["Notfall-Slots", "1", "OP-4"],
          ["Auslastung Ø", "78%", "über Plan"],
        ].map(([l, v, h]) => (
          <div key={l} className="card" style={{ padding: 12 }}>
            <div className="kpi"><div className="lbl">{l}</div><div className="val" style={{ fontSize: 22 }}>{v}</div><div className="delta">{h}</div></div>
          </div>
        ))}
      </div>

      {/* Gantt */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-h"><h3>Tagesplan</h3><div className="sub">Linie = aktuelle Uhrzeit</div></div>
        <div style={{ overflowX: "auto", padding: "8px 0 16px" }}>
          <div style={{ minWidth: 1200, position: "relative" }}>
            {/* hour ruler */}
            <div style={{ display: "flex", marginLeft: 130, paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>
              {HOURS.map(h => (
                <div key={h} style={{ width: 60 * 1.4, fontSize: 11, fontWeight: 600, color: "var(--ink-3)", borderLeft: "1px dashed var(--line)", paddingLeft: 6 }}>
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {/* Now line at ~11:30 */}
            <div style={{ position: "absolute", left: 130 + px(11, 30), top: 30, bottom: 0, width: 2, background: "var(--red)", zIndex: 5 }}>
              <div style={{ position: "absolute", top: -4, left: -5, width: 12, height: 12, borderRadius: "50%", background: "var(--red)" }}/>
              <div style={{ position: "absolute", top: -22, left: -22, fontSize: 11, fontWeight: 700, color: "var(--red)" }}>11:30</div>
            </div>

            {OP_ROOMS.map(room => {
              const procs = OP_PROCEDURES.filter(o => o.room === room);
              return (
                <div key={room} style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid var(--line)", minHeight: 78 }}>
                  <div style={{ width: 130, padding: "12px 14px", background: "var(--bg-sunken)", borderRight: "1px solid var(--line)" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{room}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{procs.length} Eingriffe</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 4 }}>
                      {procs[0]?.surgeon}
                    </div>
                  </div>
                  <div style={{ flex: 1, position: "relative", minHeight: 78 }}>
                    {/* hour grid */}
                    {HOURS.map(h => (
                      <div key={h} style={{ position: "absolute", left: (h - 7) * 60 * 1.4, top: 0, bottom: 0, width: 1, background: "var(--line)" }}/>
                    ))}
                    {procs.map(o => {
                      const x = parseT(o.start);
                      const xe = parseT(o.end) || (x + 60);
                      const w = xe - x;
                      const colorMap = {
                        completed: { bg: "var(--green-soft)", border: "var(--green)", txt: "var(--green)" },
                        "in-progress": { bg: "var(--teal-soft)", border: "var(--teal)", txt: "var(--teal-2)" },
                        scheduled: { bg: "var(--bg-sunken)", border: "var(--line-strong)", txt: "var(--ink-2)" },
                      };
                      const c = colorMap[o.status];
                      const isNotfall = o.priority === "notfall";
                      return (
                        <div key={o.id} style={{
                          position: "absolute", left: x, top: 8, height: 60,
                          width: w, padding: "6px 10px",
                          background: isNotfall ? "var(--red-soft)" : c.bg,
                          border: "1px solid", borderColor: isNotfall ? "var(--red)" : c.border,
                          borderLeft: `4px solid ${isNotfall ? "var(--red)" : c.border}`,
                          borderRadius: 6, overflow: "hidden", cursor: "pointer",
                          fontSize: 11.5, color: isNotfall ? "var(--red)" : c.txt
                        }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.patientName}</div>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ink-2)" }}>{o.procedure}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10.5, color: "var(--ink-3)" }}>
                            <span className="tab-num">{o.start}–{o.end}</span>
                            <span>{o.status === "in-progress" ? "● läuft" : o.status === "completed" ? "✓" : isNotfall ? "Notfall" : "geplant"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Procedure list + team */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 16 }}>
        <div className="card">
          <div className="card-h"><h3>Eingriffsliste</h3></div>
          <table className="table">
            <thead><tr><th>Saal</th><th>Beginn</th><th>Patient</th><th>Eingriff</th><th>Operateur</th><th>Anästhesie</th><th>Status</th></tr></thead>
            <tbody>
              {OP_PROCEDURES.map(o => (
                <tr key={o.id}>
                  <td><Tag tone={o.priority === "notfall" ? "red" : "teal"}>{o.room.replace(" (Notfall)", "")}</Tag></td>
                  <td className="tab-num">{o.start}</td>
                  <td><div style={{ fontWeight: 600 }}>{o.patientName}</div><div className="mono muted" style={{ fontSize: 11 }}>{o.patient}</div></td>
                  <td>{o.procedure}</td>
                  <td>{o.surgeon}</td>
                  <td>{o.anaesthetist}</td>
                  <td>
                    {o.status === "completed" && <Tag tone="green" dot>Abgeschlossen</Tag>}
                    {o.status === "in-progress" && <Tag tone="teal" dot>Läuft</Tag>}
                    {o.status === "scheduled" && <Tag>Geplant</Tag>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div className="card-h"><h3>Team heute</h3></div>
            <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { n: "Dr. Bauer", r: "Operateur OP-1", av: "DB" },
                { n: "Dr. Engel", r: "Operateur OP-2", av: "DE" },
                { n: "Dr. Lange", r: "Operateur OP-3", av: "DL" },
                { n: "Dr. Schulz", r: "Anästhesie", av: "DS" },
                { n: "Dr. Pohl", r: "Anästhesie", av: "DP" },
                { n: "Schwester Erika", r: "OP-Pflege Lead", av: "SE" },
              ].map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={m.n} size="sm"/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{m.n}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{m.r}</div>
                  </div>
                  <span className="status-dot green"/>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h3>Aufklärungen offen</h3></div>
            <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
              {[
                "Frau Roth — vor 11:00",
                "Hr. Wagner — bis morgen 06:00",
                "Frau Decker — bis heute 13:30",
              ].map((s, i) => (
                <div key={i} style={{ padding: 8, background: "var(--amber-soft)", color: "var(--amber)", borderRadius: 6, fontWeight: 500 }}>
                  <Icon name="warn" size={12} style={{ verticalAlign: "-2px", marginRight: 4 }}/>{s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ORPlanning = ORPlanning;
