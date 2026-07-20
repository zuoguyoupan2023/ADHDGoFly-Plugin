/* global window */
(function (root) {
  'use strict';
  const bind = (element, event, handler) => { if (element && typeof handler === 'function') element.addEventListener(event, handler); };
  const bindClick = (element, handler) => bind(element, 'click', handler);

  function bindChatEvents({ elements = {}, actions = {} } = {}) {
    const run = (name, fallback = {}) => () => actions.runArticleChatTask?.({ ...fallback, ...(actions.chatTasks?.[name] || {}) });
    bindClick(elements.quickSummary, run('summary', { prefix: actions.labels?.summary || '总结', includeLangHint: true }));
    bindClick(elements.beginnerExplain, run('beginner', { prefix: actions.labels?.beginner || '保姆级解读', includeLangHint: true }));
    bindClick(elements.translate, run('translate', { title: '请翻译以下内容，保留术语和段落结构。', prefix: '翻译', extra: '输出要求：如果原文是中文，请翻译成英文；如果原文不是中文，请翻译成中文。' }));
    bindClick(elements.structured, run('structured', { prefix: actions.labels?.structured || '结构化摘要' }));
    bindClick(elements.explain, run('explain', { prefix: actions.labels?.explain || '简明解释' }));
    bindClick(elements.outline, run('outline', { prefix: actions.labels?.outline || '提取大纲' }));
    bindClick(elements.keywords, run('keywords', { prefix: actions.labels?.keywords || '提取关键词' }));
    bindClick(elements.tab, actions.showChat);
    return true;
  }

  function bindQuizEvents({ elements = {}, actions = {} } = {}) {
    bindClick(elements.submit, actions.submit);
    bindClick(elements.next, actions.next);
    bindClick(elements.backHistory, actions.backHistory);
    bindClick(elements.tab, actions.show);
    bindClick(elements.start, () => actions.start?.('easy'));
    bindClick(elements.easy, () => actions.start?.('easy'));
    bindClick(elements.hard, () => actions.start?.('hard'));
    bindClick(elements.history, actions.history);
    return true;
  }

  function bindExplainEvents({ elements = {}, actions = {} } = {}) {
    bindClick(elements.tab, actions.open);
    bindClick(elements.retry, actions.retry);
    bindClick(elements.toChat, actions.toChat);
    return true;
  }

  function bindVocabularyEvents({ elements = {}, actions = {} } = {}) {
    bindClick(elements.tab, actions.open);
    bindClick(elements.start, actions.start);
    bindClick(elements.reset, actions.reset);
    return true;
  }

  const api = { bindChatEvents, bindQuizEvents, bindExplainEvents, bindVocabularyEvents };
  root.JixiaUiModules = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
