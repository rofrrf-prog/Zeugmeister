import { jsPDF } from 'jspdf';
import { SOLL_KATEGORIEN } from '../constants/config';

export async function generateAndSharePDF(cadett, aktuelleAusgaben, inventar, logAction) {
  const doc = new jsPDF();
  doc.setFillColor(196, 18, 48); doc.rect(20, 15, 170, 3, 'F');
  doc.setFont("Helvetica", "bold"); doc.setFontSize(22); doc.text("Beleg: Uniformen-Ausgabe", 20, 30);
  doc.setFont("Helvetica", "normal"); doc.setFontSize(11);
  doc.text(`Cadett: ${cadett.vorname} ${cadett.nachname}`, 20, 45);
  doc.setLineWidth(0.5); doc.line(20, 58, 190, 58); 
  doc.setFont("Helvetica", "bold"); doc.text("Aktueller Ausstattungs-Status:", 20, 68);
  doc.setFont("Helvetica", "normal"); let yPos = 78;
  
  SOLL_KATEGORIEN.forEach((kat) => {
    const geliehen = aktuelleAusgaben.find(a => a.kategorie_soll === kat);
    if (geliehen) {
      if (geliehen.status_nicht_benoetigt) doc.text(`[-] ${kat}: Nicht benötigt`, 25, yPos);
      else if (geliehen.selbst_beschafft) doc.text(`[X] ${kat}: Selbst beschafft`, 25, yPos);
      else doc.text(`[X] ${kat}: Vereinslager ID: ${geliehen.inventar_id}`, 25, yPos);
    } else doc.text(`[ ] ${kat}: Offen`, 25, yPos);
    yPos += 9; 
  });
  
  logAction("PDF generiert", `Beleg für ${cadett.vorname} aufgerufen.`);
  const dateiname = `${cadett.vorname}_${cadett.nachname}.pdf`;

  if (navigator.canShare && navigator.share) {
    try {
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], dateiname, { type: 'application/pdf' });
      await navigator.share({ files: [file], title: `Beleg: ${cadett.vorname}` });
    } catch (err) { console.log(err); }
  } else { doc.save(dateiname); }
}