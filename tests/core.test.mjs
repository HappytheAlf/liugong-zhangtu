import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, '..', 'web', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const coreMatch = html.match(/\/\* ==== CORE START ==== \*\/([\s\S]*?)\/\* ==== CORE END ==== \*\//);

assert.ok(coreMatch, 'index.html 中应存在 CORE START / CORE END 标记');

// 在当前 realm 执行，避免 vm 跨 realm 导致 deepEqual 的原型不一致。
delete globalThis.XLRCore;
new Function(coreMatch[1])();
const X = globalThis.XLRCore;
assert.ok(X, '核心脚本应导出 XLRCore');

function pickLunar(value) {
  return { year: value.year, month: value.month, day: value.day, isLeap: value.isLeap };
}

function pickSolar(value) {
  return { year: value.year, month: value.month, day: value.day };
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('六宫顺序、五行与方位固定', () => {
  assert.deepEqual(X.PALACES.map((item) => item.name), ['大安', '留连', '速喜', '赤口', '小吉', '空亡']);
  assert.equal(X.PALACES.length, 6);
  for (const palace of X.PALACES) {
    assert.ok(['木', '火', '土', '金', '水'].includes(palace.element));
    assert.ok(['东', '南', '西', '北', '中'].includes(palace.direction));
  }
  assert.equal(X.PALACES[4].name, '小吉');
  assert.equal(X.PALACES[4].element, '木');
  assert.equal(X.PALACES[5].name, '空亡');
  assert.equal(X.PALACES[5].element, '土');
});

test('两宫顺数：日起大安，日上起时', () => {
  assert.deepEqual(X.calculatePositions(1, 0), { dayPos: 0, hourPos: 0 });
  assert.deepEqual(X.calculatePositions(5, 4), { dayPos: 4, hourPos: 2 });
  assert.deepEqual(X.calculatePositions(23, 6), { dayPos: 4, hourPos: 4 });
  assert.deepEqual(X.calculatePositions(30, 11), { dayPos: 5, hourPos: 4 });
  assert.deepEqual(X.calculatePositions(28, 5), { dayPos: 3, hourPos: 2 });
  assert.deepEqual(X.calculatePositions(30, 11), { dayPos: 5, hourPos: 4 });
});

test('三月初五辰时：日小吉、时速喜', () => {
  const chart = X.buildChartFromLunar({
    year: 2025,
    month: 3,
    day: 5,
    isLeap: false,
    hourIndex: 4,
    mode: '测试'
  });
  assert.equal(chart.dayPalace.name, '小吉');
  assert.equal(chart.hourPalace.name, '速喜');
  assert.equal(chart.finalPalace.name, '速喜');
});

test('传统六宫掌图：日起大安、日上起时、排支、六神与五星', () => {
  const chart = X.buildChartFromGregorian({
    year: 2026,
    month: 10,
    day: 19,
    hour: 16,
    minute: 0,
    second: 0,
    mode: '测试'
  });
  assert.deepEqual(pickLunar(chart.lunar), { year: 2026, month: 9, day: 10, isLeap: false });
  assert.equal(chart.dayPalace.name, '赤口');
  assert.equal(chart.hourPalace.name, '空亡');

  const advanced = X.getAdvancedChart(chart);
  assert.deepEqual(advanced.grid, [[1, 2, 3], [0, 5, 4]]);
  assert.equal(advanced.dayStartPos, 0);
  assert.equal(advanced.hourStartPos, 3);
  assert.equal(advanced.finalPos, 5);
  assert.equal(advanced.starStartPos, 3);

  const byName = {};
  for (const cell of advanced.cells) byName[cell.palace.name] = cell;

  assert.deepEqual(byName['大安'].markers.map((m) => m.label), []);
  assert.deepEqual(byName['留连'].markers.map((m) => m.label), []);
  assert.deepEqual(byName['速喜'].markers.map((m) => m.label), []);
  assert.deepEqual(byName['赤口'].markers.map((m) => m.label), ['日']);
  assert.deepEqual(byName['小吉'].markers.map((m) => m.label), []);
  assert.deepEqual(byName['空亡'].markers.map((m) => m.label), ['时']);

  assert.equal(byName['大安'].star, '金');
  assert.equal(byName['留连'].star, '水');
  assert.equal(byName['速喜'].star, '空');
  assert.equal(byName['赤口'].star, '木');
  assert.equal(byName['小吉'].star, '火');
  assert.equal(byName['空亡'].star, '土');

  assert.equal(byName['大安'].primary.name, '戌');
  assert.deepEqual(byName['大安'].primary.stems, ['戊', '辛', '丁']);
  assert.equal(byName['大安'].primary.bagua, '乾');
  assert.equal(byName['大安'].deity, '螣蛇');
  assert.equal(byName['大安'].relative, '兄弟');

  assert.equal(byName['留连'].primary.name, '子');
  assert.deepEqual(byName['留连'].primary.stems, ['癸']);
  assert.equal(byName['留连'].primary.bagua, '坎');
  assert.equal(byName['留连'].deity, '玄武');
  assert.equal(byName['留连'].relative, '子孙');

  assert.equal(byName['速喜'].primary.name, '寅');
  assert.deepEqual(byName['速喜'].primary.stems, ['甲', '丙', '戊']);
  assert.equal(byName['速喜'].primary.bagua, '艮');
  assert.equal(byName['速喜'].deity, '青龙');
  assert.equal(byName['速喜'].relative, '妻财');

  assert.equal(byName['赤口'].primary.name, '辰');
  assert.deepEqual(byName['赤口'].primary.stems, ['戊', '乙', '癸']);
  assert.equal(byName['赤口'].primary.bagua, '巽');
  assert.equal(byName['赤口'].deity, '勾陈');
  assert.equal(byName['赤口'].relative, '父母');

  assert.equal(byName['小吉'].primary.name, '午');
  assert.deepEqual(byName['小吉'].primary.stems, ['丁', '己']);
  assert.equal(byName['小吉'].primary.bagua, '离');
  assert.equal(byName['小吉'].deity, '朱雀');
  assert.equal(byName['小吉'].relative, '官鬼');

  assert.equal(byName['空亡'].primary.name, '申');
  assert.deepEqual(byName['空亡'].primary.stems, ['庚', '壬', '戊']);
  assert.equal(byName['空亡'].primary.bagua, '坤');
  assert.equal(byName['空亡'].deity, '白虎');
  assert.equal(byName['空亡'].relative, '自身');

  const text = X.formatChartText(chart);
  assert.match(text, /六宫掌图/);
  assert.match(text, /空亡\[白虎·土·自身\]/);
  assert.match(text, /申庚壬戊\(☷坤\)/);
  assert.match(text, /后天八卦/);
  assert.match(text, /六亲：时宫为自身/);
  assert.match(text, /日=日落宫，时=时落宫/);
  assert.match(text, /五星：从赤口起木/);
  assert.doesNotMatch(text, /月落宫|月宫：/);
  assert.doesNotMatch(text, /NaN|undefined/);
});

test('十二地支对应的后天八卦', () => {
  const expected = {
    子: '坎', 丑: '艮', 寅: '艮', 卯: '震',
    辰: '巽', 巳: '巽', 午: '离', 未: '坤',
    申: '坤', 酉: '兑', 戌: '乾', 亥: '乾'
  };
  for (const branch of X.BRANCHES) {
    assert.equal(branch.bagua, expected[branch.name], branch.name + ' 的八卦');
  }
});

test('十二地支对应的八卦符号', () => {
  const expected = {
    子: '☵', 丑: '☶', 寅: '☶', 卯: '☳',
    辰: '☴', 巳: '☴', 午: '☲', 未: '☷',
    申: '☷', 酉: '☱', 戌: '☰', 亥: '☰'
  };
  for (const branch of X.BRANCHES) {
    assert.equal(branch.symbol, expected[branch.name], branch.name + ' 的八卦符号');
  }
});

test('十二地支的藏干顺序', () => {
  const expected = {
    子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
    辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
    申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲']
  };
  for (const branch of X.BRANCHES) {
    assert.deepEqual(branch.stems, expected[branch.name], branch.name + ' 的藏干');
  }
});

test('十二时辰的掌图排支与标记始终完整', () => {
  for (let hourIndex = 0; hourIndex < 12; hourIndex += 1) {
    const chart = X.buildChartFromLunar({ year: 2026, month: 9, day: 10, isLeap: false, hourIndex });
    const advanced = X.getAdvancedChart(chart);
    assert.equal(advanced.cells.length, 6);
    assert.ok(advanced.cells[chart.positions.dayPos].markers.some((m) => m.label === '日'));
    assert.ok(advanced.cells[advanced.finalPos].markers.some((m) => m.label === '时'));
    assert.equal(advanced.cells
      .flatMap((cell) => cell.markers.map((marker) => marker.label))
      .sort()
      .join(''), ['日', '时'].sort().join(''));
    assert.equal(advanced.cells[advanced.finalPos].relative, '自身');
    for (let step = 0; step < 6; step += 1) {
      const cell = advanced.cells[(advanced.finalPos + step) % 6];
      assert.ok(cell.primary && cell.deity && cell.star && cell.relative);
      assert.equal(cell.primary.index, (hourIndex + step * 2) % 12);
      assert.ok(cell.primary.stems.length >= 1);
      assert.doesNotMatch(cell.deity + cell.primary.name + cell.primary.stems.join('') + cell.primary.bagua + cell.relative, /undefined|NaN/);
    }
    assert.doesNotMatch(X.formatChartText(chart), /NaN|undefined/);
  }
});

test('自身为土时按同类土支取兄弟', () => {
  const chart = X.buildChartFromLunar({
    year: 2026,
    month: 9,
    day: 10,
    isLeap: false,
    hourIndex: 1
  });
  const advanced = X.getAdvancedChart(chart);
  const self = advanced.cells[advanced.finalPos];
  assert.equal(self.primary.name, '丑');
  assert.equal(self.primary.element, '土');
  assert.equal(self.relative, '自身');
  const relatives = {};
  for (const cell of advanced.cells) relatives[cell.palace.name] = cell.relative;
  assert.equal(relatives['小吉'], '自身');
  assert.equal(relatives['空亡'], '官鬼');
  assert.equal(relatives['大安'], '父母');
  assert.equal(relatives['留连'], '兄弟');
  assert.equal(relatives['速喜'], '子孙');
  assert.equal(relatives['赤口'], '妻财');
});

test('闰月不影响起宫', () => {
  const regular = X.buildChartFromLunar({ year: 2025, month: 6, day: 1, isLeap: false, hourIndex: 0 });
  const leap = X.buildChartFromLunar({ year: 2025, month: 6, day: 1, isLeap: true, hourIndex: 0 });
  assert.deepEqual(regular.positions, leap.positions);
  assert.equal(regular.dayPalace.name, leap.dayPalace.name);
  assert.equal(regular.hourPalace.name, leap.hourPalace.name);
  assert.equal(regular.lunar.isLeap, false);
  assert.equal(leap.lunar.isLeap, true);
  assert.equal(X.getLeapMonth(2025), 6);
  assert.equal(X.getLeapMonth(2024), 0);
});

test('农历日期校验：闰月、三十日、越界', () => {
  assert.equal(X.validateLunarDate(2025, 6, 30, false).ok, true);
  assert.equal(X.validateLunarDate(2025, 6, 30, true).ok, false);
  assert.equal(X.validateLunarDate(2024, 2, 1, true).ok, false);
  assert.equal(X.validateLunarDate(2025, 13, 1, false).ok, false);
  assert.equal(X.validateLunarDate(2025, 1, 0, false).ok, false);
  assert.equal(X.validateLunarDate(2025, 1, 31, false).ok, false);
  assert.equal(X.validateLunarDate(2025, 1, 1, 'false').ok, false);

  assert.throws(
    () => X.buildChartFromLunar({ year: 2025, month: 6, day: 30, isLeap: true, hourIndex: 0 }),
    /农历日必须是 1–29 的整数/
  );
  assert.throws(
    () => X.buildChartFromLunar({ year: 2024, month: 2, day: 1, isLeap: true, hourIndex: 0 }),
    /没有闰二月/
  );
  assert.throws(() => X.calculatePositions(0, 0), /农历日必须是 1–30 的整数/);
  assert.throws(() => X.calculatePositions(31, 0), /农历日必须是 1–30 的整数/);
  assert.throws(() => X.calculatePositions(1, 12), /时辰必须是 0–11 的整数/);
  assert.throws(() => X.calculatePositions('1', 0), /农历日必须是 1–30 的整数/);
});

test('公历转农历：已知春节与闰月', () => {
  assert.deepEqual(pickLunar(X.solarToLunar(2024, 2, 10)), { year: 2024, month: 1, day: 1, isLeap: false });
  assert.deepEqual(pickLunar(X.solarToLunar(2023, 1, 22)), { year: 2023, month: 1, day: 1, isLeap: false });
  assert.deepEqual(pickLunar(X.solarToLunar(2023, 3, 22)), { year: 2023, month: 2, day: 1, isLeap: true });
  assert.deepEqual(pickLunar(X.solarToLunar(2025, 1, 29)), { year: 2025, month: 1, day: 1, isLeap: false });
  assert.deepEqual(pickLunar(X.solarToLunar(2025, 7, 25)), { year: 2025, month: 6, day: 1, isLeap: true });
  assert.deepEqual(pickLunar(X.solarToLunar(2020, 5, 23)), { year: 2020, month: 4, day: 1, isLeap: true });
  assert.deepEqual(pickLunar(X.solarToLunar(2028, 6, 23)), { year: 2028, month: 5, day: 1, isLeap: true });
  assert.deepEqual(pickLunar(X.solarToLunar(2033, 12, 22)), { year: 2033, month: 11, day: 1, isLeap: true });
});

test('农历转公历：已知春节与闰月', () => {
  assert.deepEqual(pickSolar(X.lunarToSolar(2024, 1, 1, false)), { year: 2024, month: 2, day: 10 });
  assert.deepEqual(pickSolar(X.lunarToSolar(2023, 2, 1, true)), { year: 2023, month: 3, day: 22 });
  assert.deepEqual(pickSolar(X.lunarToSolar(2025, 6, 1, true)), { year: 2025, month: 7, day: 25 });
  assert.deepEqual(pickSolar(X.lunarToSolar(2020, 4, 1, true)), { year: 2020, month: 5, day: 23 });
});

test('支持范围与边界', () => {
  const range = X.getSupportedRange();
  assert.deepEqual(pickSolar(range.minSolar), { year: 1900, month: 1, day: 31 });
  assert.deepEqual(pickSolar(range.maxSolar), { year: 2101, month: 1, day: 28 });
  assert.equal(X.getSupportedRange().minLunarYear, 1900);
  assert.equal(X.getSupportedRange().maxLunarYear, 2100);
  assert.throws(() => X.solarToLunar(1900, 1, 30), /公历日期需在/);
  assert.throws(() => X.solarToLunar(2101, 1, 29), /公历日期需在/);
  assert.throws(() => X.solarToLunar(2023, 2, 29), /公历日必须是 1–28 的整数/);
  assert.throws(() => X.lunarToSolar(1899, 1, 1, false), /农历年必须是 1900–2100 的整数/);
  assert.throws(() => X.lunarToSolar(2101, 1, 1, false), /农历年必须是 1900–2100 的整数/);
});

test('子时边界：23:30 仍属当日，00:30 已进次日', () => {
  assert.equal(X.getShichenIndex(23), 0);
  assert.equal(X.getShichenIndex(0), 0);
  assert.equal(X.getShichenIndex(1), 1);
  assert.equal(X.getShichenIndex(22), 11);

  const late = X.buildChartFromGregorian({
    year: 2025,
    month: 7,
    day: 24,
    hour: 23,
    minute: 30,
    second: 0,
    mode: '测试'
  });
  assert.deepEqual(pickLunar(late.lunar), { year: 2025, month: 6, day: 30, isLeap: false });
  assert.equal(late.hourIndex, 0);
  assert.equal(late.ziPhase, 'late');
  assert.match(late.ziNote, /晚子时/);

  const early = X.buildChartFromGregorian({
    year: 2025,
    month: 7,
    day: 25,
    hour: 0,
    minute: 30,
    second: 0,
    mode: '测试'
  });
  assert.deepEqual(pickLunar(early.lunar), { year: 2025, month: 6, day: 1, isLeap: true });
  assert.equal(early.hourIndex, 0);
  assert.equal(early.ziPhase, 'early');
  assert.match(early.ziNote, /早子时/);
});

test('子时边界：除夕 23:30 与春节 00:30', () => {
  const eve = X.buildChartFromGregorian({ year: 2024, month: 2, day: 9, hour: 23, minute: 30, second: 0 });
  assert.deepEqual(pickLunar(eve.lunar), { year: 2023, month: 12, day: 30, isLeap: false });
  assert.equal(eve.shichen.name, '子');
  assert.equal(eve.finalPalace.name, X.PALACES[eve.positions.hourPos].name);

  const newYear = X.buildChartFromGregorian({ year: 2024, month: 2, day: 10, hour: 0, minute: 30, second: 0 });
  assert.deepEqual(pickLunar(newYear.lunar), { year: 2024, month: 1, day: 1, isLeap: false });
  assert.equal(newYear.shichen.name, '子');
});

test('数据末端 2100 农历年与 2101-01-28 支持边界', () => {
  assert.equal(X.getMonthDays(2100, 12, false), 29);
  const edge = X.buildChartFromLunar({ year: 2100, month: 12, day: 29, hourIndex: 11 });
  assert.deepEqual(pickSolar(edge.solar), { year: 2101, month: 1, day: 28 });
  assert.deepEqual(pickLunar(edge.lunar), { year: 2100, month: 12, day: 29, isLeap: false });

  const lastInstant = X.buildChartFromGregorian({ year: 2101, month: 1, day: 28, hour: 23, minute: 59, second: 59 });
  assert.deepEqual(pickLunar(lastInstant.lunar), { year: 2100, month: 12, day: 29, isLeap: false });
  assert.equal(lastInstant.shichen.name, '子');
  assert.throws(
    () => X.buildChartFromGregorian({ year: 2101, month: 1, day: 29, hour: 0, minute: 0, second: 0 }),
    /公历日期需在/
  );
});

test('干支年对照：2026 丙午、2024 甲辰、1900 庚子', () => {
  assert.equal(X.getGanzhiYear(2026), '丙午');
  assert.equal(X.getGanzhiYear(2024), '甲辰');
  assert.equal(X.getGanzhiYear(2025), '乙巳');
  assert.equal(X.getGanzhiYear(1900), '庚子');
  assert.equal(X.getGanzhiYear(2100), '庚申');
});

test('农历中文格式化覆盖 1–30 日且无 undefined', () => {
  assert.equal(X.formatLunarDay(1), '初一');
  assert.equal(X.formatLunarDay(10), '初十');
  assert.equal(X.formatLunarDay(11), '十一');
  assert.equal(X.formatLunarDay(20), '二十');
  assert.equal(X.formatLunarDay(21), '廿一');
  assert.equal(X.formatLunarDay(30), '三十');
  assert.equal(X.formatLunarMonth(6, true), '闰六月');
  for (let day = 1; day <= 30; day += 1) {
    assert.ok(X.formatLunarDay(day).length > 0);
    assert.doesNotMatch(X.formatLunarDay(day), /undefined|NaN/);
  }
});

test('全部农历日期与公历日期可往返', () => {
  for (let year = 1900; year <= 2100; year += 1) {
    const leap = X.getLeapMonth(year);
    for (let month = 1; month <= 12; month += 1) {
      const variants = [false];
      if (leap === month) variants.push(true);
      for (const isLeap of variants) {
        const maxDay = X.getMonthDays(year, month, isLeap);
        for (let day = 1; day <= maxDay; day += 1) {
          const solar = X.lunarToSolar(year, month, day, isLeap);
          const roundTrip = X.solarToLunar(solar.year, solar.month, solar.day);
          assert.deepEqual(
            pickLunar(roundTrip),
            { year, month, day, isLeap },
            `${year}-${month}-${day}${isLeap ? '（闰）' : ''} 往返失败`
          );
        }
      }
    }
  }

  const range = X.getSupportedRange();
  const start = Date.UTC(range.minSolar.year, range.minSolar.month - 1, range.minSolar.day);
  const end = Date.UTC(range.maxSolar.year, range.maxSolar.month - 1, range.maxSolar.day);
  for (let time = start; time <= end; time += 86400000) {
    const date = new Date(time);
    const lunar = X.solarToLunar(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    const solar = X.lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.isLeap);
    assert.equal(Date.UTC(solar.year, solar.month - 1, solar.day), time);
  }
});

test('随机起课 1000 次：日期合法、位置不越界、不出现 NaN/undefined', () => {
  const random = mulberry32(20251019);
  for (let index = 0; index < 1000; index += 1) {
    const input = X.randomLunarInput(random);
    assert.ok(input.year >= 1900 && input.year <= 2100);
    assert.ok(input.month >= 1 && input.month <= 12);
    assert.ok(input.hourIndex >= 0 && input.hourIndex <= 11);
    assert.ok(input.day >= 1 && input.day <= X.getMonthDays(input.year, input.month, input.isLeap));
    const chart = X.buildChartFromLunar({
      year: input.year,
      month: input.month,
      day: input.day,
      isLeap: input.isLeap,
      hourIndex: input.hourIndex,
      mode: '随机测试'
    });
    for (const key of ['dayPos', 'hourPos']) {
      assert.ok(Number.isInteger(chart.positions[key]));
      assert.ok(chart.positions[key] >= 0 && chart.positions[key] < 6);
    }
    assert.ok(chart.dayPalace && chart.hourPalace && chart.finalPalace);
    assert.equal(chart.finalPalace, chart.hourPalace);
    assert.ok(Number.isFinite(chart.epoch));
    const text = X.formatChartText(chart);
    assert.doesNotMatch(text, /NaN|undefined/);
    assert.match(text, /最终落宫：/);
    assert.match(text, /六宫掌图/);
    assert.match(text, /免责声明/);
  }
});

test('输出文本包含所有必需字段', () => {
  const chart = X.buildChartFromGregorian({
    year: 2025,
    month: 7,
    day: 24,
    hour: 23,
    minute: 30,
    second: 0,
    mode: '指定公历'
  });
  const text = X.formatChartText(chart);
  for (const label of ['起课时间：', '农历：', '两宫落点：', '日宫：', '时宫：', '最终落宫：', '大安', '留连', '速喜', '赤口', '小吉', '空亡', '免责声明']) {
    assert.ok(text.includes(label), `输出应包含 ${label}`);
  }
  assert.doesNotMatch(text, /NaN|undefined/);
});

test('不依赖外部 CDN / 网络资源', () => {
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:/i);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:/i);
  assert.doesNotMatch(html, /@import\s+url\(\s*["']?https?:/i);
  assert.doesNotMatch(html, /fetch\s*\(/);
  assert.doesNotMatch(html, /XMLHttpRequest/);
});
