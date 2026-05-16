import { useState, useCallback, useRef, useEffect } from 'react';
import RatingInput from '../RatingInput/RatingInput';
import PhotoUploader from '../PhotoUploader/PhotoUploader';
import { useSyncStatus } from '../../providers/SyncStatusProvider';
import {
  validateDishName,
  validateRating,
  validateRecipeLink,
  parseIngredients,
  validateNotes,
} from '../../lib/dishValidation';
import styles from './DishForm.module.css';

export interface DishFormProps {
  countryCode: string;
  onDishAdded: () => void;
}

interface FormErrors {
  name?: string;
  rating?: string;
  notes?: string;
  recipe_link?: string;
}

export default function DishForm({ countryCode, onDishAdded }: DishFormProps) {
  const { addDishEntry, uploadPhoto, isOnline } = useSyncStatus();
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState('');
  const [notes, setNotes] = useState('');
  const [recipeLink, setRecipeLink] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUploadFailed, setPhotoUploadFailed] = useState(false);

  // Scroll active input into view on mobile when virtual keyboard opens (Req 1.6)
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        window.innerWidth < 768 &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        // Delay to allow virtual keyboard to appear
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    form.addEventListener('focusin', handleFocusIn);
    return () => form.removeEventListener('focusin', handleFocusIn);
  }, []);

  const handlePhotoSelected = useCallback((file: File) => {
    setPhotoFile(file);
    setPhotoError(null);
    setPhotoUploadFailed(false);
    const url = URL.createObjectURL(file);
    setPhotoPreviewUrl(url);
  }, []);

  const handlePhotoRemoved = useCallback(() => {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    setPhotoError(null);
    setPhotoUploadFailed(false);
  }, [photoPreviewUrl]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    const nameResult = validateDishName(name);
    if (!nameResult.valid) {
      newErrors.name = nameResult.error;
    }

    const ratingResult = validateRating(rating);
    if (!ratingResult.valid) {
      newErrors.rating = ratingResult.error;
    }

    const notesResult = validateNotes(notes);
    if (!notesResult.valid) {
      newErrors.notes = notesResult.error;
    }

    const recipeLinkResult = validateRecipeLink(recipeLink);
    if (!recipeLinkResult.valid) {
      newErrors.recipe_link = recipeLinkResult.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, rating, notes, recipeLink]);

  const resetForm = useCallback(() => {
    setName('');
    setRating(null);
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    setIngredients('');
    setNotes('');
    setRecipeLink('');
    setErrors({});
    setPhotoError(null);
    setPhotoUploadFailed(false);
  }, [photoPreviewUrl]);

  const submitEntry = useCallback(
    async (photoPath: string | null, queuedPhotoFile?: File) => {
      const parsedIngredients = parseIngredients(ingredients);

      await addDishEntry(
        {
          country_code: countryCode,
          name: name.trim(),
          rating,
          photo_path: photoPath,
          ingredients: parsedIngredients,
          notes: notes.trim() || null,
          recipe_link: recipeLink.trim() || null,
        },
        queuedPhotoFile,
      );

      resetForm();
      onDishAdded();
    },
    [addDishEntry, countryCode, name, rating, ingredients, notes, recipeLink, resetForm, onDishAdded],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;

      setIsSubmitting(true);
      setPhotoUploadFailed(false);

      try {
        let photoPath: string | null = null;

        if (photoFile) {
          if (!isOnline) {
            // Offline: queue the photo for upload on reconnect (Req 9.6)
            await submitEntry(null, photoFile);
            return;
          }
          try {
            photoPath = await uploadPhoto(photoFile);
          } catch {
            setPhotoError('Photo upload failed. You can retry or submit without the photo.');
            setPhotoUploadFailed(true);
            setIsSubmitting(false);
            return;
          }
        }

        await submitEntry(photoPath);
      } finally {
        setIsSubmitting(false);
      }
    },
    [validateForm, photoFile, isOnline, uploadPhoto, submitEntry],
  );

  const handleRetryUpload = useCallback(async () => {
    if (!photoFile) return;

    setIsSubmitting(true);
    setPhotoError(null);
    setPhotoUploadFailed(false);

    try {
      const photoPath = await uploadPhoto(photoFile);
      await submitEntry(photoPath);
    } catch {
      setPhotoError('Photo upload failed again. You can retry or submit without the photo.');
      setPhotoUploadFailed(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [photoFile, uploadPhoto, submitEntry]);

  const handleSubmitWithoutPhoto = useCallback(async () => {
    setIsSubmitting(true);
    setPhotoError(null);
    setPhotoUploadFailed(false);

    try {
      await submitEntry(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [submitEntry]);

  return (
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit} aria-label="Add a dish" noValidate>
      {/* Dish Name */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="dish-name-input">
          Dish Name <span className={styles.required}>*</span>
        </label>
        <input
          id="dish-name-input"
          className={styles.input}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          placeholder="Enter dish name…"
          maxLength={100}
          required
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'dish-name-error' : undefined}
        />
        {errors.name && (
          <p id="dish-name-error" className={styles.errorMessage} role="alert">
            {errors.name}
          </p>
        )}
      </div>

      {/* Rating */}
      <div className={styles.field}>
        <RatingInput value={rating} onChange={(val) => {
          setRating(val);
          if (errors.rating) setErrors((prev) => ({ ...prev, rating: undefined }));
        }} required />
        {errors.rating && (
          <p id="rating-error" className={styles.errorMessage} role="alert">
            {errors.rating}
          </p>
        )}
      </div>

      {/* Photo */}
      <div className={styles.field}>
        <label className={styles.label}>Photo (optional)</label>
        <PhotoUploader
          onPhotoSelected={handlePhotoSelected}
          onPhotoRemoved={handlePhotoRemoved}
          previewUrl={photoPreviewUrl}
          error={photoError}
        />
        {photoUploadFailed && (
          <div className={styles.photoRetryActions}>
            <button
              type="button"
              className={styles.retryButton}
              onClick={handleRetryUpload}
              disabled={isSubmitting}
            >
              Retry Upload
            </button>
            <button
              type="button"
              className={styles.skipButton}
              onClick={handleSubmitWithoutPhoto}
              disabled={isSubmitting}
            >
              Submit Without Photo
            </button>
          </div>
        )}
      </div>

      {/* Ingredients */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="ingredients-input">
          Ingredients (optional)
        </label>
        <textarea
          id="ingredients-input"
          className={styles.textarea}
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="Comma or line separated (max 50 items)"
          rows={3}
        />
      </div>

      {/* Notes */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="notes-input">
          Notes (optional)
        </label>
        <textarea
          id="notes-input"
          className={styles.textarea}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            if (errors.notes) setErrors((prev) => ({ ...prev, notes: undefined }));
          }}
          placeholder="Your thoughts on this dish…"
          rows={3}
          aria-invalid={!!errors.notes}
          aria-describedby={errors.notes ? 'notes-error' : undefined}
        />
        {errors.notes && (
          <p id="notes-error" className={styles.errorMessage} role="alert">
            {errors.notes}
          </p>
        )}
        <span className={styles.charCount}>{notes.length}/1000</span>
      </div>

      {/* Recipe Link */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="recipe-link-input">
          Recipe Link (optional)
        </label>
        <input
          id="recipe-link-input"
          className={styles.input}
          type="url"
          value={recipeLink}
          onChange={(e) => {
            setRecipeLink(e.target.value);
            if (errors.recipe_link) setErrors((prev) => ({ ...prev, recipe_link: undefined }));
          }}
          placeholder="https://example.com/recipe"
          aria-invalid={!!errors.recipe_link}
          aria-describedby={errors.recipe_link ? 'recipe-link-error' : undefined}
        />
        {errors.recipe_link && (
          <p id="recipe-link-error" className={styles.errorMessage} role="alert">
            {errors.recipe_link}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        className={styles.submitButton}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving…' : 'Add Dish'}
      </button>
    </form>
  );
}
