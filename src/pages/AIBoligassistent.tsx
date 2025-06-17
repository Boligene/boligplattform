import React from 'react';
import { AIBoligassistent } from '../components/AIBoligassistent';

const AIBoligassistentPage: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat bg-fixed flex flex-col overflow-x-hidden">
      <main className="flex flex-col items-center justify-center flex-1 w-full">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <AIBoligassistent />
        </div>
      </main>
    </div>
  );
};

export default AIBoligassistentPage; 