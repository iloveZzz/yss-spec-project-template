(() => {
  const data = window.prototypeComparison;
  const $ = id => document.getElementById(id);
  let timer, frame, requestId, expected;
  document.title = $('title').textContent = data.title;
  for (const variant of data.variants) $('variant').add(new Option(variant.label, variant.id));
  for (const item of data.cases) $('case').add(new Option(item.label, item.id));
  function fail(message) {
    clearTimeout(timer); $('error').textContent = message; $('error').hidden = false;
    $('status').textContent = ''; $('preview').replaceChildren(); frame = null;
    $('direct').removeAttribute('href');
  }
  function render() {
    clearTimeout(timer); $('error').hidden = true;
    const hash = new URLSearchParams(location.hash.slice(1));
    const variantId = hash.has('variant') ? hash.get('variant') : data.variants[0].id;
    const caseId = hash.has('case') ? hash.get('case') : data.cases[0].id;
    const variant = data.variants.find(v => v.id === variantId);
    const scenario = data.cases.find(c => c.id === caseId);
    if (hash.getAll('variant').length>1 || hash.getAll('case').length>1 || !variant || !scenario || [...hash.keys()].some(k => !['variant', 'case'].includes(k))) { fail('比较链接无效：候选或场景不存在。请选择有效候选和场景。'); return; }
    $('variant').value = variant.id; $('case').value = scenario.id;
    const fragment = new URLSearchParams({ variant: variant.id, case: scenario.id }).toString();
    $('link').href = '#' + fragment;
    const url = variant.entry + '#scenario=' + encodeURIComponent(scenario.scenario);
    $('direct').href = url;
    // Replacing the frame discards all previous in-memory form and workflow state.
    frame = document.createElement('iframe');
    frame.title = `${variant.label} · ${scenario.label}`;
    // Ordinary local frames preserve file:// CSS/JS loading. This review UI is not a code sandbox.
    requestId=crypto.randomUUID(); expected=scenario;
    frame.onload=()=>frame?.contentWindow.postMessage({type:"yss-scenario-request",requestId},"*");
    frame.src = url;
    frame.onerror = () => fail('候选入口加载失败，请运行比较包 validate。');
    $('preview').replaceChildren(frame);
    $('status').textContent = '正在加载共同场景…';
    timer = setTimeout(() => fail('候选未能加载，请检查入口或资源，并运行比较包 validate。'), 8000);
  }
  window.addEventListener('message', event => {
    if (!frame || event.source !== frame.contentWindow || event.data?.type !== 'yss-scenario-result' || event.data.requestId !== requestId) return;
    const result=event.data;
    if(result.status==='error'){fail(`候选初始化失败：${result.error}`);return;}
    if(result.status==='pending')return;
    if(result.status!=='ready'||result.scenarioId!==expected.scenario||result.dataDigest!==expected.dataDigest){fail('候选初始化场景或数据不一致。');return;}
    clearTimeout(timer); $('status').textContent = '场景已初始化；实际业务行为仍须评审。';
  });
  function select() {
    const next = new URLSearchParams({ variant: $('variant').value, case: $('case').value }).toString();
    if (location.hash.slice(1) === next) render(); else location.hash = next;
  }
  $('variant').addEventListener('change', select); $('case').addEventListener('change', select);
  $('reset').addEventListener('click', render); window.addEventListener('hashchange', render); render();
})();
