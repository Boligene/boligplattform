import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BoligProvider } from "./context/BoligContext";
import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <BoligProvider>
        <App />
      </BoligProvider>
    </BrowserRouter>
  </React.StrictMode>
);
