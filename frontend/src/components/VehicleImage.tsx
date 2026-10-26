import { useState } from 'react';
import { CarFront } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

export function VehicleImage({
  src,
  alt,
  loading = 'lazy',
}: {
  src?: string;
  alt: string;
  loading?: 'lazy' | 'eager';
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const { t } = useLanguage();
  if (src && failedSrc !== src)
    return (
      <>
        <img
          src={src}
          alt={alt}
          loading={loading}
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
        />
        {src.includes('/uploads/fleet-illustrative-') && (
          <span className="illustration-note">
            {t('Illustrative image', 'صورة توضيحية')}
          </span>
        )}
      </>
    );
  return (
    <div className="image-placeholder">
      <CarFront size={64} />
      <span>
        {src
          ? t(
              'Vehicle photo is temporarily unavailable',
              'صورة السيارة غير متاحة مؤقتاً',
            )
          : t('Vehicle photo coming soon', 'صورة السيارة غير متاحة')}
      </span>
    </div>
  );
}
