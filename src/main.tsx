import './index.css';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
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
