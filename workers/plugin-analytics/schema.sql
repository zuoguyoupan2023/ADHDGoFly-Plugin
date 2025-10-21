-- ADHDGoFly 插件分析数据库表结构

-- 插件安装/更新事件表
CREATE TABLE IF NOT EXISTS plugin_installations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,           -- 事件类型：install, update
    version TEXT NOT NULL,              -- 当前版本号
    previous_version TEXT,              -- 更新前的版本（仅对update事件）
    installed_at INTEGER NOT NULL,      -- Unix 时间戳（毫秒）
    user_hash TEXT NOT NULL,            -- 用户哈希（匿名标识）
    browser TEXT,                       -- 浏览器类型：chrome, edge
    country TEXT,                       -- 国家代码：CN, US, JP 等
    user_agent TEXT,                    -- 用户代理字符串（可选）
    date TEXT NOT NULL                  -- 日期字符串，如 "2025-10-13"
);

-- 插件启动事件表
CREATE TABLE IF NOT EXISTS plugin_startups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at INTEGER NOT NULL,        -- Unix 时间戳（毫秒）
    user_hash TEXT NOT NULL,            -- 用户哈希（匿名标识）
    version TEXT NOT NULL,              -- 当前版本号
    browser TEXT,                       -- 浏览器类型：chrome, edge
    country TEXT,                       -- 国家代码
    user_agent TEXT,                    -- 用户代理字符串（可选）
    date TEXT NOT NULL                  -- 日期字符串，如 "2025-10-13"
);

-- 插件标签页启动事件表
CREATE TABLE IF NOT EXISTS plugin_tab_startups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at INTEGER NOT NULL,        -- Unix 时间戳（毫秒）
    user_hash TEXT NOT NULL,            -- 用户哈希（匿名标识）
    version TEXT NOT NULL,              -- 当前版本号
    domain_hash TEXT,                   -- 域名哈希（保护隐私）
    browser TEXT,                       -- 浏览器类型：chrome, edge
    country TEXT,                       -- 国家代码
    user_agent TEXT,                    -- 用户代理字符串（可选）
    date TEXT NOT NULL                  -- 日期字符串，如 "2025-10-13"
);

-- 插件使用统计汇总表（每日汇总）
CREATE TABLE IF NOT EXISTS plugin_usage_daily (
    date TEXT PRIMARY KEY,              -- 日期字符串，如 "2025-10-13"
    total_installations INTEGER DEFAULT 0,
    total_updates INTEGER DEFAULT 0,
    total_startups INTEGER DEFAULT 0,
    total_tab_startups INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,     -- 当日活跃用户数
    chrome_users INTEGER DEFAULT 0,
    edge_users INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL         -- 汇总创建时间
);

-- 索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_installations_date ON plugin_installations(date);
CREATE INDEX IF NOT EXISTS idx_installations_user_hash ON plugin_installations(user_hash);
CREATE INDEX IF NOT EXISTS idx_installations_event_type ON plugin_installations(event_type);
CREATE INDEX IF NOT EXISTS idx_installations_version ON plugin_installations(version);

CREATE INDEX IF NOT EXISTS idx_startups_date ON plugin_startups(date);
CREATE INDEX IF NOT EXISTS idx_startups_user_hash ON plugin_startups(user_hash);
CREATE INDEX IF NOT EXISTS idx_startups_version ON plugin_startups(version);

CREATE INDEX IF NOT EXISTS idx_tab_startups_date ON plugin_tab_startups(date);
CREATE INDEX IF NOT EXISTS idx_tab_startups_user_hash ON plugin_tab_startups(user_hash);
CREATE INDEX IF NOT EXISTS idx_tab_startups_domain_hash ON plugin_tab_startups(domain_hash);
CREATE INDEX IF NOT EXISTS idx_tab_startups_version ON plugin_tab_startups(version);

CREATE INDEX IF NOT EXISTS idx_usage_daily_date ON plugin_usage_daily(date);