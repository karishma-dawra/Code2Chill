import React from 'react';
import {Github, Instagram, Linkedin, Mail, MapPin, Phone, Youtube} from 'lucide-react';
import {useContent} from '../components/Layout.jsx';
import ContactForm from '../components/ContactForm.jsx';

export default function Contact() {
  const {content} = useContent();
  const socials = [
    ['social_instagram', Instagram, 'Instagram'], ['social_linkedin', Linkedin, 'LinkedIn'],
    ['social_github', Github, 'GitHub'], ['social_youtube', Youtube, 'YouTube'],
  ].filter(([key]) => content[key]);
  return (
    <section className="section page">
      <div className="eyebrow">GET IN TOUCH</div>
      <h2>Let's <span className="gradient">connect.</span></h2>
      <div className="contact-grid">
        <ContactForm/>
        <div className="panel">
          <h3>Club information</h3>
          <p><Mail size={16}/> {content.contact_email || 'To be added by the Admin'}</p>
          <p><Phone size={16}/> {content.contact_phone || 'To be added by the Admin'}</p>
          <p><MapPin size={16}/> {content.contact_address || 'To be added by the Admin'}</p>
          <h3>Social media</h3>
          <div className="socials">
            {socials.map(([key, Icon, label]) => <a key={key} href={content[key]} target="_blank" rel="noreferrer"><Icon size={16}/> {label}</a>)}
            {socials.length === 0 && <span className="muted">Social links will appear here once added.</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
