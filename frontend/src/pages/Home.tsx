import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  ShieldCheck,
  CarFront,
  Plane,
  Building2,
  Route,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import { airports, cities, defaults, egyptToday } from '../features/requests/journeys';
import { api } from '../services/api';
import { useLanguage } from '../hooks/useLanguage';
import type { Car, Page } from '../types';
import { CarCard } from '../components/CarCard';
import { LoadState } from '../components/ui';
export function Home() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [mode, setMode] = useState('daily');
  const [airport, setAirport] = useState('');
  const [direction, setDirection] = useState('arrival');
  const [address, setAddress] = useState('');
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [dailyStart, setDailyStart] = useState('');
  const [dailyEnd, setDailyEnd] = useState('');
  const [city, setCity] = useState('');
  const firstRentalDay = new Date(Date.parse(egyptToday()) + 86400000).toISOString().slice(0, 10);
  const plan = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === 'daily') {
      if (dailyEnd <= dailyStart) return;
      try {
        sessionStorage.setItem('eldob-daily-search', JSON.stringify({ startDate: dailyStart, endDate: dailyEnd, savedAt: Date.now() }));
      } catch {
        // Customers can still choose dates in the vehicle form.
      }
      navigate(`/cars${category ? `?category=${encodeURIComponent(category)}` : ''}`);
    } else if (mode === 'hotel') {
      navigate(`/hotels${city ? `?city=${encodeURIComponent(city)}` : ''}`);
    } else {
      const service = mode === 'airport' ? 'airport' : 'trip';
      const fields = {
        ...defaults,
        ...(service === 'airport'
          ? { airport, direction, address }
          : { pickupLocation: pickup, destination, date }),
      };
      try {
        sessionStorage.setItem(
          `eldob-request-${service}`,
          JSON.stringify({ fields, savedAt: Date.now() }),
        );
      } catch {
        // The request form still opens if browser storage is unavailable.
      }
      navigate(`/requests/${service}`);
    }
  };
  const cars = useQuery({
    queryKey: ['cars', 'featured'],
    queryFn: async () =>
      (
        await api.get<Page<Car>>('/cars', {
          params: { available: true, limit: 3 },
        })
      ).data,
  });
  return (
    <>
      <section className="hero">
        <div className="hero-art" aria-hidden="true">
          <img src="/images/egypt-journey.jpg" alt="" fetchPriority="high" />
          <span className="art-caption">
            30.0444° N · 31.2357° E<br />
            CAIRO, EGYPT
          </span>
        </div>
        <div className="hero-copy">
          <p className="eyebrow">
            <span />{' '}
            {t(
              'PRIVATE TRAVEL · EXCEPTIONALLY EGYPT',
              'سفر خاص · تجربة مصرية استثنائية',
            )}
          </p>
          <h1>
            {t('An extraordinary', 'رحلة استثنائية،')}
            <br />
            <em>{t('way to travel.', 'تليق بيك.')}</em>
          </h1>
          <p>
            {t(
              'Premium chauffeur-driven transportation in Egypt. From the first airport welcome to the last unforgettable stop, let us take care of the journey.',
              'تنقلات راقية مع سائق في مصر. من استقبال المطار حتى آخر محطة في رحلتك، دعنا نهتم بكل تفاصيل الطريق.',
            )}
          </p>
          <div className="hero-actions">
            <Link to="/cars" className="button gold">
              {t('Discover our fleet', 'اكتشف سياراتنا')}
              <ArrowUpRight size={18} />
            </Link>
            <Link to="/requests/trip" className="hero-secondary">
              {t('Create your journey', 'صمّم رحلتك')}{' '}
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="hero-note">
            <ShieldCheck size={18} />
            {t(
              'Professional drivers. Personal attention.',
              'سائقون محترفون. اهتمام شخصي.',
            )}
          </div>
        </div>
      </section>
      <section
        className="booking-strip"
        aria-label={t('Plan a journey', 'خطط لرحلتك')}
      >
        <div className="booking-tabs">
          <button
            className={mode === 'airport' ? 'selected' : ''}
            onClick={() => setMode('airport')}
          >
            <Plane size={18} />
            {t('Airport transfer', 'توصيل مطار')}
          </button>
          <button
            className={mode === 'daily' ? 'selected' : ''}
            onClick={() => setMode('daily')}
          >
            <CarFront size={18} />
            {t('Daily rental', 'إيجار يومي')}
          </button>
          <button
            className={mode === 'trip' ? 'selected' : ''}
            onClick={() => setMode('trip')}
          >
            <Route size={18} />
            {t('Private trip', 'رحلة خاصة')}
          </button>
          <button
            className={mode === 'hotel' ? 'selected' : ''}
            onClick={() => setMode('hotel')}
          >
            <Building2 size={18} />
            {t('Hotel stay', 'إقامة فندقية')}
          </button>
        </div>
        <form className="booking-content" onSubmit={plan}>
          <div className="booking-intro">
            <span className="eyebrow">
              {t('YOUR JOURNEY, YOUR WAY', 'رحلتك كما تحب')}
            </span>
            <h3>
              {mode === 'airport'
                ? t(
                    'Your airport. Your flight. Your private transfer.',
                    'مطارك. رحلتك. توصيل خاص لك.',
                  )
                : mode === 'hotel'
                  ? t('A stay arranged around you.', 'إقامة تناسب خططك.')
                  : mode === 'daily'
                    ? t(
                        'A car and driver, for the whole day.',
                        'سيارة وسائق، طوال اليوم.',
                      )
                    : t(
                        'From your doorstep to your destination.',
                        'من بابك إلى وجهتك.',
                      )}
            </h3>
          </div>
          <div className="booking-fields">
            {mode === 'airport' && (
              <>
                <label>{t('Journey', 'اتجاه الرحلة')}
                  <select value={direction} onChange={(e) => setDirection(e.target.value)}>
                    <option value="arrival">{t('Arrival · from airport', 'وصول · من المطار')}</option>
                    <option value="departure">{t('Departure · to airport', 'مغادرة · إلى المطار')}</option>
                  </select>
                </label>
                <label>{t('Egyptian airport', 'المطار')}
                  <select required value={airport} onChange={(e) => setAirport(e.target.value)}>
                    <option value="">{t('Choose airport', 'اختر المطار')}</option>
                    {airports.map(([code, en, ar]) => <option key={code} value={code}>{t(en, ar)} ({code})</option>)}
                  </select>
                </label>
                <label>{t('Your hotel or address', 'الفندق أو العنوان')}
                  <input required maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('Where should we meet?', 'مكان التوصيل أو الاستقبال')} />
                </label>
              </>
            )}
            {mode === 'daily' && (
              <>
              <label>{t('Vehicle style', 'نوع السيارة')}
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">{t('All vehicles with driver', 'كل السيارات بسائق')}</option>
                  {['Sedan', 'SUV', 'Van', 'Minibus', 'Luxury'].map((name) => <option key={name}>{name}</option>)}
                </select>
              </label>
              <label>{t('Start date', 'تاريخ البداية')}
                <input required type="date" min={firstRentalDay} value={dailyStart} onChange={(e) => setDailyStart(e.target.value)} />
              </label>
              <label>{t('End date', 'تاريخ النهاية')}
                <input required type="date" min={dailyStart || firstRentalDay} value={dailyEnd} onChange={(e) => setDailyEnd(e.target.value)} />
              </label>
              </>
            )}
            {mode === 'trip' && (
              <>
                <label>{t('Pickup', 'الانطلاق')}
                  <input required maxLength={300} value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder={t('City and address', 'المدينة والعنوان')} />
                </label>
                <label>{t('Destination', 'الوجهة')}
                  <input required maxLength={300} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={t('City and address', 'المدينة والعنوان')} />
                </label>
                <label>{t('Travel date', 'تاريخ الرحلة')}
                  <input required type="date" min={egyptToday()} value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
              </>
            )}
            {mode === 'hotel' && (
              <label>{t('Destination city', 'مدينة الإقامة')}
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="">{t('All destinations', 'كل الوجهات')}</option>
                  {cities.map(([en, ar]) => <option key={en} value={en}>{t(en, ar)}</option>)}
                </select>
              </label>
            )}
          </div>
          <button type="submit" className="button gold booking-submit">
            {mode === 'daily' ? t('Explore cars', 'استعرض السيارات') : mode === 'hotel' ? t('Explore hotels', 'استعرض الفنادق') : t('Continue planning', 'كمل تفاصيل الرحلة')}
            <ArrowUpRight size={18} />
          </button>
        </form>
      </section>
      <div
        className="destination-ribbon"
        aria-label={t('Destinations in Egypt', 'وجهات داخل مصر')}
      >
        <span>{t('EGYPT, BEAUTIFULLY EXPLORED', 'اكتشف جمال مصر')}</span>
        <p>
          {t('Cairo', 'القاهرة')} <i>✧</i> {t('Alexandria', 'الإسكندرية')}{' '}
          <i>✧</i> {t('Red Sea', 'البحر الأحمر')} <i>✧</i>{' '}
          {t('Luxor & Aswan', 'الأقصر وأسوان')}
        </p>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {t('TRAVEL IN GOOD COMPANY', 'رفقة مريحة على الطريق')}
            </p>
            <h2>{t('Arrive in distinction.', 'وصول بطابع مختلف.')}</h2>
          </div>
          <Link className="text-link" to="/cars">
            {t('Explore all vehicles', 'استعرض كل السيارات')}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <LoadState
          loading={cars.isPending}
          error={cars.error}
          empty={!cars.data?.data.length}
          retry={() => void cars.refetch()}
        >
          <div className="grid three">
            {cars.data?.data.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        </LoadState>
      </section>
      <section className="services-band">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {t('MORE THAN A DESTINATION', 'أكثر من مجرد وجهة')}
            </p>
            <h2>{t('Every journey, considered.', 'اهتمام بكل رحلة.')}</h2>
          </div>
          <p>
            {t(
              'For business, for family, or simply for the joy of discovering Egypt.',
              'للعمل، للعائلة، أو لمتعة اكتشاف مصر.',
            )}
          </p>
        </div>
        <div className="service-grid">
          {[
            [
              CarFront,
              'Daily chauffeur',
              'إيجار يومي مع سائق',
              'A comfortable car. A professional driver. Your schedule.',
              'سيارة مريحة وسائق محترف وفق جدولك.',
              '/cars',
            ],
            [
              Plane,
              'Airport transfers',
              'توصيلات المطار',
              'A smooth arrival or an easy departure.',
              'وصول مريح ومغادرة بلا عناء.',
              '/requests/airport',
            ],
            [
              Route,
              'Private journeys',
              'رحلات خاصة',
              'City to city, with room to enjoy the road.',
              'من مدينة لأخرى مع متعة الطريق.',
              '/requests/trip',
            ],
            [
              Building2,
              'Hotel requests',
              'طلبات الفنادق',
              'Tell us your plans. We’ll help arrange your stay.',
              'شاركنا خططك لنساعدك في ترتيب إقامتك.',
              '/hotels',
            ],
          ].map(([Icon, en, ar, desc, descAr, url]) => {
            const Symbol = Icon as typeof CarFront;
            return (
              <Link
                to={url as string}
                className="service-item"
                key={en as string}
              >
                <Symbol size={29} />
                <h3>{t(en as string, ar as string)}</h3>
                <p>{t(desc as string, descAr as string)}</p>
                <ArrowUpRight size={20} />
              </Link>
            );
          })}
        </div>
      </section>
      <section className="section split signature-section">
        <div>
          <p className="eyebrow">
            {t('WELCOME TO ELDOB TRAVEL', 'أهلاً بك في شركة الدب للسياحة')}
          </p>
          <h2>
            {t('Leave the details.', 'اترك لنا التفاصيل.')}
            <br />
            <em>{t('Keep the memories.', 'واحتفظ بالذكريات.')}</em>
          </h2>
        </div>
        <div>
          <p className="lead">
            {t(
              'We bring transportation and travel arrangements together, so you can spend less time planning and more time being there.',
              'نجمع خدمات التنقل وترتيبات السفر لتقضي وقتاً أقل في التخطيط ووقتاً أكثر في الاستمتاع برحلتك.',
            )}
          </p>
          <ul className="check-list">
            {[
              ['Always with a professional driver', 'دائماً مع سائق محترف'],
              [
                'Company-confirmed pricing, in EGP',
                'أسعار تحددها الشركة بالجنيه المصري',
              ],
              [
                'No mandatory deposit or online payment',
                'بدون مقدم أو دفع إلكتروني إلزامي',
              ],
              [
                'Personal arrangements throughout Egypt',
                'ترتيبات تناسبك في أنحاء مصر',
              ],
            ].map(([en, ar]) => (
              <li key={en}>
                <Check size={18} />
                {t(en, ar)}
              </li>
            ))}
          </ul>
          <Link to="/about" className="text-link">
            {t('Get to know us', 'تعرف علينا')}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="steps section">
        <p className="eyebrow">
          {t(
            'A LITTLE PLANNING. A LOT TO LOOK FORWARD TO.',
            'خطوات بسيطة، ورحلة تستحق الانتظار.',
          )}
        </p>
        <h2>
          {t('Your next journey starts here.', 'رحلتك القادمة تبدأ هنا.')}
        </h2>
        <div className="grid three">
          {[
            [
              '01',
              'Choose your journey',
              'اختر رحلتك',
              'Explore our fleet or tell us where you’d like to go.',
              'استعرض سياراتنا أو أخبرنا بوجهتك.',
            ],
            [
              '02',
              'Send your request',
              'أرسل طلبك',
              'Share your dates, pickup point and preferences.',
              'حدد مواعيدك ومكان الانطلاق وتفضيلاتك.',
            ],
            [
              '03',
              'We’ll take it from here',
              'اترك الباقي لنا',
              'Our team reviews the details and confirms your arrangements.',
              'يراجع فريقنا التفاصيل ويؤكد الترتيبات.',
            ],
          ].map(([num, en, ar, desc, descAr]) => (
            <div key={num}>
              <span className="step-number">{num}</span>
              <h3>{t(en, ar)}</h3>
              <p>{t(desc, descAr)}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="hotel-banner">
        <div>
          <p className="eyebrow">
            {t('STAY A LITTLE LONGER', 'استمتع بإقامة أطول')}
          </p>
          <h2>{t('A journey worth staying for.', 'رحلة تستحق الإقامة.')}</h2>
          <p>
            {t(
              'From a city break to a Red Sea escape, send a hotel request and let our team explore the options with you. Reservations are subject to confirmation.',
              'من عطلة في المدينة إلى استراحة على البحر الأحمر، أرسل طلب الفندق لنبحث الخيارات معك. الحجوزات تخضع للتأكيد.',
            )}
          </p>
          <Link className="button gold" to="/hotels">
            {t('Request a hotel stay', 'اطلب إقامة فندقية')}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <span className="hotel-monogram" aria-hidden="true">
          E<span>THE ART OF STAYING</span>
        </span>
      </section>
      <section className="section contact-callout">
        <h2>
          {t('Something more personal in mind?', 'تبحث عن ترتيبات خاصة؟')}
        </h2>
        <Link to="/contact" className="text-link">
          {t('Let’s plan it together', 'لنخطط لها معاً')}
          <ArrowUpRight />
        </Link>
      </section>
    </>
  );
}
