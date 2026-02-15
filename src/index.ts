import dotenv from 'dotenv';
dotenv.config();

import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
  enableLogs: true,
});

import express from 'express';
import { CompanyEnrichmentEngine } from './lib/enrichment-engine.js';
import { MarkdownExporter } from './lib/markdown-exporter.js';
import fs from 'fs/promises';

const PORT = parseInt(process.env.PORT || '3000', 10);

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
    Sentry.logger.info('Enrichment request received', { domainCount: domains.length, domains: domains.join(', ') });

    const engine = new CompanyEnrichmentEngine();
    const exporter = new MarkdownExporter();

    const inputs = domains.map(d => ({ domain: d.trim() }));
    const results = await Sentry.startSpan({ name: 'enrichBatch', op: 'enrichment', attributes: { domainCount: domains.length } }, () => {
      return engine.enrichBatch(inputs);
    });

    const successfulData = results.filter(r => r.success && r.data).map(r => r.data!);
    let exportPath = '';

    if (successfulData.length === 1) {
      exportPath = await Sentry.startSpan({ name: 'exportSingle', op: 'export' }, () => exporter.exportSingle(successfulData[0]));
    } else if (successfulData.length > 1) {
      exportPath = await Sentry.startSpan({ name: 'exportBatch', op: 'export' }, () => exporter.exportBatch(successfulData));
    }

    let markdown = '';
    if (exportPath) {
      markdown = await fs.readFile(exportPath, 'utf-8');
    }

    const successCount = results.filter(r => r.success).length;
    Sentry.logger.info('Enrichment request completed', { successCount, failCount: domains.length - successCount });

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
    Sentry.captureException(error);
    Sentry.logger.error('Enrichment request failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

Sentry.setupExpressErrorHandler(app);

app.listen(PORT, () => {
  const hasKey = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here';
  console.log('');
  console.log('  Local Enrichment Tool');
  console.log(`  http://localhost:${PORT}`);
  if (!hasKey) console.log('  \u26a0 Add ANTHROPIC_API_KEY to .env');
  console.log('');
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
  --bg:#f5f5f7;--surface:#fff;--border:#e5e5e7;--border-focus:#0071e3;
  --text:#1d1d1f;--text2:#6e6e73;--text3:#aeaeb2;
  --accent:#0071e3;--accent-h:#0077ed;--accent-a:#006edb;
  --success:#34c759;--warn:#ff9f0a;--err:#ff3b30;
  --r:12px;--rs:8px;
  --shadow:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;min-height:100vh}

.titlebar{height:52px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:center;position:sticky;top:0;z-index:100;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);background:rgba(255,255,255,.85)}
.titlebar-dots{position:absolute;left:20px;display:flex;gap:8px}
.dot{width:12px;height:12px;border-radius:50%}
.dot-r{background:#ff5f57}.dot-y{background:#febc2e}.dot-g{background:#28c840}
.titlebar h1{font-size:13px;font-weight:600;color:var(--text2);letter-spacing:-.01em}

.container{max-width:800px;margin:0 auto;padding:40px 24px}
.hero{text-align:center;margin-bottom:48px}
.hero-icon{width:64px;height:64px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:16px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(102,126,234,.3)}
.hero h2{font-size:28px;font-weight:700;letter-spacing:-.03em;margin-bottom:8px}
.hero p{font-size:15px;color:var(--text2);max-width:460px;margin:0 auto;line-height:1.5}

.card{background:var(--surface);border-radius:var(--r);border:1px solid var(--border);box-shadow:var(--shadow);overflow:hidden}
.card-body{padding:24px}
.input-group{margin-bottom:20px}
.input-group label{display:block;font-size:13px;font-weight:600;margin-bottom:8px}
.hint{font-size:12px;color:var(--text3);font-weight:400;margin-left:4px}

textarea{width:100%;min-height:120px;padding:12px 16px;font-family:'SF Mono','Fira Code',monospace;font-size:14px;line-height:1.7;border:1px solid var(--border);border-radius:var(--rs);background:var(--bg);color:var(--text);resize:vertical;outline:none;transition:border-color .2s,box-shadow .2s}
textarea:focus{border-color:var(--border-focus);box-shadow:0 0 0 3px rgba(0,113,227,.15)}
textarea::placeholder{color:var(--text3)}

.actions{display:flex;align-items:center;gap:12px}
.btn{padding:10px 24px;border-radius:980px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .2s;display:inline-flex;align-items:center;gap:8px;font-family:inherit}
.btn-p{background:var(--accent);color:#fff}
.btn-p:hover{background:var(--accent-h);transform:scale(1.02)}
.btn-p:active{background:var(--accent-a);transform:scale(.98)}
.btn-p:disabled{background:var(--text3);cursor:not-allowed;transform:none}
.btn-s{background:var(--bg);color:var(--text);border:1px solid var(--border)}
.btn-s:hover{background:#fafafa}
.status{font-size:13px;color:var(--text2);flex:1;text-align:right}
.spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.results{margin-top:32px}
.results-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.results-hdr h3{font-size:17px;font-weight:600}
.badge{font-size:12px;font-weight:600;padding:3px 10px;border-radius:980px}
.badge-ok{background:#e8f8ed;color:#1a7d36}
.badge-warn{background:#fff4e0;color:#9a6700}
.badge-err{background:#ffe5e5;color:#cc1a1a}

.ri{background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);padding:16px 20px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;transition:box-shadow .15s}
.ri:hover{box-shadow:var(--shadow)}
.ri-domain{font-size:14px;font-weight:600}
.ri-meta{font-size:12px;color:var(--text2)}

.preview{margin-top:32px}
.preview-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.preview-hdr h3{font-size:17px;font-weight:600}

.md{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:32px;font-size:14px;line-height:1.7;max-height:600px;overflow-y:auto}
.md h1{font-size:24px;font-weight:700;margin:0 0 8px;letter-spacing:-.02em}
.md h2{font-size:18px;font-weight:600;margin:24px 0 12px;color:var(--text)}
.md h3{font-size:15px;font-weight:600;margin:16px 0 8px}
.md p{margin:0 0 12px;color:var(--text2)}
.md blockquote{border-left:3px solid var(--accent);padding-left:16px;margin:0 0 16px;color:var(--text2);font-style:italic}
.md table{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:13px}
.md th,.md td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)}
.md th{font-weight:600;color:var(--text)}
.md td{color:var(--text2)}
.md ul,.md ol{margin:0 0 12px;padding-left:24px}
.md li{margin-bottom:4px;color:var(--text2)}
.md strong{color:var(--text)}
.md a{color:var(--accent);text-decoration:none}
.md a:hover{text-decoration:underline}
.md hr{border:none;border-top:1px solid var(--border);margin:24px 0}
.md em{font-style:italic}

.fpath{font-size:12px;color:var(--text3);font-family:'SF Mono',monospace;margin-top:8px}

.warn-banner{background:#fff8e5;border:1px solid #f0d060;border-radius:var(--rs);padding:14px 20px;margin-bottom:24px;display:flex;align-items:center;gap:10px;font-size:13px;color:#7a5c00}
.warn-banner code{background:rgba(0,0,0,.06);padding:2px 6px;border-radius:4px;font-size:12px}

.fade{animation:fadeIn .3s ease-out}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

@media(max-width:640px){.container{padding:24px 16px}.hero h2{font-size:22px}.actions{flex-direction:column}.status{text-align:left}}
</style>
</head>
<body>
<div class="titlebar">
  <div class="titlebar-dots"><div class="dot dot-r"></div><div class="dot dot-y"></div><div class="dot dot-g"></div></div>
  <h1>Local Enrichment Tool</h1>
</div>
<div class="container">
  <div class="hero">
    <div class="hero-icon">
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
    </div>
    <h2>Company Enrichment</h2>
    <p>Enter one or more domains to get firmographic, technographic, and hiring data — powered by AI.</p>
  </div>
  <div id="warn" class="warn-banner" style="display:none">
    <span>&#9888;</span>
    <span>API key not configured. Add your <code>ANTHROPIC_API_KEY</code> to the <code>.env</code> file and restart.</span>
  </div>
  <div class="card"><div class="card-body">
    <div class="input-group">
      <label>Domains <span class="hint">one per line &middot; Cmd+Enter to run</span></label>
      <textarea id="inp" placeholder="stripe.com&#10;anthropic.com&#10;linear.app" spellcheck="false"></textarea>
    </div>
    <div class="actions">
      <button id="go" class="btn btn-p" onclick="run()">Enrich</button>
      <button class="btn btn-s" onclick="example()">Load Example</button>
      <div class="status" id="st"></div>
    </div>
  </div></div>
  <div id="res" class="results" style="display:none"></div>
  <div id="pre" class="preview" style="display:none"></div>
</div>
<script>
fetch('/api/health').then(r=>r.json()).then(d=>{if(!d.apiKeyConfigured){document.getElementById('warn').style.display='flex';document.getElementById('go').disabled=true}});

function example(){document.getElementById('inp').value='stripe.com\\nanthropic.com\\nlinear.app';document.getElementById('inp').focus()}

async function run(){
  var inp=document.getElementById('inp'),btn=document.getElementById('go'),st=document.getElementById('st'),res=document.getElementById('res'),pre=document.getElementById('pre');
  var domains=inp.value.split('\\n').map(function(d){return d.trim()}).filter(function(d){return d&&!d.startsWith('#')});
  if(!domains.length){st.textContent='Enter at least one domain';return}
  btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Enriching\\u2026';
  st.textContent='This may take 30\\u201360s per domain\\u2026';res.style.display='none';pre.style.display='none';
  try{
    var r=await fetch('/api/enrich',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domains:domains})});
    var d=await r.json();
    if(!r.ok){st.textContent=d.error||'Something went wrong';return}
    var ok=d.results.filter(function(x){return x.success}).length;
    var h='<div class="results-hdr"><h3>Results</h3><span class="badge '+(ok===domains.length?'badge-ok':'badge-warn')+'">'+ok+'/'+domains.length+' enriched</span></div>';
    d.results.forEach(function(x){
      var b=x.success?'<span class="badge badge-ok">'+x.confidence+'%</span>':'<span class="badge badge-err">failed</span>';
      h+='<div class="ri"><div><div class="ri-domain">'+esc(x.domain)+'</div>';
      if(x.success&&x.data)h+='<div class="ri-meta">'+esc(x.data.name)+' \\u00b7 '+(x.processingTimeMs/1000).toFixed(1)+'s</div>';
      else if(x.error)h+='<div class="ri-meta" style="color:var(--err)">'+esc(x.error)+'</div>';
      h+='</div>'+b+'</div>';
    });
    res.innerHTML=h;res.style.display='block';res.classList.add('fade');
    if(d.markdown){
      var ph='<div class="preview-hdr"><h3>Markdown Preview</h3></div><div class="md">'+md2html(d.markdown)+'</div>';
      if(d.exportPath)ph+='<div class="fpath">Saved to '+esc(d.exportPath)+'</div>';
      pre.innerHTML=ph;pre.style.display='block';pre.classList.add('fade');
    }
    st.textContent='';
  }catch(e){st.textContent='Network error \\u2014 is the server running?'}
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
