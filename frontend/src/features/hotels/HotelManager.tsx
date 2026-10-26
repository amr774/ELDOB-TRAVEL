import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '../../services/api';
import { normalizeImageLink } from '../../utils/image-links';
import { useLanguage } from '../../hooks/useLanguage';
import { Feedback, LoadState } from '../../components/ui';
import { HotelImage } from './HotelImage';
import type { Hotel } from './types';
import '../../hotels.css';
export function HotelManager() {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<Hotel | null | undefined>();
  const query = useQuery({
    queryKey: ['owner', 'hotels'],
    queryFn: async () => (await api.get<Hotel[]>('/hotels/manage')).data,
  });
  return (
    <section id="hotels" className="panel">
      <div className="section-heading">
        <div>
          <h2>{t('Hotels', 'الفنادق')}</h2>
          <p>
            {t(
              'Add your hotels, image links and optional starting rates. Hide a listing to stop new requests.',
              'أضف فنادقك وروابط الصور وسعر البداية اختياريًا. اخفي الفندق لإيقاف الطلبات الجديدة.',
            )}
          </p>
        </div>
        <button onClick={() => setSelected(null)}>
          {t('Add hotel', 'إضافة فندق')}
        </button>
      </div>
      {selected !== undefined && (
        <HotelEditor
          key={selected?.id || 'new'}
          hotel={selected}
          close={() => setSelected(undefined)}
        />
      )}
      <LoadState
        loading={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      >
        <div className="hotel-manager-list">
          {query.data?.map((h) => (
            <div className="list-row" key={h.id}>
              <HotelImage image={h.image} name={h.name} />
              <div>
                <strong>{h.name}</strong>
                <p>
                  {h.city} ·{' '}
                  {h.available
                    ? t('Visible', 'ظاهر للعملاء')
                    : t('Hidden', 'مخفي')}
                </p>
              </div>
              <button onClick={() => setSelected(h)}>
                {t('Edit', 'تعديل')}
              </button>
            </div>
          ))}
          {query.data?.length === 0 && (
            <p>
              {t(
                'Add your first hotel to publish it in the catalogue.',
                'أضف أول فندق عشان يظهر في قائمة الفنادق.',
              )}
            </p>
          )}
        </div>
      </LoadState>
    </section>
  );
}
type Fields = Omit<Hotel, 'id' | 'pricePerNight'> & { pricePerNight: string };
function HotelEditor({
  hotel,
  close,
}: {
  hotel: Hotel | null;
  close: () => void;
}) {
  const { t } = useLanguage();
  const cache = useQueryClient();
  const { register, handleSubmit, watch } = useForm<Fields>({
    defaultValues: hotel
      ? { ...hotel, pricePerNight: hotel.pricePerNight?.toString() || '' }
      : {
          name: '',
          city: '',
          description: '',
          image: '',
          stars: 5,
          available: true,
          pricePerNight: '',
        },
  });
  const save = useMutation({
    mutationFn: (v: Fields) => {
      const image = v.image.trim() ? normalizeImageLink(v.image) : '';
      if (v.image.trim() && !image)
        throw new Error(
          'Use a valid HTTPS image link / استخدم رابط صورة HTTPS صالح',
        );
      const data = {
        ...v,
        name: v.name.trim(),
        city: v.city.trim(),
        stars: Number(v.stars),
        image,
        pricePerNight: v.pricePerNight ? Number(v.pricePerNight) : null,
      };
      return hotel
        ? api.patch(`/hotels/${hotel.id}`, data)
        : api.post('/hotels', data);
    },
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['hotels'] });
      void cache.invalidateQueries({ queryKey: ['owner', 'hotels'] });
      close();
    },
  });
  return (
    <form
      className="panel hotel-editor"
      onSubmit={handleSubmit((v) => save.mutate(v))}
    >
      <h3>
        {hotel ? t('Edit hotel', 'تعديل الفندق') : t('New hotel', 'فندق جديد')}
      </h3>
      <div className="grid two">
        <label>
          {t('Hotel name', 'اسم الفندق')}
          <input required maxLength={150} {...register('name')} />
        </label>
        <label>
          {t('City', 'المدينة')}
          <input required maxLength={100} {...register('city')} />
        </label>
        <label>
          {t('Stars', 'النجوم')}
          <select {...register('stars')}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t(
            'Starting price / room / night (EGP), optional',
            'سعر البداية / غرفة / ليلة بالجنيه، اختياري',
          )}
          <input
            type="number"
            min={1}
            max={1000000}
            step={1}
            {...register('pricePerNight')}
          />
        </label>
      </div>
      <label>
        {t('Photo link (HTTPS)', 'رابط الصورة (HTTPS)')}
        <input
          type="url"
          maxLength={4096}
          placeholder="https://…"
          {...register('image')}
        />
      </label>
      <HotelImage image={watch('image') || ''} name={watch('name') || ''} />
      <label>
        {t('Description & facilities', 'الوصف والمميزات')}
        <textarea rows={4} maxLength={3000} {...register('description')} />
      </label>
      <label className="check-control">
        <input type="checkbox" {...register('available')} />
        {t('Visible to customers', 'ظاهر للعملاء')}
      </label>
      <Feedback error={save.error} />
      <div className="actions">
        <button disabled={save.isPending}>
          {save.isPending
            ? t('Saving…', 'جارٍ الحفظ…')
            : t('Save hotel', 'حفظ الفندق')}
        </button>
        <button type="button" onClick={close}>
          {t('Cancel', 'إلغاء')}
        </button>
      </div>
    </form>
  );
}
