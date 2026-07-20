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

  function createChatModule({ context, beforeRun, afterContext, send, limitText, languageHint } = {}) {
    return {
      name: 'chat',
      async runTask({ title, prefix, extra = '', includeLangHint = false, contextSource } = {}) {
        const ctx = await context.resolve(contextSource);
        const limited = limitText(ctx.text, 50000);
        await beforeRun?.(ctx, limited);
        const parts = [title || '', `页面: ${ctx.canonicalUrl || ctx.pageUrl || ''}`];
        if (limited.truncated) parts.push(`预算提示：原文约 ${limited.originalLength} 字，本次发送已截取。`);
        parts.push('正文:', String(limited.text || ''));
        if (extra) parts.push(extra);
        if (includeLangHint) parts.push(languageHint?.() || '请用中文输出。');
        const prompt = parts.join('\n');
        afterContext?.(ctx, prefix, prompt);
        return send(prompt, ctx);
      }
    };
  }

  function createQuizModule({ context, task, limitText, getCount, save, onState } = {}) {
    return {
      name: 'quiz',
      async requestQuestions(difficulty = 'easy', retryCount = 1) {
        const ctx = await context.resolve();
        const limited = limitText(ctx.text, 70000);
        if (!String(limited.text || '').trim()) throw new Error('当前页面没有可分析的正文');
        onState?.({ context: ctx });
        const count = getCount?.() || 3;
        const prompt = `你是严格的阅读理解题目设计者。请基于下面材料生成${count}道中文单选题，难度为${difficulty === 'hard' ? '困难' : '简单'}。每题4个选项且只有一个正确答案。返回严格JSON数组，不要Markdown。每项包含 question,type,difficulty,options(4个字符串),answer(0到3的数字),explanation,evidence(包含quote和paragraph),optionReasons(必须与options等长的字符串数组)。\n\n材料：\n${limited.text}`;
        try {
          const output = await task.requestJsonText({ prompt, timeout: 60000, maxTokens: count >= 10 ? 3600 : 2200, temperature: .35 });
          const parsed = parseQuizPayload(output);
          const items = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.questions) ? parsed.questions : []);
          return normalizeQuizItems(items, count);
        } catch (error) { if (retryCount > 0) return this.requestQuestions(difficulty, retryCount - 1); throw error; }
      },
      async persist(record) { return save?.(record); },
      setState(value) { onState?.(value); }
    };
  }

  function createExplainModule({ context, task, save, render } = {}) {
    return {
      name: 'explain',
      async explainSelection() {
        const ctx = await context.resolve('selection');
        if (!ctx.text) throw new Error('请先在网页中选中一段文本。');
        const output = await task.requestJsonText({ prompt: `请解释下面选中文本。输出简洁但完整，包含：1.通俗释义 2.上下文作用 3.关键术语 4.必要时给出改写或例句。请用中文。\n\n选中文本：\n${ctx.text}`, maxTokens: 1800, temperature: .35 });
        await save?.({ id: `explain-${Date.now()}`, text: ctx.text, output, context: ctx, createdAt: Date.now() });
        render?.(output, ctx);
        return { output, context: ctx };
      }
    };
  }

  function createVocabularyModule({ context, task, parse = parseQuizPayload, load, save, onCards } = {}) {
    let cards = [], index = 0;
    return {
      name: 'vocab',
      get cards() { return cards; },
      get index() { return index; },
      reset() { cards = []; index = 0; onCards?.(cards, index); },
      async startReview() {
        const ctx = await context.resolve('full_article');
        const output = await task.requestJsonText({ prompt: `从材料中挑选最多8个适合学习的核心词汇，返回严格JSON数组，每项包含 word,meaning,example。不要Markdown。\n\n材料：\n${String(ctx.text || '').slice(0, 30000)}`, maxTokens: 1400, temperature: .25 });
        const parsed = parse(output), old = await load?.() || [];
        cards = (Array.isArray(parsed) ? parsed : []).filter(x => x && String(x.word).trim()).slice(0, 8).map(x => { const prior = old.find(y => y.word === x.word); return { ...x, word: String(x.word).trim(), mastery: prior ? Number(prior.mastery || 0) : 0, reviewCount: prior ? Number(prior.reviewCount || 0) : 0, pageUrl: ctx.canonicalUrl }; });
        index = 0; if (!cards.length) throw new Error('没有生成有效词汇，请重试。'); onCards?.(cards, index); return cards;
      },
      async answer(remembered) {
        const card = cards[index]; if (!card) return;
        card.reviewCount = Number(card.reviewCount || 0) + 1; card.lastReviewedAt = Date.now(); card.mastery = Math.max(0, Math.min(100, Number(card.mastery || 0) + (remembered ? 20 : -10)));
        const all = await load?.() || [], found = all.findIndex(x => x.word === card.word && x.pageUrl === card.pageUrl); if (found >= 0) all[found] = card; else all.unshift(card); await save?.(all); index += 1; onCards?.(cards, index);
      }
    };
  }

  const createModule = (name, actions = {}) => Object.freeze({ name, ...actions });
  const api = {
    TaixueState,
    parseQuizPayload,
    normalizeQuizItems,
    createChatModule: actions => createModule('chat', actions),
    createQuizModule: actions => createModule('quiz', actions),
    createExplainModule: actions => createModule('explain', actions),
    createVocabularyModule: actions => createModule('vocab', actions),
    createChatModule,
    createQuizModule,
    createExplainModule,
    createVocabularyReviewModule: createVocabularyModule
  };
  root.TaixueModules = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
