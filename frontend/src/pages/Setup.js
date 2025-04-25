import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Paper, Typography, TextField, Button, Box, Alert, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import api from '../services/api';
import '../styles/setup.css';

const StyledPaper = styled(Paper)(({ theme }) => ({
  marginTop: theme.spacing(8),
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: theme.palette.mode === 'dark'
    ? 'rgba(30, 30, 30, 0.9)'
    : 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  borderRadius: '16px',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 8px 32px rgba(0, 0, 0, 0.5)'
    : '0 8px 32px rgba(31, 38, 135, 0.2)',
  border: theme.palette.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(255, 255, 255, 0.7)',
}));

const IconWrapper = styled(Box)(({ theme }) => ({
  margin: theme.spacing(1),
  backgroundColor: theme.palette.primary.main,
  padding: theme.spacing(2),
  borderRadius: '50%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: 'white',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
}));

const Setup = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check if setup is required
    const checkSetupStatus = async () => {
      try {
        const response = await api.get('/api/setup/status');
        setSetupRequired(response.data.setupRequired);

        if (!response.data.setupRequired) {
          // Setup already completed, redirect to login
          setSuccess('Setup already completed. Redirecting to login...');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } catch (err) {
        console.error('Failed to check setup status:', err);
        setError('Failed to check if setup is required. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    checkSetupStatus();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('All fields are required');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Password validation
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    // Check for uppercase, lowercase, number, and special character
    const hasUppercase = /[A-Z]/.test(formData.password);
    const hasLowercase = /[a-z]/.test(formData.password);
    const hasNumber = /[0-9]/.test(formData.password);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post('/api/setup/admin', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        company: formData.company
      });

      setSuccess('Setup completed successfully! Redirecting to login...');

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Setup failed:', err);
      setError(err.response?.data?.error || 'Setup failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container component="main" maxWidth="xs" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="sm">
      <StyledPaper elevation={6}>
        <IconWrapper>
          <AdminPanelSettingsIcon fontSize="large" />
        </IconWrapper>
        <Typography component="h1" variant="h4" gutterBottom>
          BeyondFire Cloud Setup
        </Typography>
        <Typography variant="subtitle1" align="center" gutterBottom>
          Welcome to the initial setup. Please create your admin account to get started.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ width: '100%', mt: 2 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="Full Name"
            name="name"
            autoComplete="name"
            value={formData.name}
            onChange={handleChange}
            disabled={submitting || !setupRequired}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            disabled={submitting || !setupRequired}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            disabled={submitting || !setupRequired}
            helperText="Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character"
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={submitting || !setupRequired}
          />
          <TextField
            margin="normal"
            fullWidth
            name="company"
            label="Company (Optional)"
            id="company"
            autoComplete="organization"
            value={formData.company}
            onChange={handleChange}
            disabled={submitting || !setupRequired}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1.1rem' }}
            disabled={submitting || !setupRequired}
          >
            {submitting ? <CircularProgress size={24} /> : 'Complete Setup'}
          </Button>
        </Box>
      </StyledPaper>
    </Container>
  );
};

export default Setup;
