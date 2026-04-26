/* Companion (Tamagotchi-style avatar) */

// Phase metadata for web research
const SEARCH_PHASES = {
  researching: { icon: "🔬", label: "Tavily Research läuft…",  color: "var(--teal-2)" },
  summarising: { icon: "🤖", label: "KI kondensiert Bericht…", color: "#7c3aed" },
  done:        { icon: "✓",  label: "Fertig",                   color: "var(--green, #059669)" },
  error:       { icon: "⚠️", label: "Fehler",                   color: "var(--amber, #b45309)" },
};

const SEARCH_SUGGESTIONS = [
  "Fibromyalgie Leitlinie 2024",
  "Ibuprofen Kontraindikationen Niere",
  "Reizdarmsyndrom Therapie aktuell",
  "Angststörung ICD-10 Behandlung",
];

// Phase metadata for the SOAP processing animation
const SOAP_PHASES = {
  reading: { icon: "📖", label: "Lade Transkript…",                  color: "var(--teal-2)" },
  ner:     { icon: "🔬", label: "Analysiere Entitäten…",             color: "#7c3aed" },
  soap:    { icon: "✍️", label: "Pioneer SOAP-Modell aktiv…",        color: "#b45309" },
  warn:    { icon: "⚠️", label: "Fallback auf lokale Daten…",        color: "var(--amber, #b45309)" },
  done:    { icon: "✓",  label: "SOAP-Notiz fertig",                  color: "var(--green, #059669)" },
};

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

function CompanionDock({ companion, openChat, openConfig, openSearch, suggestion, onAcceptAll, soapLoading, soapPhase }) {
  const [bubble, setBubble] = React.useState(null);
  const isListening = companion.tasks.includes("transcribe");

  React.useEffect(() => {
    const t = setTimeout(() => {
      setBubble({
        text: `Guten Tag, Frau Dr. Weber. Das Aufnahmegespräch ist indexiert — klicken Sie auf „Alle Felder vorausfüllen" und ich rufe das Pioneer SOAP-Modell ab.`,
        showActions: true,
      });
    }, 800);
    const t2 = setTimeout(() => setBubble(null), 10000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  // When processing starts, replace bubble with phase indicator
  const phaseInfo = soapPhase ? SOAP_PHASES[soapPhase] : null;

  return (
    <div className="compa-dock">
      {/* Phase bubble — shown during SOAP processing */}
      {soapLoading && phaseInfo && (
        <div className="compa-speech processing">
          <div className="who">{companion.name} arbeitet</div>
          <div className="phase-row">
            <span className="phase-icon">{phaseInfo.icon}</span>
            <span className="phase-label" style={{ color: phaseInfo.color }}>{phaseInfo.label}</span>
            {soapPhase !== "done" && (
              <span className="phase-dots"><span/><span/><span/></span>
            )}
          </div>
          <div className="phase-steps">
            {["reading", "ner", "soap"].map(p => (
              <div key={p} className={`phase-step ${
                soapPhase === p ? "active" :
                ["reading","ner","soap"].indexOf(soapPhase) > ["reading","ner","soap"].indexOf(p) ? "done" : ""
              }`}>
                <span>{SOAP_PHASES[p].icon}</span>
                <span>{SOAP_PHASES[p].label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done bubble briefly after processing */}
      {!soapLoading && soapPhase === "done" && (
        <div className="compa-speech done">
          <div className="who">{companion.name}</div>
          <div style={{ color: "var(--green, #059669)", fontWeight: 600 }}>✓ SOAP-Notiz wurde übernommen</div>
        </div>
      )}

      {/* Default greeting bubble (when not processing) */}
      {!soapLoading && !soapPhase && bubble && (
        <div className="compa-speech">
          <div className="who">{companion.name} sagt</div>
          <div>{bubble.text}</div>
          {bubble.showActions && (
            <div className="actions">
              <button className="primary" onClick={() => { onAcceptAll(); setBubble(null); }}>
                Alle Felder vorausfüllen
              </button>
              <button onClick={() => setBubble(null)}>Später</button>
            </div>
          )}
        </div>
      )}

      {/* Pet + Websuche stacked vertically */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ position: "relative" }}>
          <CompaPet
            companion={companion}
            mood={soapLoading ? "thinking" : isListening ? "listening" : "happy"}
            thinking={soapLoading || !!suggestion}
            onClick={openChat}
          />
          <div className="compa-stats">
            <div className="stat" title="Bond">♡</div>
            <div className="stat" title="Energie">⚡</div>
          </div>
          {soapLoading ? (
            <div className="compa-status processing">
              <span className="proc-dot"/> KI aktiv
            </div>
          ) : isListening && (
            <div className="compa-status">
              <span className="mic-dot"/> hört zu
            </div>
          )}
        </div>

        {/* Web search trigger — sits below the avatar */}
        <button className="compa-web-btn" onClick={openSearch} title="Medizinische Websuche (Tavily)">
          <span style={{ fontSize: 13 }}>🌐</span>
          <span>Websuche</span>
        </button>
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

function CompanionChat({ companion, onClose, onOpenConfig, patientId, sessionId }) {
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  const [messages, setMessages] = React.useState([
    { from: "bot", text: `Guten Tag, Frau Dr. Weber. Das Aufnahmegespräch ist transkribiert und in der Wissensdatenbank gespeichert. Fragen Sie mich direkt über die Patientin!`, time: nowTime },
    { from: "bot", text: "Beispiele:", quick: ["Welche Symptome hat die Patientin?", "Welche Medikamente nimmt sie?", "Hat sie Allergien?", "Welche Diagnosen wurden gestellt?"], time: nowTime },
  ]);
  const [input, setInput] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const bodyRef = React.useRef(null);

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, thinking]);

  async function send(text) {
    if (!text.trim() || thinking) return;
    const t = new Date();
    const time = `${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`;
    setMessages(m => [...m, { from: "me", text, time }]);
    setInput("");
    setThinking(true);
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          patient_id: patientId || null,
          session_id: sessionId || null,
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setMessages(m => [...m, {
        from: "bot",
        text: data.answer || "Keine Antwort gefunden.",
        citations: data.citations || [],
        provider: data.provider || null,
        time,
      }]);
    } catch (e) {
      setMessages(m => [...m, { from: "bot", text: `Fehler: ${e.message}`, time }]);
    } finally {
      setThinking(false);
    }
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
                {m.citations && m.citations.length > 0 && (
                  <div className="citations">
                    {m.citations.slice(0, 3).map((c, ci) => (
                      <div key={ci} className="citation-chip">
                        <span className="ts">{c.timestamp}</span>
                        <span className="who">{c.speaker}:</span>
                        <span className="ct">„{c.text.length > 60 ? c.text.slice(0, 60) + "…" : c.text}"</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="meta">
                  {m.time}
                  {m.provider && m.provider !== "retrieval" && m.provider !== "stub" && (
                    <span className="provider-badge">{
                      m.provider === "pioneer-chat" ? "Pioneer" :
                      m.provider === "gemini" ? "Gemini" :
                      m.provider === "db-basic" ? "Akte" : m.provider
                    }</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {thinking && (
            <div className="msg bot">
              <div>
                <div className="bubble thinking-dots">
                  <span/><span/><span/>
                </div>
              </div>
            </div>
          )}
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
            disabled={thinking}
          />
          <button className="icon-btn send" onClick={() => send(input)} title="Senden" disabled={thinking}>
            <Icon name="send" size={14}/>
          </button>
        </div>
      </div>
    </>
  );
}

function CompanionSearch({ companion, onClose }) {
  const [query, setQuery]     = React.useState("");
  const [phase, setPhase]     = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult]   = React.useState(null); // {summary, sources, provider}
  const [error, setError]     = React.useState(null);
  const bodyRef               = React.useRef(null);

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [result, loading]);

  function doSearch(q) {
    const term = (q || query).trim();
    if (!term || loading) return;
    setLoading(true);
    setPhase("researching");
    setResult(null);
    setError(null);

    const es = new EventSource(`/api/search/web?q=${encodeURIComponent(term)}`);
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data);
        setPhase(evt.phase);
        if (evt.phase === "done") {
          setResult({ tldr: evt.tldr, report: evt.report, sources: evt.sources || [], provider: evt.provider });
          setLoading(false);
          es.close();
        } else if (evt.phase === "error") {
          setError(evt.msg);
          setLoading(false);
          es.close();
        }
      } catch (_) {}
    };
    es.onerror = () => { setError("Verbindungsfehler"); setLoading(false); es.close(); };
  }

  const providerLabel = (p) =>
    p === "claude-mcp"   ? "Claude MCP" :
    p === "gemini"       ? "Gemini"      :
    p === "pioneer-chat" ? "Pioneer"     : "Tavily";

  return (
    <>
      <div className="compa-chat-shade" onClick={onClose}/>
      <div className="compa-chat compa-search-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="compa-chat-head">
          <div style={{ fontSize: 19, lineHeight: 1 }}>🌐</div>
          <div>
            <div className="name">Medizinische Websuche</div>
            <div className="sub">Tavily · KI-poliert von {companion.name}</div>
          </div>
          <div className="head-actions">
            <button title="Schließen" onClick={onClose}><Icon name="x" size={15}/></button>
          </div>
        </div>

        {/* Search bar */}
        <div className="search-bar">
          <input
            className="search-input"
            placeholder="Medizinische Anfrage…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch()}
            disabled={loading}
            autoFocus
          />
          <button className="search-go" onClick={() => doSearch()} disabled={loading || !query.trim()}>
            {loading
              ? <span className="proc-dot"/>
              : <Icon name="search" size={14}/>}
          </button>
        </div>

        {/* Phase indicator */}
        {loading && phase && SEARCH_PHASES[phase] && (
          <div className="search-phase-row">
            <span>{SEARCH_PHASES[phase].icon}</span>
            <span style={{ color: SEARCH_PHASES[phase].color }}>{SEARCH_PHASES[phase].label}</span>
            <span className="phase-dots"><span/><span/><span/></span>
          </div>
        )}

        {/* Error */}
        {error && <div className="search-error">⚠️ {error}</div>}

        {/* Results body */}
        <div className="search-body" ref={bodyRef}>
          {result && (
            <>
              {/* TL;DR card */}
              <div className="search-summary-card">
                <div className="search-summary-head">
                  <span>✦ {companion.name}</span>
                  <span className="provider-badge">{providerLabel(result.provider)}</span>
                </div>
                <div className="search-summary-text">{result.tldr}</div>
              </div>

              {/* Full research report */}
              {result.report && (
                <details className="research-report-details">
                  <summary className="research-report-toggle">
                    🔬 Vollständiger Forschungsbericht
                  </summary>
                  <div className="research-report-body">{result.report}</div>
                </details>
              )}

              {/* Sources */}
              {result.sources.length > 0 && (
                <div className="search-sources">
                  <div className="search-sources-label">Quellen</div>
                  {result.sources.map((s, i) => (
                    <a key={i} className="source-card" href={s.url} target="_blank" rel="noopener noreferrer">
                      <div className="source-title">{s.title}</div>
                      <div className="source-snippet">{s.content}</div>
                      <div className="source-url">{s.url.replace(/^https?:\/\//, "").slice(0, 60)}</div>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Placeholder */}
          {!loading && !result && !error && (
            <div className="search-placeholder">
              <div style={{ fontSize: 28 }}>🌐</div>
              <div>{companion.name} sucht im Web und fasst klinisch zusammen.</div>
              <div className="search-chips">
                {SEARCH_SUGGESTIONS.map(s => (
                  <button key={s} className="search-chip" onClick={() => { setQuery(s); doSearch(s); }}>{s}</button>
                ))}
              </div>
            </div>
          )}
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

const ENTITY_COLORS = {
  medication: { bg: "#dbeafe", color: "#1d4ed8", label: "Medikament" },
  dosage:     { bg: "#ede9fe", color: "#6d28d9", label: "Dosierung" },
  symptom:    { bg: "#fef3c7", color: "#b45309", label: "Symptom" },
  diagnosis:  { bg: "#fee2e2", color: "#b91c1c", label: "Diagnose" },
  anatomy:    { bg: "#d1fae5", color: "#065f46", label: "Anatomie" },
  procedure:  { bg: "#fce7f3", color: "#9d174d", label: "Prozedur" },
};

function SoapWithCompanion({ companion, setCompanion, patientId }) {
  const [values, setValues] = React.useState({ S: "", O: "", A: "", P: "" });
  const [hovered, setHovered] = React.useState(null);
  const [chatOpen, setChatOpen]     = React.useState(false);
  const [configOpen, setConfigOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [entities, setEntities] = React.useState(null);
  const [loadingEntities, setLoadingEntities] = React.useState(false);
  const [soapLoading, setSoapLoading] = React.useState(false);
  const [soapPhase, setSoapPhase] = React.useState(null);   // current SSE phase key
  const [soapProvider, setSoapProvider] = React.useState(null);
  const [dbPatient, setDbPatient] = React.useState(null);
  const hoverTimer = React.useRef(null);
  const leaveTimer = React.useRef(null);
  const sessionId = React.useRef(`session-${Date.now()}`).current;

  React.useEffect(() => {
    if (!patientId) return;
    fetch(`/api/patients/${patientId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setDbPatient(data); })
      .catch(() => {});
  }, [patientId]);

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
      setCompanion(c => ({ ...c, xp: Math.min(100, c.xp + 3), bond: Math.min(100, c.bond + 1) }));
    }
  }

  async function loadEntities() {
    if (loadingEntities) return;
    setLoadingEntities(true);
    try {
      const sampleText = window._lastTranscriptText || "Patientin klagt über Bauchschmerzen und Schwindel. Sie nimmt Ibuprofen 400 und Novalgin. Penicillin-Allergie bekannt. Diagnose: Fibromyalgie.";
      const resp = await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sampleText }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setEntities(data.entities || []);
    } catch (e) {
      setEntities([]);
    } finally {
      setLoadingEntities(false);
    }
  }

  function onAcceptAll() {
    if (soapLoading) return;
    setSoapLoading(true);
    setSoapPhase("reading");
    setCompanion(c => ({ ...c, xp: Math.min(100, c.xp + 12), bond: Math.min(100, c.bond + 4) }));

    const pid = patientId || "patient-001";
    const es = new EventSource(`/api/soap/process?patient_id=${pid}`);

    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data);
        setSoapPhase(evt.phase);

        if (evt.phase === "done") {
          const note = evt.soap || {};
          setSoapProvider(evt.provider || "unknown");
          setValues({
            S: note.S || SOAP_SUGGESTIONS.S.text,
            O: note.O || SOAP_SUGGESTIONS.O.text,
            A: note.A || SOAP_SUGGESTIONS.A.text,
            P: note.P || SOAP_SUGGESTIONS.P.text,
          });
          setSoapLoading(false);
          es.close();
          // trigger entity load if not done yet
          if (!entities) loadEntities();
          setTimeout(() => setSoapPhase(null), 3000);
        }
      } catch (_) {}
    };

    es.onerror = () => {
      setSoapProvider("stub-fallback");
      setValues({
        S: SOAP_SUGGESTIONS.S.text,
        O: SOAP_SUGGESTIONS.O.text,
        A: SOAP_SUGGESTIONS.A.text,
        P: SOAP_SUGGESTIONS.P.text,
      });
      setSoapLoading(false);
      setSoapPhase(null);
      es.close();
    };
  }

  const suggestion = hovered ? SOAP_SUGGESTIONS[hovered] : null;
  const _fallback = { name: "Patient", age: "?", sex: "w", id: patientId || "—", station: "—", room: "—", bed: "", primary: "—" };
  const patient = dbPatient ? {
    ...dbPatient,
    primary: dbPatient.primary_dx || dbPatient.primary || "—",
    age: dbPatient.age || (dbPatient.dob ? new Date().getFullYear() - parseInt(dbPatient.dob) : "?"),
  } : ((typeof PATIENTS !== "undefined" && PATIENTS.find(p => p.id === patientId)) || _fallback);

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

          {entities && entities.length > 0 && (
            <div className="card">
              <div className="card-h">
                <h3>Erkannte Entitäten</h3>
                <span className="sub">{entities.length} gefunden</span>
              </div>
              <div className="card-b" style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {entities.slice(0, 24).map((e, i) => {
                  const cfg = ENTITY_COLORS[e.type] || { bg: "#f3f4f6", color: "#374151", label: e.type };
                  return (
                    <span key={i} title={cfg.label} style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "2px 8px", borderRadius: 99,
                      background: cfg.bg, color: cfg.color,
                      fontSize: 11.5, fontWeight: 600,
                    }}>
                      {e.text}
                      <span style={{ opacity: 0.55, fontWeight: 400 }}>·{Math.round((e.confidence||0)*100)}%</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {!entities && (
            <div className="card" style={{ background: "var(--teal-tint)", borderColor: "var(--teal-soft)" }}>
              <div className="card-b" style={{ fontSize: 12, lineHeight: 1.55 }}>
                <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--teal-2)" }}>
                  ✶ KI-Pipeline bereit
                </div>
                Klicken Sie auf <strong>„Alle Felder vorausfüllen"</strong> — {companion.name} ruft SOAP-Generierung und Named-Entity-Recognition live vom Backend ab.
                Oder fragen Sie mich direkt im Chat über die Patientin.
              </div>
            </div>
          )}

          {soapProvider && (
            <div className="card" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
              <div className="card-b">
                SOAP-Quelle: <strong style={{ color: soapProvider === "pioneer" ? "var(--teal-2)" : "var(--ink-2)" }}>
                  {soapProvider === "pioneer" ? "Pioneer AI" : soapProvider === "stub-fallback" ? "Demo-Vorlage" : soapProvider}
                </strong>
                {soapProvider !== "pioneer" && (
                  <div style={{ marginTop: 4, color: "var(--amber, #b45309)" }}>
                    Pioneer SOAP momentan nicht verfügbar — Vorlage wird verwendet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <CompanionDock
        companion={companion}
        openChat={() => setChatOpen(true)}
        openConfig={() => setConfigOpen(true)}
        openSearch={() => setSearchOpen(true)}
        suggestion={hovered ? SOAP_SUGGESTIONS[hovered] : null}
        onAcceptAll={onAcceptAll}
        soapLoading={soapLoading}
        soapPhase={soapPhase}
      />

      {chatOpen && (
        <CompanionChat
          companion={companion}
          onClose={() => setChatOpen(false)}
          onOpenConfig={() => { setChatOpen(false); setConfigOpen(true); }}
          patientId={patientId}
          sessionId={sessionId}
        />
      )}
      {searchOpen && (
        <CompanionSearch
          companion={companion}
          onClose={() => setSearchOpen(false)}
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
