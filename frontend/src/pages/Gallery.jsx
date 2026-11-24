import React, {useEffect, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {ChevronLeft, ChevronRight, Download, X} from 'lucide-react';
import {absUrl, api, download} from '../lib/api.js';
import {useT} from '../lib/i18n.jsx';
import {Empty, Loading, Notice, useLoad} from '../lib/ui.jsx';

export function GalleryList() {
  const {t} = useT();
  const galleries = useLoad(() => api('/galleries'));
  if (galleries.loading) return <section className="section page"><Loading text={t('loading')}/></section>;
  if (galleries.error) return <section className="section page"><Empty text={galleries.error}/></section>;
  const list = galleries.data || [];
  return (
    <section className="section page">
      <div className="eyebrow">MEMORIES</div>
      <h2>{t('gallery')} <span className="gradient">by event</span></h2>
      <div className="cards">
        {list.map((g) => (
          <Link to={`/gallery/${g.id}`} className="event event-link" key={g.id}>
            {g.cover_url ? <img className="banner" src={absUrl(g.cover_url)} alt={g.title}/> : <div className="banner placeholder"/>}
            <h3>{g.title}</h3>
            <small>{g.event_title || 'Club photos'} · {g.image_count} photos</small>
          </Link>
        ))}
        {list.length === 0 && <Empty text="Photos from completed events will appear here."/>}
      </div>
    </section>
  );
}

export default function GalleryDetail() {
  const {id} = useParams();
  const {t} = useT();
  const gallery = useLoad(() => api(`/galleries/${id}`), [id]);
  const [index, setIndex] = useState(null);
  const [msg, setMsg] = useState('');
  const images = gallery.data?.images || [];

  useEffect(() => {
    if (index === null) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') setIndex(null);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, images.length]);

  async function saveImage(image) {
    try { await download(image.download_url, '', image.name); } catch (err) { setMsg(err.message); }
  }

  async function saveZip() {
    setMsg('');
    try { await download(`/api/galleries/${id}/zip`, '', `${gallery.data.title}.zip`); } catch (err) { setMsg(err.message); }
  }

  if (gallery.loading) return <section className="section page"><Loading text={t('loading')}/></section>;
  if (gallery.error) return <section className="section page"><Empty text={gallery.error}/></section>;
  const current = index !== null ? images[index] : null;

  return (
    <section className="section page">
      <Link to="/gallery" className="textbtn">← {t('gallery')}</Link>
      <div className="section-head">
        <div>
          <div className="eyebrow">{gallery.data.event_title || 'GALLERY'}</div>
          <h2>{gallery.data.title}</h2>
        </div>
        {images.length > 0 && <button className="primary" onClick={saveZip}><Download size={16}/> {t('downloadAll')}</button>}
      </div>
      <Notice msg={msg} tone="error"/>
      {images.length === 0 && <Empty text="No photos have been uploaded to this gallery yet."/>}
      <div className="photo-grid">
        {images.map((img, i) => (
          <figure className="photo" key={img.id}>
            <img src={absUrl(img.url)} alt={img.name} loading="lazy" onClick={() => setIndex(i)}/>
            <button type="button" className="mini" onClick={() => saveImage(img)}><Download size={14}/> {t('download')}</button>
          </figure>
        ))}
      </div>

      {current && (
        <div className="viewer" role="dialog" aria-label="Photo viewer" onClick={() => setIndex(null)}>
          <div className="viewer-inner" onClick={(e) => e.stopPropagation()}>
            <button className="viewer-close" onClick={() => setIndex(null)} aria-label={t('close')}><X/></button>
            <button className="viewer-nav left" onClick={() => setIndex((index - 1 + images.length) % images.length)} aria-label={t('previous')}><ChevronLeft/></button>
            <img src={absUrl(current.url)} alt={current.name}/>
            <button className="viewer-nav right" onClick={() => setIndex((index + 1) % images.length)} aria-label={t('next')}><ChevronRight/></button>
            <div className="viewer-bar">
              <span>{index + 1} / {images.length}</span>
              <button className="outline" onClick={() => saveImage(current)}><Download size={14}/> {t('download')}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
