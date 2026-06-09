# SEMS Supabase Deployment Guide

## 1. Supabase에서 할 일

1. Supabase Project 생성
2. SQL Editor에서 `sems_supabase_schema.sql` 전체 실행
3. Authentication > Users에서 회사별 사용자 계정 생성
4. 생성된 Auth 사용자와 `sems_profiles`를 연결

예시:

```sql
insert into public.sems_profiles(id, email, company, role)
select id, email, '세원정공', 'company_user'
from auth.users
where email = 'sewonj@se-won.co.kr';

insert into public.sems_profiles(id, email, company, role)
select id, email, null, 'admin'
from auth.users
where email = 'planning@se-won.co.kr';
```

## 2. HTML 설정

`SEMS_supabase_ready.html` 상단에서 아래 값을 실제 Supabase 값으로 바꿉니다.

```js
window.SEMS_SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT_REF.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY"
};
```

Supabase Dashboard > Project Settings > API에서 확인할 수 있습니다.

## 3. 권한 구조

| 계정 유형 | 조회 | 입력/수정/삭제 |
|---|---|---|
| 회사 계정 | 본인 회사 배출량/매출/조직만 | 본인 회사 배출량/매출만 |
| 기획팀 admin | 전체 회사 데이터 | 전체 회사 데이터, 조직, 배출계수 |

권한 제한은 프론트 화면뿐 아니라 Supabase RLS 정책에서 한 번 더 막습니다.

## 4. 배포 방법

정적 HTML 배포가 가능한 곳이면 됩니다.

추천:
- GitHub Pages
- Netlify
- Vercel
- 사내 웹서버 IIS/Apache/Nginx

## 5. 기존 LocalStorage 데이터 이관

기존 화면의 CSV 내보내기 기능으로 데이터를 백업한 뒤, Supabase 연결 버전에서 로그인 후 CSV 불러오기를 실행하면 됩니다.
저장 시 RLS 정책에 따라 해당 계정 권한 범위 내 데이터만 서버에 반영됩니다.

## 6. 운영상 주의사항

- `anonKey`는 프론트에 노출되어도 되는 공개 키이지만, `service_role key`는 절대 HTML에 넣으면 안 됩니다.
- 회사 계정은 반드시 `sems_profiles.company` 값이 실제 데이터의 `company` 값과 동일해야 합니다.
- 조직명 변경 시 기존 배출량 데이터의 회사명도 함께 정리해야 합니다.
