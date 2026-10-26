import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowUpRight, Globe2, Menu, X } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../features/auth/AuthProvider';
import { workspacePath } from '../utils/workspaces';
import '../luxury.css';
export function Layout() {
  const { t, toggle } = useLanguage();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const links = [
    ['/cars', 'Cars', 'سياراتنا'],
    ['/hotels', 'Hotels', 'الفنادق'],
    ['/services', 'Services', 'خدماتنا'],
    ['/about', 'Our story', 'من نحن'],
    ['/contact', 'Contact', 'تواصل معنا'],
  ];
  return (
    <div className="public-site">
      <a className="skip" href="#main">
        {t('Skip to content', 'انتقل للمحتوى')}
      </a>
      <div className="topline">
        {t(
          'EGYPT, AT YOUR PACE. ALWAYS WITH A PROFESSIONAL DRIVER.',
          'مصر على راحتك. دائماً مع سائق محترف.',
        )}
        <span>{t('No deposit required', 'بدون مقدم حجز')}</span>
      </div>
      <header className="navigation">
        <Link to="/" className="brand" aria-label="ELDOB TRAVEL home">
          <BrandLogo />
          <span>
            ELDOB <b>TRAVEL</b>
            <small>شركة الدب للسياحة</small>
          </span>
        </Link>
        <button
          className="icon-button mobile-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={t('Toggle navigation', 'فتح القائمة')}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          className={open ? 'open' : ''}
          aria-label={t('Main navigation', 'القائمة الرئيسية')}
        >
          {links.map(([to, en, ar]) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>
              {t(en, ar)}
            </NavLink>
          ))}
          <button className="language" onClick={toggle}>
            <Globe2 size={16} />
            {t('العربية', 'English')}
          </button>
          <Link
            to={user ? workspacePath(user) : '/login'}
            className="button small"
            onClick={() => setOpen(false)}
          >
            {user
              ? workspacePath(user) === '/account'
                ? t('My account', 'حسابي')
                : t('My workspace', 'مساحة العمل')
              : t('Sign in', 'تسجيل الدخول')}
            <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer>
        <div className="footer-grid">
          <div>
            <Link to="/" className="brand">
              <BrandLogo />
              <span>
                ELDOB <b>TRAVEL</b>
                <small>شركة الدب للسياحة</small>
              </span>
            </Link>
            <p>
              {t(
                'Thoughtfully arranged journeys. Across Egypt, with you.',
                'رحلات مرتبة بعناية. معك في كل أنحاء مصر.',
              )}
            </p>
          </div>
          <div>
            <h3>{t('Explore', 'اكتشف')}</h3>
            {links.map(([to, en, ar]) => (
              <Link key={to} to={to}>
                {t(en, ar)}
              </Link>
            ))}
          </div>
          <div>
            <h3>{t('Your next journey', 'رحلتك القادمة')}</h3>
            <Link to="/requests/airport">
              {t('Airport transfers', 'توصيلات المطار')}
            </Link>
            <Link to="/requests/trip">
              {t('Private transportation', 'رحلة خاصة')}
            </Link>
            <Link to="/hotels">
              {t('Hotel reservations', 'طلبات الفنادق')}
            </Link>
            <Link to="/account">{t('My reservations', 'حجوزاتي')}</Link>
          </div>
          <div>
            <h3>{t('Made for Egypt', 'داخل مصر')}</h3>
            <p>
              {t(
                'Cairo · Alexandria · Hurghada · Sharm El Sheikh · Luxor · Aswan',
                'القاهرة · الإسكندرية · الغردقة · شرم الشيخ · الأقصر · أسوان',
              )}
            </p>
            <p>
              {t('All rentals include a driver.', 'جميع السيارات مع سائق.')}
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} ELDOB TRAVEL
          <span>{t('Your journey. Our care.', 'رحلتك. اهتمامنا.')}</span>
        </div>
      </footer>
    </div>
  );
}
