import type { DishEntry } from '../../types/DishEntry';
import { getThumbnailUrl } from '../../lib/thumbnailUrl';
import styles from './DishEntryCard.module.css';

export interface DishEntryCardProps {
  entry: DishEntry;
  onDelete: (id: string) => void;
  expanded: boolean;
  onToggle: () => void;
}

export default function DishEntryCard({ entry, onDelete, expanded, onToggle }: DishEntryCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Delete "${entry.name}"?`);
    if (confirmed) {
      onDelete(entry.id);
    }
  };

  const formattedDate = new Date(entry.created_at).toLocaleDateString();

  const hasSyncIndicator = entry.sync_status === 'pending' || entry.sync_status === 'error';

  return (
    <article
      className={`${styles.card} ${expanded ? styles.expanded : ''}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      aria-expanded={expanded}
      aria-label={`${entry.name}, rated ${entry.rating !== null ? `${entry.rating}/10` : 'unrated'}`}
    >
      {/* Summary view */}
      <div className={styles.summary}>
        <div className={styles.thumbnail}>
          {entry.photo_path ? (
            <img
              src={getThumbnailUrl(entry.photo_path)}
              alt={`Photo of ${entry.name}`}
              className={styles.thumbnailImage}
              width={80}
              height={80}
            />
          ) : (
            <div className={styles.placeholder} aria-label="No photo available">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}
        </div>

        <div className={styles.info}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{entry.name}</span>
            {hasSyncIndicator && (
              <span
                className={`${styles.syncBadge} ${entry.sync_status === 'error' ? styles.syncError : styles.syncPending}`}
                aria-label={`Sync status: ${entry.sync_status}`}
              >
                {entry.sync_status === 'pending' ? '⏳' : '⚠️'}
              </span>
            )}
          </div>
          <div className={styles.meta}>
            {entry.rating !== null && (
              <span className={styles.rating}>{entry.rating}/10</span>
            )}
            <span className={styles.date}>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Expanded view */}
      {expanded && (
        <div className={styles.details} onClick={(e) => e.stopPropagation()}>
          {entry.ingredients.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Ingredients</h4>
              <ul className={styles.ingredientsList}>
                {entry.ingredients.map((ingredient, index) => (
                  <li key={index} className={styles.ingredientItem}>
                    {ingredient}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {entry.notes && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Notes</h4>
              <p className={styles.notes}>{entry.notes}</p>
            </div>
          )}

          {entry.recipe_link && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Recipe</h4>
              <a
                href={entry.recipe_link}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.recipeLink}
                onClick={(e) => e.stopPropagation()}
              >
                View Recipe ↗
              </a>
            </div>
          )}

          <div className={styles.actions}>
            <button
              className={styles.deleteButton}
              onClick={handleDelete}
              aria-label={`Delete ${entry.name}`}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
