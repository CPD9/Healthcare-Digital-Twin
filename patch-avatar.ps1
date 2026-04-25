$file = "c:\Users\kamsi\Desktop\twin\twin-frontend\src\App.jsx"
$text = [IO.File]::ReadAllText($file)
$nl = "`r`n"

# ─── 1. AvatarPage: remove chatOpen state, add avatarLeftTab from sharedState ───
$old1 = "  const { analysis, messages, chatLoading, suggestions, handleSend, handleClearChat } = sharedState;${nl}  const [activeRegion, setActiveRegion] = useState('dna-helix');${nl}  const [chatOpen, setChatOpen]         = useState(false);${nl}  const [mobileTab, setMobileTab]       = useState('avatar');"
$new1 = "  const { analysis, messages, chatLoading, suggestions, handleSend, handleClearChat, avatarLeftTab, setAvatarLeftTab } = sharedState;${nl}  const [activeRegion, setActiveRegion] = useState('dna-helix');${nl}  const [mobileTab, setMobileTab]       = useState('avatar');"
$text = $text.Replace($old1, $new1)

# ─── 2. avatar-hud-left: add conditional class and wrap stats content ───
$old2 = "        <div className=""avatar-hud-left"">${nl}          <div className=""hud-panel"">${nl}            <div className=""hud-title""><Dna size={12}/> DNA Composition</div>"
$new2 = "        <div className={`+"`"+`avatar-hud-left`+"`"+`+avatarLeftTab === 'chat' ? ' chat-mode' : ''}}>
          {avatarLeftTab === 'stats' && (<>
          <div className=""hud-panel"">
            <div className=""hud-title""><Dna size={12}/> DNA Composition</div>"
$text = $text.Replace($old2, $new2)

# ─── 3. Close the stats fragment and add chat panel ───
$old3 = "              <button className=""seq-btn primary"" onClick={onOpenHealthResults}>View Twin Health Results</button>${nl}            </div>${nl}          )}${nl}        </div>"
$new3 = "              <button className=""seq-btn primary"" onClick={onOpenHealthResults}>View Twin Health Results</button>
            </div>
          )}
          </>)}
          {avatarLeftTab === 'chat' && (
            <ChatPanel
              open={true}
              messages={messages} loading={chatLoading}
              suggestions={suggestions} onSend={handleSend}
              onClear={handleClearChat}
            />
          )}
        </div>"
$text = $text.Replace($old3, $new3)

# ─── 4. Remove floating chat overlay and FAB from avatar-center ───
$old4 = "          {chatOpen && (${nl}            <div className=""avatar-floating-chat"">${nl}              <ChatPanel${nl}                open={true}${nl}                messages={messages} loading={chatLoading}${nl}                suggestions={suggestions} onSend={handleSend}${nl}                onClear={handleClearChat}${nl}                onClose={() => setChatOpen(false)}${nl}              />${nl}            </div>${nl}          )}${nl}          {!chatOpen && (${nl}            <button className=""avatar-chat-fab"" onClick={() => setChatOpen(true)}>${nl}              <MessageCircle size={15}/> Ask TWIN${nl}            </button>${nl}          )}"
$new4 = ""
$text = $text.Replace($old4, $new4)

# ─── 5. Update "Ask TWIN about this" button ───
$old5 = "                onClick={() => { window._twinAsk && window._twinAsk(`+"`"+`Tell me about the `+"`"+`+{region.label}+`+"`"+` gene`+"`"+`); setChatOpen(true); }}>"
$new5 = "                onClick={() => { window._twinAsk && window._twinAsk(`+"`"+`Tell me about the `+"`"+`+{region.label}+`+"`"+` gene`+"`"+`); }}>"
$text = $text.Replace($old5, $new5)

# ─── 6. Add avatarLeftTab state to App root ───
$old6 = "  const [twinAnswers,   setTwinAnswers]   = useState(null);${nl}  const [healthMsgs,    setHealthMsgs]    = useState([]);"
$new6 = "  const [twinAnswers,   setTwinAnswers]   = useState(null);${nl}  const [avatarLeftTab, setAvatarLeftTab] = useState('stats');${nl}  const [healthMsgs,    setHealthMsgs]    = useState([]);"
$text = $text.Replace($old6, $new6)

# ─── 7. Add avatarLeftTab to sharedState ───
$old7 = "    seqInput, setSeqInput, analysis, setAnalysis,${nl}    messages, chatLoading, suggestions, setSuggestions,${nl}    tooltip, setTooltip, addMsg, resolveTyping, handleSend, handleClearChat,${nl}  };"
$new7 = "    seqInput, setSeqInput, analysis, setAnalysis,${nl}    messages, chatLoading, suggestions, setSuggestions,${nl}    tooltip, setTooltip, addMsg, resolveTyping, handleSend, handleClearChat,${nl}    avatarLeftTab, setAvatarLeftTab,${nl}  };"
$text = $text.Replace($old7, $new7)

# ─── 8. Update headerExtras for avatar page ───
$old8 = "      {page === 'avatar' && analysis && (${nl}        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{analysis.seq.length} bp · {analysis.score.toFixed(2)}</span>${nl}      )}"
$new8 = "      {page === 'avatar' && (${nl}        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>${nl}          {analysis && (${nl}            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{analysis.seq.length} bp · {analysis.score.toFixed(2)}</span>${nl}          )}${nl}          <div className=""header-btns"">
            <button className={`+"`"+`hbtn `+"`"+`+(avatarLeftTab === 'stats' ? 'active' : '')} onClick={() => setAvatarLeftTab('stats')}>DNA Stats</button>
            <button className={`+"`"+`hbtn `+"`"+`+(avatarLeftTab === 'chat' ? 'active' : '')} onClick={() => setAvatarLeftTab('chat')}>Ask TWIN</button>
          </div>
        </div>
      )}"
$text = $text.Replace($old8, $new8)

# ─── 9. Update window._twinAsk for avatar page ───
$old9 = "    if (page === 'explorer') { if (!rightOpen) { setRightOpen(true); setLeftOpen(false); } handleSend(q); }${nl}      else if (page === 'avatar') handleSend(q);"
$new9 = "    if (page === 'explorer') { if (!rightOpen) { setRightOpen(true); setLeftOpen(false); } handleSend(q); }${nl}      else if (page === 'avatar') { setAvatarLeftTab('chat'); handleSend(q); }"
$text = $text.Replace($old9, $new9)

[IO.File]::WriteAllText($file, $text, [System.Text.Encoding]::UTF8)
Write-Host "Done. New length: $($text.Length)"
Write-Host "Has avatarLeftTab: $($text.Contains('avatarLeftTab'))"
Write-Host "Has chatOpen: $($text.Contains('const [chatOpen, setChatOpen]'))"
