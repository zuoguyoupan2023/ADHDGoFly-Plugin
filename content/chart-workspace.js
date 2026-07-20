/* global window */
(function (root) {
  'use strict';
  const DB = 'agf_chart_workspace';
  const STORE = 'charts';
  const esc = value => String(value == null ? '' : value).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const truncate = (value, length) => { const text = String(value || ''); return text.length > length ? `${text.slice(0, length - 1)}…` : text; };
  const graphIntents = new Set(['concept', 'relationship', 'mindmap', 'flowchart']);
  const themeTokens = context => context.theme === 'dark' ? { background: '#0f172a', title: '#f8fafc', muted: '#94a3b8', nodeText: '#e2e8f0', lane: '#1e293b', edge: '#94a3b8', roles: { frontend: ['#172554', '#60a5fa', '#dbeafe'], backend: ['#052e16', '#4ade80', '#dcfce7'], database: ['#422006', '#fbbf24', '#fef3c7'], security: ['#4c0519', '#fb7185', '#ffe4e6'], external: ['#334155', '#cbd5e1', '#f1f5f9'], message_bus: ['#312e81', '#a78bfa', '#ede9fe'], cloud: ['#164e63', '#22d3ee', '#cffafe'], generic: ['#1e293b', '#94a3b8', '#e2e8f0'] } } : { background: '#ffffff', title: '#172033', muted: '#687386', nodeText: '#172033', lane: '#f7f9fc', edge: '#687386', roles: { frontend: ['#eef4ff', '#315efb', '#172033'], backend: ['#eefaf2', '#1f9d55', '#173b25'], database: ['#fff7e8', '#d9822b', '#4a2a0a'], security: ['#fff1f2', '#e11d48', '#4a0d1b'], external: ['#f1f5f9', '#64748b', '#1e293b'], message_bus: ['#f7efff', '#8b5cf6', '#2f1d52'], cloud: ['#eefbff', '#0891b2', '#083344'], generic: ['#eef4ff', '#315efb', '#172033'] } };
  const roleOf = node => node.styleRole || (node.kind === 'source' ? 'external' : node.kind === 'transform' ? 'backend' : node.kind === 'store' ? 'database' : node.kind === 'sink' ? 'external' : 'generic');
  const semanticTokens = (context, node) => themeTokens(context).roles[roleOf(node)] || themeTokens(context).roles.generic;
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
      const markup = roughPaths(root.rough.generator({ options: { seed: 7 } }).rectangle(x, y, width, height, options)).replace(/<path/g, '<path pointer-events="none"');
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
    if (context.intent === 'data' || context.renderer === 'echarts') return renderDataSvg(context);
    if (context.viewType === 'workflow' || context.viewType === 'data_flow' || context.viewType === 'lifecycle') return renderSemanticSvg(context);
    if (context.renderer === 'mermaid' && graphIntents.has(context.intent)) return renderMermaidStyleSvg(context);
    const model = context.chartModel || {}; const theme = themeTokens(context); const title = esc(model.title); const width = 900; let height = context.intent === 'timeline' ? Math.max(280, 150 + (model.events || []).length * 86) : Math.max(420, 190 + Math.ceil((model.nodes || []).length / 3) * 120);
    let body = `<rect width="100%" height="100%" fill="${theme.background}"/><text x="36" y="42" font-size="24" font-family="Arial,sans-serif" font-weight="700" fill="${theme.title}">${title}</text>`;
    if (context.intent === 'timeline') {
      const events = model.events || []; body += `<line x1="110" y1="86" x2="110" y2="${height - 42}" stroke="#315efb" stroke-width="4"/>`;
      events.forEach((event, i) => { const y = 110 + i * 86; body += `<circle cx="110" cy="${y}" r="9" fill="#315efb"/><text x="140" y="${y - 5}" font-size="14" font-family="Arial,sans-serif" font-weight="700" fill="#172033">${esc(event.date || '')} ${esc(event.label)}</text><text x="140" y="${y + 19}" font-size="12" font-family="Arial,sans-serif" fill="#687386">${esc(event.description || '')}</text>`; });
    } else {
      const nodes = model.nodes || []; const edges = model.edges || [];
      const graphHeight = Math.max(height, 170 + Math.ceil(Math.max(nodes.length, 1) / 3) * 120);
      height = graphHeight;
      const layout = root.AgfChartLayout ? root.AgfChartLayout.layoutRelationship(nodes, edges, width, graphHeight, context.intent) : null;
      const laidNodes = layout ? layout.nodes : nodes.map((node, i) => ({ ...node, x: 160 + (i % 3) * 280, y: 130 + Math.floor(i / 3) * 120, _group: i % 4, _scale: 1 }));
      laidNodes.forEach(node => { const size = nodeSize(node); const scale = node._scale || 1; node.x = Math.max(size.width * scale / 2 + 20, Math.min(width - size.width * scale / 2 - 20, Number(node.x) || width / 2)); node.y = Math.max(size.height * scale / 2 + 82, Math.min(graphHeight - size.height * scale / 2 - 20, Number(node.y) || 140)); });
      const laidEdges = layout ? layout.edges : edges;
      const palette = layout ? layout.palette : [{ fill: '#eef4ff', line: '#315efb', text: '#172033' }];
      const positions = Object.fromEntries(laidNodes.map(node => [node.id, node]));
      const typeLabel = { concept: '概念图', relationship: '关系图', mindmap: '思维导图', flowchart: '流程图' }[context.intent] || '关系图';
      body += `<text x="36" y="68" font-size="12" font-family="Arial,sans-serif" fill="${theme.muted}">${typeLabel} · 布局：${esc(layout?.topology || 'grid')} · ${laidNodes.length} 节点 · ${laidEdges.length} 关系</text>`;
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
        body += `${edgeShape}<text class="agf-chart-edge-label" data-edge-index="${laidEdges.indexOf(edge)}" x="${midX.toFixed(1)}" y="${(midY - 6).toFixed(1)}" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="${color}" style="cursor:grab">${esc(truncate(edge.label, 18))}</text>`;
      });
      laidNodes.forEach(node => {
        const group = palette[(node._group || 0) % palette.length]; const scale = node._scale || 1;
        const size = nodeSize(node); const w = size.width * scale, h = size.height * scale, x = node.x - w / 2, y = node.y - h / 2;
        const shape = context.renderer === 'rough'
          ? roughRectMarkup(x, y, w, h, { roughness: 2.1, stroke: group.line, strokeWidth: 2, fill: group.fill, fillStyle: 'hachure', hachureAngle: 45, hachureGap: 5, fillWeight: 1.1, seed: laidNodes.indexOf(node) + 10 })
          : `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="18" fill="${group.fill}" stroke="${group.line}" stroke-width="2"/>`;
        const labelStart = node.y - h / 2 + 26;
        const descStart = labelStart + size.labelLines.length * 18 + 5;
        body += `<g class="agf-chart-node" data-node-id="${esc(node.id)}" data-x="${node.x.toFixed(1)}" data-y="${node.y.toFixed(1)}" style="cursor:grab;pointer-events:all">${shape}<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="transparent" stroke="none" pointer-events="all"/><text class="agf-chart-node-label" data-node-id="${esc(node.id)}" text-anchor="middle" font-size="${Math.max(13, 15 * scale).toFixed(1)}" font-family="Arial,sans-serif" font-weight="700" fill="${group.text}" style="cursor:grab">${textLines(size.labelLines, node.x, labelStart)}</text><text class="agf-chart-node-desc" data-node-id="${esc(node.id)}" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#687386" style="cursor:grab">${textLines(size.descLines, node.x, descStart)}</text></g>`;
      });
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 z" fill="#687386"/></marker></defs>${body}</svg>`;
  }
  function renderDataSvg(context) {
    const model = context.chartModel || {}; const series = (model.series || []).filter(item => Array.isArray(item.data)); const width = 900; const height = 520; const theme = themeTokens(context); const title = esc(model.title || '数据图表');
    const points = series.flatMap(item => item.data || []).filter(point => Number.isFinite(Number(point.value)));
    if (!points.length) return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="280" viewBox="0 0 ${width} 280"><rect width="100%" height="100%" fill="${theme.background}"/><text x="32" y="42" font-size="24" font-family="Arial,sans-serif" font-weight="700" fill="${theme.title}">${title}</text><text x="32" y="92" font-size="14" font-family="Arial,sans-serif" fill="${theme.muted}">没有足够的数值数据，已降级为表格/文本结果。</text></svg>`;
    const max = Math.max(...points.map(point => Number(point.value)), 0); const min = Math.min(...points.map(point => Number(point.value)), 0); const range = max - min || 1; const chartX = 72; const chartY = 92; const chartW = 760; const chartH = 320; const colors = ['#315efb', '#1f9d55', '#d9822b', '#8b5cf6'];
    let body = `<rect width="100%" height="100%" fill="${theme.background}"/><text x="32" y="42" font-size="24" font-family="Arial,sans-serif" font-weight="700" fill="${theme.title}">${title}</text><text x="32" y="67" font-size="12" font-family="Arial,sans-serif" fill="${theme.muted}">数据图表 · ${esc(model.units || '无单位')} · ${points.length} 个数据点</text><line x1="${chartX}" y1="${chartY + chartH}" x2="${chartX + chartW}" y2="${chartY + chartH}" stroke="${theme.edge}"/><line x1="${chartX}" y1="${chartY}" x2="${chartX}" y2="${chartY + chartH}" stroke="${theme.edge}"/>`;
    const first = series[0]; const type = first?.type || 'bar';
    if (type === 'table') return renderDataTableSvg(context, points);
    if (type === 'pie') {
      const item = first || { data: points }; const valid = item.data.filter(point => Number.isFinite(Number(point.value)) && Number(point.value) >= 0); const total = valid.reduce((sum, point) => sum + Number(point.value), 0) || 1; const cx = 360; const cy = 270; const radius = 150;
      let angle = -Math.PI / 2; valid.forEach((point, i) => { const next = angle + Number(point.value) / total * Math.PI * 2; const x1 = cx + radius * Math.cos(angle); const y1 = cy + radius * Math.sin(angle); const x2 = cx + radius * Math.cos(next); const y2 = cy + radius * Math.sin(next); const large = next - angle > Math.PI ? 1 : 0; body += `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${radius},${radius} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${colors[i % colors.length]}"/><text x="${560}" y="${140 + i * 28}" font-size="12" fill="${theme.title}">${esc(point.label)}：${esc(point.value)} (${(Number(point.value) / total * 100).toFixed(1)}%)</text>`; angle = next; });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
    }
    if (type === 'line') {
      series.forEach((item, seriesIndex) => { const valid = item.data.filter(point => Number.isFinite(Number(point.value))); const path = valid.map((point, i) => `${i ? 'L' : 'M'}${chartX + (i + .5) * chartW / Math.max(valid.length, 1)},${chartY + chartH - ((point.value - min) / range) * chartH}`).join(' '); body += `<path d="${path}" fill="none" stroke="${colors[seriesIndex % colors.length]}" stroke-width="3"/>`; valid.forEach((point, i) => { const x = chartX + (i + .5) * chartW / Math.max(valid.length, 1), y = chartY + chartH - ((point.value - min) / range) * chartH; body += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${colors[seriesIndex % colors.length]}"/><text x="${x.toFixed(1)}" y="${chartY + chartH + 22}" text-anchor="middle" font-size="11" fill="${theme.muted}">${esc(point.label)}</text>`; }); });
    } else {
      const item = first || { data: points }; item.data.filter(point => Number.isFinite(Number(point.value))).forEach((point, i) => { const barW = Math.min(90, chartW / Math.max(item.data.length, 1) - 14); const x = chartX + i * chartW / Math.max(item.data.length, 1) + (chartW / Math.max(item.data.length, 1) - barW) / 2; const barH = ((point.value - min) / range) * chartH; const y = chartY + chartH - barH; body += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(1, barH).toFixed(1)}" rx="5" fill="${colors[i % colors.length]}"/><text x="${(x + barW / 2).toFixed(1)}" y="${chartY + chartH + 22}" text-anchor="middle" font-size="11" fill="${theme.muted}">${esc(point.label)}</text><text x="${(x + barW / 2).toFixed(1)}" y="${Math.max(chartY + 14, y - 6).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.title}">${esc(point.value)}</text>`; });
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
  }
  function renderDataTableSvg(context, points) {
    const theme = themeTokens(context); const title = esc(context.chartModel?.title || '数据表'); let body = `<rect width="100%" height="100%" fill="${theme.background}"/><text x="32" y="42" font-size="24" font-family="Arial,sans-serif" font-weight="700" fill="${theme.title}">${title}</text><text x="32" y="70" font-size="13" fill="${theme.muted}">数值不足以绘制趋势，已降级为数据表</text>`;
    points.forEach((point, index) => { const y = 110 + index * 34; body += `<line x1="40" y1="${y + 12}" x2="860" y2="${y + 12}" stroke="#e5e7eb"/><text x="52" y="${y}" font-size="13" fill="${theme.title}">${esc(point.label)}</text><text x="760" y="${y}" font-size="13" text-anchor="end" fill="${theme.title}">${esc(point.value)}</text>`; });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${Math.max(180, 120 + points.length * 34)}" viewBox="0 0 900 ${Math.max(180, 120 + points.length * 34)}">${body}</svg>`;
  }
  function semanticLayout(context, nodes, edges, width, height) {
    const view = context.viewType; const order = root.AgfChartLayout?.topoSort ? root.AgfChartLayout.topoSort(nodes, edges) : nodes.map(n => n.id); const orderIndex = Object.fromEntries(order.map((id, i) => [id, i]));
    const grouped = {}; nodes.filter(n => !n.isLane && !n.hidden).forEach(n => { const lane = n.groupId || (view === 'data_flow' ? roleOf(n) : '主流程'); (grouped[lane] ||= []).push(n); });
    const rows = []; Object.entries(grouped).forEach(([lane, laneNodes]) => { laneNodes.sort((a, b) => (orderIndex[a.id] ?? 999) - (orderIndex[b.id] ?? 999)); for (let i = 0; i < laneNodes.length; i += 4) rows.push({ lane, rowIndex: Math.floor(i / 4), nodes: laneNodes.slice(i, i + 4) }); });
    const rowHeight = Math.max(112, (height - 100) / Math.max(1, rows.length)); const positions = {};
    rows.forEach((row, ri) => { const step = Math.min(210, (width - 220) / Math.max(1, row.nodes.length)); const reverse = ri % 2 === 1; row.y = 92 + ri * rowHeight + rowHeight / 2; row.index = ri; row.nodes.forEach((node, i) => { const col = reverse ? row.nodes.length - 1 - i : i; positions[node.id] = { ...node, x: 120 + (col + 0.5) * step, y: row.y, _lane: row.lane, _rowIndex: row.rowIndex, _row: ri, _group: ri }; }); });
    rows.forEach(row => row.nodes.forEach(node => { if (Number.isFinite(Number(node.x)) && Number.isFinite(Number(node.y))) positions[node.id].x = Number(node.x), positions[node.id].y = Number(node.y); positions[node.id].x = Math.max(90, Math.min(width - 90, positions[node.id].x)); positions[node.id].y = Math.max(116, Math.min(height - 42, positions[node.id].y)); }));
    const laneRows = Object.fromEntries(rows.map(row => [`${row.lane}::${row.rowIndex}`, row]));
    return { nodes: nodes.map(n => positions[n.id] || { ...n, x: 120, y: 120 }), edges, lanes: rows.map(row => row.lane), rows, laneRows, rowHeight };
  }
  function renderSemanticSvg(context) {
    const model = context.chartModel || {}; const nodes = model.nodes || []; const edges = model.edges || []; const width = 1000; const rowCount = Math.max(1, Math.ceil(nodes.filter(n => !n.isLane && !n.hidden).length / 4)); const height = Math.max(460, 170 + rowCount * 120); const theme = themeTokens(context); const layout = semanticLayout(context, nodes, edges, width, height); const pos = Object.fromEntries(layout.nodes.map(n => [n.id, n]));
    let body = `<rect width="100%" height="100%" fill="${theme.background}"/><text x="32" y="38" font-size="24" font-family="Arial,sans-serif" font-weight="700" fill="${theme.title}">${esc(model.title || '图表')}</text><text x="32" y="64" font-size="12" font-family="Arial,sans-serif" fill="${theme.muted}">${esc(context.viewType)} · 确定性布局 · ${nodes.length} 节点 · ${edges.length} 关系</text>`;
    layout.rows.forEach((row, i) => { const y = 82 + i * layout.rowHeight; body += `<rect x="24" y="${y.toFixed(1)}" width="952" height="${Math.max(70, layout.rowHeight - 10).toFixed(1)}" rx="12" fill="${theme.lane}" opacity=".72"/>`; });
    edges.forEach((edge, i) => { const a = pos[edge.source], b = pos[edge.target]; if (!a || !b) return; const color = edge.emphasis ? '#e11d48' : theme.edge; const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1; const x1 = a.x + dx / len * 70, y1 = a.y + dy / len * 29, x2 = b.x - dx / len * 70, y2 = b.y - dy / len * 29; body += `<path class="agf-chart-edge" data-edge-index="${i}" d="M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${edge.emphasis ? 3 : 2}" marker-end="url(#arrow)" style="pointer-events:stroke"/><text class="agf-chart-edge-label" data-edge-index="${i}" x="${((x1+x2)/2).toFixed(1)}" y="${((y1+y2)/2-6).toFixed(1)}" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="${color}" style="pointer-events:all">${esc(truncate(edge.label, 18))}</text>`; });
    layout.nodes.filter(node => !node.isLane && !node.hidden).forEach(node => { const [fill, line, text] = semanticTokens(context, node); const w = 140, h = 58; const shape = context.renderer === 'rough' ? roughRectMarkup(node.x - w / 2, node.y - h / 2, w, h, { roughness: 2, stroke: line, strokeWidth: 2, fill, fillStyle: 'hachure', seed: layout.nodes.indexOf(node) + 22 }) : `<rect x="${(node.x-w/2).toFixed(1)}" y="${(node.y-h/2).toFixed(1)}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${line}" stroke-width="2"/>`; body += `<g class="agf-chart-node" data-node-id="${esc(node.id)}" data-x="${node.x.toFixed(1)}" data-y="${node.y.toFixed(1)}" style="cursor:grab;pointer-events:all">${shape}<rect x="${node.x-w/2}" y="${node.y-h/2}" width="${w}" height="${h}" fill="transparent" stroke="none" pointer-events="all"/><text class="agf-chart-node-label" data-node-id="${esc(node.id)}" x="${node.x}" y="${node.y-3}" text-anchor="middle" font-size="14" font-family="Arial,sans-serif" font-weight="700" fill="${text}" style="pointer-events:all;cursor:grab">${esc(truncate(node.label, 18))}</text><text x="${node.x}" y="${node.y+17}" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="${text}" style="pointer-events:none">${esc(roleOf(node))}</text></g>`; });
    nodes.filter(node => node.isLane && !node.hidden).forEach(node => { const row = layout.laneRows[`${node.laneKey || node.label}::${Number.isInteger(Number(node.rowIndex)) ? Number(node.rowIndex) : 0}`]; const fallbackY = row ? row.y : 92 + layout.rowHeight / 2; const x = Number.isFinite(Number(node.x)) ? Number(node.x) : 76; const y = Number.isFinite(Number(node.y)) ? Number(node.y) : fallbackY; body += `<g class="agf-chart-node" data-node-id="${esc(node.id)}" data-x="${x.toFixed(1)}" data-y="${y.toFixed(1)}" style="cursor:grab;pointer-events:all"><rect x="${x-42}" y="${y-22}" width="84" height="44" rx="9" fill="${theme.background}" stroke="${theme.muted}" stroke-width="1.5"/><rect x="${x-42}" y="${y-22}" width="84" height="44" fill="transparent" stroke="none" pointer-events="all"/><text class="agf-chart-node-label" data-node-id="${esc(node.id)}" x="${x}" y="${y+5}" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" font-weight="700" fill="${theme.muted}" style="pointer-events:all;cursor:grab">${esc(truncate(node.label, 12))}</text></g>`; });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 z" fill="${theme.edge}"/></marker></defs>${body}</svg>`;
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
    const title = esc(context.chartModel?.title || 'Jixia 图表');
    const payload = exportJson(context).replace(/</g, '\\u003c');
    const modelApi = root.AgfChartModel;
    const accessible = esc(modelApi?.buildAccessibilityText ? modelApi.buildAccessibilityText(context) : '图表文本摘要不可用');
    const copyable = esc(modelApi?.buildCopyableData ? modelApi.buildCopyableData(context) : '');
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;padding:32px;background:#f4f6fb;color:#172033;font:14px Arial,sans-serif}main{max-width:1100px;margin:auto;background:#fff;padding:24px;border-radius:16px;box-shadow:0 4px 20px #17203318}svg{display:block;max-width:100%;height:auto}details{margin-top:20px}pre{white-space:pre-wrap}textarea{width:100%;min-height:100px;box-sizing:border-box}</style></head><body><main>${svg}<section aria-label="图表文本摘要"><h2>图表文本摘要</h2><pre>${accessible}</pre></section><details><summary>可复制数据</summary><textarea aria-label="可复制数据" readonly>${copyable}</textarea></details><details><summary>图表数据与来源</summary><pre id="data"></pre></details></main><script>const chartContext=${payload};document.getElementById('data').textContent=JSON.stringify(chartContext,null,2);</script></body></html>`;
  }
  function ensureLaneNodes(context) {
    if (!context || context._laneNodesInitialized || !['workflow', 'data_flow', 'lifecycle'].includes(context.viewType)) return context;
    const nodes = context.chartModel?.nodes || []; const laneCounts = {}; nodes.filter(n => !n.isLane && !n.hidden).forEach(n => { const lane = n.groupId || (context.viewType === 'data_flow' ? roleOf(n) : '主流程'); laneCounts[lane] = (laneCounts[lane] || 0) + 1; });
    Object.entries(laneCounts).forEach(([lane, count], index) => { const rows = Math.max(1, Math.ceil(count / 4)); for (let row = 0; row < rows; row++) { const label = rows > 1 ? `${lane} ${row + 1}` : lane; if (!nodes.some(n => n.isLane && n.laneKey === lane && Number(n.rowIndex || 0) === row && !n.hidden)) nodes.push({ id: `lane-${Date.now().toString(36)}-${index}-${row}`, label, laneKey: lane, rowIndex: row, description: '泳道', isLane: true, sourceRefs: [] }); } });
    context._laneNodesInitialized = true;
    return context;
  }
  function validateChartQuality(context, svgText) {
    const errors = []; const warnings = []; const model = context?.chartModel || {}; const nodes = (model.nodes || []).filter(node => !node.hidden); const ids = new Set();
    nodes.forEach(node => { if (ids.has(node.id)) errors.push(`节点 id 重复：${node.id}`); ids.add(node.id); });
    (model.edges || []).forEach(edge => { if (!ids.has(edge.source) || !ids.has(edge.target)) errors.push(`连线引用不存在节点：${edge.source} -> ${edge.target}`); });
    const connected = new Set();
    (model.edges || []).forEach(edge => { connected.add(edge.source); connected.add(edge.target); });
    nodes.filter(node => !node.isLane && !connected.has(node.id)).forEach(node => warnings.push(`孤立节点：${node.label}`));
    const viewBox = String(svgText || '').match(/viewBox="[^"]*"/); if (!svgText || !/<svg[\s>]/.test(svgText)) errors.push('SVG 为空或格式无效'); if (!viewBox) errors.push('SVG 缺少 viewBox');
    if (viewBox) { const values = viewBox[0].match(/-?[\d.]+/g).map(Number); const [, , width, height] = values; nodes.filter(node => Number.isFinite(node.x) && Number.isFinite(node.y) && !node.isLane).forEach(node => { if (node.x < 0 || node.x > width || node.y < 0 || node.y > height) warnings.push(`节点可能超出 SVG：${node.label}`); }); }
    const regular = nodes.filter(node => Number.isFinite(node.x) && Number.isFinite(node.y) && !node.isLane); for (let i = 0; i < regular.length; i++) for (let j = i + 1; j < regular.length; j++) if (Math.abs(regular[i].x - regular[j].x) < 140 && Math.abs(regular[i].y - regular[j].y) < 58) warnings.push(`节点可能重叠：${regular[i].label} / ${regular[j].label}`);
    const point = node => node && Number.isFinite(node.x) && Number.isFinite(node.y) ? [node.x, node.y] : null;
    const orientation = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const intersects = (a, b, c, d) => orientation(a, b, c) * orientation(a, b, d) < 0 && orientation(c, d, a) * orientation(c, d, b) < 0;
    const segments = (model.edges || []).map(edge => ({ edge, a: point(nodes.find(node => node.id === edge.source)), b: point(nodes.find(node => node.id === edge.target)) })).filter(item => item.a && item.b);
    for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
      const first = segments[i], second = segments[j];
      if (new Set([first.edge.source, first.edge.target, second.edge.source, second.edge.target]).size < 4) continue;
      if (intersects(first.a, first.b, second.a, second.b)) warnings.push(`连线可能交叉：${first.edge.source}→${first.edge.target} / ${second.edge.source}→${second.edge.target}`);
    }
    return { valid: errors.length === 0, errors, warnings };
  }
  function getNodeDragBounds(context, node) {
    const semantic = ['workflow', 'data_flow', 'lifecycle'].includes(context?.viewType);
    return semantic ? { width: 140, height: 58 } : nodeSize(node);
  }
  root.AgfChartWorkspace = { save, get, list, remove, renderSvg, renderSvgAsync, renderMermaidSvg, svgToPng, svgToPngWithOptions, exportJson, importJson, exportHtml, getNodeDragBounds, ensureLaneNodes, validateChartQuality };
  if (typeof module !== 'undefined') module.exports = root.AgfChartWorkspace;
})(typeof window !== 'undefined' ? window : globalThis);
