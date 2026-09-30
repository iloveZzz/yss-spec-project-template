const root = document.documentElement;
const form = document.querySelector('[data-filter-form]');
const keyword = document.querySelector('[data-keyword]');
const status = document.querySelector('[data-status]');
const primary = document.querySelector('[data-primary-action]');
const dialog = document.querySelector('[data-dialog]');
const density = document.querySelector('[data-density-select]');
const live = document.querySelector('[data-live]');
const rows = [...document.querySelectorAll('tr[data-record]')];
const initial = rows.map(row => ({html: row.innerHTML, status: row.dataset.status}));
const initialPrimary = primary.textContent;
let origin;
function announce(text) { live.textContent = text; }
function applyFilters() {
  let visible = 0;
  for (const row of rows) {
    row.hidden = !row.dataset.search.includes(keyword.value.trim().toLowerCase()) || (status.value !== 'all' && row.dataset.status !== status.value);
    if (!row.hidden) visible++;
  }
  document.querySelector('[data-count]').textContent = `${visible} 条记录`;
  document.querySelector('[data-empty-row]').hidden = visible !== 0;
  announce(`筛选完成，共 ${visible} 条记录`);
}
form.addEventListener('submit', event => {event.preventDefault();applyFilters();});
density?.addEventListener('change', () => {root.dataset.density = density.value;document.querySelector('.density-chip').textContent = `${density.value} · 规范命名变体`;});
document.querySelector('[data-reset]').addEventListener('click', () => {
  form.reset();
  rows.forEach((row, i) => {row.innerHTML = initial[i].html;row.dataset.status = initial[i].status;});
  primary.textContent = initialPrimary;primary.disabled = false;
  dialog.close();
  if (density) {density.value = 'compact';density.dispatchEvent(new Event('change'));}
  applyFilters();keyword.focus();announce('完整演示初态已恢复');
});
primary.addEventListener('click', () => {primary.textContent = '演示完成';primary.disabled = true;announce('演示提交完成，未写入业务数据或规范');});
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.matches('[data-dialog-trigger]')) {origin = button;dialog.showModal();}
  if (button.matches('[data-dialog-close],[data-dialog-confirm]')) {
    dialog.close();
    if (button.matches('[data-dialog-confirm]')) announce('弹窗演示完成，未创建业务资料');
  }
  if (button.matches('[data-retry]')) {
    const row = button.closest('tr');row.dataset.status = 'processing';
    const label = row.querySelector('[data-row-status]');label.className = 'status-label status-processing';label.textContent = '处理中';
    button.textContent = '处理中';button.disabled = true;button.removeAttribute('data-retry');
    applyFilters();announce('本地重试演示进入处理中；重置可恢复初态');
  }
});
dialog.addEventListener('close', () => origin?.focus());
