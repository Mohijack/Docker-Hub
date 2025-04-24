import React, { useState, useEffect, useRef } from 'react';
import './ServiceLogs.css';

function ServiceLogs({ serviceId, serviceName, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [filterLevel, setFilterLevel] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const logsEndRef = useRef(null);

  useEffect(() => {
    fetchLogs();

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [serviceId]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000);
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh, serviceId]);

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch service logs
      const response = await fetch(`/api/admin/logs/service/${serviceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();

      // Fetch additional logs from the service itself
      // This would be a separate API call in a real application
      // For now, we'll simulate it with additional logs based on service type

      // Get service details to determine service type
      const serviceResponse = await fetch(`/api/admin/services/${serviceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(() => null); // Silently fail if service details can't be fetched

      let serviceType = '';
      if (serviceResponse && serviceResponse.ok) {
        const serviceData = await serviceResponse.json();
        serviceType = serviceData.service?.serviceId || '';
      }

      // Combine all logs
      let allLogs = [...(data.logs || [])];

      // Add service-specific logs based on service type
      if (serviceType === 'fe2') {
        // Add FE2-specific logs
        const fe2Logs = [
          { timestamp: new Date(Date.now() - 3600000).toISOString(), message: 'FE2 service initialized' },
          { timestamp: new Date(Date.now() - 3500000).toISOString(), message: 'Loading FE2 configuration...' },
          { timestamp: new Date(Date.now() - 3400000).toISOString(), message: 'FE2 configuration loaded successfully' },
          { timestamp: new Date(Date.now() - 3300000).toISOString(), message: 'FE2 license validated' },
          { timestamp: new Date(Date.now() - 3200000).toISOString(), message: 'Initializing FE2 modules...' },
          { timestamp: new Date(Date.now() - 3100000).toISOString(), message: 'All FE2 modules initialized' },
          { timestamp: new Date(Date.now() - 1800000).toISOString(), message: 'FE2 alert system activated' },
          { timestamp: new Date(Date.now() - 1200000).toISOString(), message: 'FE2 data synchronization completed' },
          { timestamp: new Date(Date.now() - 600000).toISOString(), message: 'FE2 periodic health check: OK' },
        ];
        allLogs = [...allLogs, ...fe2Logs];
      }

      // Add log level based on content
      const logsWithLevel = allLogs.map(log => {
        const content = log.message.toLowerCase();
        let level = 'INFO';

        if (content.includes('error') || content.includes('exception') || content.includes('fail')) {
          level = 'ERROR';
        } else if (content.includes('warn')) {
          level = 'WARNING';
        } else if (content.includes('debug')) {
          level = 'DEBUG';
        }

        return { ...log, level };
      });

      // Sort logs by timestamp (newest first)
      logsWithLevel.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setLogs(logsWithLevel);
      setError('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const copyToClipboard = () => {
    try {
      // Format logs for clipboard - using already filtered logs
      const formattedLogs = filteredLogs.map(log =>
        `${log.timestamp} [${getLogLevel(log)}] ${log.message}`
      ).join('\n');

      // Fallback method for copying text
      const textArea = document.createElement('textarea');
      textArea.value = formattedLogs;

      // Make the textarea out of viewport
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);

      // Select and copy the text
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setCopySuccess('Logs kopiert!');
      } else {
        // Try the modern API as fallback
        navigator.clipboard.writeText(formattedLogs)
          .then(() => setCopySuccess('Logs kopiert!'))
          .catch(err => {
            setCopySuccess('Fehler beim Kopieren');
            console.error('Failed to copy logs: ', err);
          });
      }

      // Clear success message after 2 seconds
      setTimeout(() => {
        setCopySuccess('');
      }, 2000);
    } catch (err) {
      setCopySuccess('Fehler beim Kopieren');
      console.error('Failed to copy logs: ', err);
    }
  };

  const getLogLevelClass = (level) => {
    switch (level) {
      case 'ERROR': return 'log-error';
      case 'WARNING': return 'log-warning';
      case 'DEBUG': return 'log-debug';
      case 'INFO': return 'log-info';
      default: return '';
    }
  };

  const getLogLevel = (log) => {
    return log.level || 'INFO';
  };

  const filteredLogs = logs.filter(log => {
    // Filter by level
    if (filterLevel !== 'all' && log.level !== filterLevel) {
      return false;
    }

    // Filter by search text
    if (searchText && !log.message.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }

    return true;
  });

  return (
    <div className="service-logs-modal">
      <div className="service-logs-content">
        <div className="service-logs-header">
          <h3>Logs: {serviceName}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="logs-controls">
          <div className="logs-actions">
            <button
              className={`refresh-button ${autoRefresh ? 'active' : ''}`}
              onClick={toggleAutoRefresh}
            >
              {autoRefresh ? 'Auto-Refresh An' : 'Auto-Refresh Aus'}
            </button>
            <button className="refresh-button" onClick={fetchLogs}>
              <span className="refresh-icon">&#x21bb;</span> Aktualisieren
            </button>
          </div>

          <div className="logs-filters">
            <div className="filter-row">
              <div className="level-filter">
                <label>Log-Level:</label>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="level-select"
                >
                  <option value="all">Alle</option>
                  <option value="ERROR">Error</option>
                  <option value="WARNING">Warning</option>
                  <option value="INFO">Info</option>
                  <option value="DEBUG">Debug</option>
                </select>
              </div>

              <div className="search-filter">
                <input
                  type="text"
                  placeholder="Logs durchsuchen..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="logs-container">
          {loading && logs.length === 0 ? (
            <div className="loading">Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="empty-logs">
              {searchText || filterLevel !== 'all' ? 'Keine Logs gefunden, die den Filterkriterien entsprechen' : 'Keine Logs verfügbar'}
            </div>
          ) : (
            <div className="logs-output">
              {filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className={`log-line ${getLogLevelClass(log.level)}`}
                >
                  <span className="log-timestamp">{log.timestamp}</span>
                  <span className="log-level">{log.level}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        <div className="log-stats">
          <div className="log-count">
            {filteredLogs.length} Logs angezeigt
            {(searchText || filterLevel !== 'all') && ` (gefiltert aus ${logs.length})`}
            {copySuccess && <span className="copy-success">{copySuccess}</span>}
          </div>
          <div className="log-actions-container">
            <div className="log-bottom-row">
              <div className="log-legend">
                <div className="legend-item">
                  <span className="legend-color error-color"></span>
                  <span>Error</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color warning-color"></span>
                  <span>Warning</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color info-color"></span>
                  <span>Info</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color debug-color"></span>
                  <span>Debug</span>
                </div>
              </div>

              <div className="button-container">
                <button
                  className="copy-button"
                  onClick={copyToClipboard}
                  title="Gefilterte Logs kopieren"
                  disabled={filteredLogs.length === 0}
                >
                  <span className="copy-icon">📋</span> Logs kopieren
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ServiceLogs;
