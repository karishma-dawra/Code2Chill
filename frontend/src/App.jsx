import React from 'react';
import {Link, Navigate, Route, Routes} from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Events from './pages/Events.jsx';
import EventDetail from './pages/EventDetail.jsx';
import Team from './pages/Team.jsx';
import Contact from './pages/Contact.jsx';
import {GalleryList} from './pages/Gallery.jsx';
import GalleryDetail from './pages/Gallery.jsx';
import {CalendarPage, AnnouncementsPage, RecruitmentPage, ResourcesPage} from './pages/Community.jsx';
import {LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage} from './pages/Auth.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import MemberDashboard from './pages/member/MemberDashboard.jsx';
import {useAuth} from './lib/auth.jsx';

// Role-based redirection: admins get the Admin Portal, everyone else the Member Portal
// (which includes the Volunteer tab when the member is assigned to events).
function Dashboard() {
  const {user} = useAuth();
  if (!user) return <Navigate to="/login" replace state={{from: '/dashboard'}}/>;
  return user.role === 'admin' ? <AdminDashboard/> : <MemberDashboard/>;
}

function NotFound() {
  return (
    <section className="section page">
      <div className="eyebrow">404</div>
      <h2>Page <span className="gradient">not found</span></h2>
      <p className="lead"><Link to="/">Go back to the home page</Link></p>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout/>}>
        <Route index element={<Home/>}/>
        <Route path="about" element={<About/>}/>
        <Route path="events" element={<Events/>}/>
        <Route path="events/:id" element={<EventDetail/>}/>
        <Route path="team" element={<Team/>}/>
        <Route path="gallery" element={<GalleryList/>}/>
        <Route path="gallery/:id" element={<GalleryDetail/>}/>
        <Route path="contact" element={<Contact/>}/>
        <Route path="calendar" element={<CalendarPage/>}/>
        <Route path="announcements" element={<AnnouncementsPage/>}/>
        <Route path="recruitment" element={<RecruitmentPage/>}/>
        <Route path="resources" element={<ResourcesPage/>}/>
        <Route path="login" element={<LoginPage/>}/>
        <Route path="register" element={<RegisterPage/>}/>
        <Route path="forgot-password" element={<ForgotPasswordPage/>}/>
        <Route path="reset-password" element={<ResetPasswordPage/>}/>
        <Route path="dashboard" element={<Dashboard/>}/>
        <Route path="admin" element={<Navigate to="/dashboard" replace/>}/>
        <Route path="admin/dashboard" element={<Navigate to="/dashboard" replace/>}/>
        <Route path="*" element={<NotFound/>}/>
      </Route>
    </Routes>
  );
}
