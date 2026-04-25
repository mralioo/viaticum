/* Referrals + Medication BMP screens */

function Referrals() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Überweisungen</h1>
          <div className="page-sub">{REFERRALS.length} aktive Vorgänge · Versand via KIM</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="filter" size={14}/> Filter</button>
          <button className="btn primary"><Icon name="plus" size={14}/> Neue Überweisung</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
        {[["Versendet", 18, "green"], ["Entwurf", 5, "amber"], ["In Bearbeitung", 7, "blue"], ["Antwort eingegangen", 11, "teal"]].map(([l, v, t]) => (
          <div key={l} className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className={"status-dot " + t}/><div className="muted" style={{ fontSize: 11.5, fontWeight: 500 }}>{l}</div></div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>ID</th><th>Datum</th><th>Patient</th><th>Empfänger</th><th>Auftrag</th><th>Dringlichkeit</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {[...REFERRALS, ...REFERRALS.map(r => ({ ...r, id: r.id.replace("0241", "0245").replace("0242", "0246").replace("0243", "0247").replace("0244", "0248"), date: "22.04.2026", status: "Antwort eingegangen", urgency: "regulär" }))].map((r, i) => (
              <tr key={i}>
                <td className="mono" style={{ fontWeight: 600 }}>{r.id}</td>
                <td className="tab-num">{r.date}</td>
                <td>{r.patient}</td>
                <td style={{ fontSize: 12 }}>{r.to}</td>
                <td style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reason}</td>
                <td><Tag tone={r.urgency === "hoch" ? "red" : ""}>{r.urgency}</Tag></td>
                <td>
                  <Tag tone={r.status === "versendet" ? "green" : r.status === "Entwurf" ? "amber" : r.status.includes("Antwort") ? "teal" : "blue"} dot>
                    {r.status}
                  </Tag>
                </td>
                <td><Icon name="chevR" size={14} style={{ color: "var(--ink-3)" }}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MedicationPlan({ openPatient }) {
  const [pid, setPid] = React.useState("P-104821");
  const p = PATIENTS.find(x => x.id === pid);
  const meds = MEDICATION.filter(m => m.patient === pid);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Medikamentenplan</h1>
          <div className="page-sub">Bundeseinheitlicher Medikationsplan (BMP) · §31a SGB V</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="qr" size={14}/> QR exportieren</button>
          <button className="btn"><Icon name="print" size={14}/> Drucken</button>
          <button className="btn primary"><Icon name="plus" size={14}/> Verordnen</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        <div className="card" style={{ overflow: "hidden", height: "fit-content" }}>
          <div className="card-h"><h3>Patient wählen</h3></div>
          <div>
            {PATIENTS.slice(0, 8).map(pt => (
              <div key={pt.id} onClick={() => setPid(pt.id)} style={{
                padding: "10px 14px", borderBottom: "1px solid var(--line)", cursor: "pointer",
                background: pt.id === pid ? "var(--teal-tint)" : "transparent"
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{pt.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{pt.id} · {pt.station}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* BMP header — like the official paper layout */}
          <div className="card" style={{ padding: 18, background: "linear-gradient(180deg, var(--teal-tint), var(--bg-elev))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em" }}>Medikationsplan</div>
                <h2 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700 }}>{p.name}</h2>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4 }}>
                  geb. {p.geb} · {p.age} J · {p.sex === "w" ? "weiblich" : "männlich"} · {p.id}<br/>
                  Ausgestellt von Dr. M. Weber · Klinikum München · 24.04.2026<br/>
                  {p.allergies[0] !== "Keine bekannt" && <span style={{ color: "var(--red)", fontWeight: 600 }}>Allergien: {p.allergies.join(", ")}</span>}
                </div>
              </div>
              <div style={{
                width: 100, height: 100,
                background: `repeating-linear-gradient(45deg, var(--ink) 0 3px, transparent 3px 6px),
                             repeating-linear-gradient(-45deg, var(--ink) 0 3px, transparent 3px 6px)`,
                borderRadius: 6, display: "grid", placeItems: "center", flexShrink: 0,
                position: "relative"
              }}>
                <div style={{ position: "absolute", inset: 8, background: "var(--bg-elev)", borderRadius: 4, display: "grid", placeItems: "center" }}>
                  <Icon name="qr" size={42} style={{ color: "var(--ink)" }}/>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Verordnungen ({meds.length})</h3></div>
            <table className="table">
              <thead>
                <tr>
                  <th>Wirkstoff / Präparat</th>
                  <th>Stärke</th>
                  <th>Form</th>
                  <th>morgens</th>
                  <th>mittags</th>
                  <th>abends</th>
                  <th>nachts</th>
                  <th>Einheit</th>
                  <th>Hinweise</th>
                  <th>Grund</th>
                </tr>
              </thead>
              <tbody>
                {meds.map((m, i) => {
                  const parts = m.schedule.split("-");
                  return (
                    <tr key={i}>
                      <td><div style={{ fontWeight: 600 }}>{m.name.replace(/\s+\d.*/, "")}</div></td>
                      <td>{m.name.match(/[\d.]+\s*(?:mg|µg|g|IE)/)?.[0] || "—"}</td>
                      <td>{m.form}</td>
                      <td className="tab-num" style={{ fontWeight: 600 }}>{parts[0]}</td>
                      <td className="tab-num" style={{ fontWeight: 600 }}>{parts[1]}</td>
                      <td className="tab-num" style={{ fontWeight: 600 }}>{parts[2] || "0"}</td>
                      <td className="tab-num" style={{ fontWeight: 600 }}>{parts[3] || "0"}</td>
                      <td className="muted">Stk.</td>
                      <td>{m.status === "warn" ? <Tag tone="amber" dot>Wechselwirkung</Tag> : "—"}</td>
                      <td style={{ fontSize: 12 }}>{m.indication}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Referrals = Referrals;
window.MedicationPlan = MedicationPlan;
