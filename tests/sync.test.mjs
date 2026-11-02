import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

for (const file of ['xiaoliuren.js', 'meihua.js']) {
  test(`共享核心与小程序副本一致：${file}`, () => {
    const core = fs.readFileSync(path.join(root, 'core', file), 'utf8');
    const mini = fs.readFileSync(path.join(root, 'miniprogram', 'utils', file), 'utf8');
    assert.equal(mini, core, '请运行 npm run sync:core');
  });
}
