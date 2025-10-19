-- ADHDGoFly 下载统计数据库表结构

CREATE TABLE IF NOT EXISTS downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL,              -- 插件版本号，如 "0.1.4"
    browser TEXT NOT NULL,              -- 浏览器类型：chrome, edge
    language TEXT NOT NULL,             -- 页面语言：zh, en
    country TEXT,                       -- 国家代码：CN, US, JP 等
    user_agent TEXT,                    -- 用户代理字符串（可选）
    referrer TEXT,                      -- 来源页面（可选）
    ip_hash TEXT,                       -- IP 哈希（用于去重，不存储真实 IP）
    created_at INTEGER NOT NULL,        -- Unix 时间戳（毫秒）
    date TEXT NOT NULL                  -- 日期字符串，如 "2025-10-13"（便于按日期查询）
);

-- 索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_downloads_date ON downloads(date);
CREATE INDEX IF NOT EXISTS idx_downloads_browser ON downloads(browser);
CREATE INDEX IF NOT EXISTS idx_downloads_version ON downloads(version);
CREATE INDEX IF NOT EXISTS idx_downloads_country ON downloads(country);
CREATE INDEX IF NOT EXISTS idx_downloads_language ON downloads(language);

-- 创建每日汇总表（用于长期数据保留）
CREATE TABLE IF NOT EXISTS downloads_daily (
    date TEXT PRIMARY KEY,
    total_downloads INTEGER DEFAULT 0,
    chrome_downloads INTEGER DEFAULT 0,
    edge_downloads INTEGER DEFAULT 0,
    zh_downloads INTEGER DEFAULT 0,
    en_downloads INTEGER DEFAULT 0,
    unique_countries INTEGER DEFAULT 0
);

-- ADHDGoFly 插件生命周期事件表结构

CREATE TABLE IF NOT EXISTS plugin_installations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,          -- 事件类型：install, update
    version TEXT NOT NULL,              -- 当前版本号
    previous_version TEXT,              -- 更新前的版本（仅对update事件）
    installed_at INTEGER NOT NULL,      -- Unix 时间戳（毫秒）
    user_hash TEXT NOT NULL,            -- 用户哈希（匿名标识）
    date TEXT NOT NULL                  -- 日期字符串，如 "2025-10-13"
);

CREATE TABLE IF NOT EXISTS plugin_startups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at INTEGER NOT NULL,        -- Unix 时间戳（毫秒）
    user_hash TEXT NOT NULL,            -- 用户哈希（匿名标识）
    version TEXT NOT NULL,              -- 当前版本号
    date TEXT NOT NULL                  -- 日期字符串，如 "2025-10-13"
);

CREATE TABLE IF NOT EXISTS plugin_tab_startups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at INTEGER NOT NULL,        -- Unix 时间戳（毫秒）
    user_hash TEXT NOT NULL,            -- 用户哈希（匿名标识）
    version TEXT NOT NULL,              -- 当前版本号
    domain_hash TEXT,                   -- 域名哈希（保护隐私）
    date TEXT NOT NULL                  -- 日期字符串，如 "2025-10-13"
);

-- 索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_tab_startups_date ON plugin_tab_startups(date);
CREATE INDEX IF NOT EXISTS idx_tab_startups_user_hash ON plugin_tab_startups(user_hash);
CREATE INDEX IF NOT EXISTS idx_tab_startups_domain_hash ON plugin_tab_startups(domain_hash);
CREATE INDEX IF NOT EXISTS idx_installations_date ON plugin_installations(date);
CREATE INDEX IF NOT EXISTS idx_installations_user_hash ON plugin_installations(user_hash);
CREATE INDEX IF NOT EXISTS idx_installations_event_type ON plugin_installations(event_type);
CREATE INDEX IF NOT EXISTS idx_startups_date ON plugin_startups(date);
CREATE INDEX IF NOT EXISTS idx_startups_user_hash ON plugin_startups(user_hash);
