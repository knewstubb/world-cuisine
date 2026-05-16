export interface QueuedMutation {
  id: string;              // UUID
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'dish_entries';
  payload: Record<string, unknown>;
  timestamp: string;       // ISO 8601 (for conflict resolution)
  retryCount: number;
  photoFile?: Blob;        // Stored blob for offline photo uploads
}
