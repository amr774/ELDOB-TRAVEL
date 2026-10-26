import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthProvider';
import { useLanguage } from '../hooks/useLanguage';
import { api } from '../services/api';
import type { Booking, Car, ServiceRequest } from '../types';
import { PageTitle, LoadState, Feedback, StatusBadge } from '../components/ui';
import { CarCard } from '../components/CarCard';
export function Account() {
  const { user, logout } = useAuth();
  const { t, money } = useLanguage();
  const cache = useQueryClient();
  const bookings = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => (await api.get<Booking[]>('/bookings/me')).data,
  });
  const requests = useQuery({
    queryKey: ['requests'],
    queryFn: async () => (await api.get<ServiceRequest[]>('/requests/me')).data,
  });
  const favorites = useQuery({
    queryKey: ['favorites'],
    queryFn: async () =>
      (await api.get<{ id: string; car: Car }[]>('/favorites/me')).data,
  });
  const cancel = useMutation({
    mutationFn: (path: string) => api.patch(path),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['bookings'] });
      void cache.invalidateQueries({ queryKey: ['requests'] });
    },
  });
  const profile = useMutation({
    mutationFn: (data: { fullName: string; phone: string }) =>
      api.patch('/users/me', data),
  });
  const signout = useMutation({ mutationFn: logout });
  return (
    <div className="section">
      <div className="section-heading">
        <PageTitle
          eyebrow={t('YOUR TRAVEL SPACE', 'مساحتك للسفر')}
          title={`${t('Welcome,', 'مرحباً،')} ${user?.fullName}`}
          text={t(
            'Your plans, requests and favourite journeys, all in one place.',
            'خططك وطلباتك وسياراتك المفضلة في مكان واحد.',
          )}
        />
        <button
          className="secondary"
          onClick={() => signout.mutate()}
          disabled={signout.isPending}
        >
          {t('Sign out', 'تسجيل الخروج')}
        </button>
      </div>
      <Feedback error={signout.error} />
      <div className="account-links">
        <a href="#rentals">{t('My rentals', 'إيجاراتي')}</a>
        <a href="#requests">{t('My requests', 'طلباتي')}</a>
        <a href="#favorites">{t('Favorites', 'المفضلة')}</a>
        <a href="#profile">{t('Profile', 'الملف الشخصي')}</a>
        {(user?.role === 'OWNER' ||
          (user?.role === 'EMPLOYEE' && user.operationsEnabled)) && (
          <Link to="/operations">{t('Operations', 'العمليات')}</Link>
        )}
        {user?.role === 'OWNER' && (
          <Link to="/owner">{t('Owner dashboard', 'لوحة المالك')}</Link>
        )}
      </div>
      <Feedback error={cancel.error} />
      <section id="rentals" className="account-section">
        <h2>{t('My daily rentals', 'إيجاراتي اليومية')}</h2>
        <LoadState
          loading={bookings.isPending}
          error={bookings.error}
          empty={!bookings.data?.length}
          retry={() => void bookings.refetch()}
        >
          <div className="grid two">
            {bookings.data?.map((b) => (
              <article className="panel" key={b.id}>
                <div className="row">
                  <h3>{b.car.name}</h3>
                  <StatusBadge status={b.status} />
                </div>
                <p>
                  {b.startDate.slice(0, 10)} → {b.endDate.slice(0, 10)}
                </p>
                <p>{b.pickupLocation}</p>
                <p>{b.notes}</p>
                <strong>{money(b.totalPrice)}</strong>
                <small className="reference">
                  {t('Reference', 'المرجع')}: {b.id}
                </small>
                {['PENDING', 'CONFIRMED'].includes(b.status) && (
                  <button
                    className="secondary"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(`/bookings/${b.id}/cancel`)}
                  >
                    {t('Cancel reservation', 'إلغاء الحجز')}
                  </button>
                )}
                {b.status === 'COMPLETED' && (
                  <Link className="text-link" to={`/cars/${b.car.id}`}>
                    {t('Review your journey', 'قيّم رحلتك')}
                  </Link>
                )}
              </article>
            ))}
          </div>
        </LoadState>
      </section>
      <section id="requests" className="account-section">
        <h2>
          {t('Trips, hotels & inquiries', 'الرحلات والفنادق والاستفسارات')}
        </h2>
        <LoadState
          loading={requests.isPending}
          error={requests.error}
          empty={!requests.data?.length}
          retry={() => void requests.refetch()}
        >
          <div className="grid two">
            {requests.data?.map((r) => (
              <article className="panel" key={r.id}>
                <div className="row">
                  <h3>
                    {r.kind === 'HOTEL'
                      ? t('Hotel request', 'طلب فندق')
                      : r.kind === 'TRIP'
                        ? t('Private trip', 'رحلة خاصة')
                        : t('Inquiry', 'استفسار')}
                  </h3>
                  <StatusBadge status={r.status} />
                </div>
                <p>
                  {r.city ||
                    `${r.pickupLocation || ''} → ${r.destination || ''}`}
                </p>
                <p>
                  {r.startDate?.slice(0, 10)}{' '}
                  {r.endDate && `→ ${r.endDate.slice(0, 10)}`}
                </p>
                <p className="request-notes">{r.notes}</p>
                {r.quotedPrice != null && (
                  <p>
                    {t('Company quotation', 'عرض سعر الشركة')}:{' '}
                    <strong>{money(r.quotedPrice)}</strong>
                  </p>
                )}
                {r.reply && (
                  <div className="notice">
                    <strong>{t('Our team’s reply', 'رد فريقنا')}</strong>
                    <p>{r.reply}</p>
                  </div>
                )}
                <small className="reference">{r.id}</small>
                {['PENDING', 'CONFIRMED'].includes(r.status) && (
                  <button
                    className="secondary"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(`/requests/${r.id}/cancel`)}
                  >
                    {t('Cancel request', 'إلغاء الطلب')}
                  </button>
                )}
              </article>
            ))}
          </div>
        </LoadState>
      </section>
      <section id="favorites" className="account-section">
        <h2>{t('Saved for another journey', 'لرحلتك القادمة')}</h2>
        <LoadState
          loading={favorites.isPending}
          error={favorites.error}
          empty={!favorites.data?.length}
        >
          <div className="grid three">
            {favorites.data?.map((f) => (
              <CarCard key={f.id} car={f.car} favorite />
            ))}
          </div>
        </LoadState>
      </section>
      <section id="profile" className="account-section narrow">
        <h2>{t('Your details', 'بياناتك')}</h2>
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            profile.mutate({
              fullName: String(data.get('fullName')),
              phone: String(data.get('phone')),
            });
          }}
        >
          <label>
            {t('Full name', 'الاسم الكامل')}
            <input name="fullName" defaultValue={user?.fullName} required />
          </label>
          <label>
            {t('Phone', 'الهاتف')}
            <input name="phone" defaultValue={user?.phone} />
          </label>
          <button disabled={profile.isPending}>
            {t('Save profile', 'حفظ الملف')}
          </button>
          <Feedback
            error={profile.error}
            success={
              profile.isSuccess
                ? t('Profile updated', 'تم تحديث الملف')
                : undefined
            }
          />
        </form>
      </section>
    </div>
  );
}
