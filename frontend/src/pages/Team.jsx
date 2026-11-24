import React from 'react';
import {Github, Globe, Instagram, Linkedin, Mail, Youtube} from 'lucide-react';
import {api, absUrl} from '../lib/api.js';
import {Empty, Loading, useLoad} from '../lib/ui.jsx';

const GROUPS = [
  ['core', 'Core team'],
  ['coordinator', 'Club coordinators'],
  ['faculty', 'Faculty coordinators'],
  ['member', 'Team members'],
];

const ICONS = {linkedin: Linkedin, github: Github, instagram: Instagram, youtube: Youtube, email: Mail, website: Globe};

function Person({member}) {
  const links = Object.entries(member.social_links || {});
  return (
    <article className="team-card">
      {member.photo_url ? <img className="avatar" src={absUrl(member.photo_url)} alt={member.name}/> : <div className="avatar placeholder">{member.name[0]}</div>}
      <h3>{member.name}</h3>
      <small className="designation">{member.designation}</small>
      {member.responsibilities && <p>{member.responsibilities}</p>}
      <div className="socials">
        {links.map(([key, url]) => {
          const Icon = ICONS[key.toLowerCase()] || Globe;
          return <a key={key} href={url} target="_blank" rel="noreferrer" aria-label={key}><Icon size={16}/></a>;
        })}
      </div>
    </article>
  );
}

export default function Team() {
  const team = useLoad(() => api('/team'));
  if (team.loading) return <section className="section page"><Loading/></section>;
  if (team.error) return <section className="section page"><Empty text={team.error}/></section>;
  return (
    <section className="section page">
      <div className="eyebrow">THE PEOPLE BEHIND C2C</div>
      <h2>Meet the <span className="gradient">team.</span></h2>
      {team.data.length === 0 && <Empty text="Team profiles will appear here after the Admin adds them."/>}
      {GROUPS.map(([category, title]) => {
        const members = team.data.filter((m) => m.category === category);
        if (members.length === 0) return null;
        return (
          <div key={category}>
            <h3 className="subhead">{title}</h3>
            <div className="cards">{members.map((m) => <Person key={m.id} member={m}/>)}</div>
          </div>
        );
      })}
    </section>
  );
}
