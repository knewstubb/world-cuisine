import { useSyncStatus } from '../../providers/SyncStatusProvider';
import styles from './OfflineIndicator.module.css';

export default function OfflineIndicator() {
  const { isOnline, pendingCount } = useSyncStatus();

  // Hide completely when online and no pending items
  if (isOnline && pendingCount === 0) {
    return null;
  }

  // Show "Syncing..." when back online but queue is still being processed
  if (isOnline && pendingCount > 0) {
    return (
      <div
        className={`${styles.banner} ${styles.syncing}`}
        role="status"
        aria-live="polite"
      >
        <span className={styles.icon} aria-hidden="true">⟳</span>
        Syncing… ({pendingCount} {pendingCount === 1 ? 'item' : 'items'} remaining)
      </div>
    );
  }

  // Show offline banner when not connected
  return (
    <div
      className={`${styles.banner} ${styles.offline}`}
      role="alert"
      aria-live="assertive"
    >
      <span className={styles.icon} aria-hidden="true">⚠</span>
      You are offline — changes will sync when reconnected
    </div>
  );
}
