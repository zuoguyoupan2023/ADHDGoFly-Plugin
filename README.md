# ADHDGoFly Plugin

**中文** | [English](README-en.md)

ADHDGoFly 是一个面向 ADHD 用户、语言学习者和重度网页阅读者的浏览器阅读助手。它最初提供多语言词性高亮，现在已经扩展为“高亮 + 稷下 Jixia AI 工作台”的网页内学习环境：用户可以在当前网页上直接总结、提问、生成测试、复习词汇、识别图片、生成图表，并把结果保存为可恢复的工作区历史。

当前版本：`0.1.8`

## 核心能力

### 多语言词性高亮

- 支持中文、英文、日文、法文、西班牙文、俄文。
- 支持名词、动词、形容词、副词及其他词性的颜色标记。
- 支持页面高亮开关、颜色主题、文本样式和折叠设置。
- 支持节点级缓存、流式页面处理和动态页面重新处理。
- 支持自制词典、内置词典和 AI 文章词典。

### Side Panel 插件主体

- 浏览器点击插件图标后打开 Side Panel。
- 包含主页、词典、统计、AI、颜色、关于、设置等页面。
- 插件设置是 AI Provider、Model、API Key、Base URL、Temperature 的权威入口。
- 支持存储统计、版本信息、隐私设置和词典管理。

### 稷下 Jixia AI 工作台

稷下是网页内悬浮 AI 工作台，由内容脚本注入当前页面。它不是单独网页，目标是减少复制粘贴和上下文切换。

- Chat：基于当前网页、选中文本、段落或手动内容对话。
- 全文上下文：一键把当前网页/PDF 正文加入 Chat。
- 阅读：总结、通俗解读、结构化阅读、简明解释、提取大纲、关键词、事实辨识。
- 写作：翻译、改写成新闻、文风总结、文风仿写、生成图表材料。
- 测试：基于当前文章生成理解题，支持难度、题数、答案解释和历史恢复。
- 词汇：生成复习卡片，记录掌握度，并可保存为本地词典。
- 解释：对选中文本生成解释，并可回到 Chat 继续追问。
- 图像工作区：发现网页图片、批量勾选、OCR/视觉理解、历史、导出、添加到 Chat。
- 图表工作区：基于当前上下文生成关系图、流程图、数据图表，支持编辑、保存、导出和 AI 修改。
- 历史记录：统一查看和恢复 Chat、阅读、写作、测试、图像、图表等记录。

### 图表与可视化

- 本地打包 `ECharts`、`Mermaid`、`Rough.js`，不从 CDN 运行时加载远程脚本。
- 使用结构化 `ChartModel` 作为图表数据边界。
- 支持 SVG、JSON、HTML、PNG 导出。
- 支持节点、连线、泳道、撤销/重做、版本恢复和对比。
- AI 修改图表时先更新结构化模型，再校验和渲染，不直接执行 AI 返回的脚本。

### 多 AI Provider

当前代码包含多供应商配置与回退逻辑，包括：

- DeepSeek
- Moonshot
- OpenAI / ChatGPT
- Anthropic / Claude
- Qwen
- ChatGLM
- MiniMax
- Gemini
- Grok

API Key 存储在浏览器本地存储中，不写入仓库，也不会进入普通聊天记录。

## 安装方法

### Chrome / Edge 开发者模式安装

1. 克隆或下载本仓库。
2. 打开浏览器扩展程序管理页面：
   - Chrome：`chrome://extensions/`
   - Edge：`edge://extensions/`
3. 开启“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择本仓库根目录。
6. 打开普通网页，点击浏览器工具栏中的 ADHDGoFly 图标。

### 配置 AI

1. 打开插件 Side Panel 或稷下设置。
2. 进入 AI / API 设置。
3. 选择 Provider 和 Model。
4. 填写 API Key 和 Base URL。
5. 保存后在稷下 Chat 中测试连接。

媒体识别目前单独支持 GLM-4V-Flash Key，用于图片 OCR 和视觉理解。

## 使用建议

### 阅读网页

1. 打开一篇文章或帖子。
2. 点击插件图标打开 Side Panel。
3. 开启高亮或调整词性颜色。
4. 打开稷下。
5. 点击 `+全文`，让 Chat 使用当前网页正文。
6. 运行总结、结构化阅读、测试或词汇复习。

### 使用选中文本

1. 在网页中选中文本。
2. 在稷下选择“选中”上下文。
3. 使用解释、翻译、写作或 Chat 追问。

### 使用图像工作区

1. 打开稷下的图像工作区。
2. 点击“发现网页图片”或上传图片。
3. 勾选需要识别的图片。
4. 发送识别。
5. 将识别结果添加到 Chat 或导出。

### 使用图表工作区

1. 打开稷下的图表工作区。
2. 使用当前网页材料生成图表。
3. 选择图表类型和渲染方式。
4. 编辑节点/连线，或用自然语言让 AI 修改。
5. 导出 SVG、JSON、HTML 或 PNG。

## 项目结构

```text
.
├── manifest.json                  # Manifest V3 扩展配置
├── background.js                  # Service worker、AI 请求、存储与 Side Panel 入口
├── popup.html / popup.js          # Side Panel 主界面
├── content.js                     # 旧版基础高亮入口
├── content/
│   ├── main.js                    # 稷下浮层、工作台编排、页面采集与高亮主逻辑
│   ├── jixia-context-resolver.js  # 上下文 routeKey/textHash/stale 判断
│   ├── jixia-modules.js           # Chat、Quiz、Explain、Vocabulary 等模块
│   ├── jixia-ui-modules.js        # 稷下 UI 事件绑定
│   ├── chart-model.js             # 图表结构化模型
│   ├── chart-workspace.js         # 图表保存、导出、版本能力
│   ├── chart-layout.js            # 图表布局与渲染辅助
│   ├── page-image-filter.js       # 网页图片筛选
│   ├── page-processor.js          # 传统页面高亮处理器
│   └── streaming-page-processor.js# 流式/动态页面高亮处理器
├── dictionaries/                  # 多语言词典资源
├── locales/                       # 中英文界面文案
├── lib/                           # 本地可视化运行时
├── offscreen/                     # PDF 解析相关文件
├── docs2/                         # 当前架构、路线和专题文档
└── test-*.js / tests/             # 回归测试
```

## 测试与验证

常用检查：

```bash
node --check content/main.js
node --check content/jixia-context-resolver.js
node --test tests/jixia-context-resolver.test.js
node test-jixia-modules.js
node test-jixia-ui-modules.js
node test-chart-workspace.js
node test-i18n-regression.js
```

构建：

```bash
npm run build
```

商店构建：

```bash
npm run build:store
```

## 动态页面注意事项

Reddit、部分文档站和现代 SPA 页面会在路由切换后异步插入正文。稷下使用 `JixiaContextResolver` 生成 routeKey，并通过 textHash 和 stale 判断避免把旧页面或列表页内容当作当前文章正文。

如果遇到“打开帖子后 AI 总结了列表页”的问题，优先检查：

- 当前 URL 和 canonical URL 是否不一致。
- routeKey 是否是具体帖子，而不是首页或 subreddit 列表。
- `jixiaContext.resolve('full_article')` 返回的 `textOrigin`、`textHash` 和 `staleReason`。
- Reddit 帖子页是否还没渲染正文。

相关测试：

```bash
node --test tests/jixia-context-resolver.test.js
```

## 隐私与安全边界

- API Key 保存在浏览器本地存储。
- 图像和音频发送给 AI 前会再次确认。
- 图表运行时本地打包，不运行时加载远程 JS。
- AI 返回内容不得直接作为可执行脚本。
- 图表 AI 修改通过结构化 ChartModel 校验后渲染。
- 用户网页内容、图片、PDF 是否发送给 AI 取决于用户主动操作和配置。

## 文档入口

- [docs2/000-summary.md](docs2/000-summary.md)：项目当前总摘要。
- [docs2/000-tools-and-workspace.md](docs2/000-tools-and-workspace.md)：工具与工作区规划。
- [docs2/006-jixia-ai-architecture.md](docs2/006-jixia-ai-architecture.md)：稷下 AI 架构。
- [docs2/009-chart-capability-plan.md](docs2/009-chart-capability-plan.md)：图表能力路线。
- [docs2/012-reddit-highlight-and-dynamic-page.md](docs2/012-reddit-highlight-and-dynamic-page.md)：Reddit/动态页面上下文问题记录。
- [docs2/020-openaibuildweek.md](docs2/020-openaibuildweek.md)：OpenAI Build Week 投稿准备。

## License

MIT

第三方依赖许可证见 [THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md)。
