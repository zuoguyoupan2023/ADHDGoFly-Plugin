(() => {
  const normalize = (s) => s ? s.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim() : '';
  const isHidden = (el) => {
    try {
      const cs = el && el.ownerDocument ? el.ownerDocument.defaultView.getComputedStyle(el) : window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.visibility === 'hidden' || cs.display === 'none' || r.width === 0 || r.height === 0;
    } catch (_) { return false; }
  };
  const isExcluded = (el) => {
    const tn = (el.tagName || '').toUpperCase();
    if (tn === 'SCRIPT' || tn === 'STYLE' || tn === 'SVG' || tn === 'CANVAS' || tn === 'NOSCRIPT') return true;
    return false;
  };
  const inExcludedRegion = (el) => {
    try { return !!el.closest('header,nav,footer,aside'); } catch (_) { return false; }
  };
  const isExtensionUi = (el) => {
    if (!el) return false;
    try { if (el.closest('[class*="agf-"]')) return true; } catch (_) {}
    const id = typeof el.id === 'string' ? el.id : '';
    if (id && id.startsWith('agf')) return true;
    try { const s = (el.ownerDocument ? el.ownerDocument.defaultView : window).getComputedStyle(el); const zi = parseInt(s.zIndex || '0', 10); if (s.position === 'fixed' && zi >= 2147483000) return true; } catch (_) {}
    return false;
  };
  const isNavigationText = (s) => {
    const t = String(s || '').trim();
    if (!t) return false;
    const nav = new Set(['Product','Use Cases','Pricing','Blog','Resources','Download','Docs','Changelog','Experience liftoff','About Google','Google Products','Privacy','Terms']);
    if (nav.has(t)) return true;
    if (t.length <= 20 && /^(Product|Pricing|Blog|Docs|Download|Terms|Privacy)$/i.test(t)) return true;
    return false;
  };
  const selectRoots = () => Array.from(document.querySelectorAll('main, .theme-doc-markdown, .markdown, .docItemContainer, [role="main"], .content'));
  const textFromEl = (el) => {
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'pre' || tag === 'code') return normalize(el.textContent || '');
    if (tag === 'td' || tag === 'th') return normalize(el.textContent || '');
    return normalize(el.innerText || el.textContent || '');
  };
  const roleForEl = (el) => {
    const tag = (el.tagName || '').toLowerCase();
    if (/^h[1-6]$/.test(tag)) return 'heading';
    if (tag === 'pre' || tag === 'code') return 'code';
    if (tag === 'td' || tag === 'th') return 'table-cell';
    if (tag === 'li') return 'list-item';
    return 'paragraph';
  };
  const collectSectionsFromRoot = (root) => {
    const sections = [];
    let current = null;
    let order = 0;
    const nodes = root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,article,section,div,pre,code,table,td,th');
    nodes.forEach(el => {
      if (isHidden(el)) return;
      if (isExcluded(el)) return;
      if (inExcludedRegion(el)) return;
      if (isExtensionUi(el)) return;
      const tag = (el.tagName || '').toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        if (current && current.blocks.length) sections.push(current);
        const title = textFromEl(el);
        current = { sectionId: 'sec-' + Date.now() + '-' + Math.random().toString(36).slice(2,8), sectionTitle: title || ('H' + tag.slice(1)), headingPath: tag + ':' + (title || ''), blocks: [] };
        order = 0;
        return;
      }
      const t = textFromEl(el);
      if (!t || t.length < 2) return;
      if (isNavigationText(t)) return;
      if (!current) current = { sectionId: 'root', sectionTitle: 'ROOT', headingPath: 'root', blocks: [] };
      current.blocks.push({ text: t, orderIndex: order++, role: roleForEl(el), tag: (el.tagName || '').toLowerCase() });
    });
    if (current && current.blocks.length) sections.push(current);
    return sections;
  };
  const collectWindow = async (durationMs) => {
    let sections = [];
    const roots = selectRoots();
    roots.forEach(root => { const secs = collectSectionsFromRoot(root); if (secs && secs.length) sections = sections.concat(secs); });
    const mo = new MutationObserver((muts) => {
      muts.forEach(m => { (m.addedNodes || []).forEach(node => { if (node && node.nodeType === 1) { const el = node; if (isHidden(el)) return; if (isExcluded(el)) return; if (inExcludedRegion(el)) return; if (isExtensionUi(el)) return; const t = textFromEl(el); if (!t || t.length < 2) return; if (isNavigationText(t)) return; const h = el.closest('h1,h2,h3,h4,h5,h6'); if (h) { const title = textFromEl(h); let target = sections.find(s => s.sectionTitle === title); if (!target) { target = { sectionId: 'sec-' + Date.now() + '-' + Math.random().toString(36).slice(2,8), sectionTitle: title || 'HEADING', headingPath: (h.tagName||'').toLowerCase() + ':' + (title || ''), blocks: [] }; sections.push(target); } target.blocks.push({ text: t, orderIndex: target.blocks.length, role: roleForEl(el), tag: (el.tagName||'').toLowerCase() }); } else { let rootSec = sections.find(s => s.sectionId === 'root'); if (!rootSec) { rootSec = { sectionId: 'root', sectionTitle: 'ROOT', headingPath: 'root', blocks: [] }; sections.push(rootSec); } rootSec.blocks.push({ text: t, orderIndex: rootSec.blocks.length, role: roleForEl(el), tag: (el.tagName||'').toLowerCase() }); } } }); });
    });
    try { mo.observe(document.body, { childList: true, subtree: true }); } catch (_) {}
    await new Promise(r => setTimeout(r, durationMs || 6000));
    try { mo.disconnect(); } catch (_) {}
    if (!sections.length) {
      const roots = selectRoots();
      const parts = roots.map(r => normalize(r ? r.innerText || '' : '')).filter(t => t && t.length > 2);
      const snapshot = parts.join('\n');
      if (snapshot && snapshot.length > 200) {
        sections = [{ sectionId: 'dynamic-snapshot-' + Date.now(), sectionTitle: 'DYNAMIC_SNAPSHOT', headingPath: 'dynamic:snapshot', blocks: [{ text: snapshot, orderIndex: 0, role: 'paragraph', tag: 'div' }] }];
      }
    }
    if (sections.length) {
      try { await chrome.runtime.sendMessage({ action: 'storeSegments', sections }); } catch (_) {}
    }
  };
  const trigger = (dur) => { try { collectWindow(dur || 6000); } catch (_) {} };
  try {
    const origPush = history.pushState.bind(history);
    history.pushState = function() { const r = origPush.apply(this, arguments); try { trigger(6000); } catch (_) {} return r; };
  } catch (_) {}
  try {
    const origReplace = history.replaceState.bind(history);
    history.replaceState = function() { const r = origReplace.apply(this, arguments); try { trigger(6000); } catch (_) {} return r; };
  } catch (_) {}
  try { window.addEventListener('popstate', () => trigger(6000)); } catch (_) {}
  try { window.addEventListener('hashchange', () => trigger(4000)); } catch (_) {}
  try {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => trigger(6000), { timeout: 3000 });
    } else {
      setTimeout(() => trigger(1500), 1500);
    }
  } catch (_) { setTimeout(() => trigger(1500), 1500); }
  window.addEventListener('message', (e) => { const d = e && e.data ? e.data : null; if (!d) return; if (e.source !== window) return; if (d.__agf && d.type === 'COLLECT_SEGMENTS_DYNAMIC') { const dur = typeof d.durationMs === 'number' ? d.durationMs : 5000; trigger(dur); } });
})();