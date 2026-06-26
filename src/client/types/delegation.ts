export type PermissionLevel = 'edit' | 'manage';

export interface Delegation {
  id: number;
  item_id: number;
  user_id: number | null;
  group_id: number | null;
  permission: PermissionLevel;
  user_email: string | null;
  group_name: string | null;
}

export interface CreateDelegationPayload {
  user_id?: number;
  group_id?: number;
  permission: PermissionLevel;
}
