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

      const response = await fetch(`/api/admin/logs/service/${serviceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();

      // Add log level based on content
      const logsWithLevel = (data.logs || []).map(log => {
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

  const copyToClipboard = (level) => {
    try {
      // Filter logs by level if specified
      const logsToCopy = level === 'all'
        ? filteredLogs
        : filteredLogs.filter(log => getLogLevelClass(log).includes(level));

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

  const getLogLevelClass = (level) => {
    switch (level) {
      case 'ERROR': return 'log-error';
      case 'WARNING': return 'log-warning';
      case 'DEBUG': return 'log-debug';
      case 'INFO': return 'log-info';
      default: return '';
    }
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
    </div>
  );
}

export default ServiceLogs;
