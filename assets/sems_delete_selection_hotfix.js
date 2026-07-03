(function(){
  'use strict';

  const $ = (id) => document.getElementById(id);
  const text = (el) => (el && el.textContent ? el.textContent : '').trim();
  const lang = () => localStorage.getItem('sewonGhgUiLanguage') === 'en' ? 'en' : 'ko';
  const label = (ko, en) => lang() === 'en' ? en : ko;

  function findBulkDeleteButton(){
    return $('clearAll') || Array.from(document.querySelectorAll('button')).find((button) => {
      const value = text(button);
      return value.includes('전체 데이터 삭제') || value.includes('Delete all') || value.includes('선택 데이터 삭제') || value.includes('Delete selected');
    });
  }

  function parseIdFromDeleteButton(button){
    if (!button) return '';
    const onclick = button.getAttribute('onclick') || '';
    const match = onclick.match(/(?:requestDeleteEntry|deleteEntry)\(['"]([^'"]+)['"]\)/);
    return match ? match[1] : '';
  }

  function visibleCheckboxes(){
    return Array.from(document.querySelectorAll('.sems-delete-check')).filter((box) => {
      const row = box.closest('tr');
      return row && row.style.display !== 'none' && !box.disabled;
    });
  }

  function toggleAllVisible(){
    const boxes = visibleCheckboxes();
    if (!boxes.length) return;
    const allChecked = boxes.every((box) => box.checked);
    boxes.forEach((box) => { box.checked = !allChecked; });
  }

  function selectedIds(){
    return visibleCheckboxes().filter((box) => box.checked).map((box) => box.dataset.entryId).filter(Boolean);
  }

  function deleteSelected(){
    const ids = selectedIds();
    if (!ids.length) {
      alert(label('삭제할 데이터를 체크해 주세요.', 'Please check rows to delete.'));
      return;
    }
    if (!confirm(label('선택한 데이터 ' + ids.length + '건을 삭제할까요?', 'Delete ' + ids.length + ' selected row(s)?'))) return;

    try {
      if (typeof pushHistory === 'function') pushHistory();

      const idSet = new Set(ids.map(String));
      if (typeof entries !== 'undefined' && Array.isArray(entries)) {
        entries = entries.filter((entry) => !idSet.has(String(entry.id)));
      } else {
        alert(label('삭제 대상 데이터를 찾지 못했습니다. 페이지를 새로고침 후 다시 시도해 주세요.', 'Could not find entry data. Refresh the page and try again.'));
        return;
      }

      if (typeof pendingDeleteId !== 'undefined') pendingDeleteId = null;
      if (typeof pendingDeleteTimerId !== 'undefined') clearTimeout(pendingDeleteTimerId);
      if (typeof saveEntries === 'function') saveEntries();
      if (typeof render === 'function') render();

      requestAnimationFrame(applyDeleteCheckboxUi);
      alert(label('선택 데이터가 삭제되었습니다.', 'Selected rows have been deleted.'));
    } catch (error) {
      console.error(error);
      alert(label('선택 데이터 삭제 중 오류가 발생했습니다.', 'An error occurred while deleting selected rows.') + '\n' + (error && error.message ? error.message : error));
    }
  }

  function ensureStyle(){
    if ($('semsDeleteHotfixStyle')) return;
    const style = document.createElement('style');
    style.id = 'semsDeleteHotfixStyle';
    style.textContent = `
      #entriesTab th.sems-delete-head{cursor:pointer;text-align:center;user-select:none;min-width:70px;}
      #entriesTab th.sems-delete-head:hover{background:#eef2ff!important;color:#1d4ed8!important;}
      #entriesTab td.sems-delete-cell{text-align:center!important;vertical-align:middle!important;}
      .sems-delete-check{width:18px;height:18px;accent-color:#2563eb;cursor:pointer;}
      .sems-delete-check:disabled{opacity:.35;cursor:not-allowed;}
      .sems-selected-delete-btn{background:#fee2e2!important;color:#991b1b!important;border:1px solid #fecaca!important;}
    `;
    document.head.appendChild(style);
  }

  function replaceDeleteButtons(){
    const rows = Array.from(document.querySelectorAll('#entryRows tr'));
    rows.forEach((row) => {
      if (row.id === 'inlineEntryRow' || row.classList.contains('inline-entry-empty')) return;
      const cells = row.querySelectorAll('td');
      if (!cells.length) return;
      const deleteCell = cells[cells.length - 1];
      if (!deleteCell || deleteCell.querySelector('.sems-delete-check')) return;

      const deleteButton = Array.from(deleteCell.querySelectorAll('button')).find((button) => {
        const value = text(button);
        return value.includes('삭제') || value.includes('Delete');
      });
      const entryId = parseIdFromDeleteButton(deleteButton);
      if (!entryId) return;

      const disabled = deleteButton && deleteButton.disabled;
      deleteCell.classList.add('sems-delete-cell');
      deleteCell.innerHTML = '<input type="checkbox" class="sems-delete-check" data-entry-id="' + entryId + '" ' + (disabled ? 'disabled' : '') + ' title="' + label('삭제할 데이터 선택', 'Select row to delete') + '">';
    });
  }

  function patchDeleteHeader(){
    const table = document.querySelector('#entriesTab table');
    if (!table) return;
    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;
    const headers = headerRow.querySelectorAll('th');
    const deleteHeader = headers[headers.length - 1];
    if (!deleteHeader) return;
    deleteHeader.textContent = label('삭제', 'Delete');
    deleteHeader.classList.add('sems-delete-head');
    deleteHeader.title = label('클릭하면 현재 화면의 삭제 가능 항목을 전체 선택/해제합니다.', 'Click to select/deselect all visible rows.');
    if (deleteHeader.dataset.semsDeleteToggle !== '1') {
      deleteHeader.dataset.semsDeleteToggle = '1';
      deleteHeader.addEventListener('click', function(event){
        event.preventDefault();
        toggleAllVisible();
      });
    }
  }

  function patchBulkDeleteButton(){
    const button = findBulkDeleteButton();
    if (!button) return;
    button.textContent = label('선택 데이터 삭제', 'Delete selected');
    button.classList.add('sems-selected-delete-btn');
    button.title = label('체크한 데이터만 삭제합니다.', 'Delete only checked rows.');
    if (button.dataset.semsSelectedDelete !== '1') {
      button.dataset.semsSelectedDelete = '1';
      button.addEventListener('click', function(event){
        event.preventDefault();
        event.stopImmediatePropagation();
        deleteSelected();
      }, true);
    }
  }

  function applyDeleteCheckboxUi(){
    ensureStyle();
    patchDeleteHeader();
    patchBulkDeleteButton();
    replaceDeleteButtons();
  }

  function installHooks(){
    if (window.__semsDeleteHotfixInstalled) return;
    window.__semsDeleteHotfixInstalled = true;

    ['renderEntries', 'render'].forEach((name) => {
      const original = window[name];
      if (typeof original === 'function' && !original.__semsDeleteHotfixWrapped) {
        window[name] = function(){
          const result = original.apply(this, arguments);
          applyDeleteCheckboxUi();
          requestAnimationFrame(applyDeleteCheckboxUi);
          return result;
        };
        window[name].__semsDeleteHotfixWrapped = true;
      }
    });

    const body = $('entryRows');
    if (body && body.dataset.semsDeleteHotfixObserver !== '1') {
      body.dataset.semsDeleteHotfixObserver = '1';
      new MutationObserver(applyDeleteCheckboxUi).observe(body, { childList:true, subtree:false });
    }

    document.addEventListener('click', function(event){
      const langButton = event.target.closest && event.target.closest('.sewon-lang-btn');
      if (langButton) setTimeout(applyDeleteCheckboxUi, 80);
    }, true);
  }

  function boot(){
    installHooks();
    applyDeleteCheckboxUi();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(boot, 300);
  setTimeout(boot, 900);
  setTimeout(boot, 1800);
})();
