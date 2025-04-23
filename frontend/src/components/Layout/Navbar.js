import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Call the onLogout callback
    onLogout();

    // Redirect to home
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <img src="/logo.svg" alt="BeyondFire Cloud Logo" width="200" height="40" />
          <span>BeyondFire Cloud</span>
        </Link>

        <div className="navbar-menu">
          <Link to="/" className="navbar-item">Home</Link>
          <Link to="/#features" className="navbar-item">Vorteile</Link>
          <Link to="/#services" className="navbar-item">Dienste</Link>

          {user ? (
            <>
              <Link to="/dashboard" className="navbar-item">Dashboard</Link>
              <button onClick={handleLogout} className="navbar-item logout-button">
                Abmelden
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-item">Anmelden</Link>
              <Link to="/register" className="navbar-item register-button">
                Registrieren
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
