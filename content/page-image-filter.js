/* global window */
(function (root) {
  'use strict';

  const JUNK = /广告|推广|赞助|ad[s]?\b|advert|banner|avatar|头像|logo|标志|icon|图标|favicon|导航|nav|menu|推荐|related|popular|评论|comment|footer|分享|share|登录|注册/i;
  const CONTENT = /article|正文|content|main|post|story|paper|figure|chart|graph|table|caption|news|文章|图表|论文|配图/i;

  function normalizeUrl(url) {
    try {
      const parsed = new URL(String(url || ''), root.location?.href || undefined);
      parsed.hash = '';
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'].forEach(key => parsed.searchParams.delete(key));
      return parsed.href;
    } catch (_) { return String(url || '').split('#')[0]; }
  }

  function scoreImage(meta) {
    const text = [meta.alt, meta.title, meta.className, meta.id, meta.parentText, meta.ancestorText, meta.src].filter(Boolean).join(' ');
    const junk = JUNK.test(text);
    const content = CONTENT.test(text);
    const area = Math.max(0, Number(meta.width) || 0) * Math.max(0, Number(meta.height) || 0);
    let score = 0;
    if (content) score += 3;
    if (meta.inArticle) score += 4;
    if (meta.hasCaption) score += 3;
    if (area >= 160000) score += 2;
    if (Number(meta.width) >= 240 && Number(meta.height) >= 120) score += 1;
    if (junk) score -= 8;
    if (meta.isTiny || Number(meta.width) < 120 || Number(meta.height) < 70) score -= 4;
    if (meta.isSquare && area < 160000) score -= 2;
    return { score, reason: junk ? '疑似广告/导航/头像/Logo' : (content || meta.inArticle ? '正文相关' : '普通图片') };
  }

  function filterImages(items, options) {
    const seen = new Map();
    const kept = [];
    const rejected = [];
    (items || []).forEach((item, index) => {
      const url = normalizeUrl(item.url);
      const result = scoreImage(item);
      const previous = seen.get(url);
      if (previous !== undefined) { rejected.push({ item, index, reason: '重复图片' }); return; }
      seen.set(url, index);
      // Only discard strong junk signals. Ambiguous images remain available to the user.
      const minimum = options?.minimumScore ?? -2;
      if (result.score < minimum) rejected.push({ item, index, reason: result.reason });
      else kept.push({ item, index, score: result.score, reason: result.reason, normalizedUrl: url });
    });
    return { kept, rejected };
  }

  root.AgfPageImageFilter = { filterImages, scoreImage, normalizeUrl };
  if (typeof module !== 'undefined') module.exports = root.AgfPageImageFilter;
})(typeof window !== 'undefined' ? window : globalThis);
