// 保存设置按钮
const saveButton = document.getElementById("saveButton");
// 测试连接按钮
const testButton = document.getElementById("testButton");
// 立即同步按钮
const syncNowButton = document.getElementById("syncNowButton");
// 状态显示区域
const statusElement = document.getElementById("status");
// 上次同步时间显示
const lastSyncTimeElement = document.getElementById("lastSyncTime");

// 在页面加载时，加载保存的设置
document.addEventListener("DOMContentLoaded", loadOptions);

// 为按钮添加事件监听器
saveButton.addEventListener("click", saveOptions);
testButton.addEventListener("click", testConnection);
syncNowButton.addEventListener("click", syncNow);

// 加载保存的设置
function loadOptions() {
  chrome.storage.sync.get(
    {
      webdavUrl: "",
      username: "",
      password: "",
      filename: "bookmarks.json",
      syncInterval: 60,
      lastSyncTime: null,
    },
    (items) => {
      document.getElementById("webdavUrl").value = items.webdavUrl;
      document.getElementById("username").value = items.username;
      document.getElementById("password").value = items.password;
      document.getElementById("filename").value = items.filename;
      document.getElementById("syncInterval").value = items.syncInterval;

      // 显示上次同步时间
      if (items.lastSyncTime) {
        const lastSync = new Date(items.lastSyncTime);
        lastSyncTimeElement.textContent = lastSync.toLocaleString();
      }
    }
  );
}

// 保存设置
function saveOptions() {
  const webdavUrl = document.getElementById("webdavUrl").value;
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const filename =
    document.getElementById("filename").value || "bookmarks.json";
  const syncInterval =
    parseInt(document.getElementById("syncInterval").value) || 60;

  chrome.storage.sync.set(
    {
      webdavUrl,
      username,
      password,
      filename,
      syncInterval,
    },
    () => {
      // 更新同步间隔
      chrome.alarms.create("syncBookmarks", {
        periodInMinutes: syncInterval,
      });

      // 显示成功消息
      showStatus("设置已保存", "success");
    }
  );
}

// 测试WebDAV连接
async function testConnection() {
  const webdavUrl = document.getElementById("webdavUrl").value;
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (!webdavUrl || !username || !password) {
    showStatus("请填写所有必要的WebDAV信息", "error");
    return;
  }

  showStatus("正在测试连接...", "");

  try {
    // 构建测试URL
    let url = webdavUrl;
    if (!url.endsWith("/")) {
      url += "/";
    }

    // 发送OPTIONS请求检查服务器是否可用
    const response = await fetch(url, {
      method: "OPTIONS",
      headers: {
        Authorization: "Basic " + btoa(`${username}:${password}`),
      },
    });

    if (response.ok) {
      showStatus("连接成功！WebDAV服务器可用。", "success");
    } else {
      showStatus(
        `连接失败：${response.status} ${response.statusText}`,
        "error"
      );
    }
  } catch (error) {
    showStatus(`连接错误：${error.message}`, "error");
  }
}

// 立即同步书签
function syncNow() {
  showStatus("正在同步书签...", "");

  chrome.runtime.sendMessage({ action: "syncNow" }, (response) => {
    if (response && response.success) {
      showStatus("书签同步成功！", "success");
      // 更新上次同步时间
      chrome.storage.sync.get(
        {
          lastSyncTime: null,
        },
        (items) => {
          if (items.lastSyncTime) {
            const lastSync = new Date(items.lastSyncTime);
            lastSyncTimeElement.textContent = lastSync.toLocaleString();
          }
        }
      );
    } else {
      const errorMsg = response && response.error ? response.error : "未知错误";
      showStatus(`同步失败：${errorMsg}`, "error");
    }
  });
}

// 显示状态消息
function showStatus(message, type) {
  statusElement.textContent = message;
  statusElement.style.display = "block";

  // 清除之前的所有类
  statusElement.className = "status";

  if (type) {
    statusElement.classList.add(type);
  }

  // 如果是成功或错误消息，3秒后自动隐藏
  if (type === "success" || type === "error") {
    setTimeout(() => {
      statusElement.style.display = "none";
    }, 3000);
  }
}
