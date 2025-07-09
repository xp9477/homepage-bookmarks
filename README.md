# homepage-bookmarks

本项目是一个 Chrome 浏览器扩展，支持定时或手动将浏览器“书签栏”下的所有书签以 YAML 格式自动同步到 WebDAV 服务器，并生成与 [gethomepage/homepage](https://github.com/gethomepage/homepage) 项目兼容的 `bookmarks.yaml` , 同时自动补全 `settings.yaml` 的 layout 分类。

---

## 主要功能

- 自动/手动同步 Chrome 书签到 WebDAV，格式为 `bookmarks.yaml`
- 只同步“书签栏”下的所有书签和文件夹，结构清晰
- 支持 WebDAV 服务器地址、用户名、密码、同步间隔自定义
- 同步后自动读取并补全 Homepage 的 `settings.yaml`，将所有书签分类补充到 `layout:` 下
- `common` 分类默认带有 `style: row`、`columns: 5`、`initiallyCollapsed: false`，如已存在则不覆盖
- 其他分类默认补全 `initiallyCollapsed: true`，如已存在则不覆盖
- 完全本地运行，隐私安全

---

## 安装与使用

### 1. 安装扩展

1. 克隆或下载本仓库到本地
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启“开发者模式”
4. 点击“加载已解压的扩展”，选择本项目文件夹

### 2. 配置 WebDAV

1. 点击扩展图标，进入“设置”
2. 填写 WebDAV 服务器地址**(homepage 的配置文件目录)**、用户名、密码、文件名（如 bookmarks.yaml）、同步间隔
3. 保存设置，可点击“测试连接”验证

### 3. 同步书签

- 扩展会定时自动同步，也可手动点击“立即同步”
- 同步后，WebDAV 服务器会生成/更新 `bookmarks.yaml` 和自动补全 `settings.yaml` 的 layout 分类

---

## 与 Homepage 项目集成

[gethomepage/homepage](https://github.com/gethomepage/homepage) 是一个强大的自托管起始页项目，支持通过 YAML 配置自定义服务、书签、分组布局等。

本扩展可自动生成 Homepage 兼容的 `bookmarks.yaml`，并自动补全 `settings.yaml` 的 layout 分类，无需手动维护分类。

**示例：同步后自动补全的 settings.yaml 片段**

```yaml
layout:
  common:
    style: row
    columns: 5
    initiallyCollapsed: false
  Developer:
    initiallyCollapsed: true
  Social:
    initiallyCollapsed: true
  Entertainment:
    initiallyCollapsed: true
```

如 layout 下已有 common 或其他分类，则不会覆盖原有设置。

---

## 隐私声明

- 所有 WebDAV 凭据仅存储于本地浏览器
- 书签数据仅上传到你指定的 WebDAV 服务器
- 扩展不会收集任何个人信息

---

## 许可证

MIT
