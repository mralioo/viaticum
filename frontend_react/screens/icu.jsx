/* Intensivstation — ICU monitoring */

function ICU({ openPatient }) {
  const icuPatients = [
    ...PATIENTS.filter(p => p.station === "ITS"),
    ...ICU_PATIENTS_EXTRA,
  ];
  const [selected, setSelected] = React.useState(icuPatients[0]?.id);
  const p = icuPatients.find(x => x.id === selected) || icuPatients[0];
  const trend = ICU_VITALS[p.id] || ICU_VITALS["P-104823"];

  return (
    <div className="page" style={{ padding: 0, maxWidth: "none" }}>
      <div style={{ padding: "20px 28px 0" }}>
        <div className="page-head">
          <div>
            <h1 className="page-title">Intensivstation</h1>
            <div className="page-sub">{icuPatients.length} Patienten · 12 Plätze · Leitung: Dr. Hofmann · Schicht Frühdienst</div>
          </div>
          <div className="page-actions">
            <button className="btn"><Icon name="bell" size={14}/> Alarme</button>
            <button className="btn"><Icon name="print" size={14}/> Übergabebericht</button>
            <button className="btn primary"><Icon name="plus" size={14}/> Neuaufnahme</button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 0, padding: "0 28px 28px" }}>
        {/* Patient list */}
        <div className="card" style={{ marginRight: 16, overflow: "hidden" }}>
          <div className="card-h"><h3>Patienten ITS</h3><span className="sub">{icuPatients.length}</span></div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {icuPatients.map(pt => {
              const active = pt.id === selected;
              return (
                <div key={pt.id} onClick={() => setSelected(pt.id)} style={{
                  padding: "12px 14px", borderBottom: "1px solid var(--line)", cursor: "pointer",
                  background: active ? "var(--teal-tint)" : "transparent",
                  borderLeft: active ? "3px solid var(--teal)" : "3px solid transparent"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <SeverityDot s={pt.severity}/>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{pt.room}</div>
                    <div style={{ flex: 1, fontWeight: 500, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pt.name.split(",")[0]}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{pt.age}J</div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {pt.primary.split(" — ")[1] || pt.primary}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
                    <span><span style={{ color: "var(--ink-3)" }}>HF</span> <strong>{pt.vitals.hr}</strong></span>
                    <span><span style={{ color: "var(--ink-3)" }}>SpO₂</span> <strong style={{ color: pt.vitals.spo2 < 92 ? "var(--red)" : "inherit" }}>{pt.vitals.spo2}%</strong></span>
                    <span><span style={{ color: "var(--ink-3)" }}>RR</span> <strong>{pt.vitals.sys}/{pt.vitals.dia}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Header */}
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Avatar name={p.name} size="lg"/>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{p.name}</h2>
                    <span style={{ color: "var(--ink-3)", fontSize: 12.5 }}>{p.sex === "w" ? "♀" : "♂"} {p.geb} · {p.age}J · {p.id}</span>
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 4, color: "var(--ink-2)" }}>{p.primary}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn sm" onClick={() => openPatient(p.id)}><Icon name="patient" size={13}/> Akte</button>
                <button className="btn sm"><Icon name="syringe" size={13}/> Anordnung</button>
                <button className="btn sm primary"><Icon name="edit" size={13}/> Visitennote</button>
              </div>
            </div>
          </div>

          {/* Monitor — vital waves */}
          <div className="card">
            <div className="card-h">
              <h3>Monitor — Live-Vitalparameter</h3>
              <div className="sub" style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="status-dot green"/>Übertragung aktiv · letzter Wert vor 8 Sek.</div>
            </div>
            <div className="card-b" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <VitalWave label="HF" value={p.vitals.hr} unit="/min" color="#1f7a4d" trend={trend.hr}/>
              <VitalWave label="RR sys" value={p.vitals.sys} unit="mmHg" color="#b3261e" trend={trend.sys}/>
              <VitalWave label="SpO₂" value={p.vitals.spo2} unit="%" color="#2563a8" trend={trend.spo2}/>
              <VitalWave label="AF" value={p.vitals.rr} unit="/min" color="#5b4cbf" trend={trend.rr}/>
            </div>
          </div>

          {/* Ventilator + Drugs + Catheters */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div className="card">
              <div className="card-h"><h3>Beatmung</h3></div>
              <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
                {p.ventilator ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Modus</span><strong>{p.ventilator.mode}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">PEEP</span><strong>{p.ventilator.peep} cmH₂O</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">FiO₂</span><strong>{Math.round(p.ventilator.fio2 * 100)}%</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Vt</span><strong>{p.ventilator.vt} ml</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">AF</span><strong>{p.ventilator.rr}/min</strong></div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Modus</span><strong>NIV — CPAP</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">PEEP</span><strong>10 cmH₂O</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">FiO₂</span><strong>60%</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Maske</span><strong>Vollgesicht</strong></div>
                  </>
                )}
              </div>
            </div>
            <div className="card">
              <div className="card-h"><h3>Perfusoren / Katecholamine</h3></div>
              <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                {(p.drugs || ["Noradrenalin 0.12 µg/kg/min", "Propofol 250 mg/h", "Sufentanil 30 µg/h", "Insulin 2 IE/h"]).map((d, i) => (
                  <div key={i} style={{ padding: "6px 8px", background: "var(--bg-sunken)", borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="syringe" size={12} style={{ color: "var(--violet)" }}/>
                    {d}
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-h"><h3>Zugänge & Drainagen</h3></div>
              <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                {(p.catheters || ["ZVK V. jugularis re. (Tag 4)", "Arterie A. radialis li. (Tag 4)", "DK Urin (Tag 4)", "Magensonde", "Beatmungstubus 7.5 (Tag 3)"]).map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", background: "var(--bg-sunken)", borderRadius: 6 }}>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scores + Bilanz */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="card">
              <div className="card-h"><h3>Scores</h3></div>
              <div className="card-b" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  ["SAPS II", "42", "Mortalität ~25%", "amber"],
                  ["SOFA", "8", "Sepsis", "red"],
                  ["RASS", p.sedation || "−2", "tief sediert", "blue"],
                  ["Glasgow Coma", "10t", "intubiert", "amber"],
                ].map(([l, v, h, t]) => (
                  <div key={l} style={{ padding: 10, background: "var(--bg-sunken)", borderRadius: 8 }}>
                    <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", fontWeight: 600 }}>{l}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{v}</div>
                    <Tag tone={t}>{h}</Tag>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-h"><h3>Bilanz 24h</h3></div>
              <div className="card-b">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12.5 }}>
                  <div><div className="muted" style={{ fontSize: 11 }}>Einfuhr</div><div style={{ fontSize: 18, fontWeight: 700 }}>3 250<span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500 }}> ml</span></div></div>
                  <div><div className="muted" style={{ fontSize: 11 }}>Ausfuhr</div><div style={{ fontSize: 18, fontWeight: 700 }}>2 480<span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500 }}> ml</span></div></div>
                  <div><div className="muted" style={{ fontSize: 11 }}>Bilanz</div><div style={{ fontSize: 18, fontWeight: 700, color: "var(--amber)" }}>+770<span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500 }}> ml</span></div></div>
                </div>
                <div className="sep"/>
                <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
                  Urin 1840 ml · Drainage 240 ml · Stuhl —<br/>
                  Infusionen 2400 ml · EK 1× 280 ml · Ernährung 570 ml
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ICU = ICU;
