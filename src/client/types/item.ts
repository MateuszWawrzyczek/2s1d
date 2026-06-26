export interface Item {
  id: number;
  systemId?: string;
  name: string;
  manufacturer: string;
  model?: string;
  serial?: string;
  inventoryNumber?: string;
  description?: string;
  purchaseDate?: string;
  addedAt?: string;
  categoryId: number;
  statusId: number;
  locationId: number;
  ownerId: number;
  ownerGroupId?: number | null;
  legacyItemId?: number;
}

export interface CreateItemPayload {
  name: string;
  manufacturer?: string;
  model?: string;
  serial?: string;
  inventoryNumber?: string;
  description?: string;
  purchaseDate?: string;
  systemId?: string;
  categoryId?: number;
  statusId?: number;
  locationId?: number;
  ownerId?: number | null;
  ownerGroupId?: number | null;
}
