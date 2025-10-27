// ADHD Text Highlighter - Popup Script
class PopupController {
  constructor() {
    this.currentStatus = null;
    this.currentPage = 'home';
    this.versionInfo = null; // 缓存版本信息
    this.customDictionaries = []; // 自定义词典列表
    this.dictSettings = {
      // 基础词典
      'zh-preset': true,
      'en-preset': true,
      'fr-preset': false,
      'es-preset': false,
      'ru-preset': false,
      'ja-preset': false,
      // 中文专业词典
      'zh-animal-preset': false,
      'zh-finance-preset': false,
      'zh-automotive-preset': false,
      'zh-idiom-preset': false,
      'zh-geography-preset': false,
      'zh-food-preset': false,
      'zh-technology-preset': false,
      'zh-legal-preset': false,
      'zh-history-preset': false,
      'zh-medical-preset': false,
        'zh-literature-preset': false
      };
      
      /**
       * 更新主页词性颜色图例
       * 实时更新主页显示的词性颜色，让用户看到当前真正使用的颜色方案
       * @param {Object} colors - 颜色配置对象，包含noun、verb、adj属性
       */
      this.updateHomeLegendColors = function(colors) {
        // 更新名词颜色
        const nounLegend = document.querySelector('.legend-noun');
        if (nounLegend) {
          nounLegend.style.backgroundColor = this.hexToRgba(colors.noun, 0.3);
        }
        
        // 更新动词颜色
        const verbLegend = document.querySelector('.legend-verb');
        if (verbLegend) {
          verbLegend.style.backgroundColor = this.hexToRgba(colors.verb, 0.3);
        }
        
        // 更新形容词颜色
        const adjLegend = document.querySelector('.legend-adj');
        if (adjLegend) {
          adjLegend.style.backgroundColor = this.hexToRgba(colors.adj, 0.3);
        }
      };

      /**
       * 将十六进制颜色转换为RGBA格式
       * @param {string} hex - 十六进制颜色值
       * @param {number} alpha - 透明度值 (0-1)
       * @returns {string} RGBA颜色字符串
       */
      this.hexToRgba = function(hex, alpha) {
        // 移除#号
        hex = hex.replace('#', '');
        
        // 解析RGB值
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };
    this.colorSchemes = {
      default: {
        noun: '#0066cc',    // 蓝色
        verb: '#cc0000',    // 红色
        adj: '#009933'      // 绿色
      },
      warm: {
        noun: '#8b4513',    // 深棕色 (saddle brown)
        verb: '#dc143c',    // 深红色 (crimson)
        adj: '#ff8c00'      // 深橙色 (dark orange)
      },
      cool: {
        noun: '#191970',    // 深蓝色 (midnight blue)
        verb: '#008b8b',    // 深青色 (dark cyan)
        adj: '#4169E1'      // 皇家蓝 (royal blue)
      },
      pastel: {
        noun: '#da70d6',    // 兰花紫 (orchid)
        verb: '#20b2aa',    // 浅海绿 (light sea green)
        adj: '#f0e68c'      // 卡其色 (khaki)
      },
      'high-contrast': {
        noun: '#000080',    // 深蓝 (navy)
        verb: '#8b0000',    // 深红 (dark red)
        adj: '#228b22'      // 森林绿 (forest green)
      }
    };
    this.currentColorScheme = 'default';
    this.textSettings = {
      fontSize: 115,        // 字号百分比 - 默认增大15%
      letterSpacing: 0,     // 字间距 px
      lineHeight: 1.5,      // 行间距倍数
      paragraphSpacing: 0   // 段间距 px
    };
    this.highlightingToggles = {
      noun: true,           // 名词高亮开关
      verb: true,           // 动词高亮开关
      adj: true,            // 形容词高亮开关
      comparative: true     // 比较级/最高级高亮开关
    };

    // 词典meta信息
    this.dictMeta = {
      'zh-preset': {
        description: {
          zh: '基于Jieba中文分词词典，包含常用词汇的词性标注',
          en: 'Based on Jieba Chinese word segmentation dictionary with POS tagging'
        },
        source: 'Jieba分词项目',
        license: 'MIT License'
      },
      'en-preset': {
        description: {
          zh: '基于WordNet英语词典，提供准确的词性分类和语义关系',
          en: 'Based on WordNet English dictionary with accurate POS classification'
        },
        source: 'Princeton University WordNet',
        license: 'WordNet License'
      },
      'fr-preset': {
        description: {
          zh: '基于Morphalou法语词典，包含基础词汇的词性信息',
          en: 'Based on Morphalou French dictionary with basic POS information'
        },
        source: 'Morphalou项目',
        license: 'LGPL-LR License '
      },
      'es-preset': {
        description: {
          zh: '基于Apertium西班牙语词典，支持常用词汇识别',
          en: 'Based on Apertium Spanish dictionary for common vocabulary'
        },
        source: 'Apertium项目',
        license: 'GPL v2+ License'
      },
      'ru-preset': {
        description: {
          zh: '基于OpenCorpora俄语词典，提供基本的词性标注功能',
          en: 'Based on OpenCorpora Russian dictionary with basic POS tagging'
        },
        source: 'OpenCorpora项目',
        license: 'Creative Commons BY-SA'
      },
      'ja-preset': {
        description: {
          zh: '基于JMdict日语词典，包含假名和汉字的词性信息',
          en: 'Based on JMdict Japanese dictionary with kana and kanji POS info'
        },
        source: 'JMdict项目',
        license: 'Creative Commons BY-SA'
      },
      'zh-animal-preset': {
        description: {
          zh: '包含动物名称、生物学术语等相关词汇的专业词典',
          en: 'Professional dictionary containing animal names and biological terms'
        },
        source: 'THUOCL (清华大学开放中文词库)',
        license: 'MIT License'
      },
      'zh-finance-preset': {
        description: {
          zh: '涵盖金融、经济、投资等领域的专业术语词典',
          en: 'Professional dictionary covering finance, economics, and investment terms'
        },
        source: 'THUOCL (清华大学开放中文词库)',
        license: 'MIT License'
      },
      'zh-automotive-preset': {
        description: {
          zh: '汽车工业相关术语和品牌名称的专业词典',
          en: 'Professional dictionary for automotive industry terms and brand names'
        },
        source: 'THUOCL (清华大学开放中文词库)',
        license: 'MIT License'
      },
      'zh-idiom-preset': {
        description: {
          zh: '中文成语、俗语和固定搭配的专业词典',
          en: 'Professional dictionary of Chinese idioms, proverbs, and fixed expressions'
        },
        source: 'THUOCL (清华大学开放中文词库)',
        license: 'MIT License'
      },
      'zh-geography-preset': {
        description: {
          zh: '地名、地理术语和行政区划的专业词典',
          en: 'Professional dictionary of place names, geographical terms, and administrative divisions'
        },
        source: 'THUOCL (清华大学开放中文词库)',
        license: 'MIT License'
      },
      'zh-food-preset': {
        description: {
          zh: '食物名称、烹饪术语和餐饮相关词汇的专业词典',
          en: 'Professional dictionary of food names, culinary terms, and dining vocabulary'
        },
        source: 'THUOCL (清华大学开放中文词库)',
        license: 'MIT License'
      },
      'zh-technology-preset': {
        description: {
          zh: 'IT技术、计算机科学和互联网相关术语的专业词典',
          en: 'Professional dictionary of IT, computer science, and internet-related terms'
        },
        source: 'THUOCL (清华大学开放中文词库)',
        license: 'MIT License'
      },
      'zh-legal-preset': {
        description: {
          zh: '法律条文、司法术语和法学概念的专业词典',
          en: 'Professional dictionary of legal provisions, judicial terms, and legal concepts'
        },
        source: 'THUOCL (清华大学开放中文词库)',
        license: 'MIT License'
      },
      'zh-history-preset': {
        description: {
          zh: '历史人物、朝代名称和历史事件的专业词典',
          en: 'Professional dictionary of historical figures, dynasties, and historical events'
        },
        source: 'THUOCL (清华大学开放中文词库)',
        license: 'MIT License'
      },
      'zh-medical-preset': {
        description: {
          zh: '医学术语、疾病名称和药物相关词汇的专业词典',
          en: 'Professional dictionary of medical terms, disease names, and pharmaceutical vocabulary'
        },
        source: 'THUOCL (清华大学开放中文词库)',
        license: 'MIT License'
      },
      'zh-literature-preset': {
        description: {
          zh: '古典诗词、文学作品和文学术语的专业词典',
          en: 'Professional dictionary of classical poetry, literary works, and literary terms'
        },
        source: 'THUOCL (清华大学开放中文词库)',
        license: 'MIT License'
      }
    };

    this.init();
  }

  async init() {
    console.log('初始化Popup控制器...');
    
    // 设置初始状态文本
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.textContent = window.i18n.t('status.checking');
    }
    
    // 绑定事件
    this.bindEvents();
    
    // 检查状态
    await this.checkStatus();
    
    // 检查版本信息
    await this.checkVersion();
    
    // 加载自定义词典
    await this.loadCustomDictionaries();
    
    // 恢复自制词典折叠状态
    await this.restoreCustomDictState();
    
    // 加载词典设置
    await this.loadDictSettings();
  }

  bindEvents() {
    const toggleBtn = document.getElementById('toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.handleToggle());
    }
    
    // 侧边栏按钮事件
    this.bindSidebarEvents();
    
    // 词典管理事件
    this.bindDictEvents();
    
    // 颜色管理事件
    this.bindColorEvents();
    
    // 文本样式事件
    this.bindTextEvents();
    
    // AI分析事件
    this.bindAIEvents();
    
    // 绑定语言切换事件
    this.bindLanguageEvents();
    
    // 加载设置
    this.loadDictSettings();
    this.loadColorSettings();
    this.loadTextSettings();
    this.loadHighlightingToggles();

  }

  bindSettingsAboutEvents() {
    // 更新日志折叠展开事件
    const changelogHeaders = document.querySelectorAll('.changelog-header');
    changelogHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const toggleId = header.getAttribute('data-toggle');
        const content = document.getElementById(`changelog-${toggleId}`);
        
        if (content) {
          const isExpanded = content.classList.contains('expanded');
          
          if (isExpanded) {
            // 折叠
            content.classList.remove('expanded');
            header.classList.remove('expanded');
          } else {
            // 展开
            content.classList.add('expanded');
            header.classList.add('expanded');
          }
        }
      });
    });

    // 词典来源每个项目的折叠展开事件
    const sourceHeaders = document.querySelectorAll('.source-header');
    sourceHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const toggleId = header.getAttribute('data-toggle');
        const content = document.getElementById(toggleId);
        
        if (content) {
          const isExpanded = content.classList.contains('expanded');
          
          if (isExpanded) {
            // 折叠
            content.classList.remove('expanded');
            header.classList.remove('expanded');
          } else {
            // 展开
            content.classList.add('expanded');
            header.classList.add('expanded');
          }
        }
      });
    });
  }

  bindLanguageEvents() {
    const languageToggle = document.getElementById('languageToggle');
    if (languageToggle) {
      languageToggle.addEventListener('click', () => this.toggleLanguage());
    }
    
    // 监听语言变化事件
    document.addEventListener('languageChanged', (event) => {
      this.updateLanguageUI(event.detail.newLanguage);
      // 重新应用当前状态的翻译
      if (this.currentStatus) {
        this.updateUI(this.currentStatus);
      } else {
          // 如果还在检查状态，更新检查中的文本
          const statusDiv = document.getElementById('status');
          if (statusDiv && (statusDiv.textContent.includes('Checking') || statusDiv.textContent.includes('检查中'))) {
            statusDiv.textContent = this.i18nManager.t('status.checking');
          }
        }
      // 重新应用版本信息的翻译
      if (this.versionInfo) {
        this.updateVersionUI();
      }
      
      // 如果当前显示的是AI分析页面，重新加载数据以应用新语言
      const currentPage = document.querySelector('.page.active');
      if (currentPage && currentPage.id === 'aiPage') {
        this.loadAIAnalysis();
      }
      
      // 如果当前显示的是FAQ页面，重新加载FAQ数据以应用新语言
      if (currentPage && currentPage.id === 'faq-page') {
        this.loadFAQData();
      }
    });
  }
  
  async toggleLanguage() {
    const currentLang = window.i18n.getCurrentLanguage();
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    await window.i18n.switchLanguage(newLang);
  }
  
  updateLanguageUI(language) {
    // 更新语言切换按钮的提示
    const languageToggle = document.getElementById('languageToggle');
    if (languageToggle) {
      const title = language === 'zh' ? 'Switch to English' : '切换到中文';
      languageToggle.setAttribute('title', title);
    }
  }

  bindSidebarEvents() {
    const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    
    sidebarBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // 移除所有active状态
        sidebarBtns.forEach(b => b.classList.remove('active'));
        
        // 添加当前按钮的active状态
        btn.classList.add('active');
        
        // 处理不同按钮的点击
        const btnId = btn.id;
        this.handleSidebarClick(btnId);
      });
    });
  }

  handleSidebarClick(btnId) {
    switch(btnId) {
      case 'home-btn':
        this.showPage('home');
        break;
      case 'dict-btn':
        this.showPage('dict');
        break;
      case 'colors-btn':
        this.showPage('colors');
        break;
      case 'text-btn':
        this.showPage('text');
        break;
      case 'ai-btn':
        this.showPage('ai');
        this.loadAIAnalysis();
        break;
      case 'faq-btn':
        this.showPage('faq');
        break;

      case 'settings-btn':
        this.showPage('settings');
        // 初始化设置页面
        if (typeof initSettings === 'function') {
          initSettings();
        }
        // 绑定设置页面中关于部分的事件
        this.bindSettingsAboutEvents();
        break;
    }
  }

  showPage(pageId) {
    // 隐藏所有页面
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    // 显示目标页面
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
      targetPage.classList.add('active');
      this.currentPage = pageId;
      
      // 如果是词典页面，初始化语言分组监听器
      if (pageId === 'dict') {
        console.log('Switching to dict page, initializing language group listeners...');
        setTimeout(() => {
          if (typeof initLanguageGroupListeners === 'function') {
            initLanguageGroupListeners();
          } else if (window.initLanguageGroupListeners) {
            window.initLanguageGroupListeners();
          }
          // 重新绑定tooltip事件
          this.bindDictTooltipEvents();
        }, 50);
      }
      
      // 如果是FAQ页面，初始化FAQ功能
      if (pageId === 'faq') {
        this.initFAQ();
      }
    }
  }

  bindDictEvents() {
    // 词典复选框事件
    const dictCheckboxes = document.querySelectorAll('[id^="dict-"]');
    dictCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const dictId = e.target.id.replace('dict-', '');
        this.dictSettings[dictId] = e.target.checked;
        console.log(`${dictId}词典:`, e.target.checked ? '启用' : '禁用');
        
        // 立即更新主页词典标签显示
        this.updateDictTags();
      });
    });
    
    // 保存按钮事件
    const saveDictBtn = document.getElementById('save-dict-btn');
    if (saveDictBtn) {
      saveDictBtn.addEventListener('click', () => this.saveDictSettings());
    }

    // 词典tooltip事件
    this.bindDictTooltipEvents();
    
    // 自定义词典管理事件
    this.bindCustomDictEvents();
  }

  bindCustomDictEvents() {
    // 折叠/展开功能
    const customDictHeader = document.getElementById('custom-dict-header');
    if (customDictHeader) {
      customDictHeader.addEventListener('click', (e) => {
        // 如果点击的是按钮，不触发折叠
        if (e.target.closest('.add-dict-btn')) {
          return;
        }
        this.toggleCustomDictSection();
      });
    }

    // 添加词典按钮事件
    const addDictBtn = document.getElementById('add-custom-dict-btn');
    if (addDictBtn) {
      addDictBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        this.showAddDictForm();
      });
    }

    // 取消添加按钮事件
    const cancelBtn = document.getElementById('cancel-add-dict');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideAddDictForm());
    }

    // 确认添加按钮事件
    const confirmBtn = document.getElementById('confirm-add-dict');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.addCustomDict());
    }

    // 文件选择事件
    const fileInput = document.getElementById('dict-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }
  }

  toggleCustomDictSection() {
    const section = document.getElementById('custom-dict-section');
    if (section) {
      section.classList.toggle('expanded');
      
      // 保存折叠状态
      const isExpanded = section.classList.contains('expanded');
      chrome.storage.local.set({ customDictExpanded: isExpanded });
    }
  }

  async restoreCustomDictState() {
    try {
      const result = await chrome.storage.local.get(['customDictExpanded']);
      const section = document.getElementById('custom-dict-section');
      
      if (section) {
        // 默认展开，除非明确设置为折叠
        const shouldExpand = result.customDictExpanded !== false;
        if (shouldExpand) {
          section.classList.add('expanded');
        }
      }
    } catch (error) {
      console.error('恢复自制词典状态失败:', error);
    }
  }

  showAddDictForm() {
    const form = document.getElementById('add-dict-form');
    if (form) {
      form.style.display = 'block';
    }
  }

  hideAddDictForm() {
    const form = document.getElementById('add-dict-form');
    if (form) {
      form.style.display = 'none';
      // 清空表单
      document.getElementById('dict-file-input').value = '';
      document.getElementById('dict-name-input').value = '';
      document.getElementById('dict-language-select').value = 'zh';
      document.getElementById('dict-domain-input').value = '';
    }
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      // 自动填充词典名称（去掉.json后缀）
      const nameInput = document.getElementById('dict-name-input');
      if (nameInput && !nameInput.value) {
        nameInput.value = file.name.replace('.json', '');
      }
    }
  }

  async addCustomDict() {
    const fileInput = document.getElementById('dict-file-input');
    const nameInput = document.getElementById('dict-name-input');
    const languageSelect = document.getElementById('dict-language-select');
    const domainInput = document.getElementById('dict-domain-input');

    if (!fileInput.files[0]) {
      this.showError('请选择词典文件');
      return;
    }

    if (!nameInput.value.trim()) {
      this.showError('请输入词典名称');
      return;
    }

    try {
      const file = fileInput.files[0];
      const fileContent = await this.readFileAsText(file);
      
      // 验证JSON格式
      let dictData;
      try {
        dictData = JSON.parse(fileContent);
      } catch (error) {
        this.showError('词典文件格式错误，请确保是有效的JSON文件');
        return;
      }

      // 生成唯一ID
      const dictId = `custom-${Date.now()}`;
      const language = languageSelect.value;
      const domain = domainInput.value.trim() || 'general';

      // 创建词典条目
      const dictEntry = {
        id: dictId,
        name: nameInput.value.trim(),
        displayName: nameInput.value.trim(),
        language: language,
        type: 'local',
        source: 'external',  // 标记为外部词典
        domain: domain,
        filePath: `dictionaries/${language.toUpperCase()}/${dictId}.json`,
        enabled: true,
        priority: 1,
        data: dictData
      };

      // 添加到自定义词典列表
      this.customDictionaries.push(dictEntry);

      // 更新注册表
      await this.updateDictionaryRegistry(dictEntry);

      // 更新UI
      this.updateCustomDictList();
      this.hideAddDictForm();

      // 显示简单通知
      this.showSimpleNotification();

    } catch (error) {
      console.error('添加词典失败:', error);
      this.showError(window.i18n.t('pages.dict.custom.messages.addError'));
    }
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  async updateDictionaryRegistry(dictEntry) {
    try {
      // 首先尝试从Chrome存储获取现有的自定义注册表
      const storageResult = await chrome.storage.local.get(['customDictRegistry']);
      let registry;
      
      if (storageResult.customDictRegistry) {
        // 如果存在自定义注册表，使用它
        registry = storageResult.customDictRegistry;
        console.log('使用现有的自定义注册表，包含', registry.local ? registry.local.length : 0, '个词典');
      } else {
        // 如果不存在，从原始文件加载
        const response = await fetch(chrome.runtime.getURL('dictionaries/dictionary-registry.json'));
        registry = await response.json();
        console.log('从原始文件加载注册表');
      }

      // 添加到local数组
      if (!registry.local) {
        registry.local = [];
      }
      
      // 检查是否已存在相同ID的词典，避免重复添加
      const existingIndex = registry.local.findIndex(dict => dict.id === dictEntry.id);
      if (existingIndex >= 0) {
        // 更新现有词典
        registry.local[existingIndex] = {
          id: dictEntry.id,
          name: dictEntry.name,
          displayName: dictEntry.displayName,
          language: dictEntry.language,
          type: dictEntry.type,
          source: dictEntry.source,  // 保存source标记
          domain: dictEntry.domain,
          filePath: dictEntry.filePath,
          enabled: dictEntry.enabled,
          priority: dictEntry.priority
        };
        console.log('更新现有词典:', dictEntry.displayName);
      } else {
        // 添加新词典
        registry.local.push({
          id: dictEntry.id,
          name: dictEntry.name,
          displayName: dictEntry.displayName,
          language: dictEntry.language,
          type: dictEntry.type,
          source: dictEntry.source,  // 保存source标记
          domain: dictEntry.domain,
          filePath: dictEntry.filePath,
          enabled: dictEntry.enabled,
          priority: dictEntry.priority
        });
        console.log('添加新词典:', dictEntry.displayName);
      }

      // 保存到storage（因为无法直接修改扩展文件）
      await chrome.storage.local.set({
        customDictRegistry: registry,
        [`dictionary_${dictEntry.id}`]: dictEntry.data  // 使用统一的存储键名格式：dictionary_${id}
      });

      console.log('词典注册表已更新，当前包含', registry.local.length, '个自定义词典');
    } catch (error) {
      console.error('更新注册表失败:', error);
      this.showError(`更新词典注册表失败: ${error.message}`);
      throw error;
    }
  }

  async loadCustomDictionaries() {
    try {
      // 首先尝试从Chrome存储获取自定义注册表
      const storageResult = await chrome.storage.local.get(['customDictRegistry']);
      let customDictionaries = [];
      
      if (storageResult.customDictRegistry && storageResult.customDictRegistry.local) {
        customDictionaries = storageResult.customDictRegistry.local;
        console.log('从Chrome存储加载自定义词典，找到', customDictionaries.length, '个词典');
      } else {
        // 如果Chrome存储中没有，尝试从原始注册表文件加载
        const response = await fetch(chrome.runtime.getURL('dictionaries/dictionary-registry.json'));
        const registry = await response.json();
        if (registry.local && registry.local.length > 0) {
          customDictionaries = registry.local;
          console.log('从原始注册表文件加载自定义词典，找到', customDictionaries.length, '个词典');
        }
      }
      
      if (customDictionaries.length > 0) {
        this.customDictionaries = customDictionaries;
        this.updateCustomDictList();
        this.addCustomDictsToUI(); // 添加到词典管理界面
        
        // 确保设置中包含这些词典，并清理旧的ID
        let settingsChanged = false;
        
        // 清理所有旧的custom-开头的设置
        const oldCustomIds = Object.keys(this.dictSettings).filter(key => key.startsWith('custom-'));
        for (const oldId of oldCustomIds) {
          // 检查这个ID是否还在当前的词典列表中
          const stillExists = this.customDictionaries.find(dict => dict.id === oldId);
          if (!stillExists) {
            delete this.dictSettings[oldId];
            settingsChanged = true;
            console.log(`🧹 清理旧的词典设置ID: ${oldId}`);
          }
        }
        
        // 添加当前词典的正确设置
        for (const dict of this.customDictionaries) {
          if (this.dictSettings[dict.id] === undefined) {
            this.dictSettings[dict.id] = dict.enabled || true;
            settingsChanged = true;
            console.log(`✅ 添加词典设置: ${dict.id} = ${dict.enabled || true}`);
          }
        }
        
        // 如果设置有变化，保存更新的设置
        if (settingsChanged) {
          console.log('🔄 词典设置已更新，正在保存...');
          await this.saveDictSettings();
        }
      } else {
        console.log('没有找到自定义词典');
        this.customDictionaries = [];
      }
    } catch (error) {
      console.error('加载自定义词典失败:', error);
      this.showError(`加载自定义词典失败: ${error.message}`);
      this.customDictionaries = [];
    }
  }

  addCustomDictsToUI() {
    // 为每种语言添加自定义词典到词典管理界面
    const languageGroups = ['zh', 'en', 'fr', 'es', 'ru', 'ja'];
    
    languageGroups.forEach(lang => {
      const customDicts = this.customDictionaries.filter(dict => dict.language === lang);
      if (customDicts.length > 0) {
        this.addCustomDictsToLanguageGroup(lang, customDicts);
      }
    });
  }

  /**
   * 将自定义词典添加到指定语言组
   * @param {string} language - 语言代码
   * @param {Array} customDicts - 该语言的自定义词典列表
   */
  addCustomDictsToLanguageGroup(language, customDicts) {
    const languageGroup = document.querySelector(`[data-language="${language}"]`);
    if (!languageGroup) return;

    const professionalDicts = languageGroup.querySelector('.professional-dicts-grid');
    if (!professionalDicts) return;

    // 移除之前添加的自定义词典（避免重复）
    const existingCustomDicts = professionalDicts.querySelectorAll('.custom-dict-item');
    existingCustomDicts.forEach(item => item.remove());

    let settingsChanged = false;

    // 添加自定义词典
    customDicts.forEach(dict => {
      const dictItem = document.createElement('div');
      dictItem.className = 'dict-item custom-dict-item';
      dictItem.innerHTML = `
        <label class="dict-label">
          <input type="checkbox" id="dict-${dict.id}" ${dict.enabled ? 'checked' : ''} />
          <span class="checkmark"></span>
          <div class="dict-info-text">
            <span class="dict-name">${dict.displayName}</span>
            <span class="dict-desc">${dict.domain} (自定义)</span>
          </div>
        </label>
      `;
      
      professionalDicts.appendChild(dictItem);
      
      // 绑定事件
      const checkbox = dictItem.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', async (e) => {
        this.dictSettings[dict.id] = e.target.checked;
        console.log(`${dict.displayName}词典:`, e.target.checked ? '启用' : '禁用');
        
        // 立即保存设置
        await this.saveDictSettings();
      });
      
      // 添加到dictSettings，如果设置发生变化则标记需要保存
      if (this.dictSettings[dict.id] === undefined) {
        this.dictSettings[dict.id] = dict.enabled;
        settingsChanged = true;
        console.log(`🔧 Added custom dictionary to settings: ${dict.id} = ${dict.enabled}`);
      }
    });

    // 如果有新的自定义词典设置，立即保存
    if (settingsChanged) {
      console.log('🔧 Saving updated dictionary settings with custom dictionaries...');
      this.saveDictSettings();
    }
  }

  updateCustomDictList() {
    const listContainer = document.getElementById('custom-dict-list');
    const countElement = document.getElementById('custom-dict-count');
    
    if (!listContainer) return;

    // 更新计数显示
    if (countElement) {
      countElement.textContent = `(${this.customDictionaries.length})`;
    }

    if (this.customDictionaries.length === 0) {
      listContainer.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">暂无自制词典</p>';
      return;
    }

    // 清空容器
    listContainer.innerHTML = '';

    // 为每个词典创建元素并绑定事件
    this.customDictionaries.forEach(dict => {
      const dictItem = document.createElement('div');
      dictItem.className = 'custom-dict-item';
      dictItem.innerHTML = `
        <div class="custom-dict-info">
          <div class="custom-dict-name">${dict.displayName}</div>
          <div class="custom-dict-meta">${dict.language.toUpperCase()} • ${dict.domain}</div>
        </div>
        <div class="custom-dict-actions">
          <button class="remove-dict-btn" data-i18n="pages.dict.custom.delete">
            删除
          </button>
        </div>
      `;
      
      // 绑定删除按钮事件
      const removeBtn = dictItem.querySelector('.remove-dict-btn');
      removeBtn.addEventListener('click', () => this.removeCustomDict(dict.id));
      
      listContainer.appendChild(dictItem);
    });

    // 应用国际化到新创建的元素
    if (window.i18n) {
      window.i18n.applyTranslations();
    }
  }

  async removeCustomDict(dictId) {
    if (!confirm(window.i18n.t('pages.dict.custom.messages.deleteConfirm'))) {
      return;
    }

    try {
      // 从列表中移除
      this.customDictionaries = this.customDictionaries.filter(dict => dict.id !== dictId);

      // 更新注册表
      const result = await chrome.storage.local.get(['customDictRegistry']);
      if (result.customDictRegistry) {
        const registry = result.customDictRegistry;
        if (registry.local) {
          registry.local = registry.local.filter(dict => dict.id !== dictId);
        }
        
        // 保存更新后的注册表
        await chrome.storage.local.set({ customDictRegistry: registry });
        
        // 删除词典数据（使用统一的存储键名格式：dictionary_${id}）
        await chrome.storage.local.remove([`dictionary_${dictId}`]);
      }

      // 更新UI
      this.updateCustomDictList();
      
      this.showSuccess(window.i18n.t('pages.dict.custom.messages.deleteSuccess'));
    } catch (error) {
      console.error('删除词典失败:', error);
      this.showError(window.i18n.t('pages.dict.custom.messages.deleteError'));
    }
  }

  /**
   * 绑定词典提示框事件
   * 处理鼠标悬停显示词典详细信息的功能
   */
  bindDictTooltipEvents() {
    // 为所有词典项添加鼠标悬停事件
    const dictItems = document.querySelectorAll('.dict-item');
    const tooltip = document.getElementById('dict-tooltip');
    
    if (!tooltip) return;

    dictItems.forEach(item => {
      const checkbox = item.querySelector('input[type="checkbox"]');
      if (!checkbox) return;

      const dictId = checkbox.id.replace('dict-', '');
      const meta = this.dictMeta[dictId];
      
      if (!meta) return;

      item.addEventListener('mouseenter', (e) => {
        this.showDictTooltip(e.target, dictId, meta);
      });

      item.addEventListener('mouseleave', () => {
        this.hideDictTooltip();
      });
    });
  }

  /**
   * 显示词典提示框
   * 在指定元素旁边显示词典的详细信息
   * @param {HTMLElement} element - 触发提示框的元素
   * @param {string} dictId - 词典ID
   * @param {Object} meta - 词典元数据
   */
  showDictTooltip(element, dictId, meta) {
    const tooltip = document.getElementById('dict-tooltip');
    const titleEl = document.getElementById('tooltip-title');
    const descEl = document.getElementById('tooltip-description');
    const sourceEl = document.getElementById('tooltip-source');
    
    if (!tooltip || !titleEl || !descEl || !sourceEl) return;

    // 获取当前语言
    const currentLang = window.i18n ? window.i18n.getCurrentLanguage() : 'zh';
    
    // 设置tooltip内容
    const dictName = this.getDictDisplayName(dictId);
    titleEl.textContent = dictName;
    descEl.textContent = meta.description[currentLang] || meta.description.zh;
    
    // 根据当前语言设置来源标签
    const sourceLabel = currentLang === 'en' ? 'Source' : '来源';
    const licenseLabel = currentLang === 'en' ? 'License' : '许可';
    sourceEl.innerHTML = `<strong>${sourceLabel}:</strong> ${meta.source}<br><strong>${licenseLabel}:</strong> ${meta.license}`;

    // 计算tooltip位置
    const rect = element.getBoundingClientRect();
    const popupRect = document.body.getBoundingClientRect();
    
    // 设置位置（在元素下方，相对于popup窗口）
    const left = Math.max(10, rect.left - popupRect.left - 20);
    const top = rect.bottom - popupRect.top + 8;
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    
    // 显示tooltip
    tooltip.classList.add('show');
  }

  /**
   * 隐藏词典提示框
   * 移除当前显示的提示框
   */
  hideDictTooltip() {
    const tooltip = document.getElementById('dict-tooltip');
    if (tooltip) {
      tooltip.classList.remove('show');
    }
  }

  /**
   * 获取词典显示名称
   * 根据词典ID获取对应的显示名称
   * @param {string} dictId - 词典ID
   * @returns {string} 词典的显示名称
   */
  getDictDisplayName(dictId) {
    // 词典显示名称映射
    const dictNames = {
      'zh-preset': 'ZH - 中文词典',
      'en-preset': 'EN - 英文词典',
      'fr-preset': 'FR - 法语词典',
      'es-preset': 'ES - 西班牙语词典',
      'ru-preset': 'RU - 俄语词典',
      'ja-preset': 'JA - 日语词典',
      'zh-animal-preset': '动物词典',
      'zh-finance-preset': '财经词典',
      'zh-automotive-preset': '汽车词典',
      'zh-idiom-preset': '成语词典',
      'zh-geography-preset': '地名词典',
      'zh-food-preset': '食物词典',
      'zh-technology-preset': 'IT词典',
      'zh-legal-preset': '法律词典',
      'zh-history-preset': '历史词典',
      'zh-medical-preset': '医学词典',
      'zh-literature-preset': '诗词词典'
    };
    
    return dictNames[dictId] || dictId;
  }

  /**
   * 加载词典设置
   * 从Chrome存储中加载词典设置并更新UI
   */
  async loadDictSettings() {
    try {
      const result = await chrome.storage.local.get(['dictSettings']);
      if (result.dictSettings) {
        // 清理无效的imported_前缀词典ID
        const cleanedSettings = {};
        Object.keys(result.dictSettings).forEach(dictId => {
          // 跳过imported_前缀的无效ID
          if (!dictId.startsWith('imported_')) {
            cleanedSettings[dictId] = result.dictSettings[dictId];
          }
        });
        
        this.dictSettings = { ...this.dictSettings, ...cleanedSettings };
        
        // 如果清理了设置，保存更新后的设置
        if (Object.keys(cleanedSettings).length !== Object.keys(result.dictSettings).length) {
          console.log('清理了无效的词典设置ID');
          await chrome.storage.local.set({ dictSettings: this.dictSettings });
        }
      }
      
      // 更新UI
      this.updateDictUI();
    } catch (error) {
      console.error('加载词典设置失败:', error);
    }
  }

  /**
   * 更新词典UI
   * 根据词典设置更新复选框状态和首页标签显示
   */
  updateDictUI() {
    Object.keys(this.dictSettings).forEach(dictId => {
      const checkbox = document.getElementById(`dict-${dictId}`);
      if (checkbox) {
        checkbox.checked = this.dictSettings[dictId];
      }
    });
    
    // 更新首页词典标签显示
    this.updateDictTags();
  }
  
  /**
   * 更新词典标签
   * 在首页显示当前启用的词典标签
   */
  updateDictTags() {
    const dictTagsContainer = document.getElementById('dictTags');
    if (!dictTagsContainer) return;
    
    // 清空现有标签
    dictTagsContainer.innerHTML = '';
    
    // 词典名称映射
    const dictNames = {
      'zh-preset': 'ZH',
      'en-preset': 'EN',
      'fr-preset': 'FR',
      'ru-preset': 'RU',
      'es-preset': 'ES',
      'ja-preset': 'JA',
      'zh-animal-preset': '动物',
      'zh-finance-preset': '财经',
      'zh-automotive-preset': '汽车',
      'zh-idiom-preset': '成语',
      'zh-geography-preset': '地名',
      'zh-food-preset': '食物',
      'zh-technology-preset': 'IT',
      'zh-legal-preset': '法律',
      'zh-history-preset': '历史',
      'zh-medical-preset': '医学',
      'zh-literature-preset': '诗词'
    };
    
    // 根据词典界面的实际复选框状态添加标签
    Object.keys(this.dictSettings).forEach(dictId => {
      if (this.dictSettings[dictId]) {
        let displayName = null;
        
        // 首先检查是否是预设词典
        if (dictNames[dictId]) {
          displayName = dictNames[dictId];
        } else if (this.customDictionaries) {
          // 如果不是预设词典，从customDictionaries中获取名称
          const customDict = this.customDictionaries.find(dict => dict.id === dictId);
          if (customDict) {
            // 优先使用displayName，然后是name字段
            if (customDict.displayName) {
              // 如果displayName是对象，优先使用中文名称
              if (typeof customDict.displayName === 'object') {
                displayName = customDict.displayName.zh || customDict.displayName.en || customDict.name;
              } else {
                displayName = customDict.displayName;
              }
            } else {
              displayName = customDict.name;
            }
          }
        }
        
        // 如果找到了显示名称，创建标签
        if (displayName) {
          const tag = document.createElement('div');
          tag.className = 'dict-tag';
          tag.textContent = displayName;
          dictTagsContainer.appendChild(tag);
        }
      }
    });
  }

  /**
   * 保存词典设置
   * 将当前词典设置保存到Chrome存储并通知content script
   */
  async saveDictSettings() {
    try {
      await chrome.storage.local.set({ dictSettings: this.dictSettings });
      
      // 通知content script更新词典设置
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          await chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateDictSettings',
            settings: this.dictSettings
          });
        }
      } catch (error) {
        console.warn('通知content script失败:', error);
      }
      
      // 显示保存成功提示
      const saveBtn = document.getElementById('save-dict-btn');
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '已保存';
      saveBtn.style.backgroundColor = '#28a745';
      
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.backgroundColor = '';
      }, 1500);
      
      console.log('词典设置已保存:', this.dictSettings);
      
    } catch (error) {
      console.error('保存词典设置失败:', error);
      this.showError(`保存词典设置失败: ${error.message}`);
    }
  }

  /**
   * 检查插件状态
   * 获取当前标签页的插件状态并更新UI
   */
  async checkStatus() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        this.updateUI({ enabled: false, error: window.i18n.t('errors.noTab') });
        return;
      }

      const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' });
      
      if (response && response.success) {
        this.currentStatus = response;
        this.updateUI(response);
      } else {
        this.updateUI({ enabled: false, error: window.i18n.t('errors.notLoaded') });
      }
    } catch (error) {
      console.error('检查状态失败:', error);
      this.updateUI({ enabled: false, error: window.i18n.t('errors.connectionFailed') });
    }
  }

  /**
   * 处理开关切换
   * 切换插件的启用/禁用状态
   */
  async handleToggle() {
    const toggleBtn = document.getElementById('toggle');
    const statusDiv = document.getElementById('status');
    
    // 显示加载状态
    toggleBtn.textContent = window.i18n.t('status.processing');
    toggleBtn.disabled = true;
    statusDiv.textContent = window.i18n.t('status.switching');
    statusDiv.className = 'status';
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        throw new Error(window.i18n.t('errors.noTab'));
      }

      const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' });
      
      if (response && response.success) {
        this.currentStatus = { ...this.currentStatus, enabled: response.enabled, statistics: response.stats };
        this.updateUI(this.currentStatus);
      } else {
        throw new Error(response?.error || window.i18n.t('errors.operationFailed'));
      }
    } catch (error) {
      console.error('切换失败:', error);
      this.updateUI({ ...this.currentStatus, error: error.message });
    } finally {
      toggleBtn.disabled = false;
    }
  }

  /**
   * 更新UI状态
   * 根据插件状态更新界面显示
   * @param {Object} status - 插件状态对象
   */
  updateUI(status) {
    const toggleBtn = document.getElementById('toggle');
    const statusDiv = document.getElementById('status');
    
    if (status.error) {
      statusDiv.textContent = status.error;
      statusDiv.className = 'status-badge disabled';
      toggleBtn.textContent = window.i18n.t('buttons.retry');
      toggleBtn.className = 'toggle-btn';
      return;
    }

    const enabled = status.enabled;
    
    // 更新状态显示
    statusDiv.textContent = enabled ? window.i18n.t('status.enabled') : window.i18n.t('status.disabled');
    statusDiv.className = enabled ? 'status enabled' : 'status disabled';
    
    // 更新按钮
    toggleBtn.textContent = enabled ? window.i18n.t('buttons.disable') : window.i18n.t('buttons.enable');
    toggleBtn.className = enabled ? 'toggle-btn disabled' : 'toggle-btn';
    
    // 显示统计信息（如果有）
    if (status.statistics) {
      this.updateStats(status.statistics);
    }
  }

  /**
   * 更新统计信息
   * 显示插件的统计数据
   * @param {Object} stats - 统计数据对象
   */
  updateStats(stats) {
    // 这里可以添加统计信息的显示逻辑
    console.log('统计信息:', stats);
  }

  bindColorEvents() {
    // 颜色方案选择事件
    const schemeItems = document.querySelectorAll('.scheme-item');
    schemeItems.forEach(item => {
      item.addEventListener('click', () => {
        const scheme = item.dataset.scheme;
        this.selectColorScheme(scheme);
      });
    });
    
    // 颜色方案单选框事件
    const schemeRadios = document.querySelectorAll('input[name="colorScheme"]');
    schemeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          const scheme = e.target.id.replace('scheme-', '');
          this.selectColorScheme(scheme);
        }
      });
    });
    
    // 高亮开关按钮事件
    const highlightButtons = document.querySelectorAll('.toggle-button');
    highlightButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.type;
        const isActive = e.currentTarget.classList.contains('active');
        
        // 切换按钮状态
        if (isActive) {
          e.currentTarget.classList.remove('active');
          this.highlightingToggles[type] = false;
        } else {
          e.currentTarget.classList.add('active');
          this.highlightingToggles[type] = true;
        }
        
        console.log(`${type}高亮开关:`, this.highlightingToggles[type]);
        
        // 立即保存设置
        this.saveColorSettings();
      });
    });
    
    // 应用方案按钮事件
    const saveColorsBtn = document.getElementById('save-colors-btn');
    if (saveColorsBtn) {
      saveColorsBtn.addEventListener('click', () => this.saveColorSettings());
    }
  }

  selectColorScheme(scheme) {
    // 更新当前方案
    this.currentColorScheme = scheme;
    
    // 更新UI状态
    const schemeItems = document.querySelectorAll('.scheme-item');
    schemeItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.scheme === scheme) {
        item.classList.add('active');
      }
    });
    
    // 更新单选框
    const radio = document.getElementById(`scheme-${scheme}`);
    if (radio) {
      radio.checked = true;
    }
    
    // 动态更新按钮颜色
    this.updateButtonColors(scheme);
    
    console.log('选择颜色方案:', scheme);
  }
  
  updateButtonColors(scheme) {
    // 定义各个颜色方案的颜色值 - 与HTML中的预览颜色保持一致
    const colorSchemes = {
      default: {
        noun: '#0066cc',
        verb: '#cc0000', 
        adj: '#009933'
      },
      warm: {
        noun: '#8b4513',  // 修正：暖色方案的名词颜色
        verb: '#dc143c',
        adj: '#ff8c00'    // 修正：暖色方案的形容词颜色（橙色）
      },
      cool: {
        noun: '#191970',  // 修正：冷色方案的名词颜色（午夜蓝）
        verb: '#008b8b',  // 修正：冷色方案的动词颜色（深青色）
        adj: '#4169E1'    // 修正：冷色方案的形容词颜色（皇家蓝）
      },
      pastel: {
        noun: '#da70d6',  // 修正：柔和方案的名词颜色（兰花紫）
        verb: '#20b2aa',  // 修正：柔和方案的动词颜色（浅海绿）
        adj: '#f0e68c'    // 修正：柔和方案的形容词颜色（卡其色）
      },
      'high-contrast': {
        noun: '#000080',
        verb: '#8b0000',
        adj: '#228b22'
      }
    };
    
    // 获取当前方案的颜色
    const colors = colorSchemes[scheme] || colorSchemes.default;
    
    // 更新CSS变量
    const root = document.documentElement;
    root.style.setProperty('--noun-color', colors.noun);
    root.style.setProperty('--verb-color', colors.verb);
    root.style.setProperty('--adj-color', colors.adj);
    // 比较级/最高级颜色保持不变
    root.style.setProperty('--comparative-color', '#9966cc');
    
    // 更新主页词性颜色图例
    this.updateHomeLegendColors(colors);
  }

  async loadColorSettings() {
    try {
      const result = await chrome.storage.local.get(['colorScheme']);
      if (result.colorScheme) {
        this.currentColorScheme = result.colorScheme;
      }
      
      // 更新UI
      this.updateColorUI();
    } catch (error) {
      console.error('加载颜色设置失败:', error);
    }
  }

  updateColorUI() {
    this.selectColorScheme(this.currentColorScheme);
    
    // 确保主页图例也反映当前颜色方案
    const colorSchemes = {
      default: {
        noun: '#0066cc',
        verb: '#cc0000', 
        adj: '#009933'
      },
      warm: {
        noun: '#8b4513',
        verb: '#dc143c',
        adj: '#ff8c00'
      },
      cool: {
        noun: '#191970',
        verb: '#008b8b',
        adj: '#4169E1'
      },
      pastel: {
        noun: '#da70d6',
        verb: '#20b2aa',
        adj: '#f0e68c'
      },
      'high-contrast': {
        noun: '#000080',
        verb: '#8b0000',
        adj: '#228b22'
      }
    };
    
    const colors = colorSchemes[this.currentColorScheme] || colorSchemes.default;
    this.updateHomeLegendColors(colors);
  }
  
  async loadHighlightingToggles() {
    try {
      const result = await chrome.storage.local.get(['highlightingToggles']);
      if (result.highlightingToggles) {
        this.highlightingToggles = { ...this.highlightingToggles, ...result.highlightingToggles };
      }
      
      // 更新UI
      this.updateHighlightingTogglesUI();
    } catch (error) {
      console.error('加载高亮开关设置失败:', error);
    }
  }
  
  updateHighlightingTogglesUI() {
    const highlightTypes = ['noun', 'verb', 'adj', 'comparative'];
    highlightTypes.forEach(type => {
      const button = document.getElementById(`highlight-${type}`);
      if (button) {
        if (this.highlightingToggles[type]) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      }
    });
  }

  async saveColorSettings() {
    try {
      // 保存颜色方案和高亮开关设置
      await chrome.storage.local.set({ 
        colorScheme: this.currentColorScheme,
        highlightingToggles: this.highlightingToggles
      });
      
      // 通知content script更新颜色方案和高亮开关
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          await chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateColorScheme',
            scheme: this.currentColorScheme,
            colors: this.colorSchemes[this.currentColorScheme],
            highlightingToggles: this.highlightingToggles
          });
        }
      } catch (error) {
        console.warn('通知content script失败:', error);
      }
      
      // 显示保存成功提示
      const saveBtn = document.getElementById('save-colors-btn');
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '已应用';
      saveBtn.style.backgroundColor = '#28a745';
      
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.backgroundColor = '';
      }, 1500);
      
      console.log('颜色方案已保存:', this.currentColorScheme);
      console.log('高亮开关已保存:', this.highlightingToggles);
      
    } catch (error) {
      console.error('保存颜色设置失败:', error);
    }
  }

  bindTextEvents() {
    // 字号滑块事件
    const fontSizeSlider = document.getElementById('fontSize');
    if (fontSizeSlider) {
      fontSizeSlider.addEventListener('input', (e) => {
        this.textSettings.fontSize = parseInt(e.target.value);
        this.updateTextValue('fontSize', this.textSettings.fontSize + '%');
        this.updateTextPreview();
      });
    }
    
    // 字间距滑块事件
    const letterSpacingSlider = document.getElementById('letterSpacing');
    if (letterSpacingSlider) {
      letterSpacingSlider.addEventListener('input', (e) => {
        this.textSettings.letterSpacing = parseFloat(e.target.value);
        this.updateTextValue('letterSpacing', this.textSettings.letterSpacing + 'px');
        this.updateTextPreview();
      });
    }
    
    // 行间距滑块事件
    const lineHeightSlider = document.getElementById('lineHeight');
    if (lineHeightSlider) {
      lineHeightSlider.addEventListener('input', (e) => {
        this.textSettings.lineHeight = parseFloat(e.target.value);
        this.updateTextValue('lineHeight', this.textSettings.lineHeight);
        this.updateTextPreview();
      });
    }
    
    // 段间距滑块事件
    const paragraphSpacingSlider = document.getElementById('paragraphSpacing');
    if (paragraphSpacingSlider) {
      paragraphSpacingSlider.addEventListener('input', (e) => {
        this.textSettings.paragraphSpacing = parseInt(e.target.value);
        this.updateTextValue('paragraphSpacing', this.textSettings.paragraphSpacing + 'px');
        this.updateTextPreview();
      });
    }
    
    // 应用样式按钮事件
    const saveTextBtn = document.getElementById('save-text-btn');
    if (saveTextBtn) {
      saveTextBtn.addEventListener('click', () => this.saveTextSettings());
    }
    
    // 重置按钮事件
    const resetTextBtn = document.getElementById('reset-text-btn');
    if (resetTextBtn) {
      resetTextBtn.addEventListener('click', () => this.resetTextSettings());
    }
  }

  updateTextValue(settingName, value) {
    const valueElement = document.getElementById(settingName + 'Value');
    if (valueElement) {
      valueElement.textContent = value;
    }
  }

  updateTextPreview() {
    const preview = document.getElementById('textPreview');
    if (preview) {
      preview.style.fontSize = (this.textSettings.fontSize / 100) + 'em';
      preview.style.letterSpacing = this.textSettings.letterSpacing + 'px';
      preview.style.lineHeight = this.textSettings.lineHeight;
      
      // 段间距应用到段落
      const paragraphs = preview.querySelectorAll('p');
      paragraphs.forEach((p, index) => {
        if (index > 0) {
          p.style.marginTop = this.textSettings.paragraphSpacing + 'px';
        }
      });
    }
  }

  async loadTextSettings() {
    try {
      const result = await chrome.storage.local.get(['textSettings']);
      if (result.textSettings) {
        this.textSettings = { ...this.textSettings, ...result.textSettings };
      }
      
      // 更新UI
      this.updateTextUI();
    } catch (error) {
      console.error('加载文本设置失败:', error);
    }
  }

  updateTextUI() {
    // 更新滑块值
    const fontSizeSlider = document.getElementById('fontSize');
    if (fontSizeSlider) {
      fontSizeSlider.value = this.textSettings.fontSize;
      this.updateTextValue('fontSize', this.textSettings.fontSize + '%');
    }
    
    const letterSpacingSlider = document.getElementById('letterSpacing');
    if (letterSpacingSlider) {
      letterSpacingSlider.value = this.textSettings.letterSpacing;
      this.updateTextValue('letterSpacing', this.textSettings.letterSpacing + 'px');
    }
    
    const lineHeightSlider = document.getElementById('lineHeight');
    if (lineHeightSlider) {
      lineHeightSlider.value = this.textSettings.lineHeight;
      this.updateTextValue('lineHeight', this.textSettings.lineHeight);
    }
    
    const paragraphSpacingSlider = document.getElementById('paragraphSpacing');
    if (paragraphSpacingSlider) {
      paragraphSpacingSlider.value = this.textSettings.paragraphSpacing;
      this.updateTextValue('paragraphSpacing', this.textSettings.paragraphSpacing + 'px');
    }
    
    // 更新预览
    this.updateTextPreview();
  }

  async saveTextSettings() {
    try {
      await chrome.storage.local.set({ textSettings: this.textSettings });
      
      // 通知content script更新文本样式
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          await chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateTextSettings',
            settings: this.textSettings
          });
        }
      } catch (error) {
        console.warn('通知content script失败:', error);
      }
      
      // 显示保存成功提示
      const saveBtn = document.getElementById('save-text-btn');
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '已应用';
      saveBtn.style.backgroundColor = '#28a745';
      
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.backgroundColor = '';
      }, 1500);
      
      console.log('文本设置已保存:', this.textSettings);
      
    } catch (error) {
      console.error('保存文本设置失败:', error);
    }
  }

  resetTextSettings() {
    // 重置为默认值
    this.textSettings = {
      fontSize: 115,  // 默认增大15%
      letterSpacing: 0,
      lineHeight: 1.5,
      paragraphSpacing: 0
    };
    
    // 更新UI
    this.updateTextUI();
    
    console.log('文本设置已重置');
  }

  // AI分析相关方法
  bindAIEvents() {
    // 刷新分析按钮事件
    const refreshBtn = document.getElementById('refresh-analysis-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshAIAnalysis());
    }
  }

  async loadAIAnalysis() {
    console.log('开始加载AI分析数据...');
    
    try {
      // 显示加载状态
      this.showAILoadingState();
      
      // 获取当前标签页的分析数据
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        // 向content script请求分析数据
        const response = await chrome.tabs.sendMessage(tabs[0].id, {
          action: 'getAnalysisData'
        });
        
        if (response && response.success) {
          this.displayAIAnalysis(response.data);
        } else {
          this.showAIError();
        }
      } else {
        this.showAIError();
      }
    } catch (error) {
      console.error('加载AI分析数据失败:', error);
      this.showAIError();
    }
  }

  showAILoadingState() {
    // 显示所有分析项为加载中状态
    const loadingText = window.i18n.t('pages.ai.analyzing');
    
    document.getElementById('languageStats').innerHTML = `<div class="loading">${loadingText}</div>`;
    document.getElementById('posStats').innerHTML = `<div class="loading">${loadingText}</div>`;
    document.getElementById('vocabularyStats').innerHTML = `<div class="loading">${loadingText}</div>`;
    
    // 高亮统计UI已隐藏，检查元素是否存在再操作
    const highlightStatsElement = document.getElementById('highlightStats');
    if (highlightStatsElement) {
      highlightStatsElement.innerHTML = `<div class="loading">${loadingText}</div>`;
    }
    
    // document.getElementById('colorRecommendation').innerHTML = `<div class="loading">${loadingText}</div>`; // 推荐功能已禁用
    // document.getElementById('textRecommendation').innerHTML = `<div class="loading">${loadingText}</div>`; // 推荐功能已禁用
  }

  displayAIAnalysis(data) {
    console.log('显示AI分析数据:', data);
    
    // 显示语言分布
    this.displayLanguageStats(data.languages || {});
    
    // 显示词性分布
    this.displayPOSStats(data.partOfSpeech || {});
    
    // 显示高亮统计
    this.displayHighlightStats(data.highlights || {});
    
    // 显示词汇统计
    this.displayVocabularyStats(data.vocabulary || null);
    
    // 显示推荐
    // this.displayRecommendations(data.recommendations || {}); // 暂时禁用推荐功能
  }

  displayLanguageStats(languages) {
    const container = document.getElementById('languageStats');
    if (Object.keys(languages).length === 0) {
      container.innerHTML = `<div class="no-data">${window.i18n.t('pages.ai.noData')}</div>`;
      return;
    }
    
    const total = Object.values(languages).reduce((sum, count) => sum + count, 0);
    let html = '';
    
    Object.entries(languages).forEach(([lang, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      html += `
        <div class="stat-bar">
          <div class="stat-label">${lang.toUpperCase()}</div>
          <div class="stat-progress">
            <div class="stat-fill" style="width: ${percentage}%; background-color: #007AFF;"></div>
          </div>
          <div class="stat-value">${percentage}%</div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }

  displayPOSStats(partOfSpeech) {
    const container = document.getElementById('posStats');
    if (Object.keys(partOfSpeech).length === 0) {
      container.innerHTML = `<div class="no-data">${window.i18n.t('pages.ai.noData')}</div>`;
      return;
    }
    
    const total = Object.values(partOfSpeech).reduce((sum, count) => sum + count, 0);
    const colors = {
      'noun': '#0066cc',
      'verb': '#cc0000',
      'adj': '#009933',
      'other': '#666666'
    };
    
    let html = '';
    
    Object.entries(partOfSpeech).forEach(([pos, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      const color = colors[pos] || colors.other;
      html += `
        <div class="stat-bar">
          <div class="stat-label">${pos}</div>
          <div class="stat-progress">
            <div class="stat-fill" style="width: ${percentage}%; background-color: ${color};"></div>
          </div>
          <div class="stat-value">${percentage}%</div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }

  displayHighlightStats(highlights) {
    // 高亮统计UI已隐藏，但保留逻辑代码以避免调用错误
    const container = document.getElementById('highlightStats');
    if (!container) {
      // UI元素不存在时静默返回，不报错
      return;
    }
    
    if (Object.keys(highlights).length === 0) {
      container.innerHTML = `<div class="no-data">${window.i18n.t('pages.ai.noData')}</div>`;
      return;
    }
    
    let html = `<div class="highlight-summary">`;
    html += `<p>${window.i18n.t('pages.ai.stats.highlight.total')}: <strong>${highlights.total || 0}</strong></p>`;
    html += `<p>${window.i18n.t('pages.ai.stats.highlight.nodes')}: <strong>${highlights.processedNodes || 0}</strong></p>`;
    html += `</div>`;
    
    container.innerHTML = html;
  }

  displayVocabularyStats(vocabulary) {
    const container = document.getElementById('vocabularyStats');
    
    if (!vocabulary || (!vocabulary.nouns.length && !vocabulary.verbs.length && !vocabulary.adjectives.length)) {
      container.innerHTML = `<div class="no-data">${window.i18n.t('pages.ai.noData')}</div>`;
      return;
    }
    
    let html = '<div class="vocabulary-stats">';
    
    // 显示名词
    if (vocabulary.nouns.length > 0) {
      html += this.renderVocabularyCategory('nouns', '📝 名词 (Nouns)', vocabulary.nouns);
    }
    
    // 显示动词
    if (vocabulary.verbs.length > 0) {
      html += this.renderVocabularyCategory('verbs', '🏃 动词 (Verbs)', vocabulary.verbs);
    }
    
    // 显示形容词
    if (vocabulary.adjectives.length > 0) {
      html += this.renderVocabularyCategory('adjectives', '🎨 形容词 (Adjectives)', vocabulary.adjectives);
    }
    
    html += '</div>';
    container.innerHTML = html;
  }

  renderVocabularyCategory(categoryId, title, words) {
    const totalCount = words.length;
    let html = `<div class="vocabulary-category" data-category="${categoryId}">`;
    html += `<h5 class="vocabulary-category-title">${title}</h5>`;
    html += '<div class="vocabulary-list">';
    
    // 显示所有词汇，不进行折叠
    words.forEach((item, index) => {
      html += `<div class="vocabulary-item">
        <span class="vocabulary-rank">${index + 1}.</span>
        <span class="vocabulary-word">${item.word}</span>
        <span class="vocabulary-count">${item.count}</span>
      </div>`;
    });
    
    html += '</div>';
    html += '</div>';
    return html;
  }



  // displayRecommendations方法已删除 - 推荐功能已禁用

  /**
   * 显示AI错误状态
   * 在AI分析页面显示错误信息
   */
  showAIError() {
    const errorText = window.i18n.t('pages.ai.error');
    
    document.getElementById('languageStats').innerHTML = `<div class="error">${errorText}</div>`;
    document.getElementById('posStats').innerHTML = `<div class="error">${errorText}</div>`;
    document.getElementById('vocabularyStats').innerHTML = `<div class="error">${errorText}</div>`;
    
    // 高亮统计UI已隐藏，检查元素是否存在再操作
    const highlightStatsElement = document.getElementById('highlightStats');
    if (highlightStatsElement) {
      highlightStatsElement.innerHTML = `<div class="error">${errorText}</div>`;
    }
    
    // document.getElementById('colorRecommendation').innerHTML = `<div class="error">${errorText}</div>`; // 推荐功能已禁用
    // document.getElementById('textRecommendation').innerHTML = `<div class="error">${errorText}</div>`; // 推荐功能已禁用
  }

  /**
   * 刷新AI分析
   * 重新加载AI分析数据
   */
  async refreshAIAnalysis() {
    console.log('刷新AI分析...');
    await this.loadAIAnalysis();
  }

  /**
   * 检查版本更新
   * 获取当前版本并检查是否有新版本可用
   */
  async checkVersion() {
    try {
      // 获取当前版本
      const manifest = chrome.runtime.getManifest();
      const currentVersion = manifest.version;
      
      // 初始化版本信息对象
      this.versionInfo = {
        currentVersion: currentVersion,
        latestVersion: null,
        isChecking: true,
        hasUpdate: false,
        error: null,
        releaseUrl: null,
        alternativeDownloads: null,
        contactInfo: null
      };
      
      // 更新UI显示
      this.updateVersionUI();
      
      // 发送版本检查请求
      chrome.runtime.sendMessage({ action: 'checkVersion' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('版本检查通信错误:', chrome.runtime.lastError);
          this.versionInfo.isChecking = false;
          this.versionInfo.error = '通信失败';
          this.updateVersionUI();
          return;
        }
        
        if (response && response.success) {
          this.versionInfo.latestVersion = response.latestVersion;
          this.versionInfo.hasUpdate = response.hasUpdate;
          this.versionInfo.releaseUrl = response.releaseUrl;
          this.versionInfo.alternativeDownloads = response.alternativeDownloads;
          this.versionInfo.contactInfo = response.contactInfo;
        } else {
          this.versionInfo.error = response?.error || '检查失败';
        }
        
        this.versionInfo.isChecking = false;
        this.updateVersionUI();
      });
    } catch (error) {
      console.error('版本检查错误:', error);
      this.versionInfo = {
        currentVersion: 'Unknown',
        latestVersion: null,
        isChecking: false,
        hasUpdate: false,
        error: '检查失败',
        releaseUrl: null,
        alternativeDownloads: null,
        contactInfo: null
      };
      this.updateVersionUI();
    }
  }

  // 更新版本UI显示
  /**
   * 更新版本UI
   * 根据版本检查结果更新版本信息显示
   */
  updateVersionUI() {
    if (!this.versionInfo) return;
    
    // 更新当前版本显示
    const currentVersionElement = document.getElementById('currentVersion');
    if (currentVersionElement) {
      currentVersionElement.textContent = this.versionInfo.currentVersion;
    }
    
    // 更新最新版本显示
    const latestVersionElement = document.getElementById('latestVersion');
    if (latestVersionElement) {
      if (this.versionInfo.isChecking) {
        latestVersionElement.textContent = window.i18n.t('version.checking');
      } else if (this.versionInfo.error) {
        latestVersionElement.textContent = window.i18n.t('version.checkFailed');
      } else {
        latestVersionElement.textContent = this.versionInfo.latestVersion;
      }
    }
    
    // 处理更新提示
    const updateNotice = document.getElementById('updateNotice');
    if (updateNotice) {
      if (this.versionInfo.hasUpdate && !this.versionInfo.isChecking) {
        updateNotice.style.display = 'block';
        
        // 设置GitHub链接
        const githubLink = document.getElementById('githubLink');
        if (githubLink && this.versionInfo.releaseUrl) {
          githubLink.href = this.versionInfo.releaseUrl;
        }
        
        // 设置其他下载链接
        if (this.versionInfo.alternativeDownloads) {
          const directLink = document.getElementById('directLink');
          if (directLink && this.versionInfo.alternativeDownloads.direct) {
            directLink.href = this.versionInfo.alternativeDownloads.direct;
          }
        }
      } else {
        updateNotice.style.display = 'none';
      }
    }
  }

  /**
   * 显示简单通知
   */
  showSimpleNotification() {
    const notification = document.getElementById('simple-notification');
    
    // 更新国际化文本
    const line1 = notification.querySelector('[data-i18n="pages.dict.custom.notification.line1"]');
    const line2 = notification.querySelector('[data-i18n="pages.dict.custom.notification.line2"]');
    
    if (line1) line1.textContent = window.i18n.t('pages.dict.custom.notification.line1');
    if (line2) line2.textContent = window.i18n.t('pages.dict.custom.notification.line2');
    
    notification.style.display = 'block';
    
    // 5秒后自动隐藏
    setTimeout(() => {
      notification.style.display = 'none';
    }, 5000);
  }

  // 统一的消息处理方法
  /**
   * 显示成功消息
   * 使用alert显示成功提示（后续可改为更优雅的UI提示）
   * @param {string} message - 要显示的成功消息
   */
  showSuccess(message) {
    // 可以在这里实现统一的成功消息显示逻辑
    // 暂时使用alert，后续可以改为更优雅的UI提示
    alert(message);
  }

  /**
   * 显示错误消息
   * 使用alert显示错误提示（后续可改为更优雅的UI提示）
   * @param {string} message - 要显示的错误消息
   */
  showError(message) {
    // 可以在这里实现统一的错误消息显示逻辑
    // 暂时使用alert，后续可以改为更优雅的UI提示
    alert(message);
  }

  // FAQ相关方法
  initFAQ() {
    this.expandedFAQItems = new Set();
    this.bindFAQEvents();
    this.loadFAQData();
  }

  bindFAQEvents() {
    // 搜索功能
    const searchInput = document.getElementById('faq-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterFAQs(e.target.value.toLowerCase());
      });
    }
  }

  async loadFAQData() {
    try {
      // 获取当前语言设置
      const currentLanguage = window.i18n.getCurrentLanguage();
      
      // 加载对应语言的FAQ数据
      const localeData = await this.loadLocaleData(currentLanguage);
      if (localeData && localeData.pages && localeData.pages.faq && localeData.pages.faq.content) {
        this.renderFAQs(localeData.pages.faq.content);
      }
    } catch (error) {
      console.error('Failed to load FAQ data:', error);
    }
  }

  async loadLocaleData(language) {
    try {
      const response = await fetch(`locales/${language}.json`);
      return await response.json();
    } catch (error) {
      console.error(`Failed to load locale data for ${language}:`, error);
      return null;
    }
  }

  renderFAQs(faqData) {
    const faqList = document.getElementById('faq-list');
    if (!faqList) return;

    faqList.innerHTML = '';

    // 遍历FAQ数据中的所有Q&A对
    const questions = [];
    for (let i = 0; faqData[`q${i}`] && faqData[`a${i}`]; i++) {
      questions.push({
        id: `faq-${i}`,
        question: faqData[`q${i}`],
        answer: faqData[`a${i}`]
      });
    }

    questions.forEach(item => {
      const faqItem = document.createElement('div');
      faqItem.className = 'faq-item';
      faqItem.dataset.id = item.id;

      faqItem.innerHTML = `
        <div class="faq-question">
          <span class="faq-question-text">${item.question}</span>
          <span class="faq-toggle">▼</span>
        </div>
        <div class="faq-answer"></div>
      `;
      
      // 使用textContent来正确处理换行符
      const answerEl = faqItem.querySelector('.faq-answer');
      answerEl.textContent = item.answer;

      // 添加点击事件
      const questionEl = faqItem.querySelector('.faq-question');
      questionEl.addEventListener('click', () => {
        this.toggleFAQItem(item.id, faqItem);
      });

      faqList.appendChild(faqItem);
    });
  }

  toggleFAQItem(itemId, itemElement) {
    if (this.expandedFAQItems.has(itemId)) {
      // 收起
      this.expandedFAQItems.delete(itemId);
      itemElement.classList.remove('expanded');
    } else {
      // 展开
      this.expandedFAQItems.add(itemId);
      itemElement.classList.add('expanded');
    }
  }

  filterFAQs(searchQuery) {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
      const questionText = item.querySelector('.faq-question-text').textContent.toLowerCase();
      const answerText = item.querySelector('.faq-answer').textContent.toLowerCase();
      
      if (questionText.includes(searchQuery) || answerText.includes(searchQuery)) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  }
}

// 全局引用，供HTML onclick使用
let popupController;

// 语言分组折叠展开功能
function toggleLanguageGroup(language) {
  console.log('toggleLanguageGroup called with:', language);
  
  const languageGroup = document.querySelector(`.language-group[data-language="${language}"]`);
  console.log('languageGroup found:', languageGroup);
  
  if (!languageGroup) {
    console.error('Language group not found for:', language);
    return;
  }
  
  const professionalDicts = languageGroup.querySelector('.professional-dicts');
  const expandIcon = languageGroup.querySelector('.expand-icon');
  
  console.log('professionalDicts found:', professionalDicts);
  console.log('expandIcon found:', expandIcon);
  
  if (!professionalDicts) {
    console.error('Professional dicts not found');
    return;
  }
  
  const isExpanded = languageGroup.classList.contains('expanded');
  console.log('isExpanded:', isExpanded);
  
  if (isExpanded) {
    // 收起
    console.log('Collapsing...');
    languageGroup.classList.remove('expanded');
    professionalDicts.style.display = 'none';
    expandIcon.textContent = '▶';
  } else {
    // 展开
    console.log('Expanding...');
    languageGroup.classList.add('expanded');
    professionalDicts.style.display = 'block';
    expandIcon.textContent = '▼';
  }
}

// 确保函数在全局作用域中可用
window.toggleLanguageGroup = toggleLanguageGroup;
window.initLanguageGroupListeners = initLanguageGroupListeners;
window.hasActualProfessionalDicts = hasActualProfessionalDicts;

// 检查语言组是否有实际的专业词典内容
function hasActualProfessionalDicts(languageGroup) {
  const professionalDicts = languageGroup.querySelector('.professional-dicts');
  if (!professionalDicts) return false;
  
  // 检查是否只有空消息
  const emptyMessage = professionalDicts.querySelector('.empty-message');
  if (emptyMessage) return false;
  
  // 检查是否有实际的词典项
  const dictItems = professionalDicts.querySelectorAll('.dict-item');
  return dictItems.length > 0;
}

// 初始化语言分组事件监听器
function initLanguageGroupListeners() {
  console.log('Initializing language group listeners...');
  
  // 为所有语言头部添加点击事件监听器
  const languageHeaders = document.querySelectorAll('.language-header');
  console.log('Found language headers:', languageHeaders.length);
  
  languageHeaders.forEach(header => {
    const languageGroup = header.closest('.language-group');
    const language = languageGroup ? languageGroup.getAttribute('data-language') : null;
    
    if (language) {
      console.log('Processing language:', language);
      
      // 检查是否有实际的专业词典
      const hasProDicts = hasActualProfessionalDicts(languageGroup);
      const expandIcon = header.querySelector('.expand-icon');
      
      console.log(`Language ${language} has professional dicts:`, hasProDicts);
      
      if (hasProDicts) {
        // 有专业词典，显示折叠符号并添加点击事件
        if (expandIcon) {
          expandIcon.style.display = 'block';
        }
        
        // 添加可点击样式
        header.style.cursor = 'pointer';
        
        // 移除可能存在的旧监听器
        header.removeEventListener('click', header._clickHandler);
        
        // 创建新的点击处理器
        header._clickHandler = () => {
          console.log('Language header clicked:', language);
          toggleLanguageGroup(language);
        };
        
        // 添加新监听器
        header.addEventListener('click', header._clickHandler);
        
      } else {
        // 没有专业词典，隐藏折叠符号
        if (expandIcon) {
          expandIcon.style.display = 'none';
        }
        
        // 移除可点击样式
        header.style.cursor = 'default';
        
        // 移除点击事件监听器
        if (header._clickHandler) {
          header.removeEventListener('click', header._clickHandler);
          header._clickHandler = null;
        }
      }
    }
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 确保i18n先初始化
  await window.i18n.init();
  
  // 然后创建PopupController
  window.popupController = new PopupController();
  
  // 延迟初始化语言分组监听器，确保DOM完全加载
  setTimeout(() => {
    initLanguageGroupListeners();
  }, 100);
});