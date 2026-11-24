import React, {useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {CalendarDays, MapPin, Trophy} from 'lucide-react';
import {api, absUrl} from '../lib/api.js';
import {useAuth} from '../lib/auth.jsx';
import {useT} from '../lib/i18n.jsx';
import {Countdown, Loading, Notice, formatDate, useLoad} from '../lib/ui.jsx';

function Leaderboard({eventId, token}) {
  const board = useLoad(() => api(`/events/${eventId}/leaderboard`, {token}), [eventId, token]);
  if (board.loading || !board.data?.published || board.data.entries.length === 0) return null;
  return (
    <section className="panel">
      <h3><Trophy size={18}/> Leaderboard</h3>
      {board.data.entries.map((e) => <div className="memberrow" key={e.id}><div><b>#{e.rank} {e.label}</b></div><strong>{e.score}</strong></div>)}
    </section>
  );
}

export default function EventDetail() {
  const {id} = useParams();
  const {t} = useT();
  const {token, user} = useAuth();
  const navigate = useNavigate();
  const event = useLoad(() => api(`/events/${id}`, {token}), [id, token]);
  const mine = useLoad(() => (token ? api('/me/registrations', {token}) : Promise.resolve(null)), [token]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ext, setExt] = useState({participant_name: '', participant_email: '', participant_phone: ''});
  const [teamName, setTeamName] = useState('');
  const [teamEmails, setTeamEmails] = useState('');
  const [confirmed, setConfirmed] = useState(null);

  if (event.loading) return <section className="section page"><Loading text={t('loading')}/></section>;
  if (event.error) return <section className="section page"><div className="empty">{event.error}</div><Link to="/events">Back to events</Link></section>;
  const ev = event.data;
  const isMember = user && (user.role === 'admin' || user.status === 'approved');
  const alreadyRegistered = mine.data && [...mine.data.registrations, ...mine.data.team_memberships]
    .some((r) => r.event_id === ev.id && r.status !== 'cancelled');
  const canRegister = ev.registration_state === 'open';

  async function register(payload) {
    setBusy(true); setMsg(''); setError(false);
    try {
      const data = await api(`/events/${ev.id}/register`, {method: 'POST', body: payload, token: token || undefined});
      setConfirmed(data);
      setMsg('Registration successful!');
      mine.reload();
      event.reload();
    } catch (err) {
      setMsg(err.message); setError(true);
    } finally {
      setBusy(false);
    }
  }

  function parseEmails(text) {
    return text.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
  }

  return (
    <section className="section page event-detail">
      {ev.banner_url && <img className="hero-banner" src={absUrl(ev.banner_url)} alt={ev.title}/>}
      <div className="eyebrow">{ev.event_type === 'upcoming' ? 'UPCOMING EVENT' : 'COMPLETED EVENT'}</div>
      <h2>{ev.title}</h2>
      <p className="lead">{ev.description}</p>

      <div className="detail-grid">
        <div className="panel">
          <p><CalendarDays size={16}/> <b>{t('eventDate')}:</b> {ev.starts_at ? formatDate(ev.starts_at) : 'To be announced'}{ev.ends_at ? ` – ${formatDate(ev.ends_at)}` : ''}</p>
          {ev.event_type === 'upcoming' && ev.starts_at && <p><b>{t('countdown')}:</b> <Countdown to={ev.starts_at}/></p>}
          {ev.location && <p><MapPin size={16}/> <b>{t('venue')}:</b> {ev.location}</p>}
          <p><b>{t('regOpens')}:</b> {ev.registration_opens ? formatDate(ev.registration_opens) : 'Open now'}</p>
          <p><b>{t('regCloses')}:</b> {ev.registration_closes ? formatDate(ev.registration_closes) : 'No closing date'}</p>
          <p><b>Registration status:</b> {canRegister ? t('registrationOpen') : t('registrationClosed')}
            {ev.registration_state === 'not_open_yet' && ' (opens soon)'}</p>
          {ev.max_participants && <p><b>Spots left:</b> {ev.spots_left}</p>}
          <p><b>Participation:</b> {[ev.allow_individual && t('individual'), ev.allow_team && `${t('team_')} (${ev.team_min_size}-${ev.team_max_size} members)`, ev.allow_external && 'External participants allowed'].filter(Boolean).join(' · ')}</p>
        </div>

        <div className="panel">
          <h3>{t('registerNow')}</h3>
          {alreadyRegistered && <p className="notice">You are already registered for this event.</p>}
          {!canRegister && <p className="muted">{ev.event_type === 'completed' ? 'This event has ended.' : 'Registration is not open right now.'}</p>}

          {canRegister && !alreadyRegistered && !token && (
            ev.allow_external ? (
              <form className="form" onSubmit={(e) => { e.preventDefault(); register({kind: 'individual', ...ext}); }}>
                <p className="muted">Not a club member? You can register as an external participant.</p>
                <label>{t('name')}<input required value={ext.participant_name} onChange={(e) => setExt({...ext, participant_name: e.target.value})}/></label>
                <label>{t('email')}<input type="email" required value={ext.participant_email} onChange={(e) => setExt({...ext, participant_email: e.target.value})}/></label>
                <label>{t('phone')}<input value={ext.participant_phone} onChange={(e) => setExt({...ext, participant_phone: e.target.value})}/></label>
                <button className="primary" disabled={busy}>{t('submit')}</button>
                <button type="button" className="ghost" onClick={() => navigate('/login', {state: {from: `/events/${ev.id}`}})}>{t('login')} (members)</button>
              </form>
            ) : (
              <button className="primary" onClick={() => navigate('/login', {state: {from: `/events/${ev.id}`}})}>{t('login')} to register</button>
            )
          )}

          {canRegister && !alreadyRegistered && token && !isMember && (
            <p className="notice">Your membership is awaiting approval, so you cannot register yet.</p>
          )}

          {canRegister && !alreadyRegistered && isMember && (
            <div className="form">
              {ev.allow_individual && <button className="primary" disabled={busy} onClick={() => register({kind: 'individual'})}>{t('individual')} {t('registerNow')}</button>}
              {ev.allow_team && (
                <form className="team-form" onSubmit={(e) => { e.preventDefault(); register({kind: 'team', team_name: teamName, member_emails: parseEmails(teamEmails)}); }}>
                  <h4>{t('team_')} registration</h4>
                  <p className="muted">You are the team leader. Add {ev.team_min_size - 1} to {ev.team_max_size - 1} approved C2C members by their college email.</p>
                  <label>Team name<input required value={teamName} onChange={(e) => setTeamName(e.target.value)}/></label>
                  <label>Member emails (separated by commas)<textarea rows="3" value={teamEmails} onChange={(e) => setTeamEmails(e.target.value)}/></label>
                  <button className="outline" disabled={busy}>Register team</button>
                </form>
              )}
            </div>
          )}
          <Notice msg={msg} tone={error ? 'error' : undefined}/>
          {confirmed && (
            <div className="confirm-card">
              <h4>Registration confirmed</h4>
              <p>Registration ID: <b className="code">{confirmed.registration_code}</b></p>
              <p className="muted">Keep this ID. Show it at the venue for check-in.</p>
            </div>
          )}
        </div>
      </div>

      {ev.rules && <section className="panel"><h3>{t('rules')}</h3><p className="pre">{ev.rules}</p></section>}
      {ev.eligibility && <section className="panel"><h3>{t('eligibility')}</h3><p className="pre">{ev.eligibility}</p></section>}
      {ev.prizes && <section className="panel"><h3>{t('prizes')}</h3><p className="pre">{ev.prizes}</p></section>}
      {ev.faqs?.length > 0 && (
        <section className="panel">
          <h3>{t('faqs')}</h3>
          {ev.faqs.map((f, i) => <details key={i} className="faq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </section>
      )}
      <Leaderboard eventId={ev.id} token={token}/>
    </section>
  );
}
