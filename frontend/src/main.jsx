import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import './style.css';
import App from './App.jsx';
import {AuthProvider} from './lib/auth.jsx';
import {LangProvider} from './lib/i18n.jsx';
import {ContentProvider} from './components/Layout.jsx';

createRoot(document.getElementById('root')).render(
  <LangProvider>
    <AuthProvider>
      <ContentProvider>
        <BrowserRouter>
          <App/>
        </BrowserRouter>
      </ContentProvider>
    </AuthProvider>
  </LangProvider>
);
