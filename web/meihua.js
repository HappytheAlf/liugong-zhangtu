(function () {
  'use strict';

  const X = window.XLRCore;
  const M = window.MeihuaCore;
  const $ = (selector) => document.querySelector(selector);
  const pad2 = (value) => String(value).padStart(2, '0');

  const els = {
    timeInput: $('#timeInput'),
    nowText: $('#nowText'),
    castNow: $('#castNow'),
    castBtn: $('#castBtn'),
    error: $('#error'),
    result: $('#result'),
    infoDate: $('#infoDate'),
    infoReport: $('#infoReport'),
    infoMoving: $('#infoMoving'),
    pillars: $('#pillars'),
    hexagrams: $('#hexagrams'),
    formula: $('#formula'),
    question: $('#question'),
    copyBtn: $('#copyBtn'),
    copyStatus: $('#copyStatus')
  };

  let rawResult = null;
  let clockTimer = null;

  function timeValue(parts) {
    return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
  }

  function updateClock() {
    const parts = X.getBeijingParts(Date.now());
    els.nowText.textContent = `当前 ${timeValue(parts)}:${pad2(parts.second)}`;
  }

  function castEpoch(epoch) {
    try {
      rawResult = M.buildMeihuaFromEpoch(epoch, 'Web 时间起卦');
      render(rawResult);
      els.error.textContent = '';
    } catch (error) {
      els.error.textContent = error.message || '起卦失败';
    }
  }

  function castInput() {
    const value = els.timeInput.value;
    if (!/^\d{2}:\d{2}$/.test(value)) {
      els.error.textContent = '请选择起卦时间';
      return;
    }
    const parts = X.getBeijingParts(Date.now());
    const [hour, minute] = value.split(':').map(Number);
    const epoch = X.beijingToEpoch({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour,
      minute,
      second: 0
    });
    castEpoch(epoch);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function render(result) {
    const lunarShort = X.formatLunarDate(result.lunar)
      .replace(/^农历\s*/, '')
      .replace(/^\d+\s*年\s*/, '')
      .replace(/\s+/g, '');
    els.infoDate.textContent = `${result.solar.year}年${result.solar.month}月${result.solar.day}日（${lunarShort}）${pad2(result.hour)}:${pad2(result.minute)}`;
    els.infoReport.textContent = `（${result.hour}, ${result.minute}）`;
    els.infoMoving.textContent = `动爻 ${result.movingLineText}`;

    els.pillars.innerHTML = result.pillars.map((pillar) => {
      const cells = [
        [pillar.stem, pillar.xunKong[0] || ''],
        [pillar.branch, pillar.xunKong[1] || ''],
        [pillar.label, '空']
      ];
      return `<div class="pillar">${cells.map((cell) => `
        <div class="pillar-cell">
          <span class="stem-${pillar.elementKey}">${escapeHtml(cell[0])}</span>
          <span class="kong">${escapeHtml(cell[1])}</span>
        </div>`).join('')}</div>`;
    }).join('');

    els.hexagrams.innerHTML = result.hexagrams.map((hex) => {
      const lines = hex.lines.slice().reverse().map((line) => {
        const body = line.value
          ? '<span class="yao-solid"></span>'
          : '<span class="yao-broken"><span class="yao-seg"></span><span class="yao-seg"></span></span>';
        return `<div class="yao line-${line.elementKey} ${line.moving ? 'is-moving' : ''}">
          <span class="yao-label">${escapeHtml(line.label)}</span>
          <span class="yao-body">${body}</span>
          <span class="yao-mark">${escapeHtml(line.mark || '')}</span>
        </div>`;
      }).join('');
      return `<div class="hex-col">
        <span class="col-label">[${escapeHtml(hex.shortLabel)}]</span>
        <span class="col-palace">「${escapeHtml(hex.palace.name)}」</span>
        <div class="yao-stack">${lines}</div>
        <span class="col-name">${escapeHtml(hex.name)}</span>
        <span class="col-trigram">${escapeHtml(hex.upper.name)}上${escapeHtml(hex.lower.name)}下</span>
      </div>`;
    }).join('');

    els.formula.innerHTML = `
      <p><b>上卦</b>　${escapeHtml(result.formula.upper)}</p>
      <p><b>下卦</b>　${escapeHtml(result.formula.lower)}</p>
      <p><b>动爻</b>　${escapeHtml(result.formula.moving)}</p>
      <div class="palace-line">
        <span>主卦 · ${escapeHtml(result.main.palace.name)} · ${escapeHtml(result.main.palace.element)}</span>
        <span>互卦 · ${escapeHtml(result.mutual.palace.name)} · ${escapeHtml(result.mutual.palace.element)}</span>
        <span>变卦 · ${escapeHtml(result.changed.palace.name)} · ${escapeHtml(result.changed.palace.element)}</span>
      </div>
      <div class="legend">
        <span><i class="wood"></i>木</span>
        <span><i class="fire"></i>火</span>
        <span><i class="earth"></i>土</span>
        <span><i class="metal"></i>金</span>
        <span><i class="water"></i>水</span>
      </div>`;

    els.result.hidden = false;
    els.copyStatus.textContent = '';
  }

  function copyResult() {
    if (!rawResult) return;
    const text = M.formatMeihuaText(rawResult, els.question.value);
    const done = () => {
      els.copyStatus.textContent = '已复制';
      setTimeout(() => { els.copyStatus.textContent = ''; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      done();
    } catch (error) {
      els.error.textContent = '复制失败，请手动选择文本复制';
    }
    area.remove();
  }

  els.castNow.addEventListener('click', () => {
    const parts = X.getBeijingParts(Date.now());
    els.timeInput.value = timeValue(parts);
    castEpoch(Date.now());
  });
  els.castBtn.addEventListener('click', castInput);
  els.copyBtn.addEventListener('click', copyResult);

  const nowParts = X.getBeijingParts(Date.now());
  els.timeInput.value = timeValue(nowParts);
  updateClock();
  clockTimer = setInterval(updateClock, 1000);
  castInput();

  window.addEventListener('pagehide', () => {
    if (clockTimer) clearInterval(clockTimer);
  });
})();
