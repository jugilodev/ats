import PDFDocument from "pdfkit";
import AppError from "../errors/AppError.js";

const parseSignature = (dataUrl) => {
  const prefix = "data:image/png;base64,";
  if (
    typeof dataUrl !== "string" ||
    dataUrl.length > 500_000 ||
    !dataUrl.startsWith(prefix) ||
    !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl)
  ) {
    throw new AppError("La firma almacenada no tiene un formato válido", 500);
  }

  const image = Buffer.from(dataUrl.slice(prefix.length), "base64");
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const pngEnd = Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  if (
    image.length < 45 ||
    !image.subarray(0, pngHeader.length).equals(pngHeader) ||
    !image.subarray(-pngEnd.length).equals(pngEnd) ||
    image.readUInt32BE(16) < 1 ||
    image.readUInt32BE(20) < 1 ||
    image.readUInt32BE(16) > 2_000 ||
    image.readUInt32BE(20) > 1_000
  ) {
    throw new AppError("La firma almacenada no tiene un formato válido", 500);
  }

  return image;
};

const formatSignedDate = (value) =>
  new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "long",
    timeStyle: "long",
  }).format(new Date(value));

export const renderSignedConsentPdf = (consent) =>
  new Promise((resolve, reject) => {
    const signature = parseSignature(consent.firma_data_url);
    const document = new PDFDocument({
      size: "A4",
      margin: 56,
      info: {
        Title: "Autorización para el tratamiento de datos personales",
        Author: "ATS",
        Subject: `Versión ${consent.version_texto}`,
      },
    });
    const chunks = [];

    document.on("data", (chunk) => chunks.push(chunk));
    document.once("error", reject);
    document.once("end", () => resolve(Buffer.concat(chunks)));

    document
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor("#243b30")
      .text("AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES", {
        align: "center",
      });
    document.moveDown(0.5);
    document
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#58675e")
      .text(`Versión del documento: ${consent.version_texto}`, {
        align: "center",
      });
    document.moveDown(2);
    document
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#222222")
      .text(consent.texto_aceptado, {
        align: "justify",
        lineGap: 3,
      });
    document.moveDown(2);

    if (document.y > document.page.height - document.page.margins.bottom - 250) {
      document.addPage();
    }

    document
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#243b30")
      .text("CONSTANCIA DE ACEPTACIÓN Y FIRMA");
    document.moveDown(0.7);
    document
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#222222")
      .text(`Nombre: ${consent.nombre_aspirante} ${consent.apellido_aspirante}`)
      .text(`Cédula registrada: ${consent.cedula_aspirante}`)
      .text(`Cédula confirmada al firmar: ${consent.cedula_confirmada}`)
      .text(`Fecha y hora de firma: ${formatSignedDate(consent.firmada_en)}`);
    document.moveDown(1);
    document.font("Helvetica-Bold").text("Firma:");
    document.image(signature, {
      fit: [260, 100],
      align: "left",
      valign: "center",
    });
    document.moveDown(0.5);
    document
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#58675e")
      .text(
        "La firma dibujada y la confirmación de cédula quedan registradas como evidencia de aceptación en el sistema; no constituyen una firma digital certificada.",
        { lineGap: 2 },
      );
    document.end();
  });
