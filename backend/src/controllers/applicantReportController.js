import {
  getApplicantReportPostulations,
  sendApplicant16pfGuide,
} from "../services/applicantReportService.js";

export const listReportPostulations = async (req, res) => {
  res.json({
    postulaciones: await getApplicantReportPostulations(req.params.id),
  });
};

export const sendApplicant16pfGuideController = async (req, res) => {
  res.json(
    await sendApplicant16pfGuide(
      req.params.id,
      req.params.postulacionId,
    ),
  );
};
