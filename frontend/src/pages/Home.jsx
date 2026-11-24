import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight, CalendarDays, Code2, Sparkles, Users} from 'lucide-react';
import {api, absUrl} from '../lib/api.js';
import {useT} from '../lib/i18n.jsx';
import {Countdown, Empty, Loading, formatDate, useLoad} from '../lib/ui.jsx';
import {useContent} from '../components/Layout.jsx';
import ContactForm from '../components/ContactForm.jsx';

function EventCard({ev}) {
  return (
    <Link to={`/events/${ev.id}`} className="event event-link">
      {ev.banner_url && <img className="banner" src={absUrl(ev.banner_url)} alt=""/>}
      <div className="eventtag">{ev.event_type}</div>
      <h3>{ev.title}</h3>
      <p>{ev.description || 'More details coming soon.'}</p>
      <small><CalendarDays size={14}/> {ev.starts_at ? formatDate(ev.starts_at) : 'Date to be announced'}</small>
    </Link>
  );
}

export default function Home() {
  const {t} = useT();
  const {content} = useContent();
  const upcoming = useLoad(() => api('/events?event_type=upcoming'));
  const completed = useLoad(() => api('/events?event_type=completed'));
  const announcements = useLoad(() => api('/announcements'));
  const team = useLoad(() => api('/team'));
  const galleries = useLoad(() => api('/galleries'));
  const highlights = (content.highlights || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const heroHeading = `${content.home_title || 'CODE 2'}${content.home_title_accent || 'CHILL'}`.replace(/\s+/g, '');

  return (
    <>
      <main
        className="hero interactive-hero"
        onPointerMove={(event) => {
          if (event.pointerType === 'touch') return;
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * 100;
          const y = ((event.clientY - rect.top) / rect.height) * 100;
          event.currentTarget.style.setProperty('--pointer-x', `${x}%`);
          event.currentTarget.style.setProperty('--pointer-y', `${y}%`);
          event.currentTarget.style.setProperty('--tilt-x', `${((y - 50) / 50) * -2.2}deg`);
          event.currentTarget.style.setProperty('--tilt-y', `${((x - 50) / 50) * 2.8}deg`);
        }}
        onPointerLeave={(event) => {
          event.currentTarget.style.setProperty('--pointer-x', '72%');
          event.currentTarget.style.setProperty('--pointer-y', '42%');
          event.currentTarget.style.setProperty('--tilt-x', '0deg');
          event.currentTarget.style.setProperty('--tilt-y', '0deg');
        }}
      >
        <div className="hero-brand-row">
          <div className="eyebrow"><span className="pulse"/> CHITKARA UNIVERSITY · STUDENT CLUB</div>
        </div>
        <h1 className="hero-title cursor-gradient" aria-label="CODE2CHILL">{heroHeading}</h1>
        <p className="lead">{content.home_intro || 'A community for curious minds, creative builders and future innovators. Learn together. Build together. Grow together.'}</p>
        <div className="actions">
          <Link className="primary" to="/events">{t('exploreEvents')} <ArrowUpRight size={18}/></Link>
          <Link className="ghost" to="/login">{t('joinClub')}</Link>
          <Link className="ghost" to="/team">{t('meetTeam')}</Link>
          <Link className="ghost" to="/gallery">{t('exploreGallery')}</Link>
          <Link className="ghost" to="/forgot-password">{t('forgotPassword')}</Link>
        </div>
        <div className="hero-foot">
          <span><Code2 size={16}/> Learn by building</span>
          <span><Users size={16}/> Community first</span>
          <span><Sparkles size={16}/> Ideas into impact</span>
        </div>
        <div className="orb orb1"/><div className="orb orb2"/>
      </main>

      <section className="section">
        <div className="section-head">
          <div><div className="eyebrow">ABOUT THE CLUB</div><h2>Who we <span className="gradient">are</span></h2></div>
          <Link className="textbtn" to="/about">{t('about')} <ArrowUpRight size={16}/></Link>
        </div>
        <p className="lead">{content.club_intro || 'Code 2 Chill is a student technology club at Chitkara University. The Admin can update this introduction from the Content section of the portal.'}</p>
        {highlights.length > 0 && <div className="cards">{highlights.map((h, i) => <article className="event" key={i}><h3>{h}</h3></article>)}</div>}
      </section>

      <section className="section">
        <div className="section-head">
          <div><div className="eyebrow">WHAT'S HAPPENING</div><h2>{t('upcoming')}</h2></div>
          <Link className="textbtn" to="/events">{t('events')} <ArrowUpRight size={16}/></Link>
        </div>
        {upcoming.loading ? <Loading text={t('loading')}/> : (
          <div className="cards">
            {(upcoming.data || []).slice(0, 3).map((ev) => <EventCard key={ev.id} ev={ev}/>)}
            {(upcoming.data || []).length === 0 && <Empty text="New events are on the way. Check back soon."/>}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head"><div><div className="eyebrow">PAST EVENTS</div><h2>{t('completed')}</h2></div></div>
        <div className="cards">
          {(completed.data || []).slice(0, 3).map((ev) => <EventCard key={ev.id} ev={ev}/>)}
          {(completed.data || []).length === 0 && <Empty text="Completed events will be featured here."/>}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><div><div className="eyebrow">LATEST</div><h2>Announcements</h2></div>
          <Link className="textbtn" to="/announcements">{t('announcements')} <ArrowUpRight size={16}/></Link></div>
        <div className="cards">
          {(announcements.data || []).slice(0, 3).map((a) => (
            <article className="event" key={a.id}><h3>{a.title}</h3><p>{a.body}</p><small>{formatDate(a.created_at, false)}</small></article>
          ))}
          {(announcements.data || []).length === 0 && <Empty text="No announcements yet."/>}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><div><div className="eyebrow">THE TEAM</div><h2>Team <span className="gradient">preview</span></h2></div>
          <Link className="textbtn" to="/team">{t('meetTeam')} <ArrowUpRight size={16}/></Link></div>
        <div className="cards">
          {(team.data || []).slice(0, 4).map((m) => (
            <article className="event" key={m.id}>
              {m.photo_url && <img className="avatar" src={absUrl(m.photo_url)} alt={m.name}/>}
              <h3>{m.name}</h3><small>{m.designation}</small>
            </article>
          ))}
          {(team.data || []).length === 0 && <Empty text="Team profiles will appear here once the Admin adds them."/>}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><div><div className="eyebrow">MEMORIES</div><h2>Gallery <span className="gradient">preview</span></h2></div>
          <Link className="textbtn" to="/gallery">{t('exploreGallery')} <ArrowUpRight size={16}/></Link></div>
        <div className="cards">
          {(galleries.data || []).slice(0, 3).map((g) => (
            <Link to={`/gallery/${g.id}`} className="event event-link" key={g.id}>
              {g.cover_url && <img className="banner" src={absUrl(g.cover_url)} alt={g.title}/>}
              <h3>{g.title}</h3><small>{g.image_count} photos</small>
            </Link>
          ))}
          {(galleries.data || []).length === 0 && <Empty text="Event photos will be added soon."/>}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><div><div className="eyebrow">GET IN TOUCH</div><h2>Contact <span className="gradient">us</span></h2></div></div>
        <div className="contact-grid">
          <ContactForm/>
          <div className="panel">
            <h3>Club contact</h3>
            <p>{content.contact_email || 'Email: to be added by the Admin'}</p>
            <p>{content.contact_phone || 'Phone: to be added by the Admin'}</p>
            <p>{content.contact_address || 'Address: to be added by the Admin'}</p>
          </div>
        </div>
      </section>
    </>
  );
}
