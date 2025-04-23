import React from 'react';
import './Layout.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>BeyondFire Cloud</h3>
            <p>Your platform for easy Docker container deployment with Portainer and Cloudflare integration.</p>
          </div>
          
          <div className="footer-section">
            <h3>Quick Links</h3>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/dashboard">Dashboard</a></li>
              <li><a href="/login">Login</a></li>
              <li><a href="/register">Register</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>Contact</h3>
            <p>Email: support@beyondfire.cloud</p>
            <p>Phone: +49 123 456789</p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} BeyondFire Cloud. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
