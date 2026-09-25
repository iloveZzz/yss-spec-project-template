const root = document.documentElement;
const filterForm = document.querySelector("[data-filter-form]");
const keywordInput = document.querySelector("[data-keyword]");
const statusSelect = document.querySelector("[data-status]");
const resetButton = document.querySelector("[data-reset]");
const primaryButton = document.querySelector("[data-primary-action]");
const count = document.querySelector("[data-count]");
const emptyRow = document.querySelector("[data-empty-row]");
const dialog = document.querySelector("[data-dialog]");
const dialogTriggers = document.querySelectorAll("[data-dialog-trigger]");
const dialogCloseButtons = document.querySelectorAll("[data-dialog-close]");
const liveRegion = document.querySelector("[data-live]");
const dataRows = [...document.querySelectorAll("tbody tr[data-record]")];

function announce(message) {
  liveRegion.textContent = message;
}

function applyFilters() {
  const keyword = keywordInput.value.trim().toLowerCase();
  const status = statusSelect.value;
  let visible = 0;

  dataRows.forEach((row) => {
    const matchesKeyword = !keyword || row.dataset.search.includes(keyword);
    const matchesStatus = status === "all" || row.dataset.status === status;
    const matches = matchesKeyword && matchesStatus;
    row.hidden = !matches;
    if (matches) visible += 1;
  });

  count.textContent = `${visible} 条记录`;
  emptyRow.hidden = visible !== 0;
  announce(`筛选完成，共 ${visible} 条记录`);
}

filterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  applyFilters();
});

resetButton.addEventListener("click", () => {
  keywordInput.value = "";
  statusSelect.value = "all";
  applyFilters();
  keywordInput.focus();
  announce("筛选条件已重置");
});

primaryButton.addEventListener("click", () => {
  const completedLabel = root.classList.contains("dark") ? "已发布" : "已保存";
  primaryButton.textContent = completedLabel;
  primaryButton.disabled = true;
  announce(`${completedLabel}，操作已完成`);
});

dialogTriggers.forEach((button) => button.addEventListener("click", () => dialog.showModal()));
dialogCloseButtons.forEach((button) => button.addEventListener("click", () => dialog.close()));

document.querySelectorAll("[data-retry]").forEach((button) => {
  button.addEventListener("click", () => {
    const row = button.closest("tr");
    const status = row.querySelector("[data-row-status]");
    row.dataset.status = "processing";
    status.className = "status-label status-processing";
    status.textContent = "处理中";
    button.textContent = "查看";
    button.removeAttribute("data-retry");
    announce("失败任务已重新提交，当前正在处理中");
  });
});
