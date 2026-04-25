/* Patientenliste — searchable list */

function PatientList({ openPatient }) {
  const [q, setQ] = React.useState("");
  const [station, setStation] = React.useState("alle");
  const [severity, setSeverity] = React.useState("alle");
  const [sortBy, setSortBy] = React.useState("name");

  const filtered = PATIENTS.filter(p => {
    if (q) {
      const s = q.toLowerCase();
      if (!p.name.toLowerCase().includes(s) && !p.id.toLowerCase().includes(s) && !(p.primary || "").toLowerCase().includes(s)) return false;
    }
    if (station !== "alle" && p.station !== station) return false;
    if (severity !== "alle" && p.severity !== severity) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "los") return b.los - a.los;
    if (sortBy === "severity") {
      const o = { critical: 0, watch: 1, stable: 2 };
      return o[a.severity] - o[b.severity];
    }
    return 0;
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Patienten</h1>
          <div className="page-sub">{filtered.length} von {PATIENTS.length} aktiven Patientenakten</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="egk" size={14}/> eGK einlesen</button>
          <button className="btn"><Icon name="filter" size={14}/> Filter</button>
          <button className="btn primary"><Icon name="plus" size={14}/> Neuer Fall</button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ marginBottom: 12, padding: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <Icon name="search" size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }}/>
          <input className="input" placeholder="Nach Name, Fall-ID oder Diagnose suchen…"
                 value={q} onChange={e => setQ(e.target.value)}
                 style={{ paddingLeft: 34 }}/>
        </div>
        <select className="select" style={{ width: 180 }} value={station} onChange={e => setStation(e.target.value)}>
          <option value="alle">Alle Stationen</option>
          {STATIONS.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name.replace(s.code + " — ", "")}</option>)}
        </select>
        <select className="select" style={{ width: 160 }} value={severity} onChange={e => setSeverity(e.target.value)}>
          <option value="alle">Alle Schweregrade</option>
          <option value="critical">Kritisch</option>
          <option value="watch">Beobachtung</option>
          <option value="stable">Stabil</option>
        </select>
        <select className="select" style={{ width: 160 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="name">Sortieren: Name</option>
          <option value="los">Verweildauer</option>
          <option value="severity">Schweregrad</option>
        </select>
      </div>

      {/* Quick filter chips */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { l: "Meine Patienten", c: 9 },
          { l: "Neuaufnahmen heute", c: 3 },
          { l: "Entlassung geplant", c: 4 },
          { l: "Isolation", c: 5 },
          { l: "DNR", c: 2 },
          { l: "DRG ungeklärt", c: 7 },
        ].map(f => (
          <button key={f.l} className="btn sm" style={{ borderRadius: 999 }}>
            {f.l} <span style={{ color: "var(--ink-3)", marginLeft: 4 }}>{f.c}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Patient</th>
              <th>Geb. / Alter</th>
              <th>Fall</th>
              <th>Station</th>
              <th>Hauptdiagnose</th>
              <th>Aufnahme</th>
              <th>VWD</th>
              <th>Versicherung</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} onClick={() => openPatient(p.id)}>
                <td><SeverityDot s={p.severity}/></td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={p.name} size="sm"/>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                        {p.sex === "w" ? "♀" : "♂"} · {p.allergies[0] !== "Keine bekannt" && <span style={{ color: "var(--red)", fontWeight: 600 }}>⚠ Allergien</span>}
                        {p.dnr && <span style={{ marginLeft: 6, color: "var(--ink-3)", fontWeight: 600 }}>DNR</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="tab-num"><div>{p.geb}</div><div style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.age} J.</div></td>
                <td className="mono" style={{ color: "var(--ink-3)" }}>{p.id}</td>
                <td><Tag tone="teal">{p.station}</Tag> <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.room}/{p.bed}</span></td>
                <td style={{ maxWidth: 320 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.primary}</div>
                </td>
                <td className="tab-num" style={{ fontSize: 12 }}>{p.admit.split(" ")[0]}<div style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.aufnahmeart}</div></td>
                <td className="tab-num">{p.los} <span style={{ color: "var(--ink-3)", fontSize: 11 }}>Tg.</span></td>
                <td>
                  <div style={{ fontSize: 12 }}>{p.insurance.name}</div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{p.insurance.type} · {p.insurance.number}</div>
                </td>
                <td><Icon name="chevR" size={14} style={{ color: "var(--ink-3)" }}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", color: "var(--ink-3)", fontSize: 12 }}>
        <div>Anzeige {filtered.length} Patienten · DSGVO-konform · Zugriff protokolliert</div>
        <div>Stand: 24.04.2026 07:32</div>
      </div>
    </div>
  );
}

window.PatientList = PatientList;
