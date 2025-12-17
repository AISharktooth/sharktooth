import { Router } from "express";

export const policyRouter = Router();

policyRouter.post("/policy/check", (_req, res) => {
  res.status(501).json({ error: "NOT_IMPLEMENTED", message: "Policy checks pending." });
});

