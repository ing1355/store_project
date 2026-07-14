# Store Dashboard

매일 일일 매출 결산, 일·월·연 성과, 메뉴·재고(입고/출고/잔량)를 관리하는 Vite + React 앱입니다.

## 실행

```bash
npm install
npm run dev
```

## Supabase 연동

환경 변수가 없으면 **로컬 샘플 데이터**로 동작합니다.  
DB에 저장하려면 아래를 진행하세요.

### 1. 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 에서 프로젝트 생성
2. **Project Settings → API**에서 `Project URL`, `anon public` 키 복사

### 2. 스키마 · 시드 실행

Supabase **SQL Editor**에서 순서대로 실행:

1. [`supabase/schema.sql`](supabase/schema.sql) — 테이블 · 인덱스 · RLS
2. [`supabase/settings.sql`](supabase/settings.sql) — 관리 설정(부족 기준 · 대분류)
3. [`supabase/seed.sql`](supabase/seed.sql) — 메뉴 · 오늘 입고/샘플 매출

### 3. 환경 변수

```bash
cp .env.example .env.local
```

`.env.local` 예시:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

개발 서버를 다시 실행하면 사이드바에 **「Supabase에 연결되어 있습니다」** 로 표시됩니다.

### DB 구조 (JSON 친화)

| 테이블 | 설명 |
|--------|------|
| `menus` | 상품 마스터 (`meta` jsonb) |
| `sales` | 결산 거래. 판매 항목은 `items` **jsonb** 배열 |
| `stock_movements` | 입·출고 (`type`: `in` \| `out`) |

`sales.items` 예시:

```json
[
  { "menu_id": "...", "name": "삼겹살", "price": 12000, "qty": 2 }
]
```

### 다른 플랫폼에서 JSON으로 읽기

REST (PostgREST):

```http
GET {VITE_SUPABASE_URL}/rest/v1/menus?select=*&order=code
GET {VITE_SUPABASE_URL}/rest/v1/sales?sale_date=eq.2026-07-15&select=*
GET {VITE_SUPABASE_URL}/rest/v1/stock_movements?movement_date=eq.2026-07-15&select=*
```

헤더:

```http
apikey: {ANON_KEY}
Authorization: Bearer {ANON_KEY}
```

JS는 `@supabase/supabase-js`로 동일 API를 사용하면 됩니다.

> 데이터 테이블 RLS는 **로그인한 사용자(authenticated)** 만 CRUD 가능합니다.

## 로그인

Supabase Auth를 사용합니다.

- 초기 계정: 아이디 `admin` / 비밀번호 `admin`
- 아이디는 내부적으로 `아이디@store.local` 이메일로 매핑됩니다.
- 로그인 → 데이터 로딩 → 대시보드
- **계정 관리**에서 아이디·이름·비밀번호 추가/수정/삭제

Auth 확인이 꺼져 있어야 바로 로그인됩니다. (Email Confirmations OFF 권장)

## 스크립트

- `npm run dev` — 개발 서버
- `npm run build` — 타입 체크 + 프로덕션 빌드
- `npm run preview` — 빌드 미리보기
