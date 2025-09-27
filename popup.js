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
        adj: '#9370db'      // 紫色 (medium purple)
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
    
    // 本地词典数据
    this.localDict = {
      nouns: [],
      verbs: [],
      adjectives: [],
      language: 'zh',
      wordSpacing: 'no-space'
    };
    this.savedDictName = null;

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
    
    // 检查版本
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
    
    // 绑定语言切换事件
    this.bindLanguageEvents();
    
    // 绑定本地词典事件
    this.bindLocalDictEvents();
    
    // 加载设置
    this.loadDictSettings();
    this.loadColorSettings();
    this.loadTextSettings();
    this.loadLocalDictSettings();

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
      statusDiv.className = 'status disabled';
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

  async saveColorSettings() {
    try {
      await chrome.storage.local.set({ colorScheme: this.currentColorScheme });
      
      // 通知content script更新颜色方案
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          await chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateColorScheme',
            scheme: this.currentColorScheme,
            colors: this.colorSchemes[this.currentColorScheme]
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



  async checkVersion() {
    try {
      // 显示当前版本
      const manifest = chrome.runtime.getManifest();
      const currentVersion = manifest.version;
      
      // 初始化版本信息缓存
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
      
      // 请求后台检查最新版本
       chrome.runtime.sendMessage({ action: 'checkVersion' }, (response) => {
         this.versionInfo.isChecking = false;
         
         if (response && response.success) {
           this.versionInfo.latestVersion = response.latestVersion;
           this.versionInfo.hasUpdate = response.hasUpdate;
           this.versionInfo.releaseUrl = response.releaseUrl;
           this.versionInfo.alternativeDownloads = response.alternativeDownloads;
           this.versionInfo.contactInfo = response.contactInfo;
         } else {
           this.versionInfo.error = response?.error || 'Unknown error';
         }
         
         // 更新UI显示
         this.updateVersionUI();
       });
    } catch (error) {
      console.error('版本检测失败:', error);
      this.versionInfo = {
        currentVersion: '未知',
        latestVersion: null,
        isChecking: false,
        hasUpdate: false,
        error: error.message,
        releaseUrl: null,
        alternativeDownloads: null,
        contactInfo: null
      };
      this.updateVersionUI();
    }
  }
  
  updateVersionUI() {
    if (!this.versionInfo) return;
    
    // 更新当前版本显示
    document.getElementById('currentVersion').textContent = this.versionInfo.currentVersion;
    
    // 更新最新版本显示
     const latestVersionElement = document.getElementById('latestVersion');
     if (this.versionInfo.isChecking) {
       latestVersionElement.textContent = this.i18nManager.t('version.checking');
     } else if (this.versionInfo.error) {
       latestVersionElement.textContent = this.i18nManager.t('version.checkFailed');
     } else {
       latestVersionElement.textContent = this.versionInfo.latestVersion;
     }
    
    // 处理更新提示
    if (this.versionInfo.hasUpdate && !this.versionInfo.isChecking) {
      const updateNotice = document.getElementById('updateNotice');
      
      // 设置官方GitHub链接
      const githubLink = document.getElementById('githubLink');
      if (githubLink && this.versionInfo.releaseUrl) {
        githubLink.href = this.versionInfo.releaseUrl;
      }
      
      // 设置替代下载链接
      if (this.versionInfo.alternativeDownloads) {
        const baiduLink = document.getElementById('baiduLink');
        const giteeLink = document.getElementById('giteeLink');
        const directLink = document.getElementById('directLink');
        
        if (baiduLink) baiduLink.href = this.versionInfo.alternativeDownloads.baidu;
        if (giteeLink) giteeLink.href = this.versionInfo.alternativeDownloads.gitee;
        if (directLink) directLink.href = this.versionInfo.alternativeDownloads.direct;
      }
      
      // 设置联系信息
      if (this.versionInfo.contactInfo) {
        const contactInfoElement = document.querySelector('.contact-info');
        if (contactInfoElement) {
          contactInfoElement.textContent = this.versionInfo.contactInfo;
        }
      }
      
      if (updateNotice) {
        updateNotice.style.display = 'block';
      }
    }
  }
  
  // 本地词典相关方法
  bindLocalDictEvents() {
    // 语言选择事件
    const languageSelect = document.getElementById('dict-language');
    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => {
        this.handleLanguageChange(e.target.value);
      });
    }
    
    // 词汇分隔方式选择事件
    const spacingRadios = document.querySelectorAll('input[name="word-spacing"]');
    spacingRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.localDict.wordSpacing = e.target.value;
          this.saveLocalDictToStorage();
        }
      });
    });
    
    // 添加词汇按钮事件
    const addNounBtn = document.getElementById('add-noun-btn');
    const addVerbBtn = document.getElementById('add-verb-btn');
    const addAdjBtn = document.getElementById('add-adj-btn');
    
    if (addNounBtn) {
      addNounBtn.addEventListener('click', () => this.addWord('noun'));
    }
    if (addVerbBtn) {
      addVerbBtn.addEventListener('click', () => this.addWord('verb'));
    }
    if (addAdjBtn) {
      addAdjBtn.addEventListener('click', () => this.addWord('adj'));
    }
    
    // 保存词典按钮事件
    const saveLocalDictBtn = document.getElementById('save-local-dict-btn');
    if (saveLocalDictBtn) {
      saveLocalDictBtn.addEventListener('click', () => this.saveLocalDict());
    }
    
    // 输入框回车事件
    const nounInput = document.getElementById('local-dict-noun');
    const verbInput = document.getElementById('local-dict-verb');
    const adjInput = document.getElementById('local-dict-adj');
    
    if (nounInput) {
      nounInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.addWord('noun');
      });
    }
    if (verbInput) {
      verbInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.addWord('verb');
      });
    }
    if (adjInput) {
      adjInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.addWord('adj');
      });
    }
  }
  
  handleLanguageChange(language) {
    this.localDict.language = language;
    
    // 显示或隐藏其他语言选项
    const otherOptions = document.getElementById('other-language-options');
    if (otherOptions) {
      if (language === 'other') {
        otherOptions.style.display = 'block';
      } else {
        otherOptions.style.display = 'none';
        // 根据预设语言设置默认分词方式
        this.setDefaultWordSpacing(language);
      }
    }
    
    this.saveLocalDictToStorage();
  }
  
  setDefaultWordSpacing(language) {
    // 根据语言类型设置默认的词汇分隔方式
    let defaultSpacing;
    switch(language) {
      case 'zh':
      case 'ja':
        defaultSpacing = 'no-space';
        break;
      case 'en':
      case 'fr':
      case 'ru':
      case 'es':
        defaultSpacing = 'space';
        break;
      default:
        defaultSpacing = 'no-space';
    }
    
    this.localDict.wordSpacing = defaultSpacing;
    
    // 更新单选按钮状态
    const spacingRadios = document.querySelectorAll('input[name="word-spacing"]');
    spacingRadios.forEach(radio => {
      radio.checked = radio.value === defaultSpacing;
    });
  }
  
  addWord(type) {
    let inputId, arrayKey;
    
    switch(type) {
      case 'noun':
        inputId = 'local-dict-noun';
        arrayKey = 'nouns';
        break;
      case 'verb':
        inputId = 'local-dict-verb';
        arrayKey = 'verbs';
        break;
      case 'adj':
        inputId = 'local-dict-adj';
        arrayKey = 'adjectives';
        break;
      default:
        return;
    }
    
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const word = input.value.trim();
    if (!word) return;
    
    // 检查是否已存在
    if (this.localDict[arrayKey].includes(word)) {
      alert('该词汇已存在！');
      return;
    }
    
    // 添加到数组
    this.localDict[arrayKey].push(word);
    
    // 清空输入框
    input.value = '';
    
    // 更新预览区域
    this.updatePreview();
    
    // 更新保存按钮状态
    this.updateSaveButtonState();
    
    // 保存到本地存储
    this.saveLocalDictToStorage();
  }
  
  updatePreview() {
    // 更新名词预览
    const nounPreview = document.getElementById('noun-preview');
    if (nounPreview) {
      nounPreview.innerHTML = this.localDict.nouns.map(word => 
        `<span class="word-tag noun" onclick="popupController.removeWord('nouns', '${word}')">${word}</span>`
      ).join('');
    }
    
    // 更新动词预览
    const verbPreview = document.getElementById('verb-preview');
    if (verbPreview) {
      verbPreview.innerHTML = this.localDict.verbs.map(word => 
        `<span class="word-tag verb" onclick="popupController.removeWord('verbs', '${word}')">${word}</span>`
      ).join('');
    }
    
    // 更新形容词预览
    const adjPreview = document.getElementById('adj-preview');
    if (adjPreview) {
      adjPreview.innerHTML = this.localDict.adjectives.map(word => 
        `<span class="word-tag adj" onclick="popupController.removeWord('adjectives', '${word}')">${word}</span>`
      ).join('');
    }
  }
  
  removeWord(arrayKey, word) {
    const index = this.localDict[arrayKey].indexOf(word);
    if (index > -1) {
      this.localDict[arrayKey].splice(index, 1);
      this.updatePreview();
      this.updateSaveButtonState();
      this.saveLocalDictToStorage();
    }
  }
  
  updateSaveButtonState() {
    const saveBtn = document.getElementById('save-local-dict-btn');
    if (!saveBtn) return;
    
    const hasWords = this.localDict.nouns.length > 0 || 
                    this.localDict.verbs.length > 0 || 
                    this.localDict.adjectives.length > 0;
    
    if (hasWords) {
      saveBtn.disabled = false;
      saveBtn.style.opacity = '1';
      saveBtn.style.cursor = 'pointer';
    } else {
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.5';
      saveBtn.style.cursor = 'not-allowed';
    }
  }
  
  saveLocalDict() {
    const hasWords = this.localDict.nouns.length > 0 || 
                    this.localDict.verbs.length > 0 || 
                    this.localDict.adjectives.length > 0;
    
    if (!hasWords) {
      alert('请先添加词汇！');
      return;
    }
    
    // 生成词典名称
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dictName = `词典-${year}-${month}-${day}`;
    
    // 创建词典数据
    const dictData = {
      name: dictName,
      version: '1.0.0',
      lastUpdated: now.toISOString(),
      language: this.localDict.language,
      wordSpacing: this.localDict.wordSpacing,
      words: {}
    };
    
    // 添加词汇到词典数据
    this.localDict.nouns.forEach(word => {
      dictData.words[word] = { pos: ['n'] };
    });
    this.localDict.verbs.forEach(word => {
      dictData.words[word] = { pos: ['v'] };
    });
    this.localDict.adjectives.forEach(word => {
      dictData.words[word] = { pos: ['adj'] };
    });
    
    // 保存到Chrome存储
    chrome.storage.local.set({
      [`localDict_${dictName}`]: dictData
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('保存词典失败:', chrome.runtime.lastError);
        alert('保存词典失败！');
        return;
      }
      
      this.savedDictName = dictName;
      this.showSavedDictName();
      alert('词典保存成功！');
      
      // 清空当前词典
      this.localDict = {
        nouns: [],
        verbs: [],
        adjectives: [],
        language: 'zh',
        wordSpacing: 'no-space'
      };
      
      // 重置UI状态
      this.resetLanguageUI();
      this.updatePreview();
      this.updateSaveButtonState();
      this.saveLocalDictToStorage();
    });
  }
  
  showSavedDictName() {
    // 在保存按钮下方显示词典名称
    let nameDisplay = document.getElementById('saved-dict-name');
    if (!nameDisplay) {
      nameDisplay = document.createElement('div');
      nameDisplay.id = 'saved-dict-name';
      nameDisplay.className = 'saved-dict-name';
      
      const saveBtn = document.getElementById('save-local-dict-btn');
      if (saveBtn && saveBtn.parentNode) {
        saveBtn.parentNode.appendChild(nameDisplay);
      }
    }
    
    if (this.savedDictName) {
      nameDisplay.textContent = `已保存: ${this.savedDictName}`;
      nameDisplay.style.display = 'block';
    } else {
      nameDisplay.style.display = 'none';
    }
  }
  
  saveLocalDictToStorage() {
    chrome.storage.local.set({
      'localDictTemp': this.localDict
    });
  }
  
  resetLanguageUI() {
    // 重置语言选择
    const languageSelect = document.getElementById('dict-language');
    if (languageSelect) {
      languageSelect.value = this.localDict.language;
    }
    
    // 重置其他语言选项显示状态
    const otherOptions = document.getElementById('other-language-options');
    if (otherOptions) {
      otherOptions.style.display = this.localDict.language === 'other' ? 'block' : 'none';
    }
    
    // 重置单选按钮状态
    const spacingRadios = document.querySelectorAll('input[name="word-spacing"]');
    spacingRadios.forEach(radio => {
      radio.checked = radio.value === this.localDict.wordSpacing;
    });
  }
  
  async loadLocalDictSettings() {
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(['localDictTemp'], resolve);
      });
      
      if (result.localDictTemp) {
        this.localDict = {
          nouns: result.localDictTemp.nouns || [],
          verbs: result.localDictTemp.verbs || [],
          adjectives: result.localDictTemp.adjectives || [],
          language: result.localDictTemp.language || 'zh',
          wordSpacing: result.localDictTemp.wordSpacing || 'no-space'
        };
      }
      
      this.resetLanguageUI();
      this.updatePreview();
      this.updateSaveButtonState();
      this.showSavedDictName();
    } catch (error) {
      console.error('加载本地词典设置失败:', error);
    }
  }






















































}

// 全局引用，供HTML onclick使用
let popupController;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  popupController = new PopupController();
});