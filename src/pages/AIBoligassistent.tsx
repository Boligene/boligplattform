import React from 'react';
import { AIBoligassistent } from '../components/AIBoligassistent';

const AIBoligassistentPage: React.FC = () => {
  console.log('AIBoligassistentPage is rendering');
  
  try {
    return (
      <div className="min-h-screen w-full bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat bg-fixed flex flex-col overflow-x-hidden">
        <main className="flex flex-col items-center justify-center flex-1 w-full">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <AIBoligassistent />
          </div>
        </main>
      </div>
    );
  } catch (error) {
    console.error('Error rendering AIBoligassistent component:', error);
    return (
      <div style={{ padding: '20px', backgroundColor: 'red', color: 'white' }}>
        <h1>FEIL I AI KOMPONENTEN</h1>
        <p>Noe gikk galt: {String(error)}</p>
        <p>Se konsollen for mer info</p>
      </div>
    );
  }
};

export default AIBoligassistentPage; 