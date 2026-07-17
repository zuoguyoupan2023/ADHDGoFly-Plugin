const PROVIDERS = {
  deepseek: { label: 'DeepSeek', url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
  moonshot: { label: 'Moonshot', url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
  openai: { label: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  qwen: { label: 'Qwen', url: 'https://dashscope.aliyuncs.com/api/v1/chat/completions', model: 'qwen-plus' },
  chatglm: { label: 'ChatGLM', url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4.5' },
  grok: { label: 'Grok', url: 'https://api.x.ai/v1/chat/completions', model: 'grok-2-mini' }
};

const $ = id => document.getElementById(id);
let page = { title: '', text: '' };
let provider = null;

function setResult(text, empty = false) {
  const el = $('result');
  el.textContent = text;
  el.classList.toggle('empty', empty);
}

async function loadContext() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab || !tab.id) throw new Error('未找到当前网页');
  const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageTextForReader' });
  if (!response || !response.success) throw new Error(response?.error || '无法读取当前网页');
  page = { title: response.title || tab.title || '未命名网页', text: String(response.text || '') };
  $('page-title').textContent = page.title;
}

async function loadProvider() {
  const data = await chrome.storage.local.get(['aiProvider', 'aiKeys', 'aiBaseUrls', 'aiModel']);
  const name = data.aiProvider || 'deepseek';
  const cfg = PROVIDERS[name] || PROVIDERS.deepseek;
  const key = data.aiKeys && data.aiKeys[name];
  provider = { name, key, url: (data.aiBaseUrls && data.aiBaseUrls[name]) || cfg.url, model: data.aiModel || cfg.model };
  $('provider-label').textContent = key ? `${cfg.label} · ${provider.model}` : `${cfg.label} · 未配置 Key`;
  $('provider-dot').classList.toggle('ready', !!key);
}

async function ask(instruction) {
  if (!provider?.key) throw new Error('请先在插件设置中配置 AI Key');
  if (!page.text) throw new Error('当前网页没有可分析的正文');
  const prompt = `${instruction}\n\n文章标题：${page.title}\n\n文章正文：\n${page.text.slice(0, 18000)}`;
  const response = await chrome.runtime.sendMessage({
    action: 'aiChatRequest', url: provider.url, method: 'POST', timeout: 60000,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
    body: JSON.stringify({ model: provider.model, messages: [{ role: 'user', content: prompt }], stream: false })
  });
  if (!response?.success || response.status < 200 || response.status >= 300) throw new Error(`AI 请求失败（${response?.status || '网络错误'}）`);
  const data = response.data || {};
  return data.choices?.[0]?.message?.content || data.output_text || data.content || JSON.stringify(data);
}

async function runTask(task) {
  const prompts = {
    summary: '请用中文总结这篇文章，先给出三句话摘要，再列出核心观点。',
    keywords: '请提取这篇文章最重要的 8-15 个关键词或术语，并为每个词给出词性和一句话解释。',
    outline: '请提取这篇文章的层级大纲，保留章节关系，并在最后给出 TL;DR。',
    explain: '请面向初学者通俗解释这篇文章，先说明背景，再按步骤解释核心概念、方法和结论。'
  };
  setResult('正在分析当前网页…');
  try { setResult(await ask(prompts[task])); } catch (error) { setResult(error.message || '分析失败'); }
}

document.querySelectorAll('[data-task]').forEach(button => button.addEventListener('click', () => runTask(button.dataset.task)));
$('send').addEventListener('click', async () => { const input = $('question'); const q = input.value.trim(); if (!q) return; input.value = ''; setResult('正在思考…'); try { setResult(await ask(`请回答用户关于这篇文章的问题：${q}`)); } catch (error) { setResult(error.message || '请求失败'); } });
$('refresh').addEventListener('click', async () => { setResult('正在刷新网页内容…'); try { await loadContext(); setResult('已读取当前网页，请选择一个阅读操作开始分析。', true); } catch (error) { setResult(error.message || '读取失败'); } });
$('open-settings').addEventListener('click', () => chrome.runtime.sendMessage({ action: 'openExtensionSettings' }));
(async () => { try { await loadContext(); await loadProvider(); } catch (error) { setResult(error.message || '初始化失败'); } })();
