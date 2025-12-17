import { AppError } from "../../../../../shared/utils/errors";

const allowedExtensions = [".pdf", ".txt"];

const getExtension = (filename: string) => {
  const idx = filename.lastIndexOf(".");
  if (idx === -1) return "";
  return filename.slice(idx).toLowerCase();
};

export const validateFileType = (filename: string) => {
  const ext = getExtension(filename);
  if (!allowedExtensions.includes(ext)) {
    throw new AppError("Unsupported file type", { status: 400, code: "UNSUPPORTED_FILE" });
  }
};
