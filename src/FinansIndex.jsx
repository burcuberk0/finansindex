import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

/* ============================================================================
   FinansIndex — Finans ve ekonomi yayın platformu
   "Paranı anlamanın daha kolay yolu."

   Mimari notu:
   - Veri katmanı (ARTICLES, TOOLS, AD_INVENTORY, MARKET_SOURCE) UI'dan ayrık.
     Her biri ileride CMS / REST / GraphQL kaynağına tek noktadan bağlanabilir.
   - Reklam alanları placement ID ile çalışır. Kreatif tanımlı değilse
     bileşen null döner, sayfada yer kaplamaz.
   - Ölçümleme tek bir track() fonksiyonundan geçer, window.dataLayer'a yazar.
   ========================================================================== */

/* ---------------------------------------------------------------- 1. TOKENS */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.fi *, .fi *::before, .fi *::after { box-sizing: border-box; }
.fi {
  /* Ana renk: mürekkep. Siyah değil, sıcak koyu gri-kahve.
     Vurgu: şarap kırmızısı — finans sektöründe nadir, editoryal ve ciddi.
     Zemin: krem kağıt. Beyazdan sıcak, gözü yormayan. */
  /* Mürekkep: nötr koyu gri, kahve değil. Zemin: krem kağıt.
     Vurgu: şarap kırmızısı, yalnızca küçük alanlarda. */
  --navy:#1A1A1A; --navy-2:#2E2E2E; --petrol:#8C1D33;
  --green:#8C1D33; --green-soft:#FAEFF1;
  --gold:#8A6410; --gold-soft:#FAF3E3;
  --bg:#FAF8F4; --surface:#FFFFFF; --line:#E6E1D8; --line-2:#CFC8BC;
  --ink:#14100E; --ink-2:#3A3634; --muted:#6E6A66;
  --up:#1E6B47; --down:#B0301F;
  --serif:'Source Serif 4', Georgia, 'Times New Roman', serif;
  --sans:'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --mono:'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace;
  --wrap:1180px; --r:3px;
  font-family: var(--sans);
  background: var(--bg); color: var(--ink);
  font-size:16px; line-height:1.6; -webkit-font-smoothing:antialiased;
  min-height:100%;
}
.fi img { max-width:100%; display:block; }
.fi button { font-family:inherit; font-size:inherit; cursor:pointer; }
.fi input, .fi select, .fi textarea { font-family:inherit; font-size:16px; }
.fi a { color:inherit; }
.fi :focus-visible { outline:3px solid var(--gold); outline-offset:2px; border-radius:2px; }
.fi ::selection { background:var(--gold-soft); }

.fi-wrap { max-width:var(--wrap); margin:0 auto; padding:0 20px; }
.fi-hidden { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }

/* --- link/button reset --- */
.fi-a { background:none; border:0; padding:0; text-align:left; color:inherit; text-decoration:none; display:block; width:100%; }
.fi-a:hover .fi-ttl { text-decoration:underline; text-decoration-thickness:1.5px; text-underline-offset:2px; }

/* --- ticker --- */
.fi-ticker { background:var(--ink); color:#fff; border-bottom:0; }
.fi-ticker-in { display:flex; align-items:center; gap:0; overflow-x:auto; scrollbar-width:none; }
.fi-ticker-in::-webkit-scrollbar { display:none; }
.fi-tick { display:flex; align-items:baseline; gap:8px; padding:9px 16px 9px 0; margin-right:16px; border-right:1px solid rgba(255,255,255,.14); white-space:nowrap; flex:0 0 auto; }
.fi-tick-k { font:500 11px/1 var(--mono); letter-spacing:.09em; text-transform:uppercase; color:#9C948C; }
.fi-tick-v { font:600 14px/1 var(--mono); }
.fi-tick-d { font:500 12px/1 var(--mono); }
.fi-up { color:#7FCFA6; } .fi-down { color:#F09A88; }
.fi-demo { font:500 10px/1 var(--mono); letter-spacing:.08em; text-transform:uppercase; color:var(--navy); background:#D9A441; padding:4px 7px; border-radius:2px; flex:0 0 auto; margin-left:auto; }

/* --- header --- */
.fi-hd { background:var(--surface); border-bottom:1px solid var(--line); position:sticky; top:0; z-index:60; }
.fi-hd-top { display:flex; align-items:center; gap:16px; padding:14px 0; }
.fi-logo { display:flex; align-items:center; gap:9px; background:none; border:0; padding:0; }
.fi-logo-m { width:30px; height:30px; flex:0 0 auto; }
.fi-logo-t { font:700 22px/1 var(--serif); letter-spacing:-.02em; color:var(--navy); }
.fi-logo-t em { font-style:normal; color:var(--green); }
.fi-tag { font:500 10px/1.3 var(--mono); letter-spacing:.06em; color:var(--muted); border-left:1px solid var(--line-2); padding-left:12px; margin-left:2px; max-width:120px; }
.fi-hd-acts { margin-left:auto; display:flex; align-items:center; gap:8px; }
.fi-ico { width:40px; height:40px; display:grid; place-items:center; background:none; border:1px solid var(--line); border-radius:var(--r); color:var(--ink-2); }
.fi-ico:hover { background:var(--bg); border-color:var(--line-2); }
.fi-btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:44px; padding:0 18px; border-radius:var(--r); border:1px solid transparent; font-weight:600; font-size:14px; letter-spacing:.01em; }
.fi-btn-p { background:var(--navy); color:#fff; } .fi-btn-p:hover { background:var(--navy-2); }
.fi-btn-g { background:var(--navy); color:#fff; } .fi-btn-g:hover { background:var(--navy-2); }
.fi-btn-o { background:transparent; color:var(--navy); border-color:var(--line-2); } .fi-btn-o:hover { background:var(--bg); }
.fi-nav { display:flex; gap:2px; border-top:1px solid var(--line); overflow-x:auto; scrollbar-width:none; }
.fi-nav::-webkit-scrollbar { display:none; }
.fi-nav button { background:none; border:0; padding:13px 12px; font-size:14px; font-weight:500; color:var(--ink-2); white-space:nowrap; border-bottom:2px solid transparent; margin-bottom:-1px; }
.fi-nav button:hover { color:var(--navy); }
.fi-nav button[aria-current="page"] { color:var(--navy); font-weight:600; border-bottom-color:var(--green); }
.fi-burger { display:none; }

/* --- mobile drawer --- */
.fi-drawer { position:fixed; inset:0; z-index:90; display:none; }
.fi-drawer.on { display:block; }
.fi-drawer-bg { position:absolute; inset:0; background:rgba(11,42,69,.5); }
.fi-drawer-pan { position:absolute; top:0; right:0; bottom:0; width:min(340px,88vw); background:var(--surface); padding:18px; overflow-y:auto; display:flex; flex-direction:column; gap:4px; }
.fi-drawer-pan a, .fi-drawer-pan button.fi-dl { display:block; width:100%; text-align:left; background:none; border:0; border-bottom:1px solid var(--line); padding:15px 4px; font-size:17px; font-weight:500; color:var(--ink); min-height:52px; }

/* --- search overlay --- */
.fi-so { position:fixed; inset:0; z-index:95; background:rgba(11,42,69,.55); display:grid; place-items:start center; padding:12vh 16px; }
.fi-so-box { background:var(--surface); width:min(640px,100%); border-radius:var(--r); padding:20px; }
.fi-so input { width:100%; padding:14px 16px; border:1px solid var(--line-2); border-radius:var(--r); font-size:17px; }

/* --- section frame --- */
.fi-sec { padding:44px 0; border-top:1px solid var(--line); }
.fi-sec:first-child { border-top:0; }
.fi-sh { display:flex; align-items:flex-end; gap:14px; margin-bottom:22px; flex-wrap:wrap; }
.fi-eyebrow { font:600 11px/1 var(--mono); letter-spacing:.14em; text-transform:uppercase; color:var(--petrol); margin-bottom:9px; }
.fi-h2 { font:600 27px/1.2 var(--serif); letter-spacing:-.015em; margin:0; color:var(--navy); }
.fi-sub { color:var(--muted); font-size:14.5px; margin:6px 0 0; max-width:60ch; }
.fi-more { margin-left:auto; font-size:14px; font-weight:600; color:var(--navy); background:none; border:0; padding:8px 0; }
.fi-more:hover { text-decoration:underline; }

/* --- manşet: dekoratif görsel yok, hiyerarşi tipografiyle kurulur --- */
.fi-lead { display:grid; grid-template-columns:1.6fr 1fr; gap:0; padding:0 0 44px; border-bottom:2px solid var(--ink); }
.fi-lead-main { padding:38px 40px 34px 0; border-right:1px solid var(--line); }
.fi-lead-t { font:700 46px/1.08 var(--serif); letter-spacing:-.032em; margin:14px 0 16px; color:var(--ink); max-width:19ch; }
.fi-lead-s { font:400 19px/1.55 var(--serif); color:var(--ink-2); margin:0; max-width:52ch; }

/* Öne çıkan rakam: manşetin görsel ağırlık merkezi */
.fi-lead-stat { display:flex; align-items:flex-start; gap:20px; margin:28px 0 0; padding:22px 24px; background:var(--surface); border:1px solid var(--line); border-left:3px solid var(--petrol); }
.fi-lead-stat-v { font:600 54px/.9 var(--mono); letter-spacing:-.04em; color:var(--petrol); font-variant-numeric:tabular-nums; flex:0 0 auto; }
.fi-lead-stat-v span { font-size:15px; font-weight:500; margin-left:6px; letter-spacing:0; }
.fi-lead-stat-b p { font-size:15px; line-height:1.45; color:var(--ink); margin:0; max-width:34ch; }
.fi-lead-stat-b span { display:block; font:500 12px/1.4 var(--mono); color:var(--muted); margin-top:7px; }
.fi-lead-acts { display:flex; gap:10px; flex-wrap:wrap; margin:26px 0 0; }

.fi-lead-side { padding:38px 0 34px 34px; display:flex; flex-direction:column; }
.fi-side-h { font:600 11px/1 var(--mono); letter-spacing:.14em; text-transform:uppercase; color:var(--petrol); margin:0 0 20px; padding-bottom:14px; border-bottom:1px solid var(--line-2); }
.fi-side-i { padding:0 0 20px; margin-bottom:20px; border-bottom:1px solid var(--line); }
.fi-side-i:last-child { border-bottom:0; margin-bottom:0; padding-bottom:0; }
.fi-side-t { font:600 19px/1.3 var(--serif); color:var(--ink); margin:7px 0 0; letter-spacing:-.012em; }
.fi-side-hook { font:500 13px/1.45 var(--mono); color:var(--petrol); margin:9px 0 0; }

/* --- meta chips --- */
.fi-meta { display:flex; align-items:center; gap:9px; flex-wrap:wrap; font:500 11.5px/1 var(--mono); letter-spacing:.05em; text-transform:uppercase; color:var(--muted); }
.fi-cat { color:var(--ink-2); font-weight:600; }
.fi-dot { width:3px; height:3px; border-radius:50%; background:var(--line-2); flex:0 0 auto; }
.fi-badge { font:600 10px/1 var(--mono); letter-spacing:.09em; text-transform:uppercase; padding:5px 7px; border-radius:2px; }
.fi-b-spon { background:var(--gold-soft); color:#7A5A05; border:1px solid #E8D49B; }
.fi-b-type { background:var(--bg); color:var(--ink-2); border:1px solid var(--line); }

/* ========== SIGNATURE: Cep Etkisi Defteri ========== */
/* Cep Etkisi Defteri — koyu blok yerine kağıt zemin.
   Sayfada tek bir büyük koyu alan olmaması, okuma yorgunluğunu azaltır. */
.fi-ledger { background:var(--surface); border:1px solid var(--line); border-top:2px solid var(--ink); }
.fi-ledger-hd { padding:26px 30px 22px; border-bottom:1px solid var(--line); display:flex; align-items:flex-end; gap:16px; flex-wrap:wrap; }
.fi-ledger-hd h2 { font:600 28px/1.15 var(--serif); margin:0; color:var(--ink); letter-spacing:-.018em; }
.fi-ledger-hd p { margin:7px 0 0; font-size:14.5px; color:var(--muted); max-width:52ch; }
.fi-ledger-date { margin-left:auto; font:500 11.5px/1 var(--mono); letter-spacing:.08em; text-transform:uppercase; color:var(--muted); padding-bottom:4px; }
.fi-le { display:grid; grid-template-columns:46px 1fr; border-top:1px solid var(--line); }
.fi-le:first-of-type { border-top:0; }
.fi-le-n { font:600 13px/1 var(--mono); color:var(--petrol); padding:28px 0 0 30px; }
.fi-le-b { padding:26px 30px 28px 0; }
.fi-le-tags { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; }
.fi-le-tag { font:600 10px/1 var(--mono); letter-spacing:.09em; text-transform:uppercase; padding:5px 8px; border-radius:2px; background:var(--green-soft); color:var(--petrol); border:1px solid #EFD9DE; }
.fi-le-tag.warn { background:var(--gold-soft); color:#6B4E08; border-color:#EADFC0; }
.fi-le-q { font:600 10.5px/1 var(--mono); letter-spacing:.11em; text-transform:uppercase; color:var(--muted); margin:0 0 6px; }
.fi-le-what { font:600 21px/1.32 var(--serif); color:var(--ink); margin:0 0 18px; letter-spacing:-.012em; }
.fi-le-how { font-size:15.5px; line-height:1.6; color:var(--ink-2); margin:0 0 18px; max-width:64ch; }
.fi-le-acts { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
.fi-le-lnk { background:none; border:1px solid var(--line-2); color:var(--ink); padding:9px 14px; border-radius:var(--r); font-size:13.5px; font-weight:600; min-height:40px; }
.fi-le-lnk:hover { background:var(--bg); border-color:var(--ink); }
.fi-le-lnk.calc { border-color:var(--petrol); color:var(--petrol); }
.fi-le-lnk.calc:hover { background:var(--green-soft); }

/* --- piyasa paneli --- */
.fi-mkt-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--line); border:1px solid var(--line); border-radius:var(--r); overflow:hidden; }
.fi-mkt-card { background:var(--surface); padding:18px 18px 16px; min-height:118px; display:flex; flex-direction:column; }
.fi-mkt-k { font:600 11px/1 var(--mono); letter-spacing:.1em; text-transform:uppercase; color:var(--muted); margin-bottom:12px; }
.fi-mkt-v { font:600 27px/1.05 var(--mono); letter-spacing:-.025em; color:var(--ink); font-variant-numeric:tabular-nums; }
.fi-mkt-u { font-size:15px; color:var(--muted); margin-left:3px; font-weight:400; }
.fi-mkt-d { display:inline-flex; align-items:center; gap:5px; font:600 13px/1 var(--mono); margin-top:9px; font-variant-numeric:tabular-nums; }
.fi-mkt-d.up { color:var(--up); } .fi-mkt-d.down { color:var(--down); }
.fi-mkt-d span[aria-hidden] { font-size:9px; }
.fi-mkt-s { font:400 11.5px/1.4 var(--mono); color:var(--muted); margin-top:auto; padding-top:10px; }
.fi-mkt-note { font-size:12.5px; color:var(--muted); margin:14px 0 0; line-height:1.55; }
.fi-skel-l { height:11px; width:52%; background:var(--line); border-radius:2px; margin-bottom:16px; }
.fi-skel-b { height:26px; width:74%; background:var(--line); border-radius:2px; opacity:.62; }

/* --- öne çıkan hesaplayıcı bölümü --- */
.fi-calcband { background:var(--surface); border:1px solid var(--line); border-radius:var(--r); overflow:hidden; }
.fi-calcband-hd { padding:26px 28px 22px; border-bottom:1px solid var(--line); display:flex; align-items:flex-end; gap:16px; flex-wrap:wrap; }
.fi-calcband-hd h2 { font:600 27px/1.18 var(--serif); margin:0; color:var(--ink); letter-spacing:-.018em; }
.fi-calcband-hd p { margin:7px 0 0; font-size:14.5px; color:var(--muted); max-width:56ch; }
.fi-calcband-tabs { display:flex; gap:0; border-bottom:1px solid var(--line); overflow-x:auto; scrollbar-width:none; }
.fi-calcband-tabs::-webkit-scrollbar { display:none; }
.fi-calcband-tabs button { background:none; border:0; border-bottom:2px solid transparent; margin-bottom:-1px; padding:15px 20px; font-size:14.5px; font-weight:500; color:var(--muted); white-space:nowrap; min-height:52px; }
.fi-calcband-tabs button:hover { color:var(--ink); background:var(--bg); }
.fi-calcband-tabs button[aria-selected="true"] { color:var(--petrol); font-weight:600; border-bottom-color:var(--petrol); background:var(--surface); }
.fi-calcband .fi-calc { border:0; border-radius:0; }
.fi-calcband .fi-calc-hd { display:none; }
.fi-calcband .fi-calc-out { border-radius:0; }

/* --- okunabilir grafik: rakam her zaman görünür --- */
.fi-chart { margin:24px 0 28px; padding:20px 22px; background:var(--surface); border:1px solid var(--line); border-radius:var(--r); }
.fi-chart-t { font:600 16px/1.35 var(--sans); color:var(--ink); margin:0 0 16px; padding-bottom:14px; border-bottom:1px solid var(--line); }
.fi-chart-body { display:flex; flex-direction:column; gap:4px; }
.fi-chart-cap { font-size:12.5px; line-height:1.55; color:var(--muted); margin:14px 0 0; padding-top:12px; border-top:1px solid var(--line); }
.fi-chart-note { font-size:13px; color:var(--ink-2); margin:14px 0 0; padding:11px 13px; background:var(--bg); border-left:2px solid var(--petrol); }
.fi-bar-row { display:grid; grid-template-columns:minmax(96px,150px) 1fr; align-items:center; gap:16px; padding:7px 0; }
.fi-bar-lbl { font-size:14px; color:var(--ink-2); line-height:1.3; }
.fi-bar-lbl.hi { font-weight:600; color:var(--ink); }
.fi-bar-sub { display:block; font-size:12px; color:var(--muted); margin-top:2px; }
.fi-bar-track { position:relative; height:34px; display:flex; align-items:center; }
.fi-bar-fill { height:34px; border-radius:2px; display:flex; align-items:center; justify-content:flex-end; padding-right:11px; min-width:3%; transition:width .3s ease; }
.fi-bar-in { font:600 15px/1 var(--mono); color:#fff; font-variant-numeric:tabular-nums; white-space:nowrap; }
.fi-bar-out { font:600 15px/1 var(--mono); color:var(--ink); font-variant-numeric:tabular-nums; margin-left:11px; white-space:nowrap; }

/* --- öne çıkan rakam blokları --- */
.fi-stats { margin:24px 0 28px; padding:0; }
.fi-stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:1px; background:var(--line); border:1px solid var(--line); border-radius:var(--r); overflow:hidden; }
.fi-stat { background:var(--surface); padding:20px 18px; }
.fi-stat-v { font:600 30px/1.05 var(--mono); letter-spacing:-.025em; color:var(--petrol); font-variant-numeric:tabular-nums; }
.fi-stat-k { font-size:13.5px; color:var(--ink-2); margin-top:9px; line-height:1.4; }
.fi-stat-s { font-size:12px; color:var(--muted); margin-top:5px; line-height:1.4; }

/* --- cards --- */
.fi-grid { display:grid; gap:26px; }
.fi-g3 { grid-template-columns:repeat(3,1fr); }
.fi-g4 { grid-template-columns:repeat(4,1fr); }
.fi-card { border-top:2px solid var(--ink); padding-top:14px; }
.fi-ttl { font:600 19px/1.3 var(--serif); color:var(--ink); margin:10px 0 8px; letter-spacing:-.014em; }
.fi-exc { font-size:14.5px; line-height:1.55; color:var(--muted); margin:0; }
.fi-card-hook { font:500 13px/1.5 var(--mono); color:var(--petrol); margin:0; }

/* --- filter --- */
.fi-filters { display:flex; gap:7px; flex-wrap:wrap; margin-bottom:24px; }
.fi-chip { background:var(--surface); border:1px solid var(--line-2); color:var(--ink-2); padding:9px 14px; border-radius:100px; font-size:13.5px; font-weight:500; min-height:40px; }
.fi-chip:hover { border-color:var(--navy); }
.fi-chip[aria-pressed="true"] { background:var(--navy); border-color:var(--navy); color:#fff; }

/* --- tools --- */
.fi-tool { display:block; width:100%; text-align:left; background:var(--surface); border:1px solid var(--line); border-radius:var(--r); padding:20px; min-height:100%; }
.fi-tool:hover { border-color:var(--green); box-shadow:0 1px 0 var(--green); }
.fi-tool-i { width:34px; height:34px; display:grid; place-items:center; background:var(--green-soft); border-radius:var(--r); margin-bottom:13px; color:var(--green); }
.fi-tool-t { font:600 16px/1.3 var(--sans); color:var(--navy); margin:0 0 5px; }
.fi-tool-d { font-size:13.5px; color:var(--muted); margin:0; }

/* --- calculator --- */
.fi-calc { background:var(--surface); border:1px solid var(--line); border-radius:var(--r); }
.fi-calc-hd { padding:22px 24px; border-bottom:1px solid var(--line); }
.fi-calc-hd h3 { font:600 21px/1.25 var(--serif); color:var(--navy); margin:0 0 6px; }
.fi-calc-hd p { margin:0; font-size:14px; color:var(--muted); }
.fi-calc-b { display:grid; grid-template-columns:1fr 1fr; }
.fi-calc-in { padding:24px; display:flex; flex-direction:column; gap:16px; }
.fi-calc-out { padding:24px; background:var(--navy); color:#fff; border-radius:0 0 var(--r) 0; }
.fi-fld label { display:block; font-size:13px; font-weight:600; color:var(--ink-2); margin-bottom:6px; }
.fi-fld .hint { display:block; font-weight:400; color:var(--muted); font-size:12px; margin-top:3px; }
.fi-fld input, .fi-fld select { width:100%; padding:11px 12px; border:1px solid var(--line-2); border-radius:var(--r); background:var(--surface); min-height:44px; font-family:var(--mono); }
.fi-fld input:focus, .fi-fld select:focus { border-color:var(--navy); }
.fi-toggle { display:flex; align-items:flex-start; gap:9px; font-size:13.5px; color:var(--ink-2); }
.fi-toggle input { width:20px; height:20px; margin-top:2px; flex:0 0 auto; }
.fi-res-main { border-bottom:1px solid rgba(255,255,255,.14); padding-bottom:16px; margin-bottom:16px; }
.fi-res-k { font:500 11px/1 var(--mono); letter-spacing:.1em; text-transform:uppercase; color:#B5A79C; margin-bottom:8px; }
.fi-res-v { font:600 32px/1.05 var(--mono); letter-spacing:-.02em; color:#fff; }
.fi-res-row { display:flex; justify-content:space-between; gap:12px; padding:8px 0; font-size:14px; }
.fi-res-row span:first-child { color:#C4B7AC; }
.fi-res-row span:last-child { font-family:var(--mono); font-weight:500; }
.fi-note { font-size:12.5px; color:var(--muted); margin:14px 0 0; padding-top:14px; border-top:1px solid var(--line); }
.fi-calc-out .fi-note { color:#A2948A; border-top-color:rgba(255,255,255,.14); }
.fi-samp { display:inline-block; font:500 10px/1 var(--mono); letter-spacing:.09em; text-transform:uppercase; background:var(--gold-soft); color:#7A5A05; padding:5px 8px; border-radius:2px; border:1px solid #E8D49B; }

/* --- panels --- */
.fi-panel { background:var(--surface); border:1px solid var(--line); border-radius:var(--r); padding:24px; }
.fi-dossier { display:block; background:var(--petrol); color:#fff; border-radius:var(--r); overflow:hidden; }
.fi-dossier-i { min-height:280px; background:var(--navy); }
.fi-dossier-b { padding:34px; }
.fi-dossier-b h3 { font:700 30px/1.16 var(--serif); margin:12px 0 12px; letter-spacing:-.02em; }
.fi-dossier-b p { color:#D5C9BE; font-size:15.5px; margin:0 0 20px; }
.fi-dossier-b .fi-eyebrow { color:#E5A3AE; }
.fi-dossier-parts { list-style:none; padding:0; margin:0 0 22px; }
.fi-dossier-parts li { border-top:1px solid rgba(255,255,255,.16); padding:11px 0; font-size:14.5px; display:flex; gap:12px; }
.fi-dossier-parts li b { font:500 12px/1.5 var(--mono); color:#E5A3AE; flex:0 0 auto; }

/* --- guides --- */
.fi-guide { background:var(--surface); border:1px solid var(--line); border-left:3px solid var(--gold); border-radius:var(--r); padding:18px 20px; }
.fi-guide h3 { font:600 17px/1.3 var(--serif); color:var(--navy); margin:0 0 6px; }
.fi-guide p { font-size:13.5px; color:var(--muted); margin:0 0 10px; }
.fi-guide span { font:500 11px/1 var(--mono); letter-spacing:.07em; text-transform:uppercase; color:var(--gold); }

/* --- native ad --- */
.fi-native { border:1px solid var(--line-2); border-radius:var(--r); background:var(--surface); padding:18px; position:relative; }
.fi-native::before { content:''; position:absolute; inset:0 auto 0 0; width:3px; background:var(--gold); border-radius:var(--r) 0 0 var(--r); }
.fi-ad { border:1px dashed var(--line-2); border-radius:var(--r); background:var(--surface); padding:16px; }
.fi-ad-lbl { font:500 10px/1 var(--mono); letter-spacing:.1em; text-transform:uppercase; color:var(--muted); margin-bottom:10px; display:block; }
.fi-ad-banner { display:flex; align-items:center; gap:18px; }
.fi-sticky { position:sticky; top:150px; }
.fi-2col { display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:40px; }
.fi-skip:focus-visible { position:fixed; top:10px; left:10px; width:auto; height:auto; clip:auto; background:var(--navy); color:#fff; padding:12px 18px; border-radius:var(--r); z-index:200; }

/* --- newsletter --- */
.fi-nl { background:var(--navy); color:#fff; border-radius:var(--r); padding:38px; display:grid; grid-template-columns:1fr 1fr; gap:38px; align-items:center; }
.fi-nl h2 { font:600 29px/1.18 var(--serif); margin:10px 0 10px; letter-spacing:-.02em; }
.fi-nl p { color:#C4B7AC; font-size:15px; margin:0; }
.fi-nl .fi-eyebrow { color:#E5A3AE; }
.fi-nl-f { display:flex; flex-direction:column; gap:12px; }
.fi-nl-f input { width:100%; padding:13px 14px; border:1px solid rgba(255,255,255,.28); background:rgba(255,255,255,.07); color:#fff; border-radius:var(--r); min-height:48px; }
.fi-nl-f input::placeholder { color:#A2948A; }
.fi-nl-f input[aria-invalid="true"] { border-color:#F0A594; }
.fi-consent { display:flex; gap:10px; align-items:flex-start; font-size:12.5px; color:#C4B7AC; line-height:1.5; }
.fi-consent input { width:20px; height:20px; flex:0 0 auto; margin-top:1px; }
.fi-msg { font-size:13.5px; padding:11px 13px; border-radius:var(--r); margin:0; }
.fi-msg.err { background:rgba(243,162,143,.14); color:#F0A594; border:1px solid rgba(243,162,143,.3); }
.fi-msg.ok { background:rgba(127,211,170,.14); color:#EFB9C2; border:1px solid rgba(127,211,170,.32); }

/* --- article --- */
.fi-art { display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:48px; padding:32px 0 0; }
.fi-bc { font:500 12px/1.5 var(--mono); color:var(--muted); margin-bottom:18px; display:flex; gap:8px; flex-wrap:wrap; }
.fi-bc button { background:none; border:0; padding:0; color:var(--muted); }
.fi-bc button:hover { color:var(--navy); text-decoration:underline; }
.fi-art h1 { font:700 40px/1.14 var(--serif); letter-spacing:-.028em; color:var(--navy); margin:12px 0 16px; }
.fi-spot { font:400 19px/1.55 var(--serif); color:var(--ink-2); margin:0 0 22px; max-width:62ch; }
.fi-byline { display:flex; align-items:center; gap:13px; padding:16px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); flex-wrap:wrap; }
.fi-av { width:42px; height:42px; border-radius:50%; background:var(--green-soft); color:var(--green); display:grid; place-items:center; font:600 14px var(--sans); flex:0 0 auto; }
.fi-byline-n { font-weight:600; font-size:14.5px; color:var(--navy); }
.fi-byline-r { font-size:12.5px; color:var(--muted); }
.fi-share { margin-left:auto; display:flex; gap:7px; }
.fi-share button { width:38px; height:38px; border:1px solid var(--line); background:var(--surface); border-radius:var(--r); display:grid; place-items:center; color:var(--ink-2); }
.fi-share button:hover { border-color:var(--navy); color:var(--navy); }
.fi-cover { aspect-ratio:16/9; background:var(--navy); border-radius:var(--r); overflow:hidden; margin:26px 0 8px; }
.fi-cap { font-size:12.5px; color:var(--muted); margin:0 0 28px; }
.fi-toc { background:var(--surface); border:1px solid var(--line); border-radius:var(--r); padding:20px 22px; margin:0 0 30px; }
.fi-toc h2 { font:600 12px/1 var(--mono); letter-spacing:.12em; text-transform:uppercase; color:var(--muted); margin:0 0 13px; }
.fi-toc ol { margin:0; padding-left:20px; display:flex; flex-direction:column; gap:8px; }
.fi-toc button { background:none; border:0; padding:0; font-size:14.5px; color:var(--navy); font-weight:500; text-align:left; }
.fi-toc button:hover { text-decoration:underline; }
.fi-body { font-size:17.5px; line-height:1.72; color:var(--ink-2); max-width:68ch; }
.fi-body h2 { font:600 25px/1.28 var(--serif); color:var(--navy); margin:38px 0 14px; letter-spacing:-.015em; scroll-margin-top:150px; }
.fi-body p { margin:0 0 19px; }
.fi-body ul { margin:0 0 19px; padding-left:22px; }
.fi-body li { margin-bottom:9px; }
.fi-body strong { color:var(--ink); font-weight:600; }
.fi-quote { border-left:3px solid var(--green); padding:4px 0 4px 20px; margin:26px 0; font:400 20px/1.5 var(--serif); color:var(--navy); }
.fi-tbl { width:100%; border-collapse:collapse; margin:8px 0 22px; font-size:15px; }
.fi-tbl th { text-align:left; font:600 11px/1 var(--mono); letter-spacing:.08em; text-transform:uppercase; color:var(--muted); padding:10px 12px; border-bottom:1px solid var(--line-2); }
.fi-tbl td { padding:11px 12px; border-bottom:1px solid var(--line); font-family:var(--mono); font-size:14px; }
.fi-tbl td:first-child { font-family:var(--sans); }
.fi-impact { background:var(--green-soft); border:1px solid #C8E0D4; border-left:3px solid var(--green); border-radius:var(--r); padding:22px 24px; margin:30px 0; }
.fi-impact h3 { font:600 11px/1 var(--mono); letter-spacing:.12em; text-transform:uppercase; color:var(--green); margin:0 0 12px; }
.fi-impact p { font-size:16px; color:var(--ink); margin:0 0 12px; line-height:1.62; }
.fi-impact ul { margin:0; padding-left:20px; font-size:15.5px; color:var(--ink-2); }
.fi-impact li { margin-bottom:7px; }
.fi-src { border-top:1px solid var(--line); padding-top:22px; margin-top:36px; }
.fi-src h3 { font:600 11px/1 var(--mono); letter-spacing:.12em; text-transform:uppercase; color:var(--muted); margin:0 0 12px; }
.fi-src ol { margin:0; padding-left:20px; font-size:14px; color:var(--ink-2); }
.fi-src li { margin-bottom:7px; }
.fi-disc { background:var(--bg); border:1px solid var(--line); border-radius:var(--r); padding:15px 17px; font-size:13px; color:var(--muted); margin:24px 0; }
.fi-aibox { background:var(--bg); border:1px solid var(--line); border-left:3px solid var(--petrol); border-radius:0; padding:18px 20px; margin:30px 0 0; }
.fi-aibox h3 { font:600 11px/1 var(--mono); letter-spacing:.12em; text-transform:uppercase; color:var(--petrol); margin:0 0 10px; display:flex; align-items:center; gap:8px; }
.fi-aibox p { font-size:14px; line-height:1.6; color:var(--ink-2); margin:0 0 10px; }
.fi-aibox p:last-child { margin-bottom:0; }
.fi-aibox b { color:var(--ink); font-weight:600; }
.fi-corr { background:var(--gold-soft); border:1px solid #E8D49B; border-radius:var(--r); padding:15px 17px; font-size:13.5px; color:#5F4604; margin:24px 0; }
.fi-sponnote { background:var(--gold-soft); border:1px solid #E8D49B; border-radius:var(--r); padding:16px 18px; margin:0 0 20px; font-size:14px; color:#5F4604; }
.fi-rail { display:flex; flex-direction:column; gap:26px; }
.fi-rail-h { font:600 11px/1 var(--mono); letter-spacing:.12em; text-transform:uppercase; color:var(--muted); margin:0 0 14px; padding-bottom:11px; border-bottom:1px solid var(--line-2); }
.fi-rail-i { display:block; width:100%; text-align:left; background:none; border:0; padding:13px 0; border-bottom:1px solid var(--line); }
.fi-rail-i:last-child { border-bottom:0; }
.fi-rail-t { font:600 15.5px/1.35 var(--serif); color:var(--navy); margin:5px 0 0; }
.fi-rail-i:hover .fi-rail-t { text-decoration:underline; }
.fi-relcalc { background:var(--navy); color:#fff; border-radius:var(--r); padding:22px; }
.fi-relcalc .fi-eyebrow { color:#E5A3AE; }
.fi-relcalc h3 { font:600 19px/1.28 var(--serif); margin:0 0 8px; }
.fi-relcalc p { font-size:13.5px; color:#C4B7AC; margin:0 0 16px; }

/* --- media kit --- */
.fi-mk-hero { background:var(--navy); color:#fff; padding:56px 0; }
.fi-mk-hero h1 { font:700 44px/1.1 var(--serif); letter-spacing:-.03em; margin:14px 0 16px; max-width:18ch; }
.fi-mk-hero p { font-size:17.5px; color:#D5C9BE; max-width:58ch; margin:0; }
.fi-mk-hero .fi-eyebrow { color:#E5A3AE; }
.fi-prod { background:var(--surface); border:1px solid var(--line); border-radius:var(--r); padding:24px; }
.fi-prod h3 { font:600 18px/1.3 var(--sans); color:var(--navy); margin:0 0 8px; }
.fi-prod p { font-size:14px; color:var(--muted); margin:0 0 14px; }
.fi-prod ul { margin:0; padding:0; list-style:none; font-size:13px; }
.fi-prod li { padding:7px 0; border-top:1px solid var(--line); display:flex; justify-content:space-between; gap:12px; color:var(--ink-2); }
.fi-prod li code { font:500 11px/1.5 var(--mono); color:var(--muted); }
.fi-form { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.fi-form .full { grid-column:1/-1; }
.fi-form textarea { width:100%; padding:11px 12px; border:1px solid var(--line-2); border-radius:var(--r); min-height:110px; font-family:var(--sans); }

/* --- footer --- */
.fi-ft { background:var(--navy); color:#D5C9BE; margin-top:56px; padding:48px 0 26px; }
.fi-ft-g { display:grid; grid-template-columns:1.6fr 1fr 1fr 1fr; gap:34px; padding-bottom:34px; border-bottom:1px solid rgba(255,255,255,.13); }
.fi-ft h3 { font:600 11px/1 var(--mono); letter-spacing:.12em; text-transform:uppercase; color:#E5A3AE; margin:0 0 15px; }
.fi-ft ul { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:2px; }
.fi-ft ul button { background:none; border:0; padding:7px 0; color:#D5C9BE; font-size:14px; text-align:left; min-height:38px; }
.fi-ft ul button:hover { color:#fff; text-decoration:underline; }
.fi-ft-about p { font-size:14px; color:#C4B7AC; margin:14px 0 0; max-width:38ch; }
.fi-ft-bot { padding-top:22px; display:flex; gap:16px; flex-wrap:wrap; align-items:center; font-size:12.5px; color:#A2948A; }
.fi-ft-bot .fi-devlog { margin-left:auto; background:none; border:1px solid rgba(255,255,255,.2); color:#A2948A; padding:7px 12px; border-radius:var(--r); font:500 11px var(--mono); min-height:36px; }
.fi-log { margin-top:16px; background:rgba(0,0,0,.24); border:1px solid rgba(255,255,255,.13); border-radius:var(--r); padding:14px; font:400 11.5px/1.7 var(--mono); color:#B5A79C; max-height:220px; overflow:auto; }
.fi-log b { color:#EFB9C2; font-weight:500; }

/* --- misc pages --- */
.fi-page-hd { padding:40px 0 30px; border-bottom:1px solid var(--line); }
.fi-page-hd h1 { font:700 40px/1.12 var(--serif); letter-spacing:-.028em; color:var(--navy); margin:12px 0 12px; }
.fi-page-hd p { font-size:17px; color:var(--muted); max-width:62ch; margin:0; }
.fi-prose { max-width:70ch; font-size:16.5px; line-height:1.72; color:var(--ink-2); padding:36px 0; }
.fi-prose h2 { font:600 23px/1.3 var(--serif); color:var(--navy); margin:34px 0 12px; }
.fi-prose ul { padding-left:22px; } .fi-prose li { margin-bottom:8px; }
.fi-empty { text-align:center; padding:70px 20px; }
.fi-empty h2 { font:600 26px/1.25 var(--serif); color:var(--navy); margin:0 0 10px; }
.fi-empty p { color:var(--muted); margin:0 0 22px; }

/* --- responsive --- */
@media (max-width:1000px) {
  .fi-lead { grid-template-columns:1fr; }
  .fi-lead-main { padding:28px 0 30px; border-right:0; border-bottom:1px solid var(--line); }
  .fi-lead-side { padding:28px 0 30px; }
  .fi-side { border-left:0; padding-left:0; border-top:1px solid var(--line); padding-top:22px; }
  .fi-art, .fi-2col { grid-template-columns:1fr; gap:34px; }
  .fi-sticky { position:static; }
  .fi-g4 { grid-template-columns:repeat(2,1fr); }
  .fi-mkt-grid { grid-template-columns:repeat(2,1fr); }
  .fi-dossier { grid-template-columns:1fr; }
  .fi-dossier-i { min-height:190px; }
  .fi-nl { grid-template-columns:1fr; gap:26px; padding:30px; }
  .fi-tag { display:none; }
}
@media (max-width:760px) {
  .fi-nav { display:none; }
  .fi-burger { display:grid; }
  .fi-g3, .fi-g4 { grid-template-columns:1fr; }
  .fi-mkt-grid { grid-template-columns:repeat(2,1fr); }
  .fi-mkt-card { padding:14px 13px 13px; min-height:104px; }
  .fi-mkt-v { font-size:21px; }
  .fi-mkt-s { display:none; }
  .fi-calcband-hd { padding:22px 18px 18px; }
  .fi-calcband-hd h2 { font-size:22px; }
  .fi-chart { padding:16px 15px; margin:20px 0 24px; }
  .fi-bar-row { grid-template-columns:1fr; gap:6px; padding:10px 0; }
  .fi-bar-track { height:30px; }
  .fi-bar-fill { height:30px; }
  .fi-stat-v { font-size:25px; }
  .fi-grid { gap:22px; }
  .fi-lead-t { font-size:31px; max-width:none; }
  .fi-lead-s { font-size:17px; }
  .fi-lead-stat { flex-direction:column; gap:12px; padding:18px 16px; }
  .fi-lead-stat-v { font-size:42px; }
  .fi-art h1, .fi-page-hd h1, .fi-mk-hero h1 { font-size:29px; }
  .fi-h2, .fi-ledger-hd h2, .fi-nl h2 { font-size:22px; }
  .fi-dossier-b h3 { font-size:24px; }
  .fi-dossier-b, .fi-mk-hero { padding:26px 20px; }
  .fi-mk-hero { padding:36px 0; }
  .fi-calc-b { grid-template-columns:1fr; }
  .fi-calc-out { border-radius:0 0 var(--r) var(--r); }
  .fi-ledger-hd { padding:22px 18px 18px; }
  .fi-le { grid-template-columns:1fr; }
  .fi-le-n { padding:20px 18px 0; }
  .fi-le-b { padding:6px 18px 22px; }
  .fi-le-what { font-size:18px; }
  .fi-form { grid-template-columns:1fr; }
  .fi-ft-g { grid-template-columns:1fr 1fr; gap:26px; }
  .fi-body { font-size:17px; }
  .fi-sec { padding:34px 0; }
  .fi-side-i { grid-template-columns:1fr 76px; }
  .fi-side-th { width:76px; height:58px; }
}
@media (prefers-reduced-motion:reduce) {
  .fi *, .fi *::before, .fi *::after { animation:none !important; transition:none !important; }
}
`;

/* ------------------------------------------------------- 2. ÖLÇÜMLEME KATMANI */

const eventBus = { list: [], subs: [] };

/**
 * Tek ölçümleme girişi. GA4 / GTM'e window.dataLayer üzerinden aktarılır.
 * Hassas finansal girdi (tutar, maaş, borç) ASLA parametre olarak gönderilmez;
 * yalnızca aracın kullanıldığı bilgisi taşınır.
 */
function track(event, params = {}) {
  const payload = { event, ...params, ts: new Date().toISOString() };
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  }
  eventBus.list = [payload, ...eventBus.list].slice(0, 60);
  eventBus.subs.forEach((fn) => fn(eventBus.list));
}

function useEventLog() {
  const [list, setList] = useState(eventBus.list);
  useEffect(() => {
    eventBus.subs.push(setList);
    return () => { eventBus.subs = eventBus.subs.filter((f) => f !== setList); };
  }, []);
  return list;
}

/* --------------------------------------------------------------- 3. SEO KATMANI */

const SITE = { name: "FinansIndex", url: "https://finansindex.com", promise: "Paranı anlamanın daha kolay yolu." };

function useSeo({ title, description, path, jsonLd }) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = title;
    const set = (sel, attrs) => {
      let el = document.head.querySelector(sel);
      if (!el) {
        el = document.createElement(sel.startsWith("link") ? "link" : "meta");
        document.head.appendChild(el);
      }
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    };
    set('meta[name="description"]', { name: "description", content: description });
    set('link[rel="canonical"]', { rel: "canonical", href: SITE.url + path });
    set('meta[property="og:title"]', { property: "og:title", content: title });
    set('meta[property="og:description"]', { property: "og:description", content: description });
    set('meta[property="og:url"]', { property: "og:url", content: SITE.url + path });
    set('meta[property="og:type"]', { property: "og:type", content: jsonLd ? "article" : "website" });
    set('meta[property="og:site_name"]', { property: "og:site_name", content: SITE.name });
    set('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });

    let s = document.getElementById("fi-jsonld");
    if (!s) { s = document.createElement("script"); s.id = "fi-jsonld"; s.type = "application/ld+json"; document.head.appendChild(s); }
    s.textContent = JSON.stringify(jsonLd || {
      "@context": "https://schema.org", "@type": "Organization",
      name: SITE.name, url: SITE.url, slogan: SITE.promise,
    });
  }, [title, description, path, jsonLd]);
}

/* ------------------------------------------------------- 4. PİYASA VERİ KAYNAĞI */

/**
 * Şu an statik demo verisi döner. Gerçek entegrasyonda yalnızca bu fonksiyonun
 * gövdesi değiştirilir (örn. lisanslı sağlayıcı endpoint'i) ve `isDemo:false`
 * döndürülür — UI tarafında hiçbir değişiklik gerekmez.
 */
const MARKET_SOURCE = {
  endpoint: "/api/piyasa",
  async fetch() {
    const res = await window.fetch(this.endpoint, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Piyasa verisi alınamadı");
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Kaynak yanıt vermedi");
    return data;
  },
};

/* Piyasa verisi durumu: yükleniyor / hazır / hata.
   Hata durumunda sahte veri gösterilmez, açıkça bildirilir. */
function useMarket() {
  const [state, setState] = useState({ status: "loading", items: [], updatedAt: null, source: null, tcmbDate: null });

  const load = useCallback(async () => {
    try {
      const d = await MARKET_SOURCE.fetch();
      setState({ status: "ready", items: d.items, updatedAt: d.updatedAt, source: d.source, tcmbDate: d.tcmbDate });
    } catch (e) {
      setState({ status: "error", items: [], updatedAt: null, source: null, tcmbDate: null });
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 120000); // 2 dakikada bir tazele
    return () => clearInterval(id);
  }, [load]);

  return state;
}

/* ------------------------------------------------------- 5. REKLAM ENVANTERİ */

/**
 * placementId → kreatif. Değer null ise AdSlot hiçbir şey render etmez,
 * sayfada yer kaplamaz. Kreatifler ileride ad server / doğrudan satış
 * yönetim panelinden beslenir.
 */
const AD_INVENTORY = {
  home_top_banner: null,
  home_native_01: {
    type: "native",
    sponsor: "Örnek Banka",
    title: "Maaş müşterisi olanlara özel ihtiyaç kredisi koşulları",
    excerpt: "Başvuru öncesi toplam geri ödemeyi hesaplayın; koşullar başvuru anında bankaca belirlenir.",
    cta: "Koşulları incele",
  },
  desktop_sidebar_sticky: {
    type: "display",
    sponsor: "Örnek Sigorta",
    title: "Trafik sigortası yenileme dönemi yaklaşanlar için hatırlatma",
    cta: "Teklif al",
  },
  article_inline_01: null,
  article_end: null,
  calculator_sponsor: {
    type: "tool",
    sponsor: "Örnek Yatırım",
    title: "Bu hesaplama aracı Örnek Yatırım katkılarıyla sunulmaktadır.",
  },
  category_sponsor: null,
  newsletter_sponsor: null,
};

/* ------------------------------------------------------------ 6. TAKSONOMİ */

const CATEGORIES = [
  { slug: "gundem", name: "Gündem", desc: "Türkiye ve dünyadan, finansal hayatınızı etkileyebilecek gelişmeler." },
  { slug: "parami-yonetiyorum", name: "Paramı Yönetiyorum", desc: "Bütçe, tasarruf, borç kapatma, kredi kartı ve harcama yönetimi." },
  { slug: "kredi-ve-mevduat", name: "Kredi ve Mevduat", desc: "Kredi türleri, faiz mantığı, mevduat seçenekleri ve karşılaştırmalar." },
  { slug: "yatirim", name: "Yatırım", desc: "Altın, döviz, fon ve borsa araçlarını başlangıç seviyesinde anlatan içerikler." },
  { slug: "sigorta-ve-emeklilik", name: "Sigorta ve Emeklilik", desc: "BES, sağlık, araç, konut ve diğer sigorta ürünleri." },
  { slug: "ekonomiyi-anla", name: "Ekonomiyi Anla", desc: "Enflasyon, faiz, kur ve vergi politikalarının günlük hayata etkisi." },
  { slug: "is-ve-girisim", name: "İş ve Girişim", desc: "KOBİ finansmanı, e-ticaret, girişimcilik ve yeni iş modelleri." },
  { slug: "finansindex-dosya", name: "FinansIndex Dosya", desc: "Bir konuyu tüm yönleriyle ele alan özel araştırma ve dosyalar." },
];
const catName = (s) => CATEGORIES.find((c) => c.slug === s)?.name || s;

const AUTHORS = {
  "burcu-berk-arslan": {
    name: "Burcu Berk Arslan",
    role: "Kurucu ve editör",
    bio: "FinansIndex'in kurucusu. İçerikleri resmî kaynaklarla karşılaştırarak doğruluyor ve yayına alıyor. Finansal danışmanlık yetkisi bulunmuyor.",
  },
};

/* Yapay zekâ kullanım beyanı — her içerikte gösterilir.
   Bu metin editoryal ilkeler sayfasındaki açıklamayla tutarlı olmalıdır. */
const AI_NOTE = {
  short: "Yapay zekâ destekli",
  full: "Bu içeriğin taslağı, aşağıda listelenen resmî kaynakların ham metinleri temel alınarak yapay zekâ desteğiyle hazırlanmıştır. Metindeki tüm oran, tarih ve tutarlar kaynak belgelerle karşılaştırılarak editör tarafından doğrulanmış ve yayına bu şekilde alınmıştır. FinansIndex finansal danışmanlık hizmeti vermez.",
};

/* --------------------------------------------------------- 7. İÇERİK VERİSİ */
/* Veri modeli finansindex-mimari.md dosyasındaki şema ile birebir uyumludur. */

const P = (t) => ({ type: "p", t });
const H = (t) => ({ type: "h2", t, id: t.toLowerCase().replace(/[^a-zçğıöşü0-9]+/g, "-").replace(/^-|-$/g, "") });

const ARTICLES = [
  {
    id: "a1", slug: "politika-faizi-mevduat-getirisi-iliskisi",
    title: "Politika faizi değiştiğinde mevduat getiriniz neden hemen değişmez?",
    summary: "Merkez Bankası'nın faiz kararı ile hesabınıza yansıyan mevduat faizi arasında birkaç aşamalı bir aktarım mekanizması var. Bu yazıda o mekanizmayı ve vade planlamanıza etkisini adım adım anlatıyoruz.",
    category: "ekonomiyi-anla", contentType: "Analiz", author: "burcu-berk-arslan",
    published_at: "2026-08-06T09:15:00+03:00", updated_at: "2026-08-06T14:40:00+03:00",
    read: 7, risk_level: "orta", review_status: "yayimlandi", reviewed_by: "burcu-berk-arslan",
    sponsored: false, disclaimer: "invest", related_tool: "mevduat",
    tags: ["faiz", "mevduat", "para politikası"],
    source_name: "TCMB", source_urls: ["TCMB — Para Politikası Kurulu karar metinleri", "TCMB — Ağırlıklı ortalama mevduat faiz oranları istatistikleri", "BDDK — Aylık bankacılık sektörü verileri"],
    seo_title: "Politika faizi mevduat faizini nasıl etkiler? | FinansIndex",
    meta_description: "Politika faizi ile mevduat faizi arasındaki aktarım mekanizması, gecikme süresi ve vade planlamanıza etkisi sade bir dille.",
    body: [
      P("Para politikası kararları duyurulduğunda ilk akla gelen soru genellikle şu oluyor: “Mevduat faizim yarın değişecek mi?” Kısa cevap: çoğu zaman hayır. Politika faizi, bankaların Merkez Bankası ile yaptığı işlemlerin fiyatıdır. Sizin hesabınıza yazılan faiz ise bankanın kendi fonlama maliyeti, likidite ihtiyacı ve rekabet koşullarıyla belirlenir."),
      H("Aktarım zinciri nasıl işliyor?"),
      P("Politika faizinden mevduat faizine giden yol üç durakta ilerler. İlk durak bankalar arası para piyasasıdır; buradaki gecelik faizler karara genellikle aynı gün tepki verir. İkinci durak bankaların fonlama maliyetidir. Üçüncü durak ise mevduat ve kredi fiyatlamasıdır ve buraya ulaşması haftalar alabilir."),
      P("Bu gecikmenin nedeni teknik değil, ticari. Bankanın elinde belirli bir vadeye kadar sabitlenmiş mevduat stoğu vardır. Yeni fiyatlama yalnızca yeni açılan ve vadesi yenilenen hesaplara uygulanır. Yani sizin mevcut vadeli hesabınız, vade sonuna kadar sözleşmedeki oranla işlemeye devam eder."),
      H("Vade planlamanız için bu ne anlama geliyor?"),
      P("Faizlerin yönü hakkında kesin bir öngörüde bulunmak mümkün değil, ancak vade yapısı üzerinde kontrolünüz var. Kısa vade esneklik sağlar; oranlar yükselirse hızlı uyum sağlarsınız, düşerse aynı hızla getiriniz azalır. Uzun vade ise mevcut oranı kilitler."),
      { type: "quote", t: "Vade kararı bir tahmin değil, bir risk tercihidir: neyi kaçırmayı göze aldığınızı belirler." },
      H("Örnek bir karşılaştırma"),
      { type: "note", t: "Aşağıdaki tablo yalnızca mekanizmayı göstermek için hazırlanmış örnek bir hesaplamadır. Gerçek oranlar bankadan bankaya ve döneme göre değişir." },
      { type: "table", head: ["Senaryo", "Vade", "Yenileme sayısı", "Ana risk"],
        rows: [["Kısa vade tercih", "32 gün", "Yılda ~11", "Yenilemede oran düşerse getiri azalır"], ["Orta vade tercih", "3 ay", "Yılda 4", "Dengeli"], ["Uzun vade tercih", "12 ay", "Yılda 1", "Oranlar yükselirse fırsat kaybı"]] },
      H("Ne yapabilirsiniz?"),
      { type: "ul", items: [
        "Birikiminizi tek vadede toplamak yerine farklı vadelere bölerek yenileme tarihlerinizi dağıtın.",
        "Hesap açmadan önce brüt değil net getiriyi hesaplayın; stopaj oranı vade ve ürün türüne göre değişebilir.",
        "Bankanızın kampanya oranının hangi tutar ve vade aralığında geçerli olduğunu sözleşmede kontrol edin.",
      ] },
      P("Faiz kararlarını izlemek faydalıdır, ancak bütçenizi asıl etkileyen şey kararın kendisi değil; sizin vade, tutar ve ürün tercihlerinizdir."),
    ],
    keyStat: { v: "3", unit: "durak", k: "Politika faizinin mevduat faizine ulaşması için geçtiği aşama sayısı", sub: "Aktarım haftalar sürebilir" },
    impact: {
      lead: "Politika faizindeki değişiklik, vadeli hesabınıza genellikle vade yenileme tarihinizde yansır.",
      points: [
        "Mevcut vadeli hesabınızın oranı vade sonuna kadar değişmez.",
        "Yeni hesap açacaksanız, farklı bankaların güncel oranlarını aynı vade üzerinden karşılaştırın.",
        "Net getiriyi hesaplarken stopajı mutlaka dahil edin.",
      ],
    },
  },
  {
    id: "a2", slug: "kredi-karti-asgari-odeme-nasil-hesaplanir",
    title: "Kredi kartı asgari ödeme tutarı nasıl hesaplanır ve neden bir çözüm değildir?",
    summary: "Asgari ödeme, borcu kapatmanın değil ertelemenin yoludur. Hesaplama mantığını, kalan borca işleyen faizin nasıl büyüdüğünü ve çıkış planını örnek bir hesaplama üzerinden gösteriyoruz.",
    category: "parami-yonetiyorum", contentType: "Rehber", author: "burcu-berk-arslan",
    published_at: "2026-08-05T08:00:00+03:00", updated_at: "2026-08-05T08:00:00+03:00",
    read: 6, risk_level: "orta", review_status: "yayimlandi", reviewed_by: "burcu-berk-arslan",
    sponsored: false, disclaimer: "general", related_tool: "asgari",
    tags: ["kredi kartı", "borç", "bütçe"],
    source_name: "BDDK / Resmî Gazete",
    source_urls: ["BDDK — Banka Kartları ve Kredi Kartları Hakkında Yönetmelik", "Resmî Gazete — İlgili yönetmelik değişiklikleri", "TCMB — Kredi kartı işlemlerinde uygulanacak azami faiz oranları duyuruları"],
    seo_title: "Kredi kartı asgari ödeme tutarı nasıl hesaplanır? | FinansIndex",
    meta_description: "Kredi kartı asgari ödeme oranı, hesaplama yöntemi ve yalnızca asgariyi ödemenin uzun vadeli maliyeti örnek hesaplamayla anlatılıyor.",
    body: [
      P("Ekstre geldiğinde iki rakam görürsünüz: dönem borcu ve asgari ödeme tutarı. İkincisi, o ay kartınızın kapanmaması ve gecikme durumuna düşmemeniz için ödemeniz gereken en düşük tutardır. Ancak bu tutar bir hedef değil, bir alt sınırdır."),
      H("Hesaplama nasıl yapılıyor?"),
      P("Asgari ödeme tutarı, dönem borcunun yönetmelikle belirlenen bir oranıyla hesaplanır. Bu oran kartın limitine göre farklılaşır; limit eşiği ve oranlar mevzuat değişiklikleriyle güncellenebildiği için, güncel oranı bankanızın ekstresinden ya da resmî düzenlemeden teyit etmeniz gerekir."),
      P("Formül basittir: **Asgari ödeme = Dönem borcu × asgari ödeme oranı.** Taksitli işlemlerin o aya düşen taksitleri ve gecikmiş tutarlar varsa bunlar asgari tutara tam olarak eklenir."),
      H("Asgariyi ödediğinizde ne oluyor?"),
      P("Ödenmeyen kısım bir sonraki döneme devreder ve bu tutara akdi faiz işler. Faiz oranları kredi kartlarında konut veya ihtiyaç kredilerine kıyasla yüksektir. Sonuç: her ay asgariyi ödeseniz bile anapara çok yavaş azalır, hatta yeni harcama yapıyorsanız hiç azalmaz."),
      { type: "note", t: "Aşağıdaki örnek hesaplama, mekanizmayı göstermek amacıyla varsayımsal bir faiz oranıyla kurgulanmıştır. Gerçek rakamlar için kendi ekstre oranınızı kullanın." },
      { type: "chart", title: "25.000 TL borç, aylık %4 faiz: ödeme stratejisine göre kapanma süresi",
        unit: " ay", dec: 0, highlight: 0,
        rows: [
          { k: "Tamamı", v: 1 },
          { k: "Asgari + 2.000 TL", v: 8 },
          { k: "Asgari + 1.000 TL", v: 13 },
          { k: "Yalnızca asgari", v: 47 },
        ],
        caption: "Örnek hesaplama. Yeni harcama yapılmadığı ve faiz oranının sabit kaldığı varsayılmıştır. Kendi rakamlarınız için aşağıdaki hesaplama aracını kullanın." },
      H("Borçtan çıkış planı"),
      { type: "ul", items: [
        "Kartı harcamaya kapatın; borç azalırken yeni harcama eklemek planı sıfırlar.",
        "Ödeyebileceğiniz sabit bir aylık tutar belirleyin ve borç bitene kadar bu tutarı düşürmeyin.",
        "Birden fazla kart varsa önce faiz oranı en yüksek olandan başlayın.",
        "Bankanızın yapılandırma veya borç transferi seçeneklerini, toplam geri ödeme tutarını karşılaştırarak değerlendirin.",
      ] },
      P("Asgari ödeme, nakit akışınızın daraldığı bir ayda size zaman kazandırır. Kalıcı bir çözüm hâline geldiğinde ise maliyeti en yüksek borçlanma biçimlerinden birine dönüşür."),
    ],
    hook: "Sadece asgari ödeyen 25.000 TL borcu 47 ayda kapatır",
    impact: {
      lead: "Yalnızca asgariyi ödemek, borcunuzu kapatmaz; ödeme takviminizi uzatır ve toplam faiz yükünü artırır.",
      points: [
        "Ekstrenizdeki akdi faiz oranını bulun ve kalan borcunuzla çarparak aylık faiz yükünü görün.",
        "Asgari tutarın üzerine ekleyebileceğiniz en küçük sabit tutarı bile belirleyin; süreyi kısaltır.",
        "Borç kapanana kadar aynı kartla yeni harcama yapmaktan kaçının.",
      ],
    },
  },
  {
    id: "a3", slug: "borc-kapatma-hangi-krediden-baslanmali",
    title: "Birden fazla borcunuz varsa hangisinden başlamalısınız?",
    summary: "Çığ yöntemi mi, kartopu yöntemi mi? İkisinin matematiğini ve davranışsal farkını karşılaştırıyor, kendi durumunuza uygun olanı seçmeniz için basit bir karar çerçevesi sunuyoruz.",
    category: "parami-yonetiyorum", contentType: "Rehber", author: "burcu-berk-arslan",
    published_at: "2026-08-04T10:30:00+03:00", updated_at: "2026-08-04T10:30:00+03:00",
    read: 5, risk_level: "orta", review_status: "yayimlandi", reviewed_by: "burcu-berk-arslan",
    sponsored: false, disclaimer: "general", related_tool: "kredi",
    tags: ["borç", "kredi", "bütçe"],
    source_name: "FinansIndex editoryal",
    source_urls: ["TCMB — Tüketici kredileri faiz oranları istatistikleri", "BDDK — Tüketici kredileri ve bireysel kredi kartları verileri"],
    seo_title: "Borç kapatırken hangi krediden başlanmalı? | FinansIndex",
    meta_description: "Çığ ve kartopu yöntemlerinin karşılaştırması, hangi durumda hangisinin işe yaradığı ve borç kapatma planı kurma adımları.",
    body: [
      P("Elinizde birden fazla borç varken her birine aynı anda fazladan ödeme yapmak, hiçbirini hızlandırmaz. Etkili yöntem, ekstra ödeme gücünüzü tek bir borca yığmaktır. Soru şu: hangisine?"),
      H("Çığ yöntemi: önce en pahalı borç"),
      P("Tüm borçların asgari ödemelerini yapar, artan tutarı **faiz oranı en yüksek** borca yönlendirirsiniz. O borç bittiğinde aynı tutarı sıradaki en yüksek faizli borca aktarırsınız. Matematiksel olarak toplam faiz maliyetini en aza indiren yöntem budur."),
      H("Kartopu yöntemi: önce en küçük bakiye"),
      P("Bu kez ekstra ödeme, faiz oranına bakılmaksızın **bakiyesi en küçük** borca gider. Toplam maliyet çığ yöntemine göre biraz daha yüksek olur, ancak ilk borcun kapanması kısa sürede gerçekleşir ve planı sürdürme motivasyonunu güçlendirir."),
      { type: "table", head: ["Kriter", "Çığ yöntemi", "Kartopu yöntemi"],
        rows: [["Toplam faiz maliyeti", "Daha düşük", "Biraz daha yüksek"], ["İlk sonuç görme süresi", "Uzun olabilir", "Kısa"], ["Uygun olduğu durum", "Faiz farkları belirgin", "Motivasyon sorunu yaşanıyor"]] },
      H("Karar çerçevesi"),
      { type: "ul", items: [
        "Borçlar arasındaki faiz farkı büyükse (örneğin kredi kartı ile taşıt kredisi arasında) çığ yöntemi belirgin avantaj sağlar.",
        "Faiz oranları birbirine yakınsa fark küçülür; bu durumda kartopu yöntemi psikolojik olarak daha sürdürülebilir olabilir.",
        "Hangi yöntemi seçerseniz seçin, ekstra ödeme tutarını sabitleyin ve bir borç kapandığında o tutarı harcamaya değil sıradaki borca aktarın.",
      ] },
      P("Yöntemin adı önemli değil; planın uygulanabilir olması önemli. En iyi plan, altı ay sonra hâlâ uyguluyor olduğunuz plandır."),
    ],
    impact: {
      lead: "Ekstra ödeme gücünüzü tek borca yoğunlaştırmak, hepsine bölüştürmekten hızlı sonuç verir.",
      points: [
        "Tüm borçlarınızı bakiye ve faiz oranıyla birlikte tek listeye yazın.",
        "Aylık bütçenizden ayırabileceğiniz sabit ekstra tutarı belirleyin.",
        "Bir borç kapandığında o ödemeyi bütçeye geri almayın, sıradaki borca aktarın.",
      ],
    },
  },
  {
    id: "a4", slug: "enflasyon-birikim-satin-alma-gucu",
    title: "Enflasyon birikimlerinizin satın alma gücünü nasıl aşındırır?",
    summary: "Nominal getiri ile reel getiri arasındaki fark, birikim kararlarının en çok gözden kaçan kısmı. Bu farkı hesaplamanın yolunu ve bütçeye yansımasını anlatıyoruz.",
    category: "ekonomiyi-anla", contentType: "Rehber", author: "burcu-berk-arslan",
    published_at: "2026-08-03T11:00:00+03:00", updated_at: "2026-08-03T11:00:00+03:00",
    read: 6, risk_level: "orta", review_status: "yayimlandi", reviewed_by: "burcu-berk-arslan",
    sponsored: false, disclaimer: "invest", related_tool: "enflasyon",
    tags: ["enflasyon", "birikim", "reel getiri"],
    source_name: "TÜİK",
    source_urls: ["TÜİK — Tüketici Fiyat Endeksi bülteni", "TCMB — Enflasyon Raporu"],
    seo_title: "Enflasyon birikimleri nasıl etkiler? Reel getiri hesabı | FinansIndex",
    meta_description: "Nominal getiri ile reel getiri farkı, satın alma gücü kaybının hesaplanması ve birikim planlamasında dikkat edilmesi gerekenler.",
    body: [
      P("Bir birikimin “kazandırdığı” tutar ile “alabildiği” mal ve hizmet miktarı iki farklı şeydir. Nominal getiri hesabınızdaki rakamın ne kadar büyüdüğünü söyler. Reel getiri ise o rakamın alım gücünün artıp artmadığını söyler."),
      H("Reel getiri nasıl hesaplanır?"),
      P("Basit çıkarma işlemi (getiri eksi enflasyon) yaklaşık bir sonuç verir, ancak oranlar yükseldikçe sapma büyür. Doğru hesap şudur: **Reel getiri = ((1 + nominal getiri) ÷ (1 + enflasyon)) − 1.** Sonuç negatifse, paranız büyümüş ama satın alma gücünüz azalmış demektir."),
      { type: "note", t: "Aşağıdaki değerler örnek hesaplamadır; güncel enflasyon verisi için TÜİK bültenlerini esas alın." },
      { type: "chart", title: "Enflasyon %30 iken, farklı getiri oranlarında reel sonuç",
        unit: "%", dec: 1, highlight: 1,
        rows: [
          { k: "Getiri %40", v: 7.7 },
          { k: "Getiri %30", v: 0.01, dec: 0 },
          { k: "Getiri %20", v: -7.7 },
        ],
        caption: "Örnek hesaplama. Sıfır çizgisinin altındaki değer, paranın büyümesine rağmen alım gücünün azaldığı anlamına gelir." },
      H("Bütçeye yansıması"),
      P("Reel getirinin negatif olduğu dönemlerde birikimi tamamen nakitte tutmak, sessiz bir maliyet yaratır. Öte yandan reel getiri arayışı, riski göz ardı etmek anlamına gelmez. Farklı araçların vergi, likidite ve dalgalanma özellikleri birbirinden ayrışır."),
      H("Pratik adımlar"),
      { type: "ul", items: [
        "Birikiminizi tek bir getiri rakamına göre değil, vade ve amaç bazında planlayın.",
        "Acil durum fonunuzu getiri hedefiyle değil, hızlı erişim hedefiyle konumlandırın.",
        "Getiri karşılaştırmalarında vergi ve masraf sonrası net rakamı kullanın.",
      ] },
      P("Enflasyon, bütçenin görünmeyen kalemidir. Hesaba katılmadığı sürece, kâğıt üzerinde kazanırken pratikte kaybetmek mümkündür."),
    ],
    hook: "%30 getiri, %30 enflasyonda sıfır kazanç demek",
    impact: {
      lead: "Nominal getiriniz enflasyonun altında kaldığında, birikiminizin alım gücü azalır.",
      points: [
        "Getirinizi enflasyona bölerek reel sonucu hesaplayın.",
        "Kısa vadeli ihtiyaçlar için likiditeyi, uzun vadeli hedefler için reel getiriyi önceliklendirin.",
        "Vergi ve masrafları düştükten sonraki net rakamla karşılaştırma yapın.",
      ],
    },
  },
  {
    id: "a5", slug: "kira-artis-orani-nasil-hesaplanir",
    title: "Kira artış oranı nasıl hesaplanır? Kiracı ve ev sahibi için sade rehber",
    summary: "Yasal üst sınır, hangi endeksin kullanıldığı, hesaplamanın hangi tarihe göre yapıldığı ve anlaşmazlık durumunda izlenecek yol.",
    category: "parami-yonetiyorum", contentType: "Rehber", author: "burcu-berk-arslan",
    published_at: "2026-08-02T09:00:00+03:00", updated_at: "2026-08-02T09:00:00+03:00",
    read: 5, risk_level: "yuksek", review_status: "yayimlandi", reviewed_by: "burcu-berk-arslan",
    sponsored: false, disclaimer: "legal", related_tool: "kira",
    tags: ["kira", "enflasyon", "konut"],
    source_name: "TÜİK / Resmî Gazete",
    source_urls: ["TÜİK — Tüketici Fiyat Endeksi, on iki aylık ortalamalara göre değişim oranları", "Türk Borçlar Kanunu — Kira bedelinin belirlenmesine ilişkin hükümler"],
    seo_title: "Kira artış oranı nasıl hesaplanır? | FinansIndex",
    meta_description: "Kira artışında kullanılan endeks, hesaplama yöntemi, yasal sınır ve anlaşmazlık durumunda izlenecek adımlar.",
    body: [
      P("Kira yenileme dönemi yaklaştığında iki taraf da aynı soruyu sorar: artış ne kadar olabilir? Cevap büyük ölçüde sözleşme tarihine ve ilgili dönemin endeks verisine bağlıdır."),
      H("Hangi oran esas alınıyor?"),
      P("Konut kiralarında artış, kural olarak **tüketici fiyat endeksinin on iki aylık ortalamalara göre değişim oranı** ile sınırlıdır. Bu, aylık enflasyon ya da yıllık enflasyon rakamından farklı bir seridir ve TÜİK tarafından her ay yayımlanır. Sözleşmede bu oranın üzerinde bir artış yazsa bile, sınırı aşan kısım uygulanamaz."),
      H("Hesaplama"),
      P("Formül basittir: **Yeni kira = Mevcut kira × (1 + artış oranı).** Kritik nokta, hangi ayın verisinin kullanılacağıdır. Genel uygulamada, kira döneminin yenilendiği ayda yayımlanmış olan en güncel on iki aylık ortalama oranı esas alınır."),
      { type: "note", t: "Hesaplama aracımızda oranı siz giriyorsunuz; böylece kendi yenileme ayınıza ait TÜİK verisini kullanabilirsiniz." },
      H("Anlaşmazlık durumunda"),
      { type: "ul", items: [
        "Önce yazılı bildirim yoluyla hesaplamanızı ve dayandığınız veriyi paylaşın.",
        "Ödemeleri düzenli sürdürün; ödememe, ayrı bir hukuki sorun doğurabilir.",
        "Uzlaşma sağlanamazsa arabuluculuk ve dava yolu gündeme gelir; süreç ve süreler için hukuki destek almak gerekir.",
      ] },
      P("Kira artışı, iki tarafın da aynı veriye baktığında büyük ölçüde tartışmasız hâle gelen bir konudur. Anlaşmazlıkların çoğu farklı endeks serilerinin karıştırılmasından doğar."),
    ],
    hook: "Yıllık enflasyon değil, 12 aylık ortalama TÜFE esas alınır",
    impact: {
      lead: "Yenileme ayınızda geçerli olan on iki aylık ortalama TÜFE oranı, artışın üst sınırını belirler.",
      points: [
        "Yenileme ayınıza ait TÜİK verisini not edin; başka bir enflasyon serisini kullanmayın.",
        "Yeni kirayı hesaplayıp yazılı olarak paylaşın.",
        "Sözleşmenizde farklı bir madde varsa, yasal sınırın üzerindeki kısmın uygulanamayacağını bilin.",
      ],
    },
  },
  {
    id: "a6", slug: "yatirim-fonu-baslangic-rehberi",
    title: "Yeni başlayanlar için yatırım fonu: ne olduğu, nasıl fiyatlandığı ve nelere bakılacağı",
    summary: "Fon nedir, pay fiyatı nasıl oluşur, toplam gider oranı neden önemlidir? Ürün önerisi yapmadan, karar vermeden önce bakılması gereken başlıkları listeliyoruz.",
    category: "yatirim", contentType: "Rehber", author: "burcu-berk-arslan",
    published_at: "2026-08-01T12:00:00+03:00", updated_at: "2026-08-01T12:00:00+03:00",
    read: 8, risk_level: "yuksek", review_status: "yayimlandi", reviewed_by: "burcu-berk-arslan",
    sponsored: false, disclaimer: "invest", related_tool: "enflasyon",
    tags: ["fon", "yatırım", "portföy"],
    source_name: "SPK / KAP",
    source_urls: ["SPK — Yatırım fonlarına ilişkin mevzuat", "KAP — Fon bilgilendirme dokümanları ve içtüzükler", "TEFAS — Fon karşılaştırma platformu"],
    seo_title: "Yatırım fonu nedir? Başlangıç rehberi | FinansIndex",
    meta_description: "Yatırım fonlarının çalışma mantığı, pay fiyatı, gider oranı ve fon seçerken bakılması gereken başlıklar. Yatırım tavsiyesi içermez.",
    body: [
      P("Yatırım fonu, çok sayıda yatırımcının parasını bir havuzda toplayıp profesyonel bir portföy yönetimi şirketi aracılığıyla çeşitli varlıklara yatıran bir yapıdır. Siz fonun tamamının değil, fondaki payların sahibi olursunuz."),
      H("Pay fiyatı nasıl oluşur?"),
      P("Fonun sahip olduğu tüm varlıkların değeri toplanır, yükümlülükleri düşülür ve dolaşımdaki pay sayısına bölünür. Ortaya çıkan rakam pay fiyatıdır. Bu nedenle fon fiyatı bir arz-talep sonucu değil, portföyün değerinin doğrudan yansımasıdır."),
      H("Nelere bakmak gerekir?"),
      { type: "ul", items: [
        "**Fon türü ve portföy dağılımı:** Fonun hangi varlık sınıflarına ne oranda yatırım yaptığı, riskin en belirleyici unsurudur.",
        "**Toplam gider oranı:** Yönetim ücreti ve diğer masrafların yıllık toplamı. Uzun vadede getiriden düşülen bu oran, sonuç üzerinde belirgin etki yaratır.",
        "**Alım-satım kuralları:** Emrin hangi saatte hangi fiyattan gerçekleşeceği ve paranın hesaba kaç iş gününde geçeceği fonun içtüzüğünde yazar.",
        "**Fon bilgilendirme dokümanı:** Risk düzeyi, karşılaştırma ölçütü ve stratejinin yazılı olduğu asıl belgedir.",
      ] },
      { type: "quote", t: "Geçmiş dönem getirisi bir fonun gelecekteki performansının göstergesi değildir." },
      H("Yaygın hatalar"),
      P("En sık karşılaşılan hata, yalnızca geçmiş getiri sıralamasına bakarak seçim yapmaktır. İkinci hata, fonun risk düzeyini kendi vade ihtiyacıyla eşleştirmemektir. Üç ay sonra ihtiyaç duyacağınız parayı dalgalanması yüksek bir fonda tutmak, getiri değil zamanlama riski yaratır."),
      P("Fon seçimi kişisel risk toleransı, vade ve vergi durumu ile birlikte değerlendirilmesi gereken bir karardır. Bu içerik genel bilgilendirme amaçlıdır."),
    ],
    impact: {
      lead: "Fon seçiminde getiri sıralaması değil, gider oranı ve risk-vade uyumu belirleyicidir.",
      points: [
        "İlgilendiğiniz fonun bilgilendirme dokümanını ve toplam gider oranını okuyun.",
        "Paraya ne zaman ihtiyaç duyacağınızı belirleyip fonun risk düzeyiyle eşleştirin.",
        "Alım-satım saatlerini ve valör süresini önceden öğrenin.",
      ],
    },
  },
  {
    id: "a7", slug: "bes-devlet-katkisi-nasil-calisir",
    title: "BES devlet katkısı nasıl çalışır? Hak kazanma süreleri ve çıkış senaryoları",
    summary: "Katkı payı, devlet katkısı oranı, kademeli hak kazanma takvimi ve sistemden erken ayrılmanın maliyeti. Emeklilik planı kurmadan önce bilinmesi gerekenler.",
    category: "sigorta-ve-emeklilik", contentType: "Rehber", author: "burcu-berk-arslan",
    published_at: "2026-07-31T09:45:00+03:00", updated_at: "2026-07-31T09:45:00+03:00",
    read: 7, risk_level: "yuksek", review_status: "yayimlandi", reviewed_by: "burcu-berk-arslan",
    sponsored: false, disclaimer: "general", related_tool: "mevduat",
    tags: ["BES", "emeklilik", "devlet katkısı"],
    source_name: "SPK / Emeklilik Gözetim Merkezi",
    source_urls: ["Bireysel Emeklilik Tasarruf ve Yatırım Sistemi Kanunu", "Emeklilik Gözetim Merkezi — Sistem istatistikleri ve bilgilendirme sayfaları"],
    seo_title: "BES devlet katkısı nasıl çalışır? | FinansIndex",
    meta_description: "Bireysel emeklilik sisteminde devlet katkısı, hak kazanma süreleri ve sistemden ayrılmanın sonuçları sade bir dille anlatılıyor.",
    body: [
      P("Bireysel emeklilik sisteminin temel mantığı basittir: düzenli olarak katkı payı ödersiniz, bu tutar bir emeklilik yatırım fonunda değerlendirilir ve devlet belirli bir oranda katkı yapar. Sistemin ayırt edici tarafı, katkının doğrudan sizin hesabınıza ayrı bir alt hesapta işlenmesidir."),
      H("Devlet katkısına nasıl hak kazanılır?"),
      P("Devlet katkısı hesaba işlense de tamamına anında sahip olmazsınız. Sistemde kalma süreniz arttıkça katkının size ait olan oranı kademeli olarak yükselir. Belirli bir süreden önce ayrılırsanız katkının bir kısmı ya da tamamı hesabınızdan çıkar."),
      { type: "table", head: ["Durum", "Sonuç"],
        rows: [["Erken ayrılma", "Devlet katkısının tamamına hak kazanılamaz"], ["Kademeli süre tamamlanması", "Katkının belirli bir oranına hak kazanılır"], ["Emekliliğe hak kazanma", "Katkının tamamı ve getirisi hesapta kalır"]] },
      H("Katkı payınızı planlarken"),
      { type: "ul", items: [
        "Ödeme düzenliliği, sistemdeki en belirleyici unsurdur; ara verilen dönemler hem birikimi hem katkıyı etkiler.",
        "Fon dağılımınızı emeklilik tarihinize kalan süreye göre gözden geçirin.",
        "Kesintiler ve fon toplam gider oranları şirketten şirkete farklılaşır; sözleşme öncesi bilgilendirme formunda yer alır.",
      ] },
      P("BES uzun vadeli bir plandır. Kısa vadede paraya ihtiyaç duyma ihtimaliniz varsa, bu ihtiyacı sistemin dışında ayrı bir birikimle karşılamak daha uygun olur."),
    ],
    impact: {
      lead: "Devlet katkısına tam olarak hak kazanmak sistemde kalma süresine bağlıdır.",
      points: [
        "Sözleşmenizin başlangıç tarihini ve hak kazanma takviminizi öğrenin.",
        "Ödemeye ara vermeniz gerekirse, bunun katkı ve birikime etkisini şirketinizden yazılı olarak isteyin.",
        "Kısa vadeli nakit ihtiyacınızı BES dışında planlayın.",
      ],
    },
  },
  {
    id: "a8", slug: "altin-alirken-makas-araligi",
    title: "Altın alırken makas aralığı neden getirinizden önce gelir?",
    summary: "Alış ve satış fiyatı arasındaki fark, kısa vadeli altın işlemlerinde en görünmez maliyet kalemi. Makasın nasıl oluştuğunu ve ürün türüne göre nasıl değiştiğini anlatıyoruz.",
    category: "yatirim", contentType: "Analiz", author: "burcu-berk-arslan",
    published_at: "2026-07-30T13:20:00+03:00", updated_at: "2026-07-30T13:20:00+03:00",
    read: 5, risk_level: "yuksek", review_status: "yayimlandi", reviewed_by: "burcu-berk-arslan",
    sponsored: false, disclaimer: "invest", related_tool: "enflasyon",
    tags: ["altın", "maliyet", "yatırım"],
    source_name: "Borsa İstanbul / Kuyumculuk sektörü",
    source_urls: ["Borsa İstanbul — Kıymetli Madenler Piyasası verileri", "Darphane ve Damga Matbaası — Ürün bilgilendirmeleri"],
    seo_title: "Altında makas aralığı nedir, neden önemlidir? | FinansIndex",
    meta_description: "Altın alım satımında makas aralığının nasıl oluştuğu, ürün türüne göre farkı ve kısa vadeli işlemlerdeki maliyeti.",
    body: [
      P("Altın alırken ödediğiniz fiyat ile aynı anda satsanız alacağınız fiyat aynı değildir. Aradaki farka makas denir ve bu fark, işlemi yaptığınız anda oluşan bir maliyettir. Altının fiyatı hiç değişmese bile, alıp hemen sattığınızda zarar edersiniz."),
      H("Makas neden oluşur?"),
      P("Satıcı tarafında işçilik, saklama, sigorta ve stok riski gibi kalemler vardır. Bunlar alış ve satış kotasyonu arasına yerleşir. Ürün ne kadar işlenmişse makas genellikle o kadar geniş olur; külçe ve gram ürünlerde dar, ziynet ve tasarım ürünlerde belirgin şekilde geniştir."),
      { type: "table", head: ["Ürün tipi", "Makas eğilimi", "Neden"],
        rows: [["Külçe / gram", "Dar", "İşçilik payı düşük"], ["Ziynet (bilezik, kolye)", "Geniş", "İşçilik ve tasarım payı yüksek"], ["Banka altın hesabı", "Değişken", "Kurum kotasyonuna bağlı"]] },
      H("Ne yapmak gerekir?"),
      { type: "ul", items: [
        "Alım öncesi aynı kurumun hem alış hem satış fiyatını not edin; aradaki yüzde farkı işlem maliyetinizdir.",
        "Kısa vadeli alım satım düşünüyorsanız makas, fiyat beklentinizden daha belirleyici olabilir.",
        "Farklı kurumların makas oranlarını aynı ürün üzerinden karşılaştırın.",
      ] },
      P("Altında maliyet yalnızca fiyat değil; makas, saklama biçimi ve ürün tipi de sonucun parçasıdır. Bu içerik genel bilgilendirme amaçlıdır."),
    ],
    impact: {
      lead: "Altını alıp hemen sattığınızda, fiyat değişmese bile makas kadar kayıp oluşur.",
      points: [
        "Alış ve satış kotasyonu arasındaki yüzde farkı hesaplayın.",
        "Ziynet ürünlerde işçilik payının geri dönmediğini göz önünde bulundurun.",
        "Kısa vadeli plan yapıyorsanız makas oranı en dar ürünleri değerlendirin.",
      ],
    },
  },
  {
    id: "a9", slug: "kobi-nakit-akisi-yonetimi",
    title: "KOBİ'ler için nakit akışı yönetimi: kârlı görünüp neden nakit sıkışıklığı yaşanır?",
    summary: "Kâr tablosu ile banka hesabı arasındaki fark, tahsilat ve ödeme vadelerinin uyumsuzluğundan doğar. Nakit döngüsünü ölçmenin ve kısaltmanın yolları.",
    category: "is-ve-girisim", contentType: "Rehber", author: "burcu-berk-arslan",
    published_at: "2026-07-29T08:30:00+03:00", updated_at: "2026-07-29T08:30:00+03:00",
    read: 7, risk_level: "orta", review_status: "yayimlandi", reviewed_by: "burcu-berk-arslan",
    sponsored: false, disclaimer: "general", related_tool: "kredi",
    tags: ["KOBİ", "nakit akışı", "finansman"],
    source_name: "FinansIndex editoryal",
    source_urls: ["KOSGEB — İşletme finansmanı bilgilendirme kaynakları", "TCMB — Ticari krediler faiz oranları istatistikleri"],
    seo_title: "KOBİ nakit akışı yönetimi rehberi | FinansIndex",
    meta_description: "Nakit döngüsü nasıl hesaplanır, tahsilat ve ödeme vadeleri nasıl yönetilir, kârlı işletmeler neden nakit sıkışıklığı yaşar?",
    body: [
      P("Bir işletme kâğıt üzerinde kâr ederken banka hesabında para bulamayabilir. Bunun nedeni genellikle tek bir şeydir: satıştan tahsilat, alımdan ödemeye göre daha geç gerçekleşir."),
      H("Nakit döngüsünü ölçmek"),
      P("Üç süre önemlidir: stokta bekleme süresi, müşteriden tahsilat süresi ve tedarikçiye ödeme süresi. Nakit döngüsü, ilk ikisinin toplamından üçüncüsünün çıkarılmasıyla bulunur. Sonuç ne kadar uzunsa, işletmenin o kadar uzun süre kendi kaynağıyla dönmesi gerekir."),
      { type: "table", head: ["Kalem", "Etkisi", "Müdahale alanı"],
        rows: [["Stok süresi", "Uzadıkça nakit bağlanır", "Sipariş ve stok planlaması"], ["Tahsilat süresi", "Uzadıkça nakit gecikir", "Vade politikası, erken ödeme indirimi"], ["Ödeme süresi", "Uzadıkça nakit rahatlar", "Tedarikçi görüşmeleri"]] },
      H("Uygulanabilir adımlar"),
      { type: "ul", items: [
        "Haftalık nakit takvimi tutun; aylık bakış, sıkışıklığı geç fark ettirir.",
        "Büyük müşterilerde vadeyi kısaltmak yerine kademeli ödeme planı önerin.",
        "Finansman ihtiyacınızı acil hâle gelmeden önce planlayın; acil ihtiyaç, pazarlık gücünü düşürür.",
        "Sabit giderlerinizi ve asgari nakit tamponunuzu yazılı olarak belirleyin.",
      ] },
      P("Nakit akışı yönetimi, büyümeyi yavaşlatmak değil; büyümeyi sürdürülebilir hâle getirmektir."),
    ],
    impact: {
      lead: "Kâr etmek nakit yaratmak anlamına gelmez; belirleyici olan tahsilat ve ödeme vadelerinin farkıdır.",
      points: [
        "Stok, tahsilat ve ödeme sürelerinizi hesaplayıp nakit döngünüzü ölçün.",
        "Önümüzdeki 12 haftanın nakit takvimini çıkarın.",
        "Finansman görüşmelerini nakit ihtiyacı doğmadan önce başlatın.",
      ],
    },
  },
  {
    id: "a11", slug: "tasarruf-finansmani-nasil-calisir",
    title: "Tasarruf finansmanı nasıl çalışır? Sözleşme imzalamadan önce bilmeniz gerekenler",
    summary: "Faizsiz konut ve taşıt finansmanı modeli BDDK denetiminde. Sistemin işleyişini, organizasyon ücretinin toplam maliyete etkisini ve sözleşme öncesi sorulması gereken soruları anlatıyoruz.",
    category: "kredi-ve-mevduat", contentType: "Rehber", author: "burcu-berk-arslan",
    published_at: "2026-08-16T10:00:00+03:00", updated_at: "2026-08-16T10:00:00+03:00",
    read: 9, risk_level: "yuksek", review_status: "yayimlandi", reviewed_by: "burcu-berk-arslan",
    sponsored: false, disclaimer: "legal", related_tool: "karsilastir",
    tags: ["tasarruf finansmanı", "konut", "taşıt", "BDDK"],
    source_name: "BDDK / Resmî Gazete",
    source_urls: [
      "6361 sayılı Finansal Kiralama, Faktoring, Finansman ve Tasarruf Finansman Şirketleri Kanunu",
      "BDDK — Tasarruf Finansman Şirketlerinin Faaliyet Esasları Hakkında Yönetmelik",
      "BDDK — Faaliyet izni bulunan kuruluşlar listesi",
    ],
    seo_title: "Tasarruf finansmanı nasıl çalışır? | FinansIndex",
    meta_description: "Tasarruf finansmanı sisteminin işleyişi, organizasyon ücreti, teslimat sırası ve sözleşme öncesi kontrol edilmesi gerekenler. Yatırım tavsiyesi içermez.",
    body: [
      P("Tasarruf finansmanı, konut veya taşıt almak isteyen kişilerin bir sistem içinde biriktirme yaptıktan sonra sıraya göre finansman kullandığı bir modeldir. Faiz yerine **organizasyon ücreti** alınır. Model 2021'den bu yana BDDK denetimindedir ve yalnızca faaliyet izni bulunan şirketler bu işi yapabilir."),
      P("Bu yazı sistemin nasıl işlediğini anlatır; herhangi bir şirketi önermez ve şirketler arasında sıralama yapmaz."),

      H("Sistem nasıl işliyor?"),
      P("İşleyiş üç aşamalıdır. **Birikim dönemi**nde sözleşmede belirlenen tutarı taksitler hâlinde ödersiniz. **Tahsis** aşamasında sözleşmedeki koşullar sağlandığında finansman kullanma hakkı doğar. **Geri ödeme dönemi**nde ise kullandığınız tutarı kalan takvim boyunca ödemeye devam edersiniz."),
      P("Kritik nokta şudur: parayı hemen almazsınız. Ne zaman alacağınız sözleşmedeki teslimat planına bağlıdır ve bu plan şirketten şirkete, hatta aynı şirket içinde ürüne göre değişir."),

      H("Organizasyon ücreti neyi değiştirir?"),
      P("Sistemde faiz işlemez, ancak şirket hizmeti karşılığında organizasyon ücreti alır. Bu ücret sözleşme tutarı üzerinden hesaplanır ve **toplam maliyetin belirleyici kalemidir**. “Faizsiz” ifadesi tek başına “maliyetsiz” anlamına gelmez."),
      P("Karşılaştırma yaparken bakmanız gereken rakam aylık taksit değil, **sözleşme süresi boyunca ödeyeceğiniz toplam tutardır.** Bu tutarı hesaplamak için üç veriye ihtiyacınız var: toplam ödeyeceğiniz taksitlerin tümü, organizasyon ücreti ve varsa diğer masraflar."),
      { type: "note", t: "Organizasyon ücreti oranı şirkete ve sözleşmeye göre değişir. Bu yazıda örnek bir oran verilmemiştir; kendi teklifinizdeki oranı sözleşmenizden okuyun ve toplam tutarı kendiniz hesaplayın." },

      H("Üç yöntemi neye göre karşılaştırmalı?"),
      P("Konut veya taşıt alırken önünüzde genellikle üç yol var: peşin ödeme, banka kredisi, tasarruf finansmanı. Bunları tek bir rakamla karşılaştırmak yanıltıcı olur; her birinin farklı bir maliyet ve zaman profili vardır."),
      { type: "table", head: ["Kriter", "Banka kredisi", "Tasarruf finansmanı"],
        rows: [
          ["Maliyet kalemi", "Faiz + vergiler (KKDF, BSMV) + masraflar", "Organizasyon ücreti + masraflar"],
          ["Parayı ne zaman alırsınız", "Onay sonrası kısa sürede", "Sözleşmedeki teslimat sırasına göre"],
          ["Ödeme öngörülebilirliği", "Sabit faizde taksit bellidir", "Taksit bellidir, teslimat zamanı sözleşmeye bağlıdır"],
          ["Erken çıkış", "Erken kapama mümkün, kurallar mevzuatta", "Cayma ve fesih koşulları sözleşmede tanımlı"],
          ["Denetim", "BDDK", "BDDK"],
        ] },
      P("Karar verirken sorulacak asıl soru şu: **paraya ne zaman ihtiyacınız var?** Yakın vadede taşınmanız gerekiyorsa teslimat sırası belirsizliği sizin için ciddi bir risktir. Beklemeye tahammülünüz varsa maliyet karşılaştırması öne çıkar."),

      H("Sözleşme öncesi kontrol listesi"),
      { type: "ul", items: [
        "**Şirketin BDDK faaliyet izni var mı?** BDDK'nın internet sitesindeki güncel listeden kontrol edin. İzni olmayan bir kuruluşla sözleşme yapmayın.",
        "**Toplam ödeme tutarı ne kadar?** Aylık taksit değil, sözleşme boyunca ödeyeceğiniz toplamı yazılı olarak isteyin.",
        "**Organizasyon ücreti ne kadar ve ne zaman tahsil ediliyor?** Peşin mi, taksite mi yayılıyor?",
        "**Teslimat sırası neye göre belirleniyor?** Kriterler sözleşmede açıkça yazıyor mu?",
        "**Cayma hakkım ne kadar süre geçerli?** Cayma hâlinde hangi tutar iade edilir, hangisi kesilir?",
        "**Fesih durumunda param ne zaman geri ödenir?** İade takvimi sözleşmede tanımlı mı?",
        "**Ödemeye ara verirsem ne olur?** Sıramı kaybeder miyim?",
        "**Sözleşme değişikliği hangi koşullarda yapılabilir?**",
      ] },

      H("Dikkat edilmesi gereken sinyaller"),
      { type: "ul", items: [
        "Kesin teslimat tarihi sözlü olarak vaat ediliyor ama sözleşmede yazmıyorsa, yazılı olmayan hiçbir vaat geçerli değildir.",
        "“Faizsiz olduğu için daha ucuz” denip toplam maliyet karşılaştırması yapılmıyorsa, karşılaştırmayı kendiniz isteyin.",
        "Sözleşmeyi okumanız için yeterli süre verilmiyorsa acele etmeyin.",
        "Şirketin BDDK listesinde olmadığını fark ederseniz süreci durdurun.",
      ] },
      P("Tasarruf finansmanı, doğru koşullarda ve doğru beklentiyle bazı kişiler için uygun bir yöntem olabilir. Uygun olup olmadığını belirleyen şey sistemin kendisi değil, sizin nakit ihtiyacınızın zamanlaması ve sözleşmenin somut şartlarıdır."),
    ],
    hook: "“Faizsiz” maliyetsiz demek değil: organizasyon ücreti var",
    impact: {
      lead: "Tasarruf finansmanında belirleyici olan aylık taksit değil, toplam maliyet ve paraya ne zaman ulaşacağınızdır.",
      points: [
        "Şirketin BDDK faaliyet iznini resmî listeden kendiniz doğrulayın.",
        "Sözleşme boyunca ödeyeceğiniz toplam tutarı yazılı olarak isteyin ve banka kredisi teklifiyle aynı tabloda karşılaştırın.",
        "Teslimat sırasının nasıl belirlendiğinin sözleşmede yazılı olduğundan emin olun.",
      ],
    },
  },
  {
    id: "a12", slug: "kredi-faizi-nasil-okunur-toplam-maliyet",
    title: "Kredi teklifini doğru okumak: aylık faiz oranı size toplam maliyeti söylemez",
    summary: "İki bankanın aynı faiz oranı, farklı toplam geri ödeme anlamına gelebilir. Vade, vergiler ve masrafların hesabı nasıl değiştirdiğini rakamlarla gösteriyoruz.",
    category: "kredi-ve-mevduat", contentType: "Rehber", author: "burcu-berk-arslan",
    published_at: "2026-08-15T09:30:00+03:00", updated_at: "2026-08-15T09:30:00+03:00",
    read: 6, risk_level: "orta", review_status: "yayimlandi", reviewed_by: "burcu-berk-arslan",
    sponsored: false, disclaimer: "general", related_tool: "kredi",
    tags: ["kredi", "faiz", "maliyet"],
    source_name: "TCMB / BDDK",
    source_urls: [
      "TCMB — Bankalarca tüketici kredilerine uygulanan ağırlıklı ortalama faiz oranları",
      "BDDK — Tüketici kredisi sözleşmelerine ilişkin düzenlemeler",
      "Resmî Gazete — KKDF ve BSMV oranlarına ilişkin düzenlemeler",
    ],
    seo_title: "Kredi faizi ve toplam maliyet nasıl hesaplanır? | FinansIndex",
    meta_description: "Aylık faiz oranı, vade, KKDF ve BSMV'nin toplam geri ödemeye etkisi. Kredi tekliflerini doğru karşılaştırmanın yolu.",
    body: [
      P("Kredi teklifi alırken en çok konuşulan rakam aylık faiz oranıdır. Oysa cebinizden çıkacak toplam para üç şeyin birlikte sonucudur: oran, vade ve vergiler. Bunlardan yalnızca birine bakmak, en pahalı teklifi en ucuz sanmanıza yol açabilir."),

      H("Vade, oranı gölgede bırakır"),
      P("Aynı faiz oranıyla, vadeyi uzattığınızda aylık taksit düşer ama toplam ödeme artar. Aradaki fark küçük değildir."),
      { type: "chart", title: "100.000 TL kredi, aylık %2,50 faiz: vadeye göre toplam geri ödeme",
        unit: "₺", highlight: 0,
        rows: [
          { k: "12 ay", sub: "Taksit ≈ 9.900 TL", v: 118800 },
          { k: "24 ay", sub: "Taksit ≈ 5.985 TL", v: 143600 },
          { k: "36 ay", sub: "Taksit ≈ 4.760 TL", v: 171400 },
          { k: "48 ay", sub: "Taksit ≈ 4.190 TL", v: 201100 },
        ],
        note: "Vadeyi 12 aydan 48 aya çıkarmak aylık taksiti yarıdan fazla düşürüyor, ancak toplam ödemeye yaklaşık 82.000 TL ekliyor.",
        caption: "Örnek hesaplama. KKDF %15 ve BSMV %10 dahil edilmiştir. Kendi rakamlarınız için aşağıdaki hesaplama aracını kullanın." },

      H("Vergiler oranı sessizce yükseltir"),
      P("Tüketici kredilerinde faiz tutarı üzerinden **KKDF** ve **BSMV** alınır. Bu, bankanın söylediği oranın efektif olarak daha yüksek bir orana karşılık gelmesi anlamına gelir. Konut kredilerinde ve ticari kredilerde bu kalemler farklı uygulanır."),
      { type: "stats", items: [
        { v: "%2,50", k: "Bankanın söylediği aylık oran", sub: "Sözleşmede yazan nominal oran" },
        { v: "%3,13", k: "Vergiler dahil efektif oran", sub: "KKDF ve BSMV eklendikten sonra" },
        { v: "%25", k: "Faiz maliyetindeki artış", sub: "Yalnızca vergilerden kaynaklanan" },
      ], caption: "Örnek hesaplama. Oranlar mevzuatla değişebildiği için kendi sözleşmenizdeki güncel oranları esas alın." },

      H("Karşılaştırmayı nasıl yapmalı?"),
      P("İki teklifi karşılaştırırken oranları yan yana koymak yeterli değildir. Şu üç rakamı aynı tabloya yazın:"),
      { type: "ul", items: [
        "**Toplam geri ödeme:** taksit × vade sayısı.",
        "**Toplam maliyet:** toplam geri ödeme eksi anapara.",
        "**Masraflar:** dosya masrafı, tahsis ücreti, zorunlu sigorta varsa primi.",
      ] },
      P("Bankalar tüketici kredilerinde toplam maliyeti gösteren bir oran bildirmek zorundadır. Teklifi sözlü almayın; yazılı ödeme planını isteyin ve toplam rakamı orada görün."),

      H("Sık yapılan hata"),
      P("En yaygın hata, ödeyebileceğiniz aylık taksite göre vade seçmektir. Bu, bütçe açısından anlaşılır bir refleks ama uzun vadede pahalıya mal olur. Daha sağlıklı yaklaşım: ödeyebileceğiniz **en kısa vadeyi** seçmek ve gerekirse kredi tutarını düşürmektir."),
    ],
    hook: "Vadeyi 12'den 48 aya çıkarmak toplam ödemeye ~82.000 TL ekliyor",
    impact: {
      lead: "Kredi tekliflerini aylık faiz oranıyla değil, toplam geri ödeme tutarıyla karşılaştırın.",
      points: [
        "Her bankadan yazılı ödeme planı isteyin ve toplam geri ödeme rakamını karşılaştırın.",
        "Vadeyi uzatmanın toplam maliyete etkisini hesaplayıcıyla önceden görün.",
        "Dosya masrafı, tahsis ücreti ve sigorta primlerini toplam maliyete ekleyin.",
      ],
    },
  },
  {
    id: "a10", slug: "sponsorlu-dijital-bankacilik-alaskanliklari",
    title: "Dijital bankacılık alışkanlıkları: işlemlerin çevrim içine taşınması bütçeyi nasıl değiştiriyor?",
    summary: "Şube işlemlerinin dijitale kayması, masraf yapısından bildirim alışkanlıklarına kadar birçok kalemi etkiliyor. Bu içerik Örnek Banka iş birliğiyle hazırlanmıştır.",
    category: "kredi-ve-mevduat", contentType: "Sponsorlu", author: "burcu-berk-arslan",
    published_at: "2026-07-28T10:00:00+03:00", updated_at: "2026-07-28T10:00:00+03:00",
    read: 4, risk_level: "orta", review_status: "yayimlandi", reviewed_by: "burcu-berk-arslan",
    sponsored: true, sponsor_name: "Örnek Banka", disclaimer: "general", related_tool: "asgari",
    tags: ["dijital bankacılık", "masraf"],
    source_name: "Sponsor bilgilendirmesi",
    source_urls: ["BDDK — Dijital bankacılık istatistikleri", "Sponsor kurum bilgilendirme materyalleri"],
    seo_title: "Dijital bankacılık alışkanlıkları ve bütçe etkisi | FinansIndex",
    meta_description: "Bankacılık işlemlerinin dijitale taşınmasının masraf, takip ve bütçe yönetimi üzerindeki etkileri. Sponsorlu içerik.",
    body: [
      P("Bankacılık işlemlerinin büyük bölümü artık mobil uygulamalar üzerinden yapılıyor. Bu değişim yalnızca kolaylık değil, bütçe takibi açısından da farklı alışkanlıklar getiriyor."),
      H("Takip alışkanlığı"),
      P("Anlık bildirimler, harcamanın yapıldığı anda görünmesini sağlar. Ay sonunda ekstre okuyarak yapılan takip ile karşılaştırıldığında, harcama farkındalığı üzerinde belirgin bir etkisi olduğu genel olarak kabul edilir."),
      H("Masraf kalemleri"),
      { type: "ul", items: [
        "İşlem ücretleri kanala göre farklılaşabilir; kendi bankanızın ücret tarifesini kontrol edin.",
        "Otomatik ödeme talimatları gecikme faizini önler, ancak bakiye takibini zorunlu kılar.",
        "Kart limitleri ve harcama uyarıları uygulama içinden ayarlanabilir.",
      ] },
      P("Bu içerik sponsor iş birliğiyle hazırlanmıştır. FinansIndex editoryal ekibi, sponsorlu içeriklerde de doğruluk kontrolü uygular ve ürün tavsiyesi yapmaz."),
    ],
    impact: {
      lead: "Dijital kanallara geçiş, harcama takibinizi kolaylaştırabilir; ancak ücret tarifesini kontrol etmek gerekir.",
      points: [
        "Bankanızın güncel ücret ve komisyon tarifesini inceleyin.",
        "Harcama bildirimlerini açın.",
        "Otomatik ödeme talimatlarınız için bakiye hatırlatması kurun.",
      ],
    },
  },
];

const byId = (id) => ARTICLES.find((a) => a.id === id);
const bySlug = (s) => ARTICLES.find((a) => a.slug === s);

/* Cep Etkisi Defteri — ana sayfanın imza bölümü */
const LEDGER = [
  {
    what: "Kredi kartı borcunu yalnızca asgari tutarla çevirenler, borcu kapatmıyor; ödeme takvimini uzatıyor.",
    how: "Asgari ödeme sonrası kalan bakiyeye akdi faiz işler. 25.000 TL borçta, aylık %4 faizle sadece asgariyi ödemek borcu kapatmayı 47 aya çıkarır. Aylık 2.000 TL ek ödeme bu süreyi 8 aya indirir.",
    tags: ["Kredi kartı", "Borç"], warn: true,
    article: "a2", tool: "asgari",
  },
  {
    what: "Kredi teklifinde aylık faiz oranı, ödeyeceğiniz toplam tutarı tek başına göstermez.",
    how: "Vergiler (KKDF ve BSMV) faiz maliyetini yaklaşık dörtte bir oranında artırır. Vadeyi uzatmak aylık taksiti düşürür ama toplam ödemeyi belirgin şekilde büyütür. Karşılaştırmayı toplam geri ödeme üzerinden yapın.",
    tags: ["Kredi", "Faiz"],
    article: "a12", tool: "kredi",
  },
  {
    what: "Tasarruf finansmanı sözleşmelerinde belirleyici olan taksit değil, organizasyon ücreti ve teslimat sırası.",
    how: "Sistemde faiz işlemez ama organizasyon ücreti alınır; “faizsiz” maliyetsiz demek değildir. Parayı ne zaman alacağınız sözleşmedeki teslimat planına bağlıdır. Şirketin BDDK faaliyet iznini resmî listeden kontrol edin.",
    tags: ["Tasarruf finansmanı", "Konut"], warn: true,
    article: "a11", tool: "karsilastir",
  },
  {
    what: "Vadeli mevduatta oran, hesabınız yenilendiği gün bankanın o günkü kotasyonuna göre belirlenir.",
    how: "Otomatik yenilemede karşılaştırma yapılmadan devam edilir. Vade bitiminden önce farklı bankaların aynı vadedeki oranlarını kontrol etmek, getiriyi tesadüfe bırakmamanızı sağlar.",
    tags: ["Mevduat", "Birikim"],
    article: "a1", tool: "mevduat",
  },
];

const GUIDES = [
  { id: "a12", label: "Kredi rehberi" },
  { id: "a11", label: "Sözleşme rehberi" },
  { id: "a2", label: "Borç rehberi" },
  { id: "a3", label: "Karar rehberi" },
];

const DOSSIER = {
  eyebrow: "Ağustos dosyası",
  title: "Hane bütçesinde sabit giderler: kaçınılmaz kalemler nasıl yönetilir?",
  desc: "Kira, aidat, faturalar, ulaşım ve sigorta primleri. Bütçenin en az esneyen tarafını dört bölümde ele alan özel dosya.",
  parts: [
    { n: "01", t: "Sabit gider nedir, hangi kalemler gerçekten sabittir?" },
    { n: "02", t: "Yıllık ödemeleri aylığa yaymanın avantaj ve riskleri" },
    { n: "03", t: "Abonelik ve sigorta yenilemelerinde karşılaştırma yöntemi" },
    { n: "04", t: "Sabit gider oranı hangi seviyede alarm vermeli?" },
  ],
  sponsor: null,
};

/* ------------------------------------------------------- 8. YARDIMCI FONKSİYON */

const tl = (n, dec = 2) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: dec, maximumFractionDigits: dec }).format(isFinite(n) ? n : 0);
const num = (n, dec = 2) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(isFinite(n) ? n : 0);
const dateTR = (iso) =>
  new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
const initials = (n) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const toNum = (v) => { const n = parseFloat(String(v).replace(/\./g, "").replace(",", ".")); return isNaN(n) ? 0 : n; };

const DISCLAIMERS = {
  invest: "Bu içerik genel bilgilendirme amacıyla hazırlanmıştır ve yatırım tavsiyesi niteliğinde değildir. Yatırım kararlarınız kendi risk tercihinize ve ihtiyaçlarınıza bağlıdır.",
  legal: "Bu içerik genel bilgilendirme amacıyla hazırlanmıştır, hukuki danışmanlık yerine geçmez. Somut uyuşmazlıklarda hukuki destek almanız önerilir.",
  general: "Bu içerik genel bilgilendirme amacıyla hazırlanmıştır. Ürün ve koşullar kurumdan kuruma değişebilir; karar öncesi ilgili kurumun güncel bilgilendirmesini esas alın.",
};

/* Basit görsel yerine, kategoriye göre üretilen soyut kapak deseni.
   Gerçek kurulumda <img srcset> ile CDN görselleri kullanılacak. */
/**
 * Okunabilir karşılaştırma grafiği.
 * Tasarım kararı: renk tek başına anlam taşımaz — her çubuğun değeri
 * sayı olarak da yazılır ve etiket çubuğun dışında durur. Böylece
 * ekran okuyucu, renk körlüğü ve küçük ekran koşullarında da okunur.
 */
function BarChart({ title, unit = "", rows, caption, highlight, note }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.v))) || 1;
  const fmt = (v, dec) =>
    unit === "₺" ? tl(Math.abs(v), 0) : `${num(Math.abs(v), dec ?? 1)}${unit}`;

  return (
    <figure className="fi-chart">
      {title && <figcaption className="fi-chart-t">{title}</figcaption>}
      <div className="fi-chart-body">
        {rows.map((r, i) => {
          const isHi = highlight === i;
          const pct = (Math.abs(r.v) / max) * 100;
          const wide = pct > 42;
          return (
            <div className="fi-bar-row" key={r.k}>
              <div className={`fi-bar-lbl ${isHi ? "hi" : ""}`}>
                {r.k}
                {r.sub && <span className="fi-bar-sub">{r.sub}</span>}
              </div>
              <div className="fi-bar-track">
                <div className="fi-bar-fill" style={{
                  width: `${Math.max(3, pct)}%`,
                  background: isHi ? "var(--petrol)" : r.v < 0 ? "var(--down)" : "var(--ink-2)",
                }}>
                  {wide && <span className="fi-bar-in">{r.v < 0 ? "−" : ""}{fmt(r.v, r.dec)}</span>}
                </div>
                {!wide && <span className="fi-bar-out">{r.v < 0 ? "−" : ""}{fmt(r.v, r.dec)}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {note && <p className="fi-chart-note">{note}</p>}
      {caption && <p className="fi-chart-cap">{caption}</p>}
    </figure>
  );
}

/**
 * Tek bir rakamı öne çıkaran istatistik bloğu.
 * Uzun paragrafın içinde kaybolan sayıyı görünür kılar.
 */
function StatRow({ items, caption }) {
  return (
    <figure className="fi-stats">
      <div className="fi-stats-grid">
        {items.map((it) => (
          <div className="fi-stat" key={it.k}>
            <div className="fi-stat-v">{it.v}</div>
            <div className="fi-stat-k">{it.k}</div>
            {it.sub && <div className="fi-stat-s">{it.sub}</div>}
          </div>
        ))}
      </div>
      {caption && <figcaption className="fi-chart-cap">{caption}</figcaption>}
    </figure>
  );
}

/* ----------------------------------------------------------- 9. REKLAM SLOTU */

/**
 * placementId zorunlu. Kreatif yoksa null döner → sayfada yer kaplamaz.
 * Görünürlük IntersectionObserver ile ölçülür (ad_impression / sponsor_impression).
 */
function AdSlot({ placementId, pageType, className = "" }) {
  const creative = AD_INVENTORY[placementId];
  const ref = useRef(null);
  const seen = useRef(false);

  useEffect(() => {
    if (!creative || !ref.current || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.5 && !seen.current) {
          seen.current = true;
          track("ad_impression", { placement_id: placementId, sponsor_name: creative.sponsor, page_type: pageType, content_type: creative.type });
          if (creative.type !== "display") track("sponsor_impression", { placement_id: placementId, sponsor_name: creative.sponsor, page_type: pageType });
        }
      }),
      { threshold: [0.5] }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [creative, placementId, pageType]);

  if (!creative) return null;

  const click = () => track("ad_click", { placement_id: placementId, sponsor_name: creative.sponsor, page_type: pageType });

  if (creative.type === "tool") {
    return (
      <p ref={ref} className={className} style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>
        <span className="fi-badge fi-b-spon" style={{ marginRight: 8 }}>Sponsor</span>{creative.title}
      </p>
    );
  }

  if (creative.type === "native") {
    return (
      <article ref={ref} className={`fi-native ${className}`}>
        <span className="fi-badge fi-b-spon">Sponsorlu içerik</span>
        <h3 className="fi-ttl" style={{ marginTop: 10 }}>{creative.title}</h3>
        <p className="fi-exc">{creative.excerpt}</p>
        <p style={{ margin: "12px 0 0", font: "500 12px/1 var(--mono)", color: "var(--muted)" }}>{creative.sponsor}</p>
        <button className="fi-btn fi-btn-o" style={{ marginTop: 12 }} onClick={click}>{creative.cta}</button>
      </article>
    );
  }

  return (
    <aside ref={ref} className={`fi-ad ${className}`} aria-label="Reklam">
      <span className="fi-ad-lbl">Reklam · {creative.sponsor}</span>
      <p style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: "var(--navy)" }}>{creative.title}</p>
      <button className="fi-btn fi-btn-o" onClick={click}>{creative.cta}</button>
    </aside>
  );
}

/* -------------------------------------------------------------- 10. KARTLAR */

/**
 * İçerik kartı.
 * Tasarım kararı: dekoratif görsel kullanılmıyor. Anlamsız bir grafik deseni,
 * finans yayınında güven kaybettirir. Hiyerarşi tipografi, hairline kural ve
 * varsa içerikten çıkarılmış somut bir çengel rakamıyla kuruluyor.
 */
function ArticleCard({ a, go, source }) {
  const open = () => {
    track("related_article_click", { article_id: a.id, article_category: a.category, content_type: a.contentType, traffic_source: source });
    go({ n: "article", slug: a.slug });
  };
  return (
    <article className="fi-card">
      <button className="fi-a" onClick={open}>
        <div className="fi-meta">
          <span className="fi-cat">{catName(a.category)}</span>
          <span className="fi-dot" />
          <span className="fi-badge fi-b-type">{a.contentType}</span>
          <span className="fi-dot" />
          <span>{a.read} dk</span>
          {a.sponsored && <span className="fi-badge fi-b-spon">Sponsorlu</span>}
        </div>
        <h3 className="fi-ttl">{a.title}</h3>
        {a.hook ? <p className="fi-card-hook">{a.hook}</p> : <p className="fi-exc">{a.summary.slice(0, 116)}…</p>}
      </button>
    </article>
  );
}

/* -------------------------------------------------------- 11. HESAP ARAÇLARI */

function Field({ label, hint, ...p }) {
  const id = useRef(`f${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <div className="fi-fld">
      <label htmlFor={id}>{label}{hint && <span className="hint">{hint}</span>}</label>
      <input id={id} inputMode="decimal" {...p} />
    </div>
  );
}

function CalcShell({ tool, children, out, note, compact }) {
  return (
    <section className="fi-calc" id={tool.id}>
      <div className="fi-calc-hd">
        <span className="fi-samp">Örnek hesaplama aracı</span>
        <h3 style={{ marginTop: 10 }}>{tool.name}</h3>
        <p>{tool.desc}</p>
        <AdSlot placementId="calculator_sponsor" pageType="tool" className="" />
      </div>
      <div className="fi-calc-b">
        <div className="fi-calc-in">
          {compact && (
            <div style={{ marginBottom: 2 }}>
              <span className="fi-samp">Örnek hesaplama aracı</span>
              <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--muted)" }}>{tool.desc}</p>
            </div>
          )}
          {children}
          {note && <p className="fi-note">{note}</p>}
        </div>
        <div className="fi-calc-out">{out}</div>
      </div>
    </section>
  );
}

function useCalcTracking(type) {
  const started = useRef(false);
  return useCallback((complete) => {
    if (!started.current) { started.current = true; track("calculator_start", { calculator_type: type, page_type: "tool" }); }
    if (complete) track("calculator_complete", { calculator_type: type, page_type: "tool" });
  }, [type]);
}

/* --- Araç 1: Kredi taksit --- */
function CalcKredi({ tool, compact }) {
  const [p, setP] = useState("100000");
  const [r, setR] = useState("2,50");
  const [n, setN] = useState("24");
  const [tax, setTax] = useState(true);
  const t = useCalcTracking("kredi_taksit");

  const res = useMemo(() => {
    const P0 = toNum(p), n0 = Math.max(1, Math.round(toNum(n)));
    // İhtiyaç kredilerinde faiz üzerinden KKDF %15 + BSMV %10 alınır → efektif oran = i × 1,25
    const i = (toNum(r) / 100) * (tax ? 1.25 : 1);
    if (P0 <= 0 || i <= 0) return null;
    const k = Math.pow(1 + i, n0);
    const inst = (P0 * i * k) / (k - 1);
    return { inst, total: inst * n0, cost: inst * n0 - P0, ratio: ((inst * n0 - P0) / P0) * 100, n: n0 };
  }, [p, r, n, tax]);

  useEffect(() => { if (res) t(true); }, [res, t]);

  return (
    <CalcShell tool={tool} compact={compact}
      note="Bankalar dosya masrafı, sigorta ve tahsis ücreti gibi ek kalemler uygulayabilir. Sonuç, yalnızca faiz üzerinden hesaplanan gösterge niteliğindedir."
      out={res ? (
        <>
          <div className="fi-res-main">
            <div className="fi-res-k">Aylık taksit</div>
            <div className="fi-res-v">{tl(res.inst)}</div>
          </div>
          <div className="fi-res-row"><span>Toplam geri ödeme</span><span>{tl(res.total)}</span></div>
          <div className="fi-res-row"><span>Toplam maliyet</span><span>{tl(res.cost)}</span></div>
          <div className="fi-res-row"><span>Maliyet / anapara</span><span>%{num(res.ratio, 1)}</span></div>
          <div className="fi-res-row"><span>Taksit sayısı</span><span>{res.n}</span></div>
          <p className="fi-note">Vergiler {tax ? "dahil edildi (KKDF %15 + BSMV %10)" : "hariç tutuldu"}.</p>
        </>
      ) : <p style={{ color: "#C4B7AC", margin: 0 }}>Tutar ve faiz oranını girin, taksit tutarı burada hesaplanır.</p>}
    >
      <Field label="Kredi tutarı (TL)" value={p} onChange={(e) => { setP(e.target.value); t(false); }} />
      <Field label="Aylık faiz oranı (%)" hint="Bankanızın teklif ettiği aylık oranı girin." value={r} onChange={(e) => { setR(e.target.value); t(false); }} />
      <Field label="Vade (ay)" value={n} onChange={(e) => { setN(e.target.value); t(false); }} />
      <label className="fi-toggle">
        <input type="checkbox" checked={tax} onChange={(e) => setTax(e.target.checked)} />
        <span>Tüketici kredisi vergilerini dahil et (KKDF %15 + BSMV %10). Ticari ve konut kredilerinde bu kalemler farklı uygulanır.</span>
      </label>
    </CalcShell>
  );
}

/* --- Araç 2: Mevduat getirisi --- */
function CalcMevduat({ tool, compact }) {
  const [p, setP] = useState("100000");
  const [r, setR] = useState("");
  const [d, setD] = useState("32");
  const [s, setS] = useState("");
  const t = useCalcTracking("mevduat_getirisi");

  const res = useMemo(() => {
    const P0 = toNum(p), r0 = toNum(r), d0 = toNum(d), s0 = toNum(s);
    if (P0 <= 0 || r0 <= 0 || d0 <= 0) return null;
    const gross = P0 * (r0 / 100) * (d0 / 365);
    const tax = gross * (s0 / 100);
    return { gross, tax, net: gross - tax, end: P0 + gross - tax, eff: ((gross - tax) / P0) * (365 / d0) * 100 };
  }, [p, r, d, s]);

  useEffect(() => { if (res) t(true); }, [res, t]);

  return (
    <CalcShell tool={tool} compact={compact}
      note="Stopaj oranı vade, para birimi ve ürün türüne göre değişebilir ve mevzuatla güncellenir. Güncel oranı bankanızdan veya resmî düzenlemeden teyit ederek girin."
      out={res ? (
        <>
          <div className="fi-res-main">
            <div className="fi-res-k">Net getiri</div>
            <div className="fi-res-v">{tl(res.net)}</div>
          </div>
          <div className="fi-res-row"><span>Brüt getiri</span><span>{tl(res.gross)}</span></div>
          <div className="fi-res-row"><span>Stopaj kesintisi</span><span>−{tl(res.tax)}</span></div>
          <div className="fi-res-row"><span>Vade sonu toplam</span><span>{tl(res.end)}</span></div>
          <div className="fi-res-row"><span>Yıllık net getiri oranı</span><span>%{num(res.eff, 2)}</span></div>
        </>
      ) : <p style={{ color: "#C4B7AC", margin: 0 }}>Anapara, faiz oranı ve vadeyi girin.</p>}
    >
      <Field label="Anapara (TL)" value={p} onChange={(e) => { setP(e.target.value); t(false); }} />
      <Field label="Yıllık brüt faiz oranı (%)" hint="Bankanın açıkladığı yıllık oranı girin." placeholder="örn. 40" value={r} onChange={(e) => { setR(e.target.value); t(false); }} />
      <Field label="Vade (gün)" value={d} onChange={(e) => { setD(e.target.value); t(false); }} />
      <Field label="Stopaj oranı (%)" hint="Vadenize uygulanan güncel stopaj oranını girin. Boş bırakırsanız 0 kabul edilir." placeholder="örn. 5" value={s} onChange={(e) => { setS(e.target.value); t(false); }} />
    </CalcShell>
  );
}

/* --- Araç 3: Kredi kartı asgari ödeme --- */
function CalcAsgari({ tool, compact }) {
  const [b, setB] = useState("25000");
  const [rate, setRate] = useState("20");
  const [inst, setInst] = useState("0");
  const [late, setLate] = useState("0");
  const [ir, setIr] = useState("");
  const t = useCalcTracking("asgari_odeme");

  const res = useMemo(() => {
    const b0 = toNum(b), r0 = toNum(rate), i0 = toNum(inst), l0 = toNum(late), ir0 = toNum(ir);
    if (b0 <= 0 || r0 <= 0) return null;
    const min = b0 * (r0 / 100) + i0 + l0;
    const remain = Math.max(0, b0 - min);
    return { min, remain, interest: remain * (ir0 / 100), next: remain + remain * (ir0 / 100) };
  }, [b, rate, inst, late, ir]);

  useEffect(() => { if (res) t(true); }, [res, t]);

  return (
    <CalcShell tool={tool} compact={compact}
      note="Asgari ödeme oranı kart limitine göre değişir ve mevzuatla güncellenebilir. Kendi ekstrenizdeki oranı ve akdi faiz oranını kullanın."
      out={res ? (
        <>
          <div className="fi-res-main">
            <div className="fi-res-k">Asgari ödeme tutarı</div>
            <div className="fi-res-v">{tl(res.min)}</div>
          </div>
          <div className="fi-res-row"><span>Devreden bakiye</span><span>{tl(res.remain)}</span></div>
          <div className="fi-res-row"><span>Bir aylık faiz yükü</span><span>{tl(res.interest)}</span></div>
          <div className="fi-res-row"><span>Gelecek ay taşınan borç</span><span>{tl(res.next)}</span></div>
          <p className="fi-note">Yeni harcama yapılmadığı varsayılmıştır. Harcama eklendiğinde devreden bakiye büyür.</p>
        </>
      ) : <p style={{ color: "#C4B7AC", margin: 0 }}>Dönem borcu ve asgari ödeme oranını girin.</p>}
    >
      <Field label="Dönem borcu (TL)" value={b} onChange={(e) => { setB(e.target.value); t(false); }} />
      <div className="fi-fld">
        <label htmlFor="c-rate">Asgari ödeme oranı (%)<span className="hint">Ekstrenizde yazan oranı seçin veya elle girin.</span></label>
        <select id="c-rate" value={rate} onChange={(e) => { setRate(e.target.value); t(false); }}>
          <option value="20">%20</option><option value="40">%40</option><option value="100">%100</option>
        </select>
      </div>
      <Field label="Bu aya düşen taksitler (TL)" value={inst} onChange={(e) => { setInst(e.target.value); t(false); }} />
      <Field label="Gecikmiş tutar (TL)" value={late} onChange={(e) => { setLate(e.target.value); t(false); }} />
      <Field label="Aylık akdi faiz oranı (%)" hint="Ekstrenizde belirtilen orandır." placeholder="örn. 4" value={ir} onChange={(e) => { setIr(e.target.value); t(false); }} />
    </CalcShell>
  );
}

/* --- Araç 4: Kira artışı --- */
function CalcKira({ tool, compact }) {
  const [rent, setRent] = useState("18000");
  const [rate, setRate] = useState("");
  const t = useCalcTracking("kira_artis");

  const res = useMemo(() => {
    const r0 = toNum(rent), x = toNum(rate);
    if (r0 <= 0 || x <= 0) return null;
    const nw = r0 * (1 + x / 100);
    return { nw, diff: nw - r0, year: (nw - r0) * 12 };
  }, [rent, rate]);

  useEffect(() => { if (res) t(true); }, [res, t]);

  return (
    <CalcShell tool={tool} compact={compact}
      note="Konut kiralarında artış, on iki aylık ortalamalara göre TÜFE değişim oranı ile sınırlıdır. Yenileme ayınıza ait güncel oranı TÜİK bülteninden alın."
      out={res ? (
        <>
          <div className="fi-res-main">
            <div className="fi-res-k">Yeni aylık kira</div>
            <div className="fi-res-v">{tl(res.nw)}</div>
          </div>
          <div className="fi-res-row"><span>Aylık artış tutarı</span><span>{tl(res.diff)}</span></div>
          <div className="fi-res-row"><span>Yıllık ek yük</span><span>{tl(res.year)}</span></div>
        </>
      ) : <p style={{ color: "#C4B7AC", margin: 0 }}>Mevcut kirayı ve uygulanacak oranı girin.</p>}
    >
      <Field label="Mevcut aylık kira (TL)" value={rent} onChange={(e) => { setRent(e.target.value); t(false); }} />
      <Field label="Artış oranı (%)" hint="Yenileme ayınızda geçerli olan on iki aylık ortalama TÜFE değişim oranını girin." placeholder="örn. 45,3" value={rate} onChange={(e) => { setRate(e.target.value); t(false); }} />
    </CalcShell>
  );
}

/* --- Araç 5: Enflasyon etkisi --- */
function CalcEnflasyon({ tool, compact }) {
  const [amt, setAmt] = useState("100000");
  const [inf, setInf] = useState("");
  const [ret, setRet] = useState("");
  const [yr, setYr] = useState("1");
  const t = useCalcTracking("enflasyon_etkisi");

  const res = useMemo(() => {
    const a = toNum(amt), i = toNum(inf) / 100, g = toNum(ret) / 100, y = Math.max(1, toNum(yr));
    if (a <= 0 || i <= 0) return null;
    const nominal = a * Math.pow(1 + g, y);
    const real = nominal / Math.pow(1 + i, y);
    return { nominal, real, loss: a - a / Math.pow(1 + i, y), realRate: ((1 + g) / (1 + i) - 1) * 100 };
  }, [amt, inf, ret, yr]);

  useEffect(() => { if (res) t(true); }, [res, t]);

  return (
    <CalcShell tool={tool} compact={compact}
      note="Reel getiri = ((1 + nominal getiri) ÷ (1 + enflasyon)) − 1. Güncel enflasyon verisi için TÜİK bültenlerini esas alın."
      out={res ? (
        <>
          <div className="fi-res-main">
            <div className="fi-res-k">Bugünkü alım gücüyle değeri</div>
            <div className="fi-res-v">{tl(res.real)}</div>
          </div>
          <div className="fi-res-row"><span>Nominal tutar</span><span>{tl(res.nominal)}</span></div>
          <div className="fi-res-row"><span>Yıllık reel getiri</span><span style={{ color: res.realRate >= 0 ? "#EFB9C2" : "#F0A594" }}>%{num(res.realRate, 2)}</span></div>
          <div className="fi-res-row"><span>Getiri olmasaydı kayıp</span><span>{tl(res.loss)}</span></div>
        </>
      ) : <p style={{ color: "#C4B7AC", margin: 0 }}>Tutar ve enflasyon oranını girin.</p>}
    >
      <Field label="Tutar (TL)" value={amt} onChange={(e) => { setAmt(e.target.value); t(false); }} />
      <Field label="Yıllık enflasyon oranı (%)" placeholder="örn. 35" value={inf} onChange={(e) => { setInf(e.target.value); t(false); }} />
      <Field label="Yıllık nominal getiri oranı (%)" hint="Getiri elde etmiyorsanız boş bırakın." placeholder="örn. 40" value={ret} onChange={(e) => { setRet(e.target.value); t(false); }} />
      <Field label="Süre (yıl)" value={yr} onChange={(e) => { setYr(e.target.value); t(false); }} />
    </CalcShell>
  );
}

/* --- Araç 6: Toplam maliyet karşılaştırma (kredi vs tasarruf finansmanı) --- */
function CalcKarsilastir({ tool, compact }) {
  const [amt, setAmt] = useState("1000000");
  // Banka kredisi tarafı
  const [kr, setKr] = useState("2,50");
  const [kn, setKn] = useState("36");
  const [kMasraf, setKMasraf] = useState("0");
  // Tasarruf finansmanı tarafı
  const [tOrg, setTOrg] = useState("");
  const [tn, setTn] = useState("60");
  const [tMasraf, setTMasraf] = useState("0");
  const t = useCalcTracking("toplam_maliyet_karsilastirma");

  const res = useMemo(() => {
    const P0 = toNum(amt);
    if (P0 <= 0) return null;

    // Banka kredisi: anüite + KKDF %15 + BSMV %10
    const i = (toNum(kr) / 100) * 1.25;
    const n1 = Math.max(1, Math.round(toNum(kn)));
    let kredi = null;
    if (i > 0) {
      const k = Math.pow(1 + i, n1);
      const inst = (P0 * i * k) / (k - 1);
      const total = inst * n1 + toNum(kMasraf);
      kredi = { inst, total, cost: total - P0 };
    }

    // Tasarruf finansmanı: anapara + organizasyon ücreti, taksite bölünür
    const org = toNum(tOrg);
    const n2 = Math.max(1, Math.round(toNum(tn)));
    let tasarruf = null;
    if (org > 0) {
      const orgTutar = P0 * (org / 100);
      const total = P0 + orgTutar + toNum(tMasraf);
      tasarruf = { inst: total / n2, total, cost: total - P0, orgTutar };
    }

    return { P0, kredi, tasarruf, fark: kredi && tasarruf ? kredi.total - tasarruf.total : null };
  }, [amt, kr, kn, kMasraf, tOrg, tn, tMasraf]);

  useEffect(() => { if (res && res.kredi && res.tasarruf) t(true); }, [res, t]);

  return (
    <CalcShell tool={tool} compact={compact}
      note="Tasarruf finansmanında teslimat zamanı sözleşmeye bağlıdır ve bu hesaplamaya dahil edilemez. İki yöntem yalnızca maliyet açısından karşılaştırılır; paraya ne zaman ulaşacağınız ayrı bir karar kriteridir."
      out={res ? (
        <>
          {res.kredi && (
            <>
              <div className="fi-res-k">Banka kredisi</div>
              <div className="fi-res-row"><span>Aylık taksit</span><span>{tl(res.kredi.inst)}</span></div>
              <div className="fi-res-row"><span>Toplam geri ödeme</span><span>{tl(res.kredi.total)}</span></div>
              <div className="fi-res-row" style={{ borderBottom: "1px solid rgba(255,255,255,.14)", paddingBottom: 14, marginBottom: 14 }}>
                <span>Toplam maliyet</span><span>{tl(res.kredi.cost)}</span>
              </div>
            </>
          )}
          {res.tasarruf ? (
            <>
              <div className="fi-res-k">Tasarruf finansmanı</div>
              <div className="fi-res-row"><span>Aylık taksit</span><span>{tl(res.tasarruf.inst)}</span></div>
              <div className="fi-res-row"><span>Organizasyon ücreti</span><span>{tl(res.tasarruf.orgTutar)}</span></div>
              <div className="fi-res-row"><span>Toplam ödeme</span><span>{tl(res.tasarruf.total)}</span></div>
            </>
          ) : (
            <p style={{ color: "#C4B7AC", fontSize: 13.5, margin: "8px 0 0" }}>
              Karşılaştırma için teklifinizdeki organizasyon ücreti oranını girin.
            </p>
          )}
          {res.fark != null && (
            <div className="fi-res-main" style={{ borderBottom: 0, borderTop: "1px solid rgba(255,255,255,.14)", paddingTop: 16, marginTop: 16, marginBottom: 0 }}>
              <div className="fi-res-k">Toplam ödeme farkı</div>
              <div className="fi-res-v" style={{ fontSize: 24 }}>
                {tl(Math.abs(res.fark))}
              </div>
              <p style={{ fontSize: 13, color: "#C4B7AC", margin: "8px 0 0" }}>
                {res.fark > 0 ? "Tasarruf finansmanı bu senaryoda daha düşük toplam ödeme üretiyor." : "Banka kredisi bu senaryoda daha düşük toplam ödeme üretiyor."}
              </p>
            </div>
          )}
        </>
      ) : <p style={{ color: "#C4B7AC", margin: 0 }}>Finansman tutarını girin.</p>}
    >
      <Field label="Finansman tutarı (TL)" value={amt} onChange={(e) => { setAmt(e.target.value); t(false); }} />
      <p style={{ font: "600 11px/1 var(--mono)", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", margin: "6px 0 0" }}>Banka kredisi</p>
      <Field label="Aylık faiz oranı (%)" hint="Bankanızın teklif ettiği oran." value={kr} onChange={(e) => { setKr(e.target.value); t(false); }} />
      <Field label="Vade (ay)" value={kn} onChange={(e) => { setKn(e.target.value); t(false); }} />
      <Field label="Masraflar (TL)" hint="Dosya, tahsis ve zorunlu sigorta toplamı." value={kMasraf} onChange={(e) => { setKMasraf(e.target.value); t(false); }} />
      <p style={{ font: "600 11px/1 var(--mono)", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", margin: "10px 0 0" }}>Tasarruf finansmanı</p>
      <Field label="Organizasyon ücreti oranı (%)" hint="Sözleşmenizde yazan oranı girin. Bu alan boşken karşılaştırma yapılmaz." placeholder="örn. 12" value={tOrg} onChange={(e) => { setTOrg(e.target.value); t(false); }} />
      <Field label="Toplam sözleşme süresi (ay)" hint="Birikim ve geri ödeme dönemlerinin toplamı." value={tn} onChange={(e) => { setTn(e.target.value); t(false); }} />
      <Field label="Diğer masraflar (TL)" value={tMasraf} onChange={(e) => { setTMasraf(e.target.value); t(false); }} />
    </CalcShell>
  );
}

const TOOLS = [
  { id: "kredi", name: "Kredi taksit hesaplama", short: "Kredi taksiti", desc: "Anapara, faiz ve vadeye göre aylık taksiti ve toplam geri ödemeyi hesaplayın.", C: CalcKredi, ready: true },
  { id: "mevduat", name: "Mevduat getirisi hesaplama", short: "Mevduat getirisi", desc: "Vade sonunda elinize geçecek net tutarı stopaj dahil görün.", C: CalcMevduat, ready: true },
  { id: "asgari", name: "Kredi kartı asgari ödeme", short: "Asgari ödeme", desc: "Asgari tutarı, devreden bakiyeyi ve bir aylık faiz yükünü hesaplayın.", C: CalcAsgari, ready: true },
  { id: "kira", name: "Kira artışı hesaplama", short: "Kira artışı", desc: "Yenileme döneminde uygulanacak yeni kira tutarını hesaplayın.", C: CalcKira, ready: true },
  { id: "enflasyon", name: "Enflasyon etkisi hesaplama", short: "Enflasyon etkisi", desc: "Birikiminizin alım gücündeki değişimi ve reel getiriyi ölçün.", C: CalcEnflasyon, ready: true },
  { id: "karsilastir", name: "Kredi ve tasarruf finansmanı karşılaştırma", short: "Finansman karşılaştır", desc: "Banka kredisi ile tasarruf finansmanının toplam maliyetini yan yana görün.", C: CalcKarsilastir, ready: true },
  { id: "borc", name: "Borç kapatma planlayıcısı", short: "Borç planlayıcı", desc: "Çığ ve kartopu yöntemlerini kendi borç listenizle karşılaştırın.", ready: false },
  { id: "maas", name: "Net–brüt maaş hesaplama", short: "Net–brüt maaş", desc: "Güncel vergi dilimleri ve kesinti oranları bağlandığında yayına alınacak.", ready: false },
  { id: "altin", name: "Altın kâr/zarar hesaplama", short: "Altın kâr/zarar", desc: "Alış ve satış fiyatı ile makas dahil sonucu hesaplayın.", ready: false },
];
const toolById = (id) => TOOLS.find((t) => t.id === id);

/* --------------------------------------------------------- 12. ORTAK PARÇALAR */

function MarketTicker({ market }) {
  const { status, items } = market;

  if (status === "loading") {
    return (
      <div className="fi-ticker">
        <div className="fi-wrap"><div className="fi-ticker-in"><span className="fi-tick-k" style={{ padding: "10px 0" }}>Piyasa verileri yükleniyor…</span></div></div>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="fi-ticker">
        <div className="fi-wrap"><div className="fi-ticker-in"><span className="fi-tick-k" style={{ padding: "10px 0" }}>Piyasa verisi şu an alınamıyor</span></div></div>
      </div>
    );
  }

  return (
    <div className="fi-ticker">
      <div className="fi-wrap">
        <div className="fi-ticker-in" role="region" aria-label="Piyasa göstergeleri">
          {items.map((d) => (
            <div className="fi-tick" key={d.k}>
              <span className="fi-tick-k">{d.k}</span>
              <span className="fi-tick-v">{d.unit === "$" ? "$" : ""}{num(d.v, d.v > 1000 ? 0 : 2)}{d.unit === "₺" ? " ₺" : ""}</span>
              {d.d != null && Math.abs(d.d) >= 0.005 && (
                <span className={`fi-tick-d ${d.d >= 0 ? "fi-up" : "fi-down"}`}>
                  {d.d >= 0 ? "▲" : "▼"} %{num(Math.abs(d.d), 2)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Ana sayfadaki büyük, okunabilir piyasa paneli.
   Şeritten farkı: her gösterge ayrı kart, rakamlar büyük,
   değişim yönü hem renk hem ok hem işaretle veriliyor (renk körlüğü için). */
function MarketPanel({ market }) {
  const { status, items, updatedAt, tcmbDate } = market;

  if (status === "loading") {
    return (
      <div className="fi-mkt-grid">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div className="fi-mkt-card fi-skel" key={i}><div className="fi-skel-l" /><div className="fi-skel-b" /></div>
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="fi-panel" style={{ textAlign: "center", padding: "36px 24px" }}>
        <p style={{ margin: "0 0 6px", fontWeight: 600, color: "var(--ink)" }}>Piyasa verisi şu an alınamıyor</p>
        <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>
          Sağlayıcıdan yanıt gelmedi. Bu alanda tahmini ya da eski veri göstermiyoruz.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="fi-mkt-grid">
        {items.map((d) => {
          const up = d.d != null && d.d >= 0;
          return (
            <div className="fi-mkt-card" key={d.k}>
              <div className="fi-mkt-k">{d.k}</div>
              <div className="fi-mkt-v">
                {d.unit === "$" ? "$" : ""}{num(d.v, d.v >= 1000 ? 0 : 2)}{d.unit === "₺" ? <span className="fi-mkt-u">₺</span> : ""}
              </div>
              {d.d != null && Math.abs(d.d) >= 0.005 && (
                <div className={`fi-mkt-d ${up ? "up" : "down"}`}>
                  <span aria-hidden="true">{up ? "▲" : "▼"}</span>
                  {up ? "+" : "−"}%{num(Math.abs(d.d), 2)}
                  <span className="fi-hidden">{up ? "yükseliş" : "düşüş"}</span>
                </div>
              )}
              {d.alis != null && d.satis != null && d.alis !== d.satis && (
                <div className="fi-mkt-s">
                  Alış {num(d.alis, d.alis >= 1000 ? 0 : 2)} · Satış {num(d.satis, d.satis >= 1000 ? 0 : 2)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="fi-mkt-note">
        Döviz: TCMB resmî kuru{tcmbDate ? ` (${tcmbDate})` : ""}. Değişim, bir önceki iş gününün resmî kuruna göre hesaplanmıştır.
        Kıymetli maden: serbest piyasa verisi. Son çekim: {updatedAt ? new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(updatedAt)) : "—"}.
        Bankalar ve kuyumcularda uygulanan fiyatlar bu değerlerden farklılık gösterir.
      </p>
    </>
  );
}

function Logo({ go }) {
  return (
    <button className="fi-logo" onClick={() => go({ n: "home" })} aria-label="FinansIndex ana sayfa">
      <svg className="fi-logo-m" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="3" fill="#2A211E" />
        <path d="M7 22.5V9.5h11v3.1H10.6v2.5h6.5v3.1h-6.5v4.3z" fill="#fff" />
        <rect x="20.6" y="9.5" width="3.2" height="13" fill="#B5485C" />
      </svg>
      <span className="fi-logo-t">Finans<em>Index</em></span>
    </button>
  );
}

function Header({ route, go, onSearch, market }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const nav = (r, label) => { track("category_click", { article_category: label, traffic_source: "header" }); go(r); close(); };

  return (
    <>
      <MarketTicker market={market} />
      <header className="fi-hd">
        <div className="fi-wrap">
          <div className="fi-hd-top">
            <Logo go={go} />
            <span className="fi-tag">Paranı anlamanın daha kolay yolu</span>
            <div className="fi-hd-acts">
              <button className="fi-ico" onClick={onSearch} aria-label="Sitede ara">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="m13.5 13.5 4 4" strokeLinecap="round" /></svg>
              </button>
              <button className="fi-btn fi-btn-o" onClick={() => go({ n: "tools" })} style={{ display: "inline-flex" }}>Araçlar</button>
              <button className="fi-btn fi-btn-g" onClick={() => go({ n: "home", hash: "bulten" })}>Bültene katıl</button>
              <button className="fi-ico fi-burger" onClick={() => setOpen(true)} aria-label="Menüyü aç" aria-expanded={open}>
                <svg width="20" height="20" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" /></svg>
              </button>
            </div>
          </div>
          <nav className="fi-nav" aria-label="Kategoriler">
            {CATEGORIES.map((c) => (
              <button key={c.slug}
                aria-current={route.n === "category" && route.slug === c.slug ? "page" : undefined}
                onClick={() => nav({ n: "category", slug: c.slug }, c.name)}>{c.name}</button>
            ))}
            <button aria-current={route.n === "tools" ? "page" : undefined} onClick={() => nav({ n: "tools" }, "Finansal Araçlar")}>Finansal Araçlar</button>
          </nav>
        </div>
      </header>

      <div className={`fi-drawer ${open ? "on" : ""}`} role="dialog" aria-modal="true" aria-label="Menü" hidden={!open}>
        <div className="fi-drawer-bg" onClick={close} />
        <div className="fi-drawer-pan">
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <Logo go={(r) => { go(r); close(); }} />
            <button className="fi-ico" style={{ marginLeft: "auto" }} onClick={close} aria-label="Menüyü kapat">
              <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" /></svg>
            </button>
          </div>
          {CATEGORIES.map((c) => (
            <button className="fi-dl" key={c.slug} onClick={() => nav({ n: "category", slug: c.slug }, c.name)}>{c.name}</button>
          ))}
          <button className="fi-dl" onClick={() => nav({ n: "tools" }, "Finansal Araçlar")}>Finansal Araçlar</button>
          <button className="fi-dl" onClick={() => { go({ n: "mediakit" }); close(); }}>Reklam ve İş Birlikleri</button>
          <button className="fi-btn fi-btn-g" style={{ marginTop: 16 }} onClick={() => { go({ n: "home", hash: "bulten" }); close(); }}>Bültene katıl</button>
        </div>
      </div>
    </>
  );
}

function SearchOverlay({ onClose, go }) {
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return ARTICLES.filter((a) =>
      (a.title + " " + a.summary + " " + a.tags.join(" ") + " " + catName(a.category)).toLowerCase().includes(t)
    ).slice(0, 6);
  }, [q]);

  const submit = () => {
    if (q.trim().length < 2) return;
    track("search", { page_type: "search", search_term_length: q.trim().length });
    go({ n: "search", q: q.trim() });
    onClose();
  };

  return (
    <div className="fi-so" role="dialog" aria-modal="true" aria-label="Arama" onClick={(e) => e.target.classList.contains("fi-so") && onClose()}>
      <div className="fi-so-box">
        <label htmlFor="fi-q" className="fi-hidden">Arama terimi</label>
        <input id="fi-q" ref={ref} value={q} placeholder="Konu, kategori veya anahtar kelime arayın"
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }} />
        {q.trim().length >= 2 && (
          <div style={{ marginTop: 14 }}>
            {results.length === 0
              ? <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>Eşleşen içerik bulunamadı. Farklı bir kelime deneyin veya kategorilere göz atın.</p>
              : results.map((a) => (
                <button key={a.id} className="fi-rail-i" onClick={() => { track("search", { page_type: "search", traffic_source: "overlay" }); go({ n: "article", slug: a.slug }); onClose(); }}>
                  <div className="fi-meta"><span className="fi-cat">{catName(a.category)}</span></div>
                  <p className="fi-rail-t">{a.title}</p>
                </button>
              ))}
            <button className="fi-btn fi-btn-p" style={{ marginTop: 14, width: "100%" }} onClick={submit}>Tüm sonuçları gör</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Newsletter({ compact = false, pageType }) {
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const [state, setState] = useState({ msg: "", type: "" });

  const submit = () => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    if (!valid) { setState({ msg: "Geçerli bir e-posta adresi girin. Örnek: ad@example.com", type: "err" }); return; }
    if (!ok) { setState({ msg: "Devam etmek için aydınlatma metnini onaylayın.", type: "err" }); return; }
    track("newsletter_signup", { page_type: pageType, content_type: "newsletter" });
    setState({ msg: "Kaydınız alındı. Onay bağlantısını e-postanıza gönderdik.", type: "ok" });
    setEmail("");
  };

  return (
    <div className={compact ? "fi-panel" : "fi-nl"} id="bulten">
      <div>
        <div className="fi-eyebrow">FinansIndex Bülten</div>
        <h2 style={compact ? { font: "600 20px/1.25 var(--serif)", color: "var(--navy)", margin: "8px 0 8px" } : undefined}>
          Ekonomiyi takip et, jargonun içinde kaybolma.
        </h2>
        <p style={compact ? { fontSize: 14, color: "var(--muted)", margin: 0 } : undefined}>
          Haftada bir, gelişmelerin bütçenize etkisini üç maddede özetliyoruz. Ürün tavsiyesi yok, reklam ayrı etiketli.
        </p>
        <AdSlot placementId="newsletter_sponsor" pageType={pageType} />
      </div>
      <div className="fi-nl-f">
        <label htmlFor={`nl-${compact}`} className="fi-hidden">E-posta adresiniz</label>
        <input id={`nl-${compact}`} type="email" placeholder="E-posta adresiniz" value={email}
          aria-invalid={state.type === "err" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())}
          style={compact ? { border: "1px solid var(--line-2)", background: "var(--surface)", color: "var(--ink)" } : undefined}
          onChange={(e) => { setEmail(e.target.value); setState({ msg: "", type: "" }); }}
          onKeyDown={(e) => e.key === "Enter" && submit()} />
        <label className="fi-consent" style={compact ? { color: "var(--muted)" } : undefined}>
          <input type="checkbox" checked={ok} onChange={(e) => { setOk(e.target.checked); setState({ msg: "", type: "" }); }} />
          <span>KVKK Aydınlatma Metni'ni okudum; e-posta adresimin bülten gönderimi amacıyla işlenmesini onaylıyorum. Dilediğim zaman abonelikten çıkabilirim.</span>
        </label>
        {state.msg && <p className={`fi-msg ${state.type}`} role="status">{state.msg}</p>}
        <button className="fi-btn fi-btn-g" onClick={submit}>Bültene katıl</button>
      </div>
    </div>
  );
}

const STATIC_PAGES = {
  hakkimizda: {
    title: "Hakkımızda",
    lead: "FinansIndex, ekonomi gelişmelerinin bireysel bütçelere etkisini sade bir dille anlatan bağımsız bir yayın platformudur.",
    body: [
      ["Ne yapıyoruz?", "Ekonomi haberlerini aktarmakla yetinmiyoruz. Her gelişmede tek bir soruya cevap arıyoruz: bu, okurun cebini ve finansal kararlarını nasıl etkiliyor? İçeriklerimizi bu soruyu merkeze alarak kuruyor, mümkün olan her yerde hesaplama araçlarıyla destekliyoruz."],
      ["Neyi yapmıyoruz?", "Kişiye özel yatırım tavsiyesi vermiyoruz, kesin kazanç vaadi içeren ifadeler kullanmıyoruz ve ürün sıralaması karşılığında ödeme kabul etmiyoruz. Sponsorlu içerikler editoryal içeriklerden ayrı etiketlenir."],
      ["Bağımsızlık", "Reklam ve iş birliği gelirleri editoryal kararları etkilemez. Sponsorlu içerikler de doğruluk kontrolünden geçer."],
      ["Şeffaflık", "İçeriklerimizin taslakları yapay zekâ desteğiyle hazırlanır. Bunu saklamıyoruz; her içeriğin altında nasıl hazırlandığı, hangi kaynaklardan doğrulandığı ve kimin yayına aldığı yazar. Finansal danışmanlık yetkimiz bulunmuyor, bu nedenle kişiye özel tavsiye vermiyoruz."],
    ],
  },
  kunye: {
    title: "Künye",
    lead: "Yayın sorumlulukları ve iletişim bilgileri.",
    body: [
      ["Yayın kurulu", "Genel yayın yönetmeni, sorumlu yazı işleri müdürü ve editör kadrosu bu alanda tam adlarıyla listelenir. Ticari unvan, adres, ticaret sicil numarası ve KEP adresi yayına geçiş öncesi eklenecektir."],
      ["İletişim", "Editoryal konular, düzeltme talepleri ve iş birliği başvuruları için ayrı e-posta adresleri kullanılır."],
    ],
  },
  "editoryal-ilkeler": {
    title: "Editoryal İlkeler",
    lead: "İçeriklerimizi hangi kurallara göre hazırlıyor, doğruluyor ve yayımlıyoruz?",
    body: [
      ["Kaynak kullanımı", "Sayısal veriler yalnızca birincil kaynaklardan alınır: TCMB, TÜİK, KAP, BDDK, SPK, Resmî Gazete, Hazine ve Maliye Bakanlığı, bankaların resmî sayfaları ve lisanslı veri sağlayıcıları. İkincil kaynaklardan alınan bilgi, birincil kaynakla teyit edilmeden yayımlanmaz."],
      ["Doğrulama", "Her içerikte kullanılan oran, tarih ve tutarlar kaynak belgeyle karşılaştırılır. Editör onayı olmayan içerik yayımlanmaz."],
      ["Yapay zekâ kullanımı", "FinansIndex içeriklerinin taslakları yapay zekâ desteğiyle hazırlanır ve bu durum her içeriğin altında açıkça belirtilir. Yapay zekâya girdi olarak yalnızca resmî kurumların yayımladığı ham belgeler verilir; başka yayınların içerikleri girdi olarak kullanılmaz, yeniden yazılarak yayımlanmaz. Taslaktaki her oran, tarih ve tutar kaynak belgeyle karşılaştırılarak doğrulanır. Hiçbir içerik bu doğrulama ve editör onayı tamamlanmadan yayına alınmaz."],
      ["Uzmanlık sınırımız", "FinansIndex bir yayın platformudur; yatırım danışmanlığı, hukuki danışmanlık veya mali müşavirlik hizmeti vermez ve bu alanlarda yetkilendirilmiş değildir. Editoryal işlevimiz, resmî kaynaklardaki bilgiyi doğrulayarak ve sadeleştirerek aktarmaktır. Kişisel finansal kararlarınız için yetkili kurum ve danışmanlara başvurmanızı öneririz."],
      ["Tavsiye sınırı", "Kişiye özel yatırım, hukuk veya vergi tavsiyesi vermeyiz. Gerekli içeriklerde uyarı metni gösterilir."],
    ],
  },
  "duzeltme-politikasi": {
    title: "Düzeltme Politikası",
    lead: "Hata yaptığımızda ne yapıyoruz?",
    body: [
      ["Bildirim", "Düzeltme talepleri iletişim sayfasındaki adrese iletilebilir. Talepler en geç iki iş günü içinde değerlendirilir."],
      ["Şeffaflık", "Maddi hata düzeltildiğinde içeriğin altına düzeltme notu eklenir; ne değiştiği ve ne zaman değiştiği yazılır. Yayın tarihi değiştirilmez, güncelleme tarihi ayrıca gösterilir."],
      ["Arama motoru", "Sıralama amacıyla içerik tarihleri değiştirilmez."],
    ],
  },
  "reklam-politikasi": {
    title: "Reklam ve Sponsorlu İçerik Politikası",
    lead: "Ticari iş birliklerini nasıl yürütüyoruz?",
    body: [
      ["Etiketleme", "Sponsorlu tüm içerikler başlık üzerinde ve içerik kartlarında açıkça etiketlenir. Etiket kaldırılamaz veya küçültülemez."],
      ["Editoryal ayrım", "Sponsor, editoryal içeriklerin konusuna, sıralamasına veya içeriğine müdahale edemez. Sponsorlu içerikler de doğruluk kontrolünden geçer."],
      ["Kabul edilmeyenler", "Kesin kazanç vaadi, lisanssız finansal hizmet tanıtımı ve yanıltıcı karşılaştırma içeren reklamlar kabul edilmez."],
    ],
  },
  kvkk: {
    title: "KVKK Aydınlatma Metni",
    lead: "Kişisel verilerinizi hangi amaçla işliyoruz?",
    body: [
      ["İşlenen veriler", "Bülten aboneliğinde e-posta adresi; iletişim formunda ad, kurum ve iletişim bilgisi işlenir. Hesaplama araçlarına girdiğiniz finansal veriler sunucularımıza gönderilmez, yalnızca tarayıcınızda işlenir."],
      ["Analitik", "Açık rızanız olmadan hassas finansal bilgiler analitik sistemlerine aktarılmaz. Ölçümleme yalnızca sayfa ve etkileşim düzeyinde yapılır."],
      ["Haklarınız", "KVKK kapsamındaki bilgi edinme, düzeltme ve silme haklarınızı iletişim sayfasındaki adres üzerinden kullanabilirsiniz."],
    ],
  },
  "cerez-politikasi": {
    title: "Çerez Politikası",
    lead: "Hangi çerezleri, neden kullanıyoruz?",
    body: [
      ["Zorunlu çerezler", "Sitenin çalışması için gereklidir; devre dışı bırakılamaz."],
      ["Analitik çerezler", "Ziyaret ve etkileşim ölçümü için kullanılır, onayınıza bağlıdır."],
      ["Reklam çerezleri", "Reklam performansı ölçümü için kullanılabilir; ayrı onay alınır."],
    ],
  },
  "kullanim-kosullari": {
    title: "Kullanım Koşulları",
    lead: "Siteyi kullanırken geçerli olan koşullar.",
    body: [
      ["İçeriğin niteliği", "Sitedeki içerikler genel bilgilendirme amaçlıdır; yatırım, hukuk veya vergi danışmanlığı niteliği taşımaz."],
      ["Hesaplama araçları", "Araçlar gösterge niteliğinde sonuç üretir. Kurumların uyguladığı ücret, vergi ve koşullar farklılık gösterebilir."],
      ["Telif", "İçeriklerin izinsiz çoğaltılması ve yeniden yayımlanması yasaktır."],
    ],
  },
  iletisim: {
    title: "İletişim",
    lead: "Bize nasıl ulaşabilirsiniz?",
    body: [
      ["Editoryal", "Haber ihbarı, düzeltme talebi ve içerik önerileri için editoryal iletişim adresini kullanın."],
      ["Reklam ve iş birlikleri", "Medya planı ve fiyat listesi talepleri için Reklam ve İş Birlikleri sayfasındaki formu doldurabilirsiniz."],
      ["KVKK", "Kişisel veri başvuruları için ayrı bir başvuru kanalı kullanılır."],
    ],
  },
};

function Footer({ go }) {
  const [showLog, setShowLog] = useState(false);
  const log = useEventLog();
  const link = (label, r) => <li key={label}><button onClick={() => go(r)}>{label}</button></li>;

  return (
    <footer className="fi-ft">
      <div className="fi-wrap">
        <div className="fi-ft-g">
          <div className="fi-ft-about">
            <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="3" fill="#fff" fillOpacity=".1" />
              <path d="M7 22.5V9.5h11v3.1H10.6v2.5h6.5v3.1h-6.5v4.3z" fill="#fff" />
              <rect x="20.6" y="9.5" width="3.2" height="13" fill="#D98A98" />
            </svg>
            <p style={{ font: "600 20px/1.2 var(--serif)", color: "#fff", margin: "12px 0 0" }}>Paranı anlamanın daha kolay yolu.</p>
            <p>Ekonomi gelişmelerinin bütçenize, birikiminize ve borcunuza etkisini sade bir dille anlatıyoruz. Yatırım tavsiyesi vermiyoruz.</p>
          </div>
          <div>
            <h3>Kategoriler</h3>
            <ul>{CATEGORIES.slice(0, 6).map((c) => link(c.name, { n: "category", slug: c.slug }))}</ul>
          </div>
          <div>
            <h3>Kurumsal</h3>
            <ul>
              {link("Hakkımızda", { n: "static", slug: "hakkimizda" })}
              {link("Künye", { n: "static", slug: "kunye" })}
              {link("İletişim", { n: "static", slug: "iletisim" })}
              {link("Reklam ve İş Birlikleri", { n: "mediakit" })}
              {link("Finansal Araçlar", { n: "tools" })}
            </ul>
          </div>
          <div>
            <h3>Yayın ilkeleri</h3>
            <ul>
              {link("Editoryal İlkeler", { n: "static", slug: "editoryal-ilkeler" })}
              {link("Düzeltme Politikası", { n: "static", slug: "duzeltme-politikasi" })}
              {link("Reklam Politikası", { n: "static", slug: "reklam-politikasi" })}
              {link("KVKK Aydınlatma Metni", { n: "static", slug: "kvkk" })}
              {link("Çerez Politikası", { n: "static", slug: "cerez-politikasi" })}
              {link("Kullanım Koşulları", { n: "static", slug: "kullanim-kosullari" })}
            </ul>
          </div>
        </div>
        <div className="fi-ft-bot">
          <span>© {new Date().getFullYear()} FinansIndex</span>
          <span>·</span>
          <span>İçerikler genel bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.</span>
          <button className="fi-devlog" onClick={() => setShowLog((s) => !s)} aria-expanded={showLog}>
            Ölçümleme günlüğü ({log.length})
          </button>
        </div>
        {showLog && (
          <div className="fi-log" role="region" aria-label="Ölçümleme günlüğü">
            {log.length === 0 ? "Henüz olay yok. Sayfada gezinin, araç kullanın veya bülten formunu deneyin."
              : log.map((e, i) => (
                <div key={i}><b>{e.event}</b> {Object.entries(e).filter(([k]) => !["event", "ts"].includes(k)).map(([k, v]) => `${k}=${v}`).join("  ")}</div>
              ))}
          </div>
        )}
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------- 13. ANA SAYFA */

function Home({ go, market }) {
  useSeo({
    title: "FinansIndex — Paranı anlamanın daha kolay yolu",
    description: "Ekonomi ve finans gelişmelerinin bütçenize etkisini sade bir dille anlatıyoruz. Kredi, mevduat, yatırım ve sigorta rehberleri, çalışan hesaplama araçları.",
    path: "/",
  });
  useEffect(() => { track("article_view", { page_type: "home", content_type: "home" }); }, []);

  const [filter, setFilter] = useState("hepsi");
  const [homeCalc, setHomeCalc] = useState("kredi");
  const activeCalc = toolById(homeCalc);
  const hero = byId("a1");
  const side = ["a12", "a2", "a11"].map(byId);
  const feed = useMemo(() => {
    const list = ARTICLES.filter((a) => a.id !== hero.id);
    return filter === "hepsi" ? list : list.filter((a) => a.category === filter);
  }, [filter, hero.id]);

  return (
    <main id="icerik">
      <div className="fi-wrap">
        <AdSlot placementId="home_top_banner" pageType="home" className="fi-sec" />

        {/* Manşet — dekoratif görsel yok. Editoryal hiyerarşi tipografiyle kurulur. */}
        <section className="fi-lead" aria-label="Manşet">
          <div className="fi-lead-main">
            <button className="fi-a" onClick={() => go({ n: "article", slug: hero.slug })}>
              <div className="fi-meta">
                <span className="fi-cat">{catName(hero.category)}</span><span className="fi-dot" />
                <span className="fi-badge fi-b-type">{hero.contentType}</span><span className="fi-dot" />
                <span>{dateTR(hero.published_at)}</span><span className="fi-dot" /><span>{hero.read} dk</span>
              </div>
              <h1 className="fi-lead-t fi-ttl">{hero.title}</h1>
              <p className="fi-lead-s">{hero.summary}</p>
            </button>

            {hero.keyStat && (
              <div className="fi-lead-stat">
                <div className="fi-lead-stat-v">{hero.keyStat.v}<span>{hero.keyStat.unit}</span></div>
                <div className="fi-lead-stat-b">
                  <p>{hero.keyStat.k}</p>
                  {hero.keyStat.sub && <span>{hero.keyStat.sub}</span>}
                </div>
              </div>
            )}

            <div className="fi-lead-acts">
              <button className="fi-btn fi-btn-p" onClick={() => go({ n: "article", slug: hero.slug })}>Yazıyı oku</button>
              {hero.related_tool && (
                <button className="fi-btn fi-btn-o" onClick={() => go({ n: "tools", tool: hero.related_tool })}>
                  {toolById(hero.related_tool)?.short} hesapla →
                </button>
              )}
            </div>
          </div>

          <div className="fi-lead-side">
            <h2 className="fi-side-h">Öne çıkanlar</h2>
            {side.map((a) => (
              <button className="fi-a fi-side-i" key={a.id} onClick={() => go({ n: "article", slug: a.slug })}>
                <div className="fi-meta"><span className="fi-cat">{catName(a.category)}</span></div>
                <h3 className="fi-side-t fi-ttl">{a.title}</h3>
                {a.hook && <p className="fi-side-hook">{a.hook}</p>}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* İMZA BÖLÜM: Cep Etkisi Defteri */}
      <div className="fi-wrap">
        <section className="fi-sec" aria-labelledby="ledger-h">
          <div className="fi-ledger">
            <div className="fi-ledger-hd">
              <div>
                <div className="fi-eyebrow">Cep Etkisi Defteri</div>
                <h2 id="ledger-h">Bugün cebini etkileyenler</h2>
                <p>Günün gelişmeleri, bütçenize dokunduğu yerden anlatılıyor. Her madde bir hesaplama aracına bağlanır.</p>
              </div>
              <div className="fi-ledger-date">{dateTR(new Date().toISOString())}</div>
            </div>
            {LEDGER.map((l, i) => {
              const a = byId(l.article); const tool = toolById(l.tool);
              return (
                <div className="fi-le" key={i}>
                  <div className="fi-le-n">{String(i + 1).padStart(2, "0")}</div>
                  <div className="fi-le-b">
                    <div className="fi-le-tags">
                      {l.tags.map((t) => <span className={`fi-le-tag ${l.warn ? "warn" : ""}`} key={t}>{t}</span>)}
                    </div>
                    <p className="fi-le-q">Ne oldu?</p>
                    <p className="fi-le-what">{l.what}</p>
                    <p className="fi-le-q">Seni nasıl etkileyebilir?</p>
                    <p className="fi-le-how">{l.how}</p>
                    <div className="fi-le-acts">
                      <button className="fi-le-lnk" onClick={() => { track("related_article_click", { article_id: a.id, traffic_source: "cep_etkisi" }); go({ n: "article", slug: a.slug }); }}>Detayları oku</button>
                      {tool && <button className="fi-le-lnk calc" onClick={() => go({ n: "tools", tool: tool.id })}>{tool.short} hesapla →</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Piyasa paneli */}
      <div className="fi-wrap">
        <section className="fi-sec" aria-labelledby="mkt-h">
          <div className="fi-sh">
            <div>
              <div className="fi-eyebrow">Canlı piyasa</div>
              <h2 className="fi-h2" id="mkt-h">Döviz ve kıymetli maden</h2>
            </div>
          </div>
          <MarketPanel market={market} />
        </section>

        {/* HESAPLAYICILAR — sayfanın üst sırasında, çalışır hâlde */}
        <section className="fi-sec" aria-labelledby="calc-h">
          <div className="fi-calcband">
            <div className="fi-calcband-hd">
              <div>
                <div className="fi-eyebrow">Hesapla</div>
                <h2 id="calc-h">Karar vermeden önce rakamı görün</h2>
                <p>Oranları siz girersiniz. Girdiğiniz hiçbir veri sunucularımıza gönderilmez, hesaplama tarayıcınızda yapılır.</p>
              </div>
              <button className="fi-more" onClick={() => go({ n: "tools" })}>Tüm araçlar →</button>
            </div>
            <div className="fi-calcband-tabs" role="tablist" aria-label="Hesaplama aracı seçimi">
              {TOOLS.filter((t) => t.ready).map((t) => (
                <button key={t.id} role="tab" aria-selected={homeCalc === t.id}
                  onClick={() => { setHomeCalc(t.id); track("calculator_start", { calculator_type: t.id, page_type: "home", traffic_source: "home_band" }); }}>
                  {t.short}
                </button>
              ))}
            </div>
            {activeCalc && <activeCalc.C tool={activeCalc} compact />}
          </div>
        </section>
      </div>

      <div className="fi-wrap">
        {/* Güncel içerikler + sağ sütun */}
        <section className="fi-sec" aria-labelledby="feed-h">
          <div className="fi-sh">
            <div>
              <div className="fi-eyebrow">Güncel</div>
              <h2 className="fi-h2" id="feed-h">Son içerikler</h2>
            </div>
          </div>
          <div className="fi-filters" role="group" aria-label="Kategori filtresi">
            <button className="fi-chip" aria-pressed={filter === "hepsi"} onClick={() => setFilter("hepsi")}>Hepsi</button>
            {CATEGORIES.slice(0, 6).map((c) => (
              <button className="fi-chip" key={c.slug} aria-pressed={filter === c.slug}
                onClick={() => { setFilter(c.slug); track("category_click", { article_category: c.name, traffic_source: "home_filter" }); }}>{c.name}</button>
            ))}
          </div>
          <div className="fi-2col">
            <div className="fi-grid fi-g3" style={{ alignContent: "start" }}>
              {feed.length === 0 && (
                <div className="fi-empty" style={{ gridColumn: "1/-1" }}>
                  <h2>Bu kategoride henüz içerik yok</h2>
                  <p>Filtreyi temizleyerek tüm içeriklere dönebilirsiniz.</p>
                  <button className="fi-btn fi-btn-p" onClick={() => setFilter("hepsi")}>Filtreyi temizle</button>
                </div>
              )}
              {feed.map((a, i) => (
                <React.Fragment key={a.id}>
                  <ArticleCard a={a} go={go} source="home_feed" />
                  {i === 2 && <AdSlot placementId="home_native_01" pageType="home" />}
                </React.Fragment>
              ))}
            </div>
            <aside>
              <div className="fi-sticky">
                <AdSlot placementId="desktop_sidebar_sticky" pageType="home" />
                <div style={{ marginTop: 26 }}>
                  <h3 className="fi-rail-h">Rehberler</h3>
                  {GUIDES.map((g) => {
                    const a = byId(g.id);
                    return (
                      <button className="fi-rail-i" key={g.id} onClick={() => go({ n: "article", slug: a.slug })}>
                        <div className="fi-meta"><span style={{ color: "var(--gold)" }}>{g.label}</span></div>
                        <p className="fi-rail-t">{a.title}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Rehberler şeridi */}
        <section className="fi-sec" aria-labelledby="guide-h">
          <div className="fi-sh">
            <div>
              <div className="fi-eyebrow">Kalıcı içerikler</div>
              <h2 className="fi-h2" id="guide-h">Temel finans rehberleri</h2>
              <p className="fi-sub">Güncelliğini uzun süre koruyan, adım adım ilerleyen başvuru içerikleri.</p>
            </div>
          </div>
          <div className="fi-grid fi-g4">
            {GUIDES.map((g) => {
              const a = byId(g.id);
              return (
                <button className="fi-guide fi-a" key={g.id} onClick={() => go({ n: "article", slug: a.slug })}>
                  <span>{g.label}</span>
                  <h3 className="fi-ttl" style={{ font: "600 17px/1.3 var(--serif)", margin: "8px 0 6px" }}>{a.title}</h3>
                  <p>{a.read} dk okuma · {catName(a.category)}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Dosya */}
        <section className="fi-sec" aria-labelledby="dossier-h">
          <div className="fi-dossier">
            <div className="fi-dossier-b">
              <div className="fi-eyebrow">FinansIndex Dosya · {DOSSIER.eyebrow}</div>
              <h3 id="dossier-h">{DOSSIER.title}</h3>
              <p>{DOSSIER.desc}</p>
              <ul className="fi-dossier-parts">
                {DOSSIER.parts.map((p) => <li key={p.n}><b>{p.n}</b><span>{p.t}</span></li>)}
              </ul>
              <button className="fi-btn fi-btn-g" onClick={() => go({ n: "category", slug: "finansindex-dosya" })}>Dosyayı incele</button>
            </div>
          </div>
        </section>

        {/* Sponsorlu içerikler */}
        <section className="fi-sec" aria-labelledby="spon-h">
          <div className="fi-sh">
            <div>
              <div className="fi-eyebrow" style={{ color: "var(--gold)" }}>Ticari iş birliği</div>
              <h2 className="fi-h2" id="spon-h">Sponsorlu içerikler</h2>
              <p className="fi-sub">Bu alandaki içerikler marka iş birliğiyle hazırlanır ve editoryal içeriklerden ayrı etiketlenir.</p>
            </div>
            <button className="fi-more" onClick={() => go({ n: "mediakit" })}>Reklam ve iş birlikleri →</button>
          </div>
          <div className="fi-grid fi-g3">
            {ARTICLES.filter((a) => a.sponsored).map((a) => <ArticleCard key={a.id} a={a} go={go} source="sponsored_row" />)}
            <AdSlot placementId="home_native_01" pageType="home" />
          </div>
        </section>

        {/* Bülten */}
        <section className="fi-sec"><Newsletter pageType="home" /></section>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------- 14. KATEGORİ SAYFASI */

function Category({ slug, go }) {
  const cat = CATEGORIES.find((c) => c.slug === slug);
  const list = ARTICLES.filter((a) => a.category === slug);
  useSeo({
    title: `${cat?.name || "Kategori"} haberleri ve rehberleri | FinansIndex`,
    description: cat?.desc || "",
    path: `/${slug}`,
    jsonLd: {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana sayfa", item: SITE.url },
        { "@type": "ListItem", position: 2, name: cat?.name, item: `${SITE.url}/${slug}` },
      ],
    },
  });
  useEffect(() => { track("article_view", { page_type: "category", article_category: cat?.name }); }, [cat]);

  if (!cat) return <NotFound go={go} />;

  return (
    <main id="icerik">
      <div className="fi-wrap">
        <div className="fi-page-hd">
          <nav className="fi-bc" aria-label="Konum"><button onClick={() => go({ n: "home" })}>Ana sayfa</button><span>/</span><span>{cat.name}</span></nav>
          <div className="fi-eyebrow">Kategori</div>
          <h1>{cat.name}</h1>
          <p>{cat.desc}</p>
          <AdSlot placementId="category_sponsor" pageType="category" className="" />
        </div>
        <section className="fi-sec" style={{ borderTop: 0 }}>
          <div className="fi-2col">
            <div className="fi-grid fi-g3" style={{ alignContent: "start" }}>
              {list.length === 0 ? (
                <div className="fi-empty" style={{ gridColumn: "1/-1" }}>
                  <h2>Bu kategoride yayın hazırlanıyor</h2>
                  <p>İlk içerikler yayımlandığında haberdar olmak için bültene katılabilirsiniz.</p>
                  <button className="fi-btn fi-btn-p" onClick={() => go({ n: "home", hash: "bulten" })}>Bültene katıl</button>
                </div>
              ) : list.map((a) => <ArticleCard key={a.id} a={a} go={go} source="category" />)}
            </div>
            <aside><div className="fi-sticky"><AdSlot placementId="desktop_sidebar_sticky" pageType="category" /></div></aside>
          </div>
        </section>
        <section className="fi-sec"><Newsletter pageType="category" /></section>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------ 15. MAKALE SAYFASI */

function Article({ slug, go }) {
  const a = bySlug(slug);
  const bodyRef = useRef(null);
  const marks = useRef({ 50: false, 90: false });

  useSeo({
    title: a?.seo_title || "FinansIndex",
    description: a?.meta_description || "",
    path: `/${a?.category}/${slug}`,
    jsonLd: a ? {
      "@context": "https://schema.org", "@type": "Article",
      headline: a.title, description: a.summary,
      datePublished: a.published_at, dateModified: a.updated_at,
      author: { "@type": "Person", name: AUTHORS[a.author].name, jobTitle: AUTHORS[a.author].role },
      publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
      articleSection: catName(a.category), keywords: a.tags.join(", "),
      isAccessibleForFree: true,
    } : null,
  });

  useEffect(() => {
    if (!a) return;
    track("article_view", {
      page_type: "article", article_id: a.id, article_category: catName(a.category),
      author: AUTHORS[a.author].name, content_type: a.contentType,
      sponsor_name: a.sponsor_name || undefined,
    });
    marks.current = { 50: false, 90: false };
    const onScroll = () => {
      const el = bodyRef.current; if (!el) return;
      const top = el.getBoundingClientRect().top;
      const pct = Math.min(100, Math.max(0, ((window.innerHeight - top) / el.offsetHeight) * 100));
      [50, 90].forEach((m) => {
        if (pct >= m && !marks.current[m]) {
          marks.current[m] = true;
          track(`article_scroll_${m}`, { page_type: "article", article_id: a.id, article_category: catName(a.category) });
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [a]);

  if (!a) return <NotFound go={go} />;

  const author = AUTHORS[a.author];
  const heads = a.body.filter((b) => b.type === "h2");
  const tool = a.related_tool ? toolById(a.related_tool) : null;
  const related = ARTICLES.filter((x) => x.id !== a.id && (x.category === a.category || x.tags.some((t) => a.tags.includes(t)))).slice(0, 4);
  const inlineAt = Math.floor(a.body.length / 2);

  const share = (ch) => track("sponsor_click", { page_type: "article", article_id: a.id, placement_id: `share_${ch}` });

  return (
    <main id="icerik">
      <div className="fi-wrap">
        <div className="fi-art">
          <article>
            <nav className="fi-bc" aria-label="Konum">
              <button onClick={() => go({ n: "home" })}>Ana sayfa</button><span>/</span>
              <button onClick={() => go({ n: "category", slug: a.category })}>{catName(a.category)}</button><span>/</span>
              <span style={{ color: "var(--ink-2)" }}>{a.title.slice(0, 42)}…</span>
            </nav>

            {a.sponsored && (
              <div className="fi-sponnote">
                <strong>Sponsorlu içerik.</strong> Bu içerik {a.sponsor_name} iş birliğiyle hazırlanmıştır. Editoryal içeriklerden ayrıdır; ürün tavsiyesi içermez.
              </div>
            )}

            <div className="fi-meta">
              <span className="fi-cat">{catName(a.category)}</span><span className="fi-dot" />
              <span className="fi-badge fi-b-type">{a.contentType}</span>
            </div>
            <h1>{a.title}</h1>
            <p className="fi-spot">{a.summary}</p>

            <div className="fi-byline">
              <div className="fi-av" aria-hidden="true">{initials(author.name)}</div>
              <div>
                <div className="fi-byline-n">{author.name}</div>
                <div className="fi-byline-r">{author.role}</div>
                {author.bio && <div className="fi-byline-r" style={{ maxWidth: "40ch", marginTop: 2 }}>{author.bio}</div>}
              </div>
              <div style={{ borderLeft: "1px solid var(--line)", paddingLeft: 14, marginLeft: 4 }}>
                <div className="fi-byline-r">Yayın: {dateTR(a.published_at)}</div>
                {a.updated_at !== a.published_at && <div className="fi-byline-r">Güncelleme: {dateTR(a.updated_at)}</div>}
                <div className="fi-byline-r">{a.read} dakika okuma</div>
                <div className="fi-byline-r" style={{ color: "var(--petrol)", fontWeight: 600 }}>{AI_NOTE.short}</div>
              </div>
              <div className="fi-share">
                {[["X", "M4 4l12 12M16 4L4 16"], ["in", "M5 8v8M5 5.2v.1M9 16V8m0 3c0-2 5-2 5 0v5"], ["Bağlantı", "M8 12a3 3 0 0 1 0-4l2-2a3 3 0 1 1 4 4l-1 1"]].map(([l, d]) => (
                  <button key={l} aria-label={`${l} ile paylaş`} onClick={() => share(l)}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d={d} /></svg>
                  </button>
                ))}
              </div>
            </div>


            {heads.length > 1 && (
              <nav className="fi-toc" aria-label="İçindekiler">
                <h2>İçindekiler</h2>
                <ol>
                  {heads.map((h) => (
                    <li key={h.id}><button onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{h.t}</button></li>
                  ))}
                </ol>
              </nav>
            )}

            <div className="fi-body" ref={bodyRef}>
              {a.body.map((b, i) => (
                <React.Fragment key={i}>
                  {b.type === "h2" && <h2 id={b.id}>{b.t}</h2>}
                  {b.type === "p" && <p dangerouslySetInnerHTML={{ __html: b.t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />}
                  {b.type === "ul" && <ul>{b.items.map((it, j) => <li key={j} dangerouslySetInnerHTML={{ __html: it.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />)}</ul>}
                  {b.type === "quote" && <blockquote className="fi-quote">{b.t}</blockquote>}
                  {b.type === "note" && <p className="fi-disc" style={{ margin: "0 0 20px" }}><span className="fi-samp" style={{ marginRight: 8 }}>Örnek hesaplama</span>{b.t}</p>}
                  {b.type === "stats" && <StatRow items={b.items} caption={b.caption} />}
                  {b.type === "chart" && <BarChart title={b.title} unit={b.unit} rows={b.rows} caption={b.caption} highlight={b.highlight} note={b.note} />}
                  {b.type === "table" && (
                    <table className="fi-tbl">
                      <thead><tr>{b.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
                      <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
                    </table>
                  )}
                  {i === inlineAt && <AdSlot placementId="article_inline_01" pageType="article" className="" />}
                </React.Fragment>
              ))}

              <div className="fi-impact">
                <h3>Bu gelişme seni nasıl etkiliyor?</h3>
                <p>{a.impact.lead}</p>
                <ul>{a.impact.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
              </div>

              {tool && (
                <div className="fi-relcalc" style={{ margin: "26px 0" }}>
                  <div className="fi-eyebrow">İlgili araç</div>
                  <h3>{tool.name}</h3>
                  <p>{tool.desc}</p>
                  <button className="fi-btn fi-btn-g" onClick={() => go({ n: "tools", tool: tool.id })}>Aracı aç</button>
                </div>
              )}

              <div className="fi-src">
                <h3>Kaynaklar</h3>
                <ol>{a.source_urls.map((s, i) => <li key={i}>{s}</li>)}</ol>
              </div>

              <div className="fi-aibox">
                <h3>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M10 2.5 12 8l5.5 2-5.5 2-2 5.5-2-5.5L2.5 10 8 8z" strokeLinejoin="round" /></svg>
                  Nasıl hazırlandı?
                </h3>
                <p>{AI_NOTE.full}</p>
                <p>
                  <b>Doğrulayan:</b> {AUTHORS[a.reviewed_by]?.name || AUTHORS[a.author].name} · <b>Doğrulama tarihi:</b> {dateTR(a.updated_at)} · <b>Risk düzeyi:</b> {a.risk_level}
                </p>
              </div>

              {a.disclaimer && <p className="fi-disc">{DISCLAIMERS[a.disclaimer]}</p>}
              {a.correction_history?.length > 0 && (
                <div className="fi-corr"><strong>Düzeltme notu:</strong> {a.correction_history[0]}</div>
              )}
            </div>

            <AdSlot placementId="article_end" pageType="article" className="fi-sec" />

            <section className="fi-sec" aria-labelledby="rel-h">
              <div className="fi-sh"><h2 className="fi-h2" id="rel-h">İlgili içerikler</h2></div>
              <div className="fi-grid fi-g3">
                {related.slice(0, 3).map((r) => <ArticleCard key={r.id} a={r} go={go} source="article_related" />)}
              </div>
            </section>

            <section style={{ paddingBottom: 40 }}><Newsletter pageType="article" /></section>
          </article>

          <aside>
            <div className="fi-sticky fi-rail">
              <AdSlot placementId="desktop_sidebar_sticky" pageType="article" />
              <div>
                <h3 className="fi-rail-h">Çok okunanlar</h3>
                {ARTICLES.filter((x) => x.id !== a.id).slice(0, 5).map((x) => (
                  <button className="fi-rail-i" key={x.id} onClick={() => { track("related_article_click", { article_id: x.id, traffic_source: "sidebar" }); go({ n: "article", slug: x.slug }); }}>
                    <div className="fi-meta"><span className="fi-cat">{catName(x.category)}</span></div>
                    <p className="fi-rail-t">{x.title}</p>
                  </button>
                ))}
              </div>
              <div>
                <h3 className="fi-rail-h">Editoryal bilgi</h3>
                <p style={{ fontSize: 13.5, color: "var(--muted)", margin: 0 }}>
                  Kaynak: {a.source_name} · Editör onayı: {AUTHORS[a.reviewed_by]?.name} · Risk düzeyi: {a.risk_level}
                </p>
                <button className="fi-btn fi-btn-o" style={{ marginTop: 12, width: "100%" }} onClick={() => go({ n: "static", slug: "editoryal-ilkeler" })}>Editoryal ilkelerimiz</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------- 16. ARAÇ SAYFASI */

function Tools({ activeTool, go }) {
  const [active, setActive] = useState(activeTool || "kredi");
  useEffect(() => { if (activeTool) setActive(activeTool); }, [activeTool]);
  useSeo({
    title: "Finansal hesaplama araçları | FinansIndex",
    description: "Kredi taksiti, mevduat getirisi, kredi kartı asgari ödeme, kira artışı ve enflasyon etkisi hesaplama araçları. Girdiğiniz veriler tarayıcınızdan çıkmaz.",
    path: "/finansal-araclar",
  });
  useEffect(() => { track("article_view", { page_type: "tools", content_type: "tool_index" }); }, []);

  const tool = toolById(active);
  const ready = TOOLS.filter((t) => t.ready);

  return (
    <main id="icerik">
      <div className="fi-wrap">
        <div className="fi-page-hd">
          <nav className="fi-bc" aria-label="Konum"><button onClick={() => go({ n: "home" })}>Ana sayfa</button><span>/</span><span>Finansal Araçlar</span></nav>
          <div className="fi-eyebrow">Finansal araçlar</div>
          <h1>Karar vermeden önce hesaplayın</h1>
          <p>Oranları siz girersiniz; hiçbir güncel faiz, stopaj veya enflasyon değeri araçlara gömülü değildir. Girdiğiniz veriler sunucularımıza gönderilmez.</p>
        </div>

        <div className="fi-filters" style={{ margin: "26px 0 24px" }} role="group" aria-label="Araç seçimi">
          {TOOLS.map((t) => (
            <button className="fi-chip" key={t.id} aria-pressed={active === t.id} disabled={!t.ready}
              style={!t.ready ? { opacity: .5, cursor: "not-allowed" } : undefined}
              onClick={() => { setActive(t.id); track("calculator_start", { calculator_type: t.id, page_type: "tools", traffic_source: "tool_nav" }); }}>
              {t.short}{!t.ready && " · yakında"}
            </button>
          ))}
        </div>

        <div className="fi-2col">
          <div>
            {tool?.ready ? <tool.C tool={tool} /> : (
              <div className="fi-empty fi-panel">
                <h2>Bu araç hazırlanıyor</h2>
                <p>Güncel mevzuat ve oran kaynakları bağlandığında yayına alınacak.</p>
                <button className="fi-btn fi-btn-p" onClick={() => setActive("kredi")}>Hazır araçlara dön</button>
              </div>
            )}
            <section className="fi-sec" aria-labelledby="ot-h">
              <div className="fi-sh"><h2 className="fi-h2" id="ot-h">Diğer araçlar</h2></div>
              <div className="fi-grid fi-g3">
                {ready.filter((t) => t.id !== active).map((t) => (
                  <button className="fi-tool" key={t.id} onClick={() => setActive(t.id)}>
                    <div className="fi-tool-i" aria-hidden="true">
                      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3.5" y="2.5" width="13" height="15" rx="2" /><path d="M6.5 6.5h7M6.5 10h2M6.5 13.5h2M12 10v3.5M10.5 11.8h3" strokeLinecap="round" /></svg>
                    </div>
                    <h3 className="fi-tool-t">{t.short}</h3>
                    <p className="fi-tool-d">{t.desc}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>
          <aside>
            <div className="fi-sticky fi-rail">
              <AdSlot placementId="desktop_sidebar_sticky" pageType="tools" />
              <div>
                <h3 className="fi-rail-h">Aracı anlatan içerikler</h3>
                {ARTICLES.filter((a) => a.related_tool === active).slice(0, 4).map((a) => (
                  <button className="fi-rail-i" key={a.id} onClick={() => go({ n: "article", slug: a.slug })}>
                    <div className="fi-meta"><span className="fi-cat">{catName(a.category)}</span></div>
                    <p className="fi-rail-t">{a.title}</p>
                  </button>
                ))}
              </div>
              <Newsletter compact pageType="tools" />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------- 17. MEDYA KİTİ */

function MediaKit({ go }) {
  useSeo({
    title: "Reklam ve İş Birlikleri | FinansIndex",
    description: "FinansIndex reklam çözümleri: sponsorlu içerik, kategori sponsorluğu, finansal araç sponsorluğu, newsletter sponsorluğu ve özel dosya iş birlikleri.",
    path: "/reklam-ve-is-birlikleri",
  });
  useEffect(() => { track("article_view", { page_type: "mediakit", content_type: "commercial" }); }, []);

  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", budget: "", msg: "" });
  const [state, setState] = useState({ msg: "", type: "" });
  const started = useRef(false);

  const upd = (k) => (e) => {
    if (!started.current) { started.current = true; track("lead_form_start", { page_type: "mediakit", content_type: "media_inquiry" }); }
    setForm({ ...form, [k]: e.target.value }); setState({ msg: "", type: "" });
  };
  const submit = () => {
    if (!form.name.trim() || !form.company.trim()) { setState({ msg: "Ad soyad ve kurum alanları zorunludur.", type: "err" }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) { setState({ msg: "Kurumsal e-posta adresinizi kontrol edin.", type: "err" }); return; }
    track("lead_form_submit", { page_type: "mediakit", content_type: "media_inquiry" });
    setState({ msg: "Talebiniz alındı. Medya planı ve fiyat listesiyle bir iş günü içinde dönüş yapacağız.", type: "ok" });
    setForm({ name: "", company: "", email: "", phone: "", budget: "", msg: "" });
  };

  const PRODUCTS = [
    { t: "Sponsorlu içerik", d: "Editoryal ekibin doğruluk kontrolünden geçen, açıkça etiketlenmiş marka içeriği.", items: [["Makale detay + ana sayfa kartı", "sponsored_article"], ["Kategori sayfası dağıtımı", "home_native_01"]] },
    { t: "Kategori sponsorluğu", d: "Bir kategorinin belirli dönem boyunca marka iş birliğiyle sunulması.", items: [["Kategori üst bandı", "category_sponsor"], ["Kategori içi native", "home_native_01"]] },
    { t: "Finansal araç sponsorluğu", d: "Yüksek niyetli kullanıcıların bulunduğu hesaplama araçlarında marka görünürlüğü.", items: [["Araç başlık altı", "calculator_sponsor"], ["Araç sonuç alanı", "calculator_sponsor"]] },
    { t: "Bülten sponsorluğu", d: "Haftalık bültende tek sponsorlu blok; içerik akışının içinde, ayrı etiketli.", items: [["Bülten blok", "newsletter_sponsor"], ["Site içi bülten alanı", "newsletter_sponsor"]] },
    { t: "Display envanteri", d: "Okumayı bölmeyen, sabit boyutlu görsel alanlar.", items: [["Header altı geniş alan", "home_top_banner"], ["Masaüstü sağ sütun sticky", "desktop_sidebar_sticky"], ["Makale içi", "article_inline_01"], ["Makale sonu", "article_end"]] },
    { t: "Özel dosya ve araştırma", d: "Bir konunun tüm yönleriyle ele alındığı çok bölümlü dosya iş birliği.", items: [["FinansIndex Dosya sponsorluğu", "dossier_sponsor"], ["Özel proje / araştırma", "custom"]] },
  ];

  return (
    <main id="icerik">
      <div className="fi-mk-hero">
        <div className="fi-wrap">
          <div className="fi-eyebrow">Reklam ve iş birlikleri</div>
          <h1>Finansal kararın verildiği anda markanız orada olsun.</h1>
          <p>FinansIndex, kredi, mevduat, sigorta ve yatırım kararı öncesinde araştırma yapan kullanıcılara ulaşır. Envanterimiz okuma deneyimini bozmayacak şekilde tasarlanmıştır.</p>
        </div>
      </div>

      <div className="fi-wrap">
        <section className="fi-sec" style={{ borderTop: 0 }} aria-labelledby="aud-h">
          <div className="fi-sh"><div><div className="fi-eyebrow">Kime ulaşıyoruz</div><h2 className="fi-h2" id="aud-h">Hedef kitle</h2></div></div>
          <div className="fi-grid fi-g3">
            {[
              ["25–45 yaş çalışan yetişkinler", "Maaşını, harcamalarını ve borçlarını aktif olarak yöneten kullanıcılar."],
              ["Karar aşamasındaki araştırmacılar", "Kredi, mevduat, sigorta veya yatırım ürünü seçmeden önce hesaplama yapan yüksek niyetli kullanıcılar."],
              ["KOBİ sahipleri ve girişimciler", "İşletme finansmanı, nakit akışı ve e-ticaret konularında içerik arayan profesyoneller."],
            ].map(([t, d]) => (
              <div className="fi-panel" key={t}>
                <h3 style={{ font: "600 17px/1.3 var(--sans)", color: "var(--navy)", margin: "0 0 8px" }}>{t}</h3>
                <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>{d}</p>
              </div>
            ))}
          </div>
          <p className="fi-disc" style={{ marginTop: 24 }}>
            Trafik, gösterim ve dönüşüm rakamları yayın başlangıcından itibaren ölçülmeye başlanacaktır. Bu sayfada doğrulanmamış performans verisi paylaşmıyoruz; güncel raporlama talebiniz için formu kullanabilirsiniz.
          </p>
        </section>

        <section className="fi-sec" aria-labelledby="prod-h">
          <div className="fi-sh"><div><div className="fi-eyebrow">Envanter</div><h2 className="fi-h2" id="prod-h">Reklam çözümleri</h2><p className="fi-sub">Her alanın benzersiz bir placement ID'si vardır; gösterim, tıklama ve görünürlük ayrı ayrı raporlanır.</p></div></div>
          <div className="fi-grid fi-g3">
            {PRODUCTS.map((p) => (
              <div className="fi-prod" key={p.t}>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
                <ul>{p.items.map(([n, id]) => <li key={id + n}><span>{n}</span><code>{id}</code></li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="fi-sec" aria-labelledby="rule-h">
          <div className="fi-sh"><div><div className="fi-eyebrow">Çalışma ilkeleri</div><h2 className="fi-h2" id="rule-h">Neyi kabul ediyoruz, neyi etmiyoruz?</h2></div></div>
          <div className="fi-grid fi-g3">
            {[
              ["Etiketleme zorunludur", "Sponsorlu tüm içerikler başlıkta ve kartta açıkça etiketlenir; etiket kaldırılamaz."],
              ["Editoryal ayrım korunur", "Sponsor, editoryal içeriklerin konusuna veya sıralamasına müdahale edemez."],
              ["Yanıltıcı vaat kabul edilmez", "Kesin kazanç vaadi ve lisanssız finansal hizmet tanıtımı yayımlanmaz."],
            ].map(([t, d]) => (
              <div className="fi-guide" key={t}><h3>{t}</h3><p style={{ marginBottom: 0 }}>{d}</p></div>
            ))}
          </div>
        </section>

        <section className="fi-sec" aria-labelledby="form-h">
          <div className="fi-sh"><div><div className="fi-eyebrow">İletişim</div><h2 className="fi-h2" id="form-h">Medya planı talep edin</h2><p className="fi-sub">Formu doldurun; hedeflerinize uygun envanter, takvim ve fiyat listesiyle dönelim.</p></div></div>
          <div className="fi-panel">
            <div className="fi-form">
              {[["name", "Ad soyad *", "text"], ["company", "Kurum *", "text"], ["email", "Kurumsal e-posta *", "email"], ["phone", "Telefon", "tel"]].map(([k, l, t]) => (
                <div className="fi-fld" key={k}>
                  <label htmlFor={`mk-${k}`}>{l}</label>
                  <input id={`mk-${k}`} type={t} value={form[k]} onChange={upd(k)} style={{ fontFamily: "var(--sans)" }} />
                </div>
              ))}
              <div className="fi-fld full">
                <label htmlFor="mk-budget">İlgilendiğiniz çözüm</label>
                <select id="mk-budget" value={form.budget} onChange={upd("budget")}>
                  <option value="">Seçiniz</option>
                  {PRODUCTS.map((p) => <option key={p.t} value={p.t}>{p.t}</option>)}
                  <option value="Birden fazla / özel proje">Birden fazla / özel proje</option>
                </select>
              </div>
              <div className="fi-fld full">
                <label htmlFor="mk-msg">Kampanya hedefiniz</label>
                <textarea id="mk-msg" value={form.msg} onChange={upd("msg")} placeholder="Dönem, hedef kitle ve ölçmek istediğiniz sonuç hakkında kısa bilgi." />
              </div>
              <div className="full">
                {state.msg && <p className="fi-msg" role="status" style={{ background: state.type === "ok" ? "var(--green-soft)" : "#FBEAE6", color: state.type === "ok" ? "#12704A" : "#8C2B18", border: "1px solid", borderColor: state.type === "ok" ? "#C8E0D4" : "#EFCBC2", marginBottom: 14 }}>{state.msg}</p>}
                <button className="fi-btn fi-btn-p" onClick={submit}>Talebi gönder</button>
                <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "12px 0 0" }}>
                  Form verileriniz yalnızca talebinizi yanıtlamak amacıyla işlenir. Ayrıntı için{" "}
                  <button onClick={() => go({ n: "static", slug: "kvkk" })} style={{ background: "none", border: 0, padding: 0, textDecoration: "underline", color: "var(--navy)" }}>KVKK Aydınlatma Metni</button>.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ------------------------------------------------------- 18. ARAMA / STATİK / 404 */

function SearchPage({ q, go }) {
  useSeo({ title: `"${q}" için arama sonuçları | FinansIndex`, description: `FinansIndex içinde ${q} araması sonuçları.`, path: `/arama?q=${encodeURIComponent(q)}` });
  const results = ARTICLES.filter((a) =>
    (a.title + " " + a.summary + " " + a.tags.join(" ") + " " + catName(a.category)).toLowerCase().includes(q.toLowerCase())
  );
  return (
    <main id="icerik">
      <div className="fi-wrap">
        <div className="fi-page-hd">
          <div className="fi-eyebrow">Arama</div>
          <h1>“{q}”</h1>
          <p>{results.length} içerik bulundu.</p>
        </div>
        <section className="fi-sec" style={{ borderTop: 0 }}>
          {results.length === 0 ? (
            <div className="fi-empty">
              <h2>Eşleşen içerik bulunamadı</h2>
              <p>Farklı bir kelime deneyin veya kategorilere göz atın.</p>
              <button className="fi-btn fi-btn-p" onClick={() => go({ n: "home" })}>Ana sayfaya dön</button>
            </div>
          ) : (
            <div className="fi-grid fi-g3">{results.map((a) => <ArticleCard key={a.id} a={a} go={go} source="search" />)}</div>
          )}
        </section>
      </div>
    </main>
  );
}

function StaticPage({ slug, go }) {
  const p = STATIC_PAGES[slug];
  useSeo({ title: p ? `${p.title} | FinansIndex` : "FinansIndex", description: p?.lead || "", path: `/${slug}` });
  if (!p) return <NotFound go={go} />;
  return (
    <main id="icerik">
      <div className="fi-wrap">
        <div className="fi-page-hd">
          <nav className="fi-bc" aria-label="Konum"><button onClick={() => go({ n: "home" })}>Ana sayfa</button><span>/</span><span>{p.title}</span></nav>
          <h1>{p.title}</h1>
          <p>{p.lead}</p>
        </div>
        <div className="fi-prose">
          {p.body.map(([h, t]) => <React.Fragment key={h}><h2>{h}</h2><p>{t}</p></React.Fragment>)}
        </div>
      </div>
    </main>
  );
}

function NotFound({ go }) {
  useSeo({ title: "Sayfa bulunamadı | FinansIndex", description: "Aradığınız sayfa taşınmış veya kaldırılmış olabilir.", path: "/404" });
  return (
    <main id="icerik">
      <div className="fi-wrap">
        <div className="fi-empty" style={{ padding: "90px 20px" }}>
          <div className="fi-eyebrow" style={{ textAlign: "center" }}>404</div>
          <h2>Aradığınız sayfayı bulamadık</h2>
          <p>Bağlantı değişmiş veya içerik kaldırılmış olabilir. Aşağıdan devam edebilirsiniz.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="fi-btn fi-btn-p" onClick={() => go({ n: "home" })}>Ana sayfa</button>
            <button className="fi-btn fi-btn-o" onClick={() => go({ n: "tools" })}>Finansal araçlar</button>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ 19. APP */

export default function FinansIndex() {
  const [route, setRoute] = useState({ n: "home" });
  const [search, setSearch] = useState(false);
  const market = useMarket();

  const go = useCallback((r) => {
    setRoute(r);
    if (typeof window !== "undefined") {
      if (r.hash) { setTimeout(() => document.getElementById(r.hash)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60); }
      else window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    }
  }, []);

  const page = (() => {
    switch (route.n) {
      case "home": return <Home go={go} market={market} />;
      case "category": return <Category slug={route.slug} go={go} />;
      case "article": return <Article slug={route.slug} go={go} />;
      case "tools": return <Tools activeTool={route.tool} go={go} />;
      case "mediakit": return <MediaKit go={go} />;
      case "search": return <SearchPage q={route.q} go={go} />;
      case "static": return <StaticPage slug={route.slug} go={go} />;
      default: return <NotFound go={go} />;
    }
  })();

  return (
    <div className="fi">
      <style>{CSS}</style>
      <a href="#icerik" className="fi-hidden fi-skip">İçeriğe geç</a>
      <Header route={route} go={go} onSearch={() => setSearch(true)} market={market} />
      {page}
      {search && <SearchOverlay onClose={() => setSearch(false)} go={go} />}
      <Footer go={go} />
    </div>
  );
}
