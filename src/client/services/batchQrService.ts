import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { jsonAuthHeaders } from './authHeaders';

export type QrSize = 'small' | 'medium' | 'large';

export const batchQrService = {
  async download(itemIds: number[], size: QrSize = 'medium'): Promise<void> {
    const response = await fetch('/api/v1/batch-qr/print', {
      method: 'POST',
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ item_ids: itemIds }),
    });
    await ensureOk(response);
    const data = (await response.json()) as {
      items: { id: number; systemId: string | null; name: string }[];
    };
    const items = data.items;

    const doc = new jsPDF();
    const qrSize = size === 'small' ? 24 : size === 'large' ? 40 : 30;
    const rowHeight = qrSize + 20;
    doc.setFontSize(16);
    doc.text(`Etykiety QR`, 20, 20);

    let y = 40;
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.text(`${index + 1}. ${item.name}`, 20, y);
      doc.setFontSize(10);
      const identifier = item.systemId || `ITEM-${item.id}`;
      doc.text(
        `ID: ${item.id} | System ID: ${item.systemId || 'Brak'}`,
        20,
        y + 6
      );

      const qrDataUrl = await QRCode.toDataURL(identifier, {
        width: size === 'small' ? 120 : size === 'large' ? 180 : 150,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });

      doc.addImage(qrDataUrl, 'PNG', 20, y + 10, qrSize, qrSize);

      y += rowHeight;
    }

    doc.save('qr_labels.pdf');
  },
};

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  let detail = `Błąd serwera (${response.status})`;
  try {
    const data = (await response.json()) as Record<string, unknown>;
    if (typeof data.detail === 'string') detail = data.detail;
  } catch {}
  throw new Error(detail);
}
