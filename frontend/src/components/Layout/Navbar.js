import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Layout.css';

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
          BeyondFire Cloud
        </Link>
        
        <div className="navbar-menu">
          <Link to="/" className="navbar-item">Home</Link>
          
          {user ? (
            <>
              <Link to="/dashboard" className="navbar-item">Dashboard</Link>
              <button onClick={handleLogout} className="navbar-item logout-button">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-item">Login</Link>
              <Link to="/register" className="navbar-item register-button">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
