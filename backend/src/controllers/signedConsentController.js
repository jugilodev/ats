import { getSignedConsentPdf } from "../services/signedConsentPdfService.js";

export const getSignedConsentPdfController = async (req, res, next) => {
  try {
    const pdf = await getSignedConsentPdf(req.params.id);
    res.set({
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="autorizacion-tratamiento-${req.params.id}.pdf"`,
      "Content-Length": String(pdf.length),
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    });
    res.send(pdf);
  } catch (error) {
    next(error);
  }
};
