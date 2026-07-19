/* global window */
(function (root) {
  'use strict';
  const DB = 'agf_chart_workspace';
  const STORE = 'charts';
  const esc = value => String(value == null ? '' : value).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!root.indexedDB) return reject(new Error('当前浏览器不支持 IndexedDB'));
      const request = root.indexedDB.open(DB, 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' }); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('无法打开图表存储'));
    });
  }
  async function transaction(mode, action) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode); const request = action(tx.objectStore(STORE));
      request.onsuccess = () => { db.close(); resolve(request.result); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  }
  const save = chart => transaction('readwrite', store => store.put(chart));
  const get = id => transaction('readonly', store => store.get(id));
  const list = () => transaction('readonly', store => store.getAll()).then(rows => rows.sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
  const remove = id => transaction('readwrite', store => store.delete(id));

  function renderSvg(context) {
    const model = context.chartModel || {}; const title = esc(model.title); const width = 900; const height = context.intent === 'timeline' ? Math.max(280, 150 + (model.events || []).length * 86) : Math.max(280, 190 + Math.ceil((model.nodes || []).length / 3) * 110);
    let body = `<rect width="100%" height="100%" fill="#ffffff"/><text x="36" y="42" font-size="24" font-family="Arial,sans-serif" font-weight="700" fill="#172033">${title}</text>`;
    if (context.intent === 'timeline') {
      const events = model.events || []; body += `<line x1="110" y1="86" x2="110" y2="${height - 42}" stroke="#315efb" stroke-width="4"/>`;
      events.forEach((event, i) => { const y = 110 + i * 86; body += `<circle cx="110" cy="${y}" r="9" fill="#315efb"/><text x="140" y="${y - 5}" font-size="14" font-family="Arial,sans-serif" font-weight="700" fill="#172033">${esc(event.date || '')} ${esc(event.label)}</text><text x="140" y="${y + 19}" font-size="12" font-family="Arial,sans-serif" fill="#687386">${esc(event.description || '')}</text>`; });
    } else {
      const nodes = model.nodes || []; const positions = {}; nodes.forEach((node, i) => { const col = i % 3; const row = Math.floor(i / 3); const x = 54 + col * 280; const y = 88 + row * 110; positions[node.id] = { x, y }; body += `<rect x="${x}" y="${y}" width="210" height="62" rx="12" fill="#edf2ff" stroke="#9db4ff"/><text x="${x + 16}" y="${y + 27}" font-size="15" font-family="Arial,sans-serif" font-weight="700" fill="#172033">${esc(node.label)}</text><text x="${x + 16}" y="${y + 47}" font-size="11" font-family="Arial,sans-serif" fill="#687386">${esc(node.description || '')}</text>`; });
      (model.edges || []).forEach(edge => { const a = positions[edge.source]; const b = positions[edge.target]; if (!a || !b) return; const x1 = a.x + 105, y1 = a.y + 62, x2 = b.x + 105, y2 = b.y; body = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#687386" stroke-width="2" marker-end="url(#arrow)"/><text x="${(x1+x2)/2}" y="${(y1+y2)/2 - 4}" font-size="11" font-family="Arial,sans-serif" fill="#687386">${esc(edge.label)}</text>` + body; });
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 z" fill="#687386"/></marker></defs>${body}</svg>`;
  }
  async function svgToPng(svg, scale = 2) {
    return new Promise((resolve, reject) => { const blob = new Blob([svg], { type: 'image/svg+xml' }); const url = URL.createObjectURL(blob); const image = new Image(); image.onload = () => { const canvas = document.createElement('canvas'); canvas.width = image.width * scale; canvas.height = image.height * scale; canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); resolve(canvas.toDataURL('image/png')); }; image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('PNG 导出失败')); }; image.src = url; });
  }
  root.AgfChartWorkspace = { save, get, list, remove, renderSvg, svgToPng };
  if (typeof module !== 'undefined') module.exports = root.AgfChartWorkspace;
})(typeof window !== 'undefined' ? window : globalThis);
