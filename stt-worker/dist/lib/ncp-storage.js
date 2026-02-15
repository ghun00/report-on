"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNcpObjectKey = getNcpObjectKey;
exports.uploadWavToNcp = uploadWavToNcp;
exports.deleteNcpObject = deleteNcpObject;
const client_s3_1 = require("@aws-sdk/client-s3");
const endpoint = process.env.NCP_ENDPOINT;
const region = process.env.NCP_STT_REGION ?? "kr";
const bucket = process.env.NCP_STT_BUCKET;
const accessKey = process.env.NCP_ACCESS_KEY;
const secretKey = process.env.NCP_SECRET_KEY;
function getClient() {
    if (!endpoint || !accessKey || !secretKey) {
        throw new Error("NCP_ENDPOINT, NCP_ACCESS_KEY, NCP_SECRET_KEY are required");
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
const OBJECT_PREFIX = "input";
function getNcpObjectKey(reportId) {
    return `${OBJECT_PREFIX}/${reportId}.wav`;
}
async function uploadWavToNcp(reportId, wavBuffer) {
    if (!bucket)
        throw new Error("NCP_STT_BUCKET is required");
    const key = getNcpObjectKey(reportId);
    const client = getClient();
    await client.send(new client_s3_1.PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: wavBuffer,
        ContentType: "audio/wav",
    }));
    return key;
}
async function deleteNcpObject(reportId) {
    if (!bucket)
        return;
    const key = getNcpObjectKey(reportId);
    const client = getClient();
    await client.send(new client_s3_1.DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
    }));
}
