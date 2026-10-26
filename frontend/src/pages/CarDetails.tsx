import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Star } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, imageUrl } from '../services/api';
import type { Car, Review } from '../types';
import { useAuth } from '../features/auth/AuthProvider';
import { useLanguage } from '../hooks/useLanguage';
import { Feedback, LoadState, PageTitle } from '../components/ui';
import { VehicleImage } from '../components/VehicleImage';
const schema = z
  .object({
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    pickupLocation: z.string().min(3).max(300),
    notes: z.string().max(2000),
  })
  .refine((v) => v.endDate > v.startDate, {
    path: ['endDate'],
    message: 'Choose a later return date / اختر تاريخ عودة لاحق',
  });
export function CarDetails() {
  const { id } = useParams();
  const { t, money } = useLanguage();
  const { user } = useAuth();
  const cache = useQueryClient();
  const [photo, setPhoto] = useState<{
    carId: string | undefined;
    url: string;
  }>();
  const car = useQuery({
    queryKey: ['car', id],
    queryFn: async () => (await api.get<Car>(`/cars/${id}`)).data,
  });
  const reviews = useQuery({
    queryKey: ['reviews', id],
    queryFn: async () =>
      (await api.get<Review[]>('/reviews', { params: { carId: id } })).data,
  });
  const [initialDates] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('eldob-daily-search') || 'null');
      if (saved && Date.now() - saved.savedAt < 30 * 60 * 1000)
        return { startDate: saved.startDate as string, endDate: saved.endDate as string };
    } catch {
      // Date selection remains available directly in this form.
    }
    return { startDate: '', endDate: '' };
  });
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { notes: '', ...initialDates },
  });
  const start = watch('startDate'),
    end = watch('endDate');
  const days =
    start && end
      ? Math.max(0, Math.ceil((Date.parse(end) - Date.parse(start)) / 86400000))
      : 0;
  const book = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      api.post('/bookings', { ...values, carId: id }),
    onSuccess: () => {
      try {
        sessionStorage.removeItem('eldob-daily-search');
      } catch {
        // Browser storage is optional.
      }
      void cache.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
  const review = useMutation({
    mutationFn: (values: { rating: number; comment: string }) =>
      api.post('/reviews', { ...values, carId: id }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['reviews', id] });
      void cache.invalidateQueries({ queryKey: ['car', id] });
    },
  });
  const favorite = useMutation({
    mutationFn: () => api.post(`/favorites/${id}`),
    onSuccess: () => cache.invalidateQueries({ queryKey: ['favorites'] }),
  });
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA');
  return (
    <div className="section vehicle-detail-page">
      <Link className="text-link" to="/cars">
        ← {t('Back to our fleet', 'العودة للسيارات')}
      </Link>
      <LoadState
        loading={car.isPending}
        error={car.error}
        retry={() => void car.refetch()}
      >
        {car.data && (
          <>
            <PageTitle
              eyebrow={`${car.data.brand} · ${car.data.year}`}
              title={car.data.name}
              text={t(
                'Your comfort, with a professional at the wheel.',
                'راحتك مع سائق محترف خلف عجلة القيادة.',
              )}
            />
            <div className="detail-grid">
              <div>
                <div className="detail-photo">
                  <VehicleImage
                    src={imageUrl(
                      (photo?.carId === id ? photo?.url : undefined) ||
                        car.data.image,
                    )}
                    alt={car.data.name}
                    loading="eager"
                  />
                </div>
                <div className="thumbnails">
                  {[car.data.image, ...(car.data.images || [])]
                    .filter((v): v is string => !!v)
                    .map((v, i) => (
                      <button
                        key={`${v}-${i}`}
                        onClick={() => setPhoto({ carId: id, url: v })}
                        aria-label={`${t('Photo', 'صورة')} ${i + 1}`}
                      >
                        <img src={imageUrl(v)} alt="" />
                      </button>
                    ))}
                </div>
                <div className="detail-specs">
                  <span>{car.data.model}</span>
                  <span>{car.data.category}</span>
                  {car.data.capacity && (
                    <span>
                      {car.data.capacity} {t('passengers', 'ركاب')}
                    </span>
                  )}
                  <span>
                    <ShieldCheck size={18} />
                    {t('Driver included', 'مع سائق')}
                  </span>
                </div>
                <h2>{t('Designed around your plans', 'حسب خططك')}</h2>
                <p>
                  {t(
                    'Book by the day, or request a tailored quote for airport and intercity travel. Service is exclusively within Egypt. No deposit is required.',
                    'احجز باليوم أو اطلب عرض سعر لتوصيلات المطار والرحلات بين المدن. الخدمة داخل مصر فقط وبدون مقدم.',
                  )}
                </p>
                <Link className="text-link" to="/requests/trip">
                  {t('Request a private trip instead', 'اطلب رحلة خاصة')}
                </Link>
                {user && (
                  <button
                    className="secondary"
                    onClick={() => favorite.mutate()}
                    disabled={favorite.isPending}
                  >
                    {t('Save to favorites', 'أضف للمفضلة')}
                  </button>
                )}
                <Feedback
                  error={favorite.error}
                  success={
                    favorite.isSuccess
                      ? t('Vehicle saved', 'تم الحفظ')
                      : undefined
                  }
                />
              </div>
              <aside className="booking-panel">
                <p className="eyebrow">
                  {t('YOUR DAILY ESCAPE', 'رحلتك اليومية')}
                </p>
                <h2>
                  {money(car.data.pricePerDay)}
                  <small> / {t('day', 'يوم')}</small>
                </h2>
                <p>
                  {t(
                    'Chauffeur included · No deposit required',
                    'مع سائق · بدون مقدم',
                  )}
                </p>
                <form onSubmit={handleSubmit((v) => book.mutate(v))}>
                  <div className="grid two">
                    <label>
                      {t('Start date', 'تاريخ البداية')}
                      <input
                        type="date"
                        min={tomorrow}
                        {...register('startDate')}
                      />
                    </label>
                    <label>
                      {t('End date', 'تاريخ النهاية')}
                      <input
                        type="date"
                        min={start || tomorrow}
                        {...register('endDate')}
                      />
                    </label>
                  </div>
                  <label>
                    {t('Pickup location in Egypt', 'مكان الانطلاق داخل مصر')}
                    <input {...register('pickupLocation')} />
                  </label>
                  <label>
                    {t('Additional notes', 'ملاحظات')}
                    <textarea {...register('notes')} />
                  </label>
                  {Object.values(errors).map((e, i) => (
                    <small role="alert" key={i}>
                      {e.message}
                    </small>
                  ))}
                  {days > 0 && (
                    <p className="quote">
                      {days}{' '}
                      {t('days · Estimated total', 'أيام · الإجمالي المتوقع')}
                      <strong>{money(days * car.data.pricePerDay)}</strong>
                    </p>
                  )}
                  <Feedback
                    error={book.error}
                    success={
                      book.isSuccess
                        ? t(
                            'Request received. Track it in your account.',
                            'تم استلام الطلب. تابعه من حسابك.',
                          )
                        : undefined
                    }
                  />
                  {user ? (
                    <button
                      disabled={
                        book.isPending || !car.data.available || book.isSuccess
                      }
                      type="submit"
                    >
                      {car.data.available
                        ? t('Request this vehicle', 'اطلب هذه السيارة')
                        : t('Currently unavailable', 'غير متاحة حالياً')}
                    </button>
                  ) : (
                    <Link className="button" to="/login">
                      {t('Sign in to request', 'سجل الدخول لإرسال طلب')}
                    </Link>
                  )}
                </form>
              </aside>
            </div>
            <section className="reviews">
              <h2>
                {t('From our travellers', 'آراء المسافرين')}
                {car.data.averageRating != null && (
                  <span className="rating">
                    <Star size={18} />
                    {car.data.averageRating.toFixed(1)} ({car.data.reviewCount})
                  </span>
                )}
              </h2>
              <LoadState
                loading={reviews.isPending}
                error={reviews.error}
                empty={!reviews.data?.length}
              >
                <div className="grid three">
                  {reviews.data?.map((r) => (
                    <article className="panel" key={r.id}>
                      <strong>{r.user.fullName}</strong>
                      <p>{'★'.repeat(r.rating)}</p>
                      <p>{r.comment}</p>
                    </article>
                  ))}
                </div>
              </LoadState>
              {user && (
                <form
                  className="panel"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const data = new FormData(e.currentTarget);
                    review.mutate({
                      rating: Number(data.get('rating')),
                      comment: String(data.get('comment')),
                    });
                  }}
                >
                  <h3>
                    {t(
                      'Share a completed journey',
                      'شارك تجربتك بعد رحلة مكتملة',
                    )}
                  </h3>
                  <label>
                    {t('Rating', 'التقييم')}
                    <select name="rating">
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} / 5
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t('Your review', 'رأيك')}
                    <textarea name="comment" maxLength={2000} />
                  </label>
                  <button disabled={review.isPending}>
                    {t('Submit review', 'إرسال التقييم')}
                  </button>
                  <Feedback
                    error={review.error}
                    success={
                      review.isSuccess
                        ? t('Thank you for your review', 'شكراً لتقييمك')
                        : undefined
                    }
                  />
                </form>
              )}
            </section>
          </>
        )}
      </LoadState>
    </div>
  );
}
