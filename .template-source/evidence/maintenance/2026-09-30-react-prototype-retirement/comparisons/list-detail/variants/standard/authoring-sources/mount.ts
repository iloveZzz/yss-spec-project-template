import { createApp } from 'vue'
import Frame from './Frame.vue'
export function mount(page:any,title:string,appearance='standard'){
 document.documentElement.dataset.appearance=appearance
 const app=createApp(Frame,{page,title})
 app.config.errorHandler=(error)=>{(window as any).prototypeRuntime.showError(error)}
 app.mount('#app')
}
