import { supabase } from '@boligplattform/core';
import { Building2, Calculator, HelpCircle, Home, Menu, Star, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LogoutButton from './LogoutButton';

export const TransparentNavigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };
    getSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const navLinks = [
    { to: "/", label: "Hjem", icon: <Home className="w-4 h-4" /> },
    { to: "/boliger", label: "Boliger", icon: <Building2 className="w-4 h-4" /> },
    { to: "/ai-boligassistent", label: "AI-Assistent", icon: <Star className="w-4 h-4" /> },
    { to: "/kalkulatorer", label: "Kalkulatorer", icon: <Calculator className="w-4 h-4" /> },
    { to: "/hjelpeverktoy-for-boligkjopere", label: "Hjelpeverktøy", icon: <HelpCircle className="w-4 h-4" /> }
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-lg border-b border-brown-100 shadow-sm pt-safe">
      <div className="max-w-screen-xl mx-auto px-4 pl-safe pr-safe">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link 
            to="/" 
            className="font-seriflogo text-2xl md:text-3xl font-bold text-brown-900 hover:text-brown-700 transition-colors"
          >
            Boligene
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-2 px-4 py-2 text-brown-700 hover:text-brown-900 hover:bg-brown-50 rounded-lg font-medium transition-all tap-target group"
              >
                <span className="text-brown-500 group-hover:text-brown-700 transition-colors">
                  {link.icon}
                </span>
                {link.label}
              </Link>
            ))}
            
            {/* Separator */}
            <div className="w-px h-6 bg-brown-200 mx-2"></div>
            
            {/* Authentication */}
            {user ? (
              <LogoutButton />
            ) : (
              <Link
                to="/login"
                className="rounded-full px-6 py-2 bg-brown-600 text-white font-semibold hover:bg-brown-700 hover:scale-105 transition-all shadow-md tap-target"
              >
                Logg inn
              </Link>
            )}
          </div>

          {/* Mobile/Tablet Navigation */}
          <div className="hidden md:flex lg:hidden items-center space-x-1">
            {navLinks.slice(0, 3).map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center justify-center w-10 h-10 text-brown-700 hover:text-brown-900 hover:bg-brown-50 rounded-lg transition-all tap-target"
                title={link.label}
              >
                {link.icon}
              </Link>
            ))}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center justify-center w-10 h-10 text-brown-700 hover:text-brown-900 hover:bg-brown-50 rounded-lg transition-all tap-target"
              aria-label="Flere alternativer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden tap-target flex items-center justify-center w-12 h-12 rounded-lg bg-brown-50 text-brown-800 hover:bg-brown-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden bg-white/98 backdrop-blur-lg rounded-b-2xl shadow-xl border border-brown-100 border-t-0 mb-2">
            <div className="px-4 py-6 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 py-3 px-4 text-brown-800 hover:text-brown-900 hover:bg-brown-50 rounded-xl font-medium transition-all tap-target"
                >
                  <span className="text-brown-500">
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              ))}
              
              {/* Divider */}
              <div className="border-t border-brown-100 my-4"></div>
              
              {/* Mobile Authentication */}
              {user ? (
                <div onClick={() => setIsMenuOpen(false)}>
                  <LogoutButton />
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center py-3 px-6 bg-brown-600 text-white font-semibold rounded-xl hover:bg-brown-700 transition-all tap-target"
                >
                  Logg inn
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}; 