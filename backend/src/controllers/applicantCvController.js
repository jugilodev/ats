import { pipeline } from "node:stream/promises";
import {
  getApplicantPostulationCv as getApplicantPostulationCvFile,
} from "../services/applicantCvService.js";

export const getApplicantPostulationCv = async (req, res, next) => {
  let file;
  try {
    file = await getApplicantPostulationCvFile(
      req.params.id,
      req.params.postulationId,
    );
    res.status(200);
    res.set({
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      "Content-Length": String(file.size),
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    });

    await pipeline(file.fileHandle.createReadStream({ autoClose: true }), res);
  } catch (error) {
    if (file) {
      await file.fileHandle.close().catch(() => {});
    }

    if (res.headersSent) {
      res.destroy(error);
      return;
    }
    next(error);
  }
};
