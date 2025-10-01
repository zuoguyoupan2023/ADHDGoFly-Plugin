// ADHD Text Highlighter - Popup Script
class PopupController {
  constructor() {
    this.currentStatus = null;
    this.currentPage = 'home';
    this.i18nManager = new I18nManager();
    this.versionInfo = null; // 缓存版本信息
    this.dictSettings = {
      zh: true,
      en: true,
      fr: false,
      ru: false,
      es: false,
      ja: false
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

    this.init();
  }

  async init() {
    console.log('初始化Popup控制器...');
    
    // 初始化i18n
    await this.i18nManager.init();
    
    // 设置初始状态文本
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.textContent = this.i18nManager.t('status.checking');
    }
    
    // 绑定事件
    this.bindEvents();
    
    // 检查状态
    await this.checkStatus();
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
    const currentLang = this.i18nManager.getCurrentLanguage();
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    await this.i18nManager.switchLanguage(newLang);
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
    }
  }

  bindDictEvents() {
    // 词典复选框事件
    const dictCheckboxes = document.querySelectorAll('[id^="dict-"]');
    dictCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const langCode = e.target.id.replace('dict-', '');
        this.dictSettings[langCode] = e.target.checked;
        console.log(`${langCode}词典:`, e.target.checked ? '启用' : '禁用');
      });
    });
    
    // 保存按钮事件
    const saveDictBtn = document.getElementById('save-dict-btn');
    if (saveDictBtn) {
      saveDictBtn.addEventListener('click', () => this.saveDictSettings());
    }
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
    Object.keys(this.dictSettings).forEach(langCode => {
      const checkbox = document.getElementById(`dict-${langCode}`);
      if (checkbox) {
        checkbox.checked = this.dictSettings[langCode];
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
      zh: 'ZH',
      en: 'EN',
      fr: 'FR',
      ru: 'RU',
      es: 'ES',
      ja: 'JA'
    };
    
    // 只处理已知的词典语言代码
    const validLangCodes = ['zh', 'en', 'fr', 'ru', 'es', 'ja'];
    
    // 根据词典界面的实际复选框状态添加标签
    validLangCodes.forEach(langCode => {
      const checkbox = document.getElementById(`dict-${langCode}`);
      if (checkbox && checkbox.checked && dictNames[langCode]) {
        const tag = document.createElement('div');
        tag.className = 'dict-tag';
        tag.textContent = dictNames[langCode];
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
        this.updateUI({ enabled: false, error: this.i18nManager.t('errors.noTab') });
        return;
      }

      const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' });
      
      if (response && response.success) {
        this.currentStatus = response;
        this.updateUI(response);
      } else {
        this.updateUI({ enabled: false, error: this.i18nManager.t('errors.notLoaded') });
      }
    } catch (error) {
      console.error('检查状态失败:', error);
      this.updateUI({ enabled: false, error: this.i18nManager.t('errors.connectionFailed') });
    }
  }

  async handleToggle() {
    const toggleBtn = document.getElementById('toggle');
    const statusDiv = document.getElementById('status');
    
    // 显示加载状态
    toggleBtn.textContent = this.i18nManager.t('status.processing');
    toggleBtn.disabled = true;
    statusDiv.textContent = this.i18nManager.t('status.switching');
    statusDiv.className = 'status';
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        throw new Error(this.i18nManager.t('errors.noTab'));
      }

      const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' });
      
      if (response && response.success) {
        this.currentStatus = { ...this.currentStatus, enabled: response.enabled, statistics: response.stats };
        this.updateUI(this.currentStatus);
      } else {
        throw new Error(response?.error || this.i18nManager.t('errors.operationFailed'));
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
      toggleBtn.textContent = this.i18nManager.t('buttons.retry');
      toggleBtn.className = 'toggle-btn';
      return;
    }

    const enabled = status.enabled;
    
    // 更新状态显示
    statusDiv.textContent = enabled ? this.i18nManager.t('status.enabled') : this.i18nManager.t('status.disabled');
    statusDiv.className = enabled ? 'status enabled' : 'status disabled';
    
    // 更新按钮
    toggleBtn.textContent = enabled ? this.i18nManager.t('buttons.disable') : this.i18nManager.t('buttons.enable');
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
    
    // 高亮开关复选框事件
    const highlightToggles = ['noun', 'verb', 'adj', 'comparative'];
    highlightToggles.forEach(type => {
      const checkbox = document.getElementById(`highlight-${type}`);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          this.highlightingToggles[type] = e.target.checked;
          console.log(`${type}高亮开关:`, e.target.checked);
          // 立即保存设置
          this.saveColorSettings();
        });
      }
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
    
    console.log('选择颜色方案:', scheme);
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
      const checkbox = document.getElementById(`highlight-${type}`);
      if (checkbox) {
        checkbox.checked = this.highlightingToggles[type];
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
    const loadingText = this.i18nManager.t('pages.ai.analyzing');
    
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
      container.innerHTML = `<div class="no-data">${this.i18nManager.t('pages.ai.noData')}</div>`;
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
      container.innerHTML = `<div class="no-data">${this.i18nManager.t('pages.ai.noData')}</div>`;
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
      container.innerHTML = `<div class="no-data">${this.i18nManager.t('pages.ai.noData')}</div>`;
      return;
    }
    
    let html = `<div class="highlight-summary">`;
    html += `<p>${this.i18nManager.t('pages.ai.stats.highlight.total')}: <strong>${highlights.total || 0}</strong></p>`;
    html += `<p>${this.i18nManager.t('pages.ai.stats.highlight.nodes')}: <strong>${highlights.processedNodes || 0}</strong></p>`;
    html += `</div>`;
    
    container.innerHTML = html;
  }

  // displayRecommendations方法已删除 - 推荐功能已禁用

  showAIError() {
    const errorText = this.i18nManager.t('pages.ai.error');
    
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
}

// 全局引用，供HTML onclick使用
let popupController;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  popupController = new PopupController();
});