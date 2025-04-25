import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/bosch-theme.css';
import { getCurrentUser, logout } from './services/authService';
import api from './services/api';

// Components
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import Home from './components/Home/Home';
import Login from './components/Auth/Login';
import StepLogin from './components/Auth/StepLogin';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import AdminPanel from './components/Admin/AdminPanel';
import BookingProcess from './components/Booking/BookingProcess';
import Setup from './pages/Setup';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  // Function to check if setup is required
  const checkSetupRequired = async () => {
    try {
      const setupResponse = await api.get('/api/setup/status');
      setSetupRequired(setupResponse.data.setupRequired);
      return setupResponse.data.setupRequired;
    } catch (error) {
      console.error('Failed to check setup status:', error);
      // If we can't check setup status, assume it's not required
      setSetupRequired(false);
      return false;
    }
  };

  useEffect(() => {
    const initApp = async () => {
      // Check if setup is required
      await checkSetupRequired();

      // Check if user is logged in
      const storedUser = getCurrentUser();

      if (storedUser) {
        setUser(storedUser);
      }

      setLoading(false);
    };

    initApp();
  }, []);

  // Make checkSetupRequired available to child components
  window.checkSetupRequired = checkSetupRequired;

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // Determine if we're on the setup page
  const isSetupPage = window.location.pathname === '/setup' && setupRequired;

  return (
    <Router>
      <div className="App">
        {/* Don't show navbar on setup page */}
        {!isSetupPage && <Navbar user={user} onLogout={handleLogout} />}

        <main className={isSetupPage ? "main-content setup-page" : "main-content"}>
          <Routes>
            {/* Setup route - takes precedence if setup is required */}
            <Route
              path="/setup"
              element={setupRequired ? <Setup /> : <Navigate to="/login" />}
            />

            {/* Redirect to setup if required */}
            <Route
              path="/"
              element={setupRequired ? <Navigate to="/setup" /> : <Home />}
            />

            <Route
              path="/login"
              element={
                setupRequired
                  ? <Navigate to="/setup" />
                  : (user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />)
              }
            />

            <Route
              path="/login-step"
              element={
                setupRequired
                  ? <Navigate to="/setup" />
                  : (user ? <Navigate to="/booking?step=2" /> : <StepLogin onLogin={handleLogin} />)
              }
            />

            <Route
              path="/register"
              element={
                setupRequired
                  ? <Navigate to="/setup" />
                  : (user
                    ? <Navigate to={new URLSearchParams(window.location.search).get('redirect') === 'booking'
                        ? '/booking?step=2'
                        : '/dashboard'}
                      />
                    : <Register />
                  )
              }
            />

            <Route
              path="/dashboard"
              element={
                setupRequired
                  ? <Navigate to="/setup" />
                  : (user ? <Dashboard user={user} /> : <Navigate to="/login" />)
              }
            />

            <Route
              path="/booking"
              element={
                setupRequired
                  ? <Navigate to="/setup" />
                  : <BookingProcess />
              }
            />

            <Route
              path="/admin/*"
              element={
                setupRequired
                  ? <Navigate to="/setup" />
                  : (user && user.role === 'admin'
                    ? <AdminPanel user={user} />
                    : <Navigate to="/dashboard" />
                  )
              }
            />
          </Routes>
        </main>

        {/* Don't show footer on setup page */}
        {!isSetupPage && <Footer />}
      </div>
    </Router>
  );
}

export default App;
