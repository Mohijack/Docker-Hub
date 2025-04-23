import React, { useState } from 'react';

function ServiceList({ services, onBook }) {
  const [selectedService, setSelectedService] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSelectService = (service) => {
    setSelectedService(service);
    setCustomName(service.name);
    setCustomDomain('');
    setError('');
    setSuccess('');
  };

  const handleBookService = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await onBook(selectedService.id, customName, customDomain);

      if (!result.success) {
        throw new Error(result.error);
      }

      setSuccess(`${customName} wurde erfolgreich gebucht!`);
      setSelectedService(null);
      setCustomName('');
      setCustomDomain('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="service-list">
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {selectedService ? (
        <div className="booking-form">
          <h3>{selectedService.name} buchen</h3>
          <p className="service-description">{selectedService.description}</p>
          <p className="service-price">{selectedService.price} €/Monat</p>

          <form onSubmit={handleBookService}>
            <div className="form-group">
              <label htmlFor="customName">Dienstname</label>
              <input
                type="text"
                id="customName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="customDomain">Benutzerdefinierte Subdomain (Optional)</label>
              <div className="domain-input">
                <input
                  type="text"
                  id="customDomain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="meine-feuerwehr"
                />
                <span className="domain-suffix">.beyondfire.cloud</span>
              </div>
              <small>Leer lassen für automatisch generierte Subdomain</small>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedService(null)}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Wird gebucht...' : 'Jetzt buchen'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="service-grid">
          {services.map(service => (
            <div key={service.id} className="service-card">
              <h3>{service.name}</h3>
              <p className="service-description">{service.description}</p>
              <div className="service-details">
                <div className="service-resources">
                  <div>CPU: {service.resources.cpu}</div>
                  <div>Memory: {service.resources.memory}</div>
                  <div>Storage: {service.resources.storage}</div>
                </div>
                <div className="service-price">{service.price} €/Monat</div>
              </div>
              <button
                className="btn-primary"
                onClick={() => handleSelectService(service)}
              >
                Jetzt buchen
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ServiceList;
