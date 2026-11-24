import React from 'react';
import {Link} from 'react-router-dom';
import {CalendarDays, MapPin} from 'lucide-react';
import {api, absUrl} from '../lib/api.js';
import {useT} from '../lib/i18n.jsx';
import {Countdown, Empty, Loading, formatDate, useLoad} from '../lib/ui.jsx';

function EventCard({ev, t}) {
  const open = ev.registration_open !== false && ev.event_type === 'upcoming';
  return (
    <Link to={`/events/${ev.id}`} className="event event-link">
      {ev.banner_url ? <img className="banner" src={absUrl(ev.banner_url)} alt={ev.title}/> : <div className="banner placeholder"><CalendarDays/></div>}
      <div className="eventtag">{ev.event_type}</div>
      <h3>{ev.title}</h3>
      <p>{ev.description}</p>
      <small><CalendarDays size={14}/> {ev.starts_at ? formatDate(ev.starts_at) : 'Date to be announced'}</small>
      {ev.location && <small><MapPin size={14}/> {ev.location}</small>}
      {ev.event_type === 'upcoming' && ev.starts_at && <div className="muted">{t('countdown')}: <Countdown to={ev.starts_at}/></div>}
      <div className={open ? 'status open' : 'status closed'}>{open ? t('registrationOpen') : t('registrationClosed')}</div>
    </Link>
  );
}

export default function Events() {
  const {t} = useT();
  const upcoming = useLoad(() => api('/events?event_type=upcoming'));
  const completed = useLoad(() => api('/events?event_type=completed'));
  return (
    <section className="section page">
      <div className="eyebrow">C2C CALENDAR</div>
      <h2>{t('events')} & <span className="gradient">experiences</span></h2>

      <h3 className="subhead">{t('upcoming')}</h3>
      {upcoming.loading ? <Loading text={t('loading')}/> : upcoming.error ? <Empty text={upcoming.error}/> : (
        <div className="cards">
          {(upcoming.data || []).map((ev) => <EventCard key={ev.id} ev={ev} t={t}/>)}
          {(!upcoming.data || upcoming.data.length === 0) && <Empty text="No upcoming events yet."/>}
        </div>
      )}

      <h3 className="subhead">{t('completed')}</h3>
      {completed.loading ? <Loading text={t('loading')}/> : completed.error ? <Empty text={completed.error}/> : (
        <div className="cards">
          {(completed.data || []).map((ev) => <EventCard key={ev.id} ev={ev} t={t}/>)}
          {(!completed.data || completed.data.length === 0) && <Empty text="No completed events yet."/>}
        </div>
      )}
    </section>
  );
}
