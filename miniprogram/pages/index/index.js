const X = require('../../utils/xiaoliuren.js');

const MONTH_LABELS = X.MONTH_NAMES.map((name, index) => `${index + 1} 月 · ${name}`);
const HOUR_LABELS = X.SHICHEN.map((item) => `${item.name}时 · ${item.range}`);

function pad2(value) {
  return String(value).padStart(2, '0');
}

function buildDayLabels(maxDay) {
  const labels = [];
  for (let day = 1; day <= maxDay; day += 1) {
    labels.push(`${X.formatLunarDay(day)}（${day}）`);
  }
  return labels;
}

function dateString(parts) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function timeString(parts) {
  return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

Page({
  data: {
    mode: 'now',
    tabs: [
      { key: 'now', label: '当前时间' },
      { key: 'solar', label: '指定公历' },
      { key: 'lunar', label: '手动农历' }
    ],
    nowTime: '--:--:--',
    nowDate: '正在读取时间…',
    nowLunar: '农历换算中…',
    nowZi: '北京时间 UTC+8',
    nowWarn: false,
    solarDate: '',
    solarTime: '',
    lunarYear: '',
    lunarMonthIndex: 0,
    lunarDayIndex: 0,
    lunarHourIndex: 0,
    monthLabels: MONTH_LABELS,
    hourLabels: HOUR_LABELS,
    dayLabels: buildDayLabels(30),
    leap: false,
    leapAvailable: false,
    leapHint: '',
    lunarHint: '',
    dayHint: '',
    solarError: '',
    lunarError: '',
    result: {
      meta: {
        time: '—',
        lunar: '—',
        shichen: '—',
        mode: '—'
      },
      palmRows: [],
      timeNote: '时间口径：北京时间 UTC+8。'
    },
    resultText: '',
    copyStatus: '',
    chartScale: 1,
    chartScaleText: '1.0x',
    chartX: 0,
    chartY: 0,
    rulesOpen: false
  },

  onLoad() {
    const now = Date.now();
    const parts = X.getBeijingParts(now);
    const lunar = X.solarToLunar(parts.year, parts.month, parts.day);
    const hourIndex = X.getShichenIndex(parts.hour);

    this.setData({
      solarDate: dateString(parts),
      solarTime: timeString(parts),
      lunarYear: String(lunar.year),
      lunarMonthIndex: lunar.month - 1,
      lunarHourIndex: hourIndex,
      dayLabels: buildDayLabels(30)
    }, () => {
      this.syncLunar(lunar.day, lunar.isLeap);
      this.castNow(true);
    });

    this.updateNow();
  },

  onShow() {
    this.updateNow();
    this.clearClock();
    this.clock = setInterval(() => this.updateNow(), 1000);
  },

  onHide() {
    this.clearClock();
  },

  onUnload() {
    this.clearClock();
  },

  clearClock() {
    if (this.clock) {
      clearInterval(this.clock);
      this.clock = null;
    }
  },

  updateNow() {
    try {
      const now = Date.now();
      const parts = X.getBeijingParts(now);
      const lunar = X.solarToLunar(parts.year, parts.month, parts.day);
      const slot = X.getShichen(X.getShichenIndex(parts.hour));
      let zi = `${slot.name}时 · ${slot.range}`;
      let warn = false;

      if (parts.hour === 23) {
        zi = '晚子时 · 23:00–23:59 仍属当日';
        warn = true;
      } else if (parts.hour === 0) {
        zi = '早子时 · 00:00–00:59 已进次日';
        warn = true;
      }

      this.setData({
        nowTime: `${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`,
        nowDate: `${parts.year} 年 ${parts.month} 月 ${parts.day} 日 · ${X.formatWeekday(now)}`,
        nowLunar: `${X.formatLunarDate(lunar)} · ${slot.name}时`,
        nowZi: zi,
        nowWarn: warn
      });
    } catch (error) {
      this.setData({
        nowTime: '时间不可用',
        nowDate: '当前日期超出农历数据范围',
        nowLunar: '',
        nowZi: '请改用指定公历或手动农历',
        nowWarn: true
      });
    }
  },

  onTab(event) {
    const mode = event.currentTarget.dataset.mode;
    this.setData({
      mode,
      solarError: '',
      lunarError: ''
    }, () => {
      if (mode === 'lunar') this.syncLunar();
    });
  },

  syncLunar(desiredDay, desiredLeap) {
    const year = Number(this.data.lunarYear);
    const month = this.data.lunarMonthIndex + 1;
    const validYear = Number.isInteger(year) && year >= 1900 && year <= 2100;
    let leapMonth = 0;
    let leapAvailable = false;
    let leap = this.data.leap;
    let maxDay = 30;

    if (validYear) {
      leapMonth = X.getLeapMonth(year);
      leapAvailable = leapMonth === month;
      if (!leapAvailable) leap = false;
      if (desiredLeap !== undefined && leapAvailable) leap = Boolean(desiredLeap);
      try {
        maxDay = X.getMonthDays(year, month, leap);
      } catch (error) {
        maxDay = 30;
      }
    } else {
      leap = false;
    }

    const wantedDay = desiredDay === undefined ? this.data.lunarDayIndex + 1 : desiredDay;
    const day = Math.min(Math.max(Number(wantedDay) || 1, 1), maxDay);
    const dayLabels = buildDayLabels(maxDay);

    let leapHint = '本年无闰月';
    if (validYear && leapAvailable) {
      leapHint = `本年闰${X.MONTH_NAMES[leapMonth - 1]}，可勾选`;
    } else if (validYear && leapMonth) {
      leapHint = `本年闰${X.MONTH_NAMES[leapMonth - 1]}；仅该月可选`;
    }

    let lunarHint = '';
    if (!validYear) {
      lunarHint = '农历年需为 1900–2100 的整数。';
    } else if (leapMonth) {
      lunarHint = `本年闰${X.MONTH_NAMES[leapMonth - 1]}；闰月按本月序数起课，不另加位。`;
    } else {
      lunarHint = '本年无闰月；闰月按本月序数起课，不另加位。';
    }

    const dayHint = validYear
      ? `本月共 ${maxDay} 天${leap ? '（闰月）' : ''}；三十日仅在 30 天月可选。`
      : '请先输入 1900–2100 的农历年。';

    this.setData({
      dayLabels,
      lunarDayIndex: day - 1,
      leap,
      leapAvailable,
      leapHint,
      lunarHint,
      dayHint
    });
  },

  onLunarYearInput(event) {
    this.setData({
      lunarYear: event.detail.value,
      lunarError: ''
    }, () => this.syncLunar());
  },

  onLunarMonthChange(event) {
    this.setData({
      lunarMonthIndex: Number(event.detail.value),
      lunarError: ''
    }, () => this.syncLunar());
  },

  onLunarDayChange(event) {
    this.setData({
      lunarDayIndex: Number(event.detail.value),
      lunarError: ''
    });
  },

  onLunarHourChange(event) {
    this.setData({
      lunarHourIndex: Number(event.detail.value),
      lunarError: ''
    });
  },

  onLeapChange(event) {
    const leap = Boolean(event.detail.value);
    this.setData({
      leap,
      lunarError: ''
    }, () => this.syncLunar(undefined, leap));
  },

  onSolarDateChange(event) {
    this.setData({
      solarDate: event.detail.value,
      solarError: ''
    });
  },

  onSolarTimeChange(event) {
    this.setData({
      solarTime: event.detail.value,
      solarError: ''
    });
  },

  castNow(initial) {
    try {
      const chart = X.buildChartFromEpoch(Date.now(), '当前时间');
      this.renderChart(chart);
      if (!initial) this.scrollToResult();
    } catch (error) {
      wx.showToast({ title: error.message || '当前时间排盘失败', icon: 'none' });
    }
  },

  castSolar() {
    this.setData({ solarError: '' });
    try {
      const dateParts = String(this.data.solarDate).split('-').map(Number);
      const timeParts = String(this.data.solarTime).split(':').map(Number);
      if (dateParts.length !== 3 || timeParts.length < 2) {
        throw new Error('请选择公历日期与时间');
      }
      const chart = X.buildChartFromGregorian({
        year: dateParts[0],
        month: dateParts[1],
        day: dateParts[2],
        hour: timeParts[0],
        minute: timeParts[1],
        second: 0,
        mode: '指定公历'
      });
      this.renderChart(chart);
      this.scrollToResult();
    } catch (error) {
      this.setData({ solarError: error.message || '公历排盘失败' });
      wx.showToast({ title: error.message || '公历排盘失败', icon: 'none' });
    }
  },

  castLunar() {
    this.setData({ lunarError: '' });
    try {
      const year = Number(this.data.lunarYear);
      const month = this.data.lunarMonthIndex + 1;
      const day = this.data.lunarDayIndex + 1;
      const hourIndex = this.data.lunarHourIndex;
      const isLeap = this.data.leap && this.data.leapAvailable;

      if (!Number.isInteger(year)) throw new Error('请输入 1900–2100 的农历年');
      if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('请选择农历月');
      if (!Number.isInteger(day) || day < 1) throw new Error('请选择农历日');
      if (!Number.isInteger(hourIndex) || hourIndex < 0 || hourIndex > 11) throw new Error('请选择时辰');

      const chart = X.buildChartFromLunar({
        year,
        month,
        day,
        isLeap,
        hourIndex,
        mode: '手动农历'
      });
      this.renderChart(chart);
      this.scrollToResult();
    } catch (error) {
      this.setData({ lunarError: error.message || '农历排盘失败' });
      wx.showToast({ title: error.message || '农历排盘失败', icon: 'none' });
    }
  },

  randomCast() {
    try {
      const input = X.randomLunarInput(Math.random);
      this.setData({
        lunarYear: String(input.year),
        lunarMonthIndex: input.month - 1,
        lunarHourIndex: input.hourIndex,
        leap: input.isLeap,
        lunarError: ''
      }, () => {
        this.syncLunar(input.day, input.isLeap);
        const chart = X.buildChartFromLunar({
          year: input.year,
          month: input.month,
          day: input.day,
          isLeap: input.isLeap,
          hourIndex: input.hourIndex,
          mode: '随机起课'
        });
        this.renderChart(chart);
        this.scrollToResult();
      });
    } catch (error) {
      wx.showToast({ title: error.message || '随机起课失败', icon: 'none' });
    }
  },

  goMeihua() {
    wx.navigateTo({ url: '/pages/meihua/meihua' });
  },

  resetAll() {
    const now = Date.now();
    const parts = X.getBeijingParts(now);
    const lunar = X.solarToLunar(parts.year, parts.month, parts.day);
    const hourIndex = X.getShichenIndex(parts.hour);

    this.setData({
      mode: 'now',
      solarDate: dateString(parts),
      solarTime: timeString(parts),
      lunarYear: String(lunar.year),
      lunarMonthIndex: lunar.month - 1,
      lunarHourIndex: hourIndex,
      solarError: '',
      lunarError: ''
    }, () => {
      this.syncLunar(lunar.day, lunar.isLeap);
      this.castNow(true);
      this.updateNow();
    });
  },

  renderChart(chart) {
    const advanced = X.getAdvancedChart(chart);
    const cells = advanced.cells.map((cell) => ({
      pos: cell.pos,
      theme: cell.palace.index,
      palace: cell.palace.name,
      deity: cell.deity,
      star: cell.star,
      starVoid: cell.star === '空',
      primaryName: cell.primary.name,
      stems: cell.primary.stems,
      bagua: cell.primary.bagua,
      symbol: cell.primary.symbol,
      relative: cell.relative,
      markers: cell.markers.map((marker) => ({
        key: marker.key,
        label: marker.label,
        title: marker.title
      })),
      isFinal: cell.pos === advanced.finalPos
    }));

    const palmRows = advanced.grid.map((row, rowIndex) => ({
      key: `row-${rowIndex}`,
      cells: row.map((pos) => cells[pos])
    }));
    const meta = {
      time: `${X.formatBeijingDateTime(chart.epoch)}（${X.formatWeekday(chart.epoch)}）`,
      lunar: `${X.getGanzhiYear(chart.lunar.year)}年 · ${X.formatLunarDate(chart.lunar)} ${chart.shichen.name}时`,
      shichen: `${chart.shichen.name}时（${chart.shichen.range}）${chart.ziNote ? ` · ${chart.ziNote}` : ''}`,
      mode: chart.mode
    };

    const timeNote = chart.mode === '手动农历' || chart.mode === '随机起课'
      ? '时间口径：北京时间 UTC+8；手动/随机农历按所选日期与时辰换算，子时取早子时 00:00–00:59。'
      : '时间口径：北京时间 UTC+8；23:00–23:59 仍属当日，00:00–00:59 已进次日。';

    this.setData({
      result: {
        meta,
        palmRows,
        timeNote
      },
      resultText: X.formatChartText(chart),
      copyStatus: ''
    });
  },

  toggleRules() {
    this.setData({ rulesOpen: !this.data.rulesOpen });
  },

  onChartScale(event) {
    const scale = Number(event.detail.scale) || 1;
    this.setData({
      chartScale: scale,
      chartScaleText: `${scale.toFixed(1)}x`
    });
  },

  onChartTap() {
    const now = Date.now();
    if (!this.lastChartTap || now - this.lastChartTap > 300) {
      this.lastChartTap = now;
      return;
    }
    this.lastChartTap = 0;
    const next = this.data.chartScale > 1.15 ? 1 : 2.2;
    this.setData({
      chartScale: next,
      chartScaleText: `${next.toFixed(1)}x`,
      chartX: 0,
      chartY: 0
    });
  },

  resetChartView() {
    this.setData({
      chartScale: 1,
      chartScaleText: '1.0x',
      chartX: 0,
      chartY: 0
    });
  },

  scrollToResult() {
    try {
      wx.pageScrollTo({ selector: '#resultArea', duration: 280 });
    } catch (error) {
      // 低版本基础库不支持 selector 时静默处理。
    }
  },

  copyResult() {
    if (!this.data.resultText) return;
    wx.setClipboardData({
      data: this.data.resultText,
      success: () => {
        this.setData({ copyStatus: '已复制' });
        wx.showToast({ title: '结果已复制', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '复制失败，请重试', icon: 'none' });
      }
    });
  },

  onShareAppMessage() {
    return {
      title: '六宫掌图 · 离线小六壬排盘',
      path: '/pages/index/index'
    };
  }
});
