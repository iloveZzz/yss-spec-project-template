import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
export {React,useState};
export {Button} from '@/registry/new-york-v4/ui/button';
export {Input} from '@/registry/new-york-v4/ui/input';
export {Label} from '@/registry/new-york-v4/ui/label';
export {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/registry/new-york-v4/ui/select';
export {Badge} from '@/registry/new-york-v4/ui/badge';
export {Checkbox} from '@/registry/new-york-v4/ui/checkbox';
export {Textarea} from '@/registry/new-york-v4/ui/textarea';
export {Tabs,TabsList,TabsTrigger,TabsContent} from '@/registry/new-york-v4/ui/tabs';
export {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/registry/new-york-v4/ui/dialog';
export {Table,TableHeader,TableHead,TableBody,TableRow,TableCell} from '@/registry/new-york-v4/ui/table';

export {Card,CardHeader,CardTitle,CardDescription,CardContent,CardFooter} from '@/registry/new-york-v4/ui/card';
export {Separator} from '@/registry/new-york-v4/ui/separator';
export {Field,FieldLabel,FieldDescription,FieldError,FieldGroup,FieldSet,FieldLegend} from '@/registry/new-york-v4/ui/field';
export {InputGroup,InputGroupInput,InputGroupAddon,InputGroupText,InputGroupButton} from '@/registry/new-york-v4/ui/input-group';
export {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription,SheetFooter,SheetClose} from '@/registry/new-york-v4/ui/sheet';
export {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator} from '@/registry/new-york-v4/ui/dropdown-menu';
export {Pagination,PaginationContent,PaginationItem,PaginationLink} from '@/registry/new-york-v4/ui/pagination';
export {Tooltip,TooltipProvider,TooltipTrigger,TooltipContent} from '@/registry/new-york-v4/ui/tooltip';
export {Skeleton} from '@/registry/new-york-v4/ui/skeleton';
export {Spinner} from '@/registry/new-york-v4/ui/spinner';
import {Alert,AlertDescription} from '@/registry/new-york-v4/ui/alert';
import {Breadcrumb,BreadcrumbList,BreadcrumbItem,BreadcrumbSeparator,BreadcrumbPage} from '@/registry/new-york-v4/ui/breadcrumb';
export {Alert,AlertTitle,AlertDescription} from '@/registry/new-york-v4/ui/alert';
export {Empty,EmptyHeader,EmptyTitle,EmptyDescription} from '@/registry/new-york-v4/ui/empty';
import './patterns.css';
import './refinement.css';
import {Layers3,Files,ArrowRight,ShieldCheck} from 'lucide-react';
export function render(Page,title){
 function App(){
  function read(){try{return window.prototypeRuntime.initialize();}catch(e){window.prototypeRuntime.fail(e);return null;}}
  const [scene,setScene]=useState(read);
  useEffect(()=>{const reset=()=>setScene(read());addEventListener('hashchange',reset);return()=>removeEventListener('hashchange',reset);},[]);
  useEffect(()=>{if(scene)window.prototypeRuntime.ready(scene.ticket);},[scene]);
  if(!scene)return <main><h1>场景入口错误</h1><p role="alert">未知或缺失的场景，请检查评审链接。</p></main>;
  return <><a className="skip-link" href="#workspace">跳到工作区</a><header className="workspace-bar material-surface"><div className="workspace-brand"><span className="brand-mark"><Layers3 aria-hidden="true"/></span><strong>YSS 资料中心</strong><span className="workspace-divider"/><span className="workspace-context">业务工作台</span></div><span className="environment"><ShieldCheck aria-hidden="true"/>演示空间</span></header><main id="workspace" tabIndex={-1}><Breadcrumb aria-label="当前位置"><BreadcrumbList><BreadcrumbItem>资料中心</BreadcrumbItem><BreadcrumbSeparator/><BreadcrumbItem><BreadcrumbPage>{title}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb><header className="heading"><div><p className="page-eyebrow">{title==='查询与详情'?'查询 · 核对 · 查看':'填写 · 确认 · 提交'}</p><h1>{title}</h1><p className="muted">{title==='查询与详情'?'快速定位资料，在详情中核对完整信息。':'分两步完成资料录入，返回修改时保留已填内容。'}</p></div><span className="page-symbol" aria-hidden="true"><Files/></span></header><Page key={scene.ticket} scene={scene}/><footer className="workspace-footer"><span>虚构资料 · 本地模拟</span><span>数据仅保留在当前页面</span></footer><details className="review-controls"><summary>评审工具：场景与辅助显示</summary><div className="review-options"><label htmlFor="scenario">场景</label><select id="scenario" value={scene.id} onChange={e=>{location.hash=`scenario=${e.target.value}`;}}>{window.prototypeScenarios.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select><button id="reset" onClick={()=>setScene(read())}>重置场景</button><label className="transparency-option"><input type="checkbox" id="solid-surfaces" onChange={e=>{document.documentElement.dataset.transparency=e.target.checked?'reduced':'normal';}}/>减少透明效果</label></div></details></main></>;

 }
 createRoot(document.getElementById('app')).render(<App/>);
}
export function Notice({children,error=false}){return children?<Alert role={error?'alert':'status'} className={`notice ${error?'error':''}`}><AlertDescription>{children}</AlertDescription></Alert>:null;}
