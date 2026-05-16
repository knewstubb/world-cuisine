import { useState, useEffect, useCallback } from 'react';
import { detectLegacyData, migrateLegacyDishes, type MigrationResult } from '../../lib/migration';
import { supabase } from '../../lib/supabase';
import styles from './MigrationPrompt.module.css';

type MigrationState = 'idle' | 'migrating' | 'success' | 'error';

export default function MigrationPrompt() {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<MigrationState>('idle');
  const [progress, setProgress] = useState<{ migrated: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (detectLegacyData()) {
      setVisible(true);
    }
  }, []);

  const handleMigrate = useCallback(async () => {
    setState('migrating');
    setError(null);

    try {
      // Get current user session and household
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError('You must be signed in to migrate data.');
        setState('error');
        return;
      }

      const userId = session.user.id;

      const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', userId)
        .single();

      if (!membership) {
        setError('No household found. Please ensure your account is set up correctly.');
        setState('error');
        return;
      }

      const householdId = membership.household_id;

      const result: MigrationResult = await migrateLegacyDishes(
        householdId,
        userId,
        (migrated, total) => {
          setProgress({ migrated, total });
        }
      );

      if (result.success) {
        setState('success');
        // Hide prompt after brief success display
        setTimeout(() => {
          setVisible(false);
        }, 1500);
      } else {
        setError(
          `Migration partially failed: ${result.failedCount} of ${result.total} entries could not be migrated. You can retry to migrate the remaining entries.`
        );
        setState('error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during migration.';
      setError(message);
      setState('error');
    }
  }, []);

  const handleDismiss = useCallback(() => {
    // Don't clear localStorage — prompt will show again next open
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-labelledby="migration-title" aria-modal="true">
      <div className={styles.prompt}>
        <h2 id="migration-title" className={styles.title}>
          {state === 'success' ? 'Migration Complete!' : 'Migrate Your Data'}
        </h2>

        {state === 'idle' && (
          <>
            <p className={styles.description}>
              We found existing dish data on this device. Would you like to migrate it to the cloud so it syncs across all your devices?
            </p>
            <div className={styles.actions}>
              <button
                className={styles.dismissButton}
                onClick={handleDismiss}
                type="button"
              >
                Not Now
              </button>
              <button
                className={styles.migrateButton}
                onClick={handleMigrate}
                type="button"
              >
                Migrate Data
              </button>
            </div>
          </>
        )}

        {state === 'migrating' && progress && (
          <div className={styles.progressSection}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress.total > 0 ? (progress.migrated / progress.total) * 100 : 0}%` }}
              />
            </div>
            <p className={styles.progressText}>
              Migrating {progress.migrated} of {progress.total} dishes...
            </p>
          </div>
        )}

        {state === 'migrating' && !progress && (
          <div className={styles.progressSection}>
            <p className={styles.progressText}>Preparing migration...</p>
          </div>
        )}

        {state === 'success' && (
          <p className={styles.description}>
            All your dishes have been successfully migrated to the cloud.
          </p>
        )}

        {state === 'error' && (
          <>
            <div className={styles.errorMessage}>{error}</div>
            <div className={styles.actions}>
              <button
                className={styles.dismissButton}
                onClick={handleDismiss}
                type="button"
              >
                Dismiss
              </button>
              <button
                className={styles.migrateButton}
                onClick={handleMigrate}
                type="button"
              >
                Retry
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
