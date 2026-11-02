(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./xiaoliuren'));
  } else {
    root.MeihuaCore = factory(root.XLRCore);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (X) {
  'use strict';

  /* 梅花易数 · 时间起卦
   * 规则：农历年支数 + 农历月 + 农历日 = 上卦；
   *       再加时支数 = 下卦；
   *       总数取动爻。先天八卦数：乾1 兑2 离3 震4 巽5 坎6 艮7 坤8。
   * 余 0 作 8（上/下卦）或 6（动爻）。闰月按本月序数，不另加位。
   */

  const TRIGRAMS = Object.freeze([
    Object.freeze({ name: '乾', symbol: '☰', number: 1, element: '金', elementKey: 'metal', direction: '西北', palace: '乾宫', lines: Object.freeze([1, 1, 1]) }),
    Object.freeze({ name: '兑', symbol: '☱', number: 2, element: '金', elementKey: 'metal', direction: '西', palace: '兑宫', lines: Object.freeze([1, 1, 0]) }),
    Object.freeze({ name: '离', symbol: '☲', number: 3, element: '火', elementKey: 'fire', direction: '南', palace: '离宫', lines: Object.freeze([1, 0, 1]) }),
    Object.freeze({ name: '震', symbol: '☳', number: 4, element: '木', elementKey: 'wood', direction: '东', palace: '震宫', lines: Object.freeze([1, 0, 0]) }),
    Object.freeze({ name: '巽', symbol: '☴', number: 5, element: '木', elementKey: 'wood', direction: '东南', palace: '巽宫', lines: Object.freeze([0, 1, 1]) }),
    Object.freeze({ name: '坎', symbol: '☵', number: 6, element: '水', elementKey: 'water', direction: '北', palace: '坎宫', lines: Object.freeze([0, 1, 0]) }),
    Object.freeze({ name: '艮', symbol: '☶', number: 7, element: '土', elementKey: 'earth', direction: '东北', palace: '艮宫', lines: Object.freeze([0, 0, 1]) }),
    Object.freeze({ name: '坤', symbol: '☷', number: 8, element: '土', elementKey: 'earth', direction: '西南', palace: '坤宫', lines: Object.freeze([0, 0, 0]) })
  ]);

  const TRIGRAM_BY_NUMBER = Object.freeze(TRIGRAMS.reduce((map, trigram) => {
    map[trigram.number] = trigram;
    return map;
  }, {}));

  const TRIGRAM_BY_LINES = Object.freeze(TRIGRAMS.reduce((map, trigram) => {
    map[trigram.lines.join('')] = trigram;
    return map;
  }, {}));

  const TRIGRAM_BY_NAME = Object.freeze(TRIGRAMS.reduce((map, trigram) => {
    map[trigram.name] = trigram;
    return map;
  }, {}));

  const HEXAGRAM_NAMES = Object.freeze({
    乾乾: '乾为天', 乾兑: '天泽履', 乾离: '天火同人', 乾震: '天雷无妄', 乾巽: '天风姤', 乾坎: '天水讼', 乾艮: '天山遁', 乾坤: '天地否',
    兑乾: '泽天夬', 兑兑: '兑为泽', 兑离: '泽火革', 兑震: '泽雷随', 兑巽: '泽风大过', 兑坎: '泽水困', 兑艮: '泽山咸', 兑坤: '泽地萃',
    离乾: '火天大有', 离兑: '火泽睽', 离离: '离为火', 离震: '火雷噬嗑', 离巽: '火风鼎', 离坎: '火水未济', 离艮: '火山旅', 离坤: '火地晋',
    震乾: '雷天大壮', 震兑: '雷泽归妹', 震离: '雷火丰', 震震: '震为雷', 震巽: '雷风恒', 震坎: '雷水解', 震艮: '雷山小过', 震坤: '雷地豫',
    巽乾: '风天小畜', 巽兑: '风泽中孚', 巽离: '风火家人', 巽震: '风雷益', 巽巽: '巽为风', 巽坎: '风水涣', 巽艮: '风山渐', 巽坤: '风地观',
    坎乾: '水天需', 坎兑: '水泽节', 坎离: '水火既济', 坎震: '水雷屯', 坎巽: '水风井', 坎坎: '坎为水', 坎艮: '水山蹇', 坎坤: '水地比',
    艮乾: '山天大畜', 艮兑: '山泽损', 艮离: '山火贲', 艮震: '山雷颐', 艮巽: '山风蛊', 艮坎: '山水蒙', 艮艮: '艮为山', 艮坤: '山地剥',
    坤乾: '地天泰', 坤兑: '地泽临', 坤离: '地火明夷', 坤震: '地雷复', 坤巽: '地风升', 坤坎: '地水师', 坤艮: '地山谦', 坤坤: '坤为地'
  });

  const BRANCH_NAMES = Object.freeze(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);
  const STEM_NAMES = Object.freeze(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']);
  const STEM_ELEMENTS = Object.freeze(['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water']);

  const MONTH_TERMS = Object.freeze([
    Object.freeze({ longitude: 315, month: 2, day: 4, branch: '寅' }),
    Object.freeze({ longitude: 345, month: 3, day: 6, branch: '卯' }),
    Object.freeze({ longitude: 15, month: 4, day: 5, branch: '辰' }),
    Object.freeze({ longitude: 45, month: 5, day: 6, branch: '巳' }),
    Object.freeze({ longitude: 75, month: 6, day: 6, branch: '午' }),
    Object.freeze({ longitude: 105, month: 7, day: 7, branch: '未' }),
    Object.freeze({ longitude: 135, month: 8, day: 8, branch: '申' }),
    Object.freeze({ longitude: 165, month: 9, day: 8, branch: '酉' }),
    Object.freeze({ longitude: 195, month: 10, day: 8, branch: '戌' }),
    Object.freeze({ longitude: 225, month: 11, day: 7, branch: '亥' }),
    Object.freeze({ longitude: 255, month: 12, day: 7, branch: '子' }),
    Object.freeze({ longitude: 285, month: 1, day: 6, branch: '丑' })
  ]);

  const RAD = Math.PI / 180;

  function sunLongitude(jd) {
    const t = (jd - 2451545) / 36525;
    const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
    const m = (357.52911 + 35999.05029 * t - 0.0001537 * t * t) * RAD;
    const c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m) +
      (0.019993 - 0.000101 * t) * Math.sin(2 * m) +
      0.000289 * Math.sin(3 * m);
    const omega = (125.04 - 1934.136 * t) * RAD;
    const apparent = l0 + c - 0.00569 - 0.00478 * Math.sin(omega);
    return ((apparent % 360) + 360) % 360;
  }

  function jdFromEpoch(epoch) {
    return epoch / 86400000 + 2440587.5;
  }

  function angleDistance(longitude, target) {
    return ((longitude - target + 540) % 360) - 180;
  }

  function findSolarTerm(year, term) {
    const center = Date.UTC(year, term.month - 1, term.day, 12, 0, 0);
    const start = center - 6 * 86400000;
    const end = center + 6 * 86400000;
    const step = 6 * 3600000;
    let previousTime = start;
    let previousDiff = angleDistance(sunLongitude(jdFromEpoch(start)), term.longitude);
    for (let time = start + step; time <= end; time += step) {
      const diff = angleDistance(sunLongitude(jdFromEpoch(time)), term.longitude);
      if (previousDiff <= 0 && diff >= 0) {
        let low = previousTime;
        let high = time;
        for (let i = 0; i < 24; i += 1) {
          const mid = (low + high) / 2;
          const midDiff = angleDistance(sunLongitude(jdFromEpoch(mid)), term.longitude);
          if (midDiff < 0) low = mid;
          else high = mid;
        }
        return (low + high) / 2;
      }
      previousTime = time;
      previousDiff = diff;
    }
    return center;
  }

  function getJdn(year, month, day) {
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    return day + Math.floor((153 * m + 2) / 5) + 365 * y +
      Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  function xunKong(stemIndex, branchIndex) {
    const start = (branchIndex - stemIndex + 12) % 12;
    return BRANCH_NAMES[(start + 10) % 12] + BRANCH_NAMES[(start + 11) % 12];
  }

  function makePillar(label, stemIndex, branchIndex) {
    const stem = STEM_NAMES[stemIndex];
    const branch = BRANCH_NAMES[branchIndex];
    return Object.freeze({
      key: label,
      label,
      stem,
      branch,
      ganzhi: stem + branch,
      text: stem + branch + label,
      xunKong: xunKong(stemIndex, branchIndex),
      elementKey: STEM_ELEMENTS[stemIndex]
    });
  }

  function getFourPillars(solar, hour, epoch) {
    if (!solar) return [];
    const year = solar.year;
    const lichun = findSolarTerm(year, MONTH_TERMS[0]);
    const solarYear = epoch < lichun ? year - 1 : year;
    const yearStem = ((solarYear - 4) % 10 + 10) % 10;
    const yearBranch = ((solarYear - 4) % 12 + 12) % 12;

    const terms = MONTH_TERMS.map((term) => {
      const termYear = term.branch === '丑' ? solarYear + 1 : solarYear;
      return Object.freeze({
        term,
        epoch: findSolarTerm(termYear, term)
      });
    }).filter((item) => item.epoch <= epoch).sort((a, b) => a.epoch - b.epoch);
    const monthTerm = terms[terms.length - 1] || terms[0];
    const monthBranch = BRANCH_NAMES.indexOf(monthTerm.term.branch);
    const monthIndex = (monthBranch - 2 + 12) % 12;
    const monthStartStem = ((yearStem % 5) * 2 + 2) % 10;
    const monthStem = (monthStartStem + monthIndex) % 10;

    const jdn = getJdn(solar.year, solar.month, solar.day);
    const dayIndex = (jdn + 49) % 60;
    const dayStem = dayIndex % 10;
    const dayBranch = dayIndex % 12;
    const hourBranch = Math.floor((hour + 1) / 2) % 12;
    const hourStartStem = (dayStem % 5) * 2;
    const hourStem = (hourStartStem + hourBranch) % 10;

    return Object.freeze([
      makePillar('年', yearStem, yearBranch),
      makePillar('月', monthStem, monthBranch),
      makePillar('日', dayStem, dayBranch),
      makePillar('时', hourStem, hourBranch)
    ]);
  }

  const PALACE_INFO = Object.freeze({
    乾宫: Object.freeze({ name: '乾宫', element: '金', elementKey: 'metal', direction: '西北' }),
    兑宫: Object.freeze({ name: '兑宫', element: '金', elementKey: 'metal', direction: '西' }),
    离宫: Object.freeze({ name: '离宫', element: '火', elementKey: 'fire', direction: '南' }),
    震宫: Object.freeze({ name: '震宫', element: '木', elementKey: 'wood', direction: '东' }),
    巽宫: Object.freeze({ name: '巽宫', element: '木', elementKey: 'wood', direction: '东南' }),
    坎宫: Object.freeze({ name: '坎宫', element: '水', elementKey: 'water', direction: '北' }),
    艮宫: Object.freeze({ name: '艮宫', element: '土', elementKey: 'earth', direction: '东北' }),
    坤宫: Object.freeze({ name: '坤宫', element: '土', elementKey: 'earth', direction: '西南' })
  });

  const HEXAGRAM_PALACE = Object.freeze({
    乾为天: '乾宫', 天风姤: '乾宫', 天山遁: '乾宫', 天地否: '乾宫', 风地观: '乾宫', 山地剥: '乾宫', 火地晋: '乾宫', 火天大有: '乾宫',
    坎为水: '坎宫', 水泽节: '坎宫', 水雷屯: '坎宫', 水火既济: '坎宫', 泽火革: '坎宫', 雷火丰: '坎宫', 地火明夷: '坎宫', 地水师: '坎宫',
    艮为山: '艮宫', 山火贲: '艮宫', 山天大畜: '艮宫', 山泽损: '艮宫', 火泽睽: '艮宫', 天泽履: '艮宫', 风泽中孚: '艮宫', 风山渐: '艮宫',
    震为雷: '震宫', 雷地豫: '震宫', 雷水解: '震宫', 雷风恒: '震宫', 地风升: '震宫', 水风井: '震宫', 泽风大过: '震宫', 泽雷随: '震宫',
    巽为风: '巽宫', 风天小畜: '巽宫', 风火家人: '巽宫', 风雷益: '巽宫', 天雷无妄: '巽宫', 火雷噬嗑: '巽宫', 山雷颐: '巽宫', 山风蛊: '巽宫',
    离为火: '离宫', 火山旅: '离宫', 火风鼎: '离宫', 火水未济: '离宫', 山水蒙: '离宫', 风水涣: '离宫', 天水讼: '离宫', 天火同人: '离宫',
    坤为地: '坤宫', 地雷复: '坤宫', 地泽临: '坤宫', 地天泰: '坤宫', 雷天大壮: '坤宫', 泽天夬: '坤宫', 水天需: '坤宫', 水地比: '坤宫',
    兑为泽: '兑宫', 泽水困: '兑宫', 泽地萃: '兑宫', 泽山咸: '兑宫', 水山蹇: '兑宫', 地山谦: '兑宫', 雷山小过: '兑宫', 雷泽归妹: '兑宫'
  });

  function mod8(value) {
    const remainder = value % 8;
    return remainder === 0 ? 8 : remainder;
  }

  function mod6(value) {
    const remainder = value % 6;
    return remainder === 0 ? 6 : remainder;
  }

  function trigramFromLines(lines) {
    const key = lines.join('');
    const trigram = TRIGRAM_BY_LINES[key];
    if (!trigram) throw new Error('无法识别卦象：' + key);
    return trigram;
  }

  function lineLabel(index, value) {
    const positions = ['初', '二', '三', '四', '五', '上'];
    const yinYang = value === 1 ? '九' : '六';
    if (index === 1) return '初' + yinYang;
    if (index === 6) return '上' + yinYang;
    return yinYang + positions[index - 1];
  }

  function makeLineView(lines, movingLine, markLabel, lineElements) {
    return lines.map((value, index) => {
      const number = index + 1;
      return Object.freeze({
        number,
        value,
        elementKey: lineElements[index] || '',
        moving: number === movingLine,
        mark: number === movingLine ? markLabel : '',
        label: lineLabel(number, value)
      });
    });
  }

  function makeHexagram(upper, lower, movingLine, markLabel) {
    const rawLines = lower.lines.concat(upper.lines);
    const lineElements = lower.lines.map(() => lower.elementKey).concat(upper.lines.map(() => upper.elementKey));
    const name = HEXAGRAM_NAMES[upper.name + lower.name];
    if (!name) throw new Error('未收录卦象：' + upper.name + lower.name);
    const palaceName = HEXAGRAM_PALACE[name];
    if (!palaceName) throw new Error('未收录卦宫：' + name);
    return Object.freeze({
      name,
      upper,
      lower,
      palace: PALACE_INFO[palaceName],
      rawLines: Object.freeze(rawLines.slice()),
      lines: Object.freeze(makeLineView(rawLines, movingLine, markLabel, lineElements))
    });
  }

  function getMutual(main) {
    const raw = main.rawLines;
    const lower = trigramFromLines(raw.slice(1, 4));
    const upper = trigramFromLines(raw.slice(2, 5));
    return makeHexagram(upper, lower, 0, '');
  }

  function getChanged(main, movingLine) {
    const raw = main.rawLines.slice();
    raw[movingLine - 1] = raw[movingLine - 1] === 1 ? 0 : 1;
    const lower = trigramFromLines(raw.slice(0, 3));
    const upper = trigramFromLines(raw.slice(3, 6));
    return makeHexagram(upper, lower, movingLine, '变');
  }

  function addRole(roleMap, trigram, role) {
    if (!roleMap[trigram.name]) roleMap[trigram.name] = [];
    roleMap[trigram.name].push(role);
  }

  function buildPalaceGrid(roleMap) {
    const layout = [
      '巽', '离', '坤',
      '震', null, '兑',
      '艮', '坎', '乾'
    ];
    return layout.map((name, index) => {
      if (!name) {
        return Object.freeze({ key: 'center', center: true, name: '中', direction: '中央', element: '土', elementKey: 'earth', roles: Object.freeze([]) });
      }
      const trigram = TRIGRAM_BY_NAME[name];
      return Object.freeze({
        key: trigram.name,
        name: trigram.name,
        symbol: trigram.symbol,
        direction: trigram.direction,
        palace: trigram.palace,
        element: trigram.element,
        elementKey: trigram.elementKey,
        roles: Object.freeze((roleMap[name] || []).slice()),
        used: Boolean(roleMap[name] && roleMap[name].length),
        index
      });
    });
  }

  function calculateMeihua(options) {
    const hour = options.hour;
    const minute = options.minute;
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      throw new Error('小时必须是 0–23 的整数');
    }
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
      throw new Error('分钟必须是 0–59 的整数');
    }

    const upperSum = hour;
    const lowerSum = minute;
    const movingSum = hour + minute;
    const upperNumber = mod8(upperSum);
    const lowerNumber = mod8(lowerSum);
    const movingLine = mod6(movingSum);
    const upper = TRIGRAM_BY_NUMBER[upperNumber];
    const lower = TRIGRAM_BY_NUMBER[lowerNumber];

    const main = makeHexagram(upper, lower, movingLine, '动');
    const mutual = getMutual(main);
    const changed = getChanged(main, movingLine);

    const roleMap = {};
    addRole(roleMap, main.upper, '主上');
    addRole(roleMap, main.lower, '主下');
    addRole(roleMap, mutual.upper, '互上');
    addRole(roleMap, mutual.lower, '互下');
    addRole(roleMap, changed.upper, '变上');
    addRole(roleMap, changed.lower, '变下');

    const movingLineText = lineLabel(movingLine, main.rawLines[movingLine - 1]);
    const solar = options.solar || null;
    const lunar = options.lunar || null;
    const epoch = options.epoch || null;
    const shichen = X.SHICHEN[X.getShichenIndex(hour)];
    const pillars = getFourPillars(solar, hour, epoch);

    return Object.freeze({
      mode: options.mode || '时间起卦',
      epoch,
      solar,
      lunar: lunar ? Object.freeze({ year: lunar.year, month: lunar.month, day: lunar.day, isLeap: Boolean(lunar.isLeap) }) : null,
      hour,
      minute,
      shichen,
      upperSum,
      lowerSum,
      movingSum,
      upperNumber,
      lowerNumber,
      movingLine,
      movingLineText,
      upper,
      lower,
      main,
      mutual,
      changed,
      pillars: Object.freeze(pillars),
      hexagrams: Object.freeze([
        Object.freeze({ label: '主卦', shortLabel: '主', key: 'main', name: main.name, upper: main.upper, lower: main.lower, palace: main.palace, lines: main.lines, note: '动爻 ' + movingLineText }),
        Object.freeze({ label: '互卦', shortLabel: '互', key: 'mutual', name: mutual.name, upper: mutual.upper, lower: mutual.lower, palace: mutual.palace, lines: mutual.lines, note: '二三四 / 三四五' }),
        Object.freeze({ label: '变卦', shortLabel: '变', key: 'changed', name: changed.name, upper: changed.upper, lower: changed.lower, palace: changed.palace, lines: changed.lines, note: '动爻变化' })
      ]),
      palaceGrid: Object.freeze(buildPalaceGrid(roleMap)),
      formula: Object.freeze({
        hour: '时 = ' + hour + ' 点',
        minute: '分 = ' + minute + ' 分',
        upper: '时 ' + hour + ' ÷ 8，余 ' + (upperSum % 8) + (upperSum % 8 === 0 ? '（取8）' : '') + ' → ' + upper.name + ' ' + upper.number,
        lower: '分 ' + minute + ' ÷ 8，余 ' + (lowerSum % 8) + (lowerSum % 8 === 0 ? '（取8）' : '') + ' → ' + lower.name + ' ' + lower.number,
        moving: '(' + hour + ' + ' + minute + ') ÷ 6，余 ' + (movingSum % 6) + (movingSum % 6 === 0 ? '（取6）' : '') + ' → ' + movingLineText
      })
    });
  }

  function buildMeihuaFromEpoch(epoch, mode) {
    const solar = X.getBeijingParts(epoch);
    const lunar = X.solarToLunar(solar.year, solar.month, solar.day);
    return calculateMeihua({
      lunar,
      solar,
      epoch,
      hour: solar.hour,
      minute: solar.minute,
      mode: mode || '当前时间'
    });
  }

  function buildMeihuaFromGregorian(input) {
    const epoch = X.beijingToEpoch(input);
    return buildMeihuaFromEpoch(epoch, input.mode || '指定公历');
  }

  function hexLinesText(hexagram) {
    return hexagram.lines.slice().reverse().map((line) => {
      const bar = line.value === 1 ? '▅▅▅▅▅' : '▅▅  ▅▅';
      return bar + (line.mark ? '  ← ' + line.mark : '') + '  ' + line.label;
    }).join('\n');
  }

  function formatMeihuaText(result, question) {
    const asked = String(question || '').trim();
    const lines = [
      '【梅花易数 · 时分起卦】',
      '起卦方式：' + result.mode,
      result.epoch ? '起卦时间：' + X.formatBeijingDateTime(result.epoch) + '（北京时间 UTC+8）' : '',
      result.lunar ? '农历：' + X.formatLunarDate(result.lunar) + ' ' + result.shichen.name + '时' : '',
      '报数：' + result.hour + ' 点 ' + result.minute + ' 分',
      result.pillars && result.pillars.length
        ? '四柱：' + result.pillars.map((pillar) => pillar.text + ' ' + pillar.xunKong + '空').join(' · ')
        : '',
      asked ? '所问之事：' + asked : '',
      '上卦：' + result.formula.upper,
      '下卦：' + result.formula.lower,
      '动爻：' + result.formula.moving,
      '',
      '主卦：' + result.main.name + '（' + result.main.upper.name + '上' + result.main.lower.name + '下）· 卦宫 ' + result.main.palace.name,
      '互卦：' + result.mutual.name + '（' + result.mutual.upper.name + '上' + result.mutual.lower.name + '下）· 卦宫 ' + result.mutual.palace.name,
      '变卦：' + result.changed.name + '（' + result.changed.upper.name + '上' + result.changed.lower.name + '下）· 卦宫 ' + result.changed.palace.name,
      '动爻：' + result.movingLineText,
      '',
      '主卦爻象：',
      hexLinesText(result.main),
      '',
      '互卦爻象：',
      hexLinesText(result.mutual),
      '',
      '变卦爻象：',
      hexLinesText(result.changed),
      '',
      '上卦：' + result.upper.name + ' ' + result.upper.symbol + ' · ' + result.upper.palace + ' · ' + result.upper.direction + ' · ' + result.upper.element,
      '下卦：' + result.lower.name + ' ' + result.lower.symbol + ' · ' + result.lower.palace + ' · ' + result.lower.direction + ' · ' + result.lower.element,
      '五行颜色：木青、火赤、土黄、金白、水黑。',
      '免责声明：本结果仅依据梅花易数时间起卦规则进行机械排盘，属于民俗文化娱乐参考，不构成预测、医疗、法律、投资等专业建议。'
    ].filter(Boolean);
    return lines.join('\n');
  }

  return Object.freeze({
    TRIGRAMS,
    HEXAGRAM_NAMES,
    calculateMeihua,
    buildMeihuaFromEpoch,
    buildMeihuaFromGregorian,
    buildPalaceGrid,
    formatMeihuaText,
    hexLinesText
  });
});
