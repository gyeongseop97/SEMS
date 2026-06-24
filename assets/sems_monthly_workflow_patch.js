(function(){
  'use strict';
  const $ = (id) => document.getElementById(id);
  const text = (el) => (el && el.textContent ? el.textContent : '').trim();
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const cfg = window.SEMS_SUPABASE_CONFIG || {};
  let client = null;
  let profile = null;
  let submissions = [];
  let entries = [];
  let organizations = [];
  let loading = false;

  function hasConfig(){ return !!(window.supabase && cfg.url && cfg.anonKey); }
  function db(){
    if (!client && hasConfig()) {
      client = window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true }
      });
    }
    return client;
  }
  function isAdmin(){ return profile && profile.role === 'admin'; }
  function ownCompany(){ return profile && profile.company ? profile.company : ''; }
  function selectedCompany(){ return ($('company') && $('company').value) || ($('chartCompanyFilter') && $('chartCompanyFilter').value !== 'ALL' ? $('chartCompanyFilter').value : '') || ownCompany(); }
  function selectedYear(){ return Number(($('year') && $('year').value) || ($('chartYearFilter') && $('chartYearFilter').value !== 'ALL' ? $('chartYearFilter').value : '') || new Date().getFullYear()); }
  function selectedMonth(){ return Number(($('month') && $('month').value) || new Date().getMonth() + 1); }
  function key(company, year, month){ return `${company}|${year}|${month}`; }
  function findSubmission(company, year, month){ return submissions.find((s) => s.company === company && Number(s.year) === Number(year) && Number(s.month) === Number(month)); }
  function isLockedStatus(status){ return status === 'submitted' || status === 'approved'; }
  function statusText(status){ return ({draft:'작성중',submitted:'제출완료',approved:'확정',rejected:'반려'}[status || 'draft'] || '작성중'); }
  function statusClass(status){ return `mw-status ${status || 'draft'}`; }
  function monthEntries(company, year, month){ return entries.filter((e) => e.company === company && Number(e.year) === Number(year) && Number(e.month) === Number(month)); }
  function sumEmission(rows){ return rows.reduce((sum, e) => sum + Number(e.emission || 0), 0); }

  async function loadProfile(){
    const c = db();
    if (!c) return null;
    const userResult = await c.auth.getUser();
    const user = userResult && userResult.data ? userResult.data.user : null;
    if (!user) return null;
    const { data, error } = await c.from('sems_profiles').select('id,email,company,role').eq('id', user.id).single();
    if (error) throw error;
    profile = data;
    return profile;
  }
  async function loadData(){
    if (loading || !hasConfig()) return;
    loading = true;
    try {
      await loadProfile();
      if (!profile) return;
      const c = db();
      const [sub, ent, org] = await Promise.all([
        c.from('sems_monthly_submissions').select('*').order('year', { ascending:false }).order('month', { ascending:false }),
        c.from('sems_entries').select('id,company,site,year,month,scope,source,sub_source,amount,unit,emission,memo').order('year', { ascending:false }).order('month', { ascending:false }),
        c.from('sems_organizations').select('company,sites').order('company')
      ]);
      if (sub.error && String(sub.error.message || '').includes('sems_monthly_submissions')) {
        showSqlRequired();
        return;
      }
      if (sub.error) throw sub.error;
      if (ent.error) throw ent.error;
      if (org.error) throw org.error;
      submissions = sub.data || [];
      entries = ent.data || [];
      organizations = org.data || [];
      renderAll();
    } catch (err) {
      console.warn('monthly workflow load failed', err);
      showSqlRequired(err);
    } finally {
      loading = false;
    }
  }

  function ensureStyle(){
    if ($('sems-monthly-workflow-style')) return;
    const style = document.createElement('style');
    style.id = 'sems-monthly-workflow-style';
    style.textContent = `
      .mw-panel{background:#fff;border:1px solid #dbe5f3;border-radius:16px;padding:14px 16px;margin:0 0 14px;box-shadow:0 8px 22px rgba(15,23,42,.045)}
      .mw-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.mw-head h3{margin:0;font-size:16px;color:#172033}.mw-note{margin:6px 0 0;color:#64748b;font-size:12px;line-height:1.5}.mw-actions{display:flex;gap:8px;flex-wrap:wrap}.mw-btn{height:36px;border:0;border-radius:10px;padding:0 12px;font-size:12px;font-weight:900;cursor:pointer}.mw-primary{background:#2563eb;color:#fff}.mw-secondary{background:#f3f6fb;color:#202636;border:1px solid #dbe5f3}.mw-danger{background:#fee2e2;color:#991b1b}.mw-success{background:#dcfce7;color:#166534}.mw-btn:disabled{opacity:.45;cursor:not-allowed}.mw-status{display:inline-flex;align-items:center;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:950}.mw-status.draft{background:#f1f5f9;color:#475569}.mw-status.submitted{background:#dbeafe;color:#1d4ed8}.mw-status.approved{background:#dcfce7;color:#166534}.mw-status.rejected{background:#fee2e2;color:#991b1b}.mw-locked{background:#fff7ed;border-color:#fed7aa}.mw-reject{margin-top:8px;background:#fff1f2;border:1px solid #fecdd3;color:#9f1239;border-radius:10px;padding:9px;font-size:12px}.mw-admin-tab{grid-column:2;padding:22px 28px 32px!important;background:#f5f7fb}.mw-admin-card{background:#fff;border:1px solid #e5eaf2;border-radius:18px;padding:18px;box-shadow:0 8px 24px rgba(15,23,42,.045)}.mw-admin-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}.mw-admin-toolbar select{height:38px;border:1px solid #dbe3ef;border-radius:10px;padding:0 10px;font-weight:800}.mw-table{width:100%;border-collapse:collapse;background:#fff}.mw-table th,.mw-table td{border-bottom:1px solid #edf2f7;padding:9px;text-align:left;font-size:12px;vertical-align:top}.mw-table th{background:#f8fafc;color:#334155;font-weight:950}.mw-month-cell{min-width:118px}.mw-cell-actions{display:flex;gap:4px;margin-top:6px;flex-wrap:wrap}.mw-mini{height:26px;border:0;border-radius:8px;padding:0 8px;font-size:11px;font-weight:900;cursor:pointer}.mw-lock-disabled{opacity:.42!important;pointer-events:none!important}`;
    document.head.appendChild(style);
  }

  function showSqlRequired(err){
    ensureStyle();
    const target = document.querySelector('#entriesTab') || document.querySelector('main');
    if (!target || $('mwSqlRequired')) return;
    const box = document.createElement('div');
    box.id = 'mwSqlRequired';
    box.className = 'mw-panel mw-locked';
    box.innerHTML = `<div class="mw-head"><h3>월별 제출·승인 기능 SQL 적용 필요</h3></div><p class="mw-note">Supabase SQL Editor에서 <b>database/sems_monthly_submission_workflow.sql</b>을 먼저 실행해야 월별 제출/확정/반려 기능을 사용할 수 있습니다.</p>${err ? `<div class="mw-reject">${esc(err.message || err)}</div>` : ''}`;
    target.prepend(box);
  }

  function ensureCompanyPanel(){
    if (isAdmin()) return;
    const tab = $('entriesTab');
    if (!tab || $('mwCompanyPanel')) return;
    const panel = document.createElement('div');
    panel.id = 'mwCompanyPanel';
    tab.prepend(panel);
  }
  function renderCompanyPanel(){
    if (isAdmin()) return;
    ensureCompanyPanel();
    const panel = $('mwCompanyPanel');
    if (!panel) return;
    const company = ownCompany() || selectedCompany();
    const year = selectedYear();
    const month = selectedMonth();
    const sub = findSubmission(company, year, month);
    const status = sub ? sub.status : 'draft';
    const rows = monthEntries(company, year, month);
    const locked = isLockedStatus(status);
    panel.className = `mw-panel ${locked ? 'mw-locked' : ''}`;
    panel.innerHTML = `<div class="mw-head"><div><h3>${esc(company)} ${year}년 ${month}월 제출 상태 <span class="${statusClass(status)}">${statusText(status)}</span></h3><p class="mw-note">월별 자료를 모두 등록한 뒤 제출하면 기획팀 검토 전까지 수정이 잠깁니다. 반려 시 다시 수정 후 재제출할 수 있습니다.</p></div><div class="mw-actions"><button type="button" class="mw-btn mw-primary" id="mwSubmitMonth" ${locked ? 'disabled' : ''}>기획팀에 제출</button><button type="button" class="mw-btn mw-secondary" id="mwExportMonth">월별 보고서 출력</button></div></div><p class="mw-note">등록 건수: <b>${rows.length}</b>건 / 배출량 합계: <b>${sumEmission(rows).toLocaleString('ko-KR',{maximumFractionDigits:3})}</b> tCO₂e</p>${status === 'rejected' && sub && sub.review_comment ? `<div class="mw-reject"><b>반려 사유</b><br>${esc(sub.review_comment)}</div>` : ''}`;
    applyEntryLock(locked, status);
  }

  function applyEntryLock(locked, status){
    if (isAdmin()) return;
    const ids = ['addInlineEntryButton','submitButton','finalInlineSaveButton','inlineSaveButton'];
    ids.forEach((id) => { const el = $(id); if (el) el.disabled = !!locked; });
    document.querySelectorAll('#entryRows button').forEach((btn) => {
      const label = text(btn);
      if (label.includes('수정') || label.includes('삭제')) {
        btn.disabled = !!locked;
        btn.classList.toggle('mw-lock-disabled', !!locked);
        btn.title = locked ? `${statusText(status)} 상태에서는 수정/삭제할 수 없습니다.` : '';
      }
    });
  }

  async function submitMonth(){
    const company = ownCompany() || selectedCompany();
    const year = selectedYear();
    const month = selectedMonth();
    const rows = monthEntries(company, year, month);
    if (!rows.length) { alert('제출할 월별 활동자료가 없습니다. 먼저 활동자료를 등록해 주세요.'); return; }
    if (!confirm(`${company} ${year}년 ${month}월 자료를 기획팀에 제출할까요?\n제출 후에는 반려 전까지 수정할 수 없습니다.`)) return;
    const c = db();
    const user = await c.auth.getUser();
    const uid = user && user.data && user.data.user ? user.data.user.id : null;
    const payload = { company, year, month, status:'submitted', submitted_at:new Date().toISOString(), submitted_by:uid, reviewed_at:null, reviewed_by:null, review_comment:null, updated_at:new Date().toISOString() };
    const { error } = await c.from('sems_monthly_submissions').upsert(payload, { onConflict:'company,year,month' });
    if (error) { alert(error.message); return; }
    await loadData();
    alert('제출 완료되었습니다.');
  }

  async function reviewMonth(company, year, month, status){
    if (!isAdmin()) return;
    const comment = status === 'rejected' ? prompt(`${company} ${year}년 ${month}월 반려 사유를 입력해 주세요.`) : '';
    if (status === 'rejected' && comment === null) return;
    if (status === 'approved' && !confirm(`${company} ${year}년 ${month}월 자료를 확정할까요?`)) return;
    const c = db();
    const user = await c.auth.getUser();
    const uid = user && user.data && user.data.user ? user.data.user.id : null;
    const payload = { company, year:Number(year), month:Number(month), status, reviewed_at:new Date().toISOString(), reviewed_by:uid, review_comment:comment || null, updated_at:new Date().toISOString() };
    if (status === 'approved') payload.review_comment = null;
    const { error } = await c.from('sems_monthly_submissions').upsert(payload, { onConflict:'company,year,month' });
    if (error) { alert(error.message); return; }
    await loadData();
  }

  function companyList(){
    const fromOrg = organizations.map((o) => o.company).filter(Boolean);
    const fromEntry = [...new Set(entries.map((e) => e.company).filter(Boolean))];
    return [...new Set([...fromOrg, ...fromEntry])].sort((a,b)=>a.localeCompare(b,'ko'));
  }
  function ensureAdminTab(){
    if (!isAdmin()) return;
    const tabs = document.querySelector('.tabs');
    if (!tabs) return;
    if (!document.querySelector(".tab[data-tab='monthly']")) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab';
      btn.dataset.tab = 'monthly';
      btn.textContent = '제출 현황';
      tabs.appendChild(btn);
    }
    if (!$('monthlyTab')) {
      const card = tabs.closest('.card');
      const div = document.createElement('div');
      div.id = 'monthlyTab';
      div.className = 'mw-admin-tab';
      div.style.display = 'none';
      card.appendChild(div);
    }
  }
  function renderAdminTab(){
    if (!isAdmin()) return;
    ensureAdminTab();
    const tab = $('monthlyTab');
    if (!tab) return;
    const nowYear = new Date().getFullYear();
    const years = [...new Set([...entries.map(e=>Number(e.year)), ...submissions.map(s=>Number(s.year)), nowYear].filter(Boolean))].sort((a,b)=>b-a);
    const selected = Number(($('mwAdminYear') && $('mwAdminYear').value) || years[0] || nowYear);
    const companies = companyList();
    const rows = companies.map((company) => {
      const cells = Array.from({length:12}, (_,i) => {
        const month = i + 1;
        const sub = findSubmission(company, selected, month);
        const status = sub ? sub.status : 'draft';
        const count = monthEntries(company, selected, month).length;
        const total = sumEmission(monthEntries(company, selected, month));
        const actions = status === 'submitted' ? `<div class="mw-cell-actions"><button class="mw-mini mw-success" data-mw-review="approved" data-company="${esc(company)}" data-year="${selected}" data-month="${month}">OK</button><button class="mw-mini mw-danger" data-mw-review="rejected" data-company="${esc(company)}" data-year="${selected}" data-month="${month}">반려</button></div>` : '';
        return `<td class="mw-month-cell"><span class="${statusClass(status)}">${statusText(status)}</span><br><small>${count}건 / ${total.toLocaleString('ko-KR',{maximumFractionDigits:1})}</small>${actions}</td>`;
      }).join('');
      return `<tr><th>${esc(company)}</th>${cells}</tr>`;
    }).join('');
    tab.innerHTML = `<div class="mw-admin-card"><h2>회사별 월별 제출 현황</h2><p class="mw-note">회사 계정이 월별 자료를 제출하면 이 화면에서 제출 여부를 확인하고 OK/반려 처리할 수 있습니다. OK 처리된 월은 확정 상태가 됩니다.</p><div class="mw-admin-toolbar"><label>연도</label><select id="mwAdminYear">${years.map(y=>`<option value="${y}" ${y===selected?'selected':''}>${y}</option>`).join('')}</select><button type="button" class="mw-btn mw-secondary" id="mwReload">새로고침</button><button type="button" class="mw-btn mw-secondary" id="mwExportStatus">제출현황 엑셀 출력</button></div><div class="table-wrap"><table class="mw-table"><thead><tr><th>회사</th>${Array.from({length:12},(_,i)=>`<th>${i+1}월</th>`).join('')}</tr></thead><tbody>${rows || '<tr><td colspan="13">표시할 회사가 없습니다.</td></tr>'}</tbody></table></div></div>`;
  }

  function exportMonthlyReport(company, year, month){
    const rows = monthEntries(company, year, month);
    const sub = findSubmission(company, year, month);
    const trs = rows.map((e) => `<tr><td>${esc(e.year)}.${String(e.month).padStart(2,'0')}</td><td>${esc(e.company)}</td><td>${esc(e.site)}</td><td>${esc(e.scope)}</td><td>${esc(e.source || e.sub_source || '')}</td><td>${esc(e.amount)}</td><td>${esc(e.unit)}</td><td>${Number(e.emission||0).toLocaleString('ko-KR',{maximumFractionDigits:3})}</td><td>${esc(e.memo||'')}</td></tr>`).join('');
    const html = `<html><head><meta charset="UTF-8"></head><body><h2>SEMS 월별 배출량 보고서</h2><p>회사: ${esc(company)} / 기간: ${year}년 ${month}월 / 상태: ${statusText(sub ? sub.status : 'draft')}</p><table border="1"><thead><tr><th>연월</th><th>회사</th><th>사업장</th><th>Scope</th><th>배출원</th><th>사용량</th><th>단위</th><th>배출량(tCO₂e)</th><th>비고</th></tr></thead><tbody>${trs}</tbody></table><p>합계: ${sumEmission(rows).toLocaleString('ko-KR',{maximumFractionDigits:3})} tCO₂e</p></body></html>`;
    const blob = new Blob(['\ufeff' + html], {type:'application/vnd.ms-excel;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sems_monthly_report_${company}_${year}_${String(month).padStart(2,'0')}.xls`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function exportStatus(){
    const year = Number(($('mwAdminYear') && $('mwAdminYear').value) || new Date().getFullYear());
    const companies = companyList();
    const header = ['회사', ...Array.from({length:12},(_,i)=>`${i+1}월`)];
    const body = companies.map((company) => [company, ...Array.from({length:12},(_,i)=>statusText((findSubmission(company, year, i+1)||{}).status))]);
    const csv = '\ufeff' + [header, ...body].map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sems_submission_status_${year}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function renderAll(){
    ensureStyle();
    renderCompanyPanel();
    renderAdminTab();
  }
  function installEvents(){
    if (document.body.dataset.semsMonthlyWorkflowEvents === '1') return;
    document.body.dataset.semsMonthlyWorkflowEvents = '1';
    document.addEventListener('click', function(e){
      if (e.target && e.target.id === 'mwSubmitMonth') submitMonth();
      if (e.target && e.target.id === 'mwExportMonth') exportMonthlyReport(ownCompany() || selectedCompany(), selectedYear(), selectedMonth());
      if (e.target && e.target.id === 'mwReload') loadData();
      if (e.target && e.target.id === 'mwExportStatus') exportStatus();
      const review = e.target && e.target.dataset ? e.target.dataset.mwReview : '';
      if (review) reviewMonth(e.target.dataset.company, Number(e.target.dataset.year), Number(e.target.dataset.month), review);
      const tab = e.target.closest && e.target.closest(".tab[data-tab='monthly']");
      if (tab) {
        e.preventDefault();
        e.stopImmediatePropagation();
        document.querySelectorAll('.tabs .tab').forEach((item) => item.classList.remove('active'));
        tab.classList.add('active');
        ['chartsTab','entriesTab','summaryTab','factorsTab','organizationTab','faqTab','accountsTab'].forEach((id) => { const el = $(id); if (el) el.style.display = 'none'; });
        const panel = $('monthlyTab');
        if (panel) panel.style.display = 'block';
        renderAdminTab();
      }
      if (isLockedStatus((findSubmission(ownCompany() || selectedCompany(), selectedYear(), selectedMonth()) || {}).status)) {
        const id = e.target && e.target.id;
        if (['addInlineEntryButton','finalInlineSaveButton','inlineSaveButton','submitButton'].includes(id)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          alert('제출완료 또는 확정 상태의 월은 수정할 수 없습니다. 반려 후 다시 수정할 수 있습니다.');
        }
      }
    }, true);
    document.addEventListener('change', function(e){
      if (['company','year','month','mwAdminYear'].includes(e.target.id)) setTimeout(renderAll, 30);
    }, true);
  }

  function boot(){
    ensureStyle();
    installEvents();
    loadData();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  const observer = new MutationObserver(() => { setTimeout(renderAll, 30); });
  if (document.body) observer.observe(document.body, {childList:true, subtree:true});
})();
