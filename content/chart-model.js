/* global window */
(function (root) {
  'use strict';

  // The chart model is renderer-neutral. Mermaid/ECharts/SVG adapters should
  // consume this shape instead of becoming the product's data contract.
  const INTENTS = new Set(['relationship', 'infographic', 'data', 'timeline']);
  const SOURCES = new Set(['article', 'selection', 'image', 'manual', 'quiz']);
  const RENDERERS = new Set(['mermaid', 'echarts', 'svg', 'html']);

  const text = value => String(value == null ? '' : value).trim();
  const list = value => Array.isArray(value) ? value : [];
  const id = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  function sourceRef(value) {
    if (!value || typeof value !== 'object') return null;
    const ref = {
      type: text(value.type) || 'text',
      id: text(value.id),
      text: text(value.text),
      url: text(value.url),
      locator: text(value.locator)
    };
    return Object.values(ref).some(Boolean) ? ref : null;
  }

  function normalizeModel(input) {
    const value = input && typeof input === 'object' ? input : {};
    return {
      title: text(value.title) || '未命名图表',
      description: text(value.description),
      nodes: list(value.nodes).map((node, index) => ({
        id: text(node?.id) || `node-${index + 1}`,
        label: text(node?.label) || `节点 ${index + 1}`,
        description: text(node?.description),
        sourceRefs: list(node?.sourceRefs).map(sourceRef).filter(Boolean)
      })),
      edges: list(value.edges).map(edge => ({
        source: text(edge?.source), target: text(edge?.target),
        label: text(edge?.label),
        sourceRefs: list(edge?.sourceRefs).map(sourceRef).filter(Boolean)
      })),
      events: list(value.events).map((event, index) => ({
        id: text(event?.id) || `event-${index + 1}`,
        date: text(event?.date), label: text(event?.label) || `事件 ${index + 1}`,
        description: text(event?.description),
        sourceRefs: list(event?.sourceRefs).map(sourceRef).filter(Boolean)
      })),
      labels: list(value.labels).map(text).filter(Boolean),
      units: text(value.units),
      timeRange: value.timeRange && typeof value.timeRange === 'object' ? {
        start: text(value.timeRange.start), end: text(value.timeRange.end)
      } : null,
      series: list(value.series),
      uncertainties: list(value.uncertainties).map(text).filter(Boolean),
      sourceRefs: list(value.sourceRefs).map(sourceRef).filter(Boolean),
      warnings: list(value.warnings).map(text).filter(Boolean)
    };
  }

  function validateModel(model, intent) {
    const errors = [];
    if (!model || typeof model !== 'object') return ['chartModel 必须是对象'];
    if (!text(model.title)) errors.push('chartModel.title 不能为空');
    if (intent === 'relationship' && !model.nodes.length) errors.push('关系图至少需要一个节点');
    if (intent === 'timeline' && !model.events.length) errors.push('时间线至少需要一个事件');
    if (intent === 'data' && !model.series.length) errors.push('数据图表至少需要一个数据系列');
    model.edges.forEach((edge, index) => {
      if (!edge.source || !edge.target) errors.push(`chartModel.edges[${index}] 必须包含 source 和 target`);
      if (edge.source && !model.nodes.some(node => node.id === edge.source)) errors.push(`边 ${index + 1} 的 source 不存在`);
      if (edge.target && !model.nodes.some(node => node.id === edge.target)) errors.push(`边 ${index + 1} 的 target 不存在`);
    });
    if (intent === 'data' && !model.units) model.warnings.push('数据图表缺少单位，精确比较可能受限');
    if (!model.sourceRefs.length) model.warnings.push('图表尚未绑定来源证据');
    return errors;
  }

  function normalizeChartContext(input) {
    const value = input && typeof input === 'object' ? input : {};
    const intent = value.intent == null || value.intent === '' ? 'relationship' : text(value.intent);
    const context = {
      id: text(value.id) || id('chart'),
      source: value.source == null || value.source === '' ? 'manual' : text(value.source),
      sourceRefs: list(value.sourceRefs).map(sourceRef).filter(Boolean),
      intent,
      chartModel: normalizeModel(value.chartModel),
      renderer: RENDERERS.has(value.renderer) ? value.renderer : (intent === 'data' ? 'echarts' : 'mermaid'),
      summary: text(value.summary), createdAt: Number(value.createdAt) || Date.now(),
      updatedAt: Number(value.updatedAt) || Date.now(), confirmed: value.confirmed === true,
      version: Number(value.version) || 1
    };
    return context;
  }

  function validateChartContext(input) {
    const context = normalizeChartContext(input);
    const errors = [];
    if (!SOURCES.has(context.source)) errors.push(`不支持的来源: ${context.source}`);
    if (!INTENTS.has(context.intent)) errors.push(`不支持的图表意图: ${context.intent}`);
    errors.push(...validateModel(context.chartModel, context.intent));
    return { valid: errors.length === 0, errors, value: context };
  }

  const api = { INTENTS: [...INTENTS], SOURCES: [...SOURCES], RENDERERS: [...RENDERERS], normalizeModel, normalizeChartContext, validateChartContext };
  root.AgfChartModel = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
