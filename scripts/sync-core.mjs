import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['xiaoliuren.js', 'meihua.js'];

for (const file of files) {
  const source = path.join(root, 'core', file);
  const target = path.join(root, 'miniprogram', 'utils', file);
  fs.copyFileSync(source, target);
  console.log(`synced core/${file} -> miniprogram/utils/${file}`);
}
