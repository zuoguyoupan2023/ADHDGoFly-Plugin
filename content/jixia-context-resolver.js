(function (root) {
  'use strict';

  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();

  function routeKey(url) {
    try {
      const u = new URL(String(url || ''), root.location && root.location.href);
      const path = u.pathname.replace(/\/+$|^\s+/g, '') || '/';
      const reddit = path.match(/\/comments\/([^/]+)/i);
      return `${u.origin}${reddit ? `/comments/${reddit[1]}` : path}${u.search}`;
    } catch (_) { return String(url || ''); }
  }

  function identity(url, canonicalUrl) {
    const pageUrl = String(url || '');
    const canonical = String(canonicalUrl || pageUrl);
    const currentRoute = routeKey(pageUrl);
    let canonicalRoute = routeKey(canonical);
    // A site-wide/home canonical must never identify a specific routed page.
    if (/reddit\.com$/i.test(canonical.replace(/^https?:\/\//, '').split('/')[0]) && /\/comments\//i.test(currentRoute)) {
      canonicalRoute = currentRoute;
    }
    return { pageUrl, canonicalUrl: canonical, routeKey: currentRoute, canonicalRouteKey: canonicalRoute };
  }

  function hash(text) {
    let h = 2166136261;
    const value = String(text || '');
    for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }

  function classify({ text, source, requestedSource, identity: id, record }) {
    const value = normalize(text);
    const origin = source || (record ? 'stored_segments' : 'dom_live');
    const recordRoute = record && (record.routeKey || record.routeKeyKey);
    const routeMatches = !recordRoute || recordRoute === id.routeKey || recordRoute === id.canonicalRouteKey;
    const looksLikeList = /reddit\.com/i.test(id.pageUrl) && /\b(home|popular|all|r\/[^/]+)\b/i.test(id.routeKey) && !/\/comments\//i.test(id.routeKey);
    const isScoped = requestedSource === 'selection' || requestedSource === 'paragraph';
    const isStale = !routeMatches || looksLikeList || (!isScoped && origin === 'fallback' && value.length < 200);
    const confidence = isStale ? 0 : (origin === 'dom_live' ? .9 : origin === 'stored_segments' ? .8 : origin === 'selection' || origin === 'manual' ? 1 : .35);
    return { text: value, textHash: hash(value), textOrigin: origin, confidence, isStale, staleReason: isStale ? (!routeMatches ? 'route_mismatch' : looksLikeList ? 'list_page_text' : 'low_confidence') : '' };
  }

  function createMonitor({ getUrl, onRouteChange, rootNode, settleMs = 350 } = {}) {
    let last = routeKey(getUrl ? getUrl() : (root.location && root.location.href));
    let timer = null;
    let observer = null;
    const check = () => {
      const next = routeKey(getUrl ? getUrl() : (root.location && root.location.href));
      if (next === last) return false;
      const previous = last; last = next;
      onRouteChange?.({ previous, current: next });
      return true;
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(check, settleMs); };
    const start = () => {
      if (root.MutationObserver && (rootNode || root.document?.body)) {
        observer = new root.MutationObserver(schedule);
        observer.observe(rootNode || root.document.body, { childList: true, subtree: true });
      }
      root.addEventListener?.('popstate', schedule);
      root.addEventListener?.('hashchange', schedule);
    };
    const stop = () => { clearTimeout(timer); observer?.disconnect(); root.removeEventListener?.('popstate', schedule); root.removeEventListener?.('hashchange', schedule); };
    return { start, stop, check, get routeKey() { return last; } };
  }

  async function waitForStableText(getText, { timeoutMs = 2500, intervalMs = 180, stableSamples = 3 } = {}) {
    const started = Date.now(); let previous = ''; let stable = 0; let latest = '';
    while (Date.now() - started < timeoutMs) {
      latest = normalize(await getText());
      if (latest && latest === previous) stable += 1; else stable = 0;
      previous = latest;
      if (stable >= stableSamples - 1) return { text: latest, stable: true, waitedMs: Date.now() - started };
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    return { text: latest, stable: false, waitedMs: Date.now() - started };
  }

  root.JixiaContextResolver = { normalize, routeKey, identity, hash, classify, createMonitor, waitForStableText };
})(typeof window !== 'undefined' ? window : globalThis);
