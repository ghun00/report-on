"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadFromNcpRaw = downloadFromNcpRaw;
const client_s3_1 = require("@aws-sdk/client-s3");
const endpoint = process.env.NCP_S3_ENDPOINT ?? process.env.NCP_RAW_ENDPOINT;
const region = process.env.NCP_REGION ?? process.env.NCP_RAW_REGION ?? "kr-standard";
const bucket = process.env.NCP_RAW_BUCKET;
const accessKey = process.env.NCP_ACCESS_KEY;
const secretKey = process.env.NCP_SECRET_KEY;
function getRawClient() {
    if (!endpoint || !accessKey || !secretKey || !bucket) {
        throw new Error("NCP_S3_ENDPOINT, NCP_ACCESS_KEY, NCP_SECRET_KEY, NCP_RAW_BUCKET are required for raw download");
    }
    return new client_s3_1.S3Client({
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
async function downloadFromNcpRaw(objectKey) {
    const client = getRawClient();
    const out = await client.send(new client_s3_1.GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
    }));
    const body = out.Body;
    if (!body)
        throw new Error("GetObject empty body");
    const chunks = [];
    for await (const chunk of body) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}
