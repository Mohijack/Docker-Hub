import React, { useState, useEffect, useRef } from 'react';
import './LogViewer.css';

function LogViewer() {
  const [logType, setLogType] = useState('frontend');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [filterText, setFilterText] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [copySuccess, setCopySuccess] = useState('');
  const logsEndRef = useRef(null);

  useEffect(() => {
    fetchLogs();
    fetchServices();

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [logType, selectedService]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000);
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh, logType, selectedService]);

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch('/api/admin/services', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }

      const data = await response.json();
      setServices(data.services);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      let url = `/api/admin/logs/${logType}`;
      if (logType === 'service' && selectedService) {
        url = `/api/admin/logs/service/${selectedService}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data.logs || []);
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

  const handleLogTypeChange = (type) => {
    setLogType(type);
    setSelectedService('');
  };

  const handleServiceChange = (e) => {
    setSelectedService(e.target.value);
  };

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const copyToClipboard = (level) => {
    try {
      // Filter logs by level if specified
      const logsToCopy = level === 'all'
        ? filteredLogs
        : filteredLogs.filter(log => {
            const logLevel = getLogLevel(log);
            return level === 'error' && logLevel === 'ERROR' ||
                   level === 'warning' && logLevel === 'WARNING' ||
                   level === 'info' && logLevel === 'INFO' ||
                   level === 'debug' && logLevel === 'DEBUG';
          });

      // Format logs for clipboard
      const formattedLogs = logsToCopy.map(log =>
        `${log.timestamp} [${getLogLevel(log)}] ${log.message}`
      ).join('\n');

      navigator.clipboard.writeText(formattedLogs);
      setCopySuccess('Logs kopiert!');

      // Clear success message after 2 seconds
      setTimeout(() => {
        setCopySuccess('');
      }, 2000);
    } catch (err) {
      setCopySuccess('Fehler beim Kopieren');
      console.error('Failed to copy logs: ', err);
    }
  };

  const getLogLevelClass = (log) => {
    const content = log.message.toLowerCase();
    if (content.includes('error') || content.includes('exception') || content.includes('fail')) {
      return 'log-error';
    } else if (content.includes('warn')) {
      return 'log-warning';
    } else if (content.includes('debug')) {
      return 'log-debug';
    } else if (content.includes('info')) {
      return 'log-info';
    } else {
      return '';
    }
  };

  const getLogLevel = (log) => {
    const content = log.message.toLowerCase();
    if (content.includes('error') || content.includes('exception') || content.includes('fail')) {
      return 'ERROR';
    } else if (content.includes('warn')) {
      return 'WARNING';
    } else if (content.includes('debug')) {
      return 'DEBUG';
    } else {
      return 'INFO';
    }
  };

  const filteredLogs = logs.filter(log => {
    // Filter by level
    if (filterLevel !== 'all' && getLogLevel(log) !== filterLevel) {
      return false;
    }

    // Filter by search text
    if (filterText && !log.message.toLowerCase().includes(filterText.toLowerCase())) {
      return false;
    }

    return true;
  });

  return (
    <div className="log-viewer">
      <div className="log-viewer-header">
        <h2>System Logs</h2>
        <div className="log-actions">
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
      </div>

      <div className="log-controls">
        <div className="log-type-tabs">
          <button
            className={`log-type-tab ${logType === 'frontend' ? 'active' : ''}`}
            onClick={() => handleLogTypeChange('frontend')}
          >
            Frontend
          </button>
          <button
            className={`log-type-tab ${logType === 'backend' ? 'active' : ''}`}
            onClick={() => handleLogTypeChange('backend')}
          >
            Backend
          </button>
          <button
            className={`log-type-tab ${logType === 'service' ? 'active' : ''}`}
            onClick={() => handleLogTypeChange('service')}
          >
            Services
          </button>
        </div>

        <div className="log-filters">
          <div className="filter-row">
            {logType === 'service' && (
              <div className="service-selector">
                <select
                  value={selectedService}
                  onChange={handleServiceChange}
                  className="service-select"
                >
                  <option value="">Wählen Sie einen Service</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.customName} ({service.domain})
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                placeholder="Logs filtern..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="filter-input"
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
            {filterText ? 'Keine Logs gefunden, die dem Filter entsprechen' : 'Keine Logs verfügbar'}
          </div>
        ) : (
          <div className="logs-output">
            {filteredLogs.map((log, index) => (
              <div
                key={index}
                className={`log-line ${getLogLevelClass(log)}`}
              >
                <span className="log-timestamp">{log.timestamp}</span>
                <span className="log-level">{getLogLevel(log)}</span>
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
          {filterText && ` (gefiltert aus ${logs.length})`}
          {copySuccess && <span className="copy-success">{copySuccess}</span>}
        </div>
        <div className="log-actions-container">
          <div className="copy-buttons">
            <button
              className="copy-button all-button"
              onClick={() => copyToClipboard('all')}
              title="Alle angezeigten Logs kopieren"
            >
              <span className="copy-icon">📋</span> Alle kopieren
            </button>
            <button
              className="copy-button error-button"
              onClick={() => copyToClipboard('error')}
              title="Nur Error-Logs kopieren"
            >
              <span className="copy-icon">📋</span> Errors
            </button>
            <button
              className="copy-button warning-button"
              onClick={() => copyToClipboard('warning')}
              title="Nur Warning-Logs kopieren"
            >
              <span className="copy-icon">📋</span> Warnings
            </button>
            <button
              className="copy-button info-button"
              onClick={() => copyToClipboard('info')}
              title="Nur Info-Logs kopieren"
            >
              <span className="copy-icon">📋</span> Infos
            </button>
            <button
              className="copy-button debug-button"
              onClick={() => copyToClipboard('debug')}
              title="Nur Debug-Logs kopieren"
            >
              <span className="copy-icon">📋</span> Debug
            </button>
          </div>
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
        </div>
      </div>
    </div>
  );
}

export default LogViewer;
