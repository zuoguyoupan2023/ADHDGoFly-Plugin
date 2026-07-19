/* global window */
(function (root) {
  'use strict';

  const PALETTE = [
    { fill: '#eef4ff', line: '#315efb', text: '#172033' },
    { fill: '#eefaf2', line: '#1f9d55', text: '#173b25' },
    { fill: '#fff7e8', line: '#d9822b', text: '#4a2a0a' },
    { fill: '#f7efff', line: '#8b5cf6', text: '#2f1d52' },
    { fill: '#fff1f2', line: '#e11d48', text: '#4a0d1b' },
    { fill: '#eefbff', line: '#0891b2', text: '#083344' }
  ];

  const edgeId = value => typeof value === 'object' && value ? value.id : value;

  function topoSort(nodes, edges) {
    const inDeg = {}, adj = {};
    nodes.forEach(n => { inDeg[n.id] = 0; adj[n.id] = []; });
    edges.forEach(e => {
      const s = edgeId(e.source), t = edgeId(e.target);
      if (adj[s]) adj[s].push(t);
      inDeg[t] = (inDeg[t] || 0) + 1;
    });
    const queue = nodes.filter(n => (inDeg[n.id] || 0) === 0).map(n => n.id);
    const result = [];
    while (queue.length) {
      const cur = queue.shift();
      result.push(cur);
      (adj[cur] || []).forEach(nb => { if (--inDeg[nb] === 0) queue.push(nb); });
    }
    return result;
  }

  function detectTopology(nodes, edges) {
    if (!nodes.length) return 'general';
    const inDeg = {}, outDeg = {};
    nodes.forEach(n => { inDeg[n.id] = 0; outDeg[n.id] = 0; });
    edges.forEach(e => {
      const s = edgeId(e.source), t = edgeId(e.target);
      outDeg[s] = (outDeg[s] || 0) + 1;
      inDeg[t] = (inDeg[t] || 0) + 1;
    });
    if (topoSort(nodes, edges).length !== nodes.length) return 'general';
    if (nodes.every(n => (inDeg[n.id] || 0) + (outDeg[n.id] || 0) <= 2)) return 'chain';
    if (nodes.filter(n => (inDeg[n.id] || 0) === 0).length === 1) return 'tree';
    return 'dag';
  }

  function chainLayout(nodes, edges, W, H) {
    const order = topoSort(nodes, edges);
    const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(order.length, 1) * W / H)));
    const rows = Math.ceil(Math.max(order.length, 1) / cols);
    const cellW = (W - 120) / cols;
    const cellH = (H - 100) / rows;
    order.forEach((nodeId, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const actualCol = row % 2 === 0 ? col : (cols - 1 - col);
      const node = nodes.find(n => n.id === nodeId);
      if (node) { node.x = 60 + cellW * (actualCol + 0.5); node.y = 70 + cellH * (row + 0.5); }
    });
  }

  function treeLayout(nodes, edges, W, H) {
    const inDeg = {}, children = {};
    nodes.forEach(n => { inDeg[n.id] = 0; children[n.id] = []; });
    edges.forEach(e => { const s = edgeId(e.source), t = edgeId(e.target); if (children[s]) children[s].push(t); inDeg[t] = (inDeg[t] || 0) + 1; });
    const root = nodes.find(n => (inDeg[n.id] || 0) === 0) || nodes[0];
    const depth = root ? { [root.id]: 0 } : {};
    const queue = root ? [root.id] : [];
    let maxDepth = 0;
    while (queue.length) {
      const cur = queue.shift();
      (children[cur] || []).forEach(child => {
        if (depth[child] === undefined) { depth[child] = depth[cur] + 1; maxDepth = Math.max(maxDepth, depth[child]); queue.push(child); }
      });
    }
    nodes.forEach(n => { if (depth[n.id] === undefined) depth[n.id] = maxDepth + 1; });
    const layers = Array.from({ length: maxDepth + 2 }, () => []);
    nodes.forEach(n => { layers[depth[n.id]].push(n.id); });
    placeLayers(nodes, layers, W, H);
  }

  function dagLayout(nodes, edges, W, H) {
    const inDeg = {}, adj = {}, radj = {};
    nodes.forEach(n => { inDeg[n.id] = 0; adj[n.id] = []; radj[n.id] = []; });
    edges.forEach(e => {
      const s = edgeId(e.source), t = edgeId(e.target);
      if (adj[s]) adj[s].push(t);
      if (radj[t]) radj[t].push(s);
      inDeg[t] = (inDeg[t] || 0) + 1;
    });
    const layerOf = {}, tempInDeg = { ...inDeg };
    let layer = 0, queue = nodes.filter(n => (tempInDeg[n.id] || 0) === 0).map(n => n.id);
    while (queue.length) {
      queue.forEach(id => { layerOf[id] = layer; });
      const next = [];
      queue.forEach(id => (adj[id] || []).forEach(nb => { tempInDeg[nb]--; if (tempInDeg[nb] === 0) next.push(nb); }));
      queue = next; layer++;
    }
    nodes.forEach(n => { if (layerOf[n.id] === undefined) layerOf[n.id] = layer; });
    const layers = Array.from({ length: layer + 1 }, () => []);
    nodes.forEach(n => { layers[layerOf[n.id]].push(n.id); });
    const barycenter = (nodeId, adjacentLayer, direction) => {
      const neighbors = (direction === 'down' ? radj[nodeId] : adj[nodeId]).filter(nb => adjacentLayer.includes(nb));
      if (!neighbors.length) return Infinity;
      const positions = {}; adjacentLayer.forEach((id, i) => { positions[id] = i; });
      return neighbors.reduce((sum, nb) => sum + (positions[nb] || 0), 0) / neighbors.length;
    };
    for (let iter = 0; iter < 4; iter++) {
      for (let d = 1; d < layers.length; d++) layers[d].sort((a, b) => barycenter(a, layers[d - 1], 'down') - barycenter(b, layers[d - 1], 'down'));
      for (let d = layers.length - 2; d >= 0; d--) layers[d].sort((a, b) => barycenter(a, layers[d + 1], 'up') - barycenter(b, layers[d + 1], 'up'));
    }
    placeLayers(nodes, layers, W, H);
  }

  function placeLayers(nodes, layers, W, H) {
    const layerH = (H - 110) / Math.max(layers.length, 1);
    layers.forEach((layer, d) => {
      if (!layer.length) return;
      const layerW = (W - 140) / Math.max(layer.length, 1);
      layer.forEach((nodeId, i) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) { node.x = 70 + layerW * (i + 0.5); node.y = 76 + layerH * (d + 0.5); }
      });
    });
  }

  function calcDepths(nodes, edges) {
    const adj = {};
    nodes.forEach(n => { adj[n.id] = []; });
    edges.forEach(e => { const s = edgeId(e.source), t = edgeId(e.target); if (adj[s]) adj[s].push(t); if (adj[t]) adj[t].push(s); });
    const degree = {}; nodes.forEach(n => { degree[n.id] = (adj[n.id] || []).length; });
    const root = [...nodes].sort((a, b) => degree[b.id] - degree[a.id])[0];
    const depth = root ? { [root.id]: 0 } : {};
    const queue = root ? [root.id] : [];
    while (queue.length) {
      const cur = queue.shift();
      (adj[cur] || []).forEach(nb => { if (depth[nb] === undefined) { depth[nb] = depth[cur] + 1; queue.push(nb); } });
    }
    nodes.forEach(n => { n._depth = depth[n.id] || 0; });
  }

  function assignGroups(nodes, edges) {
    const adj = {};
    nodes.forEach(n => { adj[n.id] = []; });
    edges.forEach(e => { const s = edgeId(e.source), t = edgeId(e.target); if (adj[s]) adj[s].push(t); if (adj[t]) adj[t].push(s); });
    const degree = {}; nodes.forEach(n => { degree[n.id] = (adj[n.id] || []).length; });
    const sorted = [...nodes].sort((a, b) => degree[b.id] - degree[a.id]);
    const roots = sorted.slice(0, Math.min(PALETTE.length, Math.max(2, Math.ceil(nodes.length / 3)))).map(n => n.id);
    const groupOf = {}, queue = [];
    roots.forEach((rid, gi) => { groupOf[rid] = gi; queue.push(rid); });
    while (queue.length) {
      const cur = queue.shift(), group = groupOf[cur];
      (adj[cur] || []).forEach(nb => { if (groupOf[nb] === undefined) { groupOf[nb] = group; queue.push(nb); } });
    }
    let fallback = 0;
    nodes.forEach(n => { if (groupOf[n.id] === undefined) groupOf[n.id] = (fallback++) % PALETTE.length; n._group = groupOf[n.id]; });
    edges.forEach(e => { e._group = groupOf[edgeId(e.source)] || 0; });
  }

  function layoutRelationship(nodes, edges, W = 900, H = 520) {
    const nextNodes = nodes.map(n => ({ ...n }));
    const nextEdges = edges.map(e => ({ ...e }));
    assignGroups(nextNodes, nextEdges);
    calcDepths(nextNodes, nextEdges);
    const topology = detectTopology(nextNodes, nextEdges);
    const storedPositions = {};
    nextNodes.forEach(node => {
      if (Number.isFinite(Number(node.x)) && Number.isFinite(Number(node.y))) storedPositions[node.id] = { x: Number(node.x), y: Number(node.y) };
    });
    if (topology === 'chain') chainLayout(nextNodes, nextEdges, W, H);
    else if (topology === 'tree') treeLayout(nextNodes, nextEdges, W, H);
    else dagLayout(nextNodes, nextEdges, W, H);
    nextNodes.forEach(node => { if (storedPositions[node.id]) { node.x = storedPositions[node.id].x; node.y = storedPositions[node.id].y; } });
    nextNodes.forEach(node => { node._scale = Math.max(0.72, 1 - Math.min(node._depth || 0, 3) * 0.1); });
    return { nodes: nextNodes, edges: nextEdges, topology, palette: PALETTE };
  }

  const api = { PALETTE, topoSort, detectTopology, chainLayout, treeLayout, dagLayout, calcDepths, assignGroups, layoutRelationship };
  root.AgfChartLayout = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
