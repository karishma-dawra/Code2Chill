import React, {useState} from 'react';
import {api, download, formData} from '../../lib/api.js';
import {Empty, Loading, Notice, formatDate, useLoad} from '../../lib/ui.jsx';
import {useContent} from '../../components/Layout.jsx';

function useMessage() {
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  async function run(fn, ok) {
    setMsg(''); setError(false);
    try {
      await fn();
      if (ok) setMsg(ok);
      return true;
    } catch (err) {
      setMsg(err.message); setError(true);
      return false;
    }
  }
  return {msg, error, run, setMsg, setError};
}

// ---------- contact queries ----------
export function ContactAdmin({token}) {
  const [filter, setFilter] = useState('new');
  const items = useLoad(() => api(`/admin/contact${filter === 'all' ? '' : `?status=${filter}`}`, {token}), [token, filter]);
  const [replies, setReplies] = useState({});
  const m = useMessage();
  return (
    <section className="panel wide">
      <h3>Contact queries</h3>
      <div className="row-actions">
        {['new', 'resolved', 'all'].map((f) => <button key={f} className={`outline ${filter === f ? 'selected' : ''}`} onClick={() => setFilter(f)}>{f}</button>)}
      </div>
      <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
      {items.loading ? <Loading/> : (items.data || []).length === 0 ? <Empty text="No queries here."/> : (items.data || []).map((c) => (
        <article className="memberrow block" key={c.id}>
          <div className="full-width">
            <b>{c.subject}</b> <span className={`badge ${c.status === 'new' ? 'pending' : 'approved'}`}>{c.status}</span>
            <p>{c.message}</p>
            <small className="muted">{c.name} · {c.email} · {formatDate(c.created_at)}</small>
            {c.reply && <p className="muted">Reply sent: {c.reply}</p>}
            <div className="row-actions">
              <input placeholder="Write a reply (emailed to the sender)" value={replies[c.id] || ''} onChange={(e) => setReplies({...replies, [c.id]: e.target.value})}/>
              <button className="mini" disabled={!replies[c.id]} onClick={() => m.run(async () => { await api(`/admin/contact/${c.id}`, {method: 'PATCH', token, body: {reply: replies[c.id]}}); setReplies({...replies, [c.id]: ''}); items.reload(); }, 'Reply saved and emailed.')}>Send reply</button>
              {c.status === 'new' && <button className="mini" onClick={() => m.run(async () => { await api(`/admin/contact/${c.id}`, {method: 'PATCH', token, body: {status: 'resolved'}}); items.reload(); })}>Mark resolved</button>}
              <button className="mini danger" onClick={() => window.confirm('Delete this message?') && m.run(async () => { await api(`/admin/contact/${c.id}`, {method: 'DELETE', token}); items.reload(); })}>Delete</button>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

// ---------- announcements ----------
export function AnnouncementsAdmin({token}) {
  const items = useLoad(() => api('/admin/announcements', {token}), [token]);
  const blank = {title: '', body: '', visibility: 'public', published: true, notify_members: false};
  const [form, setForm] = useState(blank);
  const m = useMessage();
  return (
    <div className="stack">
      <form className="panel form" onSubmit={(e) => { e.preventDefault(); m.run(async () => {
        const data = await api('/admin/announcements', {method: 'POST', token, body: form});
        setForm(blank); items.reload();
        if (data.emails_sent !== undefined && form.notify_members) m.setMsg(`Published. Emails sent to ${data.emails_sent} members.`);
      }, 'Announcement published.'); }}>
        <h3>New announcement</h3>
        <label>Title<input required value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}/></label>
        <label>Message<textarea rows="4" value={form.body} onChange={(e) => setForm({...form, body: e.target.value})}/></label>
        <div className="row2">
          <label>Visibility<select value={form.visibility} onChange={(e) => setForm({...form, visibility: e.target.value})}>
            <option value="public">Public</option><option value="members">Members only</option></select></label>
          <label className="check"><input type="checkbox" checked={form.notify_members} onChange={(e) => setForm({...form, notify_members: e.target.checked})}/> Email approved members</label>
        </div>
        <button className="primary">Publish</button>
        <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
      </form>
      <section className="panel wide">
        <h3>Published and draft announcements</h3>
        {(items.data || []).map((a) => (
          <div className="memberrow" key={a.id}>
            <div><b>{a.title}</b><small>{a.visibility} · {a.published ? 'published' : 'draft'} · {formatDate(a.created_at, false)}</small></div>
            <div className="row-actions">
              <button className="mini" onClick={() => m.run(async () => { await api(`/admin/announcements/${a.id}`, {method: 'PATCH', token, body: {published: !a.published}}); items.reload(); })}>{a.published ? 'Unpublish' : 'Publish'}</button>
              <button className="mini danger" onClick={() => window.confirm('Delete this announcement?') && m.run(async () => { await api(`/admin/announcements/${a.id}`, {method: 'DELETE', token}); items.reload(); })}>Delete</button>
            </div>
          </div>
        ))}
        {(items.data || []).length === 0 && <Empty text="No announcements yet."/>}
        <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
      </section>
    </div>
  );
}

// ---------- website content (CMS) ----------
const CONTENT_SECTIONS = [
  ['club_name', 'Club name', 'input'], ['home_title', 'Homepage title', 'input'], ['home_title_accent', 'Homepage title (highlighted)', 'input'],
  ['home_intro', 'Homepage introduction', 'textarea'], ['highlights', 'Club highlights (one per line)', 'textarea'],
  ['club_intro', 'Club introduction', 'textarea'], ['vision', 'Vision', 'textarea'], ['mission', 'Mission', 'textarea'],
  ['objectives', 'Club objectives (one per line)', 'textarea'], ['what_we_do', 'What C2C does', 'textarea'],
  ['activities', 'Activities and technical initiatives', 'textarea'], ['why_join', 'Why students should join', 'textarea'],
  ['about_extra', 'Other information (About page)', 'textarea'], ['contact_email', 'Contact email', 'input'],
  ['contact_phone', 'Contact phone', 'input'], ['contact_address', 'Contact address', 'textarea'],
  ['social_instagram', 'Instagram URL', 'input'], ['social_linkedin', 'LinkedIn URL', 'input'],
  ['social_github', 'GitHub URL', 'input'], ['social_youtube', 'YouTube URL', 'input'], ['footer_note', 'Footer note', 'input'],
];

function ContentField({label, keyName, type, value, token, onSaved}) {
  const [text, setText] = useState(value || '');
  const m = useMessage();
  return (
    <div className="content-field">
      <label>{label}<small className="muted"> ({keyName})</small>
        {type === 'textarea' ? <textarea rows="3" value={text} onChange={(e) => setText(e.target.value)}/> : <input value={text} onChange={(e) => setText(e.target.value)}/>}
      </label>
      <div className="row-actions">
        <button className="mini" onClick={() => m.run(async () => { await api(`/admin/content/${keyName}`, {method: 'PUT', token, body: {value: text}}); onSaved(); }, 'Saved.')}>Save</button>
        <button className="mini danger" onClick={() => window.confirm(`Clear "${label}"?`) && m.run(async () => { await api(`/admin/content/${keyName}`, {method: 'DELETE', token}); setText(''); onSaved(); }, 'Cleared.')}>Clear</button>
        <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
      </div>
    </div>
  );
}

export function ContentAdmin({token}) {
  const {content, reload} = useContent();
  const m = useMessage();
  const [file, setFile] = useState(null);
  return (
    <section className="panel wide">
      <h3>Website content</h3>
      <p className="muted">Edit the public website without touching code. Leave a field empty to show the default text.</p>
      <div className="content-field">
        <strong>Club logo</strong>
        <div className="row-actions">
          {content.club_logo && <img className="logo-preview" src={`http://127.0.0.1:8000/api/files/${content.club_logo}`} alt="Club logo"/>}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files[0])}/>
          <button className="outline" disabled={!file} onClick={() => m.run(async () => { await api('/admin/content/club_logo/image', {method: 'POST', token, form: formData({}, {file})}); setFile(null); reload(); }, 'Logo updated.')}>Upload logo</button>
        </div>
        <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
      </div>
      {CONTENT_SECTIONS.map(([key, label, type]) => (
        <ContentField key={key} label={label} keyName={key} type={type} value={content[key]} token={token} onSaved={reload}/>
      ))}
    </section>
  );
}

// ---------- gallery ----------
export function GalleryAdmin({token}) {
  const galleries = useLoad(() => api('/galleries'), [token]);
  const events = useLoad(() => api('/admin/events', {token}), [token]);
  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [openId, setOpenId] = useState(null);
  const [files, setFiles] = useState([]);
  const detail = useLoad(() => (openId ? api(`/galleries/${openId}`) : Promise.resolve(null)), [openId]);
  const m = useMessage();

  return (
    <div className="stack">
      <form className="panel form" onSubmit={(e) => { e.preventDefault(); m.run(async () => {
        await api('/admin/galleries', {method: 'POST', token, body: {title: title.trim(), event_id: eventId ? Number(eventId) : null}});
        setTitle(''); setEventId(''); galleries.reload();
      }, 'Gallery created.'); }}>
        <h3>New event gallery</h3>
        <div className="row2">
          <label>Gallery title<input required value={title} onChange={(e) => setTitle(e.target.value)}/></label>
          <label>Event (optional)<select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">No event</option>{(events.data || []).map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select></label>
        </div>
        <button className="primary">Create gallery</button>
        <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
      </form>
      <section className="panel wide">
        <h3>Galleries</h3>
        {(galleries.data || []).map((g) => (
          <div className="memberrow" key={g.id}>
            <div><b>{g.title}</b><small>{g.event_title || 'No event'} · {g.image_count} photos</small></div>
            <div className="row-actions">
              <button className="mini" onClick={() => setOpenId(openId === g.id ? null : g.id)}>{openId === g.id ? 'Close' : 'Manage photos'}</button>
              <button className="mini danger" onClick={() => window.confirm('Delete this gallery and all its photos?') && m.run(async () => { await api(`/admin/galleries/${g.id}`, {method: 'DELETE', token}); if (openId === g.id) setOpenId(null); galleries.reload(); })}>Delete</button>
            </div>
          </div>
        ))}
        {(galleries.data || []).length === 0 && <Empty text="No galleries yet."/>}
      </section>
      {openId && detail.data && (
        <section className="panel wide">
          <h3>{detail.data.title}: photos</h3>
          <div className="row-actions">
            <input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(e) => setFiles(Array.from(e.target.files))}/>
            <button className="outline" disabled={files.length === 0} onClick={() => m.run(async () => {
              await api(`/admin/galleries/${openId}/images`, {method: 'POST', token, form: formData({}, {files})});
              setFiles([]); detail.reload(); galleries.reload();
            }, 'Photos uploaded.')}>Upload {files.length || ''} photo(s)</button>
          </div>
          <div className="photo-grid">
            {detail.data.images.map((img) => (
              <figure className="photo" key={img.id}>
                <img src={`http://127.0.0.1:8000${img.url}`} alt={img.name}/>
                <div className="row-actions">
                  <button className="mini" onClick={() => download(img.download_url, token, img.name).catch((e) => m.setMsg(e.message))}>Download</button>
                  <button className="mini danger" onClick={() => window.confirm('Delete this photo?') && m.run(async () => { await api(`/admin/gallery-images/${img.id}`, {method: 'DELETE', token}); detail.reload(); galleries.reload(); })}>Delete</button>
                </div>
              </figure>
            ))}
          </div>
          {detail.data.images.length === 0 && <Empty text="No photos yet."/>}
          <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
        </section>
      )}
    </div>
  );
}

// ---------- team ----------
const BLANK_MEMBER = {name: '', designation: '', category: 'member', responsibilities: '', sort_order: 0,
  social_links: {linkedin: '', github: '', instagram: '', youtube: '', website: ''}};

export function TeamAdmin({token}) {
  const team = useLoad(() => api('/team'), [token]);
  const [form, setForm] = useState(BLANK_MEMBER);
  const [editingId, setEditingId] = useState(null);
  const [photo, setPhoto] = useState(null);
  const m = useMessage();

  function payload() {
    const links = Object.fromEntries(Object.entries(form.social_links).filter(([, v]) => v && v.trim()));
    return {name: form.name.trim(), designation: form.designation, category: form.category,
      responsibilities: form.responsibilities, sort_order: Number(form.sort_order) || 0, social_links: links};
  }

  async function save(e) {
    e.preventDefault();
    await m.run(async () => {
      let saved;
      if (editingId) saved = await api(`/admin/team/${editingId}`, {method: 'PUT', token, body: payload()});
      else saved = await api('/admin/team', {method: 'POST', token, body: payload()});
      if (photo) await api(`/admin/team/${saved.id}/photo`, {method: 'POST', token, form: formData({}, {file: photo})});
      setForm(BLANK_MEMBER); setEditingId(null); setPhoto(null); team.reload();
    }, editingId ? 'Team member updated.' : 'Team member added.');
  }

  function edit(t) {
    setEditingId(t.id);
    setForm({name: t.name, designation: t.designation, category: t.category, responsibilities: t.responsibilities,
      sort_order: t.sort_order, social_links: {linkedin: '', github: '', instagram: '', youtube: '', website: '', ...t.social_links}});
  }

  return (
    <div className="stack">
      <form className="panel form" onSubmit={save}>
        <h3>{editingId ? 'Edit team member' : 'Add team member'}</h3>
        <div className="row2">
          <label>Name<input required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}/></label>
          <label>Designation<input value={form.designation} onChange={(e) => setForm({...form, designation: e.target.value})}/></label>
        </div>
        <div className="row2">
          <label>Group<select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}>
            <option value="core">Core team</option><option value="coordinator">Club coordinator</option>
            <option value="faculty">Faculty coordinator</option><option value="member">Team member</option></select></label>
          <label>Display order<input type="number" value={form.sort_order} onChange={(e) => setForm({...form, sort_order: e.target.value})}/></label>
        </div>
        <label>Responsibilities<textarea rows="2" value={form.responsibilities} onChange={(e) => setForm({...form, responsibilities: e.target.value})}/></label>
        <div className="row2">
          {Object.keys(form.social_links).map((key) => (
            <label key={key}>{key} link<input value={form.social_links[key]} onChange={(e) => setForm({...form, social_links: {...form.social_links, [key]: e.target.value}})}/></label>
          ))}
        </div>
        <label>Profile photo (PNG, JPG or WEBP)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setPhoto(e.target.files[0])}/></label>
        <div className="row-actions">
          <button className="primary">{editingId ? 'Save changes' : 'Add member'}</button>
          {editingId && <button type="button" className="outline" onClick={() => { setEditingId(null); setForm(BLANK_MEMBER); }}>Cancel</button>}
        </div>
        <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
      </form>
      <section className="panel wide">
        <h3>Team members</h3>
        {(team.data || []).map((t) => (
          <div className="memberrow" key={t.id}>
            <div><b>{t.name}</b><small>{t.designation} · {t.category}</small></div>
            <div className="row-actions">
              <button className="mini" onClick={() => edit(t)}>Edit</button>
              <button className="mini danger" onClick={() => window.confirm(`Remove ${t.name} from the team page?`) && m.run(async () => { await api(`/admin/team/${t.id}`, {method: 'DELETE', token}); team.reload(); })}>Remove</button>
            </div>
          </div>
        ))}
        {(team.data || []).length === 0 && <Empty text="No team members yet."/>}
      </section>
    </div>
  );
}

// ---------- resources ----------
export function ResourcesAdmin({token}) {
  const resources = useLoad(() => api('/resources', {token}), [token]);
  const [fileForm, setFileForm] = useState({title: '', description: '', category: 'general', visibility: 'members'});
  const [file, setFile] = useState(null);
  const [linkForm, setLinkForm] = useState({title: '', description: '', category: 'general', url: '', visibility: 'members'});
  const m = useMessage();
  return (
    <div className="stack">
      <form className="panel form" onSubmit={(e) => { e.preventDefault(); m.run(async () => {
        await api('/admin/resources', {method: 'POST', token, form: formData(fileForm, {file})});
        setFileForm({title: '', description: '', category: 'general', visibility: 'members'}); setFile(null); resources.reload();
      }, 'Resource uploaded.'); }}>
        <h3>Upload a document</h3>
        <div className="row2">
          <label>Title<input required value={fileForm.title} onChange={(e) => setFileForm({...fileForm, title: e.target.value})}/></label>
          <label>Category<input value={fileForm.category} onChange={(e) => setFileForm({...fileForm, category: e.target.value})}/></label>
        </div>
        <label>Description<textarea rows="2" value={fileForm.description} onChange={(e) => setFileForm({...fileForm, description: e.target.value})}/></label>
        <div className="row2">
          <label>Visibility<select value={fileForm.visibility} onChange={(e) => setFileForm({...fileForm, visibility: e.target.value})}>
            <option value="members">Members only</option><option value="public">Public</option></select></label>
          <label>File (PDF, DOC, PPT, ZIP, TXT, images)<input type="file" required onChange={(e) => setFile(e.target.files[0])}/></label>
        </div>
        <button className="primary" disabled={!file}>Upload</button>
      </form>
      <form className="panel form" onSubmit={(e) => { e.preventDefault(); m.run(async () => {
        await api('/admin/resources/link', {method: 'POST', token, body: linkForm});
        setLinkForm({title: '', description: '', category: 'general', url: '', visibility: 'members'}); resources.reload();
      }, 'Link added.'); }}>
        <h3>Add a useful link</h3>
        <div className="row2">
          <label>Title<input required value={linkForm.title} onChange={(e) => setLinkForm({...linkForm, title: e.target.value})}/></label>
          <label>URL<input required placeholder="https://" value={linkForm.url} onChange={(e) => setLinkForm({...linkForm, url: e.target.value})}/></label>
        </div>
        <div className="row2">
          <label>Category<input value={linkForm.category} onChange={(e) => setLinkForm({...linkForm, category: e.target.value})}/></label>
          <label>Visibility<select value={linkForm.visibility} onChange={(e) => setLinkForm({...linkForm, visibility: e.target.value})}>
            <option value="members">Members only</option><option value="public">Public</option></select></label>
        </div>
        <button className="outline">Add link</button>
        <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
      </form>
      <section className="panel wide">
        <h3>Resources</h3>
        {(resources.data || []).map((r) => (
          <div className="memberrow" key={r.id}>
            <div><b>{r.title}</b><small>{r.kind} · {r.category} · {r.visibility}</small></div>
            <div className="row-actions">
              <button className="mini" onClick={() => m.run(async () => { await api(`/admin/resources/${r.id}`, {method: 'PATCH', token, body: {visibility: r.visibility === 'public' ? 'members' : 'public'}}); resources.reload(); })}>
                Make {r.visibility === 'public' ? 'members only' : 'public'}</button>
              <button className="mini danger" onClick={() => window.confirm('Delete this resource?') && m.run(async () => { await api(`/admin/resources/${r.id}`, {method: 'DELETE', token}); resources.reload(); })}>Delete</button>
            </div>
          </div>
        ))}
        {(resources.data || []).length === 0 && <Empty text="No resources yet."/>}
        <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
      </section>
    </div>
  );
}

// ---------- recruitment ----------
export function RecruitmentAdmin({token}) {
  const forms = useLoad(() => api('/admin/recruitment', {token}), [token]);
  const [form, setForm] = useState({title: '', description: '', deadline: '', is_open: true});
  const [openId, setOpenId] = useState(null);
  const apps = useLoad(() => (openId ? api(`/admin/recruitment/${openId}/applications`, {token}) : Promise.resolve([])), [openId]);
  const m = useMessage();
  return (
    <div className="stack">
      <form className="panel form" onSubmit={(e) => { e.preventDefault(); m.run(async () => {
        await api('/admin/recruitment', {method: 'POST', token, body: {...form, deadline: form.deadline || null}});
        setForm({title: '', description: '', deadline: '', is_open: true}); forms.reload();
      }, 'Recruitment form published.'); }}>
        <h3>Publish a recruitment form</h3>
        <label>Title<input required value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}/></label>
        <label>Description<textarea rows="3" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}/></label>
        <div className="row2">
          <label>Application deadline (optional)<input type="datetime-local" placeholder="2026-12-25T17:00" value={form.deadline} onChange={(e) => setForm({...form, deadline: e.target.value})}/></label>
          <label>Status<select value={form.is_open ? 'open' : 'closed'} onChange={(e) => setForm({...form, is_open: e.target.value === 'open'})}>
            <option value="open">Open</option><option value="closed">Closed</option></select></label>
        </div>
        <button className="primary">Publish</button>
        <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
      </form>
      <section className="panel wide">
        <h3>Recruitment forms</h3>
        {(forms.data || []).map((f) => (
          <div className="memberrow" key={f.id}>
            <div><b>{f.title}</b><small>{f.application_count} applications · {f.accepting ? 'accepting' : 'closed'}{f.deadline ? ` · deadline ${formatDate(f.deadline, false)}` : ''}</small></div>
            <div className="row-actions">
              <button className="mini" onClick={() => setOpenId(openId === f.id ? null : f.id)}>{openId === f.id ? 'Hide applications' : 'Applications'}</button>
              <button className="mini" onClick={() => m.run(async () => { await api(`/admin/recruitment/${f.id}`, {method: 'PUT', token, body: {title: f.title, description: f.description, deadline: f.deadline, is_open: !f.is_open}}); forms.reload(); })}>{f.is_open ? 'Close' : 'Open'}</button>
              <button className="mini danger" onClick={() => window.confirm('Delete this form and its applications?') && m.run(async () => { await api(`/admin/recruitment/${f.id}`, {method: 'DELETE', token}); forms.reload(); })}>Delete</button>
            </div>
            {openId === f.id && (apps.loading ? <Loading/> : (apps.data || []).length === 0 ? <p className="muted">No applications yet.</p> : (
              <table className="data-table full-width">
                <thead><tr><th>Name</th><th>Email</th><th>Message</th><th>Status</th></tr></thead>
                <tbody>{apps.data.map((a) => (
                  <tr key={a.id}><td>{a.name}</td><td>{a.email}</td><td>{a.message}</td>
                    <td><select value={a.status} onChange={(e) => m.run(async () => { await api(`/admin/recruitment/applications/${a.id}`, {method: 'PATCH', token, body: {status: e.target.value}}); apps.reload(); })}>
                      <option value="submitted">Submitted</option><option value="shortlisted">Shortlisted</option><option value="selected">Selected</option><option value="rejected">Rejected</option></select></td></tr>
                ))}</tbody>
              </table>
            ))}
          </div>
        ))}
        {(forms.data || []).length === 0 && <Empty text="No recruitment forms yet."/>}
        <Notice msg={m.msg} tone={m.error ? 'error' : undefined}/>
      </section>
    </div>
  );
}
