/**
 * App.jsx — Two-page React UI for TWIN (Vite ES module version)
 *
 * Page 1 (ExplorerPage): Landing — 3D DNA helix, DNA Snapshot drawer, Ask TWIN chat
 * Page 2 (AvatarPage):   TWIN Avatar Lab — 3D humanoid HUD, gene-body map, animated stats
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  generateResponse,
  PRESETS, PRESET_FRIENDLY, PRESET_INFO,
  BASE_INFO, gcContent, simulateScore, scoreLabel, renderMD,
  DEFAULT_SUGGESTIONS, callEvo2VariantAPI, interpretDelta,
} from './twin-data.js';
import { initThreeJS } from './twin-three.js';

/* ═══════════════════════════════════════════════════════════════ */
/*  SHARED SMALL COMPONENTS                                        */
/* ═══════════════════════════════════════════════════════════════ */

function TypingDots() {
  return <div className="typing"><span/><span/><span/></div>;
}

function SectionHeader({ title, info }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div className="panel-section-title" style={{ marginBottom: 0 }}>{title}</div>
        <span className={`info-badge ${open ? 'open' : ''}`}
          onClick={() => setOpen(o => !o)} title={open ? 'Close' : 'What is this?'}>
          {open ? '×' : '?'}
        </span>
      </div>
      {open && <div className="info-inline" dangerouslySetInnerHTML={{ __html: info }}/>}
    </div>
  );
}

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

/* ═══════════════════════════════════════════════════════════════ */
/*  CHAT PANEL                                                     */
/* ═══════════════════════════════════════════════════════════════ */
function ChatPanel({ open, messages, loading, suggestions, onSend, onClear, floating }) {
  const [input, setInput] = useState('');
  const endRef  = useRef(null);
  const textRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = useCallback((text) => {
    const t = (text || input).trim();
    if (!t || loading) return;
    onSend(t);
    setInput('');
    if (textRef.current) textRef.current.style.height = 'auto';
  }, [input, loading, onSend]);

  const handleKey  = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const autoGrow   = (e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'; };

  return (
    <div className={`right-panel ${open ? '' : 'closed'} ${floating ? 'floating-chat' : ''}`}>
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
            <textarea ref={textRef} className="chat-textarea"
              placeholder="Ask me anything — plain English is fine!"
              rows={1} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey} onInput={autoGrow}/>
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

/* ═══════════════════════════════════════════════════════════════ */
/*  DNA CANVAS  (Three.js bridge)                                  */
/* ═══════════════════════════════════════════════════════════════ */
function DNACanvas({ onTooltip }) {
  const containerRef = useRef(null);
  const initialised  = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initialised.current) return;
    initialised.current = true;
    window._dnaTooltipSet = onTooltip;
    initThreeJS(containerRef.current);
    return () => { window._dnaTooltipSet = null; };
  }, [onTooltip]);

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
      <div className="center-hint">🖱 Drag to spin · Scroll to zoom · Hover a rung to see its letter pair</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  EVO2 VARIANT ANALYSER                                          */
/* ═══════════════════════════════════════════════════════════════ */
function VariantAnalyser({ analysis }) {
  const [position, setPosition] = useState(0);
  const [alt,      setAlt]      = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState('');

  const seq     = analysis?.seq || '';
  const refBase = seq[position] || '';
  const altBases = ['A','T','G','C'].filter(b => b !== refBase);

  useEffect(() => { setAlt(''); setResult(null); setError(''); }, [position, analysis]);

  const handleRun = async () => {
    if (!alt || !seq) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await callEvo2VariantAPI(seq, position, refBase, alt);
      setResult(res);
    } catch (e) {
      setError(e.name === 'AbortError'
        ? 'Request timed out — Evo2 cold-start can take up to 3 min. Please try again.'
        : `Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const interp = result ? interpretDelta(result.deltaScore) : null;

  return (
    <div className="panel-section">
      <SectionHeader title="⚡ Evo2 Variant Analysis"
        info="<strong>What is this?</strong><br/>Calls the <em>real</em> Evo2 AI (trained on 8.8 trillion DNA letters) to score a single-letter change at any position. A negative Δ score means Evo2 thinks the mutation is unusual — potentially damaging."/>

      <div className="va-row">
        <div className="va-field">
          <label className="va-label">Position</label>
          <input type="number" className="va-input" min={0} max={seq.length - 1}
            value={position}
            onChange={e => setPosition(Math.min(seq.length - 1, Math.max(0, +e.target.value || 0)))}/>
        </div>
        <div className="va-field">
          <label className="va-label">Ref</label>
          <span className={`base ${refBase}`} style={{ width: 24, height: 24, fontSize: 13 }}>{refBase}</span>
        </div>
        <div className="va-field">
          <label className="va-label">→ Alt</label>
          <div className="va-alt-btns">
            {altBases.map(b => (
              <button key={b}
                className={`base ${b} va-alt-btn ${alt === b ? 'selected' : ''}`}
                style={{ width: 24, height: 24, fontSize: 13, cursor: 'pointer' }}
                onClick={() => setAlt(b)}>{b}</button>
            ))}
          </div>
        </div>
      </div>

      <button className="seq-btn primary va-run-btn" onClick={handleRun} disabled={!alt || loading}>
        {loading ? '⏳ Evo2 is thinking…' : '⚡ Run Evo2 Analysis'}
      </button>

      {loading && (
        <div className="va-loading">
          <div className="va-spinner"/>
          <span>Calling real Evo2 AI… <em>(cold-start may take ~60 s)</em></span>
        </div>
      )}
      {error && <div className="va-error">{error}</div>}

      {result && interp && (
        <div className="va-result-card" style={{ borderColor: interp.color }}>
          <div className="va-badge" style={{ background: interp.color + '22', color: interp.color, borderColor: interp.color + '55' }}>
            {interp.label}
          </div>
          <div className="va-scores">
            <div className="va-score-item">
              <span className="va-score-label">Δ Score (alt − ref)</span>
              <span className="va-score-val" style={{ color: interp.color }}>{result.deltaScore.toFixed(4)}</span>
            </div>
            {result.refScore !== null && (
              <div className="va-score-item">
                <span className="va-score-label">Ref log-P</span>
                <span className="va-score-val">{result.refScore.toFixed(4)}</span>
              </div>
            )}
            {result.altScore !== null && (
              <div className="va-score-item">
                <span className="va-score-label">Alt log-P</span>
                <span className="va-score-val">{result.altScore.toFixed(4)}</span>
              </div>
            )}
          </div>
          <div className="va-interp-desc">{interp.desc}</div>
          <div className="va-powered">⚡ Powered by real Evo2 AI · Arc Institute</div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  LEFT PANEL  (DNA Snapshot)                                     */
/* ═══════════════════════════════════════════════════════════════ */
function LeftPanel({ open, seqInput, setSeqInput, analysis, onAnalyze, onClear, onPreset }) {
  const [hoveredBase, setHoveredBase] = useState(null);

  return (
    <div className={`left-panel ${open ? '' : 'closed'}`}>
      {open && <>
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div className="panel-title">Your DNA Snapshot</div>
            <span className="info-badge" style={{ marginLeft: 4 }} title="What is TWIN?"
              onClick={() => { window._twinAsk && window._twinAsk('What is TWIN?'); }}>?</span>
          </div>
        </div>
        <div className="left-scroll">

          {/* Input */}
          <div className="panel-section">
            <SectionHeader title="Paste Your DNA Code Here"
              info="<strong>What is a DNA code?</strong><br/>DNA is your body's instruction manual, written using just 4 letters: <strong style='color:#3b82f6'>A</strong>, <strong style='color:#f59e0b'>T</strong>, <strong style='color:#22c55e'>G</strong>, and <strong style='color:#ef4444'>C</strong>. You can paste any sequence here and TWIN will analyse it."/>
            <div className="section-note">
              Your body's code uses just 4 letters.
              {' '}<strong style={{ color: 'var(--A)' }}>A</strong> always pairs with <strong style={{ color: 'var(--T)' }}>T</strong>
              {' '}·{' '}
              <strong style={{ color: 'var(--G)' }}>G</strong> always pairs with <strong style={{ color: 'var(--C)' }}>C</strong>
            </div>
            <div className="seq-input-wrap">
              <textarea value={seqInput} onChange={e => setSeqInput(e.target.value)}
                placeholder={"Paste or type a DNA code (only A, T, G, C)\ne.g. ATCGATCG..."}/>
            </div>
            <div className="seq-actions">
              <button className="seq-btn primary" onClick={onAnalyze}>▶ Read My DNA</button>
              <button className="seq-btn secondary" onClick={onClear}>Clear</button>
            </div>
          </div>

          {/* Base viewer */}
          {analysis && (
            <div className="panel-section">
              <SectionHeader title="DNA Letters"
                info="<strong>What are these coloured tiles?</strong><br/>Each tile is one letter of your DNA. Hover any tile to see what that letter does and light up the matching rung in the 3D spiral!"/>
              <div className="seq-viewer">
                {analysis.seq.split('').map((b, i) => (
                  <span key={i} className={`base ${b}`}
                    onMouseEnter={() => { setHoveredBase(b); window._dnaHighlight && window._dnaHighlight(i % 28); }}
                    onMouseLeave={() => { setHoveredBase(null); window._dnaClearHighlight && window._dnaClearHighlight(); }}
                  >{b}</span>
                ))}
              </div>
              <div className={`base-explain ${hoveredBase ? 'active' : ''}`}>
                {hoveredBase && BASE_INFO[hoveredBase] ? (
                  <>
                    <span className="be-letter" style={{ color: BASE_INFO[hoveredBase].color }}>
                      {hoveredBase} {BASE_INFO[hoveredBase].emoji}
                    </span>
                    <strong>{BASE_INFO[hoveredBase].full}</strong>{' — pairs with '}
                    <strong style={{ color: BASE_INFO[hoveredBase].pairColor }}>{BASE_INFO[hoveredBase].pair}</strong><br/>
                    <span style={{ color: 'var(--text3)', fontSize: '10px' }}>{BASE_INFO[hoveredBase].why}</span>
                  </>
                ) : (
                  <span style={{ color: 'var(--text3)' }}>👆 Hover any letter tile above to learn what it does</span>
                )}
              </div>
            </div>
          )}

          {/* Health report */}
          {analysis && (
            <div className="panel-section">
              <SectionHeader title="TWIN Health Report"
                info="<strong>What is a Health Score?</strong><br/>TWIN uses an AI (Evo2) to rate how 'natural' your code looks — like a spell-checker, but for DNA. Scores closer to 0 = more natural."/>
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
                <strong style={{ color: 'var(--G)' }}>G</strong>+<strong style={{ color: 'var(--C)' }}>C</strong> form <strong>3 bonds</strong> = stronger &amp; more stable.{' '}
                <strong style={{ color: 'var(--A)' }}>A</strong>+<strong style={{ color: 'var(--T)' }}>T</strong> form <strong>2 bonds</strong> = more flexible.
              </div>
              <div className="base-stats">
                {['A', 'T', 'G', 'C'].map((b, i) => (
                  <div key={b} className="base-stat" title={BASE_INFO[b]?.why}>
                    <span className="bs-label" style={{ color: `var(--${b})` }}>{b} {['🔵','🟡','🟢','🔴'][i]}</span>
                    <span className="bs-val">{analysis.counts[b]} ({Math.round(100 * analysis.counts[b] / analysis.seq.length)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evo2 Variant Analysis */}
          {analysis && <VariantAnalyser analysis={analysis}/>}

          {/* Presets */}
          <div className="panel-section">
            <SectionHeader title="Famous DNA Snippets"
              info="<strong>Why these?</strong><br/>Real, well-known pieces of human (and viral) DNA — each with a very different job. Click any card to load it and score it!"/>
            <div className="preset-list">
              {[['BRCA1','🛡️ Cancer Shield Gene'],['TELO','⏳ Cell Aging Clock'],
                ['KOZAK','🚀 Protein Launch Pad'],['PHIX','🦠 Tiny Virus DNA']].map(([key, label]) => (
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

/* ═══════════════════════════════════════════════════════════════ */
/*  PAGE 1 HEADER                                                  */
/* ═══════════════════════════════════════════════════════════════ */
function ExplorerHeader({ stats, leftOpen, rightOpen, toggleLeft, toggleRight, onGoAvatar }) {
  return (
    <header className="app-header">
      <div className="logo">
        <span className="logo-icon">🧬</span>
        <span className="logo-text">TWIN</span>
        <span className="logo-sub">Your personal DNA explorer</span>
      </div>
      <div className="header-stats">
        {[
          { dot: 'var(--green)',  label: `${stats.len} letters`,
            tip: '<strong>Letter Count</strong><br/>How many DNA letters (A, T, G, C) are in your code.' },
          { dot: 'var(--cyan)',   label: `Stability ${stats.gc || '—'}`,
            tip: '<strong>Stability = G+C %</strong><br/>G and C form 3 bonds — more G+C = harder to "unzip" = more stable.' },
          { dot: 'var(--amber)',  label: `Flexibility ${stats.at || '—'}`,
            tip: '<strong>Flexibility = A+T %</strong><br/>A and T form only 2 bonds — easier to open. Needed to "read" the DNA.' },
        ].map(({ dot, label, tip }) => (
          <div key={label} className="stat-pill-wrap">
            <div className="stat-pill">
              <span className="stat-dot" style={{ background: dot }}/>
              {label}
            </div>
            <div className="stat-tooltip" dangerouslySetInnerHTML={{ __html: tip }}/>
          </div>
        ))}
        {stats.score !== null && (
          <div className="stat-pill-wrap">
            <div className="stat-pill">
              <span className="stat-dot" style={{ background: 'var(--purple)' }}/>
              Health Score <span style={{ color: 'var(--green)' }}>{stats.score}</span>
            </div>
            <div className="stat-tooltip">
              <strong>DNA Health Score</strong><br/>How "natural" this code looks to TWIN's AI. Closer to 0 = more natural.
            </div>
          </div>
        )}
      </div>
      <div className="header-btns">
        <button className={`hbtn ${leftOpen ? 'active' : ''}`} onClick={toggleLeft}>DNA Code</button>
        <button className={`hbtn ${rightOpen ? 'active' : ''}`} onClick={toggleRight}>Ask TWIN</button>
        <button className="hbtn avatar-nav-btn" onClick={onGoAvatar} title="Open Avatar Lab">
          <span>🧑‍🔬</span> Avatar Lab
        </button>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  PAGE 1 — EXPLORER                                              */
/* ═══════════════════════════════════════════════════════════════ */
function ExplorerPage({ onGoAvatar, sharedState }) {
  const {
    loaded, leftOpen, setLeftOpen, rightOpen, setRightOpen,
    seqInput, setSeqInput, analysis, setAnalysis,
    messages, chatLoading, suggestions, setSuggestions,
    tooltip, setTooltip, addMsg, resolveTyping, handleSend, handleClearChat,
  } = sharedState;

  const stats = analysis
    ? { len: analysis.seq.length, gc: gcContent(analysis.seq) + '%', at: (100 - gcContent(analysis.seq)) + '%', score: analysis.score.toFixed(3) }
    : { len: 0, gc: null, at: null, score: null };

  const handleAnalyze = useCallback(() => {
    const seq = seqInput.toUpperCase().replace(/[^ATGC]/g, '');
    if (!seq) return;
    const score  = simulateScore(seq);
    const pct    = Math.min(100, Math.max(5, Math.round((score + 2.5) / 5 * 100)));
    const counts = { A: 0, T: 0, G: 0, C: 0 };
    seq.split('').forEach(b => { if (counts[b] !== undefined) counts[b]++; });
    setAnalysis({ seq, score, pct, label: scoreLabel(score), counts });
  }, [seqInput, setAnalysis]);

  const handleClearSeq = () => { setSeqInput(''); setAnalysis(null); };

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
    const resp = `Loaded the **${PRESET_FRIENDLY[key]}**! 🧬\n\nThis ${seq.length}-letter DNA code is **${gc}% stable**.\n\nHover any letter to light up that rung on the 3D spiral!`;
    setTimeout(() => resolveTyping(tid, resp), 600);
    setSuggestions([]);
    setTimeout(() => setSuggestions(DEFAULT_SUGGESTIONS.slice(0, 3)), 1800);
  }, [addMsg, resolveTyping, setSeqInput, setAnalysis, setSuggestions]);

  return (
    <div className="page page-explorer">
      {!loaded && (
        <div className="loading-screen">
          <div className="dna-loader"/>
          <div style={{ fontSize: '14px', color: 'var(--cyan)', fontWeight: 600 }}>Starting up TWIN…</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Loading 3D renderer…</div>
        </div>
      )}
      {tooltip.show && (
        <div className="dna-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.text}</div>
      )}
      <ExplorerHeader
        stats={stats} leftOpen={leftOpen} rightOpen={rightOpen}
        toggleLeft={() => setLeftOpen(o => !o)}
        toggleRight={() => setRightOpen(o => !o)}
        onGoAvatar={onGoAvatar}
      />
      <div className="app-body">
        <LeftPanel
          open={leftOpen} seqInput={seqInput} setSeqInput={setSeqInput}
          analysis={analysis} onAnalyze={handleAnalyze}
          onClear={handleClearSeq} onPreset={handlePreset}
        />
        <DNACanvas onTooltip={setTooltip}/>
        <ChatPanel
          open={rightOpen} messages={messages} loading={chatLoading}
          suggestions={suggestions} onSend={handleSend} onClear={handleClearChat}
        />
      </div>

      <div className="page-cta-ribbon">
        <span style={{ color: 'var(--text3)', fontSize: 12 }}>Ready to see your DNA in your body?</span>
        <button className="cta-pill" onClick={onGoAvatar}>
          🧑‍🔬 Open Avatar Lab <span className="cta-arrow">→</span>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  PAGE 2 — AVATAR LAB                                           */
/* ═══════════════════════════════════════════════════════════════ */

const BODY_REGIONS = [
  {
    id: 'brain', label: 'Brain', emoji: '🧠',
    top: '4%', left: '50%',
    gene: 'BRCA1', color: '#a855f7',
    info: 'Your brain cells contain the same DNA as every other cell. Genes like APOE influence Alzheimer\u2019s risk. TWIN scores brain-region genes to assess neural stability.',
    stat: 'Neural DNA stability is maintained by specialized repair enzymes active only in neurons.',
  },
  {
    id: 'heart', label: 'Heart', emoji: '❤️',
    top: '28%', left: '50%',
    gene: 'KOZAK', color: '#ef4444',
    info: 'The heart needs precise protein timing — the Kozak sequence (Protein Launch Pad) controls this. Mutations here can affect cardiac rhythm proteins.',
    stat: 'Cardiac genes are read ~2\u00d7 more frequently than average genes due to the heart\'s constant activity.',
  },
  {
    id: 'dna-helix', label: 'DNA Core', emoji: '🧬',
    top: '50%', left: '50%',
    gene: 'TELO', color: '#00e5ff',
    info: 'Every cell in your body has ~2 metres of DNA coiled inside it. Telomeres at the tips protect it like the plastic end of a shoelace, getting shorter each time cells divide.',
    stat: 'You lose ~50\u2013200 telomere letters per cell division. Lifestyle factors can slow this loss.',
  },
  {
    id: 'liver', label: 'Liver', emoji: '🫀',
    top: '42%', left: '34%',
    gene: 'PHIX', color: '#22c55e',
    info: 'The liver is your body\'s detox centre. It expresses over 400 unique gene products and is one of the few organs that can fully regenerate from 25% of its original mass.',
    stat: 'Liver cells replace themselves every 300\u2013500 days, copying all 3 billion DNA letters each time.',
  },
  {
    id: 'lungs', label: 'Lungs', emoji: '🫁',
    top: '32%', left: '66%',
    gene: 'BRCA1', color: '#3b82f6',
    info: 'Lung cells are exposed to environmental DNA damage daily. The BRCA1 Cancer Shield Gene is especially active here, constantly repairing oxidative damage from breathing.',
    stat: 'Each breath exposes lung DNA to ~1,000 oxidative lesions that must be repaired.',
  },
];

function AvatarCanvas({ activeRegion, onRegionClick }) {
  return (
    <div className="avatar-scene">
      <div className="avatar-particles">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="avatar-particle"
            style={{
              left: `${(i * 37) % 100}%`,
              top:  `${(i * 53) % 100}%`,
              animationDelay: `${(i * 0.3) % 4}s`,
              animationDuration: `${3 + (i % 4)}s`,
              background: ['var(--A)','var(--T)','var(--G)','var(--C)','var(--cyan)'][i % 5],
            }}/>
        ))}
      </div>

      <svg className="avatar-svg" viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bodyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#050512" stopOpacity="0"/>
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <ellipse cx="100" cy="200" rx="80" ry="160" fill="url(#bodyGlow)"/>
        <ellipse cx="100" cy="38" rx="26" ry="30"
          fill="none" stroke={activeRegion === 'brain' ? '#a855f7' : 'rgba(0,229,255,0.4)'}
          strokeWidth={activeRegion === 'brain' ? 2.5 : 1.5} filter="url(#glow)"/>
        <rect x="90" y="66" width="20" height="18" fill="none" stroke="rgba(0,229,255,0.3)" strokeWidth="1.5"/>
        <path d="M60 84 L50 200 L150 200 L140 84 Z"
          fill="none"
          stroke={activeRegion === 'heart' || activeRegion === 'liver' || activeRegion === 'lungs' ? 'rgba(0,229,255,0.7)' : 'rgba(0,229,255,0.35)'}
          strokeWidth="1.5" filter="url(#glow)"/>
        <path d="M60 90 L30 180 L40 182 L65 98" fill="none" stroke="rgba(0,229,255,0.3)" strokeWidth="1.5"/>
        <path d="M140 90 L170 180 L160 182 L135 98" fill="none" stroke="rgba(0,229,255,0.3)" strokeWidth="1.5"/>
        <path d="M75 200 L65 340 L85 340 L95 200" fill="none" stroke="rgba(0,229,255,0.3)" strokeWidth="1.5"/>
        <path d="M125 200 L135 340 L115 340 L105 200" fill="none" stroke="rgba(0,229,255,0.3)" strokeWidth="1.5"/>
        {[0,1,2,3,4].map(i => (
          <line key={i}
            x1={85 + Math.sin(i * 1.2) * 12} y1={100 + i * 22}
            x2={115 - Math.sin(i * 1.2) * 12} y2={100 + i * 22}
            stroke={['var(--A)','var(--T)','var(--G)','var(--C)','var(--cyan)'][i]}
            strokeWidth="1" opacity="0.5"/>
        ))}
        <line x1="40" y1="200" x2="160" y2="200" stroke="var(--cyan)" strokeWidth="0.5" opacity="0.3" strokeDasharray="4 4"/>
      </svg>

      {BODY_REGIONS.map(r => (
        <button key={r.id}
          className={`body-hotspot ${activeRegion === r.id ? 'active' : ''}`}
          style={{ top: r.top, left: r.left, '--hotspot-color': r.color }}
          onClick={() => onRegionClick(r.id)}
          title={r.label}>
          <span className="hotspot-pulse"/>
          <span className="hotspot-emoji">{r.emoji}</span>
        </button>
      ))}
    </div>
  );
}

function StatRing({ label, value, max, color }) {
  const pct  = Math.min(100, Math.max(0, (value / max) * 100));
  const circ = 2 * Math.PI * 28;
  return (
    <div className="stat-ring-wrap">
      <svg width="70" height="70" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5"/>
        <circle cx="35" cy="35" r="28" fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
          strokeLinecap="round" transform="rotate(-90 35 35)" style={{ transition: 'stroke-dashoffset 1s ease' }}/>
        <text x="35" y="39" textAnchor="middle" fill={color} fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">
          {Math.round(pct)}%
        </text>
      </svg>
      <div className="stat-ring-label">{label}</div>
    </div>
  );
}

function AvatarHeader({ onBack, analysis }) {
  return (
    <header className="app-header avatar-header">
      <div className="logo">
        <span className="logo-icon">🧑‍🔬</span>
        <span className="logo-text">TWIN</span>
        <span className="logo-sub">Avatar Lab</span>
      </div>
      <div className="avatar-header-center">
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          {analysis ? `Analysing: ${analysis.seq.length} letters · Score ${analysis.score.toFixed(3)}` : 'Load a DNA sequence on Page 1 to personalise this view'}
        </span>
      </div>
      <div className="header-btns">
        <button className="hbtn active" onClick={onBack}>← Back to Explorer</button>
      </div>
    </header>
  );
}

function AvatarPage({ onBack, sharedState }) {
  const { analysis, messages, chatLoading, suggestions, handleSend, handleClearChat } = sharedState;
  const [activeRegion, setActiveRegion] = useState('dna-helix');
  const [chatOpen, setChatOpen]         = useState(false);

  const region   = BODY_REGIONS.find(r => r.id === activeRegion) || BODY_REGIONS[2];
  const gcPct    = analysis ? gcContent(analysis.seq) : 52;
  const atPct    = analysis ? (100 - gcContent(analysis.seq)) : 48;
  const scorePct = analysis ? Math.min(100, Math.max(0, Math.round((analysis.score + 2.5) / 5 * 100))) : 60;

  return (
    <div className="page page-avatar">
      <AvatarHeader onBack={onBack} analysis={analysis}/>

      <div className="avatar-body">
        <div className="avatar-hud-left">
          <div className="hud-panel">
            <div className="hud-title">🔬 DNA Composition</div>
            <div className="stat-rings-row">
              <StatRing label="G+C"    value={gcPct}    max={100} color="var(--cyan)"/>
              <StatRing label="A+T"    value={atPct}    max={100} color="var(--amber)"/>
              <StatRing label="Health" value={scorePct} max={100} color="var(--green)"/>
            </div>
          </div>

          <div className="hud-panel">
            <div className="hud-title">📊 Base Counts</div>
            {analysis ? (
              ['A','T','G','C'].map((b, i) => {
                const pct = Math.round(100 * analysis.counts[b] / analysis.seq.length);
                return (
                  <div key={b} className="hud-bar-row">
                    <span className="hud-bar-label" style={{ color: `var(--${b})` }}>
                      {['🔵','🟡','🟢','🔴'][i]} {b}
                    </span>
                    <div className="hud-bar-bg">
                      <div className="hud-bar-fill" style={{ width: pct + '%', background: `var(--${b})` }}/>
                    </div>
                    <span className="hud-bar-val">{pct}%</span>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>
                Load a DNA sequence on Page 1<br/>to see base composition
              </div>
            )}
          </div>

          <div className="hud-panel">
            <div className="hud-title">🧬 Active Sequence</div>
            {analysis ? (
              <div className="hud-seq-preview">
                {analysis.seq.slice(0, 40).split('').map((b, i) => (
                  <span key={i} className={`base ${b}`} style={{ width: 13, height: 13, fontSize: 8 }}>{b}</span>
                ))}
                {analysis.seq.length > 40 && <span style={{ color: 'var(--text3)', fontSize: 10 }}>+{analysis.seq.length - 40} more</span>}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', padding: '8px 0' }}>No sequence loaded</div>
            )}
          </div>
        </div>

        <div className="avatar-center">
          <div className="avatar-title-badge">Click a body region to explore its DNA story</div>
          <AvatarCanvas activeRegion={activeRegion} onRegionClick={setActiveRegion}/>
        </div>

        <div className="avatar-hud-right">
          <div className="hud-panel region-info-card" style={{ borderColor: region.color }}>
            <div className="hud-title" style={{ color: region.color }}>
              {region.emoji} {region.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginTop: 8 }}>
              {region.info}
            </div>
            <div className="region-stat-box" style={{ borderColor: region.color + '44' }}>
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>📡 Did you know?</span><br/>
              <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>{region.stat}</span>
            </div>
            <button className="seq-btn primary" style={{ marginTop: 12, fontSize: 11 }}
              onClick={() => { window._twinAsk && window._twinAsk(`Tell me about the ${region.label} gene`); setChatOpen(true); }}>
              💬 Ask TWIN about this
            </button>
          </div>

          <div className="hud-panel">
            <div className="hud-title">🗺 Body Region Map</div>
            {BODY_REGIONS.map(r => (
              <div key={r.id}
                className={`region-legend-row ${activeRegion === r.id ? 'active' : ''}`}
                style={{ '--rc': r.color }}
                onClick={() => setActiveRegion(r.id)}>
                <span>{r.emoji}</span>
                <span style={{ flex: 1 }}>{r.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{r.gene}</span>
              </div>
            ))}
          </div>

          <button className="avatar-chat-toggle" onClick={() => setChatOpen(o => !o)}>
            {chatOpen ? '✕ Close Chat' : '💬 Ask TWIN'}
          </button>
        </div>
      </div>

      {chatOpen && (
        <div className="avatar-floating-chat">
          <ChatPanel
            open={true} floating={true}
            messages={messages} loading={chatLoading}
            suggestions={suggestions} onSend={handleSend}
            onClear={handleClearChat}
          />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  APP ROOT                                                       */
/* ═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [page,        setPage]        = useState('explorer');
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

  const addMsg = useCallback((role, content, typing = false) => {
    const id = ++msgId.current;
    setMessages(prev => [...prev, { id, role, content, typing }]);
    return id;
  }, []);

  const resolveTyping = useCallback((id, content) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content, typing: false } : m));
  }, []);

  useEffect(() => {
    const onMove = e => {
      setTooltip(t => t.show ? { ...t, x: e.clientX + 14, y: e.clientY - 10 } : t);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

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

  const handleClearChat = useCallback(() => {
    setMessages([]);
    addMsg('ai', 'Chat cleared! Ask me anything about DNA — no science knowledge needed 😊');
    setSuggestions(DEFAULT_SUGGESTIONS);
  }, [addMsg]);

  useEffect(() => {
    window._twinAsk = (q) => {
      if (page === 'explorer' && !rightOpen) setRightOpen(true);
      handleSend(q);
    };
    return () => { window._twinAsk = null; };
  }, [handleSend, rightOpen, page]);

  /* Boot: show welcome message */
  useEffect(() => {
    setTimeout(() => setLoaded(true), 600);
    addMsg('ai', `👋 Welcome to **TWIN** — your personal DNA explorer!\n\nNo science background needed.\n\n**Get started:**\n- 🌀 **Drag** the 3D spiral to spin it\n- 🔬 **Click a Famous Snippet** on the left\n- 🧑‍🔬 **Open Avatar Lab** to see DNA in your body\n- 💬 **Ask me anything** below!`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sharedState = {
    loaded, leftOpen, setLeftOpen, rightOpen, setRightOpen,
    seqInput, setSeqInput, analysis, setAnalysis,
    messages, chatLoading, suggestions, setSuggestions,
    tooltip, setTooltip, addMsg, resolveTyping, handleSend, handleClearChat,
  };

  return (
    <div className={`app-root page-transition ${page}`}>
      {page === 'explorer' && (
        <ExplorerPage onGoAvatar={() => setPage('avatar')} sharedState={sharedState}/>
      )}
      {page === 'avatar' && (
        <AvatarPage onBack={() => setPage('explorer')} sharedState={sharedState}/>
      )}
    </div>
  );
}

