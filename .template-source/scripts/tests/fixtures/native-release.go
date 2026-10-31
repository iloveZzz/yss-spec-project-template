// Synthetic bounded publication-consumer fixture, never a production CLI.
// It exercises real Go compilation and the public envelope/Bundle boundary.
package main

import (
 "crypto/sha256"
 "encoding/hex"
 "encoding/json"
 "fmt"
 "os"
 "os/exec"
 "path/filepath"
 "strings"
)
var cliCommit, templateCommit, designCommit, backendCommit, frontendCommit string
const version="3.1.0"
const agents="# Synthetic publication fixture\n"
func digest(b []byte) string { d:=sha256.Sum256(b);return hex.EncodeToString(d[:]) }
func jsonBytes(v any) []byte { b,e:=json.Marshal(v);must(e);return b }
func must(e error) { if e!=nil { panic(e) } }
func put(root,ref string,b []byte) { file:=filepath.Join(root,ref);must(os.MkdirAll(filepath.Dir(file),0755));must(os.WriteFile(file,b,0644)) }
func template(profile string) string { switch profile {case "design":return designCommit;case "backend":return backendCommit;case "frontend":return frontendCommit};return templateCommit }
func assets(profile string) map[string]string { files:=map[string]string{"AGENTS.md":agents,"CONTEXT.md":"# Synthetic context\n","yss-project.yaml":"schema_version: 1\nrepository_mode: project-instance\n",".agents/skills/yss-product-lifecycle/SKILL.md":"# Synthetic managed lifecycle\n"};if profile=="backend" { files["scripts/sync-skills"]="process.exit(0)\n";files["scripts/update-skill-lock"]="process.exit(0)\n" };return files }
func managedRef(profile string) string { if profile=="spec" { return ".agents/skills/yss-product-lifecycle/SKILL.md" };return "scripts/sync-skills" }
func inspection(profile string) map[string]any { files:=map[string]any{};for ref,data:=range assets(profile){files[ref]=map[string]any{"digest":digest([]byte(data)),"mode":420,"ownership":"managed","size":len(data)}};return map[string]any{"schemaVersion":2,"profile":profile,"templateCommit":template(profile),"templateVersion":"5.1.0","sourceState":"committed","sourceSnapshotHash":digest([]byte(profile+template(profile))),"manifestHash":digest([]byte("manifest:"+profile)),"bundleHash":digest([]byte("bundle:"+profile)),"files":files,"manifest":map[string]any{},"distribution":map[string]any{},"producer":map[string]any{"version":version,"commit":cliCommit,"sourceState":"committed"}} }
func metadata(profile string) []byte { ref:=managedRef(profile);baseline:=map[string]any{"type":"file","digest":digest([]byte(assets(profile)[ref])),"mode":420};managed:=map[string]any{ref:map[string]any{"baseline":baseline,"lastApplied":baseline,"ownership":"managed"}};return jsonBytes(map[string]any{"schemaVersion":1,"profile":profile,"templateCommit":template(profile),"managedFiles":managed,"baselineDigest":digest(jsonBytes(managed))}) }
func main(){values:=map[string]string{};pos:=[]string{};for i:=1;i<len(os.Args);i++{a:=os.Args[i];if len(a)>2&&a[:2]=="--"{key:=a[2:];if key=="json"||key=="plan"||key=="apply"{values[key]="true"}else{i++;values[key]=os.Args[i]}}else{pos=append(pos,a)}};command:=pos[0];profile:=values["profile"];if profile==""{profile="spec"};root:=values["root"];result:=map[string]any{};code:="OK";status:="ok"
 switch command {
 case "version":result=map[string]any{"version":version,"protocolVersion":1,"cliCommit":cliCommit,"sourceState":"committed"}
 case "bundle":
  if pos[1]=="inspect"{result=inspection(profile)}else{out:=values["out"];if _,e:=os.Lstat(out);e==nil{code="EXISTS";status="error";break};must(os.MkdirAll(out,0755));files:=[]any{};for ref,data:=range assets(profile){put(out,ref,[]byte(data));files=append(files,map[string]any{"path":ref,"digest":digest([]byte(data)),"mode":420,"ownership":"managed","size":len(data)})};manifest:=filepath.Join(out,".yss-bundle.json");must(os.WriteFile(manifest,jsonBytes(inspection(profile)),0644));result=map[string]any{"inspection":inspection(profile),"directory":out,"manifestPath":manifest,"files":files}}
 case "init","attach":
  if values["apply"]=="true"{for ref,data:=range assets(profile){put(root,ref,[]byte(data))};put(root,".yss.json",metadata(profile));result=map[string]any{"status":"applied"}}else{result=map[string]any{"command":command,"stats":map[string]any{"changed":len(assets(profile)),"conflicts":0}};if out:=values["out"];out!=""{must(os.WriteFile(out,jsonBytes(result),0644))}}
 case "doctor","diff":
  conflicts:=0;if os.Getenv("YSS_FIXTURE_DRIFT")==command { conflicts=1 }
  result=map[string]any{"command":command,"stats":map[string]any{"changed":0,"conflicts":conflicts},"readiness":map[string]any{"files":"aligned","skills":map[string]any{"status":"ready"}}};if out:=values["out"];out!=""{must(os.WriteFile(out,jsonBytes(result),0644))}
 case "sync":
  // Match the public sync plan/apply contract; an unchanged plan has no changes.
  head,e:=exec.Command("git","-C",root,"rev-parse","--verify","HEAD").CombinedOutput();if e!=nil||len(strings.TrimSpace(string(head)))!=40{code="BASELINE";status="error";break}
  work,e:=exec.Command("git","-C",root,"status","--porcelain","--untracked-files=all").CombinedOutput();if e!=nil||strings.TrimSpace(string(work))!=""{code="CONFLICT";status="error";break}
  ref:=managedRef(profile);current,e:=os.ReadFile(filepath.Join(root,ref));must(e);changes:=[]any{}
  if string(current)!=assets(profile)[ref]{changes=append(changes,map[string]any{"path":ref})}
  if values["apply"]=="true"{
   if len(changes)>0{before,e:=os.ReadFile(filepath.Join(root,".yss.json"));must(e);put(root,".fixture-before-metadata",before);put(root,".fixture-before-managed",current);put(root,ref,[]byte(assets(profile)[ref]));put(root,".yss.json",metadata(profile))}
   result=map[string]any{"status":"applied"}
  }else{result=map[string]any{"command":command,"changes":changes,"stats":map[string]any{"changed":len(changes),"conflicts":0}};if out:=values["out"];out!=""{must(os.WriteFile(out,jsonBytes(result),0644))}}
 case "rollback":
  if values["apply"]!="true"{code="ARGUMENT";status="error";break}
  before,e:=os.ReadFile(filepath.Join(root,".fixture-before-metadata"));must(e);put(root,".yss.json",before);var meta struct{Profile string `json:"profile"`};must(json.Unmarshal(before,&meta));before,e=os.ReadFile(filepath.Join(root,".fixture-before-managed"));must(e);put(root,managedRef(meta.Profile),before);result=map[string]any{"status":"rolled-back"}
 default:code="ARGUMENT";status="error"
 }
 fmt.Println(string(jsonBytes(map[string]any{"outputVersion":1,"protocolVersion":1,"version":version,"command":command,"profile":profile,"status":status,"code":code,"result":result})));if code!="OK"{os.Exit(1)}
}
