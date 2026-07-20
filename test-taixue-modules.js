const assert = require('node:assert/strict');
const { TaixueState, parseQuizPayload, normalizeQuizItems, createChatModule, createExplainModule, createVocabularyModule } = require('./content/taixue-modules.js');

const state = new TaixueState({ currentModule: 'quiz' });
assert.equal(state.setContextSource('selection'), 'selection');
assert.deepEqual(state.getSnapshot(), { currentModule: 'quiz', taskStatus: 'idle', contextSource: 'selection', windowSize: 'full', persistent: false, highlightEnabled: true });
assert.deepEqual(parseQuizPayload('```json\n[{"question":"Q"}]\n```'), [{ question: 'Q' }]);
const valid = Array.from({ length: 3 }, (_, i) => ({ question: `Q${i}`, options: ['A', 'B', 'C', 'D'], answer: i, optionReasons: ['r1', 'r2', 'r3', 'r4'] }));
assert.equal(normalizeQuizItems(valid, 3).length, 3);
assert.throws(() => normalizeQuizItems([{ question: 'bad', options: ['A'], answer: 0 }], 3), /格式/);
assert.equal(createChatModule({ run() {} }).name, 'chat');
assert.equal(createExplainModule({ explain() {} }).name, 'explain');
assert.equal(createVocabularyModule({ review() {} }).name, 'vocab');
console.log('taixue module tests passed');
