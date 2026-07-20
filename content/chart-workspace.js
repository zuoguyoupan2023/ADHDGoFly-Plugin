/* global window */
(function (root) {
  'use strict';
  const DB = 'agf_chart_workspace';
  const STORE = 'charts';
  const esc = value => String(value == null ? '' : value).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const truncate = (value, length) => { const text = String(value || ''); return text.length > length ? `${text.slice(0, length - 1)}…` : text; };
  const graphIntents = new Set(['concept', 'relationship', 'mindmap', 'flowchart']);
  const wrapText = (value, maxChars = 12, maxLines = 4) => {
    const raw = String(value || '').trim();
    const chunks = raw.match(new RegExp(`.{1,${maxChars}}`, 'g')) || [''];
    const lines = chunks.slice(0, maxLines);
    if (chunks.length > maxLines) lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(1, maxChars - 1))}…`;
    return lines;
  };
  const nodeSize = node => {
    const labelLines = wrapText(node.label, 12, 3);
    const descLines = wrapText(node.description, 18, 2).filter(Boolean);
    return { labelLines, descLines, width: Math.max(156, Math.max(...labelLines.map(x => x.length), 6) * 13 + 38), height: 34 + labelLines.length * 19 + descLines.length * 15 };
  };
  const textLines = (lines, x, y, attrs = '') => lines.map((line, i) => `<tspan x="${x}" y="${y + i * 17}" ${attrs}>${esc(line)}</tspan>`).join('');
  const roughLine = (x1, y1, x2, y2) => {
    const k = n => Number(n).toFixed(1);
    return `M${k(x1)},${k(y1)} C${k((x1+x2)/2+3)},${k(y1-4)} ${k((x1+x2)/2-3)},${k(y2+4)} ${k(x2)},${k(y2)} M${k(x1+1.5)},${k(y1-1.2)} C${k((x1+x2)/2-4)},${k(y1+3)} ${k((x1+x2)/2+4)},${k(y2-3)} ${k(x2-1.5)},${k(y2+1.2)}`;
  };
  function roughPaths(shape) {
    if (!root.rough || !root.rough.generator) return '';
    try {
      return root.rough.generator().toPaths(shape).map(path => `<path d="${esc(path.d)}" stroke="${esc(path.stroke)}" stroke-width="${esc(path.strokeWidth)}" fill="${esc(path.fill)}"${path.fill === 'none' ? '' : ' opacity="0.95"'}/>`).join('');
    } catch (_) {
      return '';
    }
  }
  function roughLineMarkup(x1, y1, x2, y2, options) {
    if (root.rough?.generator) {
      const markup = roughPaths(root.rough.generator({ options: { seed: 4 } }).line(x1, y1, x2, y2, options));
      if (markup) return markup;
    }
    return `<path d="${roughLine(x1, y1, x2, y2)}" fill="none" stroke="${esc(options.stroke)}" stroke-width="${esc(options.strokeWidth || 1.5)}"/>`;
  }
  function roughRectMarkup(x, y, width, height, options) {
    if (root.rough?.generator) {
      const markup = roughPaths(root.rough.generator({ options: { seed: 7 } }).rectangle(x, y, width, height, options));
      if (markup) return markup;
    }
    return `<path d="${roughLine(x, y + 8, x + width, y + 8)} ${roughLine(x + width, y + 8, x + width, y + height - 8)} ${roughLine(x + width, y + height - 8, x, y + height - 8)} ${roughLine(x, y + height - 8, x, y + 8)}" fill="${esc(options.fill || 'none')}" stroke="${esc(options.stroke)}" stroke-width="${esc(options.strokeWidth || 1.5)}"/>`;
  }

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
    if (context.renderer === 'mermaid' && graphIntents.has(context.intent)) return renderMermaidStyleSvg(context);
    const model = context.chartModel || {}; const title = esc(model.title); const width = 900; let height = context.intent === 'timeline' ? Math.max(280, 150 + (model.events || []).length * 86) : Math.max(420, 190 + Math.ceil((model.nodes || []).length / 3) * 120);
    let body = `<rect width="100%" height="100%" fill="#ffffff"/><text x="36" y="42" font-size="24" font-family="Arial,sans-serif" font-weight="700" fill="#172033">${title}</text>`;
    if (context.intent === 'timeline') {
      const events = model.events || []; body += `<line x1="110" y1="86" x2="110" y2="${height - 42}" stroke="#315efb" stroke-width="4"/>`;
      events.forEach((event, i) => { const y = 110 + i * 86; body += `<circle cx="110" cy="${y}" r="9" fill="#315efb"/><text x="140" y="${y - 5}" font-size="14" font-family="Arial,sans-serif" font-weight="700" fill="#172033">${esc(event.date || '')} ${esc(event.label)}</text><text x="140" y="${y + 19}" font-size="12" font-family="Arial,sans-serif" fill="#687386">${esc(event.description || '')}</text>`; });
    } else {
      const nodes = model.nodes || []; const edges = model.edges || [];
      const graphHeight = Math.max(height, 170 + Math.ceil(Math.max(nodes.length, 1) / 3) * 120);
      height = graphHeight;
      const layout = root.AgfChartLayout ? root.AgfChartLayout.layoutRelationship(nodes, edges, width, graphHeight, context.intent) : null;
      const laidNodes = layout ? layout.nodes : nodes.map((node, i) => ({ ...node, x: 160 + (i % 3) * 280, y: 130 + Math.floor(i / 3) * 120, _group: i % 4, _scale: 1 }));
      const laidEdges = layout ? layout.edges : edges;
      const palette = layout ? layout.palette : [{ fill: '#eef4ff', line: '#315efb', text: '#172033' }];
      const positions = Object.fromEntries(laidNodes.map(node => [node.id, node]));
      const typeLabel = { concept: '概念图', relationship: '关系图', mindmap: '思维导图', flowchart: '流程图' }[context.intent] || '关系图';
      body += `<text x="36" y="68" font-size="12" font-family="Arial,sans-serif" fill="#687386">${typeLabel} · 布局：${esc(layout?.topology || 'grid')} · ${laidNodes.length} 节点 · ${laidEdges.length} 关系</text>`;
      laidEdges.forEach(edge => {
        const a = positions[edge.source]; const b = positions[edge.target]; if (!a || !b) return;
        const color = palette[edge._group % palette.length].line;
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
        const as = nodeSize(a), bs = nodeSize(b);
        const x1 = a.x + dx / len * (as.width / 2), y1 = a.y + dy / len * (as.height / 2), x2 = b.x - dx / len * (bs.width / 2), y2 = b.y - dy / len * (bs.height / 2);
        const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
        const edgeShape = context.renderer === 'rough'
          ? `<g class="agf-chart-edge" data-edge-index="${laidEdges.indexOf(edge)}" marker-end="url(#arrow)">${roughLineMarkup(x1, y1, x2, y2, { roughness: 1.6, stroke: color, strokeWidth: 1.8, fill: 'none', seed: laidEdges.indexOf(edge) + 1 })}</g>`
          : `<path class="agf-chart-edge" data-edge-index="${laidEdges.indexOf(edge)}" d="M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${color}" stroke-width="2.2" marker-end="url(#arrow)"/>`;
        body += `${edgeShape}<text class="agf-chart-edge-label" data-edge-index="${laidEdges.indexOf(edge)}" x="${midX.toFixed(1)}" y="${(midY - 6).toFixed(1)}" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="${color}" style="cursor:text">${esc(truncate(edge.label, 18))}</text>`;
      });
      laidNodes.forEach(node => {
        const group = palette[(node._group || 0) % palette.length]; const scale = node._scale || 1;
        const size = nodeSize(node); const w = size.width * scale, h = size.height * scale, x = node.x - w / 2, y = node.y - h / 2;
        const shape = context.renderer === 'rough'
          ? roughRectMarkup(x, y, w, h, { roughness: 2.1, stroke: group.line, strokeWidth: 2, fill: group.fill, fillStyle: 'hachure', hachureAngle: 45, hachureGap: 5, fillWeight: 1.1, seed: laidNodes.indexOf(node) + 10 })
          : `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="18" fill="${group.fill}" stroke="${group.line}" stroke-width="2"/>`;
        const labelStart = node.y - h / 2 + 26;
        const descStart = labelStart + size.labelLines.length * 18 + 5;
        body += `<g class="agf-chart-node" data-node-id="${esc(node.id)}" data-x="${node.x.toFixed(1)}" data-y="${node.y.toFixed(1)}" style="cursor:grab">${shape}<text class="agf-chart-node-label" data-node-id="${esc(node.id)}" text-anchor="middle" font-size="${Math.max(13, 15 * scale).toFixed(1)}" font-family="Arial,sans-serif" font-weight="700" fill="${group.text}" style="cursor:text">${textLines(size.labelLines, node.x, labelStart)}</text><text class="agf-chart-node-desc" data-node-id="${esc(node.id)}" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#687386" style="cursor:text">${textLines(size.descLines, node.x, descStart)}</text></g>`;
      });
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 z" fill="#687386"/></marker></defs>${body}</svg>`;
  }
  function renderMermaidStyleSvg(context) {
    const model = context.chartModel || {}; const nodes = model.nodes || []; const edges = model.edges || []; const width = 900; const height = Math.max(420, 180 + Math.ceil(Math.max(nodes.length, 1) / 3) * 120);
    const dsl = toMermaidDsl(context);
    const layout = root.AgfChartLayout ? root.AgfChartLayout.layoutRelationship(nodes, edges, width, height, context.intent) : null;
    const laidNodes = layout ? layout.nodes : nodes.map((node, i) => ({ ...node, x: 160 + (i % 3) * 280, y: 130 + Math.floor(i / 3) * 120, _group: i % 4 }));
    const positions = Object.fromEntries(laidNodes.map(node => [node.id, node]));
    let body = `<rect width="100%" height="100%" fill="#fbfcff"/><text x="36" y="42" font-size="24" font-family="Arial,sans-serif" font-weight="700" fill="#172033">${esc(model.title || 'Mermaid 图')}</text><text x="36" y="68" font-size="12" font-family="Arial,sans-serif" fill="#687386">Mermaid 风格预览 · 可复制 DSL</text><foreignObject x="610" y="24" width="250" height="110"><pre xmlns="http://www.w3.org/1999/xhtml" style="font:10px monospace;white-space:pre-wrap;margin:0;color:#687386;background:#f4f6fb;border:1px solid #dfe5f2;border-radius:8px;padding:8px">${esc(dsl)}</pre></foreignObject>`;
    edges.forEach((edge, i) => { const a = positions[edge.source], b = positions[edge.target]; if (!a || !b) return; body += `<path class="agf-chart-edge" data-edge-index="${i}" d="M${a.x},${a.y} L${b.x},${b.y}" fill="none" stroke="#6b7280" stroke-width="2" marker-end="url(#arrow)"/><text class="agf-chart-edge-label" data-edge-index="${i}" x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2 - 6}" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#4b5563">${esc(edge.label || '')}</text>`; });
    laidNodes.forEach(node => { const size = nodeSize(node); body += `<g class="agf-chart-node" data-node-id="${esc(node.id)}" data-x="${node.x.toFixed(1)}" data-y="${node.y.toFixed(1)}"><rect x="${node.x-size.width/2}" y="${node.y-size.height/2}" width="${size.width}" height="${size.height}" rx="6" fill="#ffffff" stroke="#7c3aed" stroke-width="2"/><text class="agf-chart-node-label" data-node-id="${esc(node.id)}" x="${node.x}" y="${node.y - 4}" text-anchor="middle" font-size="14" font-family="Arial,sans-serif" font-weight="700" fill="#1f2937">${textLines(size.labelLines, node.x, node.y - 8)}</text></g>`; });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 z" fill="#6b7280"/></marker></defs>${body}</svg>`;
  }
  function loadScriptOnce(globalName, path) {
    if (root[globalName]) return Promise.resolve(root[globalName]);
    if (!root.document || !root.chrome?.runtime?.getURL) return Promise.resolve(null);
    const marker = `agf-runtime-${globalName}`;
    const existing = root.document.querySelector(`script[data-agf-runtime="${marker}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true' || root[globalName]) return Promise.resolve(root[globalName] || null);
      return new Promise(resolve => {
        const timer = root.setTimeout(() => resolve(root[globalName] || null), 3000);
        existing.addEventListener('load', () => resolve(root[globalName] || null), { once: true });
        existing.addEventListener('error', () => resolve(null), { once: true });
        existing.addEventListener('load', () => root.clearTimeout(timer), { once: true });
        existing.addEventListener('error', () => root.clearTimeout(timer), { once: true });
      });
    }
    return new Promise(resolve => {
      const timer = root.setTimeout(() => resolve(root[globalName] || null), 5000);
      const script = root.document.createElement('script');
      script.dataset.agfRuntime = marker;
      script.src = root.chrome.runtime.getURL(path);
      script.onload = () => { root.clearTimeout(timer); script.dataset.loaded = 'true'; resolve(root[globalName] || null); };
      script.onerror = () => { root.clearTimeout(timer); script.dataset.loaded = 'error'; resolve(null); };
      (root.document.head || root.document.documentElement).appendChild(script);
    });
  }
  async function renderMermaidSvg(context) {
    await loadScriptOnce('mermaid', 'lib/mermaid.min.js');
    if (root.mermaid?.render) {
      try {
        root.mermaid.initialize?.({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
        const id = `agf-mermaid-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const result = await root.mermaid.render(id, toMermaidDsl(context));
        return result.svg || renderMermaidStyleSvg(context);
      } catch (error) {
        return renderMermaidStyleSvg({ ...context, chartModel: { ...(context.chartModel || {}), title: `${context.chartModel?.title || 'Mermaid'}（渲染失败：${error.message || error}）` } });
      }
    }
    return renderMermaidStyleSvg(context);
  }
  async function renderSvgAsync(context) {
    if (context.renderer === 'mermaid' && graphIntents.has(context.intent)) return renderMermaidSvg(context);
    return renderSvg(context);
  }
  function toMermaidDsl(context) {
    const model = context.chartModel || {}; const nodes = model.nodes || []; const edges = model.edges || [];
    const label = id => esc((nodes.find(n => n.id === id) || {}).label || id).replace(/"/g, "'");
    const header = context.intent === 'mindmap' ? 'mindmap' : 'flowchart TD';
    if (context.intent === 'mindmap') return [header, ...nodes.map(n => `  ${n.id}["${String(n.label || n.id).replace(/"/g, "'")}"]`), ...edges.map(e => `  ${e.source} --> ${e.target}`)].join('\n');
    return [header, ...nodes.map(n => `  ${n.id}["${String(n.label || n.id).replace(/"/g, "'")}"]`), ...edges.map(e => `  ${e.source} -->${e.label ? `|${String(e.label).replace(/"/g, "'")}|` : ''} ${e.target}`)].join('\n');
  }
  async function svgToPng(svg, scale = 2) {
    return svgToPngWithOptions(svg, { scale });
  }
  function svgToPngWithOptions(svg, options = {}) {
    const scale = Math.max(1, Math.min(4, Number(options.scale) || 2));
    const background = options.transparent ? null : (options.background || '#ffffff');
    return new Promise((resolve, reject) => {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }); const url = URL.createObjectURL(blob); const image = new Image();
      image.onload = () => { try { const width = image.naturalWidth || image.width || 900; const height = image.naturalHeight || image.height || 520; const canvas = document.createElement('canvas'); canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale); const ctx = canvas.getContext('2d'); if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); } ctx.drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); resolve(canvas.toDataURL('image/png')); } catch (error) { URL.revokeObjectURL(url); reject(error); } };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('PNG 导出失败')); }; image.src = url;
    });
  }
  function exportJson(context) { return JSON.stringify(context, null, 2); }
  function importJson(raw) {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const checked = root.AgfChartModel?.validateChartContext ? root.AgfChartModel.validateChartContext(parsed) : { valid: true, value: parsed, errors: [] };
    if (!checked.valid) throw new Error(`图表 JSON 无效：${checked.errors.join('；')}`);
    return checked.value;
  }
  function exportHtml(context, svg) {
    const title = esc(context.chartModel?.title || 'Taixue 图表');
    const payload = exportJson(context).replace(/</g, '\\u003c');
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;padding:32px;background:#f4f6fb;color:#172033;font:14px Arial,sans-serif}main{max-width:1100px;margin:auto;background:#fff;padding:24px;border-radius:16px;box-shadow:0 4px 20px #17203318}svg{display:block;max-width:100%;height:auto}details{margin-top:20px}pre{white-space:pre-wrap}</style></head><body><main>${svg}<details><summary>图表数据与来源</summary><pre id="data"></pre></details></main><script>const chartContext=${payload};document.getElementById('data').textContent=JSON.stringify(chartContext,null,2);</script></body></html>`;
  }
  root.AgfChartWorkspace = { save, get, list, remove, renderSvg, renderSvgAsync, renderMermaidSvg, svgToPng, svgToPngWithOptions, exportJson, importJson, exportHtml };
  if (typeof module !== 'undefined') module.exports = root.AgfChartWorkspace;
})(typeof window !== 'undefined' ? window : globalThis);
