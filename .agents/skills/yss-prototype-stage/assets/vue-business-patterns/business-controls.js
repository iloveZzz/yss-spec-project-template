// Date-only fixture rules. No Date, UTC conversion or dependency on the run day.
export function validDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const [year,month,day]=value.split('-').map(Number);
 const leap=year%4===0&&(year%100!==0||year%400===0);
 return year>=1&&month>=1&&month<=12&&day>=1&&day<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
}
export function rangeError({start='',end=''}){
 if(!start&&!end)return null;
 if(!start)return {field:'start',message:'请填写起始日期'};
 if(!end)return {field:'end',message:'请填写截止日期'};
 if(!validDate(start))return {field:'start',message:'起始日期须为有效的 YYYY-MM-DD'};
 if(!validDate(end))return {field:'end',message:'截止日期须为有效的 YYYY-MM-DD'};
 if(start>end)return {field:'start',message:'起始日期不能晚于截止日期'};
 return null;
}
export function inRange(date,range){return !rangeError(range)&&validDate(date)&&(!range.start||(date>=range.start&&date<=range.end));}
export function filterOptions(options,query){const text=query.trim().toLocaleLowerCase('zh-CN');return options.filter(o=>`${o.name} ${o.id}`.toLocaleLowerCase('zh-CN').includes(text));}
export function selectedOption(options,id){return options.find(o=>o.id===id)||null;}
export function restoreControlFocus(id){
 const trigger=document.getElementById(id);
 const target=trigger?.isConnected&&trigger.getClientRects().length&&!trigger.closest('[hidden],[inert]')?trigger:document.querySelector('main[tabindex]');
 target?.focus();
}
