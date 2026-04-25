/* Companion (Tamagotchi-style avatar) */

const SCHOLAR_NAMES = [
  { id: "hakim", name: "Hakîm", arabic: "حكيم", meaning: "Der Weise — generischer Ehrentitel für Heiler" },
  { id: "sina", name: "Sînâ", arabic: "سينا", meaning: "Ibn Sînâ (Avicenna), 980–1037 — Kanon der Medizin" },
  { id: "tabib", name: "Tabîb", arabic: "طبيب", meaning: "Der Arzt — klassischer Titel des Heilkundigen" },
  { id: "razi", name: "Râzî", arabic: "رازي", meaning: "Al-Râzî (Rhazes), 854–925 — Pocken & Masern" },
  { id: "zahrawi", name: "Zahrâwî", arabic: "زهراوي", meaning: "Al-Zahrâwî, 936–1013 — Vater der Chirurgie" },
  { id: "nafis", name: "Nafîs", arabic: "نفيس", meaning: "Ibn al-Nafîs, 1213–1288 — Lungenkreislauf" },
];

const CHARACTERS = [
  { id: "scholar", lbl: "Gelehrt & präzise", desc: "Formell, ICD-10-treu, evidenzorientiert", glyph: "📚" },
  { id: "warm", lbl: "Warmherzig & geduldig", desc: "Empathisch, ruhig, patientenzentriert", glyph: "🤲" },
  { id: "concise", lbl: "Knapp & klinisch", desc: "Stichpunkte, keine Floskeln, schnell", glyph: "✦" },
  { id: "curious", lbl: "Neugierig & fragend", desc: "Stellt Differentialdiagnosen, hinterfragt", glyph: "?" },
];

const COLORS = [
  { l: "#66d4d4", d: "#0d8a8a", id: "teal" },
  { l: "#a3b8e0", d: "#2563a8", id: "blue" },
  { l: "#d4b87a", d: "#a07a2c", id: "gold" },
  { l: "#c9a3e0", d: "#5b4cbf", id: "violet" },
  { l: "#a8d4a3", d: "#1f7a4d", id: "green" },
  { l: "#e0a3a3", d: "#a83e2c", id: "rose" },
];

const COMPANION_TASKS = [
  { id: "transcribe", lbl: "Gespräch mitschreiben", desc: "Audio-Transkription, lokal" },
  { id: "summarize", lbl: "Anamnese zusammenfassen", desc: "SOAP-Vorschläge bei Hover" },
  { id: "code", lbl: "ICD-10 vorschlagen", desc: "GM-konform" },
  { id: "remind", lbl: "Visiten-Erinnerungen", desc: "Aufgaben & Konsile" },
  { id: "translate", lbl: "Übersetzen DE↔AR/EN/TR", desc: "Patientengespräch" },
  { id: "drug", lbl: "Wechselwirkungen prüfen", desc: "Live, vor Verordnung" },
];

// Default companion config
const DEFAULT_COMPANION = {
  name: "Hakîm",
  nameId: "hakim",
  character: "scholar",
  color: "teal",
  level: 7,
  xp: 64,
  bond: 84,
  energy: 92,
  tasks: ["transcribe", "summarize", "code", "drug"],
  greeting: "As-salāmu ʿalaykum",
};

// SOAP suggestions per field
const SOAP_SUGGESTIONS = {
  S: {
    text: "Patientin (78 J.) berichtet seit 4 Tagen zunehmende Belastungsdyspnoe; Treppensteigen über eine Etage nicht mehr möglich. Schlaf nur mit 2 Kissen erträglich, paroxysmale nächtliche Dyspnoe verneint. Husten unproduktiv. Knöchelödeme seit ca. 1 Woche zunehmend. Keine Thoraxschmerzen, keine Synkopen.",
    src: "Aus Aufnahmegespräch (23.04. 22:10) · 6 Min. transkribiert",
    confidence: 92,
  },
  O: {
    text: "RR 132/84 mmHg, HF 78/min, Sinusrhythmus. SpO₂ 96 % unter Raumluft. Temp. 37,1 °C, AF 16/min.\nKardial: leise Herztöne, keine vitientypischen Geräusche.\nPulmonal: feinblasige Rasselgeräusche basal beidseits, abnehmend.\nAbdomen: weich, indolent, keine Resistenzen.\nExtremitäten: prätibiale Ödeme +/+, deutlich rückläufig.",
    src: "Vitalparameter heute 06:30 + Untersuchungsbefund Visite",
    confidence: 96,
  },
  A: {
    text: "Dekompensierte Herzinsuffizienz NYHA III (I50.13) bei bekannter dilatativer Kardiomyopathie (I42.0), unter forcierter Diuretikatherapie deutliche klinische Besserung.\nNiereninsuffizienz Stadium 3 (N18.3) — DD prärenale Komponente bei Volumenverlust unter Schleifendiuretikum.\nDM Typ 2 (E11.9) und art. Hypertonie (I10.90) — stabil.",
    src: "Verknüpft mit Diagnosenliste · Vorschlag aus Verlauf",
    confidence: 88,
  },
  P: {
    text: "• Furosemid heute 40 mg p.o., morgen Reduktion auf 20 mg p.o.\n• Bilanzierung fortsetzen, Zielnegativbilanz ca. −500 ml/24 h\n• Kreatinin- und Elektrolytkontrolle morgen früh\n• TTE-Verlaufskontrolle anmelden (Funktion Anschlussbehandlung)\n• Sozialdienst kontaktieren — AHB-Antrag\n• Patientenedukation Trinkmenge & Gewichtskontrolle",
    src: "Aus Vorbefunden + Standard-Behandlungspfad HI",
    confidence: 90,
  },
};

const SOAP_FIELDS = [
  { key: "S", label: "Subjektiv", help: "Beschwerden, Anamnese, was die Patientin berichtet" },
  { key: "O", label: "Objektiv", help: "Befunde, Vitalwerte, körperliche Untersuchung" },
  { key: "A", label: "Assessment", help: "Beurteilung, Diagnosen, Differentialdiagnosen (ICD-10-GM)" },
  { key: "P", label: "Prozedere", help: "Plan: Therapie, Diagnostik, weiteres Vorgehen" },
];

function CompaPet({ companion, mood = "happy", thinking = false, onClick, withHat = true, withHalo = true, mini = false }) {
  const color = COLORS.find(c => c.id === companion.color) || COLORS[0];
  const style = { "--pet-l": color.l, "--pet-d": color.d };
  return (
    <div
      className={"compa-pet mood-" + mood + (thinking ? " thinking" : "")}
      style={style}
      onClick={onClick}
    >
      {withHalo && <div className="halo"/>}
      {withHalo && <div className="halo-2"/>}
      {withHat && <div className="hat"/>}
      <div className="mouth"/>
    </div>
  );
}

function CompanionDock({ companion, openChat, openConfig, suggestion, onAcceptAll }) {
  const [bubble, setBubble] = React.useState(null);
  const isListening = companion.tasks.includes("transcribe");

  React.useEffect(() => {
    // initial greeting bubble
    const t = setTimeout(() => {
      setBubble({
        text: `${companion.greeting}, Frau Dr. Weber. Ich höre dem Aufnahmegespräch zu — wenn Sie auf ein SOAP-Feld zeigen, schlage ich einen Eintrag vor.`,
        showActions: true,
      });
    }, 800);
    const t2 = setTimeout(() => setBubble(null), 9000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  return (
    <div className="compa-dock">
      {bubble && (
        <div className="compa-speech">
          <div className="who">{companion.name} sagt</div>
          <div>{bubble.text}</div>
          {bubble.showActions && (
            <div className="actions">
              <button className="primary" onClick={() => { onAcceptAll(); setBubble(null); }}>Alle Felder vorausfüllen</button>
              <button onClick={() => setBubble(null)}>Später</button>
            </div>
          )}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <CompaPet
          companion={companion}
          mood={isListening ? "listening" : "happy"}
          thinking={!!suggestion}
          onClick={openChat}
        />
        <div className="compa-stats">
          <div className="stat" title="Bond">♡</div>
          <div className="stat" title="Energie">⚡</div>
        </div>
        {isListening && (
          <div className="compa-status">
            <span className="mic-dot"/> hört zu
          </div>
        )}
      </div>
    </div>
  );
}

function SoapField({ field, value, onChange, onHover, onLeave, onAccept, suggestion, isHovered }) {
  const fieldRef = React.useRef(null);
  return (
    <div
      ref={fieldRef}
      className={"soap-field " + (isHovered ? "is-hovered" : "")}
      onMouseEnter={() => onHover(field.key, fieldRef.current)}
      onMouseLeave={onLeave}
    >
      <div className="label-row">
        <div className="badge">{field.key}</div>
        <div className="label">{field.label}<small>{field.help}</small></div>
        <div className="companion-hint">Begleiter schlägt vor…</div>
      </div>
      <textarea
        value={value}
        placeholder={`Hier ${field.label.toLowerCase()} dokumentieren — oder Maus halten, damit der Begleiter einen Vorschlag macht.`}
        onChange={e => onChange(field.key, e.target.value)}
      />
      {isHovered && suggestion && (
        <div className="compa-suggest" style={{ left: 16, right: 16, top: "100%", marginTop: 6 }}>
          <div className="head">
            ✶ Vorschlag von Hakîm
            <span className="src">Konfidenz {suggestion.confidence}%</span>
          </div>
          <pre>{suggestion.text}</pre>
          <div className="footer">
            <span className="meta">{suggestion.src}</span>
            <button className="btn sm" onClick={onLeave}>Verwerfen</button>
            <button className="btn sm" onClick={() => onAccept(field.key, suggestion.text, true)}>Bearbeiten</button>
            <button className="btn sm primary" onClick={() => onAccept(field.key, suggestion.text)}>
              <Icon name="check" size={12}/> Übernehmen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CompanionChat({ companion, onClose, onOpenConfig }) {
  const [messages, setMessages] = React.useState([
    { from: "bot", text: `${companion.greeting} Frau Dr. Weber. Heute Visite Station 4-Süd, 8 Patientinnen. Wo soll ich beginnen?`, time: "07:42" },
    { from: "bot", text: "Ich kann u. a.:", quick: ["Aufnahme zusammenfassen", "ICD-10 vorschlagen", "TTE-Befund einsortieren", "Arztbrief beginnen"], time: "07:42" },
  ]);
  const [input, setInput] = React.useState("");
  const [recording, setRecording] = React.useState(false);
  const bodyRef = React.useRef(null);

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  function send(text) {
    if (!text.trim()) return;
    const t = new Date(); const time = `${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`;
    setMessages(m => [...m, { from: "me", text, time }]);
    setInput("");
    // canned reply
    setTimeout(() => {
      const replies = {
        "Aufnahme zusammenfassen": "78-jährige Patientin mit dekompensierter HI bei DCM. NYHA III, NT-proBNP 3 240 ng/l, basale RGs bds, Knöchelödeme +/+. Aufnahme 23.04. um 22:10 via Notaufnahme. Soll ich daraus einen S+O-Eintrag erstellen?",
        "ICD-10 vorschlagen": "Vorschlag: Hauptdiagnose I50.13 (Linksherzinsuffizienz, mit Beschwerden bei leichter Belastung). Nebendiagnosen I42.0, E11.9, I10.90, N18.3 (V.a.). Soll ich diese in die Diagnosenliste übernehmen?",
        "TTE-Befund einsortieren": "TTE vom 24.04. zeigt LVEF 28%, mittelgradige MI, dilatierten LV. Ich kann den Befund unter Bildgebung anlegen und in das Assessment einbauen.",
        "Arztbrief beginnen": "Ich erstelle einen Entwurf des Arztbriefs nach Standard-Schema (Diagnosen → Anamnese → Befunde → Verlauf → Therapie-Empfehlung). Soll ich starten?",
      };
      const reply = replies[text] || `Verstanden. Ich arbeite daran — gleich erscheint der Vorschlag im SOAP-Feld.`;
      setMessages(m => [...m, { from: "bot", text: reply, time }]);
    }, 600);
  }

  return (
    <>
      <div className="compa-chat-shade" onClick={onClose}/>
      <div className="compa-chat" onClick={e => e.stopPropagation()}>
        <div className="compa-chat-head">
          <div className="mini-pet" style={{
            "--pet-l": (COLORS.find(c => c.id === companion.color) || COLORS[0]).l,
            "--pet-d": (COLORS.find(c => c.id === companion.color) || COLORS[0]).d,
          }}/>
          <div>
            <div className="name">{companion.name}</div>
            <div className="sub"><span className="live">aktiv</span> · Lvl {companion.level} · Vertrauen {companion.bond}%</div>
          </div>
          <div className="head-actions">
            <button title="Begleiter konfigurieren" onClick={onOpenConfig}>
              <Icon name="settings" size={15}/>
            </button>
            <button title="Schließen" onClick={onClose}>
              <Icon name="x" size={15}/>
            </button>
          </div>
        </div>
        <div className="compa-chat-body" ref={bodyRef}>
          {messages.map((m, i) => (
            <div key={i} className={"msg " + (m.from === "me" ? "me" : "bot")}>
              <div>
                <div className="bubble">{m.text}</div>
                {m.quick && (
                  <div className="quick">
                    {m.quick.map(q => <button key={q} onClick={() => send(q)}>{q}</button>)}
                  </div>
                )}
                <div className="meta">{m.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="compa-chat-input">
          <button className={"icon-btn rec " + (recording ? "on" : "")} onClick={() => setRecording(r => !r)} title="Diktat starten">
            <Icon name="mic" size={15}/>
          </button>
          <input
            placeholder={`Frage an ${companion.name}…`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send(input)}
          />
          <button className="icon-btn send" onClick={() => send(input)} title="Senden">
            <Icon name="send" size={14}/>
          </button>
        </div>
      </div>
    </>
  );
}

function CompanionConfig({ companion, setCompanion, onClose }) {
  const [draft, setDraft] = React.useState(companion);
  const update = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const toggleTask = (id) => setDraft(d => ({
    ...d,
    tasks: d.tasks.includes(id) ? d.tasks.filter(t => t !== id) : [...d.tasks, id]
  }));
  const save = () => { setCompanion(draft); onClose(); };

  const color = COLORS.find(c => c.id === draft.color) || COLORS[0];

  return (
    <div className="compa-config-shade" onClick={onClose}>
      <div className="compa-config" onClick={e => e.stopPropagation()}>
        <div className="left">
          <div className="preview-pet" style={{ "--pet-l": color.l, "--pet-d": color.d }}>
            <div className="mouth"/>
          </div>
          <h2 className="preview-name">{draft.name}</h2>
          <div className="preview-trait">
            {(CHARACTERS.find(c => c.id === draft.character) || CHARACTERS[0]).lbl}
          </div>
          <div className="level-bar">
            <div className="row"><span>Vertrauen</span><span>{draft.bond}%</span></div>
            <div className="track"><i style={{ width: draft.bond + "%" }}/></div>
            <div className="row" style={{ marginTop: 12 }}><span>Erfahrung · Lvl {draft.level}</span><span>{draft.xp} / 100 XP</span></div>
            <div className="track"><i style={{ width: draft.xp + "%" }}/></div>
            <div className="row" style={{ marginTop: 12 }}><span>Energie</span><span>{draft.energy}%</span></div>
            <div className="track"><i style={{ width: draft.energy + "%" }}/></div>
          </div>
        </div>

        <div className="right">
          <h2>Begleiter konfigurieren</h2>
          <div className="hint">Geben Sie Ihrem Begleiter Name, Charakter und Aufgaben. Wie ein Tamagotchi: er wächst mit Ihnen mit und passt sich Ihrem Stil an.</div>

          <div className="cfg-section">
            <div className="h">Name — Gelehrte des goldenen Zeitalters</div>
            <div className="name-grid">
              {SCHOLAR_NAMES.map(n => (
                <button
                  key={n.id}
                  className={"name-pick " + (draft.nameId === n.id ? "active" : "")}
                  onClick={() => { update("nameId", n.id); update("name", n.name); }}
                >
                  <div className="n">{n.name}</div>
                  <div className="ar">{n.arabic}</div>
                  <div className="meaning">{n.meaning}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="cfg-section">
            <div className="h">Charakter & Seele</div>
            <div className="character-grid">
              {CHARACTERS.map(c => (
                <button
                  key={c.id}
                  className={"char-pick " + (draft.character === c.id ? "active" : "")}
                  onClick={() => update("character", c.id)}
                >
                  <div className="glyph">{c.glyph}</div>
                  <div>
                    <div className="lbl">{c.lbl}</div>
                    <div className="desc">{c.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="cfg-section">
            <div className="h">Erscheinungsbild</div>
            <div className="color-row">
              {COLORS.map(c => (
                <div
                  key={c.id}
                  className={"swatch " + (draft.color === c.id ? "active" : "")}
                  style={{ background: `radial-gradient(circle at 35% 30%, ${c.l}, ${c.d} 70%)` }}
                  onClick={() => update("color", c.id)}
                />
              ))}
            </div>
          </div>

          <div className="cfg-section">
            <div className="h">Aufgaben</div>
            <div className="task-list">
              {COMPANION_TASKS.map(t => (
                <label key={t.id}>
                  <input type="checkbox" checked={draft.tasks.includes(t.id)} onChange={() => toggleTask(t.id)}/>
                  <span style={{ fontWeight: 600 }}>{t.lbl}</span>
                  <span className="desc">{t.desc}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="footer">
          <div className="left-text">
            Ihr Begleiter ist <strong>privatsphäre-konform</strong> — Audio bleibt auf dem Konnektor (TI), Transkripte sind verschlüsselt.
          </div>
          <div className="actions">
            <button className="btn" onClick={onClose}>Abbrechen</button>
            <button className="btn primary" onClick={save}>
              <Icon name="check" size={13}/> Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SoapWithCompanion({ companion, setCompanion }) {
  const [values, setValues] = React.useState({ S: "", O: "", A: "", P: "" });
  const [hovered, setHovered] = React.useState(null);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [configOpen, setConfigOpen] = React.useState(false);
  const hoverTimer = React.useRef(null);
  const leaveTimer = React.useRef(null);

  function onHover(key) {
    clearTimeout(leaveTimer.current);
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(key), 320);
  }
  function onLeave() {
    clearTimeout(hoverTimer.current);
    leaveTimer.current = setTimeout(() => setHovered(null), 300);
  }
  function onChange(key, v) {
    setValues(s => ({ ...s, [key]: v }));
  }
  function onAccept(key, text, edit = false) {
    setValues(s => ({ ...s, [key]: text }));
    setHovered(null);
    if (!edit) {
      // small "thank you" feedback
      setCompanion(c => ({ ...c, xp: Math.min(100, c.xp + 3), bond: Math.min(100, c.bond + 1) }));
    }
  }
  function onAcceptAll() {
    setValues({
      S: SOAP_SUGGESTIONS.S.text,
      O: SOAP_SUGGESTIONS.O.text,
      A: SOAP_SUGGESTIONS.A.text,
      P: SOAP_SUGGESTIONS.P.text,
    });
    setCompanion(c => ({ ...c, xp: Math.min(100, c.xp + 12), bond: Math.min(100, c.bond + 4) }));
  }

  const suggestion = hovered ? SOAP_SUGGESTIONS[hovered] : null;
  const patient = (typeof PATIENTS !== "undefined" && PATIENTS[0]) || { name: "Schmidt, Helga", age: 78, sex: "w", id: "P-2026-04-23-0042", station: "Innere 4-Süd", room: "412", bed: "B", primary: "I50.13 — Dekompensierte Linksherzinsuffizienz NYHA III" };

  return (
    <div className="page" style={{ paddingBottom: 140 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">SOAP-Verlauf — neuer Eintrag</h1>
          <div className="page-sub">
            {patient.name} · {patient.sex === "w" ? "♀" : "♂"} {patient.age} J. · {patient.station} · Zi. {patient.room} {patient.bed} · {patient.primary?.split(" — ")[0]}
          </div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="save" size={13}/> Als Entwurf speichern</button>
          <button className="btn primary"><Icon name="check" size={13}/> Signieren (HBA)</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {SOAP_FIELDS.map(f => (
            <SoapField
              key={f.key}
              field={f}
              value={values[f.key]}
              onChange={onChange}
              onHover={onHover}
              onLeave={onLeave}
              onAccept={onAccept}
              suggestion={hovered === f.key ? SOAP_SUGGESTIONS[f.key] : null}
              isHovered={hovered === f.key}
            />
          ))}
        </div>

        {/* sidebar: companion status + context */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div className="card-h"><h3>Heutige Visite</h3><span className="sub">8 Patient.</span></div>
            <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
              {[
                ["Schmidt, Helga", "Zi. 412", true],
                ["Becker, Jürgen", "Zi. 414", false],
                ["Yıldız, Ayşe", "Zi. 416", false],
                ["Hoffmann, Klaus", "Zi. 418", false],
                ["Khan, Aisha", "Zi. 420", false],
              ].map(([n, r, cur], i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: 7,
                  background: cur ? "var(--teal-tint)" : "transparent",
                  color: cur ? "var(--teal-2)" : "var(--ink-2)",
                  fontWeight: cur ? 600 : 500,
                }}>
                  <span>{n}</span><span style={{ color: "var(--ink-3)" }}>{r}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Begleiter — {companion.name}</h3><span className="sub">Lvl {companion.level}</span></div>
            <div className="card-b" style={{ fontSize: 12.5, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--ink-3)", marginBottom: 4 }}>
                  <span>Vertrauen</span><span>{companion.bond}%</span>
                </div>
                <div className="bar"><i style={{ width: companion.bond + "%" }}/></div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--ink-3)", marginBottom: 4 }}>
                  <span>Erfahrung</span><span>{companion.xp} / 100 XP</span>
                </div>
                <div className="bar green"><i style={{ width: companion.xp + "%" }}/></div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--ink-3)", marginBottom: 4 }}>
                  <span>Energie</span><span>{companion.energy}%</span>
                </div>
                <div className="bar amber"><i style={{ width: companion.energy + "%" }}/></div>
              </div>
              <div className="sep"/>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {companion.tasks.map(t => (
                  <Tag key={t} tone="teal">{(COMPANION_TASKS.find(x => x.id === t) || {}).lbl?.split(" ")[0] || t}</Tag>
                ))}
              </div>
              <button className="btn sm" onClick={() => setConfigOpen(true)}>
                <Icon name="settings" size={13}/> Konfigurieren
              </button>
            </div>
          </div>

          <div className="card" style={{ background: "var(--teal-tint)", borderColor: "var(--teal-soft)" }}>
            <div className="card-b" style={{ fontSize: 12, lineHeight: 1.55 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--teal-2)" }}>✶ Tipp von {companion.name}</div>
              Wenn Sie mit der Maus über ein <strong>S/O/A/P-Feld</strong> verweilen, schlage ich einen wohlformulierten Eintrag vor — basierend auf Aufnahmegespräch, Vitaldaten und Vorbefunden. Sie prüfen, kürzen, bestätigen.
            </div>
          </div>
        </div>
      </div>

      <CompanionDock
        companion={companion}
        openChat={() => setChatOpen(true)}
        openConfig={() => setConfigOpen(true)}
        suggestion={hovered ? SOAP_SUGGESTIONS[hovered] : null}
        onAcceptAll={onAcceptAll}
      />

      {chatOpen && (
        <CompanionChat
          companion={companion}
          onClose={() => setChatOpen(false)}
          onOpenConfig={() => { setChatOpen(false); setConfigOpen(true); }}
        />
      )}
      {configOpen && (
        <CompanionConfig
          companion={companion}
          setCompanion={setCompanion}
          onClose={() => setConfigOpen(false)}
        />
      )}
    </div>
  );
}

window.SoapWithCompanion = SoapWithCompanion;
window.DEFAULT_COMPANION = DEFAULT_COMPANION;
