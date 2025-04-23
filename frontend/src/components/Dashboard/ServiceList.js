import React, { useState } from 'react';
import './Dashboard.css';

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
      
      setSuccess(`Successfully booked ${customName}!`);
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
          <h3>Book {selectedService.name}</h3>
          <p className="service-description">{selectedService.description}</p>
          <p className="service-price">${selectedService.price}/month</p>
          
          <form onSubmit={handleBookService}>
            <div className="form-group">
              <label htmlFor="customName">Service Name</label>
              <input
                type="text"
                id="customName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="customDomain">Custom Subdomain (Optional)</label>
              <div className="domain-input">
                <input
                  type="text"
                  id="customDomain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="myservice"
                />
                <span className="domain-suffix">.beyondfire.cloud</span>
              </div>
              <small>Leave empty for auto-generated subdomain</small>
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setSelectedService(null)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Booking...' : 'Book Now'}
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
                <div className="service-price">${service.price}/month</div>
              </div>
              <button 
                className="btn-primary" 
                onClick={() => handleSelectService(service)}
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ServiceList;
