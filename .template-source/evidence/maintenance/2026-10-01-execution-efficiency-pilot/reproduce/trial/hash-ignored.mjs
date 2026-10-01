import fs from 'node:fs';import crypto from 'node:crypto';let p='inputs/ignored.json';console.log(fs.existsSync(p)?crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'):'missing');
