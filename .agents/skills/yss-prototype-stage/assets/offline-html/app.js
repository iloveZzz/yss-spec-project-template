(() => {
  const scenarios = window.prototypeScenarios;
  const form = document.querySelector('#editor');
  const content = document.querySelector('#content');
  const selector = document.querySelector('#scenario');
  const status = document.querySelector('#status');
  const save = document.querySelector('#save');
  const retry = document.querySelector('#retry');
  const reload = document.querySelector('#reload');
  let state;
  for (const scenario of scenarios) selector.add(new Option(scenario.label, scenario.id));
  function reset(id) {
    const scenario = scenarios.find(item => item.id === id) || scenarios[0];
    state = { ...scenario, retried: false };
    selector.value = scenario.id;
    content.value = scenario.content;
    content.readOnly = scenario.outcome === 'no-permission';
    save.disabled = content.readOnly;
    retry.hidden = true;
    reload.hidden = true;
    status.textContent = content.readOnly ? '当前没有编辑权限，可查看内容或切换场景。' : '可以编辑并保存。';
    document.body.dataset.scenario = scenario.id;
    document.body.dataset.state = content.readOnly ? 'no-permission' : 'editing';
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (content.readOnly || !form.reportValidity()) return;
    if (state.outcome === 'failure' && !state.retried) {
      status.textContent = '保存失败，输入已保留。请重试。';
      document.body.dataset.state = 'error';
      retry.hidden = false;
    } else if (state.outcome === 'conflict') {
      status.textContent = '内容已被更新，本地输入已保留。重新加载前可以复制当前内容。';
      document.body.dataset.state = 'conflict';
      reload.hidden = false;
    } else {
      status.textContent = '保存成功。';
      document.body.dataset.state = 'success';
      retry.hidden = true;
      save.focus();
    }
  });
  retry.addEventListener('click', () => { state.retried = true; form.requestSubmit(); });
  reload.addEventListener('click', () => { state.outcome = 'success'; content.value = '重新加载的最新内容'; reload.hidden = true; status.textContent = '已重新加载，可以继续编辑。'; document.body.dataset.state = 'editing'; content.focus(); });
  selector.addEventListener('change', () => { location.hash = `scenario=${selector.value}`; reset(selector.value); });
  document.querySelector('#reset').addEventListener('click', () => reset(selector.value));
  const selectedFromHash = () => new URLSearchParams(location.hash.slice(1)).get('scenario');
  window.addEventListener('hashchange', () => reset(selectedFromHash()));
  reset(selectedFromHash());
})();
