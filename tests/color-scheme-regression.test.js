const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mainSource = fs.readFileSync(path.join(root, 'content/main.js'), 'utf8');
const popupSource = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');

test('the default noun color is purple in content and Colors UI', () => {
  assert.match(mainSource, /default:\s*\{ noun:\s*'#8b5cf6',\s*verb:\s*'#cc0000',\s*adj:\s*'#009933' \}/);
  assert.match(popupSource, /--noun-color:\s*#8b5cf6/);
  assert.match(popupSource, /\.noun-default\s*\{[\s\S]*?color:\s*#8b5cf6;/);
});

test('the old blue default is not used by the Colors UI', () => {
  assert.doesNotMatch(popupSource, /--noun-color:\s*#0066cc/);
  assert.doesNotMatch(popupSource, /\.noun-default\s*\{[\s\S]*?color:\s*#0066cc;/);
});
