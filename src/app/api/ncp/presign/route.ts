import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getExtension(contentType: string): string {
  const t = (contentType || "").toLowerCase().trim();
  if (t.includes("audio/webm")) return ".webm";
  if (t.includes("audio/mp4")) return ".mp4";
  if (t.includes("audio/m4a")) return ".m4a";
  return ".webm";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reportId = (body.reportId ?? "").toString().trim();
    const contentType = (body.contentType ?? "audio/webm").toString().trim();

    if (!reportId || !UUID_REGEX.test(reportId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid reportId" },
        { status: 400 }
      );
    }

    const endpoint = process.env.NCP_S3_ENDPOINT;
    const region = process.env.NCP_REGION ?? "kr-standard";
    const bucket = process.env.NCP_RAW_BUCKET;
    const accessKey = process.env.NCP_ACCESS_KEY;
    const secretKey = process.env.NCP_SECRET_KEY;

    if (!endpoint || !bucket || !accessKey || !secretKey) {
      console.error("[ncp/presign] Missing NCP env vars");
      return NextResponse.json(
        { ok: false, error: "NCP storage not configured" },
        { status: 500 }
      );
    }

    const ext = getExtension(contentType);
    const objectKey = `raw/${reportId}${ext}`;

    const client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: contentType || "audio/webm",
    });

    const expiresIn = 60 * 30;
    const uploadUrl = await getSignedUrl(client, command, { expiresIn });

    return NextResponse.json({
      ok: true,
      uploadUrl,
      objectKey,
      bucket,
      expiresInSec: expiresIn,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ncp/presign] Error:", msg);
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }
}
