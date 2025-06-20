import * as React from 'react';
import AuthForm from '../components/AuthForm';

const Login: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[url('/bg-livingroom-compressed.webp')] bg-cover bg-center bg-no-repeat bg-fixed flex flex-col overflow-x-hidden">
      <main className="flex flex-col items-center justify-center flex-1 w-full">
        <div className="bg-white/80 rounded-2xl shadow-xl p-2 sm:p-6 md:p-10 w-full max-w-md flex flex-col items-center mb-8">
          <h2 className="text-3xl font-seriflogo font-bold text-brown-900 text-center mb-6 leading-tight">
            Logg inn på Boligplattformen
          </h2>
          <AuthForm />
        </div>
      </main>
    </div>
  );
};

export default Login; 