(function(){
  'use strict';
  const $ = (id) => document.getElementById(id);
  const text = (el) => (el && el.textContent ? el.textContent : '').trim();
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let profile = null;
  let sb = null;
  let completedKeys = new Set();
  let refreshingCompletions = false;

  function currentLang(){ return localStorage.getItem('sewonGhgUiLanguage') === 'en' ? 'en' : 'ko'; }
  function label(ko, en){ return currentLang() === 'en' ? en : ko; }

  function getClient(){
    if (sb) return sb;
    const cfg = window.SEMS_SUPABASE_CONFIG || {};
    if (!window.supabase || !cfg.url || !cfg.anonKey) return null;
    sb = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true }
    });
    return sb;
  }

  async function getProfile(){
    if (profile) return profile;
    const client = getClient();
    if (!client) return null;
    const userRes = await client.auth.getUser();
    const user = userRes && userRes.data ? userRes.data.user : null;
    if (!user) return null;
    const res = await client.from('sems_profiles').select('id,email,company,role').eq('id', user.id).single();
    if (res.error) throw res.error;
    profile = res.data;
    return profile;
  }

  function selectedYear(){ return Number(($('year') && $('year').value) || new Date().getFullYear()); }
  function isAdmin(){ return profile && profile.role === 'admin'; }
  function ownCompany(){ return profile && profile.company ? profile.company : ''; }

  function addStyle(){
    if ($('semsDeleteSelectStyle')) return;
    const style = document.createElement('style');
    style.id = 'semsDeleteSelectStyle';
    style.textContent = `
      #entriesTab th.entry-delete-check-head{cursor:pointer;text-align:center;user-select:none;min-width:74px;}
      #entriesTab th.entry-delete-check-head:hover{background:#eef2ff!important;color:#1d4ed8;}
      #entriesTab td.entry-delete-check-cell{text-align:center;vertical-align:middle;}
      .entry-delete-checkbox{width:18px;height:18px;accent-color:#2563eb;cursor:pointer;}
      .entry-delete-checkbox:disabled{cursor:not-allowed;opacity:.35;}
      #clearAll.selected-delete-mode{background:#fee2e2!important;color:#991b1b!important;border:1px solid #fecaca!important;}
      .entry-row-completed-lock{background:#fff7ed!important;}
    `;
    document.head.appendChild(style);
  }

  function parseEntryIdFromButton(btn){
    if (!btn) return '';
    const onclick = btn.getAttribute('onclick') || '';
    const match = onclick.match(/(?:requestDeleteEntry|deleteEntry)\(['"]([^'"]+)['"]\)/);
    return match ? match[1] : '';
  }

  function parseRowYearMonth(row){
    const first = text(row.querySelector('td'));
    const m = first.match(/(\d{4})\D+(\d{1,2})/);
    if (!m) return { year:null, month:null };
    return { year:Number(m[1]), month:Number(m[2]) };
  }

  function rowCompany(row){
    const cells = row.querySelectorAll('td');
    return cells[1] ? text(cells[1]) : '';
  }

  function completionKey(company, year, month){ return [company, Number(year), Number(month)].join('|'); }

  function isCompletedRow(row){
    const ym = parseRowYearMonth(row);
    const company = rowCompany(row);
    if (!company || !ym.year || !ym.month) return false;
    return completedKeys.has(completionKey(company, ym.year, ym.month));
  }

  async function refreshCompletionKeys(){
    if (refreshingCompletions) return;
    refreshingCompletions = true;
    try {
      const p = await getProfile();
      if (!p) return;
      const client = getClient();
      if (!client) return;
      let q = client.from('sems_monthly_completions').select('company,year,month').eq('year', selectedYear());
      if (p.role !== 'admin' && p.company) q = q.eq('company', p.company);
      const res = await q;
      if (!res.error) {
        completedKeys = new Set((res.data || []).map((r) => completionKey(r.company, r.year, r.month)));
      }
    } catch(e) {
      // 월별 완료 테이블이 아직 없을 수도 있으므로 UI는 계속 동작하게 둡니다.
    } finally {
      refreshingCompletions = false;
      applyEntryDeleteUi();
    }
  }

  function ensureDeleteHeader(){
    const table = document.querySelector('#entriesTab table');
    if (!table) return;
    const head = table.querySelector('thead tr');
    if (!head) return;
    const ths = head.querySelectorAll('th');
    const last = ths[ths.length - 1];
    if (!last) return;
    last.classList.add('entry-delete-check-head');
    last.title = label('클릭하면 현재 화면의 항목을 전체 선택/해제합니다.', 'Click to select/deselect all visible rows.');
    last.textContent = label('삭제', 'Delete');
    if (last.dataset.deleteToggleBound !== '1') {
      last.dataset.deleteToggleBound = '1';
      last.addEventListener('click', toggleVisibleChecks);
    }
  }

  function visibleCheckboxes(){
    return Array.from(document.querySelectorAll('.entry-delete-checkbox')).filter((box) => {
      const row = box.closest('tr');
      return row && row.style.display !== 'none' && !box.disabled;
    });
  }

  function toggleVisibleChecks(){
    const boxes = visibleCheckboxes();
    if (!boxes.length) return;
    const allChecked = boxes.every((box) => box.checked);
    boxes.forEach((box) => { box.checked = !allChecked; });
  }

  function ensureSelectedDeleteButton(){
    const btn = $('clearAll');
    if (!btn) return;
    btn.textContent = label('선택 데이터 삭제', 'Delete selected');
    btn.classList.add('selected-delete-mode');
    btn.title = label('체크한 데이터만 삭제합니다.', 'Delete only checked rows.');
  }

  function replaceDeleteButtonsWithChecks(){
    const rows = Array.from(document.querySelectorAll('#entryRows tr'));
    rows.forEach((row) => {
      if (row.id === 'inlineEntryRow' || row.classList.contains('inline-entry-empty')) return;
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return;
      const lastCell = cells[cells.length - 1];
      if (!lastCell) return;
      const existingBox = lastCell.querySelector('.entry-delete-checkbox');
      if (existingBox) {
        const locked = isCompletedRow(row);
        existingBox.disabled = locked;
        row.classList.toggle('entry-row-completed-lock', locked);
        updateEditButtonLock(row, locked);
        return;
      }
      const btn = lastCell.querySelector('button');
      const id = parseEntryIdFromButton(btn);
      if (!id) return;
      const locked = isCompletedRow(row) || (btn && btn.disabled);
      lastCell.classList.add('entry-delete-check-cell');
      lastCell.innerHTML = `<input type="checkbox" class="entry-delete-checkbox" data-entry-id="${escapeHtml(id)}" ${locked ? 'disabled' : ''} title="${locked ? escapeHtml(label('작성 완료된 월입니다. 회수 후 삭제할 수 있습니다.', 'This month is complete. Withdraw it before deleting.')) : escapeHtml(label('삭제할 데이터 선택', 'Select row to delete'))}">`;
      row.classList.toggle('entry-row-completed-lock', locked);
      updateEditButtonLock(row, locked);
    });
  }

  function updateEditButtonLock(row, locked){
    const cells = row.querySelectorAll('td');
    if (cells.length < 2) return;
    const editCell = cells[cells.length - 2];
    if (!editCell) return;
    editCell.querySelectorAll('button').forEach((btn) => {
      const t = text(btn);
      if (t.includes('수정') || t.includes('Edit')) {
        btn.disabled = !!locked;
        btn.classList.toggle('monthly-locked-action', !!locked);
        btn.title = locked ? label('작성 완료된 월입니다. 회수 후 수정할 수 있습니다.', 'This month is complete. Withdraw it before editing.') : '';
      }
    });
  }

  function applyEntryDeleteUi(){
    addStyle();
    ensureDeleteHeader();
    ensureSelectedDeleteButton();
    replaceDeleteButtonsWithChecks();
  }

  function getSelectedIds(){
    return visibleCheckboxes().filter((box) => box.checked).map((box) => box.dataset.entryId).filter(Boolean);
  }

  async function deleteSelectedEntries(){
    const ids = getSelectedIds();
    if (!ids.length) {
      alert(label('삭제할 데이터를 체크해 주세요.', 'Please check rows to delete.'));
      return;
    }
    if (!confirm(label(`선택한 데이터 ${ids.length}건을 삭제할까요?`, `Delete ${ids.length} selected row(s)?`))) return;
    try {
      if (typeof pushHistory === 'function') pushHistory();
      if (typeof entries !== 'undefined' && Array.isArray(entries)) {
        const idSet = new Set(ids.map(String));
        entries = entries.filter((entry) => !idSet.has(String(entry.id)));
      }
      if (typeof pendingDeleteId !== 'undefined') pendingDeleteId = null;
      if (typeof pendingDeleteTimerId !== 'undefined') clearTimeout(pendingDeleteTimerId);
      if (typeof saveEntries === 'function') saveEntries();
      if (typeof render === 'function') render();
      requestAnimationFrame(() => {
        applyEntryDeleteUi();
        if (typeof applyOutputBasisFilter === 'function') applyOutputBasisFilter();
      });
      alert(label('선택 데이터가 삭제되었습니다.', 'Selected rows have been deleted.'));
    } catch (error) {
      console.error(error);
      alert(label('선택 데이터 삭제 중 오류가 발생했습니다.', 'An error occurred while deleting selected rows.') + '\n' + (error && error.message ? error.message : error));
    }
  }

  function bindEvents(){
    if (document.body.dataset.semsDeleteSelectBound === '1') return;
    document.body.dataset.semsDeleteSelectBound = '1';
    document.addEventListener('click', function(e){
      if (e.target && e.target.id === 'clearAll') {
        e.preventDefault();
        e.stopImmediatePropagation();
        deleteSelectedEntries();
      }
    }, true);
    document.addEventListener('click', function(e){
      const langBtn = e.target.closest && e.target.closest('.sewon-lang-btn');
      if (langBtn) setTimeout(applyEntryDeleteUi, 80);
      if (e.target && e.target.id === 'monthlyCompleteButton') setTimeout(refreshCompletionKeys, 600);
    }, true);
    document.addEventListener('change', function(e){
      if (['year','month','filterYear','filterCompany','filterSite'].includes(e.target.id)) {
        setTimeout(refreshCompletionKeys, 80);
        setTimeout(applyEntryDeleteUi, 100);
      }
    }, true);
  }

  function installRenderHooks(){
    if (window.__semsDeleteSelectRenderHooked) return;
    window.__semsDeleteSelectRenderHooked = true;
    ['renderEntries','render'].forEach((name) => {
      const original = window[name];
      if (typeof original === 'function' && !original.__deleteSelectWrapped) {
        window[name] = function(){
          const result = original.apply(this, arguments);
          applyEntryDeleteUi();
          requestAnimationFrame(applyEntryDeleteUi);
          return result;
        };
        window[name].__deleteSelectWrapped = true;
      }
    });
  }

  function observeRows(){
    const body = $('entryRows');
    if (!body || body.dataset.deleteSelectObserver === '1') return;
    body.dataset.deleteSelectObserver = '1';
    new MutationObserver(() => applyEntryDeleteUi()).observe(body, { childList:true, subtree:false });
  }

  async function boot(){
    addStyle();
    await getProfile().catch(function(){});
    bindEvents();
    installRenderHooks();
    observeRows();
    await refreshCompletionKeys();
    applyEntryDeleteUi();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  setTimeout(boot, 800);
  setTimeout(boot, 1800);
})();
