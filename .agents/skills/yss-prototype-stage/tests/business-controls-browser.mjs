import assert from 'node:assert/strict';
import {browserHarness,entry,layout,keyboardReach,reset} from './browser-harness.mjs';
await browserHarness('business-controls',async({page,check,capture})=>{
 const go=async(mode='combined-query',scene='primary')=>{await page.goto('about:blank');await page.goto(entry(mode,scene));};
 const select=async(id,term,choice)=>{await page.locator('#'+id).fill(term);await page.getByRole('option',{name:choice,exact:true}).click();};
 const editDates=async(id,start,end)=>{await page.locator('#'+id).click();await page.locator('#'+id+'-start').fill(start);await page.locator('#'+id+'-end').fill(end);};
 await check('S01-name-id-keyboard-ime-cancel',async()=>{
  await go();const input=page.locator('#query-owner');await input.fill('张明');assert.equal(await page.locator('[data-slot=combobox-list]').getByRole('option').count(),2);
  await input.dispatchEvent('compositionstart');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.equal(await page.locator('#query-owner-selected').textContent(),'未选择');await input.dispatchEvent('compositionend');
  await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.match(await page.locator('#query-owner-selected').textContent(),/U-00[12]/);
  const selected=await page.locator('#query-owner-selected').textContent();await input.fill('李华');await page.keyboard.press('Escape');assert.equal(await page.locator('#query-owner-selected').textContent(),selected);
  await select('query-owner','u-002','张明 · U-002');await page.getByRole('button',{name:'应用查询',exact:true}).click();assert.match(await page.locator('#applied-query').textContent(),/U-002.*共 1 条/);
  await input.fill('不存在');await page.getByText('无匹配选项，请更换名称或编号。',{exact:true}).waitFor();await page.keyboard.press('Escape');await page.getByRole('button',{name:'清空负责人',exact:true}).click();assert.equal(await page.locator('#query-owner-selected').textContent(),'未选择');await layout(page);
 });
 await check('S02-load-retry-disabled-invalid',async()=>{
  await go('combined-query','failure');await page.locator('#query-owner').fill('U-002');await page.getByRole('button',{name:'重试加载',exact:true}).click();assert.equal(await page.locator('#query-owner').inputValue(),'U-002');assert.match(await page.locator('#query-owner-selected').textContent(),/U-001/);await page.getByRole('option',{name:'张明 · U-002',exact:true}).click();
  await go('combined-query','loading');await page.locator('#query-owner').fill('张');await page.getByText('正在加载选项（固定评审状态）',{exact:true}).waitFor();assert.equal(await page.locator('[data-slot=combobox-list]').getByRole('option').count(),0);await page.keyboard.press('Escape');
  await go('combined-query','no-permission');assert(await page.locator('#query-owner').isDisabled());assert(await page.locator('#query-range').isDisabled());
  await go('combined-query','invalid-value');await page.getByRole('button',{name:'应用查询',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'query-owner');await page.keyboard.press('Escape');
  await go();await page.locator('#query-owner').fill('U-004');assert.equal(await page.locator('[data-slot=combobox-list]').getByRole('option').getAttribute('data-disabled'),'');await page.keyboard.press('Enter');assert.equal(await page.locator('#query-owner-selected').textContent(),'未选择');await page.keyboard.press('Escape');
 });
 await check('D01-validation-leap-same-day-inclusive',async()=>{
  await go();await editDates('query-range','2024-02-29','');await page.getByRole('button',{name:'应用日期',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'query-range-end');assert.equal(await page.locator('#query-range-summary').textContent(),'不限日期');
  await page.locator('#query-range-end').fill('2024-02-28');await page.getByRole('button',{name:'应用日期',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'query-range-start');
  await page.locator('#query-range-end').fill('2024-02-29');await page.getByRole('button',{name:'应用日期',exact:true}).click();assert.equal(await page.locator('#query-range-summary').textContent(),'2024-02-29 至 2024-02-29');await page.getByRole('button',{name:'应用查询',exact:true}).click();assert.match(await page.locator('#applied-query').textContent(),/共 1 条/);
  await editDates('query-range','2023-12-31','2025-01-01');await page.getByRole('button',{name:'应用日期',exact:true}).click();await page.getByRole('button',{name:'应用查询',exact:true}).click();assert.match(await page.locator('#applied-query').textContent(),/共 3 条/);
 });
 await check('D02-cancel-escape-clear-focus-calendar',async()=>{
  await go();await editDates('query-range','2024-02-29','2024-03-01');await page.getByRole('button',{name:'取消',exact:true}).click();assert.equal(await page.locator('#query-range-summary').textContent(),'不限日期');await page.waitForFunction(()=>document.activeElement.id==='query-range');
  await editDates('query-range','2024-12-31','2025-01-01');await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement.id==='query-range');assert.equal(await page.locator('#query-range-summary').textContent(),'不限日期');
  await page.locator('#query-range').click();const day=page.locator('[data-slot="range-calendar-trigger"]').filter({hasText:/^15$/});await day.click();await page.getByRole('button',{name:'应用日期',exact:true}).click();await page.getByRole('alert').filter({hasText:'请填写截止日期'}).waitFor();
  await day.click();await page.getByRole('button',{name:'应用日期',exact:true}).click();assert.equal(await page.locator('#query-range-summary').textContent(),'2024-02-15 至 2024-02-15');
  await page.locator('#query-range').click();await page.getByRole('button',{name:'清空临时日期',exact:true}).click();assert.equal(await page.locator('#query-range-summary').textContent(),'2024-02-15 至 2024-02-15');await page.getByRole('button',{name:'应用日期',exact:true}).click();assert.equal(await page.locator('#query-range-summary').textContent(),'不限日期');
 });
 await check('F01-form-text-not-value-save-retry',async()=>{
  await go('owner-validity');await page.locator('#validity-name').fill('维护示例');await page.locator('#form-owner').fill('张明');await page.keyboard.press('Escape');await page.getByRole('button',{name:'保存资料',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'form-owner');
  await go('owner-validity','failure');await page.locator('#validity-name').fill('维护示例');await editDates('form-range','2024-02-29','2025-01-01');await page.getByRole('button',{name:'应用日期',exact:true}).click();await page.getByRole('button',{name:'保存资料',exact:true}).click();await page.getByRole('alert').filter({hasText:'保存失败'}).waitFor();assert.match(await page.locator('#form-owner-selected').textContent(),/U-001/);assert.equal(await page.locator('#form-range-summary').textContent(),'2024-02-29 至 2025-01-01');await page.getByRole('button',{name:'重试保存',exact:true}).click();await page.getByText(/保存成功（本地模拟）：U-001/).waitFor();
 });
 await check('A01-reflow-keyboard-overlay-reset',async()=>{
  await go();await layout(page);await keyboardReach(page,'#query-owner');await keyboardReach(page,'#query-range');await page.keyboard.press('Enter');await layout(page);await capture('date-popover');await page.keyboard.press('Escape');await capture('query');
  await reset(page);await reset(page);assert.equal(await page.locator('#query-owner-selected').textContent(),'未选择');assert.equal(await page.locator('[data-slot="popover-content"]').count(),0);await layout(page);
 });
});
