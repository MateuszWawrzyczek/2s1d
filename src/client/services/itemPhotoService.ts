import { authHeaders } from './authHeaders';

export interface ItemPhoto {
  id: number;
  itemId: number;
  uploadedById: number;
  uploadedByName?: string;
  originalFilename: string;
  contentType: string;
  storagePath: string;
  addedAt: string;
}

export const itemPhotoService = {
  async list(itemId: number): Promise<ItemPhoto[]> {
    const response = await fetch(`/api/v1/items/${itemId}/photos/`, {
      headers: authHeaders(),
    });
    await ensureOk(response);
    return response.json();
  },
  async upload(itemId: number, file: File): Promise<ItemPhoto> {
    const fd = new FormData();
    fd.append('file', file);
    const response = await fetch(`/api/v1/items/${itemId}/photos/`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    await ensureOk(response);
    return response.json();
  },
  async download(itemId: number, photo: ItemPhoto): Promise<void> {
    const response = await fetch(`/api/v1/items/${itemId}/photos/${photo.id}`, {
      headers: authHeaders(),
    });
    await ensureOk(response);
    const objectUrl = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = photo.originalFilename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
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
