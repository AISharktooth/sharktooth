import { Router } from "express";
import path from "path";

export const adminUiPublicRouter = Router();

const adminUiPath = path.join(process.cwd(), "platform/gateway/src/http/admin-ui");

adminUiPublicRouter.get("/admin/login", (_req, res) => {
  return res.sendFile(path.join(adminUiPath, "login.html"));
});

adminUiPublicRouter.get("/admin/login.js", (_req, res) => {
  return res.sendFile(path.join(adminUiPath, "login.js"));
});

adminUiPublicRouter.get("/admin/styles.css", (_req, res) => {
  return res.sendFile(path.join(adminUiPath, "styles.css"));
});
