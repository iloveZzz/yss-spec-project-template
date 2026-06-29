<script setup lang="ts">
import { YMonacoDiff } from '@yss-ui/components';
import { ref } from 'vue';

const original = ref<string>(`-- Database Schema Version 1.0 (Legacy)
-- Date: 2023-01-01

-- 用户表设计
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(50) NOT NULL, -- 警告：明文密码
    last_login DATETIME,
    status TINYINT DEFAULT 1 -- 1:启用, 0:禁用
);

-- 插入初始数据
INSERT INTO users (username, password, status) VALUES ('admin', 'admin123', 1);
INSERT INTO users (username, password, status) VALUES ('guest', 'guest', 1);
INSERT INTO users (username, password, status) VALUES ('tester', '123456', 0);

-- 旧日志表 (即将废弃)
CREATE TABLE sys_logs_legacy (
    id INT,
    msg TEXT,
    created_at DATETIME
);

-- 简单查询
SELECT * FROM users WHERE status = 1;

-- 报表存储过程 (标准版)
DELIMITER //
CREATE PROCEDURE GenerateMonthlyReport(IN reportMonth VARCHAR(7))
BEGIN
    -- 变量声明
    DECLARE done INT DEFAULT FALSE;
    DECLARE total_sales DECIMAL(10,2);
    DECLARE order_count INT;
    
    -- 这里的逻辑在两个版本中基本一致，除了少量注释差异
    -- 模拟一段长逻辑...
    
    SELECT COUNT(*) INTO order_count FROM orders WHERE DATE_FORMAT(order_date, '%Y-%m') = reportMonth;
    
    IF order_count > 0 THEN
        SELECT SUM(amount) INTO total_sales FROM orders WHERE DATE_FORMAT(order_date, '%Y-%m') = reportMonth;
    ELSE
        SET total_sales = 0.00;
    END IF;
    
    -- 返回结果
    SELECT reportMonth AS month, order_count AS count, total_sales AS total;
END //
DELIMITER ;

-- 基础配置表 (完全一致)
CREATE TABLE app_config (
    config_key VARCHAR(100) NOT NULL PRIMARY KEY,
    config_value VARCHAR(500),
    description TEXT,
    is_system TINYINT DEFAULT 0
);

-- 默认配置数据
INSERT INTO app_config VALUES ('site_name', 'YSS管理系统', '站点名称', 1);
INSERT INTO app_config VALUES ('max_upload_size', '10MB', '文件上传限制', 1);
INSERT INTO app_config VALUES ('theme_color', '#1890ff', '默认主题色', 0);
`);

const value = ref<string>(`-- Database Schema Version 2.0 (Security Update)
-- Date: 2023-12-01
-- Reviewer: Security_Team

-- 用户表设计 (升级)
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- 修改: 使用哈希存储密码
    email VARCHAR(100) UNIQUE, -- 新增: 邮箱字段
    last_login DATETIME,
    is_active BOOLEAN DEFAULT TRUE, -- 修改: 状态字段类型变更
    updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP -- 新增: 更新时间
);

-- 插入初始数据 (迁移后)
INSERT INTO users (username, password_hash, email, is_active) VALUES ('admin', '$2b$12$Kw...', 'admin@yss.com', TRUE);
-- 删除: guest 用户已移除安全隐患
-- INSERT INTO users (username, password, status) VALUES ('guest', 'guest', 1);
INSERT INTO users (username, password_hash, is_active) VALUES ('tester', '$2b$12$Hb...', FALSE);

-- 新增: 审计日志表
CREATE TABLE audit_logs (
    log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(50),
    ip_address VARCHAR(45),
    details JSON, -- 新增: JSON格式详情
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 优化查询
SELECT user_id, username, email FROM users WHERE is_active = TRUE;

-- 报表存储过程 (标准版 - 含微量优化)
DELIMITER //
CREATE PROCEDURE GenerateMonthlyReport(IN reportMonth VARCHAR(7))
BEGIN
    -- 变量声明
    DECLARE done INT DEFAULT FALSE;
    DECLARE total_sales DECIMAL(10,2);
    DECLARE order_count INT;
    
    -- 这里的逻辑在两个版本中基本一致，除了少量注释差异
    -- 模拟一段长逻辑... (Review OK)
    
    SELECT COUNT(*) INTO order_count FROM orders WHERE DATE_FORMAT(order_date, '%Y-%m') = reportMonth;
    
    IF order_count > 0 THEN
        -- 性能优化: 增加索引提示
        SELECT SUM(amount) INTO total_sales FROM orders USE INDEX(idx_order_date) WHERE DATE_FORMAT(order_date, '%Y-%m') = reportMonth;
    ELSE
        SET total_sales = 0.00;
    END IF;
    
    -- 返回结果
    SELECT reportMonth AS month, order_count AS count, total_sales AS total;
END //
DELIMITER ;

-- 默认配置数据
INSERT INTO app_config VALUES ('site_name', 'YSS管理系统', '站点名称', 1);
INSERT INTO app_config VALUES ('max_upload_size', '20MB', '文件上传限制 (调整)', 1);
INSERT INTO app_config VALUES ('theme_color', '#1890ff', '默认主题色', 0);
`);
</script>

<template>
  <YMonacoDiff v-model:value="value" :original="original" height="420" />
  <div style="margin-top: 12px; font-size: 12px; color: #888">支持并排对比与语法高亮。</div>
</template>

<style scoped></style>
