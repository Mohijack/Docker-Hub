import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BookingProcess.css';

function BookingProcess() {
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    serviceName: '',
    subdomain: '',
    licenseEmail: 'philipp.dasilva@e.bosch.com', // Default value
    licensePassword: 'PG1hQcUIDLxY' // Default value
  });

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

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: value
    });
  };

  const handleDeployService = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');

      // First, book the service
      const bookResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceId: 'fe2-docker',
          customName: formData.serviceName,
          customDomain: formData.subdomain,
          licenseInfo: {
            email: formData.licenseEmail,
            password: formData.licensePassword
          }
        })
      });

      const bookData = await bookResponse.json();

      if (!bookResponse.ok) {
        throw new Error(bookData.error || 'Failed to book service');
      }

      // Then, deploy the service
      const deployResponse = await fetch(`/api/bookings/${bookData.bookingId}/deploy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const deployData = await deployResponse.json();

      if (!deployResponse.ok) {
        throw new Error(deployData.error || 'Failed to deploy service');
      }

      setSuccess('FE2-Service erfolgreich gebucht und wird bereitgestellt. Sie werden zum Dashboard weitergeleitet...');

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
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
            <h2>Schritt 2: FE2-Service konfigurieren</h2>
            <p>Konfigurieren Sie Ihren FE2-Service mit einem Namen und einer optionalen Subdomain.</p>
            <div className="config-form">
              <div className="form-group">
                <label htmlFor="serviceName">Name des Services</label>
                <input
                  type="text"
                  id="serviceName"
                  placeholder="z.B. FE2-Feuerwehr-Musterhausen"
                  value={formData.serviceName}
                  onChange={handleInputChange}
                  required
                />
                <small>Dieser Name wird in Ihrem Dashboard angezeigt.</small>
              </div>
              <div className="form-group">
                <label htmlFor="subdomain">Subdomain (optional)</label>
                <div className="subdomain-input">
                  <input
                    type="text"
                    id="subdomain"
                    placeholder="ihre-feuerwehr"
                    value={formData.subdomain}
                    onChange={handleInputChange}
                  />
                  <span className="domain-suffix">.beyondfire.cloud</span>
                </div>
                <small>Leer lassen für automatisch generierte Subdomain.</small>
              </div>
            </div>
            <div className="step-actions">
              <button
                className="btn-primary"
                onClick={() => handleStepClick(3)}
                disabled={!formData.serviceName}
              >
                Weiter
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="step-content">
            <h2>Schritt 3: Alamos FE2 Lizenzinformationen</h2>
            <p>Geben Sie Ihre Alamos FE2 Lizenzinformationen ein, um den Service zu aktivieren.</p>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <div className="config-form">
              <div className="license-section">
                <h4>Alamos FE2 Lizenzinformationen</h4>
                <p>Diese Informationen werden für die Aktivierung Ihres FE2-Systems benötigt.</p>
              </div>
              <div className="form-group">
                <label htmlFor="licenseEmail">E-Mail-Adresse</label>
                <input
                  type="email"
                  id="licenseEmail"
                  placeholder="ihre-email@beispiel.de"
                  value={formData.licenseEmail}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="licensePassword">Passwort</label>
                <input
                  type="password"
                  id="licensePassword"
                  placeholder="Ihr Alamos FE2 Passwort"
                  value={formData.licensePassword}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="step-actions">
              <button
                className="btn-primary"
                onClick={handleDeployService}
                disabled={loading || !formData.licenseEmail || !formData.licensePassword}
              >
                {loading ? 'Wird bereitgestellt...' : 'Service bereitstellen'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => handleStepClick(2)}
                disabled={loading}
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
          <div className="step-label">FE2 konfigurieren</div>
        </div>
        <div className="step-connector"></div>
        <div
          className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}
          onClick={() => handleStepClick(3)}
        >
          <div className="step-number">3</div>
          <div className="step-label">Bereitstellen</div>
        </div>
      </div>

      {renderStepContent()}
    </div>
  );
}

export default BookingProcess;
