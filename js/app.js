/* ============================================================
   لائحة MEAL — محرك العرض والتفاعل
   ============================================================ */
'use strict';

const DOC = window.MEAL_DOC;
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const READ_KEY = 'meal-read-v1';

const escapeHTML = s => s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const escapeReg  = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* تطبيع عربي للبحث: إزالة التشكيل والهمزات والتطويل */
const normAr = s => (s || '')
  .toLowerCase()
  .replace(/[ً-ٰٟـ]/g, '')
  .replace(/[أإآاٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
  .replace(/(^|\s)ال/g, '$1'); /* تجريد أداة التعريف لالتقاط أوسع */

/* ───────────────────────── بناء محتوى الديباجة ───────────────────────── */
function renderPreamble() {
  $('#preambleBody').innerHTML = DOC.intro.paragraphs
    .map(p => `<p>${escapeHTML(p)}</p>`).join('');
  $('#endNote').textContent = DOC.endNote || '';
}

/* تمييز «أولًا:» وما بعدها كتل عمودية داخل المادة */
const ORDINAL = /^(أولًا|ثانيًا|ثالثًا|رابعًا|خامسًا|سادسًا|سابعًا|ثامنًا):\s*([^:]+?):\s*(.*)$/;

function renderArticleBody(raw) {
  const blocks = raw.split(/\n\n+/);
  let html = '';
  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const pillarLines = lines.filter(l => ORDINAL.test(l));
    if (pillarLines.length && pillarLines.length === lines.length) {
      html += pillarLines.map(l => {
        const m = l.match(ORDINAL);
        return `<div class="pillar"><b>${escapeHTML(m[1])} · ${escapeHTML(m[2])}</b><span>${escapeHTML(m[3])}</span></div>`;
      }).join('');
    } else {
      html += `<p>${lines.map(escapeHTML).join('<br>')}</p>`;
    }
  }
  return html;
}

/* ───────────────────────── بناء الأبواب والمواد ───────────────────────── */
function totalArticlesIn(ch) { return ch.articles.length; }

function renderChapters() {
  const host = $('#chapters');
  const frag = document.createDocumentFragment();

  for (const ch of DOC.chapters) {
    const sec = document.createElement('section');
    sec.className = 'chapter reveal';
    sec.id = ch.id;
    sec.setAttribute('aria-labelledby', `${ch.id}-title`);

    const first = ch.articles[0].n, last = ch.articles[ch.articles.length - 1].n;
    sec.innerHTML = `
      <header class="chapter-head">
        <span class="chapter-num" aria-hidden="true">${escapeHTML(arDigitsToLat(ch.index))}</span>
        <p class="chapter-kicker">${escapeHTML(ch.kicker)}</p>
        <h2 class="chapter-title" id="${ch.id}-title">${escapeHTML(ch.title)}</h2>
        <div class="chapter-meta">
          <span><b>${ch.articles.length}</b> مواد</span>
          <span>من المادة <b>${first}</b> إلى <b>${last}</b></span>
        </div>
      </header>
      <div class="articles"></div>`;

    const wrap = $('.articles', sec);
    for (const art of ch.articles) {
      const el = document.createElement('article');
      el.className = 'article';
      el.id = `art-${art.n}`;
      el.dataset.ch = ch.id;
      el.innerHTML = `
        <div class="art-rail">
          <span class="art-label">المادة</span>
          <div class="art-num" aria-hidden="true">${art.n}</div>
          <button class="read-toggle" type="button" aria-pressed="false" title="علّم هذه المادة كمقروءة" aria-label="علّم المادة (${art.n}) كمقروءة">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </button>
          <button class="copy-link" type="button" data-copy="art-${art.n}" aria-label="نسخ رابط المادة (${art.n})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3.54-3.54a5 5 0 0 0-7.07-7.07l-1.72 1.72"/><path d="M14 11a5 5 0 0 0-7.07 0l-3.54 3.54a5 5 0 0 0 7.07 7.07l1.72-1.72"/></svg>
            <span>نسخ الرابط</span>
          </button>
        </div>
        <div class="art-content">
          <h3 class="art-title">${escapeHTML(art.t)}<span class="art-tag">المادة (${art.n})</span></h3>
          <div class="art-body">${renderArticleBody(art.b)}</div>
        </div>`;
      wrap.appendChild(el);
    }
    frag.appendChild(sec);
  }

  /* الملاحق */
  for (const appx of (DOC.appendices || [])) {
    const sec = document.createElement('section');
    sec.className = 'chapter appendix reveal';
    sec.id = appx.id;
    sec.setAttribute('aria-labelledby', `${appx.id}-title`);
    sec.innerHTML = `
      <header class="chapter-head">
        <span class="chapter-num" aria-hidden="true">${escapeHTML(appx.index)}</span>
        <p class="chapter-kicker">${escapeHTML(appx.kicker)}</p>
        <h2 class="chapter-title" id="${appx.id}-title">${escapeHTML(appx.title)}</h2>
        <div class="chapter-meta"><span><b>${appx.items.length}</b> بندًا</span></div>
      </header>
      <p class="note">${escapeHTML(appx.note)}</p>
      <div class="app-list"></div>`;
    const list = $('.app-list', sec);
    appx.items.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'app-item';
      row.id = `${appx.id}-item-${i + 1}`;
      row.innerHTML = `
        <span class="app-num" aria-hidden="true">${appx.ordered ? (i + 1) : appx.index}</span>
        <div>${item.h ? `<h4>${i + 1}. ${escapeHTML(item.h)}</h4>` : ''}<p>${escapeHTML(item.t)}</p></div>`;
      list.appendChild(row);
    });
    frag.appendChild(sec);
  }

  host.appendChild(frag);
}

/* ───────────────────────── الفهرس الجانبي ───────────────────────── */
function buildTOC() {
  const nav = $('#tocList');
  const items = [];

  items.push({ id: 'preamble', idx: '﴾', kicker: 'الديباجة', title: 'لماذا وُضعت هذه اللائحة؟', count: null });
  for (const ch of DOC.chapters) {
    items.push({ id: ch.id, idx: ch.index, kicker: ch.kicker, title: ch.title, count: { total: totalArticlesIn(ch), ch } });
  }
  for (const a of (DOC.appendices || [])) {
    items.push({ id: a.id, idx: a.index, kicker: a.kicker, title: a.title, count: null });
  }

  nav.innerHTML = items.map(it => `
    <a href="#${it.id}" data-target="${it.id}" data-search="${escapeHTML(normAr(it.kicker + ' ' + it.title))}">
      <span class="toc-idx">${escapeHTML(it.idx)}</span>
      <span class="toc-txt"><i>${escapeHTML(it.kicker)}</i><b>${escapeHTML(it.title)}</b></span>
      ${it.count ? `<span class="toc-count" data-ch-count="${it.id}">٠/${it.count.total}</span>` : `<span class="toc-count">·</span>`}
    </a>`).join('');

  /* تصفية الفهرس */
  const input = $('#tocFilter');
  const empty = $('#tocEmpty');
  input.addEventListener('input', () => {
    const q = normAr(input.value.trim());
    let shown = 0;
    $$('a', nav).forEach(a => {
      const hit = !q || a.dataset.search.includes(q);
      a.classList.toggle('hidden', !hit);
      if (hit) shown++;
    });
    empty.style.display = shown ? 'none' : 'block';
  });

  /* إغلاق القائمة على الجوال عند الاختيار */
  nav.addEventListener('click', e => { if (e.target.closest('a')) closeSidebar(); });
}

/* ───────────────────────── تتبع القراءة ───────────────────────── */
function getReadSet() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveReadSet(set) {
  try { localStorage.setItem(READ_KEY, JSON.stringify([...set])); } catch { /* وضع التصفح الخاص */ }
}
const toArabicDigits = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const arDigitsToLat = s => s.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

function updateReadUI() {
  const set = getReadSet();
  const total = DOC.chapters.reduce((s, ch) => s + ch.articles.length, 0);
  const read = [...set].filter(n => n >= 1 && n <= total).length;
  const pct = total ? Math.round(read / total * 100) : 0;

  $('#readPct').textContent = toArabicDigits(pct) + '٪';
  $('#readFill').style.width = pct + '%';

  /* عدّاد كل فصل */
  for (const ch of DOC.chapters) {
    const badge = $(`[data-ch-count="${ch.id}"]`);
    if (!badge) continue;
    const done = ch.articles.filter(a => set.has(a.n)).length;
    badge.textContent = `${toArabicDigits(done)}/${ch.articles.length}`;
    badge.style.color = done === ch.articles.length ? 'var(--orange)' : '';
  }

  /* حالة كل مادة */
  $$('.article').forEach(el => {
    const n = +el.id.split('-')[1];
    const isRead = set.has(n);
    el.classList.toggle('is-read', isRead);
    const btn = $('.read-toggle', el);
    if (btn) btn.setAttribute('aria-pressed', String(isRead));
  });
}

function bindReadToggles() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.read-toggle');
    if (!btn) return;
    const article = btn.closest('.article');
    const n = +article.id.split('-')[1];
    const set = getReadSet();
    set.has(n) ? set.delete(n) : set.add(n);
    saveReadSet(set);
    updateReadUI();
  });
}

/* ───────────────────────── نسخ الرابط ───────────────────────── */
function bindCopyLinks() {
  document.addEventListener('click', async e => {
    const btn = e.target.closest('.copy-link');
    if (!btn) return;
    const url = `${location.origin}${location.pathname}#${btn.dataset.copy}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('تم نسخ رابط المادة — شاركه مع أي جهة معنية');
    } catch {
      /* بديل للمتصفحات القديمة */
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); showToast('تم نسخ رابط المادة'); }
      catch { showToast('تعذر النسخ التلقائي — انسخ الرابط من شريط العنوان'); }
      ta.remove();
    }
  });
}

let toastTimer;
function showToast(msg) {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3400);
}

/* ───────────────────────── شريط التقدم + التنقّل الذاتي (Scrollspy) ───────────────────────── */
function initScroll() {
  const bar = $('#readbar');
  const fill = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    bar.style.width = (max > 0 ? (doc.scrollTop / max) * 100 : 0) + '%';
  };
  document.addEventListener('scroll', fill, { passive: true });
  fill();

  /* الأقسام المُراقَبة */
  const sections = [$('#preamble'), ...$$('.chapter')].filter(Boolean);
  const tocLinks = new Map($$('#tocList a').map(a => [a.dataset.target, a]));
  const crumb = $('#crumbCurrent');

  const spy = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const id = entry.target.id;
      const link = tocLinks.get(id);
      tocLinks.forEach(l => l.classList.remove('active'));
      if (link) {
        link.classList.add('active');
        const kicker = $('.toc-txt i', link)?.textContent || '';
        const title  = $('.toc-txt b', link)?.textContent || '';
        crumb.textContent = `${kicker} — ${title}`;
      }
    }
  }, { rootMargin: '-30% 0px -62% 0px', threshold: 0 });

  sections.forEach(s => spy.observe(s));
}

/* ───────────────────────── ظهور تدريجي عند التمرير ───────────────────────── */
function initReveal() {
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
  $$('.reveal').forEach(el => io.observe(el));
}

/* ───────────────────────── فتح الرابط العميق #art-n ───────────────────────── */
function handleDeepLink() {
  const hash = location.hash.slice(1);
  if (!hash) return;
  const target = document.getElementById(hash);
  if (!target) return;
  setTimeout(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (target.classList.contains('article')) flashArticle(target);
  }, 120);
}
function flashArticle(el) {
  el.classList.remove('flash');
  void el.offsetWidth; /* إعادة تشغيل الأنيميشن */
  el.classList.add('flash');
}

/* ───────────────────────── البحث العام ───────────────────────── */
let searchIndex = [];

function buildSearchIndex() {
  searchIndex = [];
  searchIndex.push({
    path: 'الديباجة', title: 'لماذا وُضعت هذه اللائحة؟', target: 'preamble',
    text: DOC.intro.paragraphs.join(' ')
  });
  for (const ch of DOC.chapters) {
    for (const art of ch.articles) {
      searchIndex.push({
        path: `${ch.kicker} · ${ch.title}`,
        title: `المادة (${art.n}) — ${art.t}`,
        target: `art-${art.n}`,
        text: art.b.replace(/\n/g, ' ')
      });
    }
  }
  for (const a of (DOC.appendices || [])) {
    a.items.forEach((item, i) => {
      searchIndex.push({
        path: a.kicker, title: `${a.kicker} — البند ${i + 1}${item.h ? ': ' + item.h : ''}`,
        target: `${a.id}-item-${i + 1}`, text: item.t
      });
    });
  }
  searchIndex = searchIndex.map(e => ({ ...e, norm: normAr(e.title + ' ' + e.text) }));
}

function runSearch(q) {
  const nq = normAr(q.trim());
  const list = $('#srList'), count = $('#srCount'), empty = $('#srEmpty');
  list.innerHTML = '';
  if (nq.length < 2) {
    count.textContent = 'اكتب حرفين على الأقل للبحث في المواد المئة والديباجة والملحقين';
    empty.hidden = true;
    return;
  }
  const raw = q.trim();
  const scored = [];
  for (const e of searchIndex) {
    const inTitle = normAr(e.title).includes(nq);
    const pos = e.norm.indexOf(nq);
    if (inTitle || pos !== -1) scored.push({ e, score: (inTitle ? 10 : 0) + (pos !== -1 ? 3 : 0) - pos * 0.001, pos });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 40);

  count.textContent = top.length
    ? `${toArabicDigits(top.length)} نتيجة${scored.length > 40 ? ' (تُعرض أول ٤٠)' : ''}`
    : '';
  empty.hidden = top.length !== 0;

  const rx = new RegExp(`(${escapeReg(raw)})`, 'gi');
  for (const { e, pos } of top) {
    const start = Math.max(0, (pos > 0 ? pos : 0) - 80);
    let snippet = e.text.slice(start, start + 220);
    if (start > 0) snippet = '…' + snippet;
    snippet = escapeHTML(snippet).replace(rx, '<mark>$1</mark>');
    const titleHtml = escapeHTML(e.title).replace(rx, '<mark>$1</mark>');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sr-item';
    btn.dataset.target = e.target;
    btn.innerHTML = `<span class="sr-path">${escapeHTML(e.path)}</span>
      <span class="sr-title">${titleHtml}</span>
      <span class="sr-snippet">${snippet}</span>`;
    list.appendChild(btn);
  }
}

function goToTarget(id) {
  closeSearch();
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (el.classList.contains('article')) setTimeout(() => flashArticle(el), 350);
  else if (el.classList.contains('app-item')) { el.style.outline = '2px solid var(--orange)'; setTimeout(() => (el.style.outline = ''), 1600); }
}

function openSearch() {
  const overlay = $('#searchOverlay');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const input = $('#globalSearch');
  input.value = '';
  $('#srList').innerHTML = '';
  $('#srCount').textContent = 'اكتب حرفين على الأقل للبحث في المواد المئة والديباجة والملحقين';
  $('#srEmpty').hidden = true;
  requestAnimationFrame(() => input.focus());
}
function closeSearch() {
  const overlay = $('#searchOverlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function initSearch() {
  buildSearchIndex();
  const overlay = $('#searchOverlay');
  const input = $('#globalSearch');
  const list = $('#srList');

  $('#openSearch').addEventListener('click', openSearch);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });

  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => runSearch(input.value), 110);
  });

  /* التنقل بالأسهم + Enter */
  input.addEventListener('keydown', e => {
    const items = $$('.sr-item', list);
    if (!items.length) { if (e.key === 'Enter') e.preventDefault(); return; }
    const current = items.findIndex(i => i.classList.contains('selected'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items.forEach(i => i.classList.remove('selected'));
      const next = e.key === 'ArrowDown'
        ? (current + 1) % items.length
        : (current - 1 + items.length) % items.length;
      items[next].classList.add('selected');
      items[next].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      (items[current] || items[0]).click();
    }
  });

  list.addEventListener('click', e => {
    const btn = e.target.closest('.sr-item');
    if (btn) goToTarget(btn.dataset.target);
  });

  /* اختصارات لوحة المفاتيح */
  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 'k' || e.key === 'K' || e.key === 'ك')) {
      e.preventDefault();
      overlay.classList.contains('open') ? closeSearch() : openSearch();
    } else if (e.key === 'Escape') {
      if (overlay.classList.contains('open')) closeSearch();
      closeSidebar();
    }
  });
}

/* ───────────────────────── القائمة الجانبية على الجوال ───────────────────────── */
function openSidebar() {
  $('#sidebar').classList.add('open');
  $('#sidebarBackdrop').classList.add('show');
  $('#burgerToggle').setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#sidebarBackdrop').classList.remove('show');
  $('#burgerToggle')?.setAttribute('aria-expanded', 'false');
  if (!$('#searchOverlay').classList.contains('open')) document.body.style.overflow = '';
}
function initSidebar() {
  $('#burgerToggle').addEventListener('click', () =>
    $('#sidebar').classList.contains('open') ? closeSidebar() : openSidebar());
  $('#sidebarBackdrop').addEventListener('click', closeSidebar);
}

/* ───────────────────────── الطباعة والعودة للأعلى ───────────────────────── */
function initActions() {
  const print = () => window.print();
  $('#printSide').addEventListener('click', print);
  $('#printTop').addEventListener('click', print);
  $('#printFoot').addEventListener('click', e => { e.preventDefault(); print(); });
  $('#toTopSide').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeSidebar();
  });
}

/* ───────────────────────── الإقلاع ───────────────────────── */
renderPreamble();
renderChapters();
buildTOC();
bindReadToggles();
bindCopyLinks();
updateReadUI();
initScroll();
initReveal();
initSearch();
initSidebar();
initActions();
handleDeepLink();
window.addEventListener('hashchange', handleDeepLink);
