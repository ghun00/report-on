import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const endpoint = process.env.NCP_ENDPOINT;
const region = process.env.NCP_STT_REGION ?? "kr";
const bucket = process.env.NCP_STT_BUCKET;
const accessKey = process.env.NCP_ACCESS_KEY;
const secretKey = process.env.NCP_SECRET_KEY;

function getClient(): S3Client {
  if (!endpoint || !accessKey || !secretKey) {
    throw new Error("NCP_ENDPOINT, NCP_ACCESS_KEY, NCP_SECRET_KEY are required");
  }
  return new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true,
  });
}

const NCP_STT_PREFIX = (process.env.NCP_STT_PREFIX ?? "input").replace(/\/$/, "");

export function getNcpObjectKey(reportId: string): string {
  return `${NCP_STT_PREFIX}/${reportId}.wav`;
}

/** CLOVA create job에 넘길 dataKey. 기본은 업로드 키와 동일(예: input/{reportId}.wav). 도메인에서 앞 슬래시 필요 시 NCP_STT_DATAKEY_PREFIX="/input" 지정. */
export function getClovaDataKey(reportId: string): string {
  const prefixForDataKey = process.env.NCP_STT_DATAKEY_PREFIX ?? NCP_STT_PREFIX;
  const normalized = prefixForDataKey.replace(/\/$/, "");
  return normalized ? `${normalized}/${reportId}.wav` : `${reportId}.wav`;
}

export async function uploadWavToNcp(
  reportId: string,
  wavBuffer: Buffer
): Promise<string> {
  if (!bucket) throw new Error("NCP_STT_BUCKET is required");
  const key = getNcpObjectKey(reportId);
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: wavBuffer,
      ContentType: "audio/wav",
    })
  );
  return key;
}

export async function deleteNcpObject(reportId: string): Promise<void> {
  if (!bucket) return;
  const key = getNcpObjectKey(reportId);
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

const NCP_STT_RESULT_PREFIX = (process.env.NCP_STT_RESULT_PREFIX ?? "result").replace(/\/$/, "");

/** CLOVA 결과 파일 규칙: result/{reportId}.wav_{token}.json */
export function getResultKey(reportId: string, token: string): string {
  return `${NCP_STT_RESULT_PREFIX}/${reportId}.wav_${token}.json`;
}

export async function getObjectFromNcp(key: string): Promise<string> {
  if (!bucket) throw new Error("NCP_STT_BUCKET is required");
  const client = getClient();
  const out = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
  const body = out.Body;
  if (!body) throw new Error("GetObject empty body");
  return await body.transformToString();
}

export async function deleteNcpResultKey(key: string): Promise<void> {
  if (!bucket) return;
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}
