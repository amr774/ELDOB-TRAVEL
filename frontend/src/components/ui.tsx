import type { ReactNode } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { errorMessage } from '../services/api';
export function PageTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
}) {
  return (
    <header className="page-title">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {text && <p>{text}</p>}
    </header>
  );
}
export function Feedback({
  error,
  success,
}: {
  error?: unknown;
  success?: string;
}) {
  return (
    <>
      {!!error && (
        <p className="notice error" role="alert">
          {errorMessage(error)}
        </p>
      )}
      {success && (
        <p className="notice" role="status">
          {success}
        </p>
      )}
    </>
  );
}
export function LoadState({
  loading,
  error,
  empty,
  retry,
  children,
}: {
  loading: boolean;
  error?: unknown;
  empty?: boolean;
  retry?: () => void;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  if (loading)
    return (
      <div role="status" className="empty">
        <span className="spinner" />
        {t('Loading your journey…', 'جارٍ التحميل…')}
      </div>
    );
  if (error)
    return (
      <div className="empty">
        <Feedback error={error} />
        {retry && (
          <button onClick={retry}>{t('Try again', 'حاول مرة أخرى')}</button>
        )}
      </div>
    );
  if (empty)
    return (
      <div className="empty">
        {t(
          'Nothing here yet. Your next journey starts with a request.',
          'لا توجد بيانات بعد. رحلتك القادمة تبدأ بطلب.',
        )}
      </div>
    );
  return <>{children}</>;
}
export function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const labels: Record<string, [string, string]> = {
    PENDING: ['Pending', 'قيد المراجعة'],
    CONFIRMED: ['Confirmed', 'مؤكد'],
    COMPLETED: ['Completed', 'مكتمل'],
    CANCELLED: ['Cancelled', 'ملغي'],
  };
  const label = labels[status];
  return (
    <span className={`badge ${status.toLowerCase()}`}>
      {label ? t(...label) : status}
    </span>
  );
}
