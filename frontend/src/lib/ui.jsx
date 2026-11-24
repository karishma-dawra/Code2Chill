import React, {useEffect, useState} from 'react';

/** Loads data with loading and error state. `reload()` refetches. */
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({data: null, loading: true, error: ''});
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({...s, loading: true, error: ''}));
    fn()
      .then((data) => live && setState({data, loading: false, error: ''}))
      .catch((err) => live && setState({data: null, loading: false, error: err.message}));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return {...state, reload: () => setTick((t) => t + 1)};
}

export function Loading({text = 'Loading...'}) {
  return <div className="empty">{text}</div>;
}

export function Empty({text}) {
  return <div className="empty">{text}</div>;
}

export function Notice({msg, tone}) {
  if (!msg) return null;
  return <p className="notice" style={tone === 'error' ? {color: '#ff8c8c'} : undefined}>{msg}</p>;
}

export function formatDate(value, withTime = true) {
  if (!value) return '';
  const date = new Date(value);
  return withTime ? date.toLocaleString() : date.toLocaleDateString();
}

export function Countdown({to}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!to) return null;
  const diff = new Date(to).getTime() - now;
  if (diff <= 0) return <span>Started</span>;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return (
    <span className="countdown">
      {days}d {String(hours).padStart(2, '0')}h {String(minutes).padStart(2, '0')}m {String(seconds).padStart(2, '0')}s
    </span>
  );
}

export function Pager({page, pageSize, total, onChange}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="pager">
      <button className="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span className="muted">Page {page} of {pages} ({total} total)</span>
      <button className="outline" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}

export const blankEvent = {
  title: '', slug: '', description: '', event_type: 'upcoming', is_published: true,
  starts_at: '', ends_at: '', location: '', registration_opens: '', registration_closes: '',
  max_participants: '', allow_external: false, allow_individual: true, allow_team: true,
  team_min_size: 2, team_max_size: 4, eligibility: '', rules: '', prizes: '', faqs: [],
};

const DATE_FIELDS = ['starts_at', 'ends_at', 'registration_opens', 'registration_closes'];

/** Converts an event from the API into form state (dates as datetime-local strings). */
export function toForm(ev) {
  const form = {...blankEvent, ...ev};
  DATE_FIELDS.forEach((key) => { form[key] = ev[key] ? ev[key].slice(0, 16) : ''; });
  ['description', 'location', 'eligibility', 'rules', 'prizes'].forEach((key) => { form[key] = ev[key] || ''; });
  form.max_participants = ev.max_participants ?? '';
  form.faqs = (ev.faqs || []).map((f) => ({q: f.q, a: f.a}));
  return form;
}

/** Converts form state into the payload the API expects. */
export function cleanEvent(form) {
  const out = {...form};
  DATE_FIELDS.forEach((key) => { out[key] = out[key] || null; });
  out.location = (out.location || '').trim() || null;
  out.max_participants = out.max_participants === '' || out.max_participants == null ? null : Number(out.max_participants);
  out.team_min_size = Number(out.team_min_size);
  out.team_max_size = Number(out.team_max_size);
  out.faqs = (out.faqs || []).filter((f) => f.q.trim() && f.a.trim()).map((f) => ({q: f.q.trim(), a: f.a.trim()}));
  return out;
}

/** Event form fields used by both the admin create/edit forms and the volunteer editor. */
export function EventFields({form, setForm, editing, canPublish = true}) {
  const set = (key, value) => setForm({...form, [key]: value});
  const faqs = form.faqs || [];
  return (
    <>
      <label>Event title<input required value={form.title} onChange={(e) => {
        const title = e.target.value;
        setForm({...form, title, ...(editing ? {} : {slug: title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')})});
      }}/></label>
      <label>Description<textarea rows="3" value={form.description} onChange={(e) => set('description', e.target.value)}/></label>
      <div className="row2">
        <label>Event status<select value={form.event_type} onChange={(e) => set('event_type', e.target.value)}>
          <option value="upcoming">Upcoming</option><option value="completed">Completed</option>
        </select></label>
        {canPublish && <label>Visibility<select value={form.is_published ? 'yes' : 'no'} onChange={(e) => set('is_published', e.target.value === 'yes')}>
          <option value="yes">Published</option><option value="no">Unpublished (draft)</option>
        </select></label>}
      </div>
      <div className="row2">
        <label>Starts (optional)<input type="datetime-local" placeholder="2026-12-25T14:30" value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)}/></label>
        <label>Ends (optional)<input type="datetime-local" placeholder="2026-12-25T16:30" value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)}/></label>
      </div>
      <label>Venue (optional)<input value={form.location} onChange={(e) => set('location', e.target.value)}/></label>
      {canPublish && <>
        <div className="row2">
          <label>Registration opens (optional)<input type="datetime-local" placeholder="2026-11-20T10:00" value={form.registration_opens} onChange={(e) => set('registration_opens', e.target.value)}/></label>
          <label>Registration closes (optional)<input type="datetime-local" placeholder="2026-11-24T10:00" value={form.registration_closes} onChange={(e) => set('registration_closes', e.target.value)}/></label>
        </div>
        <div className="row2">
          <label>Maximum participants (optional)<input type="number" min="1" value={form.max_participants} onChange={(e) => set('max_participants', e.target.value)}/></label>
          <div />
        </div>
        <div className="row2">
          <label>Minimum team size<input type="number" min="1" max="20" value={form.team_min_size} onChange={(e) => set('team_min_size', e.target.value)}/></label>
          <label>Maximum team size<input type="number" min="1" max="20" value={form.team_max_size} onChange={(e) => set('team_max_size', e.target.value)}/></label>
        </div>
        <div className="check-group">
          <label className="check"><input type="checkbox" checked={form.allow_individual} onChange={(e) => set('allow_individual', e.target.checked)}/> Individual registration</label>
          <label className="check"><input type="checkbox" checked={form.allow_team} onChange={(e) => set('allow_team', e.target.checked)}/> Team registration</label>
          <label className="check"><input type="checkbox" checked={form.allow_external} onChange={(e) => set('allow_external', e.target.checked)}/> Allow external participants</label>
        </div>
      </>}
      <label>Eligibility (optional)<textarea rows="2" value={form.eligibility} onChange={(e) => set('eligibility', e.target.value)}/></label>
      <label>Rules and guidelines (optional)<textarea rows="3" value={form.rules} onChange={(e) => set('rules', e.target.value)}/></label>
      <label>Prize details (optional)<textarea rows="2" value={form.prizes} onChange={(e) => set('prizes', e.target.value)}/></label>
      <div className="faq-editor">
        <strong>FAQs</strong>
        {faqs.map((faq, index) => (
          <div className="faq-row" key={index}>
            <input placeholder="Question" value={faq.q} onChange={(e) => set('faqs', faqs.map((f, i) => i === index ? {...f, q: e.target.value} : f))}/>
            <input placeholder="Answer" value={faq.a} onChange={(e) => set('faqs', faqs.map((f, i) => i === index ? {...f, a: e.target.value} : f))}/>
            <button type="button" className="mini" onClick={() => set('faqs', faqs.filter((_, i) => i !== index))}>Remove</button>
          </div>
        ))}
        <button type="button" className="outline" onClick={() => set('faqs', [...faqs, {q: '', a: ''}])}>Add FAQ</button>
      </div>
    </>
  );
}
