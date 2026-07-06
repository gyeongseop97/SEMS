(function(){
  'use strict';

  const $ = (id) => document.getElementById(id);
  const txt = (el) => (el && el.textContent ? el.textContent : '').trim();
  const isEn = () => localStorage.getItem('sewonGhgUiLanguage') === 'en';
  const t = (ko, en) => isEn() ? en : ko;
  const enMonths = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function setImportant(el, prop, value){
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function addStyle(){
    let style = $('semsCleanPatchStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'semsCleanPatchStyle';
      document.head.appendChild(style);
    }
    style.textContent = `
      #entriesTab th.sems-force-delete-head{cursor:pointer!important;text-align:center!important;user-select:none!important;min-width:72px!important;}
      #entriesTab th.sems-force-delete-head:hover{background:#eef2ff!important;color:#1d4ed8!important;}
      #entriesTab td.sems-force-delete-cell{text-align:center!important;vertical-align:middle!important;}
      .sems-force-delete-check{width:18px!important;height:18px!important;accent-color:#2563eb!important;cursor:pointer!important;}
      .sems-force-delete-check:disabled{opacity:.35!important;cursor:not-allowed!important;}
      .sems-force-selected-delete{background:#fee2e2!important;color:#991b1b!important;border:1px solid #fecaca!important;}
      #monthlyOutputBasisWrap.monthly-output-wrap{display:inline-grid!important;grid-template-columns:82px 92px!important;align-items:stretch!important;gap:0!important;height:40px!important;min-width:174px!important;width:174px!important;max-width:174px!important;flex:0 0 174px!important;box-sizing:border-box!important;padding:0!important;overflow:hidden!important;white-space:nowrap!important;border-radius:999px!important;border:1px solid #dbeafe!important;background:#f8fbff!important;}
      #monthlyOutputBasisLabel{display:flex!important;align-items:center!important;justify-content:center!important;width:82px!important;height:40px!important;box-sizing:border-box!important;padding:0 8px!important;overflow:hidden!important;white-space:nowrap!important;text-overflow:clip!important;font-size:12px!important;font-weight:950!important;letter-spacing:-.45px!important;color:#0f172a!important;border-right:1px solid #dbeafe!important;line-height:1!important;}
      #monthlyOutputBasis{display:block!important;appearance:auto!important;-webkit-appearance:menulist!important;width:92px!important;min-width:92px!important;max-width:92px!important;height:40px!important;line-height:40px!important;box-sizing:border-box!important;border:0!important;border-radius:0!important;background:transparent!important;padding-left:10px!important;padding-right:22px!important;overflow:visible!important;white-space:nowrap!important;text-overflow:clip!important;font-size:12px!important;font-weight:950!important;letter-spacing:-.45px!important;color:#0f172a!important;outline:none!important;}
    `;
  }

  function patchOutputBasisLayout(){
    const wrap = $('monthlyOutputBasisWrap') || document.querySelector('.monthly-output-wrap');
    const labelEl = $('monthlyOutputBasisLabel') || (wrap ? wrap.querySelector('span') : null);
    const select = $('monthlyOutputBasis') || (wrap ? wrap.querySelector('select') : null);
    if (!wrap || !select) return;

    const current = select.value || localStorage.getItem('semsMonthlyOutputBasis') || 'all';
    const monthText = t('해당 월', 'Selected month');
    const allText = t('전체', 'All');
    if (labelEl) labelEl.textContent = t('출력 기준', 'View');
    if (select.options.length < 2 || select.options[0].textContent !== allText || select.options[1].textContent !== monthText) {
      select.innerHTML = '<option value="all">' + allText + '</option><option value="month">' + monthText + '</option>';
      select.value = current;
    }
  }

  function patchMonthNames(){
    const monthSelect = $('month');
    if (!monthSelect) return;
    Array.from(monthSelect.options).forEach((opt, idx) => {
      const raw = String(opt.value || '').match(/\d+/);
      const month = raw ? Number(raw[0]) : idx + 1;
      if (!month || month < 1 || month > 12) return;
      opt.textContent = isEn() ? enMonths[month - 1] : month + '월';
    });

    if (isEn()) {
      document.querySelectorAll('.monthly-status-table thead th').forEach((th) => {
        const v = txt(th);
        const m = v.match(/^(\d{1,2})(MONTH|Month|month)$/);
        if (m) th.textContent = enMonths[Number(m[1]) - 1] || v;
      });
    }
  }

  function normalize(v){
    return String(v == null ? '' : v).replace(/,/g, '').replace(/\s+/g, ' ').trim();
  }

  function parseYm(row){
    const first = txt(row.querySelector('td'));
    const m = first.match(/(\d{4})\D+(\d{1,2})/);
    return m ? { year:Number(m[1]), month:Number(m[2]) } : { year:null, month:null };
  }

  function parseIdFromButton(button){
    if (!button) return '';
    const onclick = button.getAttribute('onclick') || '';
    const m = onclick.match(/(?:requestDeleteEntry|deleteEntry)\(['"]([^'"]+)['"]\)/);
    return m ? m[1] : '';
  }

  function findIdFromEntries(row){
    try {
      if (typeof entries === 'undefined' || !Array.isArray(entries)) return '';
      const cells = row.querySelectorAll('td');
      const ym = parseYm(row);
      const company = cells[1] ? normalize(cells[1].textContent) : '';
      const site = cells[2] ? normalize(cells[2].textContent) : '';
      const source = cells[4] ? normalize(cells[4].textContent) : '';
      const amount = cells[8] ? normalize(cells[8].textContent) : '';
      const emission = cells[10] ? normalize(cells[10].textContent) : '';
      const found = entries.find((e) => {
        return Number(e.year) === ym.year && Number(e.month) === ym.month && normalize(e.company) === company && normalize(e.site) === site && normalize(e.source) === source && (!amount || normalize(e.amount) === amount || normalize(Number(e.amount).toLocaleString('ko-KR')) === amount) && (!emission || normalize(e.emission).startsWith(emission) || normalize(Number(e.emission).toLocaleString('ko-KR', { maximumFractionDigits:3 })) === emission);
      });
      return found ? String(found.id) : '';
    } catch(e) {
      return '';
    }
  }

  function rowDeleteCell(row){
    const cells = row.querySelectorAll('td');
    return cells.length ? cells[cells.length - 1] : null;
  }

  function visibleChecks(){
    return Array.from(document.querySelectorAll('.sems-force-delete-check')).filter((box) => {
      const row = box.closest('tr');
      return row && row.style.display !== 'none' && !box.disabled;
    });
  }

  function toggleVisible(){
    const boxes = visibleChecks();
    if (!boxes.length) return;
    const all = boxes.every((box) => box.checked);
    boxes.forEach((box) => box.checked = !all);
  }

  function selectedIds(){
    return visibleChecks().filter((box) => box.checked).map((box) => box.dataset.entryId).filter(Boolean);
  }

  function patchHeader(){
    const table = document.querySelector('#entriesTab table');
    const tr = table && table.querySelector('thead tr');
    if (!tr) return;
    const ths = tr.querySelectorAll('th');
    const th = ths[ths.length - 1];
    if (!th) return;
    th.textContent = t('삭제', 'Delete');
    th.classList.add('sems-force-delete-head');
    th.title = t('클릭하면 현재 화면의 항목을 전체 선택/해제합니다.', 'Click to select/deselect all visible rows.');
    if (th.dataset.semsForceDeleteHead !== '1') {
      th.dataset.semsForceDeleteHead = '1';
      th.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        toggleVisible();
      }, true);
    }
  }

  function patchBulkButton(){
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = $('clearAll') || buttons.find((b) => {
      const v = txt(b);
      return v.includes('전체 데이터 삭제') || v.includes('선택 데이터 삭제') || v.includes('Delete all') || v.includes('Delete selected');
    });
    if (!btn) return;
    btn.textContent = t('선택 데이터 삭제', 'Delete selected');
    btn.classList.add('sems-force-selected-delete');
    btn.title = t('체크한 데이터만 삭제합니다.', 'Delete only checked rows.');
    if (btn.dataset.semsForceDeleteBtn !== '1') {
      btn.dataset.semsForceDeleteBtn = '1';
      btn.addEventListener('click', function(e){
        e.preventDefault();
        e.stopImmediatePropagation();
        deleteSelected();
      }, true);
    }
  }

  function patchRows(){
    const rows = Array.from(document.querySelectorAll('#entryRows tr'));
    rows.forEach((row) => {
      if (row.id === 'inlineEntryRow' || row.classList.contains('inline-entry-empty')) return;
      const cell = rowDeleteCell(row);
      if (!cell) return;
      if (cell.querySelector('.sems-force-delete-check')) return;
      const deleteButton = Array.from(cell.querySelectorAll('button')).find((button) => {
        const v = txt(button);
        return v.includes('삭제') || v.includes('Delete');
      });
      const id = parseIdFromButton(deleteButton) || findIdFromEntries(row);
      if (!id) return;
      const disabled = !!(deleteButton && deleteButton.disabled);
      cell.classList.add('sems-force-delete-cell');
      cell.innerHTML = '<input type="checkbox" class="sems-force-delete-check" data-entry-id="' + id + '" ' + (disabled ? 'disabled' : '') + ' title="' + t('삭제할 데이터 선택', 'Select row to delete') + '">';
    });
  }

  function deleteSelected(){
    const ids = selectedIds();
    if (!ids.length) {
      alert(t('삭제할 데이터를 체크해 주세요.', 'Please check rows to delete.'));
      return;
    }
    if (!confirm(t('선택한 데이터 ' + ids.length + '건을 삭제할까요?', 'Delete ' + ids.length + ' selected row(s)?'))) return;
    try {
      if (typeof pushHistory === 'function') pushHistory();
      const set = new Set(ids.map(String));
      if (typeof entries !== 'undefined' && Array.isArray(entries)) entries = entries.filter((entry) => !set.has(String(entry.id)));
      if (typeof pendingDeleteId !== 'undefined') pendingDeleteId = null;
      if (typeof pendingDeleteTimerId !== 'undefined') clearTimeout(pendingDeleteTimerId);
      if (typeof saveEntries === 'function') saveEntries();
      if (typeof render === 'function') render();
      requestAnimationFrame(apply);
      setTimeout(apply, 100);
      alert(t('선택 데이터가 삭제되었습니다.', 'Selected rows have been deleted.'));
    } catch(err) {
      console.error(err);
      alert(t('선택 데이터 삭제 중 오류가 발생했습니다.', 'An error occurred while deleting selected rows.') + '\n' + (err && err.message ? err.message : err));
    }
  }

  function apply(){
    addStyle();
    patchOutputBasisLayout();
    patchMonthNames();
    patchHeader();
    patchBulkButton();
    patchRows();
  }

  function hookRender(){
    ['renderEntries','render','switchTab'].forEach((name) => {
      const original = window[name];
      if (typeof original === 'function' && !original.__semsCleanWrapped) {
        window[name] = function(){
          const result = original.apply(this, arguments);
          apply();
          requestAnimationFrame(apply);
          setTimeout(apply, 30);
          return result;
        };
        window[name].__semsCleanWrapped = true;
      }
    });
  }

  function observe(){
    const tbody = $('entryRows');
    if (tbody && tbody.dataset.semsCleanObserver !== '1') {
      tbody.dataset.semsCleanObserver = '1';
      new MutationObserver(apply).observe(tbody, { childList:true, subtree:false });
    }
  }

  function boot(){
    hookRender();
    observe();
    apply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(boot, 200);
  setTimeout(boot, 800);
  setTimeout(boot, 1600);
  setInterval(apply, 2000);
})();
