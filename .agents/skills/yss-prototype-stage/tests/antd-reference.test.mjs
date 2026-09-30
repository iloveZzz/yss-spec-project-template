// Compatibility entry: same strict implementation, including mandatory Vue builds.
import {verifyPrototypeDesign} from '../scripts/verify-prototype-design.mjs';
const report=await verifyPrototypeDesign({scope:'contract'});
if(report.status!=='passed')throw Error('原型验证未通过: '+report.output+'/report.json');
