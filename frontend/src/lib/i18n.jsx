import React, {createContext, useContext, useEffect, useState} from 'react';

// English and Hindi strings. Keys missing in Hindi fall back to English.
const DICT = {
  en: {
    home: 'Home', about: 'About Us', events: 'Events', team: 'Team', gallery: 'Gallery', contact: 'Contact',
    calendar: 'Calendar', announcements: 'Announcements', recruitment: 'Recruitment', resources: 'Resources',
    login: 'Login', logout: 'Logout', dashboard: 'Dashboard', register: 'Register', joinClub: 'Join Our Club',
    exploreEvents: 'Explore Events', meetTeam: 'Meet Our Team', exploreGallery: 'Explore Gallery',
    upcoming: 'Upcoming events', completed: 'Featured completed events', save: 'Save', cancel: 'Cancel',
    delete: 'Delete', edit: 'Edit', search: 'Search', loading: 'Loading...', noItems: 'Nothing here yet.',
    email: 'Email', password: 'Password', name: 'Full name', phone: 'Phone number', submit: 'Submit',
    registrationOpen: 'Registration open', registrationClosed: 'Registration closed',
    registerNow: 'Register now', venue: 'Venue', eligibility: 'Eligibility', rules: 'Rules and guidelines',
    prizes: 'Prizes', faqs: 'FAQs', eventDate: 'Event date', regOpens: 'Registration opens',
    regCloses: 'Registration closes', countdown: 'Countdown', individual: 'Individual', team_: 'Team',
    downloadAll: 'Download all photos (ZIP)', download: 'Download', previous: 'Previous', next: 'Next',
    close: 'Close', aiTitle: 'AI Assistant - Coming Soon', aiText: 'Your club companion is getting ready.',
    language: 'Language', welcomeBack: 'Welcome back', joinCommunity: 'Join the community',
    portal: 'C2C Portal', forgotPassword: 'Forgot password?', resetPassword: 'Reset password',
    confirmDelete: 'Are you sure you want to delete this? This cannot be undone.',
  },
  hi: {
    home: 'होम', about: 'हमारे बारे में', events: 'इवेंट्स', team: 'टीम', gallery: 'गैलरी', contact: 'संपर्क',
    calendar: 'कैलेंडर', announcements: 'घोषणाएँ', recruitment: 'भर्ती', resources: 'संसाधन',
    login: 'लॉग इन', logout: 'लॉग आउट', dashboard: 'डैशबोर्ड', register: 'रजिस्टर करें', joinClub: 'क्लब से जुड़ें',
    exploreEvents: 'इवेंट देखें', meetTeam: 'हमारी टीम से मिलें', exploreGallery: 'गैलरी देखें',
    upcoming: 'आगामी इवेंट्स', completed: 'पूर्ण हुए प्रमुख इवेंट्स', save: 'सहेजें', cancel: 'रद्द करें',
    delete: 'हटाएँ', edit: 'संपादित करें', search: 'खोजें', loading: 'लोड हो रहा है...', noItems: 'अभी यहाँ कुछ नहीं है।',
    email: 'ईमेल', password: 'पासवर्ड', name: 'पूरा नाम', phone: 'फ़ोन नंबर', submit: 'जमा करें',
    registrationOpen: 'रजिस्ट्रेशन खुला है', registrationClosed: 'रजिस्ट्रेशन बंद है',
    registerNow: 'अभी रजिस्टर करें', venue: 'स्थान', eligibility: 'पात्रता', rules: 'नियम और दिशा-निर्देश',
    prizes: 'पुरस्कार', faqs: 'सामान्य प्रश्न', eventDate: 'इवेंट की तारीख', regOpens: 'रजिस्ट्रेशन शुरू',
    regCloses: 'रजिस्ट्रेशन समाप्त', countdown: 'उल्टी गिनती', individual: 'व्यक्तिगत', team_: 'टीम',
    downloadAll: 'सभी फ़ोटो डाउनलोड करें (ZIP)', download: 'डाउनलोड', previous: 'पिछला', next: 'अगला',
    close: 'बंद करें', aiTitle: 'AI असिस्टेंट - जल्द आ रहा है', aiText: 'आपका क्लब साथी तैयार हो रहा है।',
    language: 'भाषा', welcomeBack: 'वापसी पर स्वागत है', joinCommunity: 'समुदाय से जुड़ें',
    portal: 'C2C पोर्टल', forgotPassword: 'पासवर्ड भूल गए?', resetPassword: 'पासवर्ड रीसेट करें',
    confirmDelete: 'क्या आप वाकई इसे हटाना चाहते हैं? यह वापस नहीं होगा।',
  },
};

const LangContext = createContext(null);

export function LangProvider({children}) {
  const [lang, setLang] = useState(() => localStorage.getItem('c2c_lang') || 'en');
  useEffect(() => { localStorage.setItem('c2c_lang', lang); }, [lang]);
  const t = (key) => DICT[lang]?.[key] ?? DICT.en[key] ?? key;
  return <LangContext.Provider value={{lang, setLang, t}}>{children}</LangContext.Provider>;
}

export function useT() {
  return useContext(LangContext);
}
