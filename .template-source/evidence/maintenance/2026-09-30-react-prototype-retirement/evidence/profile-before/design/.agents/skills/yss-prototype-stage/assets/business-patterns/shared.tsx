import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
export {React,useState};
export {Button} from '@/registry/new-york-v4/ui/button';
export {Input} from '@/registry/new-york-v4/ui/input';
export {Label} from '@/registry/new-york-v4/ui/label';
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
export function render(Page,title){
 function App(){
  function read(){try{return window.prototypeRuntime.initialize();}catch(e){window.prototypeRuntime.fail(e);return null;}}
  const [scene,setScene]=useState(read);
  useEffect(()=>{const reset=()=>setScene(read());addEventListener('hashchange',reset);return()=>removeEventListener('hashchange',reset);},[]);
  useEffect(()=>{if(scene)window.prototypeRuntime.ready(scene.ticket);},[scene]);
  if(!scene)return <main><h1>场景入口错误</h1><p role="alert">未知或缺失的场景，请检查评审链接。</p></main>;
  return <main><Breadcrumb aria-label="当前位置"><BreadcrumbList><BreadcrumbItem>维护教学</BreadcrumbItem><BreadcrumbSeparator/><BreadcrumbItem><BreadcrumbPage>{title}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb><header className="heading"><div><h1>{title}</h1><p className="muted">维护教学示例 · 虚构资料 · 保存与审批均为本地模拟</p></div></header><Page key={scene.ticket} scene={scene}/><details className="review-controls"><summary>评审场景</summary><label htmlFor="scenario">场景</label><select id="scenario" value={scene.id} onChange={e=>{location.hash=`scenario=${e.target.value}`;}}>{window.prototypeScenarios.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select><button id="reset" onClick={()=>setScene(read())}>重置场景</button></details></main>;
 }
 createRoot(document.getElementById('app')).render(<App/>);
}
export function Notice({children,error=false}){return children?<Alert role={error?'alert':'status'} className={`notice ${error?'error':''}`}><AlertDescription>{children}</AlertDescription></Alert>:null;}
