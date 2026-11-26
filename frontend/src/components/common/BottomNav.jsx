import { NavLink } from 'react-router-dom';
import { navigation } from './navigation';

export function BottomNav() {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {navigation.filter(item => item.mobile).map(({ path, name, icon: Icon }) => (
        <NavLink key={path} to={path} end={path === '/'}>
          <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
          <span>{name}</span>
        </NavLink>
      ))}
    </nav>
  );
}
