import React, {createContext, useContext, useEffect, useState} from 'react';
import {Link, NavLink, Outlet, useLocation, useNavigate} from 'react-router-dom';
import {ArrowUp, ArrowUpRight, Github, Instagram, Linkedin, LogIn, Menu, Sparkles, X, Youtube} from 'lucide-react';
import {absUrl, api} from '../lib/api.js';
import {useAuth} from '../lib/auth.jsx';
import {useT} from '../lib/i18n.jsx';
import {useLoad} from '../lib/ui.jsx';

const ContentContext = createContext({content: {}, reload: () => {}});

export function ContentProvider({children}) {
  const {data, reload} = useLoad(() => api('/content'));
  return <ContentContext.Provider value={{content: data || {}, reload}}>{children}</ContentContext.Provider>;
}

export function useContent() {
  return useContext(ContentContext);
}

const SOCIALS = [
  ['social_instagram', 'Instagram', Instagram],
  ['social_linkedin', 'LinkedIn', Linkedin],
  ['social_github', 'GitHub', Github],
  ['social_youtube', 'YouTube', Youtube],
];

export default function Layout() {
  const {t, lang, setLang} = useT();
  const {user, logout} = useAuth();
  const {content} = useContent();
  const navigate = useNavigate();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const updateScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
      setShowTop(window.scrollY > 520);
    };
    updateScroll();
    window.addEventListener('scroll', updateScroll, {passive: true});
    return () => window.removeEventListener('scroll', updateScroll);
  }, []);

  useEffect(() => {
    const reveal = (root = document) => {
      const nodes = root.querySelectorAll?.('.section, .event, .panel, .stat, .ai-strip, footer, .hero-foot span');
      nodes?.forEach((node) => {
        if (node.dataset.revealReady) return;
        node.dataset.revealReady = 'true';
        node.classList.add('reveal');
        observer.observe(node);
      });
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, {threshold: 0.08, rootMargin: '0px 0px -35px 0px'});
    reveal();
    const mutation = new MutationObserver(() => reveal());
    mutation.observe(document.body, {childList: true, subtree: true});
    return () => { mutation.disconnect(); observer.disconnect(); };
  }, [location.pathname]);

  useEffect(() => { setMenu(false); window.scrollTo({top: 0, behavior: 'smooth'}); }, [location.pathname]);

  const links = [
    ['/', t('home')], ['/about', t('about')], ['/events', t('events')], ['/team', t('team')],
    ['/gallery', t('gallery')], ['/calendar', t('calendar')], ['/announcements', t('announcements')],
    ['/recruitment', t('recruitment')], ['/resources', t('resources')], ['/contact', t('contact')],
  ];
  const logo = content.club_logo ? absUrl(`/api/files/${content.club_logo}`) : '/c2c-logo.png';
  const clubName = content.club_name || 'CODE 2 CHILL';

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="app">
      <div className="scroll-progress" style={{width: `${scrollProgress}%`}}/>
      <header className="nav">
        <Link className="brand" to="/" onClick={() => setMenu(false)}>
          <img className="c2c-logo" src={logo} alt="Code 2 Chill Club logo"/>
          <span className="brand-text">{(clubName === 'CODE2CHILL' || clubName === 'CODE 2 CHILL') ? <>CODE <span className="blue">2</span> CHILL<small>CLUB</small></> : clubName}</span>
        </Link>
        <button className="mobile" aria-label="Menu" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
        <nav className={menu ? 'open' : ''} aria-label="Main navigation">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({isActive}) => (isActive ? 'active' : '')} onClick={() => setMenu(false)}>{label}</NavLink>
          ))}
        </nav>
        <div className="navright">
          <select className="lang" value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('language')}>
            <option value="en">EN</option><option value="hi">हिं</option>
          </select>
          {user ? (
            <>
              <button className="outline" onClick={() => navigate('/dashboard')}>{t('dashboard')}</button>
              <button className="ghost small" onClick={handleLogout}>{t('logout')}</button>
            </>
          ) : (
            <button className="outline" onClick={() => navigate('/login', {state: {from: location.pathname}})}><LogIn size={16}/> {t('login')}</button>
          )}
        </div>
      </header>

      <Outlet/>

      <section className="ai-strip">
        <div className="ai-icon"><Sparkles/></div>
        <div><b>{t('aiTitle')}</b><p>{t('aiText')}</p></div>
        <span className="coming">COMING SOON</span>
      </section>

      <footer>
        <div className="brand"><img className="c2c-logo footer-logo" src={logo} alt="Code 2 Chill Club logo"/>
          <span className="brand-text">{clubName}</span></div>
        <p>{content.footer_note || 'Built for curious minds. Powered by community.'}</p>
        <div className="socials">
          {SOCIALS.filter(([key]) => content[key]).map(([key, label, Icon]) => (
            <a key={key} href={content[key]} target="_blank" rel="noreferrer" aria-label={label}><Icon size={18}/> {label}</a>
          ))}
          {!SOCIALS.some(([key]) => content[key]) && <span className="muted">Social links will appear here once the Admin adds them.</span>}
        </div>
        <p className="muted">{content.contact_email || ''} {content.contact_phone ? `· ${content.contact_phone}` : ''}</p>
        <small>© {new Date().getFullYear()} C2C · Chitkara University <ArrowUpRight size={12}/></small>
      </footer>
      <button className={`back-to-top ${showTop ? 'visible' : ''}`} aria-label="Back to top" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}><ArrowUp size={18}/></button>
    </div>
  );
}
