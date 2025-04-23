import React, { useState } from 'react';

function BookingList({ bookings, onDeploy, onSuspend, onResume }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionBookingId, setActionBookingId] = useState(null);

  const handleAction = async (action, bookingId) => {
    setError('');
    setSuccess('');
    setLoading(true);
    setActionBookingId(bookingId);

    try {
      let result;
      let successMessage;

      switch (action) {
        case 'deploy':
          result = await onDeploy(bookingId);
          successMessage = 'Bereitstellung erfolgreich gestartet!';
          break;
        case 'suspend':
          result = await onSuspend(bookingId);
          successMessage = 'Dienst erfolgreich pausiert!';
          break;
        case 'resume':
          result = await onResume(bookingId);
          successMessage = 'Dienst erfolgreich fortgesetzt!';
          break;
        default:
          throw new Error('Invalid action');
      }

      if (!result.success) {
        throw new Error(result.error);
      }

      setSuccess(successMessage);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
      setActionBookingId(null);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'pending':
        return 'status-pending';
      case 'deploying':
        return 'status-deploying';
      case 'suspended':
        return 'status-suspended';
      case 'failed':
        return 'status-failed';
      default:
        return '';
    }
  };

  if (bookings.length === 0) {
    return (
      <div className="empty-state">
        <p>Sie haben noch keine Dienste. Buchen Sie einen Dienst, um zu beginnen!</p>
      </div>
    );
  }

  return (
    <div className="booking-list">
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="booking-table">
        <div className="booking-header">
          <div className="booking-cell">Dienst</div>
          <div className="booking-cell">Domain</div>
          <div className="booking-cell">Status</div>
          <div className="booking-cell">Aktionen</div>
        </div>

        {bookings.map(booking => (
          <div key={booking.id} className="booking-row">
            <div className="booking-cell">
              <div className="service-name">{booking.customName}</div>
              <div className="service-type">{booking.serviceName}</div>
            </div>
            <div className="booking-cell">
              <a
                href={`http://${booking.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className={booking.status === 'active' ? 'domain-link' : 'domain-link disabled'}
              >
                {booking.domain}
              </a>
            </div>
            <div className="booking-cell">
              <span className={`status-badge ${getStatusClass(booking.status)}`}>
                {booking.status === 'active' && 'Aktiv'}
                {booking.status === 'pending' && 'Ausstehend'}
                {booking.status === 'deploying' && 'Wird bereitgestellt'}
                {booking.status === 'suspended' && 'Pausiert'}
                {booking.status === 'failed' && 'Fehlgeschlagen'}
              </span>
            </div>
            <div className="booking-cell">
              {booking.status === 'pending' && (
                <button
                  className="btn-action"
                  onClick={() => handleAction('deploy', booking.id)}
                  disabled={loading && actionBookingId === booking.id}
                >
                  {loading && actionBookingId === booking.id ? 'Wird bereitgestellt...' : 'Bereitstellen'}
                </button>
              )}
              {booking.status === 'active' && (
                <button
                  className="btn-action btn-suspend"
                  onClick={() => handleAction('suspend', booking.id)}
                  disabled={loading && actionBookingId === booking.id}
                >
                  {loading && actionBookingId === booking.id ? 'Wird pausiert...' : 'Pausieren'}
                </button>
              )}
              {booking.status === 'suspended' && (
                <button
                  className="btn-action"
                  onClick={() => handleAction('resume', booking.id)}
                  disabled={loading && actionBookingId === booking.id}
                >
                  {loading && actionBookingId === booking.id ? 'Wird fortgesetzt...' : 'Fortsetzen'}
                </button>
              )}
              {booking.status === 'failed' && (
                <button
                  className="btn-action"
                  onClick={() => handleAction('deploy', booking.id)}
                  disabled={loading && actionBookingId === booking.id}
                >
                  {loading && actionBookingId === booking.id ? 'Wird wiederholt...' : 'Wiederholen'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BookingList;
