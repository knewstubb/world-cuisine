import DishForm from '../DishForm/DishForm';
import DishList from '../DishList/DishList';
import SuggestionList from '../SuggestionList/SuggestionList';
import styles from './CountryPanel.module.css';

export interface CountryPanelProps {
  country: { code: string; name: string };
  onClose: () => void;
}

export default function CountryPanel({ country, onClose }: CountryPanelProps) {
  return (
    <aside className={styles.panel} aria-label={`Dishes for ${country.name}`}>
      <div className={styles.header}>
        <h2 className={styles.countryName}>{country.name}</h2>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close panel"
        >
          ×
        </button>
      </div>
      <div className={styles.content}>
        <SuggestionList countryCode={country.code} />
        <DishForm countryCode={country.code} onDishAdded={() => {}} />
        <DishList countryCode={country.code} />
      </div>
    </aside>
  );
}
