export type StatusType = 'system' | 'custom';

export interface Status {
  id: number;
  name: string;
  slug: string;
  type: StatusType;
  description?: string;
}

export interface CreateStatusPayload {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateStatusPayload {
  name?: string;
  description?: string;
}
