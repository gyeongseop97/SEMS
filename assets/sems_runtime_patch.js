(function(){
  'use strict';
  const $ = (id) => document.getElementById(id);
  const text = (el) => (el && el.textContent ? el.textContent : '').trim();
  const value = (id) => {
    const el = $(id);
    return el ? String(el.value || '').trim() : '';
  };
  const numberValue = (id) => {
    const n = Number(value(id));
    return Number.isFinite(n) ? n : 0;
  };
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function blockSave(messages){
    alert('입력값을 확인해 주세요.\n- ' + messages.join('\n- '));
    return false;
  }

  function validateEntryInput(){
    const messages = [];
    if ($('finalInlineEntryRow')) {
      if (numberValue('finalInlineAmount') <= 0) messages.push('사용량은 0보다 큰 값이어야 합니다.');
      if (!value('finalInlineUnit')) messages.push('단위를 선택해 주세요.');
      if (!value('finalInlineFactor')) messages.push('배출원을 선택해 주세요.');
      const emission = text($('finalInlineEmissionPreview'));
      if (numberValue('finalInlineAmount') > 0 && (emission === '0.000' || emission === '0')) {
        messages.push('예상 배출량이 0입니다. 배출계수 또는 단위를 확인해 주세요.');
      }
    } else if ($('inlineEntryRow')) {
      if (numberValue('inlineAmount') <= 0) messages.push('사용량은 0보다 큰 값이어야 합니다.');
      if (!value('inlineUnit')) messages.push('단위를 선택해 주세요.');
      if (!value('inlineSource')) messages.push('배출원을 선택해 주세요.');
      const emission = text($('inlineEmissionPreview'));
      if (numberValue('inlineAmount') > 0 && (emission === '0.000' || emission === '0')) {
        messages.push('예상 배출량이 0입니다. 배출계수 또는 단위를 확인해 주세요.');
      }
    } else {
      if (!value('company')) messages.push('회사를 선택해 주세요.');
      if (!value('site')) messages.push('사업장을 선택해 주세요.');
      if (!value('year')) messages.push('연도를 입력해 주세요.');
      if (!value('month')) messages.push('월을 선택해 주세요.');
      if (!value('scopeSelect')) messages.push('Scope를 선택해 주세요.');
      if (!value('source')) messages.push('배출원을 선택해 주세요.');
      if (numberValue('amount') <= 0) messages.push('사용량은 0보다 큰 값이어야 합니다.');
      if (!value('unit')) messages.push('단위를 선택해 주세요.');
    }
    return messages.length ? blockSave(messages) : true;
  }

  function installValidation(){
    if (document.body.dataset.semsValidationPatch === '1') return;
    document.body.dataset.semsValidationPatch = '1';
    document.addEventListener('click', function(e){
      const id = e.target && e.target.id;
      if (id === 'finalInlineSaveButton' || id === 'inlineSaveButton') {
        if (!validateEntryInput()) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }
    }, true);
    document.addEventListener('submit', function(e){
      if (e.target && e.target.id === 'entryForm') {
        if (!validateEntryInput()) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }
    }, true);
  }

  function ensureDashboardExportButtons(){
    const box = document.querySelector('.dashboard-actions');
    if (!box || $('semsDashExcel')) return;
    const excel = document.createElement('button');
    excel.type = 'button';
    excel.id = 'semsDashExcel';
    excel.className = 'sems-extra-btn';
    excel.textContent = '엑셀 출력';
    const pdf = document.createElement('button');
    pdf.type = 'button';
    pdf.id = 'semsDashPdf';
    pdf.className = 'sems-extra-btn';
    pdf.textContent = 'PDF 출력';
    const last = box.querySelector('.last-update');
    box.insertBefore(excel, last || null);
    box.insertBefore(pdf, last || null);
  }

  function dashboardKpiRows(){
    return Array.from(document.querySelectorAll('.dash-kpi-card')).map((card) => [
      text(card.querySelector('span')),
      text(card.querySelector('strong')),
      text(card.querySelector('em'))
    ]);
  }

  function exportDashboardExcel(){
    const rows = dashboardKpiRows().map((r) => `<tr><td>${escapeHtml(r[0])}</td><td>${escapeHtml(r[1])}</td><td>${escapeHtml(r[2])}</td></tr>`).join('');
    const table = $('dashboardRows') && $('dashboardRows').closest('table') ? $('dashboardRows').closest('table').outerHTML : '';
    const html = `<html><head><meta charset="UTF-8"></head><body><h2>SEMS Dashboard Export</h2><table border="1"><tr><th>항목</th><th>값</th><th>단위</th></tr>${rows}</table><br>${table}</body></html>`;
    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sems_dashboard_export.xls';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportDashboardPdf(){
    const tab = $('chartsTab');
    if (!tab) {
      alert('대시보드 화면을 찾을 수 없습니다.');
      return;
    }
    const w = window.open('', '_blank', 'width=1200,height=900');
    if (!w) {
      alert('팝업 차단을 해제해 주세요.');
      return;
    }
    w.document.write(`<html><head><meta charset="UTF-8"><title>SEMS Dashboard PDF</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#172033}button,.dashboard-actions{display:none!important}.dash-panel,.dash-kpi-card,.dashboard-table{break-inside:avoid;border:1px solid #ddd;margin:10px 0;padding:12px;border-radius:10px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:7px;font-size:12px}</style></head><body><h1>SEMS Dashboard</h1>${tab.outerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  }

  function installExportEvents(){
    if (document.body.dataset.semsExportPatch === '1') return;
    document.body.dataset.semsExportPatch = '1';
    document.addEventListener('click', function(e){
      if (e.target && e.target.id === 'semsDashExcel') exportDashboardExcel();
      if (e.target && e.target.id === 'semsDashPdf') exportDashboardPdf();
    }, true);
  }

  function isAdminUi(){
    return text($('semsRoleText')).includes('Admin');
  }

  function ensureAccountTab(){
    const tabs = document.querySelector('.tabs');
    if (!tabs || !isAdminUi()) return;
    if (!document.querySelector(".tab[data-tab='accounts']")) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab';
      btn.dataset.tab = 'accounts';
      btn.textContent = '계정 권한';
      tabs.appendChild(btn);
    }
    if (!$('accountsTab')) {
      const card = tabs.closest('.card');
      const panel = document.createElement('div');
      panel.id = 'accountsTab';
      panel.className = 'sems-account-panel';
      panel.style.display = 'none';
      panel.innerHTML = `<div class="sems-account-card"><h2>계정 권한 확인</h2><p>Supabase sems_profiles 기준으로 등록된 계정, 회사, 권한을 확인합니다.</p><div class="btns"><button type="button" class="primary" id="semsReloadAccounts">새로고침</button></div><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>이메일</th><th>회사</th><th>권한</th></tr></thead><tbody id="semsAccountRows"><tr><td colspan="3">불러오는 중...</td></tr></tbody></table></div></div>`;
      card.appendChild(panel);
    }
  }

  async function loadAccounts(){
    const body = $('semsAccountRows');
    if (!body) return;
    try {
      const cfg = window.SEMS_SUPABASE_CONFIG || {};
      const client = window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true }
      });
      const result = await client.from('sems_profiles').select('email,company,role').order('email');
      if (result.error) throw result.error;
      body.innerHTML = (result.data || []).map((row) => `<tr><td>${escapeHtml(row.email || '-')}</td><td>${escapeHtml(row.company || '전체')}</td><td class="${row.role === 'admin' ? 'sems-role-admin' : 'sems-role-company'}">${row.role === 'admin' ? '기획팀 Admin' : '회사 계정'}</td></tr>`).join('') || '<tr><td colspan="3">등록된 계정이 없습니다.</td></tr>';
    } catch (error) {
      body.innerHTML = `<tr><td colspan="3">계정 정보를 불러오지 못했습니다: ${escapeHtml(error.message || error)}</td></tr>`;
    }
  }

  function installAccountEvents(){
    if (document.body.dataset.semsAccountPatch === '1') return;
    document.body.dataset.semsAccountPatch = '1';
    document.addEventListener('click', function(e){
      const tab = e.target.closest && e.target.closest(".tab[data-tab='accounts']");
      if (tab) {
        e.preventDefault();
        e.stopImmediatePropagation();
        document.querySelectorAll('.tabs .tab').forEach((item) => item.classList.remove('active'));
        tab.classList.add('active');
        ['chartsTab','entriesTab','summaryTab','factorsTab','organizationTab','faqTab'].forEach((id) => {
          const el = $(id);
          if (el) el.style.display = 'none';
        });
        $('accountsTab').style.display = 'block';
        loadAccounts();
      }
      if (e.target && e.target.id === 'semsReloadAccounts') loadAccounts();
    }, true);
  }

  function ensureStyles(){
    if ($('sems-runtime-patch-style')) return;
    const style = document.createElement('style');
    style.id = 'sems-runtime-patch-style';
    style.textContent = `.sems-extra-btn{height:36px;border:0;border-radius:10px;padding:0 12px;background:#f3f6fb;color:#202636;font-size:12px;font-weight:900;cursor:pointer;border:1px solid #e1e7f0}.sems-account-panel{grid-column:2;padding:22px 28px 32px!important;background:#f5f7fb}.sems-account-card{background:#fff;border:1px solid #e5eaf2;border-radius:18px;padding:18px;box-shadow:0 8px 24px rgba(15,23,42,.045)}.sems-account-card h2{margin:0 0 8px;color:#172033}.sems-account-card p{margin:0 0 14px;color:#64748b;font-size:13px}.sems-account-card table{width:100%;border-collapse:collapse;background:#fff}.sems-account-card th,.sems-account-card td{border-bottom:1px solid #edf2f7;padding:10px;text-align:left;font-size:13px}.sems-account-card th{background:#f8fafc;color:#334155;font-weight:900}.sems-role-admin{color:#1d4ed8;font-weight:900}.sems-role-company{color:#047857;font-weight:900}`;
    document.head.appendChild(style);
  }

  function boot(){
    ensureStyles();
    installValidation();
    ensureDashboardExportButtons();
    installExportEvents();
    ensureAccountTab();
    installAccountEvents();
  }

  const observer = new MutationObserver(boot);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){
      boot();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    boot();
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
