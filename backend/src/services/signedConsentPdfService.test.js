import assert from "node:assert/strict";
import test from "node:test";
import { renderSignedConsentPdf } from "./signedConsentPdf.js";

const signedConsent = {
  nombre_aspirante: "Laura",
  apellido_aspirante: "Gómez",
  cedula_aspirante: "123456789",
  cedula_confirmada: "123456789",
  version_texto: "borrador-1",
  texto_aceptado:
    "AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES\n\nAcepto el tratamiento informado.",
  firma_data_url:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=",
  firmada_en: "2026-11-05T07:00:00.000Z",
};

test("renders a PDF containing the signed consent and signature", async () => {
  const pdf = await renderSignedConsentPdf(signedConsent);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 1_000);
});

test("rejects a malformed stored signature", async () => {
  await assert.rejects(
    renderSignedConsentPdf({ ...signedConsent, firma_data_url: "data:image/png;base64,invalid" }),
    { statusCode: 500 },
  );
});
