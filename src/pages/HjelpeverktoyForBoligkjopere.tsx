import * as React from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare } from 'lucide-react';

const HjelpeverktoyForBoligkjopere: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat bg-fixed">
      <div className="bg-white/80 rounded-2xl shadow-xl p-10 w-full max-w-xl mt-10 flex flex-col items-center">
        <h2 className="text-3xl font-seriflogo font-bold text-brown-900 mb-6">Hjelpeverktøy for boligkjøpere</h2>
        <div className="flex flex-col gap-6 w-full">
          <Link 
            to="/sjekkliste-visning" 
            className="rounded-lg bg-brown-50 px-6 py-4 font-semibold text-brown-900 hover:bg-brown-100 shadow transition flex items-center gap-3"
          >
            <CheckSquare className="w-6 h-6 text-brown-700" />
            <div>
              <div className="text-lg">Sjekkliste for visning</div>
              <div className="text-sm text-brown-600 font-normal">Systematisk sjekkliste for boligvisning</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HjelpeverktoyForBoligkjopere; 