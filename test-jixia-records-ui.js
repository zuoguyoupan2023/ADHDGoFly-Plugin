const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('content/main.js', 'utf8');

assert.match(source, /\.agf-records-header\{[^}]*grid-template-columns:auto minmax\(120px,180px\) minmax\(160px,1fr\)/);
assert.match(source, /\.agf-record-item\{[^}]*grid-template-columns:minmax\(0,1fr\) auto/);
assert.match(source, /\.agf-record-main\{[^}]*min-width:0/);
assert.match(source, /\.agf-record-link\{[^}]*text-overflow:ellipsis/);
assert.match(source, /const compactRecordUrl = \(value\) =>/);
assert.match(source, /a\.textContent = compactRecordUrl\(linkUrl\)/);
assert.doesNotMatch(source, /subjEl\.appendChild\(a\)/);

console.log('jixia records UI tests passed');
