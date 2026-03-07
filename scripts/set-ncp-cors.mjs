#!/usr/bin/env node
/**
 * NCP Object Storage CORS 설정 스크립트
 * aws4로 SigV4 서명 + Content-MD5 수동 전달 (NCP 요구사항)
 *
 * 사용: node scripts/set-ncp-cors.mjs
 * 환경변수: NCP_ACCESS_KEY, NCP_SECRET_KEY (필수, .env에서 자동 로드)
 */
import { readFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import https from "https";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import aws4 from "aws4";

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = join(__dirname, "..", ".env");
if (existsSync(envPath)) {
  readFileSync(envPath, "utf-8")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) {
        const v = m[2].trim().replace(/^["']|["']$/g, "");
        process.env[m[1].trim()] = v;
      }
    });
}

const endpoint = process.env.NCP_S3_ENDPOINT ?? "https://kr.object.ncloudstorage.com";
const bucket = process.env.NCP_RAW_BUCKET ?? "reporton-raw-kr";
const accessKey = process.env.NCP_ACCESS_KEY;
const secretKey = process.env.NCP_SECRET_KEY;

if (!accessKey || !secretKey) {
  console.error("NCP_ACCESS_KEY, NCP_SECRET_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

/** CORS JSON → S3 XML (NCP 호환) */
function corsToXml(cors) {
  const ns = 'xmlns="http://s3.amazonaws.com/doc/2006-03-01/"';
  const rules = (cors.CORSRules || []).map((rule) => {
    const origins = (rule.AllowedOrigins || []).map((o) => `        <AllowedOrigin>${escapeXml(o)}</AllowedOrigin>`).join("\n");
    const methods = (rule.AllowedMethods || []).map((m) => `        <AllowedMethod>${escapeXml(m)}</AllowedMethod>`).join("\n");
    const headers = (rule.AllowedHeaders || []).map((h) => `        <AllowedHeader>${escapeXml(h)}</AllowedHeader>`).join("\n");
    const expose = (rule.ExposeHeaders || []).map((e) => `        <ExposeHeader>${escapeXml(e)}</ExposeHeader>`).join("\n");
    const maxAge = rule.MaxAgeSeconds != null ? `        <MaxAgeSeconds>${rule.MaxAgeSeconds}</MaxAgeSeconds>` : "";
    return `    <CORSRule>\n${origins}\n${methods}\n${headers}\n${expose}${maxAge ? "\n" + maxAge : ""}\n    </CORSRule>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<CORSConfiguration ${ns}>\n${rules}\n</CORSConfiguration>`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function computeContentMD5(xml) {
  return createHash("md5").update(xml, "utf8").digest("base64");
}

const url = new URL(endpoint);
const host = url.hostname;
const port = url.port || 443;
const region = process.env.NCP_REGION ?? "kr-standard";

const corsPath = join(__dirname, "..", "cors.json");
const corsConfig = JSON.parse(readFileSync(corsPath, "utf-8"));
const corsXml = corsToXml(corsConfig);
const contentMD5 = computeContentMD5(corsXml);

async function putBucketCors() {
  const path = `/${bucket}?cors`;
  const opts = {
    host,
    port: Number(port),
    path,
    method: "PUT",
    service: "s3",
    region,
    body: corsXml,
    headers: {
      "Content-Type": "application/xml",
      "Content-MD5": contentMD5,
      "Content-Length": Buffer.byteLength(corsXml, "utf8"),
    },
  };
  aws4.sign(opts, { accessKeyId: accessKey, secretAccessKey: secretKey });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: opts.host,
      port: opts.port,
      path: opts.path,
      method: opts.method,
      headers: opts.headers,
    }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`PUT failed: ${res.statusCode} ${body}`));
        }
      });
    });
    req.on("error", reject);
    req.write(corsXml, "utf8");
    req.end();
  });
}

async function getBucketCors() {
  const { S3Client, GetBucketCorsCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
  });
  const { CORSRules } = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  return CORSRules;
}

async function main() {
  try {
    await putBucketCors();
    console.log("✓ CORS 설정이 적용되었습니다.");

    const CORSRules = await getBucketCors();
    console.log("현재 CORS 설정:");
    console.log(JSON.stringify({ CORSRules }, null, 2));
  } catch (err) {
    console.error("오류:", err.message);
    process.exit(1);
  }
}

main();
