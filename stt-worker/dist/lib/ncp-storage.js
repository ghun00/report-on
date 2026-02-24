"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNcpObjectKey = getNcpObjectKey;
exports.getClovaDataKey = getClovaDataKey;
exports.uploadWavToNcp = uploadWavToNcp;
exports.deleteNcpObject = deleteNcpObject;
exports.getResultKey = getResultKey;
exports.getObjectFromNcp = getObjectFromNcp;
exports.deleteNcpResultKey = deleteNcpResultKey;
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
const NCP_STT_PREFIX = (process.env.NCP_STT_PREFIX ?? "input").replace(/\/$/, "");
function getNcpObjectKey(reportId) {
    return `${NCP_STT_PREFIX}/${reportId}.wav`;
}
/** CLOVA create job에 넘길 dataKey. 기본은 업로드 키와 동일(예: input/{reportId}.wav). 도메인에서 앞 슬래시 필요 시 NCP_STT_DATAKEY_PREFIX="/input" 지정. */
function getClovaDataKey(reportId) {
    const prefixForDataKey = process.env.NCP_STT_DATAKEY_PREFIX ?? NCP_STT_PREFIX;
    const normalized = prefixForDataKey.replace(/\/$/, "");
    return normalized ? `${normalized}/${reportId}.wav` : `${reportId}.wav`;
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
const NCP_STT_RESULT_PREFIX = (process.env.NCP_STT_RESULT_PREFIX ?? "result").replace(/\/$/, "");
/** CLOVA 결과 파일 규칙: result/{reportId}.wav_{token}.json */
function getResultKey(reportId, token) {
    return `${NCP_STT_RESULT_PREFIX}/${reportId}.wav_${token}.json`;
}
async function getObjectFromNcp(key) {
    if (!bucket)
        throw new Error("NCP_STT_BUCKET is required");
    const client = getClient();
    const out = await client.send(new client_s3_1.GetObjectCommand({
        Bucket: bucket,
        Key: key,
    }));
    const body = out.Body;
    if (!body)
        throw new Error("GetObject empty body");
    return await body.transformToString();
}
async function deleteNcpResultKey(key) {
    if (!bucket)
        return;
    const client = getClient();
    await client.send(new client_s3_1.DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
    }));
}
