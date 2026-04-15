import cors from "cors";
import express from "express";

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "pulsewatch-api" });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
