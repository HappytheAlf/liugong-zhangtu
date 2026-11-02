const X = require('../../utils/xiaoliuren');
const M = require('../../utils/meihua');

function pad2(value) {
  return String(value).padStart(2, '0');
}

function dateString(parts) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function timeString(parts) {
  return `${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`;
}

Page({
  data: {
    mode: 'now',
    solarDate: '',
    solarTime: '',
    nowText: '--:--:--',
    error: '',
    result: null,
    resultText: '',
    detailsOpen: false,
    question: ''
  },

  onLoad() {
    this.castNow();
    this.clock = setInterval(() => {
      const parts = X.getBeijingParts(Date.now());
      this.setData({ nowText: timeString(parts) });
    }, 1000);
  },

  onUnload() {
    if (this.clock) clearInterval(this.clock);
  },

  goBack() {
    wx.navigateBack();
  },

  onMode(event) {
    const mode = event.currentTarget.dataset.mode;
    if (mode === 'now') {
      this.setData({ mode: 'now' });
      this.castNow();
      return;
    }
    const parts = X.getBeijingParts(Date.now());
    this.setData({
      mode: 'manual',
      solarDate: this.data.solarDate || dateString(parts),
      solarTime: this.data.solarTime || timeString(parts),
      error: ''
    });
  },

  onDateChange(event) {
    this.setData({ solarDate: event.detail.value, error: '' });
  },

  onTimeChange(event) {
    this.setData({ solarTime: event.detail.value, error: '' });
  },

  cast() {
    if (this.data.mode === 'now') {
      this.castNow();
      return;
    }
    this.castManual();
  },

  castNow() {
    try {
      const parts = X.getBeijingParts(Date.now());
      this.setData({
        mode: 'now',
        solarDate: dateString(parts),
        solarTime: timeString(parts),
        error: ''
      });
      this.render(M.buildMeihuaFromEpoch(Date.now(), '当前时间'));
    } catch (error) {
      this.setData({ error: error.message || '起卦失败' });
    }
  },

  castManual() {
    try {
      const nowParts = X.getBeijingParts(Date.now());
      const date = this.data.solarDate || dateString(nowParts);
      const time = this.data.solarTime;
      if (!time) throw new Error('请选择起卦时间');
      const dateParts = date.split('-').map(Number);
      const timeParts = time.split(':').map(Number);
      this.render(M.buildMeihuaFromGregorian({
        year: dateParts[0],
        month: dateParts[1],
        day: dateParts[2],
        hour: timeParts[0],
        minute: timeParts[1] || 0,
        second: timeParts[2] || 0,
        mode: '指定时间'
      }));
      this.setData({ error: '' });
    } catch (error) {
      this.setData({ error: error.message || '起卦失败' });
      wx.showToast({ title: error.message || '起卦失败', icon: 'none' });
    }
  },

  toggleDetails() {
    this.setData({ detailsOpen: !this.data.detailsOpen });
  },

  onQuestionInput(event) {
    this.setData({ question: event.detail.value });
  },

  render(raw) {
    this.rawResult = raw;
    const lunarText = raw.lunar ? X.formatLunarDate(raw.lunar).replace(/^农历\s*/, '') : '';
    const display = Object.assign({}, raw, {
      lunarText,
      dateText: raw.solar ? `${raw.solar.year}年${raw.solar.month}月${raw.solar.day}日` : '',
      lunarShort: lunarText.replace(/^\d+\s*年\s*/, '').replace(/\s+/g, ''),
      timeShort: `${pad2(raw.hour)}:${pad2(raw.minute)}`,
      timeText: raw.epoch ? X.formatBeijingDateTime(raw.epoch) : '',
      hexagrams: raw.hexagrams.map((hex) => Object.assign({}, hex, {
        lines: hex.lines.slice().reverse()
      })),
      pillars: (raw.pillars || []).map((pillar) => Object.assign({}, pillar, {
        cells: [
          { left: pillar.stem, right: pillar.xunKong[0] || '' },
          { left: pillar.branch, right: pillar.xunKong[1] || '' },
          { left: pillar.label, right: '空' }
        ]
      }))
    });
    this.setData({
      result: display,
      resultText: M.formatMeihuaText(raw, this.data.question),
      error: ''
    });
  },

  copyResult() {
    const text = this.rawResult
      ? M.formatMeihuaText(this.rawResult, this.data.question)
      : this.data.resultText;
    if (!text) return;
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  }
});
