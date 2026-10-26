import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../hooks/useLanguage';
import { api, imageUrl } from '../../services/api';
import type { Car } from '../../types';
import { Feedback } from '../../components/ui';
import { normalizeImageLink } from '../../utils/image-links';
export function VehicleEditor({
  car,
  close,
}: {
  car: Car | null;
  close: () => void;
}) {
  const { t } = useLanguage();
  const cache = useQueryClient();
  const [images, setImages] = useState<string[]>([
    ...new Set(
      [car?.image, ...(car?.images || [])].filter((v): v is string => !!v),
    ),
  ]);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState('');
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const withPendingLink = () => {
    if (!link.trim()) return images;
    const url = normalizeImageLink(link);
    if (!url) {
      setLinkError(
        t(
          'Enter a valid direct HTTPS image link.',
          'أدخل رابط صورة مباشر وصحيح يبدأ بـ HTTPS.',
        ),
      );
      return null;
    }
    if (images.includes(url)) {
      setLinkError(
        t('This image is already in the gallery.', 'الصورة موجودة بالفعل.'),
      );
      return null;
    }
    if (images.length >= 12) {
      setLinkError(t('Use a maximum of 12 photos.', 'الحد الأقصى ١٢ صورة.'));
      return null;
    }
    setLinkError('');
    return [...images, url];
  };
  const save = useMutation({
    mutationFn: (data: unknown) =>
      car ? api.patch(`/cars/${car.id}`, data) : api.post('/cars', data),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['owner'] });
      void cache.invalidateQueries({ queryKey: ['cars'] });
      void cache.invalidateQueries({ queryKey: ['favorites'] });
      if (car) void cache.invalidateQueries({ queryKey: ['car', car.id] });
      close();
    },
  });
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        const gallery = withPendingLink();
        if (!gallery) return;
        const d = new FormData(e.currentTarget);
        save.mutate({
          name: d.get('name'),
          brand: d.get('brand'),
          model: d.get('model'),
          year: Number(d.get('year')),
          pricePerDay: Number(d.get('pricePerDay')),
          category: d.get('category'),
          ...(d.get('capacity') ? { capacity: Number(d.get('capacity')) } : {}),
          available: d.get('available') === 'on',
          image: gallery[0] || '',
          images: gallery.slice(1),
        });
      }}
    >
      <div className="row">
        <h3>
          {car
            ? t('Edit vehicle', 'تعديل السيارة')
            : t('New vehicle', 'سيارة جديدة')}
        </h3>
        <button type="button" className="secondary" onClick={close}>
          {t('Close', 'إغلاق')}
        </button>
      </div>
      <div className="grid three">
        {[
          ['name', t('Vehicle name', 'اسم السيارة'), car?.name],
          ['brand', t('Brand', 'الماركة'), car?.brand],
          ['model', t('Model', 'الموديل'), car?.model],
        ].map(([name, label, value]) => (
          <label key={name}>
            {label}
            <input name={name} defaultValue={value} required />
          </label>
        ))}
        <label>
          {t('Year', 'السنة')}
          <input
            name="year"
            type="number"
            min={1900}
            max={new Date().getFullYear() + 1}
            defaultValue={car?.year}
            required
          />
        </label>
        <label>
          {t('Daily price (EGP)', 'السعر اليومي (جنيه)')}
          <input
            name="pricePerDay"
            type="number"
            min={0}
            defaultValue={car?.pricePerDay}
            required
          />
        </label>
        <label>
          {t('Passengers', 'الركاب')}
          <input
            name="capacity"
            type="number"
            min={1}
            max={60}
            defaultValue={car?.capacity}
          />
        </label>
        <label>
          {t('Category', 'الفئة')}
          <select name="category" defaultValue={car?.category || 'Sedan'}>
            {['Sedan', 'SUV', 'Van', 'Minibus', 'Luxury'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="checkbox">
        <input
          name="available"
          type="checkbox"
          defaultChecked={car?.available ?? true}
        />
        {t('Available for booking', 'متاحة للحجز')}
      </label>
      <label>
        {t('Image link (HTTPS)', 'رابط الصورة (HTTPS)')}
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          dir="ltr"
          value={link}
          placeholder="https://example.com/car.jpg"
          onChange={(e) => {
            setLink(e.target.value);
            setLinkError('');
          }}
          aria-invalid={!!linkError}
          aria-describedby="vehicle-image-help"
        />
      </label>
      <p id="vehicle-image-help">
        {t(
          'Paste a public, direct image link, then add it to the gallery. Up to 12 photos; the first is the main photo. Existing uploaded photos stay available.',
          'الصق رابط الصورة المباشر والمتاح للجميع ثم أضفه للمعرض. حتى ١٢ صورة؛ الأولى هي الرئيسية. الصور المرفوعة سابقاً تظل متاحة.',
        )}
      </p>
      <button
        type="button"
        className="secondary"
        disabled={!link.trim() || save.isPending}
        onClick={() => {
          const gallery = withPendingLink();
          if (gallery) {
            setImages(gallery);
            setLink('');
          }
        }}
      >
        {t('Add image link', 'إضافة رابط الصورة')}
      </button>
      {linkError && (
        <p className="notice error" role="alert">
          {linkError}
        </p>
      )}
      <div className="thumbnails">
        {images.map((url, i) => (
          <div key={`${url}-${i}`}>
            {!failedImages.includes(url) ? (
              <img
                src={imageUrl(url)}
                alt={`${t('Vehicle photo', 'صورة السيارة')} ${i + 1}`}
                referrerPolicy="no-referrer"
                onError={() => setFailedImages((current) => [...current, url])}
              />
            ) : (
              <small role="status">
                {t(
                  'Image could not load. Check the link or host permissions.',
                  'تعذر تحميل الصورة. راجع الرابط أو صلاحيات الموقع.',
                )}
              </small>
            )}
            {i === 0 ? (
              <small>{t('Main photo', 'الصورة الرئيسية')}</small>
            ) : (
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setImages([url, ...images.filter((_, index) => index !== i)])
                }
              >
                {t('Make main photo', 'اجعلها الصورة الرئيسية')}
              </button>
            )}
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setImages(images.filter((_, index) => index !== i))
              }
            >
              {t('Remove', 'إزالة')}
            </button>
          </div>
        ))}
      </div>
      <Feedback error={save.error} />
      <button disabled={save.isPending}>
        {t('Save vehicle', 'حفظ السيارة')}
      </button>
    </form>
  );
}
