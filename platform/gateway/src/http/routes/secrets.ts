import { Router } from "express";

export const secretsRouter = Router();

secretsRouter.get("/secrets/:name", (_req, res) => {
  res.status(501).json({ error: "NOT_IMPLEMENTED", message: "Secrets retrieval pending." });
});

