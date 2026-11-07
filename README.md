# SysTradeHub

시그널 P, 시그널 C, 시그널 K의 주식 데이터와 분석 기능을 모은 반응형 웹앱입니다. 모바일에서는 하단 탭으로 탐색할 수 있습니다.

## 주요 기능

- 차트 패턴 도감, 유사 종목 검색, 캔들 패턴 스캐너, 과거 패턴 검색
- 뉴스·통합 피드, 기업 공시, 시장 지표와 종목 차트
- 테마·기술 신호, 투자자 수급, 종목 조건 검색
- 평균 단가·목표가 계산기와 브라우저 저장함

## 실행 및 빌드

Node.js 22.13 이상이 필요합니다.

```bash
npm ci
npm run dev
npx tsc --noEmit
npm run build
```

개발 서버는 기본적으로 `http://127.0.0.1:5173`에서 실행됩니다. 프론트엔드는 `/api/proxy` 서버 경로를 통해 `stock-neocode.cloud`의 API를 호출합니다. 브라우저별 ID를 만들어 시그널 K 인증 토큰을 서버에서 발급받고, 시그널 P·C API에는 각 앱의 `package` 헤더를 사용합니다. 인증 토큰은 소스 코드나 브라우저 저장소에 넣지 않습니다.

`.openai/hosting.json`은 현재 Sites 프로젝트의 식별자와 배포 설정입니다. `npm run build` 결과인 `dist/`는 생성물이라 Git에 포함하지 않습니다.

## 범위

이 저장소는 웹에서 동작하는 주요 데이터 화면을 구현합니다. 원본 모바일 앱의 FCM 푸시, 스토어 결제, 모바일 광고와 전체 백테스트는 포함하지 않습니다.

## 참고 저장소

- [SignalP](https://github.com/ParkEunSeong/SignalP)
- [signalc](https://github.com/ParkEunSeong/signalc)
- [stocknews_client](https://github.com/ParkEunSeong/stocknews_client)
