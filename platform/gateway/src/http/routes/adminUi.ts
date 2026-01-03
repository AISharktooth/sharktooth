import express, { Router } from "express";
import path from "path";

export const adminUiRouter = Router();

const adminUiPath = path.join(process.cwd(), "platform/gateway/src/http/admin-ui");

adminUiRouter.use("/admin", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  const staticHandler = express.static(adminUiPath, { index: false });
  return staticHandler(req, res, next);
});

adminUiRouter.get("/admin", (_req, res) => {
  return res.sendFile(path.join(adminUiPath, "index.html"));
});

adminUiRouter.get("/admin/*", (req, res, next) => {
  if (req.path.startsWith("/admin/api")) return next();
  return res.sendFile(path.join(adminUiPath, "index.html"));
});
