import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Route, Clock, User } from 'lucide-react';

const tabs = [
  { to: '/dashboard', icon: Home, label: 'Accueil' },
  { to: '/tournee', icon: Route, label: 'Tournée' },
  { to: '/historique', icon: Clock, label: 'Historique' },
  { to: '/profil', icon: User, label: 'Profil' },
];

export default function BottomNav() {
  const location = useLocation();

  // Hide on releve pages
  if (location.pathname.startsWith('/releve/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border pb-safe z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[64px] ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : ''}`}>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
