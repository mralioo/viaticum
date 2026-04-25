/* Bildgebung — DICOM-style viewer */

function Imaging() {
  const [active, setActive] = React.useState(IMAGING[0].id);
  const study = IMAGING.find(s => s.id === active);
  const patient = PATIENTS.find(p => p.id === study.patient);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 320px", height: "100%", background: "#0a0f14" }}>
      {/* Study list */}
      <div style={{ background: "var(--bg-elev)", borderRight: "1px solid var(--line)", overflow: "auto" }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Bildgebung</h3>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{IMAGING.length} Studien · letzte 30 Tage</div>
        </div>
        {IMAGING.map(s => {
          const a = s.id === active;
          const p = PATIENTS.find(x => x.id === s.patient);
          return (
            <div key={s.id} onClick={() => setActive(s.id)} style={{
              padding: "12px 14px", borderBottom: "1px solid var(--line)", cursor: "pointer",
              background: a ? "var(--teal-tint)" : "transparent",
              borderLeft: a ? "3px solid var(--teal)" : "3px solid transparent"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Tag tone={s.modality === "CT" ? "violet" : s.modality === "MRT" ? "blue" : s.modality === "Koro" ? "red" : "teal"}>{s.modality}</Tag>
                <span style={{ fontSize: 10, color: "var(--ink-3)" }} className="mono">{s.id}</span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 6 }}>{s.region}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{p?.name || "—"}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{s.date}</div>
            </div>
          );
        })}
      </div>

      {/* Viewer */}
      <div style={{ display: "flex", flexDirection: "column", background: "#0a0f14", color: "#cdd5db" }}>
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid #1a232e", background: "#0e1419" }}>
          <button className="icon-btn" style={{ color: "#cdd5db" }}><Icon name="zoom-in" size={16}/></button>
          <button className="icon-btn" style={{ color: "#cdd5db" }}><Icon name="zoom-out" size={16}/></button>
          <div style={{ width: 1, height: 18, background: "#2a3441" }}/>
          <span style={{ fontSize: 11, color: "#7c8a9c" }}>WW/WL:</span>
          <span className="mono" style={{ fontSize: 11 }}>1500 / -600</span>
          <div style={{ width: 1, height: 18, background: "#2a3441" }}/>
          <span style={{ fontSize: 11, color: "#7c8a9c" }}>Schicht:</span>
          <span className="mono" style={{ fontSize: 11 }}>42 / 128</span>
          <div className="spacer"/>
          <button className="btn sm" style={{ background: "#1a232e", borderColor: "#2a3441", color: "#cdd5db" }}>MPR</button>
          <button className="btn sm" style={{ background: "#1a232e", borderColor: "#2a3441", color: "#cdd5db" }}>Vergleich</button>
          <button className="btn sm" style={{ background: "#1a232e", borderColor: "#2a3441", color: "#cdd5db" }}><Icon name="expand" size={13}/></button>
        </div>

        {/* Image area */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 2, background: "#000" }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ position: "relative", background: "#000", display: "grid", placeItems: "center", overflow: "hidden" }}>
              {/* simulated CT/MR image — radial gradient + grid */}
              <div style={{
                width: "70%", aspectRatio: "1",
                background: i === 0
                  ? "radial-gradient(ellipse 50% 60% at 50% 55%, #b0bcc7 0%, #6c7884 25%, #2a3441 55%, #0e1419 80%)"
                  : i === 1
                  ? "radial-gradient(ellipse 60% 40% at 50% 50%, #9da9b6 0%, #5a6675 30%, #1a232e 60%, #0a0f14 85%)"
                  : i === 2
                  ? "radial-gradient(circle at 40% 50%, #c5d0db 0%, #7a8693 25%, #2a3441 50%, #0a0f14 80%), radial-gradient(circle at 65% 55%, #4a5562 0%, transparent 30%)"
                  : "radial-gradient(ellipse 50% 65% at 50% 50%, #aab6c2 0%, #5a6675 30%, #1a232e 65%, #000 90%)",
                borderRadius: 6,
                filter: "contrast(1.05)"
              }}/>
              {/* Overlay info */}
              <div style={{ position: "absolute", top: 8, left: 10, fontSize: 10, fontFamily: "var(--font-mono)", color: "#7c8a9c", lineHeight: 1.5 }}>
                <div>{patient?.name}</div>
                <div>{patient?.id} · {patient?.geb}</div>
                <div>{study.modality} {study.region}</div>
              </div>
              <div style={{ position: "absolute", top: 8, right: 10, fontSize: 10, fontFamily: "var(--font-mono)", color: "#7c8a9c", textAlign: "right", lineHeight: 1.5 }}>
                <div>Bild {i * 32 + 12} / 128</div>
                <div>Schichtdicke 1.0 mm</div>
                <div>{["Axial", "Coronar", "Sagittal", "Axial+KM"][i]}</div>
              </div>
              <div style={{ position: "absolute", bottom: 8, left: 10, fontSize: 10, fontFamily: "var(--font-mono)", color: "#7c8a9c" }}>
                {study.date}
              </div>
              <div style={{ position: "absolute", bottom: 8, right: 10, fontSize: 10, fontFamily: "var(--font-mono)", color: "#7c8a9c" }}>
                F: 0.8 mGy
              </div>
            </div>
          ))}
        </div>

        {/* Slice strip */}
        <div style={{ display: "flex", gap: 4, padding: 10, background: "#0e1419", borderTop: "1px solid #1a232e", overflowX: "auto" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{
              width: 60, height: 50, flexShrink: 0,
              background: `radial-gradient(ellipse 50% 60% at 50% 55%, #b0bcc7 0%, #6c7884 25%, #2a3441 55%, #0e1419 80%)`,
              borderRadius: 3,
              border: i === 4 ? "2px solid var(--teal-2)" : "1px solid #2a3441",
              filter: i === 4 ? "none" : "brightness(0.6)"
            }}/>
          ))}
        </div>
      </div>

      {/* Right panel — findings */}
      <div style={{ background: "var(--bg-elev)", borderLeft: "1px solid var(--line)", overflow: "auto" }}>
        <div style={{ padding: 16, borderBottom: "1px solid var(--line)" }}>
          <Tag tone="green" dot>Befund freigegeben</Tag>
          <h3 style={{ margin: "10px 0 4px", fontSize: 15 }}>{study.modality} — {study.region}</h3>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{study.date} · {study.radiologist}</div>
        </div>

        <div style={{ padding: 16, borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Patient</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{patient?.name}</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{patient?.geb} · {patient?.age} J · {patient?.id}</div>
        </div>

        <div style={{ padding: 16, borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Indikation</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>{study.indication}</div>
        </div>

        <div style={{ padding: 16, borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Befund</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>{study.findings}</div>
        </div>

        <div style={{ padding: 16, borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Beurteilung</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, padding: 10, background: "var(--teal-tint)", borderRadius: 8 }}>
            Vereinbar mit klinischem V.a. <strong>kardiale Stauung bei dekomp. Herzinsuffizienz</strong>. Empfehlung: Diuretika-Therapie, Verlaufskontrolle in 48h.
          </div>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          <button className="btn sm"><Icon name="ueber" size={13}/> An Anforderer senden</button>
          <button className="btn sm"><Icon name="print" size={13}/> Befund drucken</button>
          <button className="btn sm primary"><Icon name="check" size={13}/> Gegenzeichnen</button>
        </div>
      </div>
    </div>
  );
}

window.Imaging = Imaging;
