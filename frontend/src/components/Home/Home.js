import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <h1>Deploy Your Docker Containers with Ease</h1>
          <p>
            BeyondFire Cloud provides a simple way to deploy and manage Docker containers
            with automatic DNS configuration and Portainer integration.
          </p>
          <div className="hero-buttons">
            <Link to="/register" className="btn-primary">Get Started</Link>
            <Link to="/login" className="btn-secondary">Login</Link>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-container">
          <h2>Why Choose BeyondFire Cloud?</h2>
          
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>Quick Deployment</h3>
              <p>Deploy your applications in seconds with our streamlined process.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure & Reliable</h3>
              <p>Your applications run in isolated containers with high availability.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🌐</div>
              <h3>Automatic DNS</h3>
              <p>Get a custom subdomain for your application automatically via Cloudflare.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">⚙️</div>
              <h3>Easy Management</h3>
              <p>Manage your containers through our intuitive dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="services">
        <div className="services-container">
          <h2>Available Services</h2>
          <p className="services-description">
            Choose from our pre-configured Docker services or request a custom setup.
          </p>
          
          <div className="services-grid">
            <div className="service-preview">
              <h3>WordPress</h3>
              <p>Deploy a WordPress site with MySQL database in minutes.</p>
              <div className="service-price">Starting at $5.99/month</div>
            </div>
            
            <div className="service-preview">
              <h3>Nextcloud</h3>
              <p>Your personal cloud storage and productivity platform.</p>
              <div className="service-price">Starting at $8.99/month</div>
            </div>
            
            <div className="service-preview">
              <h3>Ghost Blog</h3>
              <p>Professional publishing platform for your blog or website.</p>
              <div className="service-price">Starting at $6.99/month</div>
            </div>
          </div>
          
          <div className="services-cta">
            <Link to="/register" className="btn-primary">View All Services</Link>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <div className="how-it-works-container">
          <h2>How It Works</h2>
          
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Create an Account</h3>
              <p>Sign up for BeyondFire Cloud in just a few seconds.</p>
            </div>
            
            <div className="step">
              <div className="step-number">2</div>
              <h3>Choose a Service</h3>
              <p>Select from our pre-configured Docker services.</p>
            </div>
            
            <div className="step">
              <div className="step-number">3</div>
              <h3>Deploy</h3>
              <p>Click deploy and your service will be up and running in minutes.</p>
            </div>
            
            <div className="step">
              <div className="step-number">4</div>
              <h3>Access Your Service</h3>
              <p>Use your custom subdomain to access your deployed service.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
