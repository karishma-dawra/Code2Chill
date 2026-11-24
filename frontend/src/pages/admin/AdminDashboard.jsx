import React, {useState} from 'react';
import {api} from '../../lib/api.js';
import {useAuth} from '../../lib/auth.jsx';
import {Empty, Loading, Notice, formatDate, useLoad} from '../../lib/ui.jsx';
import MembersTab from './MembersTab.jsx';
import EventsTab from './EventsTab.jsx';
import {AnnouncementsAdmin, ContactAdmin, ContentAdmin, GalleryAdmin, RecruitmentAdmin, ResourcesAdmin, TeamAdmin} from './SiteTabs.jsx';

const TABS = [
  ['overview', 'Overview'], ['members', 'Members'], ['events', 'Events'], ['contact', 'Contact queries'],
  ['announcements', 'Announcements'], ['content', 'Website content'], ['gallery', 'Gallery'],
  ['team', 'Team'], ['resources', 'Resources'], ['recruitment', 'Recruitment'],
];

function Overview({token}) {
  const stats = useLoad(() => api('/admin/dashboard', {token}), [token]);
  const pending = useLoad(() => api('/admin/members?status=pending&page_size=10', {token}), [token]);
  const [msg, setMsg] = useState('');

  async function setStatus(id, status) {
    setMsg('');
    try {
      await api(`/admin/members/${id}/status`, {method: 'PATCH', body: {status}, token});
      pending.reload(); stats.reload();
    } catch (err) { setMsg(err.message); }
  }

  if (stats.loading) return <Loading/>;
  const s = stats.data || {};
  const cards = [
    ['Total registered members', s.total_members], ['Approved members', s.approved_members],
    ['Pending members', s.pending_members], ['Total events', s.total_events],
    ['Upcoming events', s.upcoming_events], ['Completed events', s.completed_events],
    ['Total event registrations', s.total_registrations], ['Total volunteers', s.total_volunteers],
    ['Pending contact queries', s.pending_contact_queries],
  ];
  return (
    <>
      <div className="stats stats-grid">
        {cards.map(([label, value]) => <div className="stat" key={label}><small>{label}</small><strong>{value ?? '—'}</strong></div>)}
      </div>
      <section className="panel">
        <h3>Pending applications</h3>
        <Notice msg={msg} tone="error"/>
        {pending.loading ? <Loading/> : pending.error ? <Notice msg={pending.error} tone="error"/> : (!pending.data?.items || pending.data.items.length === 0) ? <Empty text="No pending applications."/> : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Course</th><th>Applied</th><th></th></tr></thead>
            <tbody>
              {(pending.data?.items || []).map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td><td>{m.email}</td><td>{[m.course, m.branch, m.semester && `Sem ${m.semester}`].filter(Boolean).join(' · ')}</td>
                  <td>{formatDate(m.created_at, false)}</td>
                  <td className="row-actions">
                    <button className="mini" onClick={() => setStatus(m.id, 'approved')}>Approve</button>
                    <button className="mini danger" onClick={() => window.confirm('Reject this application?') && setStatus(m.id, 'rejected')}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

export default function AdminDashboard() {
  const {token, user} = useAuth();
  const [tab, setTab] = useState('overview');
  return (
    <section className="section page admin-portal">
      <div className="section-head">
        <div>
          <div className="eyebrow">C2C PORTAL</div>
          <h2>Admin <span className="gradient">Dashboard</span></h2>
          <p className="muted">Signed in as {user?.email}</p>
        </div>
      </div>
      <nav className="admin-tabs" aria-label="Admin sections">
        {TABS.map(([key, label]) => (
          <button key={key} className={tab === key ? 'selected' : ''} onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>
      {tab === 'overview' && <Overview token={token}/>}
      {tab === 'members' && <MembersTab token={token}/>}
      {tab === 'events' && <EventsTab token={token}/>}
      {tab === 'contact' && <ContactAdmin token={token}/>}
      {tab === 'announcements' && <AnnouncementsAdmin token={token}/>}
      {tab === 'content' && <ContentAdmin token={token}/>}
      {tab === 'gallery' && <GalleryAdmin token={token}/>}
      {tab === 'team' && <TeamAdmin token={token}/>}
      {tab === 'resources' && <ResourcesAdmin token={token}/>}
      {tab === 'recruitment' && <RecruitmentAdmin token={token}/>}
    </section>
  );
}
