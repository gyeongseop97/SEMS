(function(){
  'use strict';

  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function en(){ return localStorage.getItem('sewonGhgUiLanguage') === 'en'; }
  function text(el){ return el && el.textContent ? el.textContent.trim() : ''; }

  var map = {
    '활동자료 입력':'Activity Data Input',
    '대시보드':'Dashboard',
    '집계':'Summary',
    '배출계수 관리':'Emission Factors',
    '조직·매출 관리':'Organization & Revenue',
    '도움말·FAQ':'Help & FAQ',
    '월별 제출 현황':'Monthly Submission Status',
    '출력 기준':'View',
    '해당 월':'Selected month',
    '전체':'All',
    '회사':'Company',
    '사업장':'Site',
    '연도':'Year',
    '월':'Month',
    '연월':'Period',
    '등록 부서':'Department',
    '배출원':'Emission Source',
    '사용량':'Usage',
    '단위':'Unit',
    '배출량':'Emissions',
    '비고':'Note',
    '수정':'Edit',
    '삭제':'Delete',
    '저장':'Save',
    '취소':'Cancel',
    '작성 완료':'Complete',
    '회수하기':'Withdraw',
    '선택 데이터 삭제':'Delete selected',
    '전체 데이터 삭제':'Delete all data',
    'CSV 내보내기':'Export CSV',
    'CSV 불러오기':'Import CSV',
    '+ 행 추가':'+ Add Row',
    '새로고침':'Refresh',
    '완료':'Complete',
    '작성중':'In progress',
    '미작성':'Not started'
  };

  function monthName(v, i){
    var m = String(v || '').match(/[0-9]+/);
    var n = m ? Number(m[0]) : i + 1;
    return n >= 1 && n <= 12 ? months[n - 1] : '';
  }

  function setText(el, value){
    if (el && text(el) !== value) el.textContent = value;
  }

  function patchOne(el){
    var v = text(el);
    if (!v) return;
    if (map[v]) { setText(el, map[v]); return; }

    for (var i = 1; i <= 12; i++) {
      if (v === i + 'MONTH' || v === i + 'Month' || v === i + 'month' || v === i + '월') {
        setText(el, months[i - 1]);
        return;
      }
    }

    if (v.indexOf('활동자료 입력') >= 0) {
      setText(el, v.split('활동자료 입력').join(' Activity Data Input').replace(/  +/g, ' ').trim());
      return;
    }
    if (v.indexOf('Activity Data Input') >= 0) {
      setText(el, v.split('Activity Data Input').join(' Activity Data Input').replace(/  +/g, ' ').trim());
      return;
    }
    if (v.indexOf('Site, Year, Month을') >= 0 || v.indexOf('Activity Data가 등록') >= 0 || v.indexOf('사업장, 연도, 월을') >= 0) {
      setText(el, 'Select Site, Year, and Month, then click [+ Add Row]. Activity data will be registered for the selected company.');
    }
  }

  function patchOptions(){
    var month = document.getElementById('month');
    if (month) Array.prototype.forEach.call(month.options, function(opt, i){
      var name = monthName(opt.value || opt.textContent, i);
      if (name) opt.textContent = name;
    });
    var basis = document.getElementById('monthlyOutputBasis');
    if (basis) Array.prototype.forEach.call(basis.options, function(opt){
      if (opt.value === 'all') opt.textContent = 'All';
      if (opt.value === 'month') opt.textContent = 'Selected month';
    });
  }

  function apply(){
    if (!en()) return;
    patchOptions();
    document.querySelectorAll('h1,h2,h3,h4,p,small,label,th,button,span,.tab,.monthly-pill,option').forEach(function(el){
      if (el.children && el.children.length && el.tagName !== 'BUTTON' && el.tagName !== 'TH') return;
      patchOne(el);
    });
  }

  function wrap(name){
    var original = window[name];
    if (typeof original === 'function' && !original.__semsI18nWrapped) {
      window[name] = function(){
        var result = original.apply(this, arguments);
        apply();
        requestAnimationFrame(apply);
        setTimeout(apply, 80);
        return result;
      };
      window[name].__semsI18nWrapped = true;
    }
  }

  function boot(){
    ['render','renderEntries','switchTab','renderSummary','renderCharts'].forEach(wrap);
    apply();
  }

  document.addEventListener('click', function(e){
    if (e.target && e.target.closest && e.target.closest('.sewon-lang-btn')) {
      setTimeout(apply, 50);
      setTimeout(apply, 300);
    }
  }, true);
  document.addEventListener('change', function(){ setTimeout(apply, 50); }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(boot, 300);
  setTimeout(boot, 1000);
  setInterval(apply, 2500);
})();
