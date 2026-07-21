const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('content/main.js', 'utf8');

assert.match(source, /#agfAiSettingOverlay button,#agfAiSettingOverlay select,#agfAiSettingOverlay input,#agfAiSettingOverlay textarea\{[^}]*margin:0!important/);
assert.match(source, /#agfAiSettingOverlay \.agf-ai-tabs button\{[^}]*font-size:12px!important/);
assert.match(source, /#agfAiSettingOverlay \.agf-ai-tabs button\{[^}]*padding:0 8px!important/);
assert.match(source, /#agfAiSettingOverlay \.agf-media-context-tools\{[^}]*gap:4px!important/);
assert.match(source, /#agfAiSettingOverlay \.agf-context-btn\{[^}]*font-size:12px!important/);
assert.match(source, /#agfAiSettingOverlay \.agf-context-btn\{[^}]*margin:0!important/);

console.log('jixia CSS isolation tests passed');
