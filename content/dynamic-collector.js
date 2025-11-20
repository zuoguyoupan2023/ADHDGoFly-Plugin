(() => {
  const normalize = (s) => s ? s.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim() : '';
  const isHidden = (el) => {
    try {
      const cs = el && el.ownerDocument ? el.ownerDocument.defaultView.getComputedStyle(el) : window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.visibility === 'hidden' || cs.display === 'none' || r.width === 0 || r.height === 0;
    } catch (_) { return false; }
  };
  const selectEls = () => document.querySelectorAll('article,section,[role="main"],[data-testid],.docItemContainer,.theme-doc-markdown,.markdown,.post,.tweet,.update,.card,.entry,.item,.list-item,.feed-item,.story,.message,.comment,.feed,.timeline');
  const collectWindow = async (durationMs) => {
    const section = { sectionId: 'dynamic-' + Date.now(), sectionTitle: 'DYNAMIC', headingPath: 'dynamic', blocks: [] };
    const seen = new Set();
    const addBlock = (t) => {
      const text = normalize(t || '');
      if (!text || text.length < 6) return;
      const key = text.slice(0, 200);
      if (seen.has(key)) return;
      seen.add(key);
      section.blocks.push({ text, orderIndex: section.blocks.length });
    };
    const scan = () => {
      const els = selectEls();
      els.forEach(el => { if (!isHidden(el)) addBlock(el.innerText || el.textContent || ''); });
    };
    scan();
    const mo = new MutationObserver((muts) => {
      muts.forEach(m => { (m.addedNodes || []).forEach(node => { if (node && node.nodeType === 1) { const el = node; if (isHidden(el)) return; const t = el.innerText || el.textContent || ''; if (!t || t.trim().length < 6) return; addBlock(t); } }); });
    });
    try { mo.observe(document.body, { childList: true, subtree: true }); } catch (_) {}
    await new Promise(r => setTimeout(r, durationMs || 6000));
    try { mo.disconnect(); } catch (_) {}
    const sections = section.blocks.length ? [section] : [];
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