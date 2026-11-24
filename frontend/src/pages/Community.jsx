import React, {useState} from 'react';
import {Link} from 'react-router-dom';
import {Download, ExternalLink} from 'lucide-react';
import {api, download} from '../lib/api.js';
import {useAuth} from '../lib/auth.jsx';
import {useT} from '../lib/i18n.jsx';
import {Empty, Loading, Notice, formatDate, useLoad} from '../lib/ui.jsx';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function CalendarPage() {
  const {t} = useT();
  const calendar = useLoad(() => api('/calendar'));
  if (calendar.loading) return <section className="section page"><Loading text={t('loading')}/></section>;
  if (calendar.error) return <section className="section page"><Empty text={calendar.error}/></section>;
  const groups = {};
  (calendar.data || []).forEach((item) => {
    const d = new Date(item.date);
    const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    (groups[key] = groups[key] || []).push(item);
  });
  const badge = {event: 'Event', deadline: 'Deadline', announcement: 'Announcement'};
  return (
    <section className="section page">
      <div className="eyebrow">SCHEDULE</div>
      <h2>{t('calendar')}</h2>
      {Object.keys(groups).length === 0 && <Empty text="Nothing scheduled yet."/>}
      {Object.entries(groups).map(([month, items]) => (
        <div key={month}>
          <h3 className="subhead">{month}</h3>
          <div className="cards">
            {items.map((item, i) => (
              <Link to={item.link} className="event event-link" key={i}>
                <div className="eventtag">{badge[item.type]}</div>
                <h3>{item.title}</h3>
                <small>{formatDate(item.date, item.type !== 'announcement')}</small>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function AnnouncementsPage() {
  const {t} = useT();
  const items = useLoad(() => api('/announcements'));
  return (
    <section className="section page">
      <div className="eyebrow">LATEST UPDATES</div>
      <h2>{t('announcements')}</h2>
      {items.loading ? <Loading text={t('loading')}/> : items.error ? <Empty text={items.error}/> : (
        <div className="cards">
          {(items.data || []).map((a) => (
            <article className="event" key={a.id}>
              {a.visibility === 'members' && <div className="eventtag">Members only</div>}
              <h3>{a.title}</h3><p className="pre">{a.body}</p><small>{formatDate(a.created_at, false)}</small>
            </article>
          ))}
          {(!items.data || items.data.length === 0) && <Empty text="No announcements yet."/>}
        </div>
      )}
    </section>
  );
}

export function RecruitmentPage() {
  const {t} = useT();
  const {user} = useAuth();
  const forms = useLoad(() => api('/recruitment'));
  const [openId, setOpenId] = useState(null);
  const [values, setValues] = useState({name: '', email: '', phone: '', message: ''});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);

  async function apply(e, formId) {
    e.preventDefault();
    setMsg(''); setError(false);
    try {
      const data = await api(`/recruitment/${formId}/apply`, {method: 'POST', body: values});
      setMsg(data.message);
      setValues({name: '', email: '', phone: '', message: ''});
    } catch (err) {
      setMsg(err.message); setError(true);
    }
  }

  return (
    <section className="section page">
      <div className="eyebrow">JOIN THE TEAM</div>
      <h2>{t('recruitment')}</h2>
      {forms.loading ? <Loading text={t('loading')}/> : forms.error ? <Empty text={forms.error}/> : (
        <div className="cards">
          {(forms.data || []).map((f) => (
            <article className="panel" key={f.id}>
              <h3>{f.title}</h3>
              <p className="pre">{f.description}</p>
              {f.deadline && <small className="muted">Deadline: {formatDate(f.deadline)}</small>}
              <div className={f.accepting ? 'status open' : 'status closed'}>{f.accepting ? 'Applications open' : 'Applications closed'}</div>
              {f.accepting && openId !== f.id && <button className="primary" onClick={() => { setOpenId(f.id); setMsg(''); setValues({name: user?.name || '', email: user?.email || '', phone: user?.phone || '', message: ''}); }}>Apply</button>}
              {openId === f.id && (
                <form className="form" onSubmit={(e) => apply(e, f.id)}>
                  <label>{t('name')}<input required value={values.name} onChange={(e) => setValues({...values, name: e.target.value})}/></label>
                  <label>{t('email')}<input type="email" required value={values.email} onChange={(e) => setValues({...values, email: e.target.value})}/></label>
                  <label>{t('phone')}<input value={values.phone} onChange={(e) => setValues({...values, phone: e.target.value})}/></label>
                  <label>Why do you want to join?<textarea rows="4" value={values.message} onChange={(e) => setValues({...values, message: e.target.value})}/></label>
                  <button className="primary">{t('submit')}</button>
                </form>
              )}
            </article>
          ))}
          {(!forms.data || forms.data.length === 0) && <Empty text="No recruitment is open right now. Check back soon."/>}
        </div>
      )}
      <Notice msg={msg} tone={error ? 'error' : undefined}/>
    </section>
  );
}

export function ResourcesPage() {
  const {t} = useT();
  const {token} = useAuth();
  const resources = useLoad(() => api('/resources', {token}), [token]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);

  async function saveFile(r) {
    setMsg(''); setError(false);
    try { await download(r.file_url, token, r.title); } catch (err) { setMsg(err.message); setError(true); }
  }

  return (
    <section className="section page">
      <div className="eyebrow">LEARN & BUILD</div>
      <h2>{t('resources')}</h2>
      {!token && <p className="muted">Some resources are for members. <Link to="/login">Log in</Link> to see all of them.</p>}
      {resources.loading ? <Loading text={t('loading')}/> : resources.error ? <Empty text={resources.error}/> : (
        <div className="cards">
          {(resources.data || []).map((r) => (
            <article className="event" key={r.id}>
              <div className="eventtag">{r.category}{r.visibility === 'members' ? ' · members' : ''}</div>
              <h3>{r.title}</h3>
              <p>{r.description}</p>
              {r.kind === 'link' && <a className="textbtn" href={r.url} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open link</a>}
              {r.kind === 'file' && <button className="mini" onClick={() => saveFile(r)}><Download size={14}/> {t('download')}</button>}
            </article>
          ))}
          {(!resources.data || resources.data.length === 0) && <Empty text="Resources will be added here soon."/>}
        </div>
      )}
      <Notice msg={msg} tone={error ? 'error' : undefined}/>
    </section>
  );
}
