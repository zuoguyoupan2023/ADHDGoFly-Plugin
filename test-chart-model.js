const assert = require('node:assert/strict');
const { normalizeChartContext, validateChartContext, buildAccessibilityText, buildCopyableData, buildSourceLinks, parseJsonObject } = require('./content/chart-model.js');

const graph = normalizeChartContext({ source: 'article', intent: 'relationship', chartModel: {
  title: '学习闭环', nodes: [{ id: 'read', label: '阅读' }, { id: 'review', label: '复习' }],
  edges: [{ source: 'read', target: 'review', label: '产生' }], sourceRefs: [{ type: 'paragraph', text: '原文段落' }]
}});
assert.equal(validateChartContext(graph).valid, true);
assert.equal(graph.renderer, 'mermaid');
assert.equal(graph.viewType, 'architecture');
assert.equal(graph.theme, 'system');
assert.equal(validateChartContext({ source: 'article', intent: 'unknown', chartModel: { title: '坏意图' } }).valid, false);
assert.equal(validateChartContext({ intent: 'relationship', chartModel: { title: '坏图', edges: [{ source: 'x', target: 'y' }] } }).valid, false);
assert.equal(validateChartContext({ source: 'article', intent: 'concept', chartModel: { title: '概念', nodes: [{ id: 'a', label: '概念A' }] } }).valid, true);
assert.equal(validateChartContext({ source: 'article', intent: 'mindmap', chartModel: { title: '导图', nodes: [{ id: 'root', label: '主题' }] } }).valid, true);
assert.equal(validateChartContext({ source: 'article', intent: 'flowchart', chartModel: { title: '流程', nodes: [{ id: 'start', label: '开始' }] } }).valid, true);
const archifyShape = normalizeChartContext({ source: 'manual', intent: 'relationship', viewType: 'architecture', theme: 'dark', chartModel: { title: '组件', nodes: [{ id: 'api', label: 'API', styleRole: 'backend', kind: 'service', groupId: 'core' }, { id: 'db', label: '数据库', styleRole: 'database' }], edges: [{ source: 'api', target: 'db', label: '读取', kind: 'data', emphasis: true }] } });
assert.equal(archifyShape.viewType, 'architecture');
assert.equal(archifyShape.theme, 'dark');
assert.equal(archifyShape.chartModel.nodes[0].styleRole, 'backend');
assert.equal(archifyShape.chartModel.edges[0].emphasis, true);
assert.equal(validateChartContext({ source: 'manual', intent: 'relationship', chartModel: { title: '重复', nodes: [{ id: 'a', label: 'A' }, { id: 'a', label: 'B' }] } }).valid, false);
const timeline = validateChartContext({ source: 'selection', intent: 'timeline', chartModel: { title: '进展', events: [{ date: '2026', label: '发布' }] } });
assert.equal(timeline.valid, true);
const data = validateChartContext({ source: 'manual', intent: 'data', chartModel: { title: '数据', series: [{ name: '数量', data: [1, 2] }] } });
assert.equal(data.valid, true);
assert.ok(data.value.chartModel.warnings.includes('数据图表缺少单位，精确比较可能受限'));
const sourcedData = normalizeChartContext({ source: 'article', intent: 'data', chartModel: { title: '来源数据', units: '%', sourceRefs: [{ type: 'paragraph', text: '总览数据', locator: 'p.2' }], series: [{ name: '比例', type: 'line', sourceRefs: [{ type: 'paragraph', text: '比例段落' }], data: [{ label: '一月', value: '12.5', sourceRefs: [{ type: 'paragraph', locator: 'p.3' }] }] }] } });
assert.equal(sourcedData.chartModel.series[0].type, 'line');
assert.equal(sourcedData.chartModel.series[0].data[0].value, 12.5);
assert.equal(sourcedData.chartModel.series[0].data[0].sourceRefs[0].locator, 'p.3');
assert.equal(sourcedData.chartModel.warnings.some(warning => /来源定位/.test(warning)), false);
assert.equal(validateChartContext({ source: 'article', intent: 'data', chartModel: { title: '坏数据', series: [{ data: [{ label: 'A', value: 'not-a-number' }] }] } }).valid, false);
assert.equal(validateChartContext({ source: 'article', intent: 'relationship', renderer: 'rough', chartModel: { title: '手绘', nodes: [{ id: 'a', label: 'A' }] } }).valid, true);
assert.deepEqual(parseJsonObject('```json\n{"title":"包裹"}\n```'), { title: '包裹' });
assert.deepEqual(parseJsonObject('说明文字 {"title":"提取"} 结束'), { title: '提取' });
assert.throws(() => parseJsonObject(''), /空内容/);
assert.throws(() => parseJsonObject('{"title":'), /不完整/);
assert.throws(() => parseJsonObject('{"title":"未结束'), /不完整/);
const accessible = buildAccessibilityText({ intent: 'relationship', chartModel: { title: '阅读路径', description: '从阅读到复习', nodes: [{ id: 'read', label: '阅读' }, { id: 'review', label: '复习' }], edges: [{ source: 'read', target: 'review', label: '促进' }] } });
assert.match(accessible, /摘要：从阅读到复习/);
assert.match(accessible, /阅读 促进 复习/);
const copyable = buildCopyableData({ intent: 'data', chartModel: { title: '数据', series: [{ name: '数量', data: [{ label: 'A', value: 2 }] }] } });
assert.match(copyable, /系列/); assert.match(copyable, /数量/); assert.match(copyable, /A/);
const sourceLinks = buildSourceLinks({ id: 'chart-1', source: 'article', sourceRefs: [{ type: 'article', text: '全文', url: 'https://example.com/article' }], intent: 'data', chartModel: { title: '来源', series: [{ name: '销量', data: [{ label: '一月', value: 2, sourceRefs: [{ type: 'paragraph', locator: 'p-3', url: 'https://example.com/article' }] }] }] } });
assert.equal(sourceLinks.length, 2); assert.equal(sourceLinks[1].scope, 'data-point'); assert.equal(sourceLinks[1].locator, 'p-3');
console.log('chart model tests passed');
