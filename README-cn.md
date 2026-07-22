# ADHDGoFly Plugin

[English](README.md) | **中文**

ADHDGoFly 是一个面向 ADHD 用户、语言学习者和重度网页阅读者的浏览器阅读助手。它最初提供多语言词性高亮，现在已经扩展为“高亮 + 稷下 Jixia AI 工作台”的网页内学习环境：用户可以在当前网页上直接总结、提问、生成测试、复习词汇、识别图片、生成图表，并把结果保存为可恢复的工作区历史。

当前版本：`0.1.8`

## OpenAI Build Week 投稿说明

ADHDGoFly 在 OpenAI Build Week 之前已经是一个面向 ADHD 用户的网页阅读高亮插件，包含基础 AI 面板、Chat、全文上下文和 Provider 设置。Build Week 提交期内，我使用 Codex 和 GPT-5.6 对稷下 Jixia 进行了有意义的扩展，把原来的 AI 面板升级为多工作区学习助手。这里描述的是 Build Week 期间新增的工作，不把整个既有项目冒充成从零开始完成。

### Build Week 期间新增的能力

- 建立 `JixiaContext`、`JixiaTask`、`JixiaState` 边界，分别管理页面上下文、AI 任务和界面状态。
- 增加阅读、写作、测试、词汇、解释、图像、图表和历史记录工作区。
- 增加带答案解释、校验和历史恢复的文章理解测试。
- 增加网页图片发现、批量选择、OCR/视觉理解、历史、导出和添加到 Chat。
- 使用结构化 `ChartModel` 生成和编辑图表，支持 SVG、JSON、HTML、PNG 导出。
- 增加统一历史、工作区保存/恢复、i18n 更新和针对性回归测试。

### Codex 与 GPT-5.6 如何被使用

Codex 是本次 Build Week 开发的主要开发伙伴。我采用的是迭代循环：先描述产品目标或实际 Bug，检查现有仓库，确定一个小的实现边界，修改代码，运行检查，在浏览器中测试，再根据新的现象继续反馈并审查 diff。产品方向、用户体验、兼容性和“哪些算完成”由我决定；Codex 加速了调查、实现、调试和验证。

本轮使用 Codex 完成的具体工作包括：

- 将旧的网页悬浮 AI 面板发展为 Jixia 工作台，并明确插件 Side Panel 与网页内工作台的职责。
- 建立 `JixiaContext`、`JixiaTask`、`JixiaState`，把大型 content script 中的 Chat、Quiz、Explain、Vocabulary 和 UI 事件拆成独立模块。
- 实现文章阅读、写作、文章理解测试、词汇、历史记录、图像和图表工作流。
- 设计网页图片发现、筛选、批量选择、GLM-4V-Flash OCR/视觉识别、进度/失败状态，以及把识别结果加入 Chat 的图像流程。
- 建立结构化 `ChartModel`、确定性渲染、本地 Mermaid/Rough/ECharts 运行时、节点/连线/lane 编辑、自然语言修改、来源引用和 SVG/JSON/HTML/PNG 导出。
- 调试真实浏览器问题：Reddit SPA 路由/上下文错误、Provider/Model 状态、推理开关、硬编码中文、历史记录渲染、宿主页 CSS 污染、窄面板布局、初始化顺序和等待状态。
- 增加上下文解析、Jixia 模块、UI 绑定、图表、图片筛选、CSS 隔离、i18n、导出和运行时相关检查。

GPT-5.6 在 Codex 中参与了核心开发会话，具体涉及稷下架构、工作区实现、图像流程、图表模型、界面迭代、Bug 调试、测试和文档。部分辅助 Codex 线程使用了 GPT-5.5；这些线程不应被描述成 GPT-5.6 线程。插件本身仍然是多 Provider 架构：GPT-5.6 用于开发当前版本，但不是用户运行插件时必须配置的 Provider。

本轮关键决策包括：显式管理页面上下文；分离 AI 任务状态与 UI 状态；保留可恢复历史；区分清空工作区和删除已保存记录；使用结构化图表模型而不是执行 AI 生成脚本；区分纯文本模型和视觉模型；保持既有存储键和 Provider 设置兼容。相关实现见 `content/jixia-context-resolver.js`、`content/jixia-modules.js`、`content/chart-model.js`、`content/chart-workspace.js`、`content/page-image-filter.js` 及对应测试。

### Build Week 证据与测试

- 赛前基线：已发布的 `0.1.7` 以及本轮开发前的仓库实际状态，已经包含词性高亮、基础 AI 面板/Chat、全文上下文和设置。
- Build Week 证据：提交期内带日期的 Git 提交记录，以及与赛前版本基线的前后差异对比。
- 核心检查：`node --check content/main.js`、`node test-jixia-modules.js`、`node test-jixia-ui-modules.js`、`node test-chart-workspace.js`、`node test-i18n-regression.js`。
- Devpost 投稿：在表单中填写主 Codex 线程的 `/feedback` Session ID。

评委建议路径：加载未打包扩展，打开一篇文章，启动稷下，把全文加入 Chat，生成阅读结果或测试，识别一张图片，再生成并导出图表。公开 Demo 视频应在三分钟内展示这条路径，并明确说明 Codex/GPT-5.6 的使用方式。

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

- Chat：基于当前网页、选中文本、段落或手动内容对话，支持新开对话并保留历史。
- 全文上下文：一键把当前网页/PDF 正文加入 Chat。
- 阅读：总结、通俗解读、结构化阅读、简明解释、提取大纲、关键词、事实辨识。
- 写作：翻译、改写成新闻、文风总结、文风仿写、生成图表材料。
- 测试：基于当前文章生成理解题，支持难度、题数、答案解释和历史恢复。
- 词汇：生成复习卡片，记录掌握度，并可保存为本地词典。
- 解释：对选中文本生成解释，并可回到 Chat 继续追问。
- 图像工作区：发现网页图片、批量勾选、OCR/视觉理解、历史、导出、添加到 Chat。
- 图表工作区：基于当前上下文生成关系图、流程图、数据图表，支持编辑、保存、导出和 AI 修改。
- 工作区清除：可手动清空当前 Chat、阅读、写作、测试、词汇、图像、图表的临时工作区；已保存到历史或 IndexedDB 的记录不会被删除。
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

### 支持平台

- 支持桌面版 Google Chrome（Manifest V3 和 Side Panel）。
- 支持桌面版 Microsoft Edge（Manifest V3 和 Side Panel）。
- Firefox、Safari 和移动浏览器目前未支持或未测试。

### Devpost 测试压缩包

附件 `ADHDGoFly-Plugin-v0.1.8-devpost.zip` 是可以直接加载的测试版本。先解压，不需要重新构建：

1. 打开 `chrome://extensions/` 或 `edge://extensions/`。
2. 开启开发者模式。
3. 点击“加载已解压的扩展程序”。
4. 选择包含 `manifest.json` 的解压目录。
5. 打开文章网页，点击 ADHDGoFly 插件图标。

压缩包不包含 API Key。AI 功能需要评委在稷下设置中填写自己的 Provider、Model 和 API Key；没有 API Key 也可以测试词性高亮和插件界面。

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
└── test-*.js / tests/             # 回归测试
```

## 测试与验证

如果从源码测试，先安装 Node.js 依赖：

```bash
npm install
```

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

## License

MIT

第三方依赖许可证见 [THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md)。
