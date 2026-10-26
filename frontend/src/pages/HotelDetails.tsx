import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '../services/api';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../features/auth/AuthProvider';
import { Feedback, LoadState } from '../components/ui';
import { HotelImage } from '../features/hotels/HotelImage';
import type { Hotel } from '../features/hotels/types';
import {
  buildRequest,
  defaults,
  egyptToday,
  type JourneyFields,
} from '../features/requests/journeys';
import '../hotels.css';
export function HotelDetails() {
  const { id = '' } = useParams();
  const hotel = useQuery({
    queryKey: ['hotels', id],
    queryFn: async () => (await api.get<Hotel>(`/hotels/${id}`)).data,
  });
  return (
    <section className="section">
      <LoadState
        loading={hotel.isPending}
        error={hotel.error}
        retry={() => void hotel.refetch()}
      >
        {hotel.data && <Stay hotel={hotel.data} key={id} />}
      </LoadState>
    </section>
  );
}
function Stay({ hotel }: { hotel: Hotel }) {
  const { t, money } = useLanguage();
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const key = `eldob-hotel-${hotel.id}`;
  const [initial] = useState<JourneyFields>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (saved && Date.now() - saved.savedAt < 1800000)
        return { ...defaults, ...saved.fields };
    } catch {
      /* optional draft */
    }
    return { ...defaults, passengers: 2, contactPhone: user?.phone || '' };
  });
  const { register, handleSubmit, watch } = useForm<JourneyFields>({
    defaultValues: initial,
  });
  const [error, setError] = useState('');
  const values = watch();
  const submit = useMutation({
    mutationFn: (data: ReturnType<typeof buildRequest> & { hotelId: string }) =>
      api.post<{ id: string }>('/requests', data),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['requests'] });
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* optional draft */
      }
    },
  });
  const send = (v: JourneyFields) => {
    setError('');
    try {
      const payload = {
        ...buildRequest('hotel', {
          ...v,
          city: hotel.city,
          preference: hotel.name,
        }),
        hotelId: hotel.id,
      };
      if (!user) {
        sessionStorage.setItem(
          key,
          JSON.stringify({ fields: v, savedAt: Date.now() }),
        );
        navigate(`/login?next=${encodeURIComponent(`/hotels/${hotel.id}`)}`);
        return;
      }
      submit.mutate(payload);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('Check your details', 'راجع التفاصيل'),
      );
    }
  };
  if (submit.isSuccess)
    return (
      <div className="panel request-success" role="status">
        <h1>{t('We received your stay request.', 'استلمنا طلب إقامتك.')}</h1>
        <p>
          {hotel.name} · {hotel.city}
        </p>
        <p>
          {t(
            'Our team will confirm availability and send your quotation in your account.',
            'فريقنا هيأكد التوافر ويبعت لك عرض السعر في حسابك.',
          )}
        </p>
        <p>
          {t('Reference', 'رقم الطلب')}: {submit.data.data.id}
        </p>
        <Link className="button gold" to="/account">
          {t('Track request', 'تابع طلبك')}
        </Link>
      </div>
    );
  const nights =
    values.date && values.endDate
      ? Math.max(
          0,
          Math.round(
            (Date.parse(values.endDate) - Date.parse(values.date)) / 86400000,
          ),
        )
      : 0;
  return (
    <>
      <Link className="text-link" to="/hotels">
        {t('← All hotels', 'كل الفنادق ←')}
      </Link>
      <div className="hotel-detail-layout">
        <article>
          <HotelImage image={hotel.image} name={hotel.name} />
          <p className="hotel-stars">
            {'★'.repeat(hotel.stars)} · {hotel.city}
          </p>
          <h1>{hotel.name}</h1>
          <p className="hotel-description">{hotel.description}</p>
          <p>
            {hotel.pricePerNight
              ? `${t('From', 'يبدأ من')} ${money(hotel.pricePerNight)} ${t('per room / night', 'للغرفة / الليلة')}`
              : t(
                  'Personal quotation for your dates.',
                  'عرض سعر خاص بمواعيدك.',
                )}
          </p>
          <small>
            {t(
              'Rates and rooms are subject to confirmation. No payment required to send a request.',
              'الأسعار والغرف تخضع للتأكيد. إرسال الطلب بدون دفع.',
            )}
          </small>
        </article>
        <form className="panel hotel-booking" onSubmit={handleSubmit(send)}>
          <p className="eyebrow">
            {t('YOUR STAY, SIMPLIFIED', 'حجزك بخطوة بسيطة')}
          </p>
          <h2>{t('When are you travelling?', 'ناوي تسافر إمتى؟')}</h2>
          <div className="grid two">
            <label>
              {t('Check-in', 'الوصول')}
              <input
                type="date"
                min={egyptToday()}
                required
                {...register('date')}
              />
            </label>
            <label>
              {t('Check-out', 'المغادرة')}
              <input
                type="date"
                min={values.date || egyptToday()}
                required
                {...register('endDate')}
              />
            </label>
            <label>
              {t('Guests including children', 'الضيوف شامل الأطفال')}
              <input
                type="number"
                min={1}
                max={100}
                required
                {...register('passengers')}
              />
            </label>
            <label>
              {t('Rooms', 'الغرف')}
              <input
                type="number"
                min={1}
                max={50}
                required
                {...register('rooms')}
              />
            </label>
          </div>
          <label>
            {t('Contact phone', 'رقم التواصل')}
            <input
              type="tel"
              autoComplete="tel"
              maxLength={40}
              required
              {...register('contactPhone')}
            />
          </label>
          <details>
            <summary>
              {t(
                'Children & special preferences (optional)',
                'أطفال أو تفضيلات خاصة (اختياري)',
              )}
            </summary>
            <label>
              {t('Children under 18', 'أطفال أقل من ١٨ سنة')}
              <input type="number" min={0} max={99} {...register('children')} />
            </label>
            {Number(values.children) > 0 && (
              <label>
                {t('Child ages (e.g. 4, 8)', 'أعمار الأطفال (مثل 4, 8)')}
                <input required maxLength={200} {...register('childAges')} />
              </label>
            )}
            <label>
              {t('Meal preference', 'الوجبات')}
              <select {...register('meal')}>
                <option value="">{t('Flexible', 'مرن')}</option>
                <option>{t('Breakfast', 'إفطار')}</option>
                <option>{t('Half board', 'نصف إقامة')}</option>
                <option>{t('All inclusive', 'شامل')}</option>
              </select>
            </label>
            <label>
              {t('Special requests', 'طلبات خاصة')}
              <textarea rows={3} maxLength={1500} {...register('notes')} />
            </label>
          </details>
          {nights > 0 && (
            <p className="notice">
              {nights} {t('nights', 'ليالي')} · {values.rooms}{' '}
              {t('rooms', 'غرف')} · {values.passengers} {t('guests', 'ضيوف')}
            </p>
          )}
          <Feedback error={submit.error} />
          {error && <p className="notice error" role="alert">{error}</p>}
          <button className="gold" disabled={!ready || submit.isPending}>
            {submit.isPending
              ? t('Sending…', 'جارٍ الإرسال…')
              : user
                ? t('Request this stay', 'اطلب حجز الإقامة')
                : t('Save & sign in to request', 'احفظ طلبك وسجّل الدخول')}
          </button>
          <small>
            {user
              ? t(
                  'We confirm availability and price before booking.',
                  'بنأكد التوافر والسعر معاك قبل الحجز.',
                )
              : t(
                  'Your details will be kept for 30 minutes while you sign in.',
                  'تفاصيلك محفوظة لمدة ٣٠ دقيقة أثناء تسجيل الدخول.',
                )}
          </small>
        </form>
      </div>
    </>
  );
}
