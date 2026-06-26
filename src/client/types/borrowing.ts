export type BorrowingMode = 'classic' | 'trusted' | 'asynchronous' | 'external';

export type BorrowingStatus =
  | 'pending'
  | 'reserved'
  | 'borrowed'
  | 'returned'
  | 'rejected';

export interface Borrowing {
  id: number;
  itemId: number;
  borrowerId: number | null;
  externalBorrower: string | null;
  mode: BorrowingMode;
  status: BorrowingStatus;
  plannedReturnAt: string | null;
  approvedAt: string | null;
  handedOverAt: string | null;
  returnedAt: string | null;
  returnComment: string | null;
  createdAt: string;
}

export interface BorrowingRequestPayload {
  itemId: number;
  mode: Exclude<BorrowingMode, 'external'>;
  plannedReturnAt?: string;
}

export interface ExternalBorrowingPayload {
  itemId: number;
  externalBorrower: string;
  plannedReturnAt?: string;
}

export interface BorrowingReturnPayload {
  comment?: string;
}
