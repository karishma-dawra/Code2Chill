import React from 'react';
import {Link} from 'react-router-dom';
import {useContent} from '../components/Layout.jsx';

const SECTIONS = [
  ['about_intro', 'Club introduction', 'Code 2 Chill is a student technology club at Chitkara University.'],
  ['vision', 'Vision', 'To make every student a confident builder who learns by doing.'],
  ['mission', 'Mission', 'Run hands-on workshops, projects and competitions that turn ideas into working products.'],
  ['objectives', 'Club objectives', 'Teach practical programming skills.\nBuild a supportive community of makers.\nConnect students with industry and open-source work.'],
  ['what_we_do', 'What C2C does', 'We organise coding sessions, hackathons, design challenges and peer learning groups throughout the year.'],
  ['activities', 'Activities and technical initiatives', 'Weekly build nights, project showcases, technical talks and mentoring for first-year students.'],
  ['why_join', 'Why students should join', 'Learn faster with peers, build a portfolio, win prizes and get volunteering experience.'],
  ['about_extra', 'More about C2C', ''],
];

function Block({value}) {
  return <p className="pre">{value}</p>;
}

export default function About() {
  const {content} = useContent();
  return (
    <section className="section page">
      <div className="eyebrow">ABOUT THE CLUB</div>
      <h2>Ideas become <span className="gradient">reality.</span></h2>
      <div className="cards about-cards">
        {SECTIONS.map(([key, title, fallback]) => (
          <article className="panel" key={key}>
            <h3>{title}</h3>
            {content[key] ? <Block value={content[key]}/> : (fallback ? <p className="muted">{fallback}</p> : null)}
          </article>
        ))}
      </div>
      <p className="muted">Want to join? <Link to="/register">Create a student account</Link> (college email required).</p>
    </section>
  );
}
