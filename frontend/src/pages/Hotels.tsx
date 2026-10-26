import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, MapPin, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../hooks/useLanguage';
import { LoadState, PageTitle } from '../components/ui';
import { HotelImage } from '../features/hotels/HotelImage';
import type { Hotel } from '../features/hotels/types';
import '../hotels.css';
export function Hotels() {
  const { t, money } = useLanguage();
  const [params, setParams] = useSearchParams();
  const city = params.get('city') || '';
  const hotels = useQuery({
    queryKey: ['hotels'],
    queryFn: async () => (await api.get<Hotel[]>('/hotels')).data,
  });
  const visible = hotels.data?.filter((h) => !city || h.city === city) || [];
  return (
    <section className="section hotel-catalog">
      <PageTitle
        eyebrow={t('STAY A LITTLE LONGER', 'إقامة تستاهل')}
        title={t('Choose your next stay.', 'اختار إقامتك القادمة.')}
        text={t(
          'Choose a hotel, tell us your dates, and we will arrange the details. Availability and final rates are confirmed by our team.',
          'اختار الفندق وحدد مواعيدك وسيب التفاصيل علينا. فريقنا بيأكد التوافر والسعر النهائي.',
        )}
      />
      <div className="hotel-toolbar">
        <label>
          {t('Destination', 'الوجهة')}
          <select value={city} onChange={(e) => setParams(e.target.value ? { city: e.target.value } : {})}>
            <option value="">{t('All cities', 'كل المدن')}</option>
            {city && !hotels.data?.some((h) => h.city === city) && <option value={city}>{city}</option>}
            {[...new Set(hotels.data?.map((h) => h.city))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <span>
          {t(
            '01 Choose · 02 Request · 03 We confirm',
            '١ اختار الفندق · ٢ ابعت طلبك · ٣ نأكد لك',
          )}
        </span>
      </div>
      <LoadState
        loading={hotels.isPending}
        error={hotels.error}
        retry={() => void hotels.refetch()}
      >
        {visible.length ? (
          <div className="hotel-grid">
            {visible.map((h) => (
              <article className="hotel-card" key={h.id}>
                <Link to={`/hotels/${h.id}`} aria-label={h.name}>
                  <HotelImage image={h.image} name={h.name} />
                </Link>
                <div className="hotel-card-body">
                  <span
                    className="hotel-stars"
                    aria-label={`${h.stars} ${t('stars', 'نجوم')}`}
                  >
                    {'★'.repeat(h.stars)}
                  </span>
                  <h2>
                    <Link to={`/hotels/${h.id}`}>{h.name}</Link>
                  </h2>
                  <p>
                    <MapPin size={16} /> {h.city}
                  </p>
                  <p className="hotel-excerpt">{h.description}</p>
                  <strong>
                    {h.pricePerNight
                      ? `${t('From', 'يبدأ من')} ${money(h.pricePerNight)} ${t('/ room / night', '/ غرفة / ليلة')}`
                      : t(
                          'Ask for a personal quotation',
                          'اطلب عرض سعر يناسبك',
                        )}
                  </strong>
                  <Link className="button gold" to={`/hotels/${h.id}`}>
                    {t('View & request a stay', 'التفاصيل وطلب الحجز')}{' '}
                    <ArrowUpRight size={18} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="panel empty">
            <h2>
              {t('Your next stay is being prepared.', 'بنجهز لك إقامات مميزة.')}
            </h2>
            <p>
              {t(
                'No hotels listed here yet. Contact our team for help choosing your stay.',
                'لسه مفيش فنادق معروضة هنا. تواصل مع فريقنا ونساعدك تختار إقامتك.',
              )}
            </p>
            <Link className="button" to="/contact">
              {t('Contact us', 'تواصل معنا')}
            </Link>
          </div>
        )}
      </LoadState>
      <aside className="apartment-feature">
        <Sparkles size={32} />
        <div>
          <p className="eyebrow">
            {t('A HOME AWAY FROM HOME', 'مساحة وخصوصية على راحتك')}
          </p>
          <h2>
            {t(
              'Luxury apartments, a stay of your own.',
              'شقق فاخرة لإقامة بطريقتك.',
            )}
          </h2>
          <p>
            {t(
              'Looking for more space and privacy? Contact us for apartment locations, photos, availability and prices.',
              'بتدور على مساحة أكبر وخصوصية؟ عندنا شقق فاخرة. تواصل معانا لمعرفة الأماكن والصور والتوافر والأسعار.',
            )}
          </p>
        </div>
        <Link to="/contact?stay=apartment" className="button gold">
          {t('Ask about apartments', 'اسأل عن الشقق')}{' '}
          <ArrowUpRight size={18} />
        </Link>
      </aside>
    </section>
  );
}
