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

export default ServiceLogs;
