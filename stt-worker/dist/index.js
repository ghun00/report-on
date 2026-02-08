"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jobs_1 = require("./jobs");
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.post("/jobs/start-stt", (req, res) => {
    const reportId = req.body?.reportId;
    if (!reportId || typeof reportId !== "string") {
        res.status(400).json({ ok: false, error: "reportId required" });
        return;
    }
    (0, jobs_1.startSttJob)(reportId).catch((err) => {
        console.error("[start-stt] background start error:", err);
    });
    res.status(200).json({ ok: true });
});
app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
});
app.listen(PORT, () => {
    console.log(`STT worker listening on port ${PORT}`);
});
