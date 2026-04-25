/* Modals — e-Rezept, Überweisung */

function RezeptModal({ patient, onClose }) {
  const [med, setMed] = React.useState("Bisoprolol 5 mg Filmtabletten N3");
  const [packs, setPacks] = React.useState(1);
  const [dosage, setDosage] = React.useState("1-0-0");
  const [aut, setAut] = React.useState(false);
  const [bgt, setBgt] = React.useState(true);

  return (
    <div className="modal-shade" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div>
            <h2>e-Rezept ausstellen</h2>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{patient.name} · {patient.id} · {patient.insurance.name}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16}/></button>
        </div>
        <div className="modal-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field-row" style={{ gridColumn: "1 / -1" }}>
              <label>Arzneimittel (Wirkstoff oder PZN)</label>
              <input className="input" value={med} onChange={e => setMed(e.target.value)}/>
              <div className="hint">PZN: 02746162 · Anbieter: 1A Pharma · Festbetrag: 18,42 €</div>
            </div>
            <div className="field-row">
              <label>Packungsgröße</label>
              <select className="select"><option>N1 (30 Stk.)</option><option>N2 (50 Stk.)</option><option selected>N3 (100 Stk.)</option></select>
            </div>
            <div className="field-row">
              <label>Anzahl Packungen</label>
              <input className="input" type="number" value={packs} onChange={e => setPacks(+e.target.value)}/>
            </div>
            <div className="field-row">
              <label>Dosierung (m – m – a – n)</label>
              <input className="input" value={dosage} onChange={e => setDosage(e.target.value)}/>
            </div>
            <div className="field-row">
              <label>Reichweite</label>
              <input className="input" value="100 Tage" readOnly/>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, padding: "10px 12px", background: "var(--bg-sunken)", borderRadius: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: "pointer" }}>
              <input type="checkbox" checked={aut} onChange={e => setAut(e.target.checked)}/> aut idem (kein Austausch)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: "pointer" }}>
              <input type="checkbox" checked={bgt} onChange={e => setBgt(e.target.checked)}/> Zuzahlungspflichtig
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: "pointer", marginLeft: "auto" }}>
              <input type="checkbox"/> Notfall (Sondersignet 7)
            </label>
          </div>

          <div style={{ padding: 12, background: "var(--green-soft)", color: "var(--green)", borderRadius: 8, fontSize: 12.5, display: "flex", gap: 10 }}>
            <Icon name="check" size={14}/>
            <div>
              <strong>Keine Wechselwirkungen</strong> mit aktueller Medikation des Patienten erkannt.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field-row">
              <label>Dosierungsanweisung</label>
              <textarea className="textarea" defaultValue="1 Tablette morgens nüchtern mit Wasser einnehmen."></textarea>
            </div>
            <div className="field-row">
              <label>Vermerk an Apotheke</label>
              <textarea className="textarea"></textarea>
            </div>
          </div>

          <div style={{ background: "var(--teal-tint)", padding: 12, borderRadius: 8, fontSize: 12, color: "var(--ink-2)", display: "flex", gap: 10 }}>
            <Icon name="shield" size={14} style={{ color: "var(--teal-2)" }}/>
            <div>
              Versand an gematik-Fachdienst per <strong>HBA-Signatur</strong>. Patient erhält Token via App oder als Papier-Ausdruck.
            </div>
          </div>
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onClose}>Abbrechen</button>
          <button className="btn">Als Entwurf speichern</button>
          <button className="btn primary"><Icon name="lock" size={13}/> Mit HBA signieren & senden</button>
        </div>
      </div>
    </div>
  );
}

function UeberweisungModal({ patient, onClose }) {
  return (
    <div className="modal-shade" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div>
            <h2>Überweisung ausstellen</h2>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{patient.name} · {patient.id} · {patient.insurance.type}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16}/></button>
        </div>
        <div className="modal-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field-row" style={{ gridColumn: "1 / -1" }}>
              <label>An Facharzt / Einrichtung</label>
              <input className="input" defaultValue="Praxis Dr. Berger — Kardiologie, Kaiserstr. 12, 80331 München"/>
              <div className="hint">LANR: 999912345 · BSNR: 123456700</div>
            </div>
            <div className="field-row">
              <label>Fachgebiet</label>
              <select className="select"><option>Kardiologie</option><option>Neurologie</option><option>Onkologie</option><option>Orthopädie</option></select>
            </div>
            <div className="field-row">
              <label>Auftrag</label>
              <select className="select"><option>Mitbehandlung</option><option>Konsiliaruntersuchung</option><option>Weiterbehandlung</option></select>
            </div>
            <div className="field-row" style={{ gridColumn: "1 / -1" }}>
              <label>Auftragsbeschreibung</label>
              <textarea className="textarea" defaultValue="TTE Verlaufskontrolle bei dekomp. HI bei DCM. Bitte um Mitbeurteilung der LV-Funktion und ggf. Anpassung der HI-Therapie."></textarea>
            </div>
            <div className="field-row">
              <label>Diagnose (ICD-10)</label>
              <input className="input" defaultValue="I50.13 G"/>
            </div>
            <div className="field-row">
              <label>Dringlichkeit</label>
              <select className="select"><option>regulär</option><option>zeitnah</option><option>dringend</option></select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, fontSize: 12.5 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" defaultChecked/> Befunde / Vorberichte beifügen
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox"/> Patientenverfügung beifügen
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" defaultChecked/> Versand via KIM
            </label>
          </div>
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onClose}>Abbrechen</button>
          <button className="btn">Drucken</button>
          <button className="btn primary"><Icon name="ueber" size={13}/> Senden</button>
        </div>
      </div>
    </div>
  );
}

window.RezeptModal = RezeptModal;
window.UeberweisungModal = UeberweisungModal;
