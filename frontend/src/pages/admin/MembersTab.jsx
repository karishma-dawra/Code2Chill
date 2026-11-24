import React, {useState} from 'react';
import {api} from '../../lib/api.js';
import {Empty, Loading, Notice, Pager, formatDate, useLoad} from '../../lib/ui.jsx';

const PAGE_SIZE = 15;
const EMPTY_FILTERS = {search: '', course: '', branch: '', semester: '', status: '', role: ''};

function EditMember({member, token, onSaved, onCancel}) {
  const [values, setValues] = useState({
    name: member.name, phone: member.phone || '', student_id: member.student_id || '', course: member.course || '',
    branch: member.branch || '', semester: member.semester || '',
  });
  const [msg, setMsg] = useState('');
  async function save(e) {
    e.preventDefault();
    try {
      await api(`/admin/members/${member.id}`, {method: 'PATCH', token, body: values});
      onSaved();
    } catch (err) { setMsg(err.message); }
  }
  const set = (key) => (e) => setValues({...values, [key]: e.target.value});
  return (
    <form className="form inline-form" onSubmit={save}>
      <div className="row2">
        <label>Name<input required value={values.name} onChange={set('name')}/></label>
        <label>Phone<input value={values.phone} onChange={set('phone')}/></label>
        <label>Student ID<input value={values.student_id} onChange={set('student_id')}/></label>
        <label>Course<input value={values.course} onChange={set('course')}/></label>
        <label>Branch<input value={values.branch} onChange={set('branch')}/></label>
        <label>Semester<input value={values.semester} onChange={set('semester')}/></label>
      </div>
      <div className="row-actions">
        <button className="primary">Save</button>
        <button type="button" className="outline" onClick={onCancel}>Cancel</button>
      </div>
      <Notice msg={msg} tone="error"/>
    </form>
  );
}

function History({member, token}) {
  const history = useLoad(() => api(`/admin/members/${member.id}/history`, {token}), [member.id]);
  if (history.loading) return <Loading/>;
  if (history.error) return <Notice msg={history.error} tone="error"/>;
  const h = history.data;
  return (
    <div className="history">
      <strong>Registrations</strong>
      {h.registrations.length === 0 ? <p className="muted">No event registrations.</p> : h.registrations.map((r) => (
        <div key={r.registration_code}>{r.event_title} · {r.kind} · {r.status} · {r.registration_code}</div>
      ))}
      <strong>Volunteer assignments</strong>
      {h.volunteer_events.length === 0 ? <p className="muted">None.</p> : h.volunteer_events.map((e) => <div key={e.id}>{e.title}</div>)}
      <strong>Certificates</strong>
      {h.certificates.length === 0 ? <p className="muted">None yet.</p> : h.certificates.map((c) => <div key={c.certificate_id}>{c.event_title} · {c.certificate_id}</div>)}
    </div>
  );
}

export default function MembersTab({token}) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [openHistory, setOpenHistory] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);

  const query = new URLSearchParams({page: String(page), page_size: String(PAGE_SIZE)});
  Object.entries(applied).forEach(([key, value]) => { if (value) query.set(key, value); });
  const members = useLoad(() => api(`/admin/members?${query.toString()}`, {token}), [token, page, JSON.stringify(applied)]);

  async function setStatus(member, status) {
    if (status === 'rejected' || status === 'suspended') {
      if (!window.confirm(`${status === 'rejected' ? 'Reject' : 'Suspend'} ${member.name}?`)) return;
    }
    setMsg(''); setError(false);
    try {
      await api(`/admin/members/${member.id}/status`, {method: 'PATCH', token, body: {status}});
      setMsg(`${member.name} is now ${status}.`);
      members.reload();
    } catch (err) { setMsg(err.message); setError(true); }
  }

  async function setRole(member, role) {
    setMsg(''); setError(false);
    try {
      await api(`/admin/members/${member.id}`, {method: 'PATCH', token, body: {role}});
      setMsg(`${member.name} is now a ${role}.`);
      members.reload();
    } catch (err) { setMsg(err.message); setError(true); }
  }

  function applyFilters(e) {
    e.preventDefault();
    setPage(1);
    setApplied(filters);
  }

  const data = members.data;
  return (
    <section className="panel wide">
      <h3>Member management</h3>
      <form className="filter-bar" onSubmit={applyFilters}>
        <input placeholder="Search name, email or ID" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})}/>
        <input placeholder="Course" value={filters.course} onChange={(e) => setFilters({...filters, course: e.target.value})}/>
        <input placeholder="Branch" value={filters.branch} onChange={(e) => setFilters({...filters, branch: e.target.value})}/>
        <input placeholder="Semester" value={filters.semester} onChange={(e) => setFilters({...filters, semester: e.target.value})}/>
        <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
          <option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option>
          <option value="rejected">Rejected</option><option value="suspended">Suspended</option>
        </select>
        <select value={filters.role} onChange={(e) => setFilters({...filters, role: e.target.value})}>
          <option value="">All roles</option><option value="member">Member</option><option value="volunteer">Volunteer</option>
        </select>
        <button className="primary">Search</button>
        <button type="button" className="outline" onClick={() => { setFilters(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); setPage(1); }}>Clear</button>
      </form>
      <Notice msg={msg} tone={error ? 'error' : undefined}/>
      {members.loading ? <Loading/> : members.error ? <Notice msg={members.error} tone="error"/> : data.items.length === 0 ? <Empty text="No members match these filters."/> : (
        <>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Course / branch</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {data.items.map((m) => (
                <React.Fragment key={m.id}>
                  <tr>
                    <td>{m.name}<br/><small className="muted">{m.student_id}</small></td>
                    <td>{m.email}<br/><small className="muted">{m.phone}</small></td>
                    <td>{[m.course, m.branch, m.semester && `Sem ${m.semester}`].filter(Boolean).join(' · ')}</td>
                    <td>{m.role}</td>
                    <td><span className={`badge ${m.status}`}>{m.status}</span></td>
                    <td>{formatDate(m.created_at, false)}</td>
                    <td className="row-actions">
                      {m.status !== 'approved' && <button className="mini" onClick={() => setStatus(m, 'approved')}>Approve</button>}
                      {m.status === 'pending' && <button className="mini danger" onClick={() => setStatus(m, 'rejected')}>Reject</button>}
                      {m.status === 'approved' && <button className="mini danger" onClick={() => setStatus(m, 'suspended')}>Suspend</button>}
                      {(m.status === 'suspended' || m.status === 'rejected') && <button className="mini" onClick={() => setStatus(m, 'approved')}>Activate</button>}
                      <button className="mini" onClick={() => setRole(m, m.role === 'volunteer' ? 'member' : 'volunteer')}>
                        {m.role === 'volunteer' ? 'Remove volunteer role' : 'Make volunteer'}
                      </button>
                      <button className="mini" onClick={() => setEditing(editing === m.id ? null : m.id)}>Edit</button>
                      <button className="mini" onClick={() => setOpenHistory(openHistory === m.id ? null : m.id)}>History</button>
                    </td>
                  </tr>
                  {editing === m.id && <tr><td colSpan="7"><EditMember member={m} token={token} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); members.reload(); }}/></td></tr>}
                  {openHistory === m.id && <tr><td colSpan="7"><History member={m} token={token}/></td></tr>}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <Pager page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage}/>
        </>
      )}
    </section>
  );
}
