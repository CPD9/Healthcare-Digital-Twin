/**
 * twin-app.jsx — React UI for TWIN
 *
 * Loaded as <script type="text/babel" src="twin-app.jsx"> by Babel Standalone.
 * Depends on globals from twin-data.js:
 *   KB, findKBAnswer, generateResponse, PRESETS, PRESET_FRIENDLY, PRESET_INFO,
 *   BASE_INFO, gcContent, simulateScore, scoreLabel, renderMD, DEFAULT_SUGGESTIONS
 *
 * Bridges to Three.js renderer (twin-three.js):
 *   window.initThreeJS(container)   — called by DNACanvas on mount
 *   window._dnaHighlight(idx)       — called on base-tile hover
 *   window._dnaClearHighlight()     — called on base-tile mouse-leave
 *   window._dnaTooltipSet(payload)  — called by Three.js to push tooltip state into React
 *
 * Bridge to open the chat from the left panel's ? badge:
 *   window._twinAsk(question)       — registered by App, calls handleSend + opens chat
 */

const { useState, useEffect, useRef, useCallback } = React;

/* ─────────────────────────────────────────────────────────────── */
/* Shared small component — animated typing indicator             */
/* ─────────────────────────────────────────────────────────────── */
function TypingDots() {
  return <div className="typing"><span/><span/><span/></div>;
}

/* ─────────────────────────────────────────────────────────────── */
/* SectionHeader                                                   */
/* Renders a section title with a collapsible ? info badge that   */
/* expands a plain-English explanation inline below the title.    */
/* ─────────────────────────────────────────────────────────────── */
function SectionHeader({ title, info }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div className="panel-section-title" style={{ marginBottom: 0 }}>{title}</div>
        <span
          className={`info-badge ${open ? 'open' : ''}`}
          onClick={() => setOpen(o => !o)}
          title={open ? 'Close' : 'What is this?'}
        >{open ? '×' : '?'}</span>
      </div>
      {open && <div className="info-inline" dangerouslySetInnerHTML={{ __html: info }}/>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* Message                                                         */
/* Renders a single chat bubble (user or AI).                     */
/* ─────────────────────────────────────────────────────────────── */
function Message({ msg }) {
  return (
    <div className={`msg-row ${msg.role} fade-up`}>
      <div className={`msg-avatar ${msg.role}`}>{msg.role === 'ai' ? 'T' : 'U'}</div>
      <div className={`msg-bubble ${msg.role}`}>
        {msg.typing
          ? <TypingDots/>
          : <span dangerouslySetInnerHTML={{ __html: renderMD(msg.content) }}/>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* ChatPanel                                                       */
/* Right-side panel: message list + suggestion chips + input box. */
/* ─────────────────────────────────────────────────────────────── */
function ChatPanel({ open, messages, loading, suggestions, onSend, onClear }) {
  const [input, setInput] = useState('');
  const endRef   = useRef(null);
  const textRef  = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = useCallback((text) => {
    const t = (text || input).trim();
    if (!t || loading) return;
    onSend(t);
    setInput('');
    if (textRef.current) textRef.current.style.height = 'auto';
  }, [input, loading, onSend]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };
  const autoGrow = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
  };

  return (
    <div className={`right-panel ${open ? '' : 'closed'}`}>
      {open && <>
        <div className="panel-header">
          <div>
            <div className="chat-title">Ask TWIN</div>
            <div className="chat-subtitle">No science degree needed 😊</div>
          </div>
          <button className="chat-hbtn" onClick={onClear} title="Clear chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
        <div className="messages-area">
          {messages.map(m => <Message key={m.id} msg={m}/>)}
          {loading && (
            <div className="msg-row ai fade-up">
              <div className="msg-avatar ai">T</div>
              <div className="msg-bubble ai"><TypingDots/></div>
            </div>
          )}
          <div ref={endRef}/>
        </div>
        {suggestions.length > 0 && (
          <div className="suggestions-row">
            {suggestions.map((s, i) => (
              <button key={i} className="sugg-chip" onClick={() => handleSend(s)}>{s}</button>
            ))}
          </div>
        )}
        <div className="chat-input-area">
          <div className="chat-input-wrap">
            <textarea
              ref={textRef}
              className="chat-textarea"
              placeholder="Ask me anything — plain English is fine!"
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              onInput={autoGrow}
            />
            <button className="send-btn" onClick={() => handleSend()} disabled={loading || !input.trim()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21L23 12L2 3L2 10L17 12L2 14Z"/>
              </svg>
            </button>
          </div>
        </div>
      </>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* DNACanvas                                                       */
/* Mounts the Three.js scene (from twin-three.js) into a div and  */
/* registers the tooltip bridge callback.                         */
/* ─────────────────────────────────────────────────────────────── */
function DNACanvas({ onTooltip }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    window._dnaTooltipSet = onTooltip;
    const tryInit = () => window.initThreeJS && window.initThreeJS(containerRef.current);
    if (window._threeReady || window.initThreeJS) tryInit();
    else window._reactBoot = tryInit;
    return () => { window._dnaTooltipSet = null; };
  }, []);

  return (
    <div className="center-wrap">
      <div id="three-canvas" ref={containerRef}/>
      <div className="dna-legend">
        <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: 5, fontWeight: 600, letterSpacing: '.4px', textTransform: 'uppercase' }}>
          What each colour means
        </div>
        {[
          ['var(--A)', 'A — pairs with T  (flexible)'],
          ['var(--T)', 'T — pairs with A  (flexible)'],
          ['var(--G)', 'G — pairs with C  (strong, 3 bonds)'],
          ['var(--C)', 'C — pairs with G  (strong, 3 bonds)'],
          ['#8888ee',  'Purple tubes = the DNA backbone'],
        ].map(([bg, label]) => (
          <div key={label} className="leg-row">
            <span className="leg-dot" style={{ background: bg }}/>
            {label}
          </div>
        ))}
        <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: 7, paddingTop: 7, borderTop: '1px solid var(--border)', lineHeight: 1.5 }}>
          Each <em>rung</em> = one letter pair<br/>
          The whole shape = a double helix
        </div>
      </div>
      <div className="center-hint">
        🖱 Drag to spin · Scroll to zoom · Hover a rung to see its letter pair
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* LeftPanel                                                       */
/* DNA code input, base viewer, health report, preset cards.      */
/* ─────────────────────────────────────────────────────────────── */
function LeftPanel({ open, seqInput, setSeqInput, analysis, onAnalyze, onClear, onPreset }) {
  const [hoveredBase, setHoveredBase] = useState(null);

  return (
    <div className={`left-panel ${open ? '' : 'closed'}`}>
      {open && <>
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div className="panel-title">Your DNA Snapshot</div>
            <span
              className="info-badge"
              style={{ marginLeft: 4 }}
              title="What is TWIN?"
              onClick={() => { window._twinAsk && window._twinAsk('What is TWIN?'); }}
            >?</span>
          </div>
        </div>

        <div className="left-scroll">

          {/* ── Input section ── */}
          <div className="panel-section">
            <SectionHeader
              title="Paste Your DNA Code Here"
              info="<strong>What is a DNA code?</strong><br/>DNA is your body's instruction manual, written using just 4 letters: <strong style='color:#3b82f6'>A</strong>, <strong style='color:#f59e0b'>T</strong>, <strong style='color:#22c55e'>G</strong>, and <strong style='color:#ef4444'>C</strong>. Each letter represents a chemical that pairs with its partner to form the twisted ladder shape you see in the 3D model. You can paste any sequence of these letters here and TWIN will analyse it."
            />
            <div className="section-note">
              Your body's code uses just 4 letters.
              {' '}<strong style={{ color: 'var(--A)' }}>A</strong> always pairs with <strong style={{ color: 'var(--T)' }}>T</strong>
              {' '}·{' '}
              <strong style={{ color: 'var(--G)' }}>G</strong> always pairs with <strong style={{ color: 'var(--C)' }}>C</strong>
            </div>
            <div className="seq-input-wrap">
              <textarea
                value={seqInput}
                onChange={e => setSeqInput(e.target.value)}
                placeholder={"Paste or type a DNA code (only A, T, G, C)\ne.g. ATCGATCG..."}
              />
            </div>
            <div className="seq-actions">
              <button className="seq-btn primary" onClick={onAnalyze}>▶ Read My DNA</button>
              <button className="seq-btn secondary" onClick={onClear}>Clear</button>
            </div>
          </div>

          {/* ── Base viewer ── */}
          {analysis && (
            <div className="panel-section">
              <SectionHeader
                title="DNA Letters"
                info="<strong>What are these coloured tiles?</strong><br/>Each tile is one letter of your DNA. <strong style='color:#3b82f6'>Blue = A</strong>, <strong style='color:#f59e0b'>Yellow = T</strong>, <strong style='color:#22c55e'>Green = G</strong>, <strong style='color:#ef4444'>Red = C</strong>.<br/><br/>Hover any tile to see what that letter does and light up the matching rung in the 3D spiral on the right!"
              />
              <div className="seq-viewer">
                {analysis.seq.split('').map((b, i) => (
                  <span
                    key={i}
                    className={`base ${b}`}
                    onMouseEnter={() => {
                      setHoveredBase(b);
                      window._dnaHighlight && window._dnaHighlight(i % 28);
                    }}
                    onMouseLeave={() => {
                      setHoveredBase(null);
                      window._dnaClearHighlight && window._dnaClearHighlight();
                    }}
                  >{b}</span>
                ))}
              </div>
              <div className={`base-explain ${hoveredBase ? 'active' : ''}`}>
                {hoveredBase && BASE_INFO[hoveredBase] ? (
                  <>
                    <span className="be-letter" style={{ color: BASE_INFO[hoveredBase].color }}>
                      {hoveredBase} {BASE_INFO[hoveredBase].emoji}
                    </span>
                    <strong>{BASE_INFO[hoveredBase].full}</strong>
                    {' — pairs with '}
                    <strong style={{ color: BASE_INFO[hoveredBase].pairColor }}>{BASE_INFO[hoveredBase].pair}</strong>
                    <br/>
                    <span style={{ color: 'var(--text3)', fontSize: '10px' }}>{BASE_INFO[hoveredBase].why}</span>
                  </>
                ) : (
                  <span style={{ color: 'var(--text3)' }}>👆 Hover any letter tile above to learn what it does</span>
                )}
              </div>
            </div>
          )}

          {/* ── Health report ── */}
          {analysis && (
            <div className="panel-section">
              <SectionHeader
                title="TWIN Health Report"
                info="<strong>What is a Health Score?</strong><br/>TWIN uses an AI (Evo2) trained on billions of real DNA sequences to rate how 'natural' your code looks — like a spell-checker, but for DNA.<br/><br/>Scores closer to 0 = more natural. Real human genes typically score between −1.0 and −1.5."
              />
              <div className="score-card">
                <div className="score-label">DNA Health Score — how natural this code looks to TWIN</div>
                <div className="score-value">{analysis.score.toFixed(4)}</div>
                <div className="score-sub">{analysis.label}</div>
                <div className="score-bar-bg">
                  <div className="score-bar-fill" style={{ width: analysis.pct + '%' }}/>
                </div>
              </div>
              <div className="score-explain">
                <strong style={{ color: 'var(--text2)' }}>What do these percentages mean?</strong><br/>
                <strong style={{ color: 'var(--G)' }}>G</strong>+<strong style={{ color: 'var(--C)' }}>C</strong> letters form <strong>3 bonds</strong> = stronger &amp; more stable sections.<br/>
                <strong style={{ color: 'var(--A)' }}>A</strong>+<strong style={{ color: 'var(--T)' }}>T</strong> letters form <strong>2 bonds</strong> = more flexible &amp; easier to "read".<br/>
                A healthy gene needs a good balance of both.
              </div>
              <div className="base-stats">
                {['A', 'T', 'G', 'C'].map((b, i) => (
                  <div key={b} className="base-stat" title={BASE_INFO[b]?.why}>
                    <span className="bs-label" style={{ color: `var(--${b})` }}>
                      {b} {['🔵', '🟡', '🟢', '🔴'][i]}
                    </span>
                    <span className="bs-val">
                      {analysis.counts[b]} ({Math.round(100 * analysis.counts[b] / analysis.seq.length)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Preset cards ── */}
          <div className="panel-section">
            <SectionHeader
              title="Famous DNA Snippets"
              info="<strong>Why these?</strong><br/>These are real, well-known pieces of human (and viral) DNA — each with a very different job. Click any card to load it, see its health score, and ask TWIN what it does in plain English!"
            />
            <div className="preset-list">
              {[
                ['BRCA1', '🛡️ Cancer Shield Gene'],
                ['TELO',  '⏳ Cell Aging Clock'],
                ['KOZAK', '🚀 Protein Launch Pad'],
                ['PHIX',  '🦠 Tiny Virus DNA'],
              ].map(([key, label]) => (
                <div key={key} className="preset" onClick={() => onPreset(key)}>
                  <div className="preset-name">{label}</div>
                  <div className="preset-desc">{PRESET_INFO[key].why}</div>
                  <div className="preset-seq">{PRESETS[key]}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* Header                                                          */
/* Top bar: logo, live stat pills with plain-English tooltips,    */
/* and panel toggle buttons.                                      */
/* ─────────────────────────────────────────────────────────────── */
function Header({ stats, leftOpen, rightOpen, toggleLeft, toggleRight }) {
  return (
    <header className="app-header">
      <div className="logo">
        <span className="logo-icon">🧬</span>
        <span className="logo-text">TWIN</span>
        <span className="logo-sub">Your personal DNA explorer</span>
      </div>

      <div className="header-stats">
        <div className="stat-pill-wrap">
          <div className="stat-pill">
            <span className="stat-dot" style={{ background: 'var(--green)' }}/>
            {stats.len} letters
          </div>
          <div className="stat-tooltip">
            <strong>Letter Count</strong><br/>
            How many DNA letters (A, T, G, C) are in your code. A typical human gene is thousands of letters long.
          </div>
        </div>
        <div className="stat-pill-wrap">
          <div className="stat-pill">
            <span className="stat-dot" style={{ background: 'var(--cyan)' }}/>
            Stability {stats.gc || '—'}
          </div>
          <div className="stat-tooltip">
            <strong>Stability = G+C %</strong><br/>
            G and C letters form 3 chemical bonds — stronger pairs. More G+C means the DNA is harder to "unzip", making it more stable.
          </div>
        </div>
        <div className="stat-pill-wrap">
          <div className="stat-pill">
            <span className="stat-dot" style={{ background: 'var(--amber)' }}/>
            Flexibility {stats.at || '—'}
          </div>
          <div className="stat-tooltip">
            <strong>Flexibility = A+T %</strong><br/>
            A and T letters form only 2 bonds — easier to open. Your cell needs this flexibility to "read" the DNA and build proteins.
          </div>
        </div>
        {stats.score !== null && (
          <div className="stat-pill-wrap">
            <div className="stat-pill">
              <span className="stat-dot" style={{ background: 'var(--purple)' }}/>
              Health Score <span style={{ color: 'var(--green)' }}>{stats.score}</span>
            </div>
            <div className="stat-tooltip">
              <strong>DNA Health Score</strong><br/>
              How "natural" this code looks to TWIN's AI. Closer to 0 = more natural. Real human genes typically score −1.0 to −1.5.
            </div>
          </div>
        )}
      </div>

      <div className="header-btns">
        <button className={`hbtn ${leftOpen ? 'active' : ''}`} onClick={toggleLeft}>DNA Code</button>
        <button className={`hbtn ${rightOpen ? 'active' : ''}`} onClick={toggleRight}>Ask TWIN</button>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* App — root component                                            */
/* ─────────────────────────────────────────────────────────────── */
function App() {
  const [loaded,      setLoaded]      = useState(false);
  const [leftOpen,    setLeftOpen]    = useState(true);
  const [rightOpen,   setRightOpen]   = useState(true);
  const [seqInput,    setSeqInput]    = useState('');
  const [analysis,    setAnalysis]    = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [tooltip,     setTooltip]     = useState({ show: false, text: '', x: 0, y: 0 });
  const msgId = useRef(0);

  /* Derived header stats */
  const stats = analysis
    ? { len: analysis.seq.length, gc: gcContent(analysis.seq) + '%', at: (100 - gcContent(analysis.seq)) + '%', score: analysis.score.toFixed(3) }
    : { len: 0, gc: null, at: null, score: null };

  /* Append a chat message and return its id */
  const addMsg = useCallback((role, content, typing = false) => {
    const id = ++msgId.current;
    setMessages(prev => [...prev, { id, role, content, typing }]);
    return id;
  }, []);

  /* Replace a typing-placeholder message with the real content */
  const resolveTyping = useCallback((id, content) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content, typing: false } : m));
  }, []);

  /* Track mouse position for the Three.js tooltip overlay */
  useEffect(() => {
    const onMove = e => {
      setTooltip(t => t.show ? { ...t, x: e.clientX + 14, y: e.clientY - 10 } : t);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  /* Bridge: LeftPanel ? badge → open chat and ask */
  useEffect(() => {
    window._twinAsk = (q) => {
      if (!rightOpen) setRightOpen(true);
      handleSend(q);
    };
    return () => { window._twinAsk = null; };
  }, [handleSend, rightOpen]);

  /* Boot: wait for Three.js, then show welcome message */
  useEffect(() => {
    const boot = () => {
      setTimeout(() => setLoaded(true), 600);
      addMsg('ai', `👋 Welcome to **TWIN** — your personal DNA explorer!\n\nNo science background needed. Think of DNA like a recipe book written in just 4 letters (A, T, G, C) — and TWIN helps you read it.\n\n**Here's how to explore:**\n- 🌀 **Drag** the 3D spiral with your mouse to spin it\n- 🖱️ **Hover any rung** on the spiral to see which letter pair it is\n- 🔬 **Click a Famous Snippet** on the left — TWIN instantly scores it\n- ❓ **Click any ? badge** in the left panel for a plain-English explanation\n- 💬 **Ask me anything** below — I'll explain it without science jargon!`);
    };
    if (window._threeReady || window.initThreeJS) boot();
    else window._reactBoot = boot;
  }, []);

  /* Send a chat message and schedule the AI reply */
  const handleSend = useCallback((text) => {
    setSuggestions([]);
    addMsg('user', text);
    setChatLoading(true);
    const resp  = generateResponse(text);
    const delay = Math.min(1400, 400 + resp.length * 0.4);
    const tid   = addMsg('ai', '', true);
    setTimeout(() => {
      resolveTyping(tid, resp);
      setChatLoading(false);
      setSuggestions(DEFAULT_SUGGESTIONS.filter(s => s.toLowerCase() !== text.toLowerCase()).slice(0, 3));
    }, delay);
  }, [addMsg, resolveTyping]);

  const handleClearChat = () => {
    setMessages([]);
    addMsg('ai', 'Chat cleared! Ask me anything about DNA — no science knowledge needed 😊');
    setSuggestions(DEFAULT_SUGGESTIONS);
  };

  /* Analyse the pasted sequence */
  const handleAnalyze = useCallback(() => {
    const seq = seqInput.toUpperCase().replace(/[^ATGC]/g, '');
    if (!seq) return;
    const score  = simulateScore(seq);
    const pct    = Math.min(100, Math.max(5, Math.round((score + 2.5) / 5 * 100)));
    const counts = { A: 0, T: 0, G: 0, C: 0 };
    seq.split('').forEach(b => { if (counts[b] !== undefined) counts[b]++; });
    setAnalysis({ seq, score, pct, label: scoreLabel(score), counts });
  }, [seqInput]);

  const handleClearSeq = () => { setSeqInput(''); setAnalysis(null); };

  /* Load a preset and send a summary message to the chat */
  const handlePreset = useCallback((key) => {
    const seq    = PRESETS[key];
    const score  = simulateScore(seq.toUpperCase());
    const pct    = Math.min(100, Math.max(5, Math.round((score + 2.5) / 5 * 100)));
    const counts = { A: 0, T: 0, G: 0, C: 0 };
    seq.toUpperCase().split('').forEach(b => { if (counts[b] !== undefined) counts[b]++; });
    setSeqInput(seq);
    setAnalysis({ seq: seq.toUpperCase(), score, pct, label: scoreLabel(score), counts });
    addMsg('user', `Show me the ${PRESET_FRIENDLY[key]}`);
    const gc  = gcContent(seq);
    const tid = addMsg('ai', '', true);
    const resp = `Loaded the **${PRESET_FRIENDLY[key]}**! 🧬\n\nThis ${seq.length}-letter DNA code is **${gc}% stable** (more G+C letters = stronger bonds between the rungs).\n\nYou can see every letter colour-coded in the **DNA Code** panel — hover any letter to light up that rung on the 3D spiral!`;
    setTimeout(() => resolveTyping(tid, resp), 600);
    setSuggestions([]);
    setTimeout(() => setSuggestions(DEFAULT_SUGGESTIONS.slice(0, 3)), 1800);
  }, [addMsg, resolveTyping]);

  return (
    <>
      {!loaded && (
        <div className="loading-screen">
          <div className="dna-loader"/>
          <div style={{ fontSize: '14px', color: 'var(--cyan)', fontWeight: 600, letterSpacing: '.5px' }}>Starting up TWIN…</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Loading 3D renderer…</div>
        </div>
      )}

      {tooltip.show && (
        <div className="dna-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}

      <Header
        stats={stats}
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        toggleLeft={()  => setLeftOpen(o  => !o)}
        toggleRight={() => setRightOpen(o => !o)}
      />

      <div className="app-body">
        <LeftPanel
          open={leftOpen}
          seqInput={seqInput}
          setSeqInput={setSeqInput}
          analysis={analysis}
          onAnalyze={handleAnalyze}
          onClear={handleClearSeq}
          onPreset={handlePreset}
        />
        <DNACanvas onTooltip={setTooltip}/>
        <ChatPanel
          open={rightOpen}
          messages={messages}
          loading={chatLoading}
          suggestions={suggestions}
          onSend={handleSend}
          onClear={handleClearChat}
        />
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
