/* global window */
(function (root) {
  'use strict';

  class TaixueState {
    constructor(initial = {}) {
      this.currentModule = initial.currentModule || 'chat';
      this.taskStatus = initial.taskStatus || 'idle';
      this.contextSource = initial.contextSource || 'full_article';
      this.windowSize = initial.windowSize || 'full';
      this.persistent = Boolean(initial.persistent);
      this.highlightEnabled = initial.highlightEnabled !== false;
    }
    setModule(value) { this.currentModule = value || 'chat'; return this.currentModule; }
    setTaskStatus(value) { this.taskStatus = value || 'idle'; return this.taskStatus; }
    setContextSource(value) { this.contextSource = value || 'full_article'; return this.contextSource; }
    getSnapshot() { return { currentModule: this.currentModule, taskStatus: this.taskStatus, contextSource: this.contextSource, windowSize: this.windowSize, persistent: this.persistent, highlightEnabled: this.highlightEnabled }; }
  }

  function parseQuizPayload(value) {
    const raw = String(value || '').replace(/```json|```/gi, '').trim();
    try { return JSON.parse(raw); } catch (_) {}
    const start = raw.indexOf('['), end = raw.lastIndexOf(']');
    if (start >= 0 && end > start) { try { return JSON.parse(raw.slice(start, end + 1)); } catch (_) {} }
    return null;
  }

  function normalizeQuizItems(items, requestedCount) {
    const count = Math.max(1, Number(requestedCount) || 1);
    const out = (Array.isArray(items) ? items : []).filter(q => {
      if (!q || !String(q.question || '').trim()) return false;
      if (!Array.isArray(q.options) || q.options.length !== 4) return false;
      const answer = Number(q.answer);
      if (!Number.isInteger(answer) || answer < 0 || answer > 3) return false;
      if (!Array.isArray(q.optionReasons) || q.optionReasons.length !== q.options.length) return false;
      return q.optionReasons.every(reason => String(reason || '').trim());
    }).slice(0, count);
    if (out.length < Math.min(3, count)) throw new Error('AI 返回的题目格式无法识别');
    const counts = [0, 0, 0, 0];
    out.forEach(q => { counts[Number(q.answer)] += 1; });
    if (out.length >= 4 && Math.max.apply(null, counts) > Math.ceil(out.length / 2)) throw new Error('正确答案分布过于集中');
    return out;
  }

  const createModule = (name, actions = {}) => Object.freeze({ name, ...actions });
  const api = {
    TaixueState,
    parseQuizPayload,
    normalizeQuizItems,
    createChatModule: actions => createModule('chat', actions),
    createQuizModule: actions => createModule('quiz', actions),
    createExplainModule: actions => createModule('explain', actions),
    createVocabularyModule: actions => createModule('vocab', actions)
  };
  root.TaixueModules = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
