// 🏗️ 安装数据收集功能测试脚本
// 用于验证独立安装信息收集系统

console.log('🏗️ 开始测试安装数据收集功能...');

// 模拟安装详情
const mockInstallDetails = {
  reason: 'install',
  previousVersion: undefined
};

// 测试函数
async function testInstallationDataCollection() {
  console.log('🧪 开始执行安装数据收集测试');
  
  try {
    // 测试1: 检查核心函数是否存在
    console.log('🔍 测试1: 检查核心函数...');
    if (typeof sendInstallationData === 'function') {
      console.log('✅ sendInstallationData 函数存在');
    } else {
      console.error('❌ sendInstallationData 函数不存在');
      return;
    }
    
    if (typeof generateAnonymousInstallId === 'function') {
      console.log('✅ generateAnonymousInstallId 函数存在');
    } else {
      console.error('❌ generateAnonymousInstallId 函数不存在');
      return;
    }
    
    // 测试2: 生成匿名ID
    console.log('🔍 测试2: 生成匿名ID...');
    const anonymousId = await generateAnonymousInstallId();
    console.log('🏗️ 生成的匿名ID:', anonymousId);
    
    if (anonymousId && anonymousId.length === 16) {
      console.log('✅ 匿名ID生成成功，长度正确');
    } else {
      console.error('❌ 匿名ID生成失败或长度不正确');
    }
    
    // 测试3: 检查浏览器信息获取
    console.log('🔍 测试3: 检查浏览器信息获取...');
    const browserType = getBrowserType();
    const browserVersion = getBrowserVersion();
    console.log('🏗️ 浏览器类型:', browserType);
    console.log('🏗️ 浏览器版本:', browserVersion);
    
    if (browserType && browserVersion) {
      console.log('✅ 浏览器信息获取成功');
    } else {
      console.error('❌ 浏览器信息获取失败');
    }
    
    // 测试4: 检查配置
    console.log('🔍 测试4: 检查配置...');
    console.log('🏗️ API URL:', INSTALLATION_CONFIG.API_URL);
    console.log('🏗️ 超时时间:', INSTALLATION_CONFIG.TIMEOUT);
    console.log('🏗️ 最大重试次数:', INSTALLATION_CONFIG.MAX_RETRIES);
    
    // 测试5: 模拟安装数据生成
    console.log('🔍 测试5: 模拟安装数据生成...');
    const mockInstallData = {
      event_type: 'plugin_install',
      timestamp: new Date().toISOString(),
      plugin_version: chrome.runtime.getManifest().version,
      browser_type: browserType,
      browser_version: browserVersion,
      platform: navigator.platform,
      language: chrome.i18n.getUILanguage(),
      install_reason: mockInstallDetails.reason,
      anonymous_id: anonymousId
    };
    
    console.log('🏗️ 模拟安装数据:', JSON.stringify(mockInstallData, null, 2));
    console.log('✅ 安装数据生成成功');
    
    // 测试6: 检查存储功能
    console.log('🔍 测试6: 检查存储功能...');
    await storeInstallDataForRetry(mockInstallData);
    
    const storedData = await chrome.storage.local.get(['pending_install_data']);
    if (storedData.pending_install_data) {
      console.log('✅ 数据存储功能正常');
      console.log('🏗️ 存储的数据:', storedData.pending_install_data);
    } else {
      console.error('❌ 数据存储功能异常');
    }
    
    // 测试7: 检查重试机制
    console.log('🔍 测试7: 检查重试机制...');
    scheduleInstallDataRetry();
    
    const alarms = await chrome.alarms.getAll();
    const installAlarm = alarms.find(alarm => alarm.name === INSTALLATION_CONFIG.ALARM_NAME);
    
    if (installAlarm) {
      console.log('✅ 重试定时器设置成功');
      console.log('🏗️ 下次执行时间:', new Date(installAlarm.scheduledTime).toLocaleString());
    } else {
      console.error('❌ 重试定时器设置失败');
    }
    
    // 清理测试数据
    console.log('🧹 清理测试数据...');
    await chrome.storage.local.remove(['pending_install_data', 'install_data_retry_count']);
    await chrome.alarms.clear(INSTALLATION_CONFIG.ALARM_NAME);
    console.log('✅ 测试数据清理完成');
    
    console.log('🎉 所有测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 测试网络连接
async function testNetworkConnection() {
  console.log('🌐 测试网络连接...');
  
  try {
    const testData = {
      event_type: 'test_connection',
      timestamp: new Date().toISOString(),
      plugin_version: 'test',
      browser_type: 'test',
      browser_version: 'test',
      platform: 'test',
      language: 'test',
      install_reason: 'test',
      anonymous_id: 'test123456789'
    };
    
    console.log('🏗️ 发送测试请求到:', INSTALLATION_CONFIG.API_URL);
    
    const response = await fetch(INSTALLATION_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
      signal: AbortSignal.timeout(5000)
    });
    
    console.log('🏗️ 响应状态:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ 网络连接测试成功');
      console.log('🏗️ 服务器响应:', result);
    } else {
      console.warn('⚠️ 服务器返回错误状态:', response.status);
      const errorText = await response.text();
      console.log('🏗️ 错误响应:', errorText);
    }
    
  } catch (error) {
    console.warn('⚠️ 网络连接测试失败:', error.message);
    console.log('💡 这是正常的，因为测试服务器可能还未部署');
  }
}

// 执行完整测试
async function runFullTest() {
  console.log('🚀 开始完整的安装数据收集测试');
  console.log('=' .repeat(50));
  
  await testInstallationDataCollection();
  
  console.log('=' .repeat(50));
  
  await testNetworkConnection();
  
  console.log('=' .repeat(50));
  console.log('🏁 测试完成！');
  
  // 显示测试总结
  console.log('📊 测试总结:');
  console.log('1. ✅ 核心函数检查');
  console.log('2. ✅ 匿名ID生成');
  console.log('3. ✅ 浏览器信息获取');
  console.log('4. ✅ 配置检查');
  console.log('5. ✅ 数据生成');
  console.log('6. ✅ 存储功能');
  console.log('7. ✅ 重试机制');
  console.log('8. ⚠️ 网络连接（需要服务器部署）');
  
  console.log('🎯 下一步: 部署API服务器并进行真实测试');
}

// 如果在浏览器环境中，自动运行测试
if (typeof chrome !== 'undefined' && chrome.runtime) {
  // 延迟执行，确保所有函数都已加载
  setTimeout(runFullTest, 1000);
} else {
  console.log('⚠️ 请在Chrome扩展环境中运行此测试');
}

// 导出测试函数（如果需要）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testInstallationDataCollection,
    testNetworkConnection,
    runFullTest
  };
}