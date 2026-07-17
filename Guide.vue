<template>
  <div class="guide-page">
    <!-- 头部 Hero -->
    <header class="hero">
      <div class="hero-content">
        <h1 class="hero-title">ADHDGoFly</h1>
        <p class="hero-subtitle">{{ lang === 'zh' ? '高亮你的视线，让阅读更高效' : 'Highlight your sight, read better' }}</p>
        <div class="hero-badge">v0.1.8</div>
      </div>
    </header>

    <!-- 语言切换 -->
    <div class="lang-switch">
      <button :class="{ active: lang === 'zh' }" @click="lang = 'zh'">中文</button>
      <button :class="{ active: lang === 'en' }" @click="lang = 'en'">English</button>
    </div>

    <!-- 简介 -->
    <section class="section intro">
      <h2>{{ lang === 'zh' ? 'ADHDGoFly 是什么？' : 'What is ADHDGoFly?' }}</h2>
      <p>{{ lang === 'zh'
        ? 'ADHDGoFly 是一款浏览器插件，通过智能词性高亮技术，自动为网页中的名词、动词、形容词、比较级/最高级等词性标注不同颜色，帮助你更快抓住句子结构、提升阅读效率。'
        : 'ADHDGoFly is a browser extension that intelligently highlights parts of speech — nouns, verbs, adjectives, comparatives/superlatives — in different colors, helping you grasp sentence structure faster and read more efficiently.'
      }}</p>
    </section>

    <!-- 核心特点 -->
    <section class="section features">
      <h2>{{ lang === 'zh' ? '核心特点' : 'Core Features' }}</h2>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🎨</div>
          <h3>{{ lang === 'zh' ? '智能词性高亮' : 'Smart POS Highlighting' }}</h3>
          <p>{{ lang === 'zh'
            ? '自动识别并标注名词（紫色）、动词（红色）、形容词（绿色）、比较级（深蓝色），一目了然。'
            : 'Auto-identifies nouns (purple), verbs (red), adjectives (green), comparatives (dark blue) at a glance.'
          }}</p>
          <div class="color-demo">
            <span class="demo-noun">{{ lang === 'zh' ? '名词' : 'noun' }}</span>
            <span class="demo-verb">{{ lang === 'zh' ? '动词' : 'verb' }}</span>
            <span class="demo-adj">{{ lang === 'zh' ? '形容词' : 'adj' }}</span>
            <span class="demo-comp">{{ lang === 'zh' ? '比较级' : 'comp' }}</span>
          </div>
        </div>

        <div class="feature-card">
          <div class="feature-icon">🌐</div>
          <h3>{{ lang === 'zh' ? '多语言支持' : 'Multi-Language Support' }}</h3>
          <p>{{ lang === 'zh'
            ? '支持英文、中文、法语、西班牙语、俄语、日语等多种语言的词性分析。'
            : 'Supports English, Chinese, French, Spanish, Russian, Japanese and more.'
          }}</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">🎛️</div>
          <h3>{{ lang === 'zh' ? '多种配色方案' : 'Color Schemes' }}</h3>
          <p>{{ lang === 'zh'
            ? '内置默认、暖色、冷色等多种配色方案，可根据个人偏好自由切换。'
            : 'Built-in default, warm, cool, and other color schemes — switch freely to match your preference.'
          }}</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">🤖</div>
          <h3>{{ lang === 'zh' ? 'ExamRoom AI 学习室' : 'ExamRoom AI Panel' }}</h3>
          <p>{{ lang === 'zh'
            ? '内置 AI 学习面板，支持页面总结、简明解释、大纲提取、关键词提取等功能。'
            : 'Built-in AI panel with page summarization, plain explanations, outline extraction, keyword extraction, and more.'
          }}</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">📄</div>
          <h3>{{ lang === 'zh' ? 'PDF 解析' : 'PDF Parsing' }}</h3>
          <p>{{ lang === 'zh'
            ? '支持 PDF 文档的自动解析和高亮标注，论文阅读更轻松。'
            : 'Auto-parse and highlight PDF documents — making paper reading effortless.'
          }}</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">📤</div>
          <h3>{{ lang === 'zh' ? '一键发送到 Reader' : 'Send to Reader' }}</h3>
          <p>{{ lang === 'zh'
            ? '将网页内容一键发送到 ADHDGoFly Reader 进行深度阅读和管理。'
            : 'One-click send page content to ADHDGoFly Reader for deep reading and management.'
          }}</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">📚</div>
          <h3>{{ lang === 'zh' ? '词典管理' : 'Dictionary Management' }}</h3>
          <p>{{ lang === 'zh'
            ? '支持自定义词典扩展，满足专业领域词汇的标注需求。'
            : 'Custom dictionary extensions for domain-specific terminology highlighting.'
          }}</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>{{ lang === 'zh' ? '一键开关' : 'One-Click Toggle' }}</h3>
          <p>{{ lang === 'zh'
            ? '点击插件图标即可开启/关闭高亮，随时切换阅读模式。'
            : 'Click the extension icon to toggle highlighting on/off anytime.'
          }}</p>
        </div>
      </div>
    </section>

    <!-- 快速开始 -->
    <section class="section quickstart">
      <h2>{{ lang === 'zh' ? '使用步骤' : 'How to Use' }}</h2>
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>{{ lang === 'zh' ? '安装插件' : 'Install' }}</h4>
            <p>{{ lang === 'zh'
              ? '从 Chrome 网上应用店安装 ADHDGoFly 插件，安装后默认开启。'
              : 'Install ADHDGoFly from Chrome Web Store. Enabled by default after installation.'
            }}</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h4>{{ lang === 'zh' ? '打开任意网页' : 'Open any webpage' }}</h4>
            <p>{{ lang === 'zh'
              ? '浏览任意网页，插件会自动分析并在文字上叠加词性高亮颜色。'
              : 'Browse any webpage — the extension auto-analyzes and applies POS color highlights.'
            }}</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h4>{{ lang === 'zh' ? '切换配色方案' : 'Choose color scheme' }}</h4>
            <p>{{ lang === 'zh'
              ? '点击插件图标，在弹窗中选择你喜欢的配色方案。'
              : 'Click the extension icon and pick your preferred color scheme in the popup.'
            }}</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">4</div>
          <div class="step-content">
            <h4>{{ lang === 'zh' ? '配置 AI 学习室（可选）' : 'Configure AI Panel (optional)' }}</h4>
            <p>{{ lang === 'zh'
              ? '在设置中填入 API Key，即可使用 AI 总结、解释、提问等高级功能。'
              : 'Fill in your API Key in settings to unlock AI summarization, explanation, and Q&A.'
            }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 用户需要做什么 -->
    <section class="section todo">
      <h2>{{ lang === 'zh' ? '你需要做什么？' : 'What You Need to Do' }}</h2>
      <div class="todo-list">
        <div class="todo-item">
          <div class="todo-icon">✅</div>
          <div class="todo-text">
            <strong>{{ lang === 'zh' ? '固定插件到工具栏' : 'Pin the extension' }}</strong>
            <p>{{ lang === 'zh'
              ? '点击浏览器右上角的拼图图标，找到 ADHDGoFly 并点击图钉固定，方便日常使用。'
              : 'Click the puzzle icon in your browser toolbar, find ADHDGoFly, and pin it for easy access.'
            }}</p>
          </div>
        </div>
        <div class="todo-item">
          <div class="todo-icon">🔑</div>
          <div class="todo-text">
            <strong>{{ lang === 'zh' ? '配置 AI API Key（可选但推荐）' : 'Set up AI API Key (optional but recommended)' }}</strong>
            <p>{{ lang === 'zh'
              ? '进入插件弹窗 → 设置 → API Key，配置 DeepSeek、OpenAI、Claude 等任意一个 API Key，解锁 ExamRoom AI 学习室全部功能。'
              : 'Go to popup → Settings → API Key, configure any API Key (DeepSeek, OpenAI, Claude, etc.) to unlock the full ExamRoom AI Panel.'
            }}</p>
          </div>
        </div>
        <div class="todo-item">
          <div class="todo-icon">🔤</div>
          <div class="todo-text">
            <strong>{{ lang === 'zh' ? '选择需要高亮的语言' : 'Select languages to highlight' }}</strong>
            <p>{{ lang === 'zh'
              ? '在设置中选择你需要标注的语言（英文默认开启），可以按需开启或关闭特定语言。'
              : 'In settings, choose the languages you want highlighted (English is on by default). Toggle specific languages as needed.'
            }}</p>
          </div>
        </div>
        <div class="todo-item">
          <div class="todo-icon">🎨</div>
          <div class="todo-text">
            <strong>{{ lang === 'zh' ? '试试不同配色' : 'Try different color schemes' }}</strong>
            <p>{{ lang === 'zh'
              ? '默认配色已经很棒，但你还可以在弹窗中切换暖色、冷色等其他方案，找到最适合自己的视觉风格。'
              : 'The default scheme works great, but you can also try warm, cool, and other schemes to find your perfect visual style.'
            }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="section faq">
      <h2>FAQ</h2>
      <div class="faq-list">
        <details class="faq-item">
          <summary>{{ lang === 'zh' ? '插件安装后没有效果？' : 'No effect after install?' }}</summary>
          <p>{{ lang === 'zh'
            ? '请刷新当前页面，让插件的 content script 加载。如果仍无效，检查插件是否被浏览器禁用，或尝试重启浏览器。'
            : 'Refresh the current page to load the content script. If still no effect, check if the extension is disabled, or try restarting your browser.'
          }}</p>
        </details>
        <details class="faq-item">
          <summary>{{ lang === 'zh' ? '高亮颜色可以自定义吗？' : 'Can I customize highlight colors?' }}</summary>
          <p>{{ lang === 'zh'
            ? '可以！在弹窗的颜色管理中可以切换多种预设配色方案，也支持自定义每种词性对应的颜色。'
            : 'Yes! In the color management section of the popup, you can switch between preset color schemes or customize each POS color individually.'
          }}</p>
        </details>
        <details class="faq-item">
          <summary>{{ lang === 'zh' ? '支持哪些网站？' : 'Which websites are supported?' }}</summary>
          <p>{{ lang === 'zh'
            ? '支持所有网页（包括学术论文网站如 arXiv、Springer、Nature、Science、IEEE 等）。PDF 文件也支持自动解析。'
            : 'All web pages are supported (including academic sites like arXiv, Springer, Nature, Science, IEEE). PDF files are also auto-parsed.'
          }}</p>
        </details>
        <details class="faq-item">
          <summary>{{ lang === 'zh' ? '插件会影响网页加载速度吗？' : 'Does it affect page loading speed?' }}</summary>
          <p>{{ lang === 'zh'
            ? '插件采用流式处理和缓存优化，对网页加载速度的影响极小，几乎无感知。'
            : 'The extension uses streaming processing and cache optimization, with minimal impact on page loading speed — almost unnoticeable.'
          }}</p>
        </details>
        <details class="faq-item">
          <summary>{{ lang === 'zh' ? '如何反馈问题或建议？' : 'How to give feedback?' }}</summary>
          <p>{{ lang === 'zh'
            ? '可以通过插件弹窗中的评价功能反馈，或访问 adhdgofly.online 官网联系我们。'
            : 'Use the review feature in the extension popup, or visit adhdgofly.online to contact us.'
          }}</p>
        </details>
      </div>
    </section>

    <!-- 版本信息 -->
    <section class="section version-info">
      <h2>{{ lang === 'zh' ? '最新更新' : 'Latest Update' }}</h2>
      <div class="version-card">
        <div class="version-header">
          <span class="version-tag">v0.1.8</span>
          <span class="version-date">2026-05-04</span>
        </div>
        <h4>{{ lang === 'zh' ? '颜色优化与品牌升级' : 'Color Optimization & Brand Upgrade' }}</h4>
        <ul>
          <li>{{ lang === 'zh' ? '名词高亮由蓝色调整为紫色，比较级由紫色调整为深蓝色，提升词性区分度' : 'Noun highlight changed from blue to purple, comparative from purple to dark blue for better distinction' }}</li>
          <li>{{ lang === 'zh' ? '官网域名切换至 adhdgofly.online' : 'Official website migrated to adhdgofly.online' }}</li>
          <li>{{ lang === 'zh' ? '推荐新插件 EaText — 更主动的阅读工具' : 'Recommended new extension EaText — a more active reading tool' }}</li>
        </ul>
      </div>
    </section>

    <!-- 底部 -->
    <footer class="footer">
      <p>
        <a href="https://adhdgofly.online" target="_blank">adhdgofly.online</a>
        <span class="separator">|</span>
        <a href="https://chromewebstore.google.com/detail/bdpadkojpehfdepjjadmpjeieiddeodl" target="_blank">Chrome Web Store</a>
      </p>
      <p class="copyright">ADHDGoFly — Highlight your sight</p>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'PluginGuide',
  data() {
    return {
      lang: 'zh'
    }
  }
}
</script>

<style scoped>
/* ========== Reset & Base ========== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.guide-page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  color: #1a1a2e;
  background: #f8f9fc;
  min-height: 100vh;
  line-height: 1.7;
}

/* ========== Hero ========== */
.hero {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 40%, #1e3a8a 100%);
  color: #fff;
  padding: 80px 24px 64px;
  text-align: center;
}

.hero-title {
  font-size: 48px;
  font-weight: 800;
  letter-spacing: -1px;
  margin-bottom: 12px;
}

.hero-subtitle {
  font-size: 18px;
  opacity: 0.9;
  margin-bottom: 16px;
}

.hero-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  padding: 4px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

/* ========== Language Switch ========== */
.lang-switch {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 24px 0;
}

.lang-switch button {
  padding: 6px 20px;
  border: 1px solid #d0d5dd;
  border-radius: 20px;
  background: #fff;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.lang-switch button.active {
  background: #8b5cf6;
  color: #fff;
  border-color: #8b5cf6;
}

/* ========== Sections ========== */
.section {
  max-width: 900px;
  margin: 0 auto 48px;
  padding: 0 24px;
}

.section h2 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 20px;
  color: #1a1a2e;
  position: relative;
  padding-bottom: 12px;
}

.section h2::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 48px;
  height: 3px;
  background: linear-gradient(90deg, #8b5cf6, #6366f1);
  border-radius: 2px;
}

/* ========== Features Grid ========== */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
  margin-top: 24px;
}

.feature-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #e8ecf0;
  transition: box-shadow 0.25s, transform 0.25s;
}

.feature-card:hover {
  box-shadow: 0 6px 24px rgba(139, 92, 246, 0.1);
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.feature-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1a1a2e;
}

.feature-card p {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
}

/* Color demo */
.color-demo {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.demo-noun,
.demo-verb,
.demo-adj,
.demo-comp {
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
}

.demo-noun {
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
}

.demo-verb {
  color: #cc0000;
  background: rgba(204, 0, 0, 0.1);
}

.demo-adj {
  color: #009933;
  background: rgba(0, 153, 51, 0.1);
}

.demo-comp {
  color: #1e3a8a;
  background: rgba(30, 58, 138, 0.1);
}

/* ========== Steps ========== */
.steps {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 24px;
}

.step {
  display: flex;
  gap: 16px;
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  border: 1px solid #e8ecf0;
  align-items: flex-start;
}

.step-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.step-content h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #1a1a2e;
}

.step-content p {
  font-size: 14px;
  color: #555;
}

/* ========== Todo List ========== */
.todo-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
}

.todo-item {
  display: flex;
  gap: 16px;
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  border: 1px solid #e8ecf0;
  align-items: flex-start;
}

.todo-icon {
  font-size: 24px;
  flex-shrink: 0;
  margin-top: 2px;
}

.todo-text strong {
  font-size: 15px;
  color: #1a1a2e;
}

.todo-text p {
  font-size: 14px;
  color: #555;
  margin-top: 4px;
}

/* ========== FAQ ========== */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

.faq-item {
  background: #fff;
  border: 1px solid #e8ecf0;
  border-radius: 10px;
  overflow: hidden;
}

.faq-item summary {
  padding: 16px 20px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  color: #1a1a2e;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.faq-item summary::-webkit-details-marker {
  display: none;
}

.faq-item summary::after {
  content: '+';
  font-size: 18px;
  color: #8b5cf6;
  font-weight: 300;
}

.faq-item[open] summary::after {
  content: '−';
}

.faq-item p {
  padding: 0 20px 16px;
  font-size: 14px;
  color: #555;
  line-height: 1.7;
}

/* ========== Version ========== */
.version-card {
  background: #fff;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  padding: 24px;
  margin-top: 24px;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.version-tag {
  background: #8b5cf6;
  color: #fff;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
}

.version-date {
  font-size: 13px;
  color: #999;
}

.version-card h4 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
}

.version-card ul {
  list-style: none;
  padding: 0;
}

.version-card li {
  font-size: 14px;
  color: #555;
  padding: 4px 0;
  padding-left: 16px;
  position: relative;
}

.version-card li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #8b5cf6;
  font-weight: bold;
}

/* ========== Footer ========== */
.footer {
  text-align: center;
  padding: 40px 24px;
  border-top: 1px solid #e8ecf0;
  margin-top: 48px;
}

.footer a {
  color: #8b5cf6;
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}

.separator {
  margin: 0 8px;
  color: #ccc;
}

.copyright {
  margin-top: 8px;
  font-size: 13px;
  color: #999;
}

/* ========== Responsive ========== */
@media (max-width: 640px) {
  .hero-title {
    font-size: 32px;
  }
  .hero-subtitle {
    font-size: 15px;
  }
  .section h2 {
    font-size: 22px;
  }
  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
