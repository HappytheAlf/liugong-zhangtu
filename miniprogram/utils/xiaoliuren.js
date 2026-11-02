(function (root) {
    'use strict';

    const VERSION = '1.0.0';
    const DAY_MS = 86400000;
    const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
    const MIN_LUNAR_YEAR = 1900;
    const MAX_LUNAR_YEAR = 2100;

    const MIN_SOLAR = Object.freeze({ year: 1900, month: 1, day: 31 });
    const WEEKDAYS = Object.freeze(['日', '一', '二', '三', '四', '五', '六']);
    const MONTH_NAMES = Object.freeze(['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']);
    const DAY_DIGITS = Object.freeze(['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']);

    /* 1900–2100 农历年数据：低 4 位为闰月，0x10000 为闰月大小，0x8000..0x10 为十二月大小。 */
    const LUNAR_INFO = Object.freeze([
      0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
      0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
      0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
      0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
      0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
      0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
      0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
      0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
      0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
      0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
      0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
      0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
      0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
      0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
      0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
      0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
      0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
      0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
      0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
      0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
      0x0d520
    ]);

    const PALACES = Object.freeze([
      Object.freeze({ index: 0, name: '大安', element: '木', direction: '东' }),
      Object.freeze({ index: 1, name: '留连', element: '水', direction: '北' }),
      Object.freeze({ index: 2, name: '速喜', element: '火', direction: '南' }),
      Object.freeze({ index: 3, name: '赤口', element: '金', direction: '西' }),
      Object.freeze({ index: 4, name: '小吉', element: '木', direction: '东' }),
      Object.freeze({ index: 5, name: '空亡', element: '土', direction: '中' })
    ]);

    const SHICHEN = Object.freeze([
      Object.freeze({ index: 0, name: '子', range: '23:00–00:59', representativeHour: 0 }),
      Object.freeze({ index: 1, name: '丑', range: '01:00–02:59', representativeHour: 2 }),
      Object.freeze({ index: 2, name: '寅', range: '03:00–04:59', representativeHour: 4 }),
      Object.freeze({ index: 3, name: '卯', range: '05:00–06:59', representativeHour: 6 }),
      Object.freeze({ index: 4, name: '辰', range: '07:00–08:59', representativeHour: 8 }),
      Object.freeze({ index: 5, name: '巳', range: '09:00–10:59', representativeHour: 10 }),
      Object.freeze({ index: 6, name: '午', range: '11:00–12:59', representativeHour: 12 }),
      Object.freeze({ index: 7, name: '未', range: '13:00–14:59', representativeHour: 14 }),
      Object.freeze({ index: 8, name: '申', range: '15:00–16:59', representativeHour: 16 }),
      Object.freeze({ index: 9, name: '酉', range: '17:00–18:59', representativeHour: 18 }),
      Object.freeze({ index: 10, name: '戌', range: '19:00–20:59', representativeHour: 20 }),
      Object.freeze({ index: 11, name: '亥', range: '21:00–22:59', representativeHour: 22 })
    ]);

    const BRANCHES = Object.freeze([
      Object.freeze({ index: 0, name: '子', element: '水', stem: '癸', stems: Object.freeze(['癸']), bagua: '坎', symbol: '☵' }),
      Object.freeze({ index: 1, name: '丑', element: '土', stem: '己', stems: Object.freeze(['己', '癸', '辛']), bagua: '艮', symbol: '☶' }),
      Object.freeze({ index: 2, name: '寅', element: '木', stem: '甲', stems: Object.freeze(['甲', '丙', '戊']), bagua: '艮', symbol: '☶' }),
      Object.freeze({ index: 3, name: '卯', element: '木', stem: '乙', stems: Object.freeze(['乙']), bagua: '震', symbol: '☳' }),
      Object.freeze({ index: 4, name: '辰', element: '土', stem: '戊', stems: Object.freeze(['戊', '乙', '癸']), bagua: '巽', symbol: '☴' }),
      Object.freeze({ index: 5, name: '巳', element: '火', stem: '丙', stems: Object.freeze(['丙', '庚', '戊']), bagua: '巽', symbol: '☴' }),
      Object.freeze({ index: 6, name: '午', element: '火', stem: '丁', stems: Object.freeze(['丁', '己']), bagua: '离', symbol: '☲' }),
      Object.freeze({ index: 7, name: '未', element: '土', stem: '己', stems: Object.freeze(['己', '丁', '乙']), bagua: '坤', symbol: '☷' }),
      Object.freeze({ index: 8, name: '申', element: '金', stem: '庚', stems: Object.freeze(['庚', '壬', '戊']), bagua: '坤', symbol: '☷' }),
      Object.freeze({ index: 9, name: '酉', element: '金', stem: '辛', stems: Object.freeze(['辛']), bagua: '兑', symbol: '☱' }),
      Object.freeze({ index: 10, name: '戌', element: '土', stem: '戊', stems: Object.freeze(['戊', '辛', '丁']), bagua: '乾', symbol: '☰' }),
      Object.freeze({ index: 11, name: '亥', element: '水', stem: '壬', stems: Object.freeze(['壬', '甲']), bagua: '乾', symbol: '☰' })
    ]);

    const SIX_GOD_BY_BRANCH = Object.freeze({
      子: '玄武', 丑: '勾陈',
      寅: '青龙', 卯: '青龙',
      辰: '勾陈', 巳: '朱雀',
      午: '朱雀', 未: '螣蛇',
      申: '白虎', 酉: '白虎',
      戌: '螣蛇', 亥: '玄武'
    });

    const FIVE_STARS = Object.freeze(['木', '火', '土', '金', '水', '空']);
    const ELEMENT_GENERATES = Object.freeze({ 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' });
    const ELEMENT_CONTROLS = Object.freeze({ 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' });
    const HEAVENLY_STEMS = Object.freeze(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']);
    const PALACE_GRID = Object.freeze([
      Object.freeze([1, 2, 3]),
      Object.freeze([0, 5, 4])
    ]);

    const ZI_RULE = '子时 23:00–00:59；00:00 为换日界，23:00–23:59 仍属当日';
    const BASE_UTC = Date.UTC(1900, 0, 31);
    let cachedRange = null;

    function fail(message) {
      throw new RangeError(message);
    }

    function isInteger(value) {
      return typeof value === 'number' && Number.isInteger(value);
    }

    function assertInteger(value, min, max, label) {
      if (!isInteger(value) || value < min || value > max) {
        fail(label + '必须是 ' + min + '–' + max + ' 的整数');
      }
      return value;
    }

    function assertBoolean(value, label) {
      if (typeof value !== 'boolean') fail(label + '必须是布尔值');
      return value;
    }

    function pad2(value) {
      return String(value).padStart(2, '0');
    }

    function getLunarInfo(year) {
      assertInteger(year, MIN_LUNAR_YEAR, MAX_LUNAR_YEAR, '农历年');
      return LUNAR_INFO[year - MIN_LUNAR_YEAR];
    }

    function getLeapMonth(year) {
      return getLunarInfo(year) & 0xf;
    }

    function getLeapDays(year) {
      const info = getLunarInfo(year);
      if (!(info & 0xf)) return 0;
      return (info & 0x10000) ? 30 : 29;
    }

    function getMonthDays(year, month, isLeap) {
      const info = getLunarInfo(year);
      assertInteger(month, 1, 12, '农历月');
      if (isLeap === undefined) isLeap = false;
      assertBoolean(isLeap, '闰月标记');
      if (isLeap) {
        if ((info & 0xf) !== month) fail(year + ' 年没有闰' + MONTH_NAMES[month - 1]);
        return (info & 0x10000) ? 30 : 29;
      }
      return (info & (0x10000 >> month)) ? 30 : 29;
    }

    function getLunarYearDays(year) {
      const info = getLunarInfo(year);
      let sum = 348;
      for (let bit = 0x8000; bit > 0x8; bit >>= 1) {
        if (info & bit) sum += 1;
      }
      return sum + getLeapDays(year);
    }

    function buildLunarMonths(year) {
      const leap = getLeapMonth(year);
      const list = [];
      for (let month = 1; month <= 12; month += 1) {
        list.push(Object.freeze({ month: month, isLeap: false, days: getMonthDays(year, month, false) }));
        if (leap === month) {
          list.push(Object.freeze({ month: month, isLeap: true, days: getMonthDays(year, month, true) }));
        }
      }
      return Object.freeze(list);
    }

    function getMonthInfo(year, month) {
      assertInteger(month, 1, 12, '农历月');
      const leapMonth = getLeapMonth(year);
      const regularDays = getMonthDays(year, month, false);
      const hasLeap = leapMonth === month;
      return Object.freeze({
        year: year,
        month: month,
        leapMonth: leapMonth,
        hasLeap: hasLeap,
        regularDays: regularDays,
        leapDays: hasLeap ? getMonthDays(year, month, true) : 0
      });
    }

    function validateLunarDate(year, month, day, isLeap) {
      try {
        if (isLeap === undefined) isLeap = false;
        assertInteger(year, MIN_LUNAR_YEAR, MAX_LUNAR_YEAR, '农历年');
        assertInteger(month, 1, 12, '农历月');
        assertBoolean(isLeap, '闰月标记');
        const maxDay = getMonthDays(year, month, isLeap);
        assertInteger(day, 1, maxDay, '农历日');
        return Object.freeze({ ok: true, year: year, month: month, day: day, isLeap: isLeap, maxDay: maxDay });
      } catch (error) {
        return Object.freeze({ ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }

    function assertLunarDate(year, month, day, isLeap) {
      const check = validateLunarDate(year, month, day, isLeap);
      if (!check.ok) fail(check.error);
      return check;
    }

    function isGregorianLeapYear(year) {
      return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    function getGregorianMonthDays(year, month) {
      assertInteger(year, 1900, 2101, '公历年份');
      assertInteger(month, 1, 12, '公历月');
      if (month === 2) return isGregorianLeapYear(year) ? 29 : 28;
      return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    }

    function utcParts(date) {
      return Object.freeze({
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        second: date.getUTCSeconds(),
        weekday: date.getUTCDay()
      });
    }

    function getSupportedRange() {
      if (!cachedRange) {
        let totalDays = 0;
        for (let year = MIN_LUNAR_YEAR; year <= MAX_LUNAR_YEAR; year += 1) {
          totalDays += getLunarYearDays(year);
        }
        const maxDate = new Date(BASE_UTC + (totalDays - 1) * DAY_MS);
        const maxSolar = utcParts(maxDate);
        cachedRange = Object.freeze({
          minSolar: MIN_SOLAR,
          maxSolar: Object.freeze({ year: maxSolar.year, month: maxSolar.month, day: maxSolar.day }),
          minLunarYear: MIN_LUNAR_YEAR,
          maxLunarYear: MAX_LUNAR_YEAR
        });
      }
      return cachedRange;
    }

    function formatSolarDate(parts) {
      return parts.year + '-' + pad2(parts.month) + '-' + pad2(parts.day);
    }

    function assertSolarDate(year, month, day) {
      assertInteger(year, 1900, 2101, '公历年份');
      assertInteger(month, 1, 12, '公历月');
      const maxDay = getGregorianMonthDays(year, month);
      assertInteger(day, 1, maxDay, '公历日');
      const target = Date.UTC(year, month - 1, day);
      const range = getSupportedRange();
      const min = Date.UTC(range.minSolar.year, range.minSolar.month - 1, range.minSolar.day);
      const max = Date.UTC(range.maxSolar.year, range.maxSolar.month - 1, range.maxSolar.day);
      if (target < min || target > max) {
        fail('公历日期需在 ' + formatSolarDate(range.minSolar) + ' 至 ' + formatSolarDate(range.maxSolar) + ' 之间');
      }
      return target;
    }

    function solarToLunar(year, month, day) {
      const target = assertSolarDate(year, month, day);
      let offset = Math.round((target - BASE_UTC) / DAY_MS);
      let lunarYear = MIN_LUNAR_YEAR;
      while (lunarYear <= MAX_LUNAR_YEAR && offset >= getLunarYearDays(lunarYear)) {
        offset -= getLunarYearDays(lunarYear);
        lunarYear += 1;
      }
      if (lunarYear > MAX_LUNAR_YEAR) fail('农历换算超出支持范围');
      const months = buildLunarMonths(lunarYear);
      for (const item of months) {
        if (offset < item.days) {
          return Object.freeze({
            year: lunarYear,
            month: item.month,
            day: offset + 1,
            isLeap: item.isLeap
          });
        }
        offset -= item.days;
      }
      fail('农历换算失败');
    }

    function lunarToSolar(year, month, day, isLeap) {
      const check = assertLunarDate(year, month, day, isLeap);
      let offset = 0;
      for (let y = MIN_LUNAR_YEAR; y < year; y += 1) {
        offset += getLunarYearDays(y);
      }
      const months = buildLunarMonths(year);
      let found = false;
      for (const item of months) {
        if (item.month === month && item.isLeap === check.isLeap) {
          found = true;
          break;
        }
        offset += item.days;
      }
      if (!found) fail('农历月份定位失败');
      offset += day - 1;
      return utcParts(new Date(BASE_UTC + offset * DAY_MS));
    }

    function formatLunarMonth(month, isLeap) {
      assertInteger(month, 1, 12, '农历月');
      return (isLeap ? '闰' : '') + MONTH_NAMES[month - 1];
    }

    function formatLunarDay(day) {
      assertInteger(day, 1, 30, '农历日');
      if (day === 10) return '初十';
      if (day < 10) return '初' + DAY_DIGITS[day];
      if (day < 20) return '十' + DAY_DIGITS[day - 10];
      if (day === 20) return '二十';
      if (day < 30) return '廿' + DAY_DIGITS[day - 20];
      return '三十';
    }

    function formatLunarDate(lunar) {
      return '农历 ' + lunar.year + ' 年 ' + formatLunarMonth(lunar.month, lunar.isLeap) + ' ' + formatLunarDay(lunar.day);
    }

    function getBeijingParts(epoch) {
      if (typeof epoch !== 'number' || !Number.isFinite(epoch)) fail('时间戳必须是有限数字');
      return utcParts(new Date(epoch + BEIJING_OFFSET_MS));
    }

    function beijingToEpoch(parts) {
      const year = parts.year;
      const month = parts.month;
      const day = parts.day;
      const hour = parts.hour === undefined ? 0 : parts.hour;
      const minute = parts.minute === undefined ? 0 : parts.minute;
      const second = parts.second === undefined ? 0 : parts.second;
      assertSolarDate(year, month, day);
      assertInteger(hour, 0, 23, '小时');
      assertInteger(minute, 0, 59, '分钟');
      assertInteger(second, 0, 59, '秒');
      return Date.UTC(year, month - 1, day, hour, minute, second, 0) - BEIJING_OFFSET_MS;
    }

    function formatBeijingDateTime(epoch) {
      const p = getBeijingParts(epoch);
      return p.year + '-' + pad2(p.month) + '-' + pad2(p.day) + ' ' + pad2(p.hour) + ':' + pad2(p.minute) + ':' + pad2(p.second);
    }

    function formatWeekday(epoch) {
      return '星期' + WEEKDAYS[getBeijingParts(epoch).weekday];
    }

    function getShichenIndex(hour) {
      assertInteger(hour, 0, 23, '小时');
      return Math.floor(((hour + 1) % 24) / 2);
    }

    function getShichen(hourIndex) {
      assertInteger(hourIndex, 0, 11, '时辰');
      return SHICHEN[hourIndex];
    }

    function getGanzhiYear(year) {
      assertInteger(year, MIN_LUNAR_YEAR, MAX_LUNAR_YEAR, '农历年');
      const offset = ((year - 4) % 60 + 60) % 60;
      return HEAVENLY_STEMS[offset % 10] + BRANCHES[offset % 12].name;
    }

    function getSixRelative(element, selfElement) {
      if (element === selfElement) return '兄弟';
      if (ELEMENT_GENERATES[element] === selfElement) return '父母';
      if (ELEMENT_GENERATES[selfElement] === element) return '子孙';
      if (ELEMENT_CONTROLS[element] === selfElement) return '官鬼';
      if (ELEMENT_CONTROLS[selfElement] === element) return '妻财';
      return '兄弟';
    }

    function getZiPhase(hour) {
      assertInteger(hour, 0, 23, '小时');
      if (hour === 23) return 'late';
      if (hour === 0) return 'early';
      return null;
    }

    function calculatePositions(day, hourIndex) {
      assertInteger(day, 1, 30, '农历日');
      assertInteger(hourIndex, 0, 11, '时辰');
      const dayPos = (day - 1) % 6;
      const hourPos = (dayPos + hourIndex) % 6;
      return Object.freeze({ dayPos: dayPos, hourPos: hourPos });
    }

    function makeChart(mode, lunar, solar, epoch, hourIndex, ziPhase, ziNote) {
      assertInteger(hourIndex, 0, 11, '时辰');
      const positions = calculatePositions(lunar.day, hourIndex);
      return Object.freeze({
        version: VERSION,
        mode: mode || '手动农历',
        epoch: epoch,
        solar: Object.freeze({ year: solar.year, month: solar.month, day: solar.day, hour: solar.hour, minute: solar.minute, second: solar.second, weekday: solar.weekday }),
        lunar: Object.freeze({ year: lunar.year, month: lunar.month, day: lunar.day, isLeap: lunar.isLeap }),
        hourIndex: hourIndex,
        shichen: SHICHEN[hourIndex],
        ziPhase: ziPhase || null,
        ziNote: ziNote || '',
        positions: positions,
        dayPalace: PALACES[positions.dayPos],
        hourPalace: PALACES[positions.hourPos],
        finalPalace: PALACES[positions.hourPos]
      });
    }

    function buildChartFromEpoch(epoch, mode) {
      const solar = getBeijingParts(epoch);
      const lunar = solarToLunar(solar.year, solar.month, solar.day);
      const hourIndex = getShichenIndex(solar.hour);
      const ziPhase = getZiPhase(solar.hour);
      let ziNote = '';
      if (ziPhase === 'late') ziNote = '晚子时：23:00–23:59，仍用当日农历';
      if (ziPhase === 'early') ziNote = '早子时：00:00–00:59，已换入次日农历';
      return makeChart(mode || '当前时间', lunar, solar, epoch, hourIndex, ziPhase, ziNote);
    }

    function buildChartFromGregorian(input) {
      const epoch = beijingToEpoch(input);
      return buildChartFromEpoch(epoch, input.mode || '指定公历');
    }

    function buildChartFromLunar(input) {
      const year = input.year;
      const month = input.month;
      const day = input.day;
      const isLeap = input.isLeap === undefined ? false : input.isLeap;
      const hourIndex = input.hourIndex;
      assertInteger(hourIndex, 0, 11, '时辰');
      const check = assertLunarDate(year, month, day, isLeap);
      const solarDate = lunarToSolar(year, month, day, check.isLeap);
      const representativeHour = SHICHEN[hourIndex].representativeHour;
      const epoch = beijingToEpoch({
        year: solarDate.year,
        month: solarDate.month,
        day: solarDate.day,
        hour: representativeHour,
        minute: 0,
        second: 0
      });
      const solar = getBeijingParts(epoch);
      const ziPhase = hourIndex === 0 ? 'early' : null;
      const ziNote = hourIndex === 0 ? '早子时：00:00–00:59' : '';
      return makeChart(
        input.mode || '手动农历',
        { year: year, month: month, day: day, isLeap: check.isLeap },
        solar,
        epoch,
        hourIndex,
        ziPhase,
        ziNote
      );
    }

    function getStepDetails(chart) {
      const lunar = chart.lunar;
      const dayDetail = '从大安起初一，顺数 ' + lunar.day + ' 次（含起）至' + formatLunarDay(lunar.day);
      const hourDetail = '从' + chart.dayPalace.name + '起子时，顺数至' + chart.shichen.name + '时（' + (chart.hourIndex + 1) + ' 次，含起）';
      return Object.freeze([
        Object.freeze({
          key: 'day',
          label: '日宫',
          count: lunar.day,
          palace: chart.dayPalace,
          detail: dayDetail,
          formula: '(日 − 1) mod 6 = ' + chart.positions.dayPos
        }),
        Object.freeze({
          key: 'hour',
          label: '时宫',
          count: chart.hourIndex + 1,
          palace: chart.hourPalace,
          detail: hourDetail,
          formula: '(日位 + 时序) mod 6 = ' + chart.positions.hourPos
        })
      ]);
    }

    function getPalaceRoles(chart) {
      const roles = [[], [], [], [], [], []];
      roles[chart.positions.dayPos].push('日');
      roles[chart.positions.hourPos].push('时');
      return roles;
    }

    function getAdvancedChart(chart) {
      const dayStartPos = 0;
      const hourStartPos = chart.positions.dayPos;
      const finalPos = chart.positions.hourPos;
      const hourBranchIndex = chart.hourIndex;
      const cells = PALACES.map(function (palace) {
        return {
          pos: palace.index,
          palace: palace,
          deity: '',
          star: '',
          primary: null,
          relative: '',
          markers: []
        };
      });

      const dayResultPos = chart.positions.dayPos;
      for (let pos = 0; pos < 6; pos += 1) {
        const step = (pos - dayResultPos + 6) % 6;
        cells[pos].star = FIVE_STARS[step];
        cells[pos].starLabel = FIVE_STARS[step] === '空' ? '天空' : FIVE_STARS[step];
      }

      for (let step = 0; step < 6; step += 1) {
        const pos = (finalPos + step) % 6;
        const primary = BRANCHES[(hourBranchIndex + step * 2) % 12];
        cells[pos].primary = primary;
        cells[pos].deity = SIX_GOD_BY_BRANCH[primary.name];
      }

      const selfElement = cells[finalPos].primary.element;
      cells.forEach(function (cell) {
        cell.relative = cell.pos === finalPos ? '自身' : getSixRelative(cell.primary.element, selfElement);
      });
      if (selfElement !== '土') {
        for (let step = 1; step < 6; step += 1) {
          const pos = (finalPos + step) % 6;
          if (cells[pos].primary.element === '土') {
            cells[pos].relative = '兄弟';
            break;
          }
        }
      }

      const markerDefinitions = [
        { key: 'day', label: '日', pos: chart.positions.dayPos, title: '日落宫' },
        { key: 'hour', label: '时', pos: finalPos, title: '时落宫' }
      ];
      markerDefinitions.forEach(function (definition) {
        cells[definition.pos].markers.push(definition);
      });

      const frozenCells = cells.map(function (cell) {
        return Object.freeze({
          pos: cell.pos,
          palace: cell.palace,
          deity: cell.deity,
          star: cell.star,
          starLabel: cell.starLabel,
          primary: cell.primary,
          relative: cell.relative,
          markers: Object.freeze(cell.markers.map(function (marker) {
            return Object.freeze({ key: marker.key, label: marker.label, title: marker.title });
          }))
        });
      });

      return Object.freeze({
        dayStartPos: dayStartPos,
        hourStartPos: hourStartPos,
        finalPos: finalPos,
        starStartPos: dayResultPos,
        selfElement: selfElement,
        cells: Object.freeze(frozenCells),
        grid: PALACE_GRID,
        markers: Object.freeze(markerDefinitions.map(function (marker) {
          return Object.freeze({ key: marker.key, label: marker.label, title: marker.title });
        }))
      });
    }

    function getAdvancedDetails(chart) {
      const advanced = getAdvancedChart(chart);
      const branchOrder = [];
      for (let step = 0; step < 6; step += 1) {
        branchOrder.push(advanced.cells[(advanced.finalPos + step) % 6].primary.name);
      }
      const starOrder = [];
      for (let step = 0; step < 6; step += 1) {
        starOrder.push(advanced.cells[(advanced.starStartPos + step) % 6].star);
      }
      return Object.freeze([
        Object.freeze({
          key: 'branch',
          label: '排支',
          title: '从' + advanced.cells[advanced.finalPos].palace.name + '起' + chart.shichen.name + '，隔位顺排',
          detail: branchOrder.join(' → ') + '；每宫只写主支，支下列藏干，支旁标后天八卦'
        }),
        Object.freeze({
          key: 'star',
          label: '五星',
          title: '从' + advanced.cells[advanced.starStartPos].palace.name + '起木，顺排',
          detail: starOrder.join(' → ') + '（空为天空）'
        }),
        Object.freeze({
          key: 'relative',
          label: '六亲',
          title: '时宫为自身，其余按五行生克',
          detail: '生我父母、克我官鬼、我生子女、我克妻财、同我兄弟；非土自身以顺时针第一个土支为兄弟'
        })
      ]);
    }

    function formatChartText(chart) {
      const steps = getStepDetails(chart);
      const advanced = getAdvancedChart(chart);
      const advancedDetails = getAdvancedDetails(chart);
      const finalCell = advanced.cells[advanced.finalPos];
      const table = PALACES.map(function (palace) {
        return palace.name + ' ' + palace.element + '·' + palace.direction;
      }).join('｜');
      const chartRows = advanced.grid.map(function (row) {
        return row.map(function (pos) {
          const cell = advanced.cells[pos];
          const markers = cell.markers.length
            ? ' {' + cell.markers.map(function (marker) { return marker.label; }).join('') + '}'
            : '';
          return cell.palace.name + '[' + cell.deity + '·' + cell.star + '·' + cell.relative + '] ' +
            cell.primary.name + cell.primary.stems.join('') + '(' + cell.primary.symbol + cell.primary.bagua + ')' + markers;
        }).join(' ｜ ');
      }).join('\n');
      const lines = [
        '【小六壬 · 起课结果】',
        '起课时间：' + formatBeijingDateTime(chart.epoch) + '（北京时间 UTC+8，' + formatWeekday(chart.epoch) + '）',
        '农历：' + getGanzhiYear(chart.lunar.year) + '年 · ' + formatLunarDate(chart.lunar).replace(/^农历\s*/, '') + ' ' + chart.shichen.name + '时',
        '时辰：' + chart.shichen.name + '时（' + chart.shichen.range + '）' + (chart.ziNote ? '；' + chart.ziNote : ''),
        '起课方式：' + chart.mode,
        '',
        '两宫落点：',
        '日宫：' + chart.dayPalace.name,
        '时宫：' + chart.hourPalace.name,
        '',
        '最终落宫：' + chart.finalPalace.name + '（六神' + finalCell.deity + ' · 五星' + finalCell.star + '）',
        '',
        '六宫掌图（上排：留连 速喜 赤口；下排：大安 空亡 小吉）：',
        chartRows,
        '标记：日=日落宫，时=时落宫。',
        '排支：' + advancedDetails[0].title + '；' + advancedDetails[0].detail,
        '五星：' + advancedDetails[1].title + '；' + advancedDetails[1].detail,
        '六神：按地支取（寅卯青龙、巳午朱雀、丑辰勾陈、未戌螣蛇、申酉白虎、亥子玄武）。',
        '六亲：时宫为自身，其余按五行生克；非土自身以顺时针第一个土支为兄弟。',
        '八卦：后天八卦，子坎、丑寅艮、卯震、辰巳巽、午离、未申坤、酉兑、戌亥乾。',
        '',
        '推算过程：',
        ...steps.map(function (step) {
          return step.label + '｜' + step.detail + '；' + step.formula;
        }),
        '',
        '六宫基础五行方位（参考，不参与本盘五星）：',
        table,
        '',
        '规则：日起大安，按农历日顺数；' + ZI_RULE + '；时间统一为北京时间 UTC+8。',
        '免责声明：本结果仅依据传统小六壬日时掌诀进行机械排盘，属民俗文化娱乐参考，不构成预测、医疗、法律、投资等专业建议。'
      ];
      return lines.join('\n');
    }

    function randomLunarInput(rng) {
      const random = typeof rng === 'function' ? rng : Math.random;
      function next() {
        const value = random();
        if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
        return Math.min(0.999999999, Math.max(0, value));
      }
      const year = MIN_LUNAR_YEAR + Math.floor(next() * (MAX_LUNAR_YEAR - MIN_LUNAR_YEAR + 1));
      const month = 1 + Math.floor(next() * 12);
      const leap = getLeapMonth(year);
      const isLeap = leap === month && next() < 0.5;
      const maxDay = getMonthDays(year, month, isLeap);
      const day = 1 + Math.floor(next() * maxDay);
      const hourIndex = Math.floor(next() * 12);
      return Object.freeze({ year: year, month: month, day: day, isLeap: isLeap, hourIndex: hourIndex });
    }

    function validateSolarDateTime(input) {
      try {
        const epoch = beijingToEpoch(input);
        return Object.freeze({ ok: true, epoch: epoch });
      } catch (error) {
        return Object.freeze({ ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }

    root.XLRCore = Object.freeze({
      VERSION: VERSION,
      PALACES: PALACES,
      SHICHEN: SHICHEN,
      BRANCHES: BRANCHES,
      FIVE_STARS: FIVE_STARS,
      PALACE_GRID: PALACE_GRID,
      SIX_GOD_BY_BRANCH: SIX_GOD_BY_BRANCH,
      MONTH_NAMES: MONTH_NAMES,
      ZI_RULE: ZI_RULE,
      getLeapMonth: getLeapMonth,
      getLeapDays: getLeapDays,
      getMonthDays: getMonthDays,
      getLunarYearDays: getLunarYearDays,
      buildLunarMonths: buildLunarMonths,
      getMonthInfo: getMonthInfo,
      validateLunarDate: validateLunarDate,
      solarToLunar: solarToLunar,
      lunarToSolar: lunarToSolar,
      calculatePositions: calculatePositions,
      buildChartFromEpoch: buildChartFromEpoch,
      buildChartFromGregorian: buildChartFromGregorian,
      buildChartFromLunar: buildChartFromLunar,
      getStepDetails: getStepDetails,
      getPalaceRoles: getPalaceRoles,
      getAdvancedChart: getAdvancedChart,
      getAdvancedDetails: getAdvancedDetails,
      formatChartText: formatChartText,
      formatLunarMonth: formatLunarMonth,
      formatLunarDay: formatLunarDay,
      formatLunarDate: formatLunarDate,
      formatSolarDate: formatSolarDate,
      formatBeijingDateTime: formatBeijingDateTime,
      formatWeekday: formatWeekday,
      getBeijingParts: getBeijingParts,
      beijingToEpoch: beijingToEpoch,
      getShichenIndex: getShichenIndex,
      getShichen: getShichen,
      getGanzhiYear: getGanzhiYear,
      getZiPhase: getZiPhase,
      randomLunarInput: randomLunarInput,
      getSupportedRange: getSupportedRange,
      validateSolarDateTime: validateSolarDateTime,
      isGregorianLeapYear: isGregorianLeapYear,
      getGregorianMonthDays: getGregorianMonthDays
    });
  })(typeof globalThis !== 'undefined' ? globalThis : this);

if (typeof module === 'object' && module.exports) {
  module.exports = globalThis.XLRCore;
}
