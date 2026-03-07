import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const endpoint = process.env.NCP_S3_ENDPOINT ?? process.env.NCP_RAW_ENDPOINT;
const region = process.env.NCP_REGION ?? process.env.NCP_RAW_REGION ?? "kr-standard";
const bucket = process.env.NCP_RAW_BUCKET;
const accessKey = process.env.NCP_ACCESS_KEY;
const secretKey = process.env.NCP_SECRET_KEY;

function getRawClient(): S3Client {
  if (!endpoint || !accessKey || !secretKey || !bucket) {
    throw new Error(
      "NCP_S3_ENDPOINT, NCP_ACCESS_KEY, NCP_SECRET_KEY, NCP_RAW_BUCKET are required for raw download"
    );
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

/**
 * NCP RAW 버킷에서 오디오 파일 다운로드
 * @param objectKey 예: raw/{reportId}.webm
 * @returns Buffer
 */
export async function downloadFromNcpRaw(objectKey: string): Promise<Buffer> {
  const client = getRawClient();
  const out = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    })
  );
  const body = out.Body;
  if (!body) throw new Error("GetObject empty body");
  const chunks: Uint8Array[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
