const test = require('node:test');
const assert = require('node:assert/strict');
const resolver = (() => {
  const root = { location: { href: 'https://example.com/' } };
  global.window = root;
  delete require.cache[require.resolve('../content/jixia-context-resolver.js')];
  require('../content/jixia-context-resolver.js');
  return root.JixiaContextResolver;
})();

test('Reddit post route is distinct from home and canonical home is not trusted', () => {
  const post = resolver.identity('https://www.reddit.com/comments/abc/title', 'https://www.reddit.com/');
  const home = resolver.identity('https://www.reddit.com/', 'https://www.reddit.com/');
  assert.notEqual(post.routeKey, home.routeKey);
  assert.equal(post.canonicalRouteKey, post.routeKey);
});

test('route mismatch marks cached text stale', () => {
  const current = resolver.identity('https://site.test/article/two', 'https://site.test/article/two');
  const result = resolver.classify({ text: 'old article', source: 'stored_segments', requestedSource: 'full_article', identity: current, record: { routeKey: 'https://site.test/article/one' } });
  assert.equal(result.isStale, true);
  assert.equal(result.staleReason, 'route_mismatch');
});

test('selection and paragraph never silently widen scope', () => {
  const identity = resolver.identity('https://site.test/article', 'https://site.test/article');
  assert.equal(resolver.classify({ text: '', source: 'dom_live', requestedSource: 'selection', identity }).isStale, false);
  assert.equal(resolver.classify({ text: '', source: 'dom_live', requestedSource: 'paragraph', identity }).isStale, false);
});

test('text hash and origin are returned for diagnostics', () => {
  const identity = resolver.identity('https://site.test/article', 'https://site.test/article');
  const result = resolver.classify({ text: '正文 A', source: 'dom_live', requestedSource: 'full_article', identity });
  assert.equal(result.textOrigin, 'dom_live');
  assert.match(result.textHash, /^[0-9a-f]{8}$/);
});

