import React, {useState} from 'react';
import {api, download, formData} from '../../lib/api.js';
import {Countdown, Empty, EventFields, Loading, Notice, blankEvent, cleanEvent, formatDate, toForm, useLoad} from '../../lib/ui.jsx';

const SUB_TABS = [
  ['details', 'Details'], ['volunteers', 'Volunteers & tasks'], ['registrations', 'Registrations'],
  ['attendance', 'Attendance'], ['leaderboard', 'Leaderboard'], ['certificates', 'Certificates & feedback'], ['banner', 'Banner'],
];

function CreateEvent({token, onCreated}) {
  const [form, setForm] = useState(blankEvent);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setMsg(''); setError(false);
    try {
      await api('/admin/events', {method: 'POST', token, body: cleanEvent(form)});
      setMsg('Event created.');
      setForm(blankEvent);
      onCreated();
    } catch (err) { setMsg(err.message); setError(true); }
  }
  return (
    <form className="panel form" onSubmit={submit}>
      <h3>Create event</h3>
      <EventFields form={form} setForm={setForm}/>
      <button className="primary full">Publish event</button>
      <Notice msg={msg} tone={error ? 'error' : undefined}/>
    </form>
  );
}

function DetailsEditor({event, token, onSaved}) {
  const [form, setForm] = useState(() => toForm(event));
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  async function save(e) {
    e.preventDefault();
    setMsg(''); setError(false);
    const {slug, ...body} = cleanEvent(form);
    try {
      await api(`/events/${event.id}`, {method: 'PATCH', token, body});
      setMsg('Saved.');
      onSaved();
    } catch (err) { setMsg(err.message); setError(true); }
  }
  return (
    <form className="form" onSubmit={save}>
      <EventFields form={form} setForm={setForm} editing/>
      <button className="primary">Save changes</button>
      <Notice msg={msg} tone={error ? 'error' : undefined}/>
    </form>
  );
}

function VolunteersAndTasks({event, token}) {
  const volunteers = useLoad(() => api(`/admin/events/${event.id}/volunteers`, {token}), [event.id]);
  const tasks = useLoad(() => api(`/admin/events/${event.id}/tasks`, {token}), [event.id]);
  const members = useLoad(() => api('/admin/members?status=approved&page_size=100', {token}), [token]);
  const [pick, setPick] = useState('');
  const [taskUser, setTaskUser] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);

  async function run(fn, ok) {
    setMsg(''); setError(false);
    try { await fn(); setMsg(ok); } catch (err) { setMsg(err.message); setError(true); }
  }

  const assignedIds = new Set((volunteers.data || []).map((v) => v.id));
  const candidates = (members.data?.items || []).filter((m) => m.role !== 'admin' && !assignedIds.has(m.id));

  return (
    <div className="stack">
      <h4>Volunteers for this event</h4>
      {volunteers.loading ? <Loading/> : (volunteers.data || []).length === 0 ? <p className="muted">No volunteers assigned yet.</p> : (
        (volunteers.data || []).map((v) => (
          <div className="memberrow" key={v.id}>
            <div><b>{v.name}</b><small>{v.email}</small></div>
            <button className="mini danger" onClick={() => window.confirm(`Remove ${v.name} as volunteer? Their tasks here will be removed too.`) && run(async () => {
              await api(`/admin/events/${event.id}/volunteers/${v.id}`, {method: 'DELETE', token});
              volunteers.reload(); tasks.reload();
            }, 'Volunteer removed.')}>Remove</button>
          </div>
        ))
      )}
      <div className="row-actions">
        <select value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Select an approved member</option>
          {candidates.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
        </select>
        <button className="outline" disabled={!pick} onClick={() => run(async () => {
          await api(`/admin/events/${event.id}/volunteers`, {method: 'POST', token, body: {user_id: Number(pick)}});
          setPick(''); volunteers.reload();
        }, 'Volunteer added.')}>Add volunteer</button>
      </div>

      <h4>Responsibilities</h4>
      {(tasks.data || []).length === 0 ? <p className="muted">No responsibilities assigned.</p> : (tasks.data || []).map((t) => (
        <div className="memberrow" key={t.id}>
          <div><b>{t.title}</b><small>{t.user_name} · {t.status}</small></div>
          <button className="mini danger" onClick={() => run(async () => {
            await api(`/admin/tasks/${t.id}`, {method: 'DELETE', token}); tasks.reload();
          }, 'Responsibility removed.')}>Remove</button>
        </div>
      ))}
      <div className="row-actions">
        <select value={taskUser} onChange={(e) => setTaskUser(e.target.value)}>
          <option value="">Select a volunteer</option>
          {(volunteers.data || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <input placeholder="Responsibility, e.g. Check-in desk" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)}/>
        <button className="outline" disabled={!taskUser || taskTitle.trim().length < 2} onClick={() => run(async () => {
          await api(`/admin/events/${event.id}/tasks`, {method: 'POST', token, body: {user_id: Number(taskUser), title: taskTitle.trim()}});
          setTaskTitle(''); tasks.reload();
        }, 'Responsibility added.')}>Add responsibility</button>
      </div>
      <Notice msg={msg} tone={error ? 'error' : undefined}/>
    </div>
  );
}

function Registrations({event, token}) {
  const regs = useLoad(() => api(`/admin/events/${event.id}/registrations`, {token}), [event.id]);
  const [msg, setMsg] = useState('');
  async function setStatus(reg, status) {
    setMsg('');
    try {
      await api(`/admin/registrations/${reg.id}`, {method: 'PATCH', token, body: {status}});
      regs.reload();
    } catch (err) { setMsg(err.message); }
  }
  if (regs.loading) return <Loading/>;
  const list = regs.data || [];
  return (
    <div className="stack">
      <div className="row-actions">
        <span className="muted">{list.length} registrations</span>
        <button className="outline" onClick={() => download(`/api/admin/events/${event.id}/registrations.csv`, token, `registrations-${event.slug}.csv`).catch((e) => setMsg(e.message))}>Export CSV</button>
      </div>
      <Notice msg={msg} tone="error"/>
      {list.length === 0 ? <Empty text="No registrations yet."/> : (
        <table className="data-table">
          <thead><tr><th>Code</th><th>Participant</th><th>Type</th><th>Team</th><th>Status</th><th>Check-in</th></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td><code>{r.registration_code}</code></td>
                <td>{r.participant_name}<br/><small className="muted">{r.participant_email}</small></td>
                <td>{r.kind}</td>
                <td>{r.team ? <>{r.team.name}<br/><small className="muted">{r.team.members.map((m) => m.name).join(', ')}</small></> : '—'}</td>
                <td>
                  <select value={r.status} onChange={(e) => setStatus(r, e.target.value)}>
                    <option value="registered">Registered</option><option value="verified">Verified</option><option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td>{r.checked_in ? `Yes · ${formatDate(r.checked_in_at)}` : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Attendance({event, token}) {
  const regs = useLoad(() => api(`/admin/events/${event.id}/registrations`, {token}), [event.id]);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  async function scan(e) {
    e.preventDefault();
    setMsg(''); setError(false);
    try {
      const data = await api(`/events/${event.id}/attendance/scan`, {method: 'POST', token, body: {code: code.trim()}});
      setMsg(`${data.participant_name} checked in.`);
      setCode('');
      regs.reload();
    } catch (err) { setMsg(err.message); setError(true); }
  }
  const list = regs.data || [];
  const checked = list.filter((r) => r.checked_in).length;
  return (
    <div className="stack">
      <p><b>{checked}</b> of {list.filter((r) => r.status !== 'cancelled').length} checked in</p>
      <form className="row-actions" onSubmit={scan}>
        <input placeholder="Registration code (C2C-XXXXXXXX)" value={code} onChange={(e) => setCode(e.target.value)} required minLength="4"/>
        <button className="primary">Check in</button>
      </form>
      <Notice msg={msg} tone={error ? 'error' : undefined}/>
      {list.length > 0 && (
        <table className="data-table">
          <thead><tr><th>Code</th><th>Participant</th><th>Status</th></tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.id}><td><code>{r.registration_code}</code></td><td>{r.participant_name}</td>
              <td>{r.checked_in ? <span className="badge approved">Checked in {formatDate(r.checked_in_at)}</span> : <span className="badge pending">Not yet</span>}</td></tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

function Leaderboard({event, token}) {
  const board = useLoad(() => api(`/events/${event.id}/leaderboard`, {token}), [event.id]);
  const [label, setLabel] = useState('');
  const [score, setScore] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  async function run(fn, ok) {
    setMsg(''); setError(false);
    try { await fn(); setMsg(ok); board.reload(); } catch (err) { setMsg(err.message); setError(true); }
  }
  const entries = board.data?.entries || [];
  return (
    <div className="stack">
      <div className="row-actions">
        <label className="check"><input type="checkbox" checked={!!board.data?.published} onChange={(e) => run(() => api(`/admin/events/${event.id}/leaderboard/publish`, {method: 'PATCH', token, body: {published: e.target.checked}}), e.target.checked ? 'Leaderboard published.' : 'Leaderboard hidden.')}/> Publish leaderboard</label>
      </div>
      <form className="row-actions" onSubmit={(e) => { e.preventDefault(); run(async () => {
        await api(`/admin/events/${event.id}/leaderboard`, {method: 'POST', token, body: {label: label.trim(), score: Number(score)}});
        setLabel(''); setScore('');
      }, 'Entry added.'); }}>
        <input placeholder="Participant or team name" required value={label} onChange={(e) => setLabel(e.target.value)}/>
        <input type="number" step="any" placeholder="Score" required value={score} onChange={(e) => setScore(e.target.value)}/>
        <button className="outline">Add entry</button>
      </form>
      <Notice msg={msg} tone={error ? 'error' : undefined}/>
      {entries.length === 0 ? <p className="muted">No entries yet.</p> : entries.map((e) => (
        <div className="memberrow" key={e.id}>
          <div><b>#{e.rank} {e.label}</b></div>
          <div className="row-actions">
            <input type="number" step="any" defaultValue={e.score} id={`score-${e.id}`} style={{width: 100}}/>
            <button className="mini" onClick={() => run(() => api(`/admin/leaderboard/${e.id}`, {method: 'PATCH', token, body: {score: Number(document.getElementById(`score-${e.id}`).value)}}), 'Score updated.')}>Save score</button>
            <button className="mini danger" onClick={() => window.confirm('Remove this entry?') && run(() => api(`/admin/leaderboard/${e.id}`, {method: 'DELETE', token}), 'Entry removed.')}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CertificatesAndFeedback({event, token}) {
  const feedback = useLoad(() => api(`/admin/events/${event.id}/feedback`, {token}), [event.id]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  async function issue() {
    setMsg(''); setError(false);
    if (!window.confirm('Issue certificates to every checked-in participant who has a C2C account?')) return;
    try {
      const data = await api(`/admin/events/${event.id}/certificates/issue`, {method: 'POST', token});
      setMsg(`Issued ${data.issued} certificate(s). Already issued: ${data.already_issued}.`);
    } catch (err) { setMsg(err.message); setError(true); }
  }
  return (
    <div className="stack">
      <button className="primary" onClick={issue}>Issue certificates to attendees</button>
      <Notice msg={msg} tone={error ? 'error' : undefined}/>
      <h4>Feedback {feedback.data?.average_rating ? `(average ${feedback.data.average_rating} / 5)` : ''}</h4>
      {(feedback.data?.items || []).length === 0 ? <p className="muted">No feedback yet.</p> : feedback.data.items.map((f) => (
        <div className="memberrow" key={f.id}>
          <div><b>{f.rating}/5 · {f.user_name}</b><small>{f.message}</small>{f.suggestions && <small>Suggestion: {f.suggestions}</small>}</div>
          <button className="mini danger" onClick={() => window.confirm('Delete this feedback?') && api(`/admin/feedback/${f.id}`, {method: 'DELETE', token}).then(feedback.reload)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

function Banner({event, token, onSaved}) {
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  const [file, setFile] = useState(null);
  async function upload(e) {
    e.preventDefault();
    setMsg(''); setError(false);
    try {
      await api(`/admin/events/${event.id}/banner`, {method: 'POST', token, form: formData({}, {file})});
      setMsg('Banner uploaded.'); setFile(null);
      onSaved();
    } catch (err) { setMsg(err.message); setError(true); }
  }
  return (
    <form className="form" onSubmit={upload}>
      {event.banner_url && <img className="banner" src={`http://127.0.0.1:8000${event.banner_url}`} alt="Current banner"/>}
      <label>Event banner (PNG, JPG or WEBP, max 10 MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files[0])} required/></label>
      <button className="outline" disabled={!file}>Upload banner</button>
      <Notice msg={msg} tone={error ? 'error' : undefined}/>
    </form>
  );
}

function ManageEvent({event, token, onChanged}) {
  const [sub, setSub] = useState('details');
  return (
    <section className="panel manage-panel">
      <div className="section-head">
        <div><h3>Manage: {event.title}</h3><small className="muted">{event.event_type} · {event.is_published ? 'published' : 'draft'}</small></div>
        {event.starts_at && event.event_type === 'upcoming' && <div>Starts in <Countdown to={event.starts_at}/></div>}
      </div>
      <nav className="admin-tabs small-tabs">
        {SUB_TABS.map(([key, label]) => <button key={key} className={sub === key ? 'selected' : ''} onClick={() => setSub(key)}>{label}</button>)}
      </nav>
      {sub === 'details' && <DetailsEditor event={event} token={token} onSaved={onChanged}/>}
      {sub === 'volunteers' && <VolunteersAndTasks event={event} token={token}/>}
      {sub === 'registrations' && <Registrations event={event} token={token}/>}
      {sub === 'attendance' && <Attendance event={event} token={token}/>}
      {sub === 'leaderboard' && <Leaderboard event={event} token={token}/>}
      {sub === 'certificates' && <CertificatesAndFeedback event={event} token={token}/>}
      {sub === 'banner' && <Banner event={event} token={token} onSaved={onChanged}/>}
    </section>
  );
}

export default function EventsTab({token}) {
  const events = useLoad(() => api('/admin/events', {token}), [token]);
  const [selectedId, setSelectedId] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  const list = events.data || [];
  const selected = list.find((e) => e.id === selectedId) || null;

  async function togglePublish(ev) {
    setMsg(''); setError(false);
    try {
      await api(`/admin/events/${ev.id}/publish`, {method: 'PATCH', token, body: {published: !ev.is_published}});
      events.reload();
    } catch (err) { setMsg(err.message); setError(true); }
  }

  async function remove(ev) {
    if (!window.confirm(`Delete "${ev.title}"? Registrations, volunteers and certificates for this event will be removed.`)) return;
    setMsg(''); setError(false);
    try {
      await api(`/admin/events/${ev.id}`, {method: 'DELETE', token});
      if (selectedId === ev.id) setSelectedId(null);
      events.reload();
    } catch (err) { setMsg(err.message); setError(true); }
  }

  return (
    <div className="stack">
      <CreateEvent token={token} onCreated={events.reload}/>
      <section className="panel wide">
        <h3>All events</h3>
        <Notice msg={msg} tone={error ? 'error' : undefined}/>
        {events.loading ? <Loading/> : list.length === 0 ? <Empty text="No events yet. Create the first one above."/> : (
          <table className="data-table">
            <thead><tr><th>Event</th><th>Type</th><th>Visibility</th><th>Date</th><th>Registered</th><th>Volunteers</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map((ev) => (
                <tr key={ev.id}>
                  <td>{ev.title}</td>
                  <td>{ev.event_type}</td>
                  <td><span className={`badge ${ev.is_published ? 'approved' : 'pending'}`}>{ev.is_published ? 'Published' : 'Draft'}</span></td>
                  <td>{ev.starts_at ? formatDate(ev.starts_at, false) : '—'}</td>
                  <td>{ev.seats_taken}{ev.max_participants ? ` / ${ev.max_participants}` : ''}</td>
                  <td>{ev.volunteer_count}</td>
                  <td className="row-actions">
                    <button className="mini" onClick={() => setSelectedId(selectedId === ev.id ? null : ev.id)}>{selectedId === ev.id ? 'Close' : 'Manage'}</button>
                    <button className="mini" onClick={() => togglePublish(ev)}>{ev.is_published ? 'Unpublish' : 'Publish'}</button>
                    <button className="mini danger" onClick={() => remove(ev)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {selected && <ManageEvent key={selected.id} event={selected} token={token} onChanged={events.reload}/>}
    </div>
  );
}
