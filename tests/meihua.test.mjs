import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const candidates = [
  path.join(__dirname, '..', 'miniprogram', 'utils', 'meihua.js')
];
const corePath = candidates.find((candidate) => fs.existsSync(candidate));
assert.ok(corePath, '应能找到 miniprogram/utils/meihua.js');
const M = require(corePath);

test('梅花易数：10:27 报数起卦，主卦泽火革', () => {
  const result = M.calculateMeihua({ hour: 10, minute: 27 });

  assert.equal(result.upperSum, 10);
  assert.equal(result.lowerSum, 27);
  assert.equal(result.movingSum, 37);
  assert.equal(result.upperNumber, 2);
  assert.equal(result.lowerNumber, 3);
  assert.equal(result.movingLine, 1);
  assert.equal(result.movingLineText, '初九');

  assert.equal(result.main.name, '泽火革');
  assert.equal(result.main.upper.name, '兑');
  assert.equal(result.main.lower.name, '离');
  assert.equal(result.main.palace.name, '坎宫');
  assert.equal(result.mutual.name, '天风姤');
  assert.equal(result.mutual.palace.name, '乾宫');
  assert.equal(result.changed.name, '泽山咸');
  assert.equal(result.changed.palace.name, '兑宫');
  assert.equal(result.changed.lower.name, '艮');
});

test('梅花易数：时分余 0 取 8/6', () => {
  const result = M.calculateMeihua({ hour: 0, minute: 0 });
  assert.equal(result.upperNumber, 8);
  assert.equal(result.lowerNumber, 8);
  assert.equal(result.movingLine, 6);
  assert.equal(result.main.name, '坤为地');
  assert.equal(result.changed.name, '山地剥');
  assert.match(result.formula.upper, /余 0（取8）/);
  assert.match(result.formula.moving, /余 0（取6）/);
});

test('梅花易数：2026-10-21 10:27 四柱与旬空', () => {
  const result = M.calculateMeihua({
    hour: 10,
    minute: 27,
    solar: { year: 2026, month: 10, day: 21 },
    epoch: Date.UTC(2026, 9, 21, 2, 27, 0)
  });
  assert.deepEqual(
    result.pillars.map((pillar) => pillar.text + ' ' + pillar.xunKong + '空'),
    ['丙午年 寅卯空', '戊戌月 辰巳空', '戊辰日 戌亥空', '丁巳时 子丑空']
  );
  assert.match(M.formatMeihuaText(result, '测试所问'), /所问之事：测试所问/);
  assert.match(M.formatMeihuaText(result), /四柱：丙午年 寅卯空/);
});

test('梅花易数：卦线颜色按上下卦五行', () => {
  const result = M.calculateMeihua({ hour: 10, minute: 27 });
  assert.deepEqual(result.main.lines.map((line) => line.elementKey), [
    'fire', 'fire', 'fire', 'metal', 'metal', 'metal'
  ]);
  assert.equal(result.main.lines[0].moving, true);
  assert.equal(result.changed.lines[0].mark, '变');
});

test('梅花易数：八卦与六十四卦表完整', () => {
  assert.equal(M.TRIGRAMS.length, 8);
  assert.equal(Object.keys(M.HEXAGRAM_NAMES).length, 64);
  assert.deepEqual(M.TRIGRAMS.map((trigram) => trigram.name), ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']);
  const elements = new Set(M.TRIGRAMS.map((trigram) => trigram.element));
  assert.deepEqual([...elements].sort(), ['土', '木', '水', '火', '金'].sort());
});

test('梅花易数：宫位图覆盖后天八卦九宫并标出所用卦', () => {
  const result = M.calculateMeihua({ hour: 10, minute: 27 });
  assert.equal(result.palaceGrid.length, 9);
  assert.equal(result.palaceGrid.filter((cell) => cell.center).length, 1);
  const used = result.palaceGrid.filter((cell) => cell.used).map((cell) => cell.name);
  assert.deepEqual(used.sort(), ['兑', '乾', '离', '巽', '艮'].sort());
  const byName = {};
  for (const cell of result.palaceGrid) byName[cell.name] = cell;
  assert.deepEqual(byName['离'].roles, ['主下']);
  assert.deepEqual(byName['兑'].roles, ['主上', '变上']);
  assert.deepEqual(byName['乾'].roles, ['互上']);
  assert.deepEqual(byName['巽'].roles, ['互下']);
  assert.deepEqual(byName['艮'].roles, ['变下']);
});

test('梅花易数：随机时分不出现 NaN/undefined', () => {
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 7) {
      const result = M.calculateMeihua({ hour, minute });
      assert.ok(result.main.name && result.mutual.name && result.changed.name);
      assert.doesNotMatch(M.formatMeihuaText(result), /NaN|undefined/);
      assert.equal(result.hexagrams.length, 3);
    }
  }
});
