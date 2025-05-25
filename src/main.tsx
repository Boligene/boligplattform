import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BoligProvider } from "./context/BoligContext";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BoligProvider>
      <App />
    </BoligProvider>
  </React.StrictMode>
);

