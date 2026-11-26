import { Link } from 'react-router-dom';

export function Brand() {
  return (
    <Link to="/" aria-label="EChat home" className="brand-lockup">
      <span className="brand-mark">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="EChat logo"
          className="h-5 w-5 sm:h-5.5 sm:w-5.5 object-contain select-none"
          draggable="false"
        />
      </span>
      <span className="brand-word">EChat<span className="text-brand-400">.</span></span>
    </Link>
  );
}
