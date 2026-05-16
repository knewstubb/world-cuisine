import { useRef, useState, useCallback } from 'react';
import { validatePhotoFile } from '../../lib/photoValidation';
import styles from './PhotoUploader.module.css';

export interface PhotoUploaderProps {
  onPhotoSelected: (file: File) => void;
  onPhotoRemoved: () => void;
  previewUrl: string | null;
  error: string | null;
}

const ACCEPTED_FORMATS = 'image/jpeg,image/png,image/webp';

export default function PhotoUploader({
  onPhotoSelected,
  onPhotoRemoved,
  previewUrl,
  error,
}: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const result = validatePhotoFile(file);
      if (result.valid) {
        setValidationError(null);
        onPhotoSelected(file);
      } else {
        setValidationError(result.error ?? 'Invalid file.');
        // Reset input so the same file can be re-selected
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onPhotoSelected],
  );

  const handleChooseFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemove = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setValidationError(null);
    onPhotoRemoved();
  }, [onPhotoRemoved]);

  // Display validation error (local) or parent-provided error (e.g. upload failure)
  const displayError = validationError || error;

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FORMATS}
        onChange={handleFileChange}
        className={styles.hiddenInput}
        aria-label="Select photo"
      />

      {previewUrl ? (
        <div className={styles.previewContainer}>
          <img
            src={previewUrl}
            alt="Selected dish photo preview"
            className={styles.preview}
          />
          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleChooseFile}
              className={styles.actionButton}
              aria-label="Change photo"
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className={styles.actionButton}
              aria-label="Remove photo"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleChooseFile}
          className={styles.selectButton}
          aria-label="Add photo"
        >
          <span className={styles.selectIcon} aria-hidden="true">
            📷
          </span>
          <span>Add Photo</span>
        </button>
      )}

      {displayError && (
        <p className={styles.error} role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
}
