(function(){
  'use strict';
  const $ = (id) => document.getElementById(id);
  const text = (el) => (el && el.textContent ? el.textContent : '').trim();
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let sb = null;
  let profile = null;

  function currentLang(){
    return localStorage.getItem('sewonGhgUiLanguage') === 'en' ? 'en' : 'ko';
  }
  function label(ko, en){
    return currentLang() === 'en' ? en : ko;
  }
  function monthLabel(month){
    if (currentLang() !== 'en') return month + '월';
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month - 1] || month;
  }
  function statusLabel(done, count){
    if (done) return label('완료', 'Complete');
    return count ? label('작성중', 'In progress') : label('미작성', 'Not started');
  }

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

  function isAdmin(){ return profile && profile.role === 'admin'; }
  function selectedYear(){ return Number(($('year') && $('year').value) || new Date().getFullYear()); }
  function selectedMonth(){ return Number(($('month') && $('month').value) || new Date().getMonth() + 1); }

  function addStyle(){
    if ($('simpleMonthlyStyle')) return;
    const style = document.createElement('style');
    style.id = 'simpleMonthlyStyle';
    style.textContent = `
      .sewon-language-switch{
        position:static!important;
        left:auto!important;
        right:auto!important;
        bottom:auto!important;
        width:auto!important;
        min-width:0!important;
        display:grid!important;
        grid-template-columns:1fr 1fr!important;
        gap:4px!important;
        margin:14px 0 10px!important;
        padding:4px!important;
        border-radius:16px!important;
        background:rgba(255,255,255,.08)!important;
        border:1px solid rgba(255,255,255,.10)!important;
        box-shadow:none!important;
      }
      .sewon-lang-btn{
        height:34px!important;
        border-radius:12px!important;
        padding:0 8px!important;
        font-size:12px!important;
        font-weight:950!important;
        letter-spacing:-.2px!important;
        color:#cbd5e1!important;
        background:transparent!important;
        border:0!important;
        box-shadow:none!important;
      }
      .sewon-lang-btn.active{
        color:#172335!important;
        background:#fff!important;
        box-shadow:0 8px 18px rgba(0,0,0,.18)!important;
      }
      .sewon-lang-btn:not(.active):hover{background:rgba(255,255,255,.08)!important;color:#fff!important;}
      .monthly-complete-btn{height:40px;border-radius:10px;border:0;background:#2563eb;color:#fff;font-weight:900;padding:0 14px;cursor:pointer}
      .monthly-status-tab{grid-column:2;padding:22px 28px 32px!important;background:#f5f7fb}
      .monthly-status-card{background:#fff;border:1px solid #e5eaf2;border-radius:18px;padding:18px;box-shadow:0 8px 24px rgba(15,23,42,.045)}
      .monthly-status-card h2{margin:0 0 8px;color:#172033}.monthly-status-card p{margin:0 0 14px;color:#64748b;font-size:13px}
      .monthly-status-table{width:100%;border-collapse:collapse;background:#fff}.monthly-status-table th,.monthly-status-table td{border-bottom:1px solid #edf2f7;padding:9px;text-align:left;font-size:12px;vertical-align:middle}
      .monthly-status-table th{background:#f8fafc;color:#334155;font-weight:950}.monthly-pill{display:inline-flex;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:950}
      .monthly-pill.done{background:#dcfce7;color:#166534}.monthly-pill.wait{background:#f1f5f9;color:#475569}
      .monthly-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}.monthly-toolbar select{height:38px;border:1px solid #dbe3ef;border-radius:10px;padding:0 10px;font-weight:800}
      .monthly-btn{height:36px;border:0;border-radius:10px;padding:0 12px;background:#f3f6fb;color:#202636;border:1px solid #dbe5f3;font-size:12px;font-weight:900;cursor:pointer}
    `;
    document.head.appendChild(style);
  }

  function applyLanguageToMonthlyUi(){
    const completeBtn = $('monthlyCompleteButton');
    if (completeBtn) completeBtn.textContent = label('작성 완료', 'Complete');
    const tabBtn = $('monthlyStatusTabButton');
    if (tabBtn) tabBtn.textContent = label('월별 제출 현황', 'Monthly Status');
    document.querySelectorAll('.sewon-lang-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang());
      if (btn.dataset.lang === 'ko') btn.textContent = '한국어';
      if (btn.dataset.lang === 'en') btn.textContent = 'EN';
    });
  }

  function findRightActionGroup(){
    const addBtn = $('addInlineEntryButton') || Array.from(document.querySelectorAll('button')).find((b) => text(b).includes('+ 행 추가') || text(b).includes('+ Add Row'));
    if (addBtn && addBtn.parentElement) return addBtn.parentElement;
    const csvBtn = Array.from(document.querySelectorAll('button')).find((b) => text(b).includes('CSV 불러오기') || text(b).includes('Import CSV'));
    if (csvBtn && csvBtn.parentElement) return csvBtn.parentElement;
    return null;
  }

  function ensureCompleteButton(){
    if (isAdmin()) return;
    const group = findRightActionGroup();
    if (!group) return;
    let btn = $('monthlyCompleteButton');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'monthlyCompleteButton';
      btn.className = 'monthly-complete-btn';
    }
    btn.textContent = label('작성 완료', 'Complete');
    group.appendChild(btn);
  }

  function ensureStatusTab(){
    const tabs = document.querySelector('.tabs');
    if (!tabs) return;
    let btn = $('monthlyStatusTabButton');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'monthlyStatusTabButton';
      btn.className = 'tab';
      btn.dataset.tab = 'monthlyStatus';
      tabs.appendChild(btn);
    }
    btn.textContent = label('월별 제출 현황', 'Monthly Status');

    const card = tabs.closest('.card');
    if (card && !$('monthlyStatusTab')) {
      const panel = document.createElement('div');
      panel.id = 'monthlyStatusTab';
      panel.className = 'monthly-status-tab';
      panel.style.display = 'none';
      card.appendChild(panel);
    }
  }

  async function fetchEntries(company, year){
    const client = getClient();
    let q = client.from('sems_entries').select('company,year,month,emission').eq('year', year);
    if (company) q = q.eq('company', company);
    const res = await q;
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function fetchCompletions(company, year){
    const client = getClient();
    let q = client.from('sems_monthly_completions').select('company,year,month,completed_at').eq('year', year);
    if (company) q = q.eq('company', company);
    const res = await q;
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function fetchCompanies(){
    const p = await getProfile();
    if (!p) return [];
    if (p.role !== 'admin') return [p.company].filter(Boolean);
    const client = getClient();
    const res = await client.from('sems_organizations').select('company').order('company');
    if (res.error) throw res.error;
    return [...new Set((res.data || []).map((r) => r.company).filter(Boolean))];
  }

  async function markComplete(){
    const p = await getProfile();
    if (!p || !p.company) return;
    const company = p.company;
    const year = selectedYear();
    const month = selectedMonth();
    const client = getClient();
    const check = await client.from('sems_entries').select('id').eq('company', company).eq('year', year).eq('month', month).limit(1);
    if (check.error) { alert(check.error.message); return; }
    if (!check.data || !check.data.length) {
      alert(label('해당 월에 등록된 활동자료가 없습니다. 활동자료를 먼저 등록해 주세요.', 'No activity data is registered for this month. Please enter activity data first.'));
      return;
    }
    if (!confirm(currentLang() === 'en' ? company + ' ' + year + ' ' + monthLabel(month) + ' data will be marked as complete.' : company + ' ' + year + '년 ' + month + '월 자료를 작성 완료 처리할까요?')) return;
    const userRes = await client.auth.getUser();
    const uid = userRes && userRes.data && userRes.data.user ? userRes.data.user.id : null;
    const res = await client.from('sems_monthly_completions').upsert({
      company,
      year,
      month,
      completed_at: new Date().toISOString(),
      completed_by: uid,
      updated_at: new Date().toISOString()
    }, { onConflict: 'company,year,month' });
    if (res.error) { alert(res.error.message); return; }
    alert(label('작성 완료 처리되었습니다.', 'Marked as complete.'));
    renderStatus();
  }

  async function renderStatus(){
    const panel = $('monthlyStatusTab');
    if (!panel) return;
    try {
      const p = await getProfile();
      const year = Number(($('monthlyStatusYear') && $('monthlyStatusYear').value) || selectedYear() || new Date().getFullYear());
      const companies = await fetchCompanies();
      const companyFilter = p.role === 'admin' ? '' : p.company;
      const [entryRows, completedRows] = await Promise.all([
        fetchEntries(companyFilter, year),
        fetchCompletions(companyFilter, year)
      ]);
      const title = p.role === 'admin' ? label('회사별 월별 제출 현황', 'Monthly Submission Status by Company') : p.company + ' ' + label('월별 제출 현황', 'Monthly Submission Status');
      const desc = p.role === 'admin' ? label('전체 회사의 월별 작성 완료 여부를 확인합니다.', 'Check monthly completion status for all companies.') : label('본인 회사의 월별 작성 완료 여부만 확인합니다.', 'Only your company monthly completion status is shown.');
      const tableRows = companies.map((company) => {
        const cells = Array.from({ length: 12 }, (_, idx) => {
          const month = idx + 1;
          const monthRows = entryRows.filter((r) => r.company === company && Number(r.month) === month);
          const count = monthRows.length;
          const total = monthRows.reduce((a, b) => a + Number(b.emission || 0), 0);
          const done = completedRows.some((r) => r.company === company && Number(r.month) === month);
          return '<td><span class="monthly-pill ' + (done ? 'done' : 'wait') + '">' + statusLabel(done, count) + '</span><br><small>' + count + label('건', ' rows') + ' / ' + total.toLocaleString('ko-KR', { maximumFractionDigits: 1 }) + '</small></td>';
        }).join('');
        return '<tr><th>' + esc(company) + '</th>' + cells + '</tr>';
      }).join('');
      panel.innerHTML = '<div class="monthly-status-card"><h2>' + esc(title) + '</h2><p>' + esc(desc) + '</p><div class="monthly-toolbar"><label>' + label('연도', 'Year') + '</label><select id="monthlyStatusYear"><option value="' + year + '">' + year + '</option></select><button type="button" class="monthly-btn" id="monthlyStatusRefresh">' + label('새로고침', 'Refresh') + '</button></div><div class="table-wrap"><table class="monthly-status-table"><thead><tr><th>' + label('회사', 'Company') + '</th>' + Array.from({length:12}, (_,i)=>'<th>'+monthLabel(i+1)+'</th>').join('') + '</tr></thead><tbody>' + (tableRows || '<tr><td colspan="13">' + label('표시할 회사가 없습니다.', 'No companies to display.') + '</td></tr>') + '</tbody></table></div></div>';
    } catch (error) {
      panel.innerHTML = '<div class="monthly-status-card"><h2>' + label('월별 제출 현황', 'Monthly Submission Status') + '</h2><p>' + label('현황을 불러오지 못했습니다. Supabase SQL Editor에서 database/sems_monthly_completion_simple.sql을 먼저 실행해 주세요.', 'Could not load the status. Run database/sems_monthly_completion_simple.sql in Supabase SQL Editor first.') + '</p><p style="color:#991b1b">' + esc(error.message || error) + '</p></div>';
    }
  }

  function showStatusTab(){
    ['entriesTab','summaryTab','chartsTab','factorsTab','organizationTab','faqTab'].forEach((id) => { const el = $(id); if (el) el.style.display = 'none'; });
    const panel = $('monthlyStatusTab');
    if (panel) panel.style.display = 'block';
    document.querySelectorAll('.tabs .tab').forEach((tab) => tab.classList.remove('active'));
    const btn = $('monthlyStatusTabButton');
    if (btn) btn.classList.add('active');
    renderStatus();
  }

  function bindEvents(){
    if (document.body.dataset.simpleMonthlyBound === '1') return;
    document.body.dataset.simpleMonthlyBound = '1';
    document.addEventListener('click', function(e){
      if (e.target && e.target.id === 'monthlyCompleteButton') markComplete();
      if (e.target && e.target.id === 'monthlyStatusRefresh') renderStatus();
      const monthlyTab = e.target.closest && e.target.closest('#monthlyStatusTabButton');
      if (monthlyTab) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setTimeout(showStatusTab, 0);
        return;
      }
      const langBtn = e.target.closest && e.target.closest('.sewon-lang-btn');
      if (langBtn) {
        setTimeout(function(){
          applyLanguageToMonthlyUi();
          if ($('monthlyStatusTab') && $('monthlyStatusTab').style.display !== 'none') renderStatus();
        }, 60);
      } else if (e.target.closest && e.target.closest('.tabs .tab')) {
        const panel = $('monthlyStatusTab');
        if (panel) panel.style.display = 'none';
      }
    }, true);
  }

  async function boot(){
    addStyle();
    await getProfile().catch(function(){});
    ensureCompleteButton();
    ensureStatusTab();
    applyLanguageToMonthlyUi();
    bindEvents();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  setTimeout(boot, 800);
  setTimeout(boot, 1800);
})();
