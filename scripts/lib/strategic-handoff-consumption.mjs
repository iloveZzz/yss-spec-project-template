import {nativeHandoffConsumption} from './native-evidence.mjs';
export async function verifyConsumption(data,{root=process.cwd(),sliceRef,consumer='tactical',native}={}) {
 if(native===false)throw new TypeError('NATIVE_REQUIRED: 战略消费不再支持进程内校验');
 return nativeHandoffConsumption({root,data,sliceRef,consumer});
}
