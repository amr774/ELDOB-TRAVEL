import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Globe2, ExternalLink } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../features/auth/AuthProvider';
import { useLanguage } from '../hooks/useLanguage';

export function WorkspaceLayout() {
  const { user } = useAuth();
  const { t, toggle } = useLanguage();
  const location = useLocation();
  useEffect(() => {
    if (location.hash)
      document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [location.pathname, location.hash]);
  return (
    <div className="workspace-shell">
      <a className="skip" href="#workspace-main">
        {t('Skip to content', 'انتقل للمحتوى')}
      </a>
      <aside className="workspace-sidebar">
        <Link to="/" className="workspace-brand">
          <BrandLogo />
          <span>
            ELDOB TRAVEL<small>{t('Company management', 'إدارة الشركة')}</small>
          </span>
        </Link>
        <p className="workspace-role">
          {user?.role === 'OWNER'
            ? t('Owner workspace', 'مساحة المالك')
            : t('Employee workspace', 'مساحة الموظف')}
        </p>
        <nav aria-label={t('Workspace navigation', 'قائمة مساحة العمل')}>
          {user?.role === 'OWNER' && (
            <>
              <NavLink to="/owner" end>
                {t('Business overview', 'نظرة عامة على الأعمال')}
              </NavLink>
              <Link to="/owner#fleet">
                {t('Vehicles & pricing', 'السيارات والأسعار')}
              </Link>
              <Link to="/owner#payments">
                {t('Payments & revenue', 'المدفوعات والإيرادات')}
              </Link>
              <Link to="/owner#users">
                {t('People & permissions', 'الأشخاص والصلاحيات')}
              </Link>
            </>
          )}
          <NavLink to="/operations">
            {t('Daily operations', 'العمليات اليومية')}
          </NavLink>
          <Link to="/operations#op-requests">
            {t('Trips, hotels & inquiries', 'الرحلات والفنادق والاستفسارات')}
          </Link>
          <Link to="/operations#op-bookings">
            {t('Rental bookings', 'حجوزات الإيجار')}
          </Link>
          <Link to="/operations#op-customers">
            {t('Customer contacts', 'جهات اتصال العملاء')}
          </Link>
          <Link to="/account">{t('My account', 'حسابي')}</Link>
        </nav>
        <Link className="workspace-public" to="/">
          {t('Customer website', 'موقع العملاء')}
          <ExternalLink size={15} />
        </Link>
      </aside>
      <div className="workspace-content">
        <header className="workspace-header">
          <span>{user?.fullName}</span>
          <button className="language" onClick={toggle}>
            <Globe2 size={16} />
            {t('العربية', 'English')}
          </button>
        </header>
        <main id="workspace-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
