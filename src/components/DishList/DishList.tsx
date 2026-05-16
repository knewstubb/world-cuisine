import { useState, useMemo } from 'react';
import { useSyncStatus } from '../../providers/SyncStatusProvider';
import DishEntryCard from '../DishEntryCard/DishEntryCard';
import styles from './DishList.module.css';

export interface DishListProps {
  countryCode: string;
}

export default function DishList({ countryCode }: DishListProps) {
  const { getDishEntriesForCountry, deleteDishEntry } = useSyncStatus();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const entries = getDishEntriesForCountry(countryCode);

  // Sort by created_at descending (most recent first)
  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [entries]
  );

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDelete = async (id: string) => {
    await deleteDishEntry(id);
    // Collapse if the deleted entry was expanded
    if (expandedId === id) {
      setExpandedId(null);
    }
  };

  if (sortedEntries.length === 0) {
    return <p className={styles.emptyMessage}>No dishes added yet.</p>;
  }

  return (
    <div className={styles.dishList}>
      {sortedEntries.map((entry) => (
        <DishEntryCard
          key={entry.id}
          entry={entry}
          expanded={expandedId === entry.id}
          onToggle={() => handleToggle(entry.id)}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
