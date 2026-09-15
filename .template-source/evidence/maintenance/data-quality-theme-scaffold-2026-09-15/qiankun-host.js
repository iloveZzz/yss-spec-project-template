import {loadMicroApp} from 'qiankun';
let app;
window.mountFixture = async () => { app=loadMicroApp({name:'dq-demo',entry:'/micro/index.html',container:'#micro',props:{bridgeVersion:1,routerBase:'/dq-demo',themeConfig:{mode:{dark:false,compact:false}}}},{sandbox:{experimentalStyleIsolation:true},singular:true});await app.mountPromise; };
window.updateFixture = async config => {await app.update({bridgeVersion:1,themeConfig:config});};
window.unmountFixture = async () => {await app.unmount();};
