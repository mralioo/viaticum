/* Settings / Admin */

function Settings() {
  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">Einstellungen</h1>
          <div className="page-sub">Profil · Klinik · Telematikinfrastruktur · Rollen</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            ["Profil", "patient", true],
            ["Klinik & Standort", "ward", false],
            ["Telematik (TI)", "shield", false],
            ["Rollen & Rechte", "lock", false],
            ["Vorlagen", "doc", false],
            ["Schnittstellen", "ueber", false],
            ["Audit-Log", "info", false],
            ["Datenschutz (DSGVO)", "shield", false],
            ["Abmelden", "logout", false],
          ].map(([l, ic, a]) => (
            <button key={l} className="nav-item" style={a ? { background: "var(--teal-soft)", color: "var(--teal-2)", fontWeight: 600 } : {}}>
              <Icon name={ic} size={15}/>{l}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div className="card-h"><h3>Profil</h3><button className="btn sm primary">Änderungen speichern</button></div>
            <div className="card-b" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="field-row"><label>Vorname</label><input className="input" defaultValue="Maria"/></div>
              <div className="field-row"><label>Nachname</label><input className="input" defaultValue="Weber"/></div>
              <div className="field-row"><label>Titel</label><input className="input" defaultValue="Dr. med."/></div>
              <div className="field-row"><label>Funktion</label><input className="input" defaultValue="Oberärztin Kardiologie"/></div>
              <div className="field-row"><label>LANR</label><input className="input mono" defaultValue="445566001"/></div>
              <div className="field-row"><label>BSNR Klinik</label><input className="input mono" defaultValue="123456700"/></div>
              <div className="field-row"><label>E-Mail dienstlich</label><input className="input" defaultValue="weber@klinikum-muenchen.de"/></div>
              <div className="field-row"><label>Durchwahl</label><input className="input" defaultValue="-3142"/></div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Telematikinfrastruktur (TI)</h3><Tag tone="green" dot>verbunden</Tag></div>
            <div className="card-b" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ padding: 12, background: "var(--green-soft)", borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--green)" }}><Icon name="shield" size={13} style={{ verticalAlign: "-2px", marginRight: 4 }}/>Konnektor PT-3</div>
                <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 4 }}>Letzter Heartbeat: vor 12 Sek.<br/>Firmware 5.4.7-prod</div>
              </div>
              <div style={{ padding: 12, background: "var(--teal-tint)", borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--teal-2)" }}><Icon name="lock" size={13} style={{ verticalAlign: "-2px", marginRight: 4 }}/>Heilberufsausweis (HBA)</div>
                <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 4 }}>Steckkartenleser SAK-3<br/>Karte gültig bis 31.08.2027</div>
              </div>
              <div className="field-row"><label>SMC-B (Praxisausweis)</label><input className="input mono" defaultValue="80276001011699901101" readOnly/></div>
              <div className="field-row"><label>KIM-Adresse</label><input className="input" defaultValue="m.weber@klinikum-muenchen.kim.telematik" readOnly/></div>
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 14, fontSize: 12.5 }}>
                {[["e-Rezept", "online"], ["eAU", "online"], ["ePA", "online"], ["KIM", "online"], ["VSDM", "online"], ["NFD", "offline"]].map(([k, s]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className={"status-dot " + (s === "online" ? "green" : "gray")}/>
                    <span>{k}</span>
                    <span style={{ color: "var(--ink-3)" }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Audit-Log — Letzte Zugriffe</h3><button className="btn sm">CSV Export</button></div>
            <table className="table">
              <thead><tr><th>Zeit</th><th>Benutzer</th><th>Rolle</th><th>Aktion</th><th>Patient</th><th>IP</th></tr></thead>
              <tbody>
                {[
                  ["07:32", "Dr. Weber", "Arzt", "Akte geöffnet", "Müller, H. (P-104821)", "10.4.2.118"],
                  ["07:30", "Dr. Weber", "Arzt", "Anmeldung HBA", "—", "10.4.2.118"],
                  ["07:18", "Schwester Linda", "Pflege", "Vitalzeichen erfasst", "Fischer, R. (P-104826)", "10.4.2.205"],
                  ["07:15", "Dr. Hofmann", "Arzt", "Anordnung freigegeben", "Yılmaz, A. (P-104823)", "10.4.2.114"],
                  ["06:50", "Dr. Becker", "Arzt", "Entlassbrief signiert", "Becker, L. (P-104824)", "10.4.2.117"],
                  ["06:14", "Labor-Schnittstelle", "System", "Befunde übermittelt", "12 Patienten", "10.4.1.40"],
                ].map((r, i) => (
                  <tr key={i}>
                    <td className="tab-num">{r[0]}</td>
                    <td>{r[1]}</td>
                    <td><Tag tone={r[2] === "Arzt" ? "teal" : r[2] === "Pflege" ? "violet" : "blue"}>{r[2]}</Tag></td>
                    <td>{r[3]}</td>
                    <td>{r[4]}</td>
                    <td className="mono muted">{r[5]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-h"><h3>Datenschutz (DSGVO)</h3></div>
            <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: 10, background: "var(--bg-sunken)", borderRadius: 6 }}>
                <span>Verzeichnis von Verarbeitungstätigkeiten (VVT)</span><Tag tone="green">aktuell</Tag>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: 10, background: "var(--bg-sunken)", borderRadius: 6 }}>
                <span>Auftragsverarbeitungsverträge</span><span className="muted tab-num">14 / 14</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: 10, background: "var(--bg-sunken)", borderRadius: 6 }}>
                <span>Datenschutzbeauftragter</span><span>Dr. K. Hoffmann</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: 10, background: "var(--bg-sunken)", borderRadius: 6 }}>
                <span>Letzte Auskunftsanfrage (Art. 15)</span><span className="muted">vor 11 Tagen — bearbeitet</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Settings = Settings;
