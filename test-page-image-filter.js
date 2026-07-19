const assert = require('node:assert/strict');
const filter = require('./content/page-image-filter.js');

const result = filter.filterImages([
  { url: 'https://example.com/chart.png?utm_source=x', alt: 'GDP growth chart', inArticle: true, hasCaption: true, width: 800, height: 500 },
  { url: 'https://example.com/ad-banner.png', alt: 'Advertisement', width: 728, height: 90 },
  { url: 'https://example.com/avatar.png', alt: 'User avatar', width: 64, height: 64, isTiny: true, isSquare: true },
  { url: 'https://example.com/chart.png#duplicate', alt: 'same chart', width: 800, height: 500 }
]);

assert.equal(result.kept.length, 1);
assert.equal(result.kept[0].item.alt, 'GDP growth chart');
assert.equal(result.rejected.filter(x => x.reason === '重复图片').length, 1);
assert.equal(result.rejected.filter(x => x.reason === '疑似广告/导航/头像/Logo').length, 2);
console.log('page-image-filter tests passed');
