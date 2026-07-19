/* global window */
(function (root) {
  'use strict';
  const DB = 'agf_chart_workspace';
  const STORE = 'charts';
  const esc = value => String(value == null ? '' : value).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const truncate = (value, length) => { const text = String(value || ''); return text.length > length ? `${text.slice(0, length - 1)}…` : text; };

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
    const model = context.chartModel || {}; const title = esc(model.title); const width = 900; let height = context.intent === 'timeline' ? Math.max(280, 150 + (model.events || []).length * 86) : Math.max(420, 190 + Math.ceil((model.nodes || []).length / 3) * 120);
    let body = `<rect width="100%" height="100%" fill="#ffffff"/><text x="36" y="42" font-size="24" font-family="Arial,sans-serif" font-weight="700" fill="#172033">${title}</text>`;
    if (context.intent === 'timeline') {
      const events = model.events || []; body += `<line x1="110" y1="86" x2="110" y2="${height - 42}" stroke="#315efb" stroke-width="4"/>`;
      events.forEach((event, i) => { const y = 110 + i * 86; body += `<circle cx="110" cy="${y}" r="9" fill="#315efb"/><text x="140" y="${y - 5}" font-size="14" font-family="Arial,sans-serif" font-weight="700" fill="#172033">${esc(event.date || '')} ${esc(event.label)}</text><text x="140" y="${y + 19}" font-size="12" font-family="Arial,sans-serif" fill="#687386">${esc(event.description || '')}</text>`; });
    } else {
      const nodes = model.nodes || []; const edges = model.edges || [];
      const graphHeight = Math.max(height, 170 + Math.ceil(Math.max(nodes.length, 1) / 3) * 120);
      height = graphHeight;
      const layout = root.AgfChartLayout ? root.AgfChartLayout.layoutRelationship(nodes, edges, width, graphHeight) : null;
      const laidNodes = layout ? layout.nodes : nodes.map((node, i) => ({ ...node, x: 160 + (i % 3) * 280, y: 130 + Math.floor(i / 3) * 120, _group: i % 4, _scale: 1 }));
      const laidEdges = layout ? layout.edges : edges;
      const palette = layout ? layout.palette : [{ fill: '#eef4ff', line: '#315efb', text: '#172033' }];
      const positions = Object.fromEntries(laidNodes.map(node => [node.id, node]));
      body += `<text x="36" y="68" font-size="12" font-family="Arial,sans-serif" fill="#687386">布局：${esc(layout?.topology || 'grid')} · ${laidNodes.length} 节点 · ${laidEdges.length} 关系</text>`;
      laidEdges.forEach(edge => {
        const a = positions[edge.source]; const b = positions[edge.target]; if (!a || !b) return;
        const color = palette[edge._group % palette.length].line;
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
        const x1 = a.x + dx / len * 68, y1 = a.y + dy / len * 30, x2 = b.x - dx / len * 68, y2 = b.y - dy / len * 30;
        const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
        body += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${color}" stroke-width="2.2" marker-end="url(#arrow)"/><text x="${midX.toFixed(1)}" y="${(midY - 6).toFixed(1)}" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="${color}">${esc(truncate(edge.label, 16))}</text>`;
      });
      laidNodes.forEach(node => {
        const group = palette[(node._group || 0) % palette.length]; const scale = node._scale || 1;
        const w = 176 * scale, h = 72 * scale, x = node.x - w / 2, y = node.y - h / 2;
        body += `<g class="agf-chart-node" data-node-id="${esc(node.id)}" data-x="${node.x.toFixed(1)}" data-y="${node.y.toFixed(1)}" style="cursor:grab"><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="18" fill="${group.fill}" stroke="${group.line}" stroke-width="2"/><text x="${node.x}" y="${(node.y - 8).toFixed(1)}" text-anchor="middle" font-size="${Math.max(13, 15 * scale).toFixed(1)}" font-family="Arial,sans-serif" font-weight="700" fill="${group.text}" pointer-events="none">${esc(truncate(node.label, 18))}</text><text x="${node.x}" y="${(node.y + 15).toFixed(1)}" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#687386" pointer-events="none">${esc(truncate(node.description || '', 24))}</text></g>`;
      });
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 z" fill="#687386"/></marker></defs>${body}</svg>`;
  }
  async function svgToPng(svg, scale = 2) {
    return new Promise((resolve, reject) => { const blob = new Blob([svg], { type: 'image/svg+xml' }); const url = URL.createObjectURL(blob); const image = new Image(); image.onload = () => { const canvas = document.createElement('canvas'); canvas.width = image.width * scale; canvas.height = image.height * scale; canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); resolve(canvas.toDataURL('image/png')); }; image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('PNG 导出失败')); }; image.src = url; });
  }
  root.AgfChartWorkspace = { save, get, list, remove, renderSvg, svgToPng };
  if (typeof module !== 'undefined') module.exports = root.AgfChartWorkspace;
})(typeof window !== 'undefined' ? window : globalThis);
