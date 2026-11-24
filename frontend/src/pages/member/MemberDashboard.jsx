import React, {useState} from 'react';
import {Navigate} from 'react-router-dom';
import {QRCodeSVG} from 'qrcode.react';
import {Award, Download} from 'lucide-react';
import {api, download, formData} from '../../lib/api.js';
import {useAuth} from '../../lib/auth.jsx';
import {Countdown, Empty, EventFields, Loading, Notice, blankEvent, cleanEvent, formatDate, toForm, useLoad} from '../../lib/ui.jsx';

function useMessage() {
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  // `ok` is a success message, or a function that builds one from the action's result.
  async function run(fn, ok) {
    setMsg(''); setError(false);
    try {
      const result = await fn();
      if (ok) setMsg(typeof ok === 'function' ? ok(result) : ok);
    } catch (err) { setMsg(err.message); setError(true); }
  }
  return {msg, error, run};
}

// ---------- profile ----------
function Profile({token, user, refresh}) {
  const [values, setValues] = useState({
    name: user.name, phone: user.phone || '', course: user.course || '', branch: user.branch || '', semester: user.semester || '',
  });
  const [photo, setPhoto] = useState(null);
  const m = useMessage();
  const set = (key) => (e) => setValues({...values, [key]: e.target.value});
  return (
    <div className="stack">
      <section className="panel profile-card">
        {user.photo_path
          ? <img className="avatar" src={`http://127.0.0.1:8000/api/files/${user.photo_path}`} alt={user.name}/>
          : <div className="avatar placeholder">{user.name[0]}</div>}
        <div>
          <h3>{user.name}</h3>
          <p className="muted">{user.email}</p>
          <p>Student ID: {user.student_id || '—'} · Status: <span className={`badge ${user.status}`}>{user.status}</span> · Role: {user.role}</p>
        </div>
      </section>
      <form className="panel form" onSubmit={(e) => { e.preventDefault(); m.run(async () => {
        await api('/me', {method: 'PATCH', token, body: values});
        await refresh();
      }, 'Profile saved.'); }}>
        <h3>Edit profile</h3>
        <label>Full name<input required value={values.name} onChange={set('name')}/></label>
        <label>Phone number<input value={values.phone} onChange={set('phone')}/></label>
        <div className="row2">
          <label>Course<input value={values.course} onChange={set('course')}/></label>
          <label>Branch<input value={values.branch} onChange={set('branch')}/></label>
        </div>
        <label>Semester<input value={values.semester} onChange={set('semester')}/></label>
        <button className="primary">Save profile</button>
        <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
      </form>
      <form className="panel form" onSubmit={(e) => { e.preventDefault(); m.run(async () => {
        await api('/me/photo', {method: 'POST', token, form: formData({}, {file: photo})});
        setPhoto(null); await refresh();
      }, 'Photo updated.'); }}>
        <h3>Profile photograph</h3>
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setPhoto(e.target.files[0])}/>
        <button className="outline" disabled={!photo}>Upload photo</button>
      </form>
    </div>
  );
}

// ---------- registrations ----------
function Registrations({token}) {
  const data = useLoad(() => api('/me/registrations', {token}), [token]);
  const m = useMessage();
  if (data.loading) return <Loading/>;
  const list = data.data?.registrations || [];
  return (
    <div className="stack">
      <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
      {list.length === 0 && <Empty text="You have not registered for any event yet."/>}
      {list.map((r) => (
        <article className="panel reg-card" key={r.id}>
          <div>
            <h3>{r.event_title}</h3>
            <p>Registration ID: <b className="code">{r.registration_code}</b> · {r.kind === 'team' ? `Team: ${r.team?.name}` : 'Individual'}</p>
            <p>Status: <span className={`badge ${r.status}`}>{r.status}</span> {r.checked_in && <span className="badge approved">Checked in</span>}</p>
            <small className="muted">Registered {formatDate(r.created_at, false)}</small>
            {r.status !== 'cancelled' && !r.checked_in && (
              <div><button className="mini danger" onClick={() => window.confirm('Cancel this registration?') && m.run(async () => { await api(`/registrations/${r.id}/cancel`, {method: 'POST', token}); data.reload(); }, 'Registration cancelled.')}>Cancel registration</button></div>
            )}
          </div>
          {r.status !== 'cancelled' && <div className="qr"><QRCodeSVG value={r.registration_code} size={120}/><small>Show at check-in</small></div>}
        </article>
      ))}
    </div>
  );
}

// ---------- team ----------
function MyTeam({token}) {
  const data = useLoad(() => api('/me/registrations', {token}), [token]);
  if (data.loading) return <Loading/>;
  const teams = [...(data.data?.registrations || []).filter((r) => r.kind === 'team'), ...(data.data?.team_memberships || [])];
  if (teams.length === 0) return <Empty text="You are not part of any team registration."/>;
  return (
    <div className="stack">
      {teams.map((r) => (
        <article className="panel" key={r.id}>
          <h3>{r.team?.name} <small className="muted">· {r.event_title}</small></h3>
          <p>Registration ID: <b className="code">{r.registration_code}</b> · Status: {r.status}</p>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
            <tbody>{r.team?.members.map((mem) => (
              <tr key={mem.email}><td>{mem.name}</td><td>{mem.email}</td><td>{mem.is_leader ? 'Team leader' : 'Member'}</td></tr>
            ))}</tbody>
          </table>
        </article>
      ))}
    </div>
  );
}

// ---------- history, feedback ----------
function History({token}) {
  const data = useLoad(() => api('/me/registrations', {token}), [token]);
  if (data.loading) return <Loading/>;
  const list = [...(data.data?.registrations || []), ...(data.data?.team_memberships || [])];
  if (list.length === 0) return <Empty text="Your participation history will appear here."/>;
  return (
    <table className="data-table">
      <thead><tr><th>Event</th><th>Registered</th><th>Type</th><th>Status</th><th>Attended</th></tr></thead>
      <tbody>{list.map((r) => (
        <tr key={r.id}><td>{r.event_title}</td><td>{formatDate(r.created_at, false)}</td><td>{r.kind}</td><td>{r.status}</td><td>{r.checked_in ? 'Yes' : 'No'}</td></tr>
      ))}</tbody>
    </table>
  );
}

function Feedback({token}) {
  const data = useLoad(() => api('/me/registrations', {token}), [token]);
  const [open, setOpen] = useState(null);
  const [values, setValues] = useState({rating: 5, message: '', suggestions: ''});
  const m = useMessage();
  const list = (data.data?.registrations || []).filter((r) => r.status !== 'cancelled');
  if (data.loading) return <Loading/>;
  if (list.length === 0) return <Empty text="Register for an event to share feedback after it ends."/>;
  return (
    <div className="stack">
      {list.map((r) => (
        <article className="panel" key={r.id}>
          <h3>{r.event_title}</h3>
          {open !== r.event_id ? <button className="outline" onClick={() => setOpen(r.event_id)}>Give feedback</button> : (
            <form className="form" onSubmit={(e) => { e.preventDefault(); m.run(async () => {
              await api(`/events/${r.event_id}/feedback`, {method: 'POST', token, body: values});
              setOpen(null);
            }, 'Thank you for your feedback!'); }}>
              <label>Rating<select value={values.rating} onChange={(e) => setValues({...values, rating: Number(e.target.value)})}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} / 5</option>)}</select></label>
              <label>Feedback<textarea rows="3" value={values.message} onChange={(e) => setValues({...values, message: e.target.value})}/></label>
              <label>Suggestions<textarea rows="2" value={values.suggestions} onChange={(e) => setValues({...values, suggestions: e.target.value})}/></label>
              <button className="primary">Submit feedback</button>
            </form>
          )}
        </article>
      ))}
      <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
    </div>
  );
}

// ---------- certificates, announcements, responsibilities ----------
function Certificates({token}) {
  const data = useLoad(() => api('/me/certificates', {token}), [token]);
  const m = useMessage();
  if (data.loading) return <Loading/>;
  if ((data.data || []).length === 0) return <Empty text="Certificates will appear here once they are issued."/>;
  return (
    <div className="cards">
      {data.data.map((c) => (
        <article className="event" key={c.certificate_id}>
          <Award/>
          <h3>{c.event_title}</h3>
          <small>{c.certificate_id} · issued {formatDate(c.issued_at, false)}</small>
          <button className="mini" onClick={() => m.run(() => download(c.file_url, token, `certificate-${c.certificate_id}.pdf`))}><Download size={14}/> Download PDF</button>
        </article>
      ))}
      <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
    </div>
  );
}

function MyAnnouncements({token}) {
  const data = useLoad(() => api('/announcements', {token}), [token]);
  if (data.loading) return <Loading/>;
  if ((data.data || []).length === 0) return <Empty text="No announcements yet."/>;
  return (data.data || []).map((a) => (
    <article className="panel" key={a.id}><h3>{a.title}</h3><p className="pre">{a.body}</p><small>{formatDate(a.created_at, false)}</small></article>
  ));
}

function Responsibilities({token}) {
  const tasks = useLoad(() => api('/volunteer/tasks', {token}), [token]);
  const m = useMessage();
  if (tasks.loading) return <Loading/>;
  if ((tasks.data || []).length === 0) return <Empty text="No volunteer responsibilities assigned to you."/>;
  return (
    <div className="stack">
      {tasks.data.map((t) => (
        <div className="memberrow" key={t.id}>
          <div><b>{t.title}</b><small>{t.event_title}</small></div>
          <select value={t.status} onChange={(e) => m.run(async () => { await api(`/volunteer/tasks/${t.id}`, {method: 'PATCH', token, body: {status: e.target.value}}); tasks.reload(); })}>
            <option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option>
          </select>
        </div>
      ))}
      <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
    </div>
  );
}

// ---------- volunteer portal (only for events the Admin assigned) ----------
function VolunteerPanel({token}) {
  const events = useLoad(() => api('/volunteer/events', {token}), [token]);
  const [selectedId, setSelectedId] = useState(null);
  const selected = (events.data || []).find((e) => e.id === selectedId) || (events.data || [])[0];
  const participants = useLoad(() => (selected ? api(`/events/${selected.id}/participants`, {token}) : Promise.resolve([])), [selected?.id, token]);
  const [code, setCode] = useState('');
  const [editForm, setEditForm] = useState(null);
  const m = useMessage();

  if (events.loading) return <Loading/>;
  if ((events.data || []).length === 0) return <Empty text="You are not assigned to any events as a volunteer."/>;

  async function scan(e) {
    e.preventDefault();
    await m.run(async () => {
      const data = await api(`/events/${selected.id}/attendance/scan`, {method: 'POST', token, body: {code: code.trim()}});
      setCode('');
      participants.reload(); events.reload();
      return data;
    }, (data) => `${data.participant_name} checked in.`);
  }

  return (
    <div className="stack">
      <label>Event
        <select value={selected.id} onChange={(e) => { setSelectedId(Number(e.target.value)); setEditForm(null); }}>
          {events.data.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
        </select>
      </label>
      <section className="panel">
        <h3>{selected.title}</h3>
        <p>{selected.starts_at ? formatDate(selected.starts_at) : 'Date to be announced'} {selected.location && `· ${selected.location}`}</p>
        {selected.starts_at && selected.event_type === 'upcoming' && <p>Starts in <Countdown to={selected.starts_at}/></p>}
        <p>{selected.checked_in_count} checked in · {selected.registered_count} registered</p>
        {editForm ? (
          <form className="form" onSubmit={(e) => { e.preventDefault(); m.run(async () => {
            const {slug, ...body} = cleanEvent(editForm);
            const pick = {title: body.title, description: body.description, starts_at: body.starts_at, ends_at: body.ends_at,
              location: body.location, eligibility: body.eligibility, rules: body.rules, prizes: body.prizes, faqs: body.faqs};
            await api(`/events/${selected.id}`, {method: 'PATCH', token, body: pick});
            setEditForm(null); events.reload();
          }, 'Event details saved.'); }}>
            <EventFields form={editForm} setForm={setEditForm} editing canPublish={false}/>
            <div className="row-actions"><button className="primary">Save details</button><button type="button" className="outline" onClick={() => setEditForm(null)}>Cancel</button></div>
          </form>
        ) : <button className="outline" onClick={() => setEditForm(toForm({...blankEvent, ...selected}))}>Edit event details</button>}
      </section>

      <section className="panel">
        <h3>Check in participant</h3>
        <form className="row-actions" onSubmit={scan}>
          <input placeholder="Registration code, e.g. C2C-ABCD1234" value={code} onChange={(e) => setCode(e.target.value)} required minLength="4"/>
          <button className="primary">Check in</button>
        </form>
        <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
      </section>

      <section className="panel wide">
        <h3>Participants</h3>
        {participants.loading ? <Loading/> : (
          <table className="data-table">
            <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Team</th><th>Attendance</th></tr></thead>
            <tbody>{(participants.data || []).map((p) => (
              <tr key={p.id}><td><code>{p.registration_code}</code></td><td>{p.participant_name}</td><td>{p.kind}</td>
                <td>{p.team?.name || '—'}</td><td>{p.checked_in ? `Checked in ${formatDate(p.checked_in_at)}` : 'Not yet'}</td></tr>
            ))}</tbody>
          </table>
        )}
      </section>
      <section className="panel">
        <h3>My responsibilities</h3>
        <Responsibilities token={token}/>
      </section>
    </div>
  );
}

// ---------- shell ----------
export default function MemberDashboard() {
  const {token, user, refresh} = useAuth();
  const assigned = useLoad(() => api('/volunteer/events', {token}), [token]);
  const tabs = [
    ['profile', 'Profile'], ['registrations', 'My registrations'], ['team', 'My team'], ['history', 'Event history'],
    ['certificates', 'Certificates'], ['announcements', 'Announcements'], ['responsibilities', 'Responsibilities'],
    ['feedback', 'Feedback'],
  ];
  if ((assigned.data || []).length > 0) tabs.push(['volunteer', 'Volunteer portal']);
  const [tab, setTab] = useState('profile');

  if (!user) return <Navigate to="/login" replace/>;
  return (
    <section className="section page member-portal">
      <div className="section-head">
        <div>
          <div className="eyebrow">C2C PORTAL</div>
          <h2>Member <span className="gradient">Dashboard</span></h2>
          <p className="muted">Signed in as {user.email}</p>
        </div>
      </div>
      <nav className="admin-tabs" aria-label="Member sections">
        {tabs.map(([key, label]) => <button key={key} className={tab === key ? 'selected' : ''} onClick={() => setTab(key)}>{label}</button>)}
      </nav>
      {tab === 'profile' && <Profile token={token} user={user} refresh={refresh}/>}
      {tab === 'registrations' && <Registrations token={token}/>}
      {tab === 'team' && <MyTeam token={token}/>}
      {tab === 'history' && <History token={token}/>}
      {tab === 'certificates' && <Certificates token={token}/>}
      {tab === 'announcements' && <MyAnnouncements token={token}/>}
      {tab === 'responsibilities' && <Responsibilities token={token}/>}
      {tab === 'feedback' && <Feedback token={token}/>}
      {tab === 'volunteer' && <VolunteerPanel token={token}/>}
    </section>
  );
}
