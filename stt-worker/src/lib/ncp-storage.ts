import {
  S3Client,
  PutObjectCommand,
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

const OBJECT_PREFIX = "input";

export function getNcpObjectKey(reportId: string): string {
  return `${OBJECT_PREFIX}/${reportId}.wav`;
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
