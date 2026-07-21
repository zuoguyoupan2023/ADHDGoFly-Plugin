const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('content/main.js', 'utf8');
const en = JSON.parse(fs.readFileSync('locales/en.json', 'utf8'));
const zh = JSON.parse(fs.readFileSync('locales/zh.json', 'utf8'));

assert.match(source, /\.agf-records-header\{[^}]*grid-template-columns:auto minmax\(120px,180px\) minmax\(160px,1fr\)/);
assert.match(source, /\.agf-record-item\{[^}]*grid-template-columns:minmax\(0,1fr\) auto/);
assert.match(source, /\.agf-record-main\{[^}]*min-width:0/);
assert.match(source, /\.agf-record-link\{[^}]*text-overflow:ellipsis/);
assert.match(source, /\.agf-record-scope-btn\{[^}]*display:inline-flex/);
assert.match(source, /\.agf-record-scope-btn\{[^}]*line-height:1/);
assert.match(source, /#agfAiSettingOverlay \.agf-record-scope-btn,#agfAiSettingOverlay \.agf-records-open,#agfAiSettingOverlay \.agf-record-delete\{[^}]*align-items:center!important/);
assert.match(source, /const compactRecordUrl = \(value\) =>/);
assert.match(source, /a\.textContent = compactRecordUrl\(linkUrl\)/);
assert.doesNotMatch(source, /subjEl\.appendChild\(a\)/);
assert.equal(en.jixia.ui.currentRecords, 'Current');
assert.equal(en.jixia.ui.allRecords, 'All');
assert.equal(zh.jixia.ui.currentRecords, '当前');
assert.equal(zh.jixia.ui.allRecords, '所有');

console.log('jixia records UI tests passed');
