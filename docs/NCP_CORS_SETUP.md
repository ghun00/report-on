# NCP Object Storage CORS 설정 가이드

브라우저에서 presigned PUT URL로 업로드하려면 버킷에 CORS를 설정해야 합니다. NCP 콘솔에는 CORS 메뉴가 없으므로 **aws-cli (S3 호환 API)**로 설정합니다.

---

## 0. 사전 준비

### aws-cli 설치 확인

```bash
aws --version
```

설치되어 있지 않으면:

- **macOS (Homebrew)**: `brew install awscli`
- **공식**: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

---

## 1. NCP credentials 설정

### 방법 A: `aws configure` (기본 프로필)

```bash
aws configure
```

다음과 같이 입력:

| 프롬프트 | 입력값 |
|---------|--------|
| AWS Access Key ID | **NCP Access Key** (NCP 콘솔 → 마이페이지 → 계정 관리 → 인증키 관리) |
| AWS Secret Access Key | **NCP Secret Key** |
| Default region name | `kr-standard` (또는 `ap-northeast-2`) |
| Default output format | `json` |

### 방법 B: 환경 변수 (임시 테스트용)

```bash
export AWS_ACCESS_KEY_ID="your-ncp-access-key"
export AWS_SECRET_ACCESS_KEY="your-ncp-secret-key"
export AWS_DEFAULT_REGION="kr-standard"
```

---

## 2. CORS 설정 파일 확인

`cors.json` 파일이 프로젝트 루트에 있는지 확인:

```bash
cat cors.json
```

내용 예시:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://report-on.app", "http://localhost:3000"],
      "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

---

## 3. CORS 적용

> **참고**: NCP는 `Content-MD5` 헤더를 요구하는데, aws-cli에서 누락되는 경우가 있습니다. 아래 **방법 A(권장)**를 사용하세요.

### 방법 A: Node 스크립트 (권장)

`.env`에 `NCP_ACCESS_KEY`, `NCP_SECRET_KEY`가 있으면 자동으로 사용합니다.

```bash
cd "/Volumes/Dean's SSD/project/report-on"
node scripts/set-ncp-cors.mjs
```

### 방법 B: aws-cli

```bash
aws s3api put-bucket-cors \
  --bucket reporton-raw-kr \
  --cors-configuration file://cors.json \
  --endpoint-url https://kr.object.ncloudstorage.com
```

> `Missing required header: Content-MD5` 오류가 나면 **방법 A**를 사용하세요.

성공 시 별도 출력 없이 종료됩니다.

---

## 4. 적용 확인

### 4-1. get-bucket-cors로 확인

```bash
aws s3api get-bucket-cors \
  --bucket reporton-raw-kr \
  --endpoint-url https://kr.object.ncloudstorage.com
```

예상 출력:

```json
{
    "CORSRules": [
        {
            "AllowedOrigins": [
                "https://report-on.app",
                "http://localhost:3000"
            ],
            "AllowedMethods": [
                "PUT",
                "GET",
                "HEAD"
            ],
            "AllowedHeaders": ["*"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }
    ]
}
```

### 4-2. 브라우저 업로드 테스트 체크리스트

1. **report-on.app 또는 localhost:3000**에서 녹음 → 종료 후 업로드 시도
2. Chrome DevTools 열기 (F12) → **Network** 탭
3. 업로드 시 다음 순서로 요청 확인:

| 순서 | Method | URL (일부) | 상태 | 비고 |
|------|--------|-----------|------|------|
| 1 | OPTIONS | `kr.object.ncloudstorage.com` | **200** 또는 **204** | Preflight |
| 2 | PUT | `kr.object.ncloudstorage.com/reporton-raw-kr/raw/...` | **200** 또는 **204** | 실제 업로드 |

4. OPTIONS 또는 PUT에서 **CORS 관련 에러**가 보이면:
   - `Access-Control-Allow-Origin` 응답 헤더 확인
   - `cors.json`의 `AllowedOrigins`에 현재 origin이 포함되어 있는지 확인

---

## 5. 트러블슈팅

### `put-bucket-cors` 오류

- `NoSuchBucket`: 버킷 이름·리전·엔드포인트 확인
- `AccessDenied`: NCP Access Key / Secret Key 확인
- `InvalidArgument`: `cors.json` JSON 문법·규칙 구조 확인

### 브라우저에서 CORS 에러

- OPTIONS 200/204인데 PUT에서 실패 → `AllowedMethods`에 `PUT` 포함 여부 확인
- `AllowedHeaders`가 `["*"]`인지 확인
- presigned URL의 만료(30분) 이내인지 확인
