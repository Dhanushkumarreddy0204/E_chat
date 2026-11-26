import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Brand() {
  return (
    <Link to="/" aria-label="EChat home" className="brand-lockup">
      <span className="brand-mark"><MessageCircle size={21} strokeWidth={2.1} /></span>
      <span className="brand-word">EChat<span className="text-brand-400">.</span></span>
    </Link>
  );
}
