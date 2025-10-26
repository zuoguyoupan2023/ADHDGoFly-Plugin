-- =====================================================
-- ADHDGoFly Plugin 独立安装信息收集数据库扩展脚本
-- 在现有数据库基础上添加安装统计表
-- =====================================================

-- 注意：此脚本应在现有的 plugin-data-analytics 数据库中执行
-- 不创建新数据库，而是扩展现有数据库结构

-- 创建独立安装统计表 (与现有plugin_installations表区分)
CREATE TABLE IF NOT EXISTS independent_installation_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,           -- 事件类型: install, update
    plugin_version TEXT NOT NULL,       -- 插件版本号
    browser_type TEXT NOT NULL,         -- 浏览器类型: chrome, edge, firefox等
    browser_version TEXT,               -- 浏览器版本
    platform TEXT NOT NULL,             -- 操作系统: windows, macos, linux
    language TEXT NOT NULL,              -- 浏览器语言
    anonymous_id TEXT NOT NULL,          -- 匿名用户ID (SHA-256)
    install_reason TEXT,                 -- 安装原因: install, update, chrome_update等
    timestamp INTEGER NOT NULL,         -- Unix时间戳(毫秒)
    date_created TEXT NOT NULL,          -- 创建日期 YYYY-MM-DD
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 记录创建时间
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- 记录更新时间
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_independent_event_type ON independent_installation_stats(event_type);
CREATE INDEX IF NOT EXISTS idx_independent_plugin_version ON independent_installation_stats(plugin_version);
CREATE INDEX IF NOT EXISTS idx_independent_browser_type ON independent_installation_stats(browser_type);
CREATE INDEX IF NOT EXISTS idx_independent_platform ON independent_installation_stats(platform);
CREATE INDEX IF NOT EXISTS idx_independent_date_created ON independent_installation_stats(date_created);
CREATE INDEX IF NOT EXISTS idx_independent_timestamp ON independent_installation_stats(timestamp);
CREATE INDEX IF NOT EXISTS idx_independent_anonymous_id ON independent_installation_stats(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_independent_created_at ON independent_installation_stats(created_at);

-- 注意：Cloudflare D1 使用 SQLite，不需要创建用户和权限
-- 权限管理通过 Cloudflare 的 API Token 和 Worker 绑定来控制

-- 创建统计视图
CREATE VIEW IF NOT EXISTS v_independent_installation_summary AS
SELECT 
    COUNT(*) as total_installations,
    COUNT(DISTINCT anonymous_id) as unique_installations,
    COUNT(CASE WHEN install_reason = 'install' THEN 1 END) as fresh_installs,
    COUNT(CASE WHEN install_reason = 'update' THEN 1 END) as updates,
    COUNT(CASE WHEN browser_type = 'chrome' THEN 1 END) as chrome_installs,
    COUNT(CASE WHEN browser_type = 'edge' THEN 1 END) as edge_installs,
    MIN(timestamp) as first_install,
    MAX(timestamp) as last_install
FROM independent_installation_stats;

-- 创建日统计视图
CREATE VIEW IF NOT EXISTS v_independent_daily_installs AS
SELECT 
    date_created as install_date,
    COUNT(*) as daily_installs,
    COUNT(DISTINCT anonymous_id) as unique_daily_installs,
    COUNT(CASE WHEN browser_type = 'chrome' THEN 1 END) as chrome_daily,
    COUNT(CASE WHEN browser_type = 'edge' THEN 1 END) as edge_daily,
    COUNT(CASE WHEN install_reason = 'install' THEN 1 END) as fresh_daily,
    COUNT(CASE WHEN install_reason = 'update' THEN 1 END) as update_daily
FROM independent_installation_stats 
GROUP BY date_created
ORDER BY install_date DESC;

-- 创建版本统计视图
CREATE VIEW IF NOT EXISTS v_independent_version_stats AS
SELECT 
    plugin_version,
    COUNT(*) as install_count,
    COUNT(DISTINCT anonymous_id) as unique_users,
    MIN(timestamp) as first_seen,
    MAX(timestamp) as last_seen,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM independent_installation_stats), 2) as percentage
FROM independent_installation_stats 
GROUP BY plugin_version
ORDER BY plugin_version DESC;

-- 创建浏览器统计视图
CREATE VIEW IF NOT EXISTS v_independent_browser_stats AS
SELECT 
    browser_type,
    browser_version,
    COUNT(*) as install_count,
    COUNT(DISTINCT anonymous_id) as unique_users,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM independent_installation_stats), 2) as percentage
FROM independent_installation_stats 
GROUP BY browser_type, browser_version
ORDER BY install_count DESC;

-- 创建平台统计视图
CREATE VIEW IF NOT EXISTS v_independent_platform_stats AS
SELECT 
    platform,
    COUNT(*) as install_count,
    COUNT(DISTINCT anonymous_id) as unique_users,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM independent_installation_stats), 2) as percentage
FROM independent_installation_stats 
GROUP BY platform
ORDER BY install_count DESC;

-- 创建语言统计视图
CREATE VIEW IF NOT EXISTS v_independent_language_stats AS
SELECT 
    language,
    COUNT(*) as install_count,
    COUNT(DISTINCT anonymous_id) as unique_users,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM independent_installation_stats), 2) as percentage
FROM independent_installation_stats 
GROUP BY language
ORDER BY install_count DESC;

-- 插入测试数据（可选）
-- INSERT INTO independent_installation_stats (
--     event_type, timestamp, plugin_version, browser_type, browser_version,
--     platform, language, install_reason, anonymous_id, date_created
-- ) VALUES 
-- (
--     'independent_installation',
--     strftime('%s', 'now') * 1000,
--     '0.1.4',
--     'chrome',
--     '120.0.0.0',
--     'MacIntel',
--     'zh-CN',
--     'install',
--     'test_' || hex(randomblob(16)),
--     date('now')
-- );

-- 显示创建结果
SELECT 'Database and tables created successfully!' as status;

-- SQLite 兼容的查询示例：
-- 显示表结构
-- PRAGMA table_info(independent_installation_stats);

-- 显示索引信息
-- PRAGMA index_list(independent_installation_stats);

-- 显示视图列表
-- SELECT name FROM sqlite_master WHERE type='view' AND name LIKE 'v_independent_%';

-- 显示测试数据
-- SELECT * FROM independent_installation_stats LIMIT 5;

-- 显示统计信息
-- SELECT 
--     'Total Records' as metric,
--     COUNT(*) as value
-- FROM independent_installation_stats
-- UNION ALL
-- SELECT 
--     'Unique Users' as metric,
--     COUNT(DISTINCT anonymous_id) as value
-- FROM independent_installation_stats
-- UNION ALL
-- SELECT 
--     'Latest Version' as metric,
--     MAX(plugin_version) as value
-- FROM independent_installation_stats;

-- 注意：SQLite 不支持存储过程，使用普通查询替代
-- 以下是一些常用的查询示例：

-- 清理旧数据查询 (需要手动执行，替换 30 为实际天数)
-- DELETE FROM independent_installation_stats 
-- WHERE timestamp < (strftime('%s', 'now', '-30 days') * 1000);

-- 获取最近N天的统计数据查询示例
-- SELECT 
--     date_created as date,
--     COUNT(*) as total_installs,
--     COUNT(DISTINCT anonymous_id) as unique_installs,
--     COUNT(CASE WHEN browser_type = 'chrome' THEN 1 END) as chrome_installs,
--     COUNT(CASE WHEN browser_type = 'edge' THEN 1 END) as edge_installs
-- FROM independent_installation_stats 
-- WHERE timestamp >= (strftime('%s', 'now', '-7 days') * 1000)
-- GROUP BY date_created
-- ORDER BY date DESC;

-- 注意：SQLite 不支持事件调度器
-- 建议在 Cloudflare Worker 中实现定期清理逻辑
-- 或者使用 GitHub Actions 定期执行清理脚本

-- 完成提示
SELECT '🏗️ Installation stats database initialization completed!' as message;
SELECT 'Next steps:' as todo;
SELECT '1. Update API configuration with database credentials' as step1;
SELECT '2. Deploy API server' as step2;
SELECT '3. Test installation data collection' as step3;
SELECT '4. Monitor data collection in production' as step4;