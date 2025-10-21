-- ADHDGoFly 插件分析数据库表结构
-- 专门用于插件生命周期事件的数据收集和分析

-- 插件安装事件表
CREATE TABLE IF NOT EXISTS plugin_installations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,          -- 事件类型：install, update
    version TEXT NOT NULL,              -- 当前版本号
    previous_version TEXT,              -- 更新前的版本（仅对update事件）
    installed_at INTEGER NOT NULL,      -- Unix 时间戳（毫秒）
    user_hash TEXT NOT NULL,            -- 用户哈希（匿名标识）
    date TEXT NOT NULL,                 -- 日期字符串，如 "2025-01-13"
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- 记录创建时间
);

-- 插件启动事件表
CREATE TABLE IF NOT EXISTS plugin_startups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at INTEGER NOT NULL,        -- Unix 时间戳（毫秒）
    user_hash TEXT NOT NULL,            -- 用户哈希（匿名标识）
    version TEXT NOT NULL,              -- 当前版本号
    date TEXT NOT NULL,                 -- 日期字符串，如 "2025-01-13"
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- 记录创建时间
);

-- 插件标签页启动事件表
CREATE TABLE IF NOT EXISTS plugin_tab_startups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at INTEGER NOT NULL,        -- Unix 时间戳（毫秒）
    user_hash TEXT NOT NULL,            -- 用户哈希（匿名标识）
    version TEXT NOT NULL,              -- 当前版本号
    domain_hash TEXT,                   -- 域名哈希（保护隐私）
    date TEXT NOT NULL,                 -- 日期字符串，如 "2025-01-13"
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- 记录创建时间
);

-- 插件安装事件表索引
CREATE INDEX IF NOT EXISTS idx_installations_date ON plugin_installations(date);
CREATE INDEX IF NOT EXISTS idx_installations_user_hash ON plugin_installations(user_hash);
CREATE INDEX IF NOT EXISTS idx_installations_event_type ON plugin_installations(event_type);
CREATE INDEX IF NOT EXISTS idx_installations_version ON plugin_installations(version);

-- 插件启动事件表索引
CREATE INDEX IF NOT EXISTS idx_startups_date ON plugin_startups(date);
CREATE INDEX IF NOT EXISTS idx_startups_user_hash ON plugin_startups(user_hash);
CREATE INDEX IF NOT EXISTS idx_startups_version ON plugin_startups(version);

-- 插件标签页启动事件表索引
CREATE INDEX IF NOT EXISTS idx_tab_startups_date ON plugin_tab_startups(date);
CREATE INDEX IF NOT EXISTS idx_tab_startups_user_hash ON plugin_tab_startups(user_hash);
CREATE INDEX IF NOT EXISTS idx_tab_startups_domain_hash ON plugin_tab_startups(domain_hash);
CREATE INDEX IF NOT EXISTS idx_tab_startups_version ON plugin_tab_startups(version);

-- 插件每日统计汇总表（用于快速查询和长期数据保留）
CREATE TABLE IF NOT EXISTS plugin_daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,                 -- 日期字符串，如 "2025-01-13"
    event_type TEXT NOT NULL,           -- 事件类型：install, update, startup, tab_startup
    version TEXT NOT NULL,              -- 插件版本号
    event_count INTEGER DEFAULT 0,      -- 当日该类型事件总数
    unique_users INTEGER DEFAULT 0,     -- 当日该类型事件的唯一用户数
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插件每日统计表索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_plugin_daily_stats_unique 
ON plugin_daily_stats(date, event_type, version);

CREATE INDEX IF NOT EXISTS idx_plugin_daily_stats_date ON plugin_daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_plugin_daily_stats_event_type ON plugin_daily_stats(event_type);

-- 插件用户统计表（用于用户行为分析）
CREATE TABLE IF NOT EXISTS plugin_user_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL UNIQUE,     -- 用户哈希（匿名标识）
    first_install_date TEXT,            -- 首次安装日期
    last_activity_date TEXT,            -- 最后活动日期
    total_startups INTEGER DEFAULT 0,   -- 总启动次数
    total_tab_startups INTEGER DEFAULT 0, -- 总标签页启动次数
    current_version TEXT,               -- 当前版本
    install_count INTEGER DEFAULT 0,    -- 安装次数（包括更新）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插件用户统计表索引
CREATE INDEX IF NOT EXISTS idx_plugin_user_stats_user_hash ON plugin_user_stats(user_hash);
CREATE INDEX IF NOT EXISTS idx_plugin_user_stats_last_activity ON plugin_user_stats(last_activity_date);
CREATE INDEX IF NOT EXISTS idx_plugin_user_stats_version ON plugin_user_stats(current_version);