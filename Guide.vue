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
        ? 'ADHDGoFly 是一款浏览器插件，通过智能词性高亮技术，自动为网页中的名词、动词、形容词、比较级/最高级等词性标注不同颜色，帮助你更快抓住句子结构、提升阅读效率。插件还包含网页内的稷下 Jixia AI 面板，为阅读、提问、复习和可视化提供增强能力。'
        : 'ADHDGoFly is a browser extension that intelligently highlights parts of speech — nouns, verbs, adjectives, comparatives/superlatives — in different colors, helping you grasp sentence structure faster and read more efficiently. It also includes the in-page Jixia AI panel for enhanced reading, questions, review, and visualization.'
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
            ? '自动识别并标注名词（紫色）、动词（红色）、形容词（绿色）、比较级（深蓝色），一目了然；支持多语言、缓存、流式处理和动态页面重新处理。'
            : 'Auto-identifies nouns (purple), verbs (red), adjectives (green), and comparatives (dark blue) at a glance, with multilingual support, caching, streaming, and dynamic-page reprocessing.'
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
            ? '支持中文、英文、日文、法文、西班牙文、俄文等多语言词典和词性高亮。'
            : 'Supports multilingual dictionaries and highlighting for Chinese, English, Japanese, French, Spanish, Russian, and more.'
          }}</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">🎛️</div>
          <h3>{{ lang === 'zh' ? '多种配色方案' : 'Color Schemes' }}</h3>
          <p>{{ lang === 'zh'
            ? '在 Side Panel 中切换颜色主题、文字样式、高亮和折叠设置，按自己的阅读习惯调整。'
            : 'Adjust color themes, text styles, highlighting, and folding from the Side Panel.'
          }}</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">🤖</div>
          <h3>{{ lang === 'zh' ? '稷下 Jixia AI 工作台' : 'Jixia AI Workspace' }}</h3>
          <p>{{ lang === 'zh'
            ? '作为插件内的 AI 增强面板，稷下支持 Chat、阅读、写作、测试、词汇、图像、图表和历史记录，帮助你在当前网页中继续学习。'
            : 'As an AI enhancement inside the extension, Jixia provides Chat, reading, writing, quizzes, vocabulary, image, chart, and recoverable history tools on the current page.'
          }}</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">📄</div>
          <h3>{{ lang === 'zh' ? 'PDF 解析' : 'PDF Parsing' }}</h3>
          <p>{{ lang === 'zh'
            ? '支持网页和 PDF 正文上下文；可以把全文、选中文本、段落或手动内容交给 AI。'
            : 'Use webpage or PDF context, selected text, paragraphs, or manual input with AI.'
          }}</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">🧠</div>
          <h3>{{ lang === 'zh' ? '阅读与学习工作区' : 'Reading & Learning Workspaces' }}</h3>
          <p>{{ lang === 'zh'
            ? '阅读支持总结、结构化阅读、事实辨识和深入讨论；写作支持翻译、新闻改写和文风辅助；测试与词汇支持复习。'
            : 'Reading supports summaries, structured reading, fact checking, and discussion; writing supports translation and rewrites; quizzes and vocabulary support review.'
          }}</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">📤</div>
          <h3>{{ lang === 'zh' ? '一键发送到 Reader' : 'Send to Reader' }}</h3>
          <p>{{ lang === 'zh'
            ? '将网页内容或选中文本一键发送到 ADHDGoFly Reader，进行深度阅读和管理。'
            : 'Send webpage content or selected text to ADHDGoFly Reader for deeper reading and management.'
          }}</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">📚</div>
          <h3>{{ lang === 'zh' ? '词典管理' : 'Dictionary Management' }}</h3>
          <p>{{ lang === 'zh'
            ? '管理内置、自制和 AI 文章词典；词汇工作区可生成词义、词性和例句，并保存为本地词典。'
            : 'Manage built-in, custom, and AI article dictionaries; generate vocabulary meanings, parts of speech, and examples.'
          }}</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>{{ lang === 'zh' ? '图像与图表工作区' : 'Image & Chart Workspaces' }}</h3>
          <p>{{ lang === 'zh'
            ? '发现和批量识别网页图片，或生成可编辑图表；支持历史、SVG/JSON/HTML/PNG 导出和 AI 修改。'
            : 'Discover and recognize page images, or create editable charts with history, SVG/JSON/HTML/PNG export, and AI edits.'
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
            <h4>{{ lang === 'zh' ? '打开网页或 PDF' : 'Open a webpage or PDF' }}</h4>
            <p>{{ lang === 'zh'
              ? '打开文章、帖子或 PDF，插件会处理页面内容并显示词性高亮；动态页面会继续跟随内容变化。'
              : 'Open an article, post, or PDF. Highlighting follows the page and can reprocess dynamic content.'
            }}</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h4>{{ lang === 'zh' ? '打开稷下 Jixia' : 'Open Jixia' }}</h4>
            <p>{{ lang === 'zh'
              ? '点击插件图标打开 Side Panel；需要 AI 时，再从网页内打开稷下工作台。'
              : 'Click the extension icon to open the Side Panel, then launch the in-page Jixia workspace when needed.'
            }}</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">4</div>
          <div class="step-content">
            <h4>{{ lang === 'zh' ? '开始阅读与复习' : 'Read and review' }}</h4>
            <p>{{ lang === 'zh'
              ? '配置 Provider、Model 和 API Key 后，可使用 Chat、阅读、写作、测试、词汇、图像和图表工作区。'
              : 'Configure a Provider, Model, and API Key to use Chat, reading, writing, quizzes, vocabulary, image, and chart workspaces.'
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
              ? '进入 Side Panel 或稷下设置，选择 Provider 和 Model，填写 API Key 与 Base URL。API Key 只保存在浏览器本地。'
              : 'Open Side Panel or Jixia Settings, choose a Provider and Model, then enter the API Key and Base URL. Keys stay in local browser storage.'
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
            ? '支持大多数普通网页、动态页面和 PDF；不同网站的正文结构可能影响自动识别结果。学术网站可直接尝试。'
            : 'Most webpages, dynamic pages, and PDFs are supported. Site structure can affect automatic extraction, so try the page directly.'
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
          <span class="version-date">2026-07-22</span>
        </div>
        <h4>{{ lang === 'zh' ? 'Jixia 工作台与多媒体能力' : 'Jixia Workspaces & Multimodal Tools' }}</h4>
        <ul>
          <li>{{ lang === 'zh' ? '稷下统一为 Chat、阅读、写作、测试、词汇、历史、图像和图表工作区。' : 'Jixia now includes Chat, reading, writing, quiz, vocabulary, records, image, and chart workspaces.' }}</li>
          <li>{{ lang === 'zh' ? '新增图片 OCR/视觉理解、图表编辑与 SVG、JSON、HTML、PNG 导出。' : 'Added image OCR/visual understanding, chart editing, and SVG, JSON, HTML, and PNG export.' }}</li>
          <li>{{ lang === 'zh' ? '统一历史记录、工作区恢复、i18n 和动态页面正文识别，并增强窄窗口与宿主页样式隔离。' : 'Improved records, workspace restore, i18n, dynamic-page extraction, narrow layouts, and host-page CSS isolation.' }}</li>
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
