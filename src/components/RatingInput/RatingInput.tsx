import { useCallback } from 'react';
import styles from './RatingInput.module.css';

export interface RatingInputProps {
  value: number | null;
  onChange: (rating: number) => void;
  required?: boolean;
}

export default function RatingInput({ value, onChange, required = false }: RatingInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '') return;

      const parsed = Math.round(Number(raw));
      if (!Number.isFinite(parsed)) return;

      const clamped = Math.max(1, Math.min(10, parsed));
      onChange(clamped);
    },
    [onChange],
  );

  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="rating-input">
        Rating (1-10)
      </label>
      <input
        id="rating-input"
        className={styles.input}
        type="number"
        min={1}
        max={10}
        step={1}
        value={value ?? ''}
        onChange={handleChange}
        required={required}
        aria-label="Rating from 1 to 10"
      />
    </div>
  );
}
