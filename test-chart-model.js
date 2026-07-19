const assert = require('node:assert/strict');
const { normalizeChartContext, validateChartContext, parseJsonObject } = require('./content/chart-model.js');

const graph = normalizeChartContext({ source: 'article', intent: 'relationship', chartModel: {
  title: '学习闭环', nodes: [{ id: 'read', label: '阅读' }, { id: 'review', label: '复习' }],
  edges: [{ source: 'read', target: 'review', label: '产生' }], sourceRefs: [{ type: 'paragraph', text: '原文段落' }]
}});
assert.equal(validateChartContext(graph).valid, true);
assert.equal(graph.renderer, 'mermaid');
assert.equal(validateChartContext({ source: 'article', intent: 'unknown', chartModel: { title: '坏意图' } }).valid, false);
assert.equal(validateChartContext({ intent: 'relationship', chartModel: { title: '坏图', edges: [{ source: 'x', target: 'y' }] } }).valid, false);
assert.equal(validateChartContext({ source: 'article', intent: 'concept', chartModel: { title: '概念', nodes: [{ id: 'a', label: '概念A' }] } }).valid, true);
assert.equal(validateChartContext({ source: 'article', intent: 'mindmap', chartModel: { title: '导图', nodes: [{ id: 'root', label: '主题' }] } }).valid, true);
assert.equal(validateChartContext({ source: 'article', intent: 'flowchart', chartModel: { title: '流程', nodes: [{ id: 'start', label: '开始' }] } }).valid, true);
const timeline = validateChartContext({ source: 'selection', intent: 'timeline', chartModel: { title: '进展', events: [{ date: '2026', label: '发布' }] } });
assert.equal(timeline.valid, true);
const data = validateChartContext({ source: 'manual', intent: 'data', chartModel: { title: '数据', series: [{ name: '数量', data: [1, 2] }] } });
assert.equal(data.valid, true);
assert.ok(data.value.chartModel.warnings.includes('数据图表缺少单位，精确比较可能受限'));
assert.equal(validateChartContext({ source: 'article', intent: 'relationship', renderer: 'rough', chartModel: { title: '手绘', nodes: [{ id: 'a', label: 'A' }] } }).valid, true);
assert.deepEqual(parseJsonObject('```json\n{"title":"包裹"}\n```'), { title: '包裹' });
assert.deepEqual(parseJsonObject('说明文字 {"title":"提取"} 结束'), { title: '提取' });
assert.throws(() => parseJsonObject(''), /空内容/);
assert.throws(() => parseJsonObject('{"title":'), /不完整/);
assert.throws(() => parseJsonObject('{"title":"未结束'), /不完整/);
console.log('chart model tests passed');
