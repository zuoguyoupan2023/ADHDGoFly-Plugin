/* global window */
(function (root) {
  'use strict';

  // The chart model is renderer-neutral. Mermaid/ECharts/SVG adapters should
  // consume this shape instead of becoming the product's data contract.
  const INTENTS = new Set(['concept', 'relationship', 'mindmap', 'flowchart', 'infographic', 'data', 'timeline']);
  const SOURCES = new Set(['article', 'selection', 'image', 'manual', 'quiz']);
  const RENDERERS = new Set(['mermaid', 'echarts', 'svg', 'rough', 'html']);
  const VIEW_TYPES = new Set(['architecture', 'workflow', 'sequence', 'data_flow', 'lifecycle']);
  const THEMES = new Set(['light', 'dark', 'system']);
  const NODE_ROLES = new Set(['frontend', 'backend', 'database', 'cloud', 'security', 'message_bus', 'external', 'generic']);

  const text = value => String(value == null ? '' : value).trim();
  const list = value => Array.isArray(value) ? value : [];
  const id = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const normalizeSeries = (value, index) => {
    const series = value && typeof value === 'object' ? value : {};
    const raw = list(series.data);
    const labels = list(series.labels).map(text);
    const data = raw.map((point, pointIndex) => {
      if (point && typeof point === 'object') return { label: text(point.label) || labels[pointIndex] || `项目 ${pointIndex + 1}`, value: Number(point.value), sourceRefs: list(point.sourceRefs).map(sourceRef).filter(Boolean) };
      return { label: labels[pointIndex] || `项目 ${pointIndex + 1}`, value: Number(point) };
    });
    return { name: text(series.name) || `数据系列 ${index + 1}`, type: ['bar', 'line', 'pie', 'table'].includes(text(series.type)) ? text(series.type) : 'bar', data, sourceRefs: list(series.sourceRefs).map(sourceRef).filter(Boolean) };
  };

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
        ...(Number.isFinite(Number(node?.x)) ? { x: Number(node.x) } : {}),
        ...(Number.isFinite(Number(node?.y)) ? { y: Number(node.y) } : {}),
        ...(text(node?.kind) ? { kind: text(node.kind) } : {}),
        ...(NODE_ROLES.has(text(node?.styleRole)) ? { styleRole: text(node.styleRole) } : {}),
        ...(text(node?.groupId) ? { groupId: text(node.groupId) } : {}),
        ...(node?.isLane === true ? { isLane: true } : {}),
        ...(text(node?.laneKey) ? { laneKey: text(node.laneKey) } : {}),
        ...(Number.isInteger(Number(node?.rowIndex)) ? { rowIndex: Number(node.rowIndex) } : {}),
        ...(node?.hidden === true ? { hidden: true } : {}),
        sourceRefs: list(node?.sourceRefs).map(sourceRef).filter(Boolean)
      })),
      edges: list(value.edges).map(edge => ({
        source: text(edge?.source), target: text(edge?.target),
        label: text(edge?.label),
        ...(text(edge?.kind) ? { kind: text(edge.kind) } : {}),
        ...(edge?.emphasis === true ? { emphasis: true } : {}),
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
      series: list(value.series).map(normalizeSeries),
      uncertainties: list(value.uncertainties).map(text).filter(Boolean),
      sourceRefs: list(value.sourceRefs).map(sourceRef).filter(Boolean),
      warnings: list(value.warnings).map(text).filter(Boolean)
      ,viewType: VIEW_TYPES.has(text(value.viewType)) ? text(value.viewType) : null
      ,theme: THEMES.has(text(value.theme)) ? text(value.theme) : 'system'
    };
  }

  function validateModel(model, intent) {
    const errors = [];
    if (!model || typeof model !== 'object') return ['chartModel 必须是对象'];
    if (!text(model.title)) errors.push('chartModel.title 不能为空');
    if (['concept', 'relationship', 'mindmap', 'flowchart'].includes(intent) && !model.nodes.length) errors.push('图表至少需要一个节点');
    if (intent === 'timeline' && !model.events.length) errors.push('时间线至少需要一个事件');
    if (intent === 'data' && !model.series.length) errors.push('数据图表至少需要一个数据系列');
    model.series.forEach((series, index) => {
      if (!series.data.length) errors.push(`数据系列 ${index + 1} 不能为空`);
      if (series.data.some(point => !Number.isFinite(point.value))) errors.push(`数据系列 ${index + 1} 包含无效数值`);
    });
    model.edges.forEach((edge, index) => {
      if (!edge.source || !edge.target) errors.push(`chartModel.edges[${index}] 必须包含 source 和 target`);
      if (edge.source && !model.nodes.some(node => node.id === edge.source)) errors.push(`边 ${index + 1} 的 source 不存在`);
      if (edge.target && !model.nodes.some(node => node.id === edge.target)) errors.push(`边 ${index + 1} 的 target 不存在`);
    });
    const ids = new Set();
    model.nodes.forEach((node, index) => { if (ids.has(node.id)) errors.push(`节点 ${index + 1} 的 id 重复`); ids.add(node.id); });
    if (intent === 'data' && !model.units) model.warnings.push('数据图表缺少单位，精确比较可能受限');
    if (intent === 'data' && !model.sourceRefs.length && !model.series.some(series => series.sourceRefs.length || series.data.some(point => point.sourceRefs?.length))) model.warnings.push('数据图表缺少来源定位，请核对原文或补充来源');
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
      viewType: VIEW_TYPES.has(text(value.viewType)) ? text(value.viewType) : inferViewType(intent),
      theme: THEMES.has(text(value.theme)) ? text(value.theme) : 'system',
      summary: text(value.summary), createdAt: Number(value.createdAt) || Date.now(),
      updatedAt: Number(value.updatedAt) || Date.now(), confirmed: value.confirmed === true,
      version: Number(value.version) || 1
    };
    return context;
  }

  function inferViewType(intent) {
    return ({ relationship: 'architecture', concept: 'architecture', flowchart: 'workflow', mindmap: 'workflow', timeline: 'sequence', data: 'data_flow' }[intent] || null);
  }

  function validateChartContext(input) {
    const context = normalizeChartContext(input);
    const errors = [];
    if (!SOURCES.has(context.source)) errors.push(`不支持的来源: ${context.source}`);
    if (!INTENTS.has(context.intent)) errors.push(`不支持的图表意图: ${context.intent}`);
    errors.push(...validateModel(context.chartModel, context.intent));
    return { valid: errors.length === 0, errors, value: context };
  }

  function buildAccessibilityText(context) {
    const value = normalizeChartContext(context);
    const model = value.chartModel;
    const lines = [`图表：${model.title}`];
    if (model.description) lines.push(`摘要：${model.description}`);
    if (value.summary && value.summary !== model.description) lines.push(`生成摘要：${value.summary}`);
    if (model.units) lines.push(`单位：${model.units}`);
    if (model.timeRange?.start || model.timeRange?.end) lines.push(`时间范围：${model.timeRange.start || '未注明'} 至 ${model.timeRange.end || '未注明'}`);
    if (model.nodes.length) {
      lines.push('节点：');
      model.nodes.filter(node => !node.hidden).forEach(node => lines.push(`- ${node.label}${node.description ? `：${node.description}` : ''}`));
    }
    if (model.edges.length) {
      lines.push('连线：');
      model.edges.forEach(edge => {
        const source = model.nodes.find(node => node.id === edge.source)?.label || edge.source;
        const target = model.nodes.find(node => node.id === edge.target)?.label || edge.target;
        lines.push(`- ${source} ${edge.label || '连接到'} ${target}`);
      });
    }
    if (model.events.length) {
      lines.push('事件：');
      model.events.forEach(event => lines.push(`- ${event.date ? `${event.date} ` : ''}${event.label}${event.description ? `：${event.description}` : ''}`));
    }
    if (model.series.length) {
      lines.push('数据：');
      model.series.forEach(series => lines.push(`- ${series.name}（${series.type}）：${series.data.map(point => `${point.label}=${point.value}`).join('，')}`));
    }
    return lines.join('\n');
  }

  function buildCopyableData(context) {
    const model = normalizeChartContext(context).chartModel;
    const rows = [['系列', '标签', '数值']];
    model.series.forEach(series => series.data.forEach(point => rows.push([series.name, point.label, String(point.value)])));
    return rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join('\t')).join('\n');
  }

  function parseJsonObject(raw) {
    const textValue = text(raw);
    if (!textValue) throw new Error('AI 返回了空内容，无法生成图表。请重试，或换一个支持长输出的模型。');
    const fenced = textValue.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const body = fenced ? fenced[1].trim() : textValue;
    try { return JSON.parse(body); } catch (firstError) {
      const start = body.indexOf('{');
      const end = body.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try { return JSON.parse(body.slice(start, end + 1)); } catch (_) {}
      }
      const looksTruncated = firstError instanceof SyntaxError && /end of json input|unterminated string/i.test(firstError.message || '');
      if (looksTruncated) throw new Error('AI 返回的图表 JSON 不完整，可能是输出被截断。请重试，或减少材料长度/换用更大输出额度的模型。');
      throw new Error(`AI 返回的内容不是有效 JSON：${firstError.message || firstError}`);
    }
  }

  const api = { INTENTS: [...INTENTS], SOURCES: [...SOURCES], RENDERERS: [...RENDERERS], VIEW_TYPES: [...VIEW_TYPES], THEMES: [...THEMES], NODE_ROLES: [...NODE_ROLES], normalizeModel, normalizeChartContext, validateChartContext, buildAccessibilityText, buildCopyableData, parseJsonObject, inferViewType };
  root.AgfChartModel = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
