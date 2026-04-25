/* Patientenakte — detail view with tabs */

function PatientRecord({ patientId, goBack, openModal }) {
  const p = PATIENTS.find(x => x.id === patientId) || PATIENTS[0];
  const [tab, setTab] = React.useState("uebersicht");
  const meds = MEDICATION.filter(m => m.patient === p.id);
  const labs = LAB_RESULTS.filter(l => l.patient === p.id);
  const studies = IMAGING.filter(i => i.patient === p.id);

  return (
    <div className="page">
      {/* Patient header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <button className="btn ghost sm" onClick={goBack}><Icon name="chevL" size={14}/> Zurück</button>
        <span style={{ color: "var(--ink-4)" }}>/</span>
        <span className="muted" style={{ fontSize: 12 }}>Patientenliste</span>
        <span style={{ color: "var(--ink-4)" }}>/</span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</span>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "center" }}>
          <Avatar name={p.name} size="lg"/>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em" }}>{p.name}</h1>
              <span style={{ color: "var(--ink-3)", fontSize: 13 }}>{p.sex === "w" ? "♀" : "♂"} · {p.geb} ({p.age} J.)</span>
              <span className="mono" style={{ color: "var(--ink-3)", fontSize: 12 }}>{p.id}</span>
              <Tag tone={p.severity === "critical" ? "red" : p.severity === "watch" ? "amber" : "green"} dot>
                {p.severity === "critical" ? "Kritisch" : p.severity === "watch" ? "Beobachtung" : "Stabil"}
              </Tag>
              {p.dnr && <Tag tone="red">DNR</Tag>}
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 8, fontSize: 12.5, color: "var(--ink-2)", flexWrap: "wrap" }}>
              <span><Icon name="ward" size={13} style={{ verticalAlign: "-2px", marginRight: 4 }}/>{p.station} · Zi. {p.room} {p.bed && `Bett ${p.bed}`}</span>
              <span><Icon name="clock" size={13} style={{ verticalAlign: "-2px", marginRight: 4 }}/>Aufnahme {p.admit} · {p.los} Tag(e)</span>
              <span><Icon name="stetho" size={13} style={{ verticalAlign: "-2px", marginRight: 4 }}/>Behandelnd: {p.attending}</span>
              <span><Icon name="shield" size={13} style={{ verticalAlign: "-2px", marginRight: 4 }}/>{p.insurance.name} · {p.insurance.type}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button className="btn sm" onClick={() => openModal("rezept", p)}><Icon name="rezept" size={13}/> e-Rezept</button>
            <button className="btn sm" onClick={() => openModal("ueber", p)}><Icon name="ueber" size={13}/> Überweisung</button>
            <button className="btn sm"><Icon name="doc" size={13}/> Arztbrief</button>
            <button className="btn sm primary"><Icon name="edit" size={13}/> Verlaufseintrag</button>
          </div>
        </div>

        {/* Allergy / warning band */}
        {p.allergies[0] !== "Keine bekannt" && (
          <div style={{ marginTop: 14, padding: "8px 12px", background: "var(--red-soft)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, color: "var(--red)" }}>
            <Icon name="warn" size={15}/>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>Allergien & Unverträglichkeiten:</div>
            <div style={{ fontSize: 12.5 }}>{p.allergies.join(" · ")}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          ["uebersicht", "Übersicht"],
          ["diagnosen", "Diagnosen & Probleme"],
          ["verlauf", "Verlauf (SOAP)"],
          ["medikation", "Medikation"],
          ["labor", "Labor"],
          ["bildgebung", "Bildgebung"],
          ["dokumente", "Dokumente"],
          ["abrechnung", "Abrechnung"],
        ].map(([k, label]) => (
          <button key={k} className={"tab " + (tab === k ? "active" : "")} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === "uebersicht" && <RecordOverview p={p} meds={meds} labs={labs} studies={studies}/>}
      {tab === "diagnosen" && <RecordDiagnoses p={p}/>}
      {tab === "verlauf" && <RecordSoap p={p}/>}
      {tab === "medikation" && <RecordMedication p={p} meds={meds}/>}
      {tab === "labor" && <RecordLabs labs={labs}/>}
      {tab === "bildgebung" && <RecordImaging studies={studies}/>}
      {tab === "dokumente" && <RecordDocs p={p}/>}
      {tab === "abrechnung" && <RecordBilling p={p}/>}
    </div>
  );
}

function RecordOverview({ p, meds, labs, studies }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Vitals */}
        <div className="card">
          <div className="card-h"><h3>Vitalparameter — letzte Messung</h3><span className="sub">heute 06:30</span></div>
          <div className="card-b" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
            {[
              ["HF", p.vitals.hr, "/min"],
              ["RR", `${p.vitals.sys}/${p.vitals.dia}`, "mmHg"],
              ["SpO₂", p.vitals.spo2, "%"],
              ["Temp", p.vitals.temp.toFixed(1), "°C"],
              ["AF", p.vitals.rr, "/min"],
              ["Schmerz NRS", "3", "/10"],
            ].map(([l, v, u]) => (
              <div key={l} style={{ background: "var(--bg-sunken)", padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{l}</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums", marginTop: 4 }}>{v}<span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500, marginLeft: 4 }}>{u}</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* Verlauf preview */}
        <div className="card">
          <div className="card-h"><h3>Letzte Verlaufseinträge</h3><button className="btn sm ghost">Alle anzeigen</button></div>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { d: "24.04. 06:50", a: "Dr. Weber", t: "Visite", s: "Patientin wach, orientiert. Subjektiv besser. Belastungsdyspnoe rückläufig. Beine leicht ödematös.", o: "RR 132/84, HF 78 SR, SpO₂ 96% Raumluft. Auskultation: feinblasige RGs basal bds., abklingend. Periphere Ödeme +/+." },
              { d: "23.04. 22:10", a: "Dr. Becker (DDA)", t: "Aufnahme", s: "78-jährige Patientin mit zunehmender Belastungsdyspnoe seit 4 Tagen. Bekannte HI bei DCM.", o: "RR 148/92, SpO₂ 92% RL → 96% mit 2L O₂. EKG: SR, LSB. NT-proBNP 3 240 ng/l." },
            ].map((e, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{e.d}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{e.a}</div>
                  <Tag tone="teal" >{e.t}</Tag>
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
                  <div><span style={{ fontWeight: 600, color: "var(--ink-3)" }}>S:</span> {e.s}</div>
                  <div style={{ marginTop: 4 }}><span style={{ fontWeight: 600, color: "var(--ink-3)" }}>O:</span> {e.o}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Medication preview */}
        <div className="card">
          <div className="card-h"><h3>Aktuelle Medikation</h3><div className="sub">{meds.length} Verordnungen · BMP aktuell</div></div>
          <table className="table">
            <thead><tr><th>Wirkstoff / Präparat</th><th>Schema</th><th>Indikation</th><th>seit</th><th></th></tr></thead>
            <tbody>
              {meds.slice(0, 5).map((m, i) => (
                <tr key={i}>
                  <td><div style={{ fontWeight: 600 }}>{m.name}</div><div style={{ fontSize: 11, color: "var(--ink-3)" }}>{m.form} · {m.route}</div></td>
                  <td className="mono">{m.schedule}</td>
                  <td style={{ color: "var(--ink-2)", fontSize: 12 }}>{m.indication}</td>
                  <td className="tab-num">{m.from}</td>
                  <td>{m.status === "warn" && <Tag tone="amber" dot>Wechselwirkung</Tag>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Diagnosen */}
        <div className="card">
          <div className="card-h"><h3>Diagnosen (ICD-10-GM)</h3></div>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Hauptdiagnose</div>
              <div style={{ fontSize: 13, marginTop: 4, fontWeight: 500 }}>{p.primary}</div>
            </div>
            {p.secondary.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginTop: 4 }}>Nebendiagnosen</div>
                {p.secondary.map((s, i) => (
                  <div key={i} style={{ fontSize: 12.5, marginTop: 4, color: "var(--ink-2)" }}>{s}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent labs */}
        <div className="card">
          <div className="card-h"><h3>Laborwerte</h3><span className="sub">heute 06:14</span></div>
          <div className="card-b" style={{ padding: 0 }}>
            {labs[0]?.values.slice(0, 6).map((v, i, arr) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none", fontSize: 12.5 }}>
                <span style={{ color: "var(--ink-2)" }}>{v.name}</span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: v.flag === "high" ? "var(--red)" : v.flag === "low" ? "var(--blue)" : "var(--ink)", fontWeight: 600 }}>
                  {v.v} {v.unit} {v.flag === "high" && "↑"} {v.flag === "low" && "↓"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Imaging */}
        {studies.length > 0 && (
          <div className="card">
            <div className="card-h"><h3>Bildgebung</h3><span className="sub">{studies.length}</span></div>
            <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {studies.map(s => (
                <div key={s.id} style={{ padding: 10, border: "1px solid var(--line)", borderRadius: 8, display: "flex", gap: 10 }}>
                  <div style={{ width: 50, height: 50, background: "#0a0f14", borderRadius: 6, display: "grid", placeItems: "center", color: "#7c8a9c" }}>
                    <Icon name="imaging" size={20}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5 }}>{s.modality} — {s.region}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{s.date}</div>
                    <Tag tone="green">{s.status}</Tag>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Versicherung / eGK */}
        <div className="card" style={{ padding: 16, background: "var(--teal-tint)", border: "1px solid var(--teal-soft)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Icon name="egk" size={16} style={{ color: "var(--teal-2)" }}/>
            <div style={{ fontWeight: 600, fontSize: 12.5 }}>eGK aktiv · ePA verbunden</div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
            {p.insurance.name} · {p.insurance.type}<br/>
            VK-Nr.: {p.insurance.number}<br/>
            Letzter Abgleich: heute 07:42
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordDiagnoses({ p }) {
  return (
    <div className="card">
      <div className="card-h">
        <h3>Diagnosen & Probleme (ICD-10-GM)</h3>
        <button className="btn sm primary"><Icon name="plus" size={13}/> Diagnose codieren</button>
      </div>
      <table className="table">
        <thead><tr><th>Code</th><th>Klartext</th><th>Typ</th><th>Sicherheit</th><th>Lokalisation</th><th>Erfasst</th><th>Ersteller</th></tr></thead>
        <tbody>
          {[
            { code: "I50.13", text: "Linksherzinsuffizienz, mit Beschwerden bei leichter Belastung", typ: "Hauptdiagnose", s: "gesichert", lok: "—", e: "23.04.", by: "Dr. Becker" },
            { code: "I42.0", text: "Dilatative Kardiomyopathie", typ: "Nebendiagnose", s: "gesichert", lok: "—", e: "23.04.", by: "Dr. Becker" },
            { code: "E11.9", text: "Diabetes mellitus Typ 2, ohne Komplikationen", typ: "Nebendiagnose", s: "gesichert", lok: "—", e: "23.04.", by: "Dr. Becker" },
            { code: "I10.90", text: "Essentielle Hypertonie", typ: "Nebendiagnose", s: "gesichert", lok: "—", e: "23.04.", by: "Dr. Becker" },
            { code: "N18.3", text: "Chronische Nierenkrankheit, Stadium 3", typ: "Nebendiagnose", s: "Verdacht", lok: "—", e: "24.04.", by: "Dr. Weber" },
          ].map((d, i) => (
            <tr key={i}>
              <td className="mono" style={{ fontWeight: 600 }}>{d.code}</td>
              <td>{d.text}</td>
              <td><Tag tone={d.typ === "Hauptdiagnose" ? "teal" : ""}>{d.typ}</Tag></td>
              <td><Tag tone={d.s === "gesichert" ? "green" : "amber"}>{d.s}</Tag></td>
              <td className="muted">{d.lok}</td>
              <td className="tab-num">{d.e}</td>
              <td>{d.by}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordSoap({ p }) {
  const [s, setS] = React.useState("Patientin wach, orientiert, kreislaufstabil. Subjektiv deutliche Besserung der Belastungsdyspnoe. Schlaf erholsam. Diurese suffizient (~2400 ml/24h).");
  const [o, setO] = React.useState("RR 132/84 mmHg, HF 78/min SR, SpO₂ 96% Raumluft, Temp 37.1 °C, AF 16/min.\nKardial: leise HT, kein vitientypisches Geräusch.\nPulmonal: Auskultation feinblasige RGs basal bds., abnehmend.\nAbdomen weich, keine Druckdolenz.\nExtr.: periphere Ödeme prätibial +/+, deutlich rückläufig.");
  const [a, setA] = React.useState("Dekompensierte Herzinsuffizienz NYHA III bei DCM, unter Diuretikatherapie deutliche Besserung. Niereninsuffizienz Stadium 3, Kreatinin steigend — DD prärenal bei Volumenverlust unter Diuretika.");
  const [pl, setPl] = React.useState("• Furosemid heute 40 mg p.o., morgen reduzieren auf 20 mg p.o.\n• Bilanzierung fortsetzen, Ziel −500 ml/24h\n• Kreatinin-Kontrolle morgen früh\n• TTE Verlaufskontrolle für Anschlussbehandlung anmelden\n• Sozialdienst: AHB-Antrag");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
      <div className="card">
        <div className="card-h">
          <div>
            <h3>Neuer Verlaufseintrag — SOAP</h3>
            <div className="sub">Heute 24.04.2026 · Dr. Weber · Visite</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn sm"><Icon name="save" size={13}/> Entwurf</button>
            <button className="btn sm primary"><Icon name="check" size={13}/> Signieren</button>
          </div>
        </div>
        <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { l: "S — Subjektiv", v: s, set: setS, h: "Beschwerden, Anamnese, was der Patient berichtet" },
            { l: "O — Objektiv", v: o, set: setO, h: "Befunde, Vitalwerte, klinische Untersuchung" },
            { l: "A — Assessment", v: a, set: setA, h: "Beurteilung, Diagnosen, Differentialdiagnosen" },
            { l: "P — Prozedere", v: pl, set: setPl, h: "Plan: Therapie, Diagnostik, weiteres Vorgehen" },
          ].map(f => (
            <div key={f.l} className="field-row">
              <label>{f.l}</label>
              <textarea className="textarea" value={f.v} onChange={e => f.set(e.target.value)} style={{ minHeight: 80, fontFamily: "var(--font-sans)" }}/>
              <div className="hint">{f.h}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card">
          <div className="card-h"><h3>Vorlagen</h3></div>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {["Visite Innere", "Aufnahmestatus", "Konsil-Anforderung", "Aufklärungsgespräch", "Entlassungsgespräch", "Arztbrief — Kurzform"].map(t => (
              <button key={t} className="btn ghost sm" style={{ justifyContent: "flex-start" }}>
                <Icon name="doc" size={13}/> {t}
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Letzte Einträge</h3></div>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
            {[
              ["24.04. 06:50", "Visite", "Dr. Weber"],
              ["23.04. 22:10", "Aufnahme", "Dr. Becker"],
              ["23.04. 19:30", "Notaufnahme", "Dr. Singh"],
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 2 ? "1px solid var(--line)" : "none" }}>
                <div>
                  <div className="tab-num" style={{ fontWeight: 600 }}>{r[0]}</div>
                  <div style={{ color: "var(--ink-3)", fontSize: 11 }}>{r[2]}</div>
                </div>
                <Tag tone="teal">{r[1]}</Tag>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordMedication({ p, meds }) {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <h3>Medikationsplan (BMP)</h3>
          <div className="sub">{meds.length} Verordnungen · zuletzt aktualisiert heute 06:50</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn sm"><Icon name="qr" size={13}/> BMP drucken</button>
          <button className="btn sm"><Icon name="warn" size={13}/> Interaktionen prüfen</button>
          <button className="btn sm primary"><Icon name="plus" size={13}/> Verordnen</button>
        </div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Wirkstoff / Präparat</th>
            <th>Stärke</th>
            <th>Form</th>
            <th>m – m – a – n</th>
            <th>Einheit</th>
            <th>Indikation</th>
            <th>von</th>
            <th>bis</th>
            <th>Hinweise</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {meds.map((m, i) => {
            const parts = m.schedule.split("-");
            return (
              <tr key={i}>
                <td>
                  <div style={{ fontWeight: 600 }}>{m.name.split(" ")[0]}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{m.aut ? "aut idem ✓" : "aut idem ✗"}</div>
                </td>
                <td>{m.name.match(/[\d.]+\s*(?:mg|µg|g|IE)/)?.[0] || "—"}</td>
                <td>{m.form}</td>
                <td className="mono" style={{ fontWeight: 600 }}>{parts.join(" – ")}</td>
                <td className="muted">Stk.</td>
                <td>{m.indication}</td>
                <td className="tab-num">{m.from}</td>
                <td className="tab-num">{m.until}</td>
                <td>
                  {m.status === "warn" && <Tag tone="amber" dot>{m.warning}</Tag>}
                  {m.route === "i.v." && <Tag tone="blue">i.v.</Tag>}
                </td>
                <td>
                  <button className="icon-btn"><Icon name="edit" size={13}/></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ padding: 14, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-sunken)" }}>
        <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
          <Icon name="info" size={13} style={{ verticalAlign: "-2px", marginRight: 4 }}/>
          Bei <strong>Apixaban + Amiodaron</strong> erhöhtes Blutungsrisiko — INR und Kreatinin überwachen.
        </div>
        <button className="btn sm">Hinweis quittieren</button>
      </div>
    </div>
  );
}

function RecordLabs({ labs }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {labs.map((l, i) => (
        <div className="card" key={i}>
          <div className="card-h">
            <div>
              <h3>{l.panel}</h3>
              <div className="sub">{l.date} · Labor Zentrallabor</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn sm"><Icon name="print" size={13}/></button>
              <button className="btn sm">Verlauf anzeigen</button>
            </div>
          </div>
          <table className="table">
            <thead><tr><th>Parameter</th><th>Wert</th><th>Einheit</th><th>Referenzbereich</th><th>Trend</th><th>Befund</th></tr></thead>
            <tbody>
              {l.values.map((v, j) => (
                <tr key={j}>
                  <td>{v.name}</td>
                  <td className="tab-num" style={{ fontWeight: 700, color: v.flag === "high" ? "var(--red)" : v.flag === "low" ? "var(--blue)" : "var(--ink)" }}>
                    {v.v} {v.flag === "high" && "↑"} {v.flag === "low" && "↓"}
                  </td>
                  <td className="muted">{v.unit}</td>
                  <td className="muted tab-num">{v.ref}</td>
                  <td><Sparkline data={[Math.random()*10+50, Math.random()*10+55, Math.random()*10+60, parseFloat(v.v) || 50]} w={60} h={18}/></td>
                  <td>{v.flag !== "ok" && <Tag tone={v.flag === "high" ? "red" : "blue"}>außerhalb</Tag>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function RecordImaging({ studies }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
      {studies.map(s => (
        <div key={s.id} className="card" style={{ overflow: "hidden", cursor: "pointer" }}>
          <div style={{ height: 160, background: "linear-gradient(180deg, #0a0f14, #1a232e)", position: "relative", display: "grid", placeItems: "center" }}>
            <Icon name="imaging" size={42} style={{ color: "#3a4654" }}/>
            <div style={{ position: "absolute", top: 8, left: 8, color: "#7c8a9c", fontSize: 10, fontFamily: "var(--font-mono)" }}>{s.modality.toUpperCase()} · {s.id}</div>
            <div style={{ position: "absolute", bottom: 8, right: 8 }}><Tag tone="green">{s.status}</Tag></div>
          </div>
          <div style={{ padding: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{s.region}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{s.date} · {s.radiologist}</div>
            <div style={{ fontSize: 12, marginTop: 8, color: "var(--ink-2)", lineHeight: 1.5 }}>{s.findings}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecordDocs({ p }) {
  const docs = [
    { name: "Aufnahmestatus.pdf", t: "Aufnahme", d: "23.04.2026", by: "Dr. Becker", size: "248 KB" },
    { name: "EKG_Aufnahme.pdf", t: "Diagnostik", d: "23.04.2026", by: "Funktionsdiagnostik", size: "1.2 MB" },
    { name: "Patientenaufklaerung_TTE.pdf", t: "Aufklärung", d: "23.04.2026", by: "Dr. Weber", size: "184 KB" },
    { name: "DSGVO_Einwilligung.pdf", t: "DSGVO", d: "23.04.2026", by: "Aufnahme", size: "92 KB" },
    { name: "Patientenverfuegung.pdf", t: "Vorsorge", d: "12.01.2024", by: "extern", size: "640 KB" },
    { name: "Arztbrief_Voraufenthalt_2025-08.pdf", t: "Brief", d: "08.08.2025", by: "extern", size: "412 KB" },
  ];
  return (
    <div className="card">
      <div className="card-h">
        <h3>Dokumente</h3>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn sm">Hochladen</button>
          <button className="btn sm primary"><Icon name="plus" size={13}/> Neues Dokument</button>
        </div>
      </div>
      <table className="table">
        <thead><tr><th>Name</th><th>Typ</th><th>Datum</th><th>Ersteller</th><th>Größe</th><th></th></tr></thead>
        <tbody>
          {docs.map((d, i) => (
            <tr key={i}>
              <td><Icon name="doc" size={14} style={{ verticalAlign: "-2px", color: "var(--ink-3)", marginRight: 8 }}/>{d.name}</td>
              <td><Tag tone="teal">{d.t}</Tag></td>
              <td className="tab-num">{d.d}</td>
              <td>{d.by}</td>
              <td className="muted tab-num">{d.size}</td>
              <td><button className="btn sm ghost"><Icon name="more" size={14}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordBilling({ p }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
      <div className="card">
        <div className="card-h">
          <div><h3>DRG-Vorschlag & Prozeduren</h3><div className="sub">Fall {p.id} · Grouping vorläufig</div></div>
          <button className="btn sm primary"><Icon name="check" size={13}/> Fall abschließen</button>
        </div>
        <div style={{ padding: 16, background: "var(--teal-tint)", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Vorgeschlagene DRG</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>F62B — Herzinsuffizienz und Schock ohne äußerst schwere CC</div>
          <div style={{ display: "flex", gap: 24, marginTop: 8, fontSize: 12.5 }}>
            <div><span className="muted">Bewertungsrelation:</span> <strong>0,742</strong></div>
            <div><span className="muted">VWD untere GVD:</span> <strong>2 Tg.</strong></div>
            <div><span className="muted">VWD obere GVD:</span> <strong>13 Tg.</strong></div>
            <div><span className="muted">Mittlere VWD:</span> <strong>5,8 Tg.</strong></div>
          </div>
        </div>
        <table className="table">
          <thead><tr><th>OPS</th><th>Prozedur</th><th>Datum</th><th>Ersteller</th></tr></thead>
          <tbody>
            <tr><td className="mono" style={{ fontWeight: 600 }}>1-275.0</td><td>Linksherzkatheteruntersuchung</td><td className="tab-num">23.04.</td><td>Dr. Weber</td></tr>
            <tr><td className="mono" style={{ fontWeight: 600 }}>3-052</td><td>Transthorakale Echokardiographie</td><td className="tab-num">24.04.</td><td>Dr. Weber</td></tr>
            <tr><td className="mono" style={{ fontWeight: 600 }}>8-930</td><td>Monitoring von Atmung, Herz und Kreislauf</td><td className="tab-num">23.–24.04.</td><td>Pflege</td></tr>
          </tbody>
        </table>
      </div>
      <div className="card">
        <div className="card-h"><h3>Versicherungsstatus</h3></div>
        <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Kasse</span><strong>{p.insurance.name}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Vers.-Nr.</span><span className="mono">{p.insurance.number}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Status</span><Tag tone="green" dot>aktiv</Tag></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Zuzahlungspflicht</span><span>10 € / Tag</span></div>
          <div className="sep"/>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Aufnahmegrund</span><span>{p.aufnahmeart}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Einweisung</span><span>Dr. Berger, Hausarzt</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">§301 Übermittlung</span><Tag tone="green">übertragen</Tag></div>
        </div>
      </div>
    </div>
  );
}

window.PatientRecord = PatientRecord;
