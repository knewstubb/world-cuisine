import { useSyncStatus } from '../../providers/SyncStatusProvider';
import styles from './SuggestionList.module.css';

export interface SuggestionListProps {
  countryCode: string;
}

/**
 * Checks whether a recipe link is valid (non-empty and starts with http:// or https://).
 */
function isValidRecipeLink(link: string | undefined | null): boolean {
  if (!link || link.trim() === '') return false;
  return /^https?:\/\/.+/.test(link.trim());
}

export default function SuggestionList({ countryCode }: SuggestionListProps) {
  const { getSuggestionsForCountry } = useSyncStatus();
  const suggestions = getSuggestionsForCountry(countryCode);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby="suggestions-heading">
      <h3 id="suggestions-heading" className={styles.heading}>
        Try Next
      </h3>
      <ul className={styles.list}>
        {suggestions.map((dish) => (
          <li key={dish.id} className={styles.item}>
            <span className={styles.dishName}>{dish.name}</span>
            {isValidRecipeLink(dish.recipe_link) ? (
              <a
                className={styles.recipeLink}
                href={dish.recipe_link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Recipe for ${dish.name}`}
              >
                Recipe
              </a>
            ) : (
              <span className={styles.linkUnavailable}>link unavailable</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
