(function(){
  'use strict';

  const $ = (id) => document.getElementById(id);
  const txt = (el) => (el && el.textContent ? el.textContent : '').trim();
  const isEn = () => localStorage.getItem('sewonGhgUiLanguage') === 'en';
  const t = (ko, en) => isEn() ? en : ko;

  function addStyle(){
    if ($('semsDeleteForceStyle')) return;
    const style = document.createElement('style');
    style.id = 'semsDeleteForceStyle';
    style.textContent = `
      #monthlyOutputBasisWrap,
      .monthly-output-wrap{
        min-width:240px!important;
        width:240px!important;
        flex:0 0 240px!important;
        overflow:visible!important;
        white-space:nowrap!important;
        padding:0 14px!important;
      }
      #monthlyOutputBasisLabel{display:inline-block!important;min-width:54px!important;white-space:nowrap!important;overflow:visible!important;}
      #monthlyOutputBasis{
        min-width:132px!important;
        width:132px!important;
        max-width:none!important;
        overflow:visible!important;
        white-space:nowrap!important;
        padding-right:24px!important;
        text-overflow:clip!important;
      }
      #entriesTab th.sems-force-delete-head{cursor:pointer!important;text-align:center!important;user-select:none!important;min-width:72px!important;}
      #entriesTab th.sems-force-delete-head:hover{background:#eef2ff!important;color:#1d4ed8!important;}
      #entriesTab td.sems-force-delete-cell{text-align:center!important;vertical-align:middle!important;}
      .sems-force-delete-check{width:18px!important;height:18px!important;accent-color:#2563eb!important;cursor:pointer!important;}
      .sems-force-delete-check:disabled{opacity:.35!important;cursor:not-allowed!important;}
      .sems-force-selected-delete{background:#fee2e2!important;color:#991b1b!important;border:1px solid #fecaca!important;}
    `;
    document.head.appendChild(style);
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
        return Number(e.year) === ym.year &&
          Number(e.month) === ym.month &&
          normalize(e.company) === company &&
          normalize(e.site) === site &&
          normalize(e.source) === source &&
          (!amount || normalize(e.amount) === amount || normalize(Number(e.amount).toLocaleString('ko-KR')) === amount) &&
          (!emission || normalize(e.emission).startsWith(emission) || normalize(Number(e.emission).toLocaleString('ko-KR', { maximumFractionDigits:3 })) === emission);
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
      let id = parseIdFromButton(deleteButton) || findIdFromEntries(row);
      if (!id) return;
      const disabled = !!(deleteButton && deleteButton.disabled);
      cell.classList.add('sems-force-delete-cell');
      cell.innerHTML = '<input type="checkbox" class="sems-force-delete-check" data-entry-id="' + id + '" ' + (disabled ? 'disabled' : '') + ' title="' + t('삭제할 데이터 선택', 'Select row to delete') + '">';
    });
  }

  function apply(){
    addStyle();
    patchHeader();
    patchBulkButton();
    patchRows();
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
      if (typeof entries !== 'undefined' && Array.isArray(entries)) {
        entries = entries.filter((entry) => !set.has(String(entry.id)));
      } else {
        ids.forEach((id) => {
          if (typeof requestDeleteEntry === 'function') {
            requestDeleteEntry(id);
            requestDeleteEntry(id);
          } else if (typeof deleteEntry === 'function') {
            deleteEntry(id);
          }
        });
      }
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

  function hookRender(){
    ['renderEntries','render'].forEach((name) => {
      const original = window[name];
      if (typeof original === 'function' && !original.__semsForceDeleteWrapped) {
        window[name] = function(){
          const result = original.apply(this, arguments);
          apply();
          requestAnimationFrame(apply);
          setTimeout(apply, 30);
          return result;
        };
        window[name].__semsForceDeleteWrapped = true;
      }
    });
  }

  function observe(){
    const tbody = $('entryRows');
    if (tbody && tbody.dataset.semsForceDeleteObserver !== '1') {
      tbody.dataset.semsForceDeleteObserver = '1';
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
