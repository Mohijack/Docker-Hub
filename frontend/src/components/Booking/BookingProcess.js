import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BookingProcess.css';

function BookingProcess() {
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      // If user is already logged in, move to step 2
      setCurrentStep(2);
    }

    // Check URL parameters for step information
    const params = new URLSearchParams(location.search);
    const stepParam = params.get('step');
    if (stepParam) {
      const step = parseInt(stepParam);
      if (!isNaN(step) && step >= 1 && step <= 3) {
        setCurrentStep(step);
      }
    }
  }, [location.search]);

  const handleStepClick = (step) => {
    // Only allow going to steps that are accessible
    if (step === 1 || (user && step <= 3)) {
      setCurrentStep(step);
      navigate(`/booking?step=${step}`);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <h2>Schritt 1: Registrieren oder Anmelden</h2>
            <p>Um einen FE2-Service zu buchen, benötigen Sie ein Konto bei BeyondFire Cloud.</p>
            <div className="step-actions">
              <button 
                className="btn-primary" 
                onClick={() => navigate('/register')}
              >
                Registrieren
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => navigate('/login')}
              >
                Anmelden
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="step-content">
            <h2>Schritt 2: Service auswählen</h2>
            <p>Wählen Sie den FE2-Service aus und konfigurieren Sie ihn nach Ihren Bedürfnissen.</p>
            <div className="service-preview fe2-preview">
              <h3>FE2 - Feuerwehr Einsatzleitsystem</h3>
              <p>Professionelles Einsatzleitsystem für Feuerwehren mit Alarmierung und Einsatzkoordination.</p>
              <div className="service-price">Starting at $19.99/month</div>
              <div className="service-features">
                <ul>
                  <li>Empfang und Verarbeitung von Alarmierungen</li>
                  <li>Automatische Benachrichtigung von Einsatzkräften</li>
                  <li>Einsatzdokumentation und -verwaltung</li>
                  <li>Schnittstellen zu verschiedenen Alarmierungssystemen</li>
                </ul>
              </div>
            </div>
            <div className="step-actions">
              <button 
                className="btn-primary" 
                onClick={() => handleStepClick(3)}
              >
                Service auswählen
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="step-content">
            <h2>Schritt 3: Service konfigurieren und deployen</h2>
            <p>Konfigurieren Sie Ihren FE2-Service und stellen Sie ihn bereit.</p>
            <div className="config-form">
              <div className="form-group">
                <label htmlFor="serviceName">Name des Services</label>
                <input 
                  type="text" 
                  id="serviceName" 
                  placeholder="z.B. FE2-Feuerwehr-Musterhausen"
                />
              </div>
              <div className="form-group">
                <label htmlFor="subdomain">Subdomain (optional)</label>
                <div className="subdomain-input">
                  <input 
                    type="text" 
                    id="subdomain" 
                    placeholder="ihre-feuerwehr"
                  />
                  <span className="domain-suffix">.beyondfire.cloud</span>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="licenseKey">Alamos Lizenzschlüssel</label>
                <input 
                  type="text" 
                  id="licenseKey" 
                  placeholder="Ihr FE2 Lizenzschlüssel"
                />
              </div>
            </div>
            <div className="step-actions">
              <button 
                className="btn-primary" 
                onClick={() => navigate('/dashboard')}
              >
                Service deployen
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => handleStepClick(2)}
              >
                Zurück
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="booking-process">
      <div className="step-indicator">
        <div 
          className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}
          onClick={() => handleStepClick(1)}
        >
          <div className="step-number">1</div>
          <div className="step-label">Registrieren</div>
        </div>
        <div className="step-connector"></div>
        <div 
          className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}
          onClick={() => handleStepClick(2)}
        >
          <div className="step-number">2</div>
          <div className="step-label">Service auswählen</div>
        </div>
        <div className="step-connector"></div>
        <div 
          className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}
          onClick={() => handleStepClick(3)}
        >
          <div className="step-number">3</div>
          <div className="step-label">Deployen</div>
        </div>
      </div>

      {renderStepContent()}
    </div>
  );
}

export default BookingProcess;
