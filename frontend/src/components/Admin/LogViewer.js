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

  const getLogLevelClass = (log) => {
    const content = log.message.toLowerCase();
    if (content.includes('error') || content.includes('fail')) {
      return 'log-error';
    } else if (content.includes('warn')) {
      return 'log-warning';
    } else if (content.includes('info')) {
      return 'log-info';
    } else {
      return '';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!filterText) return true;
    return log.message.toLowerCase().includes(filterText.toLowerCase());
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
        
        <div className="log-filter">
          <input
            type="text"
            placeholder="Logs filtern..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="filter-input"
          />
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
        </div>
      </div>
    </div>
  );
}

export default LogViewer;
