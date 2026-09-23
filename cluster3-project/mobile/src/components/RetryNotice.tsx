/**
 * @file Inline error message with a Retry button, shared by every view whose
 * section loads from the API.
 */
import { IonButton } from '@ionic/react';
import './RetryNotice.css';

/** Props for {@link RetryNotice}. */
export interface RetryNoticeProps {
  /** User-facing error message. */
  message: string;
  /** Called when the user taps Retry. */
  onRetry: () => void;
}

/**
 * Render an error message and a Retry button.
 *
 * @param props - Message and retry action.
 * @returns The notice.
 */
export default function RetryNotice({ message, onRetry }: RetryNoticeProps) {
  return (
    <div className="retry-notice">
      <p className="retry-notice__text">{message}</p>
      <IonButton size="small" fill="outline" className="retry-notice__button" onClick={onRetry}>
        Retry
      </IonButton>
    </div>
  );
}
