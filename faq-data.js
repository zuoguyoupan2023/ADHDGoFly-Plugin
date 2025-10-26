// FAQ数据文件
const FAQ_DATA = {
  zh: [
    {
      id: 'q1',
      category: 'installation',
      question: '如何安装 ADHDGoFly 插件？',
      answer: `
        <p><strong>Chrome浏览器</strong>: 访问 Chrome网上应用店搜索"ADHDGoFly"，点击"添加至Chrome"</p>
        <p><strong>Edge浏览器</strong>: 访问 Microsoft Edge加载项商店搜索"ADHDGoFly"，点击"获取"</p>
        <p><strong>手动安装</strong>: 下载插件压缩包，在浏览器扩展管理页面开启"开发者模式"，选择"加载已解压的扩展程序"</p>
      `
    },
    {
      id: 'q2',
      category: 'installation',
      question: '如何手动安装插件？',
      answer: `
        <ol>
          <li>访问 <code>https://download.adhdgofly.online</code> 下载对应浏览器的zip安装包</li>
          <li>解压缩文件：Mac双击zip文件自动解压，Windows右键选择"解压缩"</li>
          <li>打开浏览器扩展管理页面：Chrome访问 <code>chrome://extensions/</code>，Edge访问 <code>edge://extensions/</code></li>
          <li>开启"开发者模式"或"开发人员模式"</li>
          <li>点击"加载未打包的扩展程序"或"加载解压缩的扩展"</li>
          <li>选择解压后的整个文件夹</li>
        </ol>
      `
    },
    {
      id: 'q3',
      category: 'installation',
      question: '插件安装后无法使用怎么办？',
      answer: `
        <p>请按以下步骤排查：</p>
        <ol>
          <li><strong>检查插件状态</strong>：确保插件已启用且权限正常</li>
          <li><strong>刷新页面</strong>：安装后需要刷新网页才能生效</li>
          <li><strong>检查网站兼容性</strong>：某些特殊网站可能不支持</li>
          <li><strong>清除缓存</strong>：清除浏览器缓存后重试</li>
          <li><strong>重启浏览器</strong>：完全关闭浏览器后重新打开</li>
        </ol>
      `
    },
    {
      id: 'q4',
      category: 'usage',
      question: '如何开启和关闭文本高亮功能？',
      answer: `
        <p>有多种方式控制高亮功能：</p>
        <ul>
          <li><strong>插件图标</strong>：点击浏览器工具栏中的插件图标，使用"切换高亮"按钮</li>
          <li><strong>快捷键</strong>：使用 <code>Ctrl+Shift+H</code> (Windows) 或 <code>Cmd+Shift+H</code> (Mac) 快速切换</li>
          <li><strong>右键菜单</strong>：在网页上右键选择"ADHDGoFly 切换高亮"</li>
        </ul>
      `
    },
    {
      id: 'q5',
      category: 'usage',
      question: '如何自定义颜色方案？',
      answer: `
        <ol>
          <li>点击插件图标打开设置面板</li>
          <li>选择"颜色"选项卡</li>
          <li>可以选择预设方案或自定义颜色：
            <ul>
              <li><strong>名词</strong>：默认蓝色，可自定义</li>
              <li><strong>动词</strong>：默认绿色，可自定义</li>
              <li><strong>形容词</strong>：默认橙色，可自定义</li>
            </ul>
          </li>
          <li>点击"应用方案"保存设置</li>
        </ol>
      `
    },
    {
      id: 'q6',
      category: 'usage',
      question: '如何添加自定义词典？',
      answer: `
        <ol>
          <li>点击插件图标，选择"词典"选项卡</li>
          <li>在"自制词典"部分点击"+添加"按钮</li>
          <li>选择词典文件（.json格式）</li>
          <li>输入词典名称和选择语言</li>
          <li>可选择指定领域（如医学、法律等）</li>
          <li>点击"添加词典"完成</li>
        </ol>
        <p><strong>提示</strong>：可以访问在线词典制作工具创建专属词典</p>
      `
    },
    {
      id: 'q7',
      category: 'troubleshooting',
      question: '为什么某些网站上插件不工作？',
      answer: `
        <p>可能的原因和解决方案：</p>
        <ul>
          <li><strong>网站限制</strong>：某些网站（如银行、政府网站）出于安全考虑禁用扩展</li>
          <li><strong>动态内容</strong>：单页应用(SPA)需要刷新页面或重新切换高亮</li>
          <li><strong>权限问题</strong>：检查插件是否有访问该网站的权限</li>
          <li><strong>内容类型</strong>：PDF、图片等非文本内容无法高亮</li>
          <li><strong>网站结构</strong>：复杂的网站结构可能影响识别效果</li>
        </ul>
      `
    },
    {
      id: 'q8',
      category: 'troubleshooting',
      question: '高亮显示不准确怎么办？',
      answer: `
        <p>提高准确性的方法：</p>
        <ol>
          <li><strong>更新词典</strong>：使用最新版本的词典文件</li>
          <li><strong>添加专业词典</strong>：针对特定领域添加专业词典</li>
          <li><strong>调整设置</strong>：在设置中优化识别参数</li>
          <li><strong>反馈问题</strong>：向开发团队反馈具体的错误案例</li>
        </ol>
        <p><strong>注意</strong>：词性识别基于统计模型，100%准确率在技术上难以实现</p>
      `
    },
    {
      id: 'q9',
      category: 'troubleshooting',
      question: '插件运行缓慢怎么办？',
      answer: `
        <p>优化性能的方法：</p>
        <ul>
          <li><strong>调整缓存设置</strong>：在存储管理中设置合适的缓存时间</li>
          <li><strong>减少词典数量</strong>：禁用不必要的词典以提高速度</li>
          <li><strong>清理缓存</strong>：定期清理过期缓存数据</li>
          <li><strong>关闭其他扩展</strong>：减少浏览器扩展冲突</li>
          <li><strong>重启浏览器</strong>：释放内存资源</li>
        </ul>
      `
    },
    {
      id: 'q10',
      category: 'privacy',
      question: '插件会收集我的个人信息吗？',
      answer: `
        <p><strong>我们承诺保护您的隐私</strong>：</p>
        <ul>
          <li><strong>不收集个人身份信息</strong>：不获取姓名、邮箱、电话等</li>
          <li><strong>不记录浏览历史</strong>：不追踪您访问的网站</li>
          <li><strong>不存储网页内容</strong>：不保存您阅读的具体内容</li>
          <li><strong>匿名统计</strong>：仅收集匿名的使用统计信息用于改进产品</li>
        </ul>
        <p>详细信息请查看我们的<a href="https://feedback.adhdgofly.online" target="_blank">隐私政策</a></p>
      `
    },
    {
      id: 'q11',
      category: 'privacy',
      question: '如何关闭数据收集？',
      answer: `
        <ol>
          <li>点击插件图标，选择"设置"选项卡</li>
          <li>找到"隐私设置"部分</li>
          <li>关闭"匿名信息收集"选项</li>
          <li>点击"保存设置"</li>
        </ol>
        <p><strong>注意</strong>：关闭后我们将无法收集使用数据来改进产品，但不影响插件正常使用</p>
      `
    },
    {
      id: 'q12',
      category: 'privacy',
      question: '数据存储在哪里？',
      answer: `
        <p>数据存储说明：</p>
        <ul>
          <li><strong>本地存储</strong>：设置和缓存数据存储在您的浏览器本地</li>
          <li><strong>云端统计</strong>：匿名使用统计通过加密传输到我们的服务器</li>
          <li><strong>数据安全</strong>：所有数据传输使用HTTPS加密</li>
          <li><strong>数据删除</strong>：卸载插件时本地数据会被清除</li>
        </ul>
      `
    }
  ],
  en: [
    {
      id: 'q1',
      category: 'installation',
      question: 'How to install the ADHDGoFly plugin?',
      answer: `
        <p><strong>Chrome Browser</strong>: Visit the Chrome Web Store, search for "ADHDGoFly", and click "Add to Chrome"</p>
        <p><strong>Edge Browser</strong>: Visit the Microsoft Edge Add-ons Store, search for "ADHDGoFly", and click "Get"</p>
        <p><strong>Manual Installation</strong>: Download the plugin zip file, enable "Developer mode" in your browser's extension management page, and select "Load unpacked extension"</p>
      `
    },
    {
      id: 'q2',
      category: 'installation',
      question: 'How to manually install the plugin?',
      answer: `
        <ol>
          <li>Visit <code>https://download.adhdgofly.online</code> to download the zip package for your browser</li>
          <li>Extract the file: Double-click the zip file on Mac for auto-extraction, or right-click and select "Extract" on Windows</li>
          <li>Open browser extension management page: Visit <code>chrome://extensions/</code> for Chrome, or <code>edge://extensions/</code> for Edge</li>
          <li>Enable "Developer mode"</li>
          <li>Click "Load unpacked" or "Load unpacked extension"</li>
          <li>Select the entire extracted folder</li>
        </ol>
      `
    },
    {
      id: 'q3',
      category: 'installation',
      question: 'What to do if the plugin doesn\'t work after installation?',
      answer: `
        <p>Please troubleshoot with the following steps:</p>
        <ol>
          <li><strong>Check plugin status</strong>: Ensure the plugin is enabled and permissions are granted</li>
          <li><strong>Refresh the page</strong>: You need to refresh the webpage after installation</li>
          <li><strong>Check website compatibility</strong>: Some special websites may not be supported</li>
          <li><strong>Clear cache</strong>: Clear browser cache and try again</li>
          <li><strong>Restart browser</strong>: Completely close and reopen the browser</li>
        </ol>
      `
    },
    {
      id: 'q4',
      category: 'usage',
      question: 'How to enable and disable text highlighting?',
      answer: `
        <p>There are multiple ways to control the highlighting feature:</p>
        <ul>
          <li><strong>Plugin icon</strong>: Click the plugin icon in the browser toolbar and use the "Toggle Highlighting" button</li>
          <li><strong>Keyboard shortcut</strong>: Use <code>Ctrl+Shift+H</code> (Windows) or <code>Cmd+Shift+H</code> (Mac) to quickly toggle</li>
          <li><strong>Right-click menu</strong>: Right-click on a webpage and select "ADHDGoFly Toggle Highlighting"</li>
        </ul>
      `
    },
    {
      id: 'q5',
      category: 'usage',
      question: 'How to customize color schemes?',
      answer: `
        <ol>
          <li>Click the plugin icon to open the settings panel</li>
          <li>Select the "Colors" tab</li>
          <li>Choose preset schemes or customize colors:
            <ul>
              <li><strong>Nouns</strong>: Default blue, customizable</li>
              <li><strong>Verbs</strong>: Default green, customizable</li>
              <li><strong>Adjectives</strong>: Default orange, customizable</li>
            </ul>
          </li>
          <li>Click "Apply Scheme" to save settings</li>
        </ol>
      `
    },
    {
      id: 'q6',
      category: 'usage',
      question: 'How to add custom dictionaries?',
      answer: `
        <ol>
          <li>Click the plugin icon and select the "Dictionary" tab</li>
          <li>Click the "+Add" button in the "Custom Dictionaries" section</li>
          <li>Select a dictionary file (.json format)</li>
          <li>Enter the dictionary name and select language</li>
          <li>Optionally specify a domain (e.g., medical, legal, etc.)</li>
          <li>Click "Add Dictionary" to complete</li>
        </ol>
        <p><strong>Tip</strong>: Visit our online dictionary creation tool to create custom dictionaries</p>
      `
    },
    {
      id: 'q7',
      category: 'troubleshooting',
      question: 'Why doesn\'t the plugin work on some websites?',
      answer: `
        <p>Possible reasons and solutions:</p>
        <ul>
          <li><strong>Website restrictions</strong>: Some websites (banks, government sites) disable extensions for security</li>
          <li><strong>Dynamic content</strong>: Single Page Applications (SPAs) may need page refresh or re-toggle highlighting</li>
          <li><strong>Permission issues</strong>: Check if the plugin has permission to access the website</li>
          <li><strong>Content type</strong>: Non-text content like PDFs and images cannot be highlighted</li>
          <li><strong>Website structure</strong>: Complex website structures may affect recognition</li>
        </ul>
      `
    },
    {
      id: 'q8',
      category: 'troubleshooting',
      question: 'What to do if highlighting is inaccurate?',
      answer: `
        <p>Methods to improve accuracy:</p>
        <ol>
          <li><strong>Update dictionaries</strong>: Use the latest version of dictionary files</li>
          <li><strong>Add specialized dictionaries</strong>: Add domain-specific dictionaries for specialized fields</li>
          <li><strong>Adjust settings</strong>: Optimize recognition parameters in settings</li>
          <li><strong>Report issues</strong>: Provide feedback to the development team with specific error cases</li>
        </ol>
        <p><strong>Note</strong>: Part-of-speech recognition is based on statistical models; 100% accuracy is technically challenging</p>
      `
    },
    {
      id: 'q9',
      category: 'troubleshooting',
      question: 'What to do if the plugin runs slowly?',
      answer: `
        <p>Methods to optimize performance:</p>
        <ul>
          <li><strong>Adjust cache settings</strong>: Set appropriate cache duration in storage management</li>
          <li><strong>Reduce dictionary count</strong>: Disable unnecessary dictionaries to improve speed</li>
          <li><strong>Clear cache</strong>: Regularly clean expired cache data</li>
          <li><strong>Close other extensions</strong>: Reduce browser extension conflicts</li>
          <li><strong>Restart browser</strong>: Free up memory resources</li>
        </ul>
      `
    },
    {
      id: 'q10',
      category: 'privacy',
      question: 'Does the plugin collect my personal information?',
      answer: `
        <p><strong>We are committed to protecting your privacy</strong>:</p>
        <ul>
          <li><strong>No personal identification</strong>: We don't collect names, emails, phone numbers, etc.</li>
          <li><strong>No browsing history</strong>: We don't track the websites you visit</li>
          <li><strong>No webpage content</strong>: We don't store the specific content you read</li>
          <li><strong>Anonymous statistics</strong>: We only collect anonymous usage statistics to improve the product</li>
        </ul>
        <p>For detailed information, please see our <a href="https://feedback.adhdgofly.online" target="_blank">Privacy Policy</a></p>
      `
    },
    {
      id: 'q11',
      category: 'privacy',
      question: 'How to disable data collection?',
      answer: `
        <ol>
          <li>Click the plugin icon and select the "Settings" tab</li>
          <li>Find the "Privacy Settings" section</li>
          <li>Turn off "Anonymous Information Collection"</li>
          <li>Click "Save Settings"</li>
        </ol>
        <p><strong>Note</strong>: After disabling, we won't be able to collect usage data to improve the product, but it won't affect normal plugin functionality</p>
      `
    },
    {
      id: 'q12',
      category: 'privacy',
      question: 'Where is the data stored?',
      answer: `
        <p>Data storage explanation:</p>
        <ul>
          <li><strong>Local storage</strong>: Settings and cache data are stored locally in your browser</li>
          <li><strong>Cloud statistics</strong>: Anonymous usage statistics are transmitted to our servers via encryption</li>
          <li><strong>Data security</strong>: All data transmission uses HTTPS encryption</li>
          <li><strong>Data deletion</strong>: Local data is cleared when the plugin is uninstalled</li>
        </ul>
      `
    }
  ]
};

// 导出数据
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FAQ_DATA;
} else {
  window.FAQ_DATA = FAQ_DATA;
}