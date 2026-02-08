import express from "express";
import { startSttJob } from "./jobs";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const app = express();
app.use(express.json());

app.post("/jobs/start-stt", (req, res) => {
  const reportId = req.body?.reportId;
  if (!reportId || typeof reportId !== "string") {
    res.status(400).json({ ok: false, error: "reportId required" });
    return;
  }
  startSttJob(reportId).catch((err) => {
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
