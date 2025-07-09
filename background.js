// 定期同步的时间间隔（分钟）
const SYNC_INTERVAL_MINUTES = 60;

// 初始化扩展
chrome.runtime.onInstalled.addListener(() => {
  // 设置定时任务
  chrome.alarms.create("syncBookmarks", {
    periodInMinutes: SYNC_INTERVAL_MINUTES,
  });
  console.log(
    "书签同步扩展已安装，将每" + SYNC_INTERVAL_MINUTES + "分钟同步一次"
  );
});

// 监听定时器触发
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncBookmarks") {
    syncBookmarksToWebDAV();
  }
});

// 从存储中获取WebDAV配置
async function getWebDAVConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      {
        webdavUrl: "",
        username: "",
        password: "",
        filename: "bookmarks.json",
      },
      (items) => {
        resolve(items);
      }
    );
  });
}

// 获取所有书签
async function getAllBookmarks() {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      resolve(bookmarkTreeNodes);
    });
  });
}

// 引入js-yaml
importScripts("js-yaml.min.js");

// 递归处理书签树，生成分类结构
function flattenBookmarks(tree) {
  const categories = {};
  const common = [];

  function traverse(nodes, parent) {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        // 文件夹，提升为顶层分类
        if (node.title) {
          if (!categories[node.title]) categories[node.title] = [];
          traverse(node.children, node.title);
        } else {
          traverse(node.children, parent);
        }
      } else if (node.url) {
        // 书签
        const item = {
          icon: `https://www.google.com/s2/favicons?sz=64&domain=${getDomain(
            node.url
          )}`,
          href: node.url,
          description: " ",
        };
        if (parent && parent !== "common") {
          const arr = categories[parent];
          arr.push({ [node.title]: [item] });
        } else {
          common.push({ [node.title]: [item] });
        }
      }
    }
  }

  function getDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  }

  // 只处理书签栏（Bookmarks Bar）下的children
  if (tree && tree.length > 0 && tree[0].children) {
    const bar = tree[0].children.find(
      (n) => n.title === "书签栏" || n.title === "Bookmarks Bar"
    );
    if (bar && bar.children) {
      traverse(bar.children, "common");
    }
  }

  // common放在第一个
  const result = [];
  if (common.length > 0) {
    result.push({ common });
  }
  for (const [cat, arr] of Object.entries(categories)) {
    if (arr.length > 0) {
      result.push({ [cat]: arr });
    }
  }
  return result;
}

// 将书签同步到WebDAV服务器
async function syncBookmarksToWebDAV() {
  try {
    // 获取配置
    const config = await getWebDAVConfig();

    // 检查配置是否完整
    if (!config.webdavUrl || !config.username || !config.password) {
      console.log("WebDAV配置不完整，请在选项页面设置");
      return;
    }

    // 获取所有书签
    const bookmarks = await getAllBookmarks();

    // 处理为YAML格式
    const flat = flattenBookmarks(bookmarks);
    const yamlStr = jsyaml.dump(flat, { lineWidth: -1 });

    // 构建完整的WebDAV URL
    let baseUrl = config.webdavUrl;
    if (!baseUrl.endsWith("/")) {
      baseUrl += "/";
    }
    const bookmarksFile = config.filename.replace(/\.json$/, ".yaml");
    const bookmarksUrl = baseUrl + bookmarksFile;
    const settingsUrl = baseUrl + "settings.yaml";

    // 发送到WebDAV服务器
    const response = await fetch(bookmarksUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "text/yaml",
        Authorization: "Basic " + btoa(`${config.username}:${config.password}`),
      },
      body: yamlStr,
    });

    if (response.ok) {
      console.log("书签成功同步到WebDAV服务器");

      // 更新最后同步时间
      const now = new Date();
      chrome.storage.sync.set({
        lastSyncTime: now.toISOString(),
      });

      // --- 新增：同步后读取并合并settings.yaml ---
      // 1. 读取bookmarks.yaml
      const bookmarksRes = await fetch(bookmarksUrl, {
        method: "GET",
        headers: {
          Authorization:
            "Basic " + btoa(`${config.username}:${config.password}`),
        },
      });
      let bookmarkCats = [];
      if (bookmarksRes.ok) {
        const bookmarksText = await bookmarksRes.text();
        try {
          const bookmarksData = jsyaml.load(bookmarksText);
          if (Array.isArray(bookmarksData)) {
            bookmarkCats = bookmarksData.map((obj) => Object.keys(obj)[0]);
          }
        } catch (e) {
          console.error("解析bookmarks.yaml失败", e);
        }
      }
      // 2. 读取settings.yaml
      let settingsObj = {};
      let settingsText = "";
      let hasSettings = false;
      const settingsRes = await fetch(settingsUrl, {
        method: "GET",
        headers: {
          Authorization:
            "Basic " + btoa(`${config.username}:${config.password}`),
        },
      });
      if (settingsRes.ok) {
        settingsText = await settingsRes.text();
        try {
          settingsObj = jsyaml.load(settingsText) || {};
          hasSettings = true;
        } catch (e) {
          console.error("解析settings.yaml失败", e);
          settingsObj = {};
        }
      }
      // 3. 合并分类到layout
      if (!settingsObj.layout) settingsObj.layout = {};
      for (let i = 0; i < bookmarkCats.length; i++) {
        const cat = bookmarkCats[i];
        if (!settingsObj.layout.hasOwnProperty(cat)) {
          if (cat === "common") {
            settingsObj.layout[cat] = {
              style: "row",
              columns: 5,
              initiallyCollapsed: false,
            };
          } else {
            settingsObj.layout[cat] = {
              initiallyCollapsed: i === 0 ? false : true,
            };
          }
        }
      }
      // 4. 保存settings.yaml
      const newSettingsText = jsyaml.dump(settingsObj, { lineWidth: -1 });
      const putRes = await fetch(settingsUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "text/yaml",
          Authorization:
            "Basic " + btoa(`${config.username}:${config.password}`),
        },
        body: newSettingsText,
      });
      if (putRes.ok) {
        console.log("settings.yaml已合并并保存");
      } else {
        console.error(
          "settings.yaml保存失败",
          putRes.status,
          putRes.statusText
        );
      }
      // --- END ---
    } else {
      console.error("同步到WebDAV失败:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("同步书签时出错:", error);
  }
}

// 监听来自popup或options页面的手动同步请求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "syncNow") {
    syncBookmarksToWebDAV()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // 表示会异步发送响应
  }
});
