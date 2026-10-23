import {
  getTreatmentAuthorization,
  sendTreatmentAuthorization,
  signTreatmentAuthorization,
} from "../services/consentService.js";

export const sendAuthorization = async (req, res) => {
  res.json(await sendTreatmentAuthorization(req.params.id));
};

export const getAuthorization = async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await getTreatmentAuthorization(req.params.token));
};

export const signAuthorization = async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(
    await signTreatmentAuthorization(req.params.token, req.body),
  );
};
