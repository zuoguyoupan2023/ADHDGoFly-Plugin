const assert = require('node:assert/strict');
const { TaixueState, parseQuizPayload, normalizeQuizItems, createChatModule, createQuizModule, createExplainModule, createVocabularyReviewModule, createVocabularyModule } = require('./content/taixue-modules.js');
(async () => {

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
let sentPrompt = '';
const fakeContext = { resolve: async source => ({ source, text: '材料', canonicalUrl: 'https://example.test', pageUrl: 'https://example.test' }) };
const chat = createChatModule({ context: fakeContext, limitText: text => ({ text, truncated: false }), send: async prompt => { sentPrompt = prompt; return 'ok'; } });
assert.equal(await chat.runTask({ title: '总结', prefix: '总结', contextSource: 'full_article' }), 'ok'); assert.match(sentPrompt, /材料/);
const quiz = createQuizModule({ context: fakeContext, task: { requestJsonText: async () => JSON.stringify(valid) }, limitText: text => ({ text, truncated: false }), getCount: () => 3 });
assert.equal((await quiz.requestQuestions()).length, 3);
let explained = false;
const explain = createExplainModule({ context: fakeContext, task: { requestJsonText: async () => '解释结果' }, save: async record => { explained = record.output === '解释结果'; } });
await explain.explainSelection(); assert.equal(explained, true);
let cards = null;
const vocabReview = createVocabularyReviewModule({ context: fakeContext, task: { requestJsonText: async () => JSON.stringify([{ word: 'term', meaning: '含义', example: '例句' }]) }, load: async () => [], save: async () => {}, onCards: value => { cards = value; } });
await vocabReview.startReview(); assert.equal(cards.length, 1); await vocabReview.answer(true); assert.equal(cards[0].mastery, 20);
console.log('taixue module tests passed');
})();
