// ADHD Text Highlighter - Popup Script
class PopupController {
  constructor() {
    this.currentStatus = null;
    this.currentPage = 'home';
    this.currentCustomDict = { words: [] }; // 添加自建词典编辑状态
    this.versionInfo = null; // 缓存版本信息
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
    
    // 绑定关于页面事件
    this.bindAboutEvents();
    
    // 加载设置
    this.loadDictSettings();
    this.loadColorSettings();
    this.loadTextSettings();
    this.loadHighlightingToggles();

  }

  bindAboutEvents() {
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
      case 'about-btn':
        this.showPage('about');
        break;
      case 'settings-btn':
        this.showPage('settings');
        // 初始化设置页面
        if (typeof initSettings === 'function') {
          initSettings();
        }
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
      
      // 如果是词典页面，初始化语言分组监听器和tooltip事件
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
          // 初始化自建词典事件
          this.bindCustomDictEvents();
          // 加载自建词典列表
          this.loadCustomDicts();
        }, 50);
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
      });
    });
    
    // 保存按钮事件
    const saveDictBtn = document.getElementById('save-dict-btn');
    if (saveDictBtn) {
      saveDictBtn.addEventListener('click', () => this.saveDictSettings());
    }

    // 词典tooltip事件
    this.bindDictTooltipEvents();
    
    // 自建词典事件
    this.bindCustomDictEvents();
  }

  // 绑定自建词典相关事件
  bindCustomDictEvents() {
    // 创建词典按钮
    const createDictBtn = document.getElementById('create-dict-btn');
    if (createDictBtn) {
      createDictBtn.addEventListener('click', () => {
        this.showCustomDictEditor();
      });
    }

    // 自建词典编辑页面的事件
    this.bindCustomDictEditorEvents();
  }

  bindCustomDictEditorEvents() {
    // 添加词汇按钮
    const addWordBtn = document.getElementById('add-word-btn');
    if (addWordBtn) {
      addWordBtn.addEventListener('click', () => {
        this.addWordToDict();
      });
    }

    // 词汇输入框回车事件
    const wordInput = document.getElementById('word-input');
    if (wordInput) {
      wordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addWordToDict();
        }
      });
    }

    // 保存词典按钮
    const saveCustomDictBtn = document.getElementById('save-user-dict-btn');
    if (saveCustomDictBtn) {
      saveCustomDictBtn.addEventListener('click', () => {
        this.saveCustomDict();
      });
    }

    // 取消按钮
    const cancelCustomDictBtn = document.getElementById('cancel-user-dict-btn');
    if (cancelCustomDictBtn) {
      cancelCustomDictBtn.addEventListener('click', () => {
        this.hideCustomDictEditor();
      });
    }

    // 返回按钮
    const backBtn = document.getElementById('back-to-dict-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.hideCustomDictEditor();
      });
    }

    // 清空按钮
    const clearBtn = document.getElementById('clear-all-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.currentCustomDict.words = [];
        this.updateWordsPreview();
      });
    }
  }

  // 显示自建词典编辑器
  showCustomDictEditor(dictData = null) {
    const dictPage = document.getElementById('dict-page');
    const editorPage = document.getElementById('user-dict-page');
    
    if (dictPage && editorPage) {
      dictPage.classList.remove('active');
      editorPage.classList.add('active');
      
      // 如果是编辑模式，填充数据
      if (dictData) {
        this.fillCustomDictEditor(dictData);
      } else {
        this.clearCustomDictEditor();
      }
      
      // 重新绑定事件
      this.bindCustomDictEditorEvents();
    }
  }

  // 隐藏自建词典编辑器
  hideCustomDictEditor() {
    const dictPage = document.getElementById('dict-page');
    const editorPage = document.getElementById('user-dict-page');
    
    if (dictPage && editorPage) {
      editorPage.classList.remove('active');
      dictPage.classList.add('active');
      
      // 清空编辑器
      this.clearCustomDictEditor();
    }
  }

  // 清空自建词典编辑器
  clearCustomDictEditor() {
    const nameInput = document.getElementById('custom-dict-name');
    const languageSelect = document.getElementById('custom-dict-language');
    const typeSelect = document.getElementById('custom-dict-type');
    const wordInput = document.getElementById('word-input');
    const posSelect = document.getElementById('word-pos');
    const wordsPreview = document.getElementById('words-preview');
    
    if (nameInput) nameInput.value = '';
    if (languageSelect) languageSelect.value = 'zh';
    if (typeSelect) typeSelect.value = 'basic';
    if (wordInput) wordInput.value = '';
    if (posSelect) posSelect.value = 'noun';
    if (wordsPreview) wordsPreview.innerHTML = '';
    
    // 清空当前编辑的词典数据
    this.currentCustomDict = {
      words: []
    };
  }

  // 填充自建词典编辑器（编辑模式）
  fillCustomDictEditor(dictData) {
    const nameInput = document.getElementById('custom-dict-name');
    const languageSelect = document.getElementById('custom-dict-language');
    const typeSelect = document.getElementById('custom-dict-type');
    const wordsPreview = document.getElementById('words-preview');
    
    if (nameInput) nameInput.value = dictData.name || '';
    if (languageSelect) languageSelect.value = dictData.language || 'zh';
    if (typeSelect) typeSelect.value = dictData.type || 'basic';
    
    // 设置当前编辑的词典数据
    this.currentCustomDict = {
      id: dictData.id,
      words: dictData.words || []
    };
    
    // 更新词汇预览
    this.updateWordsPreview();
  }

  // 添加词汇到词典
  addWordToDict() {
    const wordInput = document.getElementById('word-input');
    const posSelect = document.getElementById('word-pos');
    
    if (!wordInput || !posSelect) return;
    
    const word = wordInput.value.trim();
    const pos = posSelect.value;
    
    if (!word) {
      alert('请输入词汇');
      return;
    }
    
    // 检查是否已存在
    if (this.currentCustomDict.words.some(w => w.word === word)) {
      alert('该词汇已存在');
      return;
    }
    
    // 添加词汇
    this.currentCustomDict.words.push({
      word: word,
      pos: pos
    });
    
    // 清空输入框
    wordInput.value = '';
    
    // 更新预览
    this.updateWordsPreview();
  }

  // 更新词汇预览
  updateWordsPreview() {
    const wordsPreview = document.getElementById('words-preview');
    if (!wordsPreview) return;
    
    if (this.currentCustomDict.words.length === 0) {
      wordsPreview.innerHTML = '<div class="empty-words">暂无词汇</div>';
      return;
    }
    
    const wordsHtml = this.currentCustomDict.words.map((wordData, index) => `
      <div class="word-item">
        <span class="word-text">${wordData.word}</span>
        <span class="word-pos pos-${wordData.pos}">${this.getPosDisplayName(wordData.pos)}</span>
        <button class="remove-word-btn" onclick="popupController.removeWordFromDict(${index})">×</button>
      </div>
    `).join('');
    
    wordsPreview.innerHTML = wordsHtml;
  }

  // 从词典中移除词汇
  removeWordFromDict(index) {
    if (this.currentCustomDict.words[index]) {
      this.currentCustomDict.words.splice(index, 1);
      this.updateWordsPreview();
    }
  }

  // 获取词性显示名称
  getPosDisplayName(pos) {
    const posNames = {
      'noun': '名词',
      'verb': '动词',
      'adjective': '形容词',
      'adverb': '副词',
      'pronoun': '代词',
      'preposition': '介词',
      'conjunction': '连词',
      'interjection': '感叹词',
      'other': '其他'
    };
    return posNames[pos] || pos;
  }

  // 保存自建词典
  async saveCustomDict() {
    const nameInput = document.getElementById('custom-dict-name');
    const languageSelect = document.getElementById('custom-dict-language');
    const typeSelect = document.getElementById('custom-dict-type');
    
    if (!nameInput || !languageSelect || !typeSelect) return;
    
    const name = nameInput.value.trim();
    const language = languageSelect.value;
    const type = typeSelect.value;
    
    if (!name) {
      alert('请输入词典名称');
      return;
    }
    
    if (this.currentCustomDict.words.length === 0) {
      alert('请至少添加一个词汇');
      return;
    }
    
    // 构建词典数据
    const dictData = {
      id: this.currentCustomDict.id || `custom-${Date.now()}`,
      name: name,
      language: language,
      type: type,
      words: this.currentCustomDict.words,
      createdAt: this.currentCustomDict.id ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      // 保存到存储（这里先用console.log模拟，后续会实现IndexedDB）
      console.log('保存自建词典:', dictData);
      
      // 显示成功消息
      alert('词典保存成功！');
      
      // 返回词典页面
      this.hideCustomDictEditor();
      
      // 刷新自建词典列表
      this.loadCustomDicts();
      
    } catch (error) {
      console.error('保存词典失败:', error);
      alert('保存失败，请重试');
    }
  }

  // 加载自建词典列表
  async loadCustomDicts() {
    // 这里先用模拟数据，后续会从IndexedDB加载
    const mockCustomDicts = [
      {
        id: 'custom-1',
        name: '我的专业词汇',
        language: 'zh',
        type: 'professional',
        words: [
          { word: '算法', pos: 'noun' },
          { word: '数据结构', pos: 'noun' }
        ],
        createdAt: '2024-01-01T00:00:00.000Z'
      }
    ];
    
    this.updateCustomDictsList(mockCustomDicts);
  }

  // 更新自建词典列表显示
  updateCustomDictsList(customDicts) {
    const customDictsContainer = document.getElementById('user-dict-list');
    if (!customDictsContainer) return;
    
    if (customDicts.length === 0) {
      customDictsContainer.innerHTML = '<div class="empty-message">暂无自建词典，点击 + 创建第一个词典</div>';
      return;
    }
    
    const dictsHtml = customDicts.map(dict => `
      <div class="custom-dict-item">
        <div class="custom-dict-info">
          <div class="custom-dict-name">${dict.name}</div>
          <div class="custom-dict-meta">
            ${this.getLanguageDisplayName(dict.language)} · 
            ${dict.words.length} 个词汇 · 
            ${this.getTypeDisplayName(dict.type)}
          </div>
        </div>
        <div class="custom-dict-actions">
          <button class="edit-custom-dict-btn" onclick="popupController.editCustomDict('${dict.id}')">编辑</button>
          <button class="delete-custom-dict-btn" onclick="popupController.deleteCustomDict('${dict.id}')">删除</button>
        </div>
      </div>
    `).join('');
    
    customDictsContainer.innerHTML = dictsHtml;
  }

  // 获取语言显示名称
  getLanguageDisplayName(language) {
    const languageNames = {
      'zh': '中文',
      'en': '英文',
      'fr': '法语',
      'es': '西班牙语',
      'ru': '俄语',
      'ja': '日语'
    };
    return languageNames[language] || language;
  }

  // 获取类型显示名称
  getTypeDisplayName(type) {
    const typeNames = {
      'basic': '基础词典',
      'professional': '专业词典'
    };
    return typeNames[type] || type;
  }

  // 编辑自建词典
  async editCustomDict(dictId) {
    // 这里先用模拟数据，后续会从IndexedDB加载
    const mockDict = {
      id: dictId,
      name: '我的专业词汇',
      language: 'zh',
      type: 'professional',
      words: [
        { word: '算法', pos: 'noun' },
        { word: '数据结构', pos: 'noun' }
      ]
    };
    
    this.showCustomDictEditor(mockDict);
  }

  // 删除自建词典
  async deleteCustomDict(dictId) {
    if (!confirm('确定要删除这个词典吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      // 这里先用console.log模拟，后续会实现IndexedDB删除
      console.log('删除自建词典:', dictId);
      
      // 刷新列表
      this.loadCustomDicts();
      
      alert('词典删除成功！');
      
    } catch (error) {
      console.error('删除词典失败:', error);
      alert('删除失败，请重试');
    }
  }

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

  hideDictTooltip() {
    const tooltip = document.getElementById('dict-tooltip');
    if (tooltip) {
      tooltip.classList.remove('show');
    }
  }

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

  async loadDictSettings() {
    try {
      const result = await chrome.storage.local.get(['dictSettings']);
      if (result.dictSettings) {
        this.dictSettings = { ...this.dictSettings, ...result.dictSettings };
      }
      
      // 更新UI
      this.updateDictUI();
    } catch (error) {
      console.error('加载词典设置失败:', error);
    }
  }

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
      if (this.dictSettings[dictId] && dictNames[dictId]) {
        const tag = document.createElement('div');
        tag.className = 'dict-tag';
        tag.textContent = dictNames[dictId];
        dictTagsContainer.appendChild(tag);
      }
    });
  }

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
      
      // 更新首页词典标签显示
      this.updateDictTags();
      
    } catch (error) {
      console.error('保存词典设置失败:', error);
    }
  }

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

  // displayRecommendations方法已删除 - 推荐功能已禁用

  showAIError() {
    const errorText = window.i18n.t('pages.ai.error');
    
    document.getElementById('languageStats').innerHTML = `<div class="error">${errorText}</div>`;
    document.getElementById('posStats').innerHTML = `<div class="error">${errorText}</div>`;
    
    // 高亮统计UI已隐藏，检查元素是否存在再操作
    const highlightStatsElement = document.getElementById('highlightStats');
    if (highlightStatsElement) {
      highlightStatsElement.innerHTML = `<div class="error">${errorText}</div>`;
    }
    
    // document.getElementById('colorRecommendation').innerHTML = `<div class="error">${errorText}</div>`; // 推荐功能已禁用
    // document.getElementById('textRecommendation').innerHTML = `<div class="error">${errorText}</div>`; // 推荐功能已禁用
  }

  async refreshAIAnalysis() {
    console.log('刷新AI分析...');
    await this.loadAIAnalysis();
  }

  // 版本检查方法
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
  popupController = new PopupController();
  
  // 延迟初始化语言分组监听器，确保DOM完全加载
  setTimeout(() => {
    initLanguageGroupListeners();
  }, 100);
});