// 立即同步按钮
const syncNowButton = document.getElementById("syncNowButton");
// 打开选项页面按钮
const openOptionsButton = document.getElementById("openOptionsButton");
// 状态显示区域
const statusElement = document.getElementById("status");
// 上次同步时间显示
const lastSyncTimeElement = document.getElementById("lastSyncTime");

// 在弹出窗口加载时，显示上次同步时间
document.addEventListener("DOMContentLoaded", () => {
  // 获取上次同步时间
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

  // 检查WebDAV配置是否完整
  chrome.storage.sync.get(
    {
      webdavUrl: "",
      username: "",
      password: "",
    },
    (items) => {
      if (!items.webdavUrl || !items.username || !items.password) {
        showStatus("请先完成WebDAV设置", "error");
      }
    }
  );
});

// 立即同步按钮点击事件
syncNowButton.addEventListener("click", () => {
  showStatus("正在同步书签...", "");

  chrome.runtime.sendMessage({ action: "syncNow" }, (response) => {
    if (response && response.success) {
      showStatus("书签同步成功！", "success");

      // 更新上次同步时间显示
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
});

// 打开选项页面按钮点击事件
openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

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
  if (type === "success") {
    setTimeout(() => {
      statusElement.style.display = "none";
    }, 3000);
  }
}
