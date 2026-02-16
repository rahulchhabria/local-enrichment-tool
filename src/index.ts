import dotenv from 'dotenv';
dotenv.config();

import * as Sentry from '@sentry/node';

// Initialize Sentry only if DSN is configured
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });
}

import express from 'express';
import { CompanyEnrichmentEngine } from './lib/enrichment-engine.js';
import { MarkdownExporter } from './lib/markdown-exporter.js';
import fs from 'fs/promises';

const PORT = parseInt(process.env.PORT || '3000', 10);
const IS_ELECTRON = process.env.ELECTRON_MODE === 'true';

const app = express();
app.use(express.json());

app.get('/', (_req, res) => {
  res.type('html').send(UI_HTML);
});

app.get('/api/health', (_req, res) => {
  const hasKey = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here';
  res.json({ status: 'ok', apiKeyConfigured: hasKey });
});

app.post('/api/enrich', async (req, res) => {
  const { domains } = req.body as { domains: string[] };

  if (!domains || domains.length === 0) {
    res.status(400).json({ error: 'No domains provided' });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured. Add it to your .env file.' });
    return;
  }

  try {
    if (process.env.SENTRY_DSN) {
      Sentry.getCurrentScope().setContext('enrichment', {
        domainCount: domains.length,
        domains: domains.join(', ')
      });
    }

    const engine = new CompanyEnrichmentEngine();
    const exporter = new MarkdownExporter();

    const inputs = domains.map(d => ({ domain: d.trim() }));
    const results = await engine.enrichBatch(inputs);

    const successfulData = results.filter(r => r.success && r.data).map(r => r.data!);
    let exportPath = '';

    if (successfulData.length === 1) {
      exportPath = await exporter.exportSingle(successfulData[0]);
    } else if (successfulData.length > 1) {
      exportPath = await exporter.exportBatch(successfulData);
    }

    let markdown = '';
    if (exportPath) {
      markdown = await fs.readFile(exportPath, 'utf-8');
    }

    if (process.env.SENTRY_DSN) {
      const successCount = results.filter(r => r.success).length;
      Sentry.getCurrentScope().setContext('enrichment_result', {
        successCount,
        failCount: domains.length - successCount
      });
    }

    res.json({
      results: results.map((r, i) => ({
        domain: domains[i],
        success: r.success,
        confidence: r.confidence,
        processingTimeMs: r.processingTimeMs,
        error: r.error,
        data: r.data,
      })),
      markdown,
      exportPath,
    });
  } catch (error) {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Setup Sentry error handler (only if configured)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.listen(PORT, () => {
  const hasKey = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here';

  if (!IS_ELECTRON) {
    console.log('');
    console.log('  Local Enrichment Tool');
    console.log(`  http://localhost:${PORT}`);
    if (!hasKey) console.log('  \u26a0 Add ANTHROPIC_API_KEY to .env');
    console.log('');
  } else {
    console.log(`[Server] Running on port ${PORT} (Electron mode)`);
    if (!hasKey) console.log('[Server] \u26a0 Add ANTHROPIC_API_KEY to .env');
  }
});

// ---------------------------------------------------------------------------
// Inline HTML — keeps the project dead simple (no build step for the UI)
// ---------------------------------------------------------------------------
const UI_HTML = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Local Enrichment Tool</title>
<script src="https://browser.sentry-cdn.com/10.38.0/bundle.tracing.replay.min.js" crossorigin="anonymous"></script>
<script>
Sentry.init({
  dsn: "${process.env.SENTRY_DSN || ''}",
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
});
</script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
:root{
  --bg:#0a0a0a;
  --surface:#111;
  --surface-raised:#171717;
  --border:#222;
  --border-hover:#333;
  --border-focus:#0070f3;
  --text:#ededed;
  --text2:#888;
  --text3:#555;
  --accent:#0070f3;
  --accent-h:#3291ff;
  --accent-a:#0366d6;
  --accent-subtle:rgba(0,112,243,.1);
  --success:#50e3c2;
  --success-subtle:rgba(80,227,194,.1);
  --warn:#f5a623;
  --warn-subtle:rgba(245,166,35,.1);
  --err:#e00;
  --err-subtle:rgba(238,0,0,.1);
  --purple:#7928ca;
  --r:8px;
  --rs:6px;
  --shadow:0 0 0 1px var(--border);
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;min-height:100vh}

/* Top navigation - Axiom pattern: nav at top for full-screen experience */
.navbar{height:48px;border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 16px;position:sticky;top:0;z-index:100;background:rgba(10,10,10,.8);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px)}
.nav-brand{display:flex;align-items:center;gap:10px}
.nav-logo{width:24px;height:24px;background:linear-gradient(135deg,var(--accent),var(--purple));border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.nav-logo svg{width:14px;height:14px}
.nav-title{font-size:14px;font-weight:600;color:var(--text);letter-spacing:-.02em}
.nav-sep{width:1px;height:20px;background:var(--border);margin:0 12px}
.nav-badge{font-size:11px;font-weight:500;color:var(--text2);background:var(--surface-raised);border:1px solid var(--border);border-radius:980px;padding:2px 8px;letter-spacing:.02em;text-transform:uppercase}
.nav-right{margin-left:auto;display:flex;align-items:center;gap:8px}
.nav-link{font-size:13px;color:var(--text2);text-decoration:none;padding:6px 10px;border-radius:var(--rs);transition:color .15s,background .15s}
.nav-link:hover{color:var(--text);background:var(--surface-raised)}

/* Layout */
.container{max-width:720px;margin:0 auto;padding:48px 24px 80px}

/* Hero - minimal, Vercel-style */
.hero{margin-bottom:40px}
.hero h2{font-size:32px;font-weight:700;letter-spacing:-.04em;line-height:1.2;margin-bottom:8px;background:linear-gradient(180deg,#fff 0%,#999 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero p{font-size:15px;color:var(--text2);line-height:1.6;max-width:480px}

/* Card - Geist-style with subtle border */
.card{background:var(--surface);border-radius:var(--r);border:1px solid var(--border);overflow:hidden;transition:border-color .15s}
.card:hover{border-color:var(--border-hover)}
.card-body{padding:24px}

/* Input group */
.input-group{margin-bottom:20px}
.input-group label{display:flex;align-items:baseline;font-size:13px;font-weight:500;color:var(--text);margin-bottom:8px;gap:8px}
.hint{font-size:12px;color:var(--text3);font-weight:400}
.kbd{font-size:10px;font-weight:500;color:var(--text3);background:var(--surface-raised);border:1px solid var(--border);border-radius:4px;padding:1px 5px;font-family:'SF Mono','Fira Code',ui-monospace,monospace}

/* Textarea - dark, sharp */
textarea{width:100%;min-height:120px;padding:12px 14px;font-family:'SF Mono','Fira Code',ui-monospace,Menlo,Monaco,'Lucida Console',monospace;font-size:13px;line-height:1.7;border:1px solid var(--border);border-radius:var(--rs);background:var(--bg);color:var(--text);resize:vertical;outline:none;transition:border-color .15s,box-shadow .15s}
textarea:focus{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--accent-subtle)}
textarea::placeholder{color:var(--text3)}

/* Actions bar */
.actions{display:flex;align-items:center;gap:12px}

/* Buttons - Geist-style */
.btn{height:36px;padding:0 16px;border-radius:var(--rs);font-size:13px;font-weight:500;cursor:pointer;border:none;transition:all .15s ease;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-family:inherit;white-space:nowrap}
.btn-p{background:#ededed;color:#0a0a0a}
.btn-p:hover{background:#fff}
.btn-p:active{background:#ccc;transform:scale(.98)}
.btn-p:disabled{background:var(--surface-raised);color:var(--text3);border:1px solid var(--border);cursor:not-allowed;transform:none}
.btn-s{background:transparent;color:var(--text2);border:1px solid var(--border)}
.btn-s:hover{color:var(--text);border-color:var(--border-hover);background:var(--surface-raised)}

.status{font-size:13px;color:var(--text2);flex:1;text-align:right}

/* Spinner */
.spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(10,10,10,.2);border-top-color:#0a0a0a;border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* Enrichment progress bar */
.progress-bar{height:2px;background:var(--border);border-radius:1px;margin-top:16px;overflow:hidden;display:none}
.progress-bar-fill{height:100%;width:0%;background:linear-gradient(90deg,var(--accent),var(--purple));border-radius:1px;transition:width .4s ease;animation:progressPulse 2s ease-in-out infinite}
@keyframes progressPulse{0%,100%{opacity:1}50%{opacity:.6}}

/* Results section */
.results{margin-top:32px}
.results-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border)}
.results-hdr h3{font-size:14px;font-weight:600;letter-spacing:-.01em}

/* Badges - Geist-style semantic */
.badge{font-size:12px;font-weight:500;padding:2px 8px;border-radius:980px;letter-spacing:.01em}
.badge-ok{background:var(--success-subtle);color:var(--success)}
.badge-warn{background:var(--warn-subtle);color:var(--warn)}
.badge-err{background:var(--err-subtle);color:var(--err)}

/* Result item - dashboard row */
.ri{border:1px solid var(--border);border-radius:var(--rs);padding:12px 16px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;transition:border-color .15s,background .15s;background:var(--surface)}
.ri:hover{border-color:var(--border-hover);background:var(--surface-raised)}
.ri-domain{font-size:13px;font-weight:600;letter-spacing:-.01em;font-family:'SF Mono','Fira Code',ui-monospace,monospace;color:var(--text)}
.ri-meta{font-size:12px;color:var(--text2);margin-top:2px;display:flex;align-items:center;gap:6px}
.ri-meta-dot{width:3px;height:3px;border-radius:50%;background:var(--text3);flex-shrink:0}

/* Preview section */
.preview{margin-top:32px}
.preview-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border)}
.preview-hdr h3{font-size:14px;font-weight:600;letter-spacing:-.01em}

/* Markdown preview - dark theme */
.md{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:28px;font-size:14px;line-height:1.7;max-height:700px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
.md::-webkit-scrollbar{width:6px}
.md::-webkit-scrollbar-track{background:transparent}
.md::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
.md::-webkit-scrollbar-thumb:hover{background:var(--border-hover)}
.md h1{font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-.03em;color:var(--text)}
.md h2{font-size:16px;font-weight:600;margin:28px 0 12px;color:var(--text);padding-bottom:8px;border-bottom:1px solid var(--border)}
.md h3{font-size:14px;font-weight:600;margin:20px 0 8px;color:var(--text)}
.md p{margin:0 0 12px;color:var(--text2)}
.md blockquote{border-left:2px solid var(--purple);padding-left:16px;margin:0 0 16px;color:var(--text2);font-style:italic}
.md table{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:13px;border:1px solid var(--border);border-radius:var(--rs);overflow:hidden}
.md th,.md td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)}
.md th{font-weight:600;color:var(--text);background:var(--surface-raised);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
.md td{color:var(--text2)}
.md tr:last-child td{border-bottom:none}
.md ul,.md ol{margin:0 0 12px;padding-left:20px}
.md li{margin-bottom:4px;color:var(--text2)}
.md li::marker{color:var(--text3)}
.md strong{color:var(--text);font-weight:600}
.md a{color:var(--accent);text-decoration:none;transition:color .15s}
.md a:hover{color:var(--accent-h)}
.md hr{border:none;border-top:1px solid var(--border);margin:24px 0}
.md em{font-style:italic;color:var(--text2)}

.fpath{font-size:12px;color:var(--text3);font-family:'SF Mono',ui-monospace,monospace;margin-top:10px;display:flex;align-items:center;gap:6px}
.fpath svg{flex-shrink:0}

/* Warning banner */
.warn-banner{background:var(--warn-subtle);border:1px solid rgba(245,166,35,.2);border-radius:var(--rs);padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:10px;font-size:13px;color:var(--warn)}
.warn-banner code{background:rgba(245,166,35,.15);padding:1px 6px;border-radius:4px;font-size:12px;font-family:'SF Mono',ui-monospace,monospace}

/* Animations */
.fade{animation:fadeIn .25s ease-out}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* Responsive */
@media(max-width:640px){
  .container{padding:32px 16px 60px}
  .hero h2{font-size:24px}
  .actions{flex-direction:column;align-items:stretch}
  .status{text-align:left}
  .nav-badge,.nav-sep,.nav-right{display:none}
  .card-body{padding:16px}
  .md{padding:20px}
}
</style>
</head>
<body>
<nav class="navbar">
  <div class="nav-brand">
    <div class="nav-logo">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>
    </div>
    <span class="nav-title">Local Enrichment Tool</span>
  </div>
  <span class="nav-sep"></span>
  <span class="nav-badge">AI-Powered</span>
  <div class="nav-right">
    <a href="https://github.com" class="nav-link" target="_blank" rel="noopener">Docs</a>
  </div>
</nav>
<div class="container">
  <div class="hero">
    <h2>Company Enrichment</h2>
    <p>Extract firmographic, technographic, and hiring intelligence from any domain.</p>
  </div>
  <div id="warn" class="warn-banner" style="display:none">
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <span>API key not configured. Add <code>ANTHROPIC_API_KEY</code> to <code>.env</code> and restart.</span>
  </div>
  <div class="card"><div class="card-body">
    <div class="input-group">
      <label>Domains <span class="hint">one per line</span> <kbd class="kbd">Cmd+Enter</kbd></label>
      <textarea id="inp" spellcheck="false" placeholder="example.com"></textarea>
    </div>
    <div class="actions">
      <button id="go" class="btn btn-p" onclick="run()">Enrich</button>
      <div class="status" id="st"></div>
    </div>
    <div class="progress-bar" id="pb"><div class="progress-bar-fill" id="pbf"></div></div>
  </div></div>
  <div id="res" class="results" style="display:none"></div>
  <div id="pre" class="preview" style="display:none"></div>
</div>
<script>
fetch('/api/health').then(r=>r.json()).then(d=>{if(!d.apiKeyConfigured){document.getElementById('warn').style.display='flex';document.getElementById('go').disabled=true}});

var progressTimer=null;
function startProgress(){var pb=document.getElementById('pb'),pbf=document.getElementById('pbf');pb.style.display='block';pbf.style.width='0%';var w=0;progressTimer=setInterval(function(){w+=Math.random()*8;if(w>90)w=90;pbf.style.width=w+'%'},800)}
function stopProgress(success){var pbf=document.getElementById('pbf');pbf.style.width='100%';pbf.style.animation='none';if(progressTimer)clearInterval(progressTimer);setTimeout(function(){document.getElementById('pb').style.display='none';pbf.style.width='0%';pbf.style.animation=''},500)}

async function run(){
  var inp=document.getElementById('inp'),btn=document.getElementById('go'),st=document.getElementById('st'),res=document.getElementById('res'),pre=document.getElementById('pre');
  var domains=inp.value.split('\\n').map(function(d){return d.trim()}).filter(function(d){return d&&!d.startsWith('#')});
  if(!domains.length){st.textContent='Enter at least one domain';return}
  btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Enriching\\u2026';
  st.textContent='Processing '+domains.length+' domain'+(domains.length>1?'s':'')+'\\u2026';
  res.style.display='none';pre.style.display='none';
  startProgress();
  try{
    var r=await fetch('/api/enrich',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domains:domains})});
    var d=await r.json();
    stopProgress(r.ok);
    if(!r.ok){st.textContent=d.error||'Something went wrong';return}
    var ok=d.results.filter(function(x){return x.success}).length;
    var h='<div class="results-hdr"><h3>Results</h3><span class="badge '+(ok===domains.length?'badge-ok':'badge-warn')+'">'+ok+'/'+domains.length+' enriched</span></div>';
    d.results.forEach(function(x){
      var b=x.success?'<span class="badge badge-ok">'+x.confidence+'%</span>':'<span class="badge badge-err">failed</span>';
      h+='<div class="ri"><div><div class="ri-domain">'+esc(x.domain)+'</div>';
      if(x.success&&x.data)h+='<div class="ri-meta">'+esc(x.data.name)+'<span class="ri-meta-dot"></span>'+(x.processingTimeMs/1000).toFixed(1)+'s</div>';
      else if(x.error)h+='<div class="ri-meta" style="color:var(--err)">'+esc(x.error)+'</div>';
      h+='</div>'+b+'</div>';
    });
    res.innerHTML=h;res.style.display='block';res.classList.add('fade');
    if(d.markdown){
      var ph='<div class="preview-hdr"><h3>Report</h3></div><div class="md">'+md2html(d.markdown)+'</div>';
      if(d.exportPath)ph+='<div class="fpath"><svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/><polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/></svg>'+esc(d.exportPath)+'</div>';
      pre.innerHTML=ph;pre.style.display='block';pre.classList.add('fade');
    }
    st.textContent='';
  }catch(e){stopProgress(false);st.textContent='Network error \\u2014 is the server running?'}
  finally{btn.disabled=false;btn.innerHTML='Enrich'}
}

function md2html(s){
  return s
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>')
    .replace(/^&gt; (.+)$/gm,'<blockquote><p>$1</p></blockquote>')
    .replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>')
    .replace(/_([^_]+)_/g,'<em>$1</em>')
    .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^\\|(.+)\\|$/gm,function(m){var c=m.split('|').filter(function(x){return x.trim()}).map(function(x){return x.trim()});if(c.every(function(x){return/^[-:]+$/.test(x)}))return'';return'<tr>'+c.map(function(x){return'<td>'+x+'</td>'}).join('')+'</tr>'})
    .replace(/((?:<tr>[\\s\\S]*?<\\/tr>\\s*)+)/g,'<table>$1</table>')
    .replace(/^---$/gm,'<hr>')
    .replace(/^- (.+)$/gm,'<li>$1</li>')
    .replace(/((?:<li>[\\s\\S]*?<\\/li>\\s*)+)/g,'<ul>$1</ul>')
    .replace(/\\n\\n/g,'<br><br>')
    .replace(/\\n/g,' ');
}

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

document.getElementById('inp').addEventListener('keydown',function(e){if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();document.getElementById('go').click()}});
</script>
</body>
</html>`;
