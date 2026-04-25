const fs = require('fs');
const file = 'c:/Users/kamsi/Desktop/twin/twin-frontend/src/App.jsx';
let t = fs.readFileSync(file, 'utf8');
const r = (o,n)=>{const i=t.indexOf(o);if(i<0){console.error('NOT FOUND:',o.slice(0,60));return;}t=t.slice(0,i)+n+t.slice(i+o.length);};

// 2. Conditional avatar-hud-left class + wrap stats content
r(
  `        <div className="avatar-hud-left">\r\n          <div className="hud-panel">\r\n            <div className="hud-title"><Dna size={12}/> DNA Composition</div>`,
  `        <div className={\`avatar-hud-left\${avatarLeftTab === 'chat' ? ' chat-mode' : ''}\`}>\r\n          {avatarLeftTab === 'stats' && (<>\r\n          <div className="hud-panel">\r\n            <div className="hud-title"><Dna size={12}/> DNA Composition</div>`
);

// 3. Close stats fragment, add ChatPanel
r(
  `              <button className="seq-btn primary" onClick={onOpenHealthResults}>View Twin Health Results</button>\r\n            </div>\r\n          )}\r\n        </div>`,
  `              <button className="seq-btn primary" onClick={onOpenHealthResults}>View Twin Health Results</button>\r\n            </div>\r\n          )}\r\n          </>)}\r\n          {avatarLeftTab === 'chat' && (\r\n            <ChatPanel\r\n              open={true}\r\n              messages={messages} loading={chatLoading}\r\n              suggestions={suggestions} onSend={handleSend}\r\n              onClear={handleClearChat}\r\n            />\r\n          )}\r\n        </div>`
);

// 4. Remove floating chat + FAB
r(
  `          {chatOpen && (\r\n            <div className="avatar-floating-chat">\r\n              <ChatPanel\r\n                open={true}\r\n                messages={messages} loading={chatLoading}\r\n                suggestions={suggestions} onSend={handleSend}\r\n                onClear={handleClearChat}\r\n                onClose={() => setChatOpen(false)}\r\n              />\r\n            </div>\r\n          )}\r\n          {!chatOpen && (\r\n            <button className="avatar-chat-fab" onClick={() => setChatOpen(true)}>\r\n              <MessageCircle size={15}/> Ask TWIN\r\n            </button>\r\n          )}`,
  ''
);

// 5. Ask TWIN about this button
r('; setChatOpen(true); }}>',';}}>');

// 6. avatarLeftTab state in App root
r(
  `  const [twinAnswers,   setTwinAnswers]   = useState(null);\r\n  const [healthMsgs,    setHealthMsgs]    = useState([]);`,
  `  const [twinAnswers,   setTwinAnswers]   = useState(null);\r\n  const [avatarLeftTab, setAvatarLeftTab] = useState('stats');\r\n  const [healthMsgs,    setHealthMsgs]    = useState([]);`
);

// 7. Add to sharedState
r(
  `    tooltip, setTooltip, addMsg, resolveTyping, handleSend, handleClearChat,\r\n  };`,
  `    tooltip, setTooltip, addMsg, resolveTyping, handleSend, handleClearChat,\r\n    avatarLeftTab, setAvatarLeftTab,\r\n  };`
);

// 8. headerExtras for avatar
r(
  `      {page === 'avatar' && analysis && (\r\n        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{analysis.seq.length} bp \u00b7 {analysis.score.toFixed(2)}</span>\r\n      )}`,
  `      {page === 'avatar' && (\r\n        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>\r\n          {analysis && (\r\n            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{analysis.seq.length} bp \u00b7 {analysis.score.toFixed(2)}</span>\r\n          )}\r\n          <div className="header-btns">\r\n            <button className={'hbtn '+(avatarLeftTab === 'stats' ? 'active' : '')} onClick={() => setAvatarLeftTab('stats')}>DNA Stats</button>\r\n            <button className={'hbtn '+(avatarLeftTab === 'chat' ? 'active' : '')} onClick={() => setAvatarLeftTab('chat')}>Ask TWIN</button>\r\n          </div>\r\n        </div>\r\n      )}`
);

// 9. window._twinAsk for avatar
r("else if (page === 'avatar') handleSend(q);","else if (page === 'avatar') { setAvatarLeftTab('chat'); handleSend(q); }");

fs.writeFileSync(file, t);
console.log('avatarLeftTab:', t.includes('avatarLeftTab'));
console.log('chatOpen gone:', !t.includes('const [chatOpen, setChatOpen]'));
console.log('floating-chat gone:', !t.includes('avatar-floating-chat'));
console.log('chat-mode:', t.includes('chat-mode'));
console.log('DNA Stats btn:', t.includes('DNA Stats'));
