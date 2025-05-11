// src/middleware/upload.ts
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = randomUUID() + ext;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

export default upload;
