const assert = require('node:assert/strict');
const { detectTopology, layoutRelationship } = require('./content/chart-layout.js');

const chainNodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const chainEdges = [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }];
assert.equal(detectTopology(chainNodes, chainEdges), 'chain');
const chain = layoutRelationship(chainNodes, chainEdges, 900, 420);
assert.equal(chain.topology, 'chain');
assert.equal(chain.nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y)), true);

const treeNodes = [{ id: 'root' }, { id: 'left' }, { id: 'right' }, { id: 'middle' }, { id: 'leaf' }];
const treeEdges = [{ source: 'root', target: 'left' }, { source: 'root', target: 'right' }, { source: 'root', target: 'middle' }, { source: 'left', target: 'leaf' }];
const tree = layoutRelationship(treeNodes, treeEdges, 900, 520);
assert.equal(tree.topology, 'tree');
assert.ok(tree.nodes.find(node => node.id === 'root').y < tree.nodes.find(node => node.id === 'leaf').y);

const dagNodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
const dagEdges = [{ source: 'a', target: 'c' }, { source: 'b', target: 'c' }, { source: 'c', target: 'd' }];
assert.equal(layoutRelationship(dagNodes, dagEdges, 900, 520).topology, 'dag');
const stored = layoutRelationship([{ id: 'a', x: 222, y: 333 }, { id: 'b', x: 444, y: 333 }], [{ source: 'a', target: 'b' }], 900, 520);
assert.equal(stored.nodes.find(node => node.id === 'a').x, 222);
assert.equal(stored.nodes.find(node => node.id === 'b').x, 444);
const partialStored = layoutRelationship([{ id: 'a', x: 222, y: 333 }, { id: 'b' }, { id: 'c' }], [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }], 900, 520);
assert.equal(partialStored.nodes.find(node => node.id === 'a').x, 222);
assert.equal(partialStored.nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y)), true);
assert.equal(layoutRelationship(treeNodes, treeEdges, 900, 520, 'mindmap').topology, 'tree');
assert.equal(layoutRelationship(dagNodes, dagEdges, 900, 520, 'flowchart').topology, 'dag');

console.log('chart layout tests passed');
