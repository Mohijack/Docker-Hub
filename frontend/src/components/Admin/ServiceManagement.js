import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Check as ActiveIcon,
  Close as InactiveIcon
} from '@mui/icons-material';
import api from '../../services/api';
import './ServiceManagement.css';

const ServiceManagement = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  
  // Form states
  const [currentService, setCurrentService] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    price: '',
    image: '',
    resources: {
      cpu: '',
      memory: '',
      storage: ''
    },
    composeTemplate: '',
    active: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch services on component mount
  useEffect(() => {
    fetchServices();
  }, []);

  // Fetch all services from the API
  const fetchServices = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/api/admin/services');
      setServices(response.data);
    } catch (err) {
      console.error('Failed to fetch services:', err);
      setError('Failed to load services. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      // Handle nested properties (e.g., resources.cpu)
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      // Handle top-level properties
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Validate form data
  const validateForm = () => {
    const errors = {};
    
    if (!formData.id) errors.id = 'Service ID is required';
    if (!formData.name) errors.name = 'Name is required';
    if (!formData.description) errors.description = 'Description is required';
    if (!formData.price) errors.price = 'Price is required';
    else if (isNaN(formData.price) || parseFloat(formData.price) < 0) 
      errors.price = 'Price must be a positive number';
    
    if (!formData.image) errors.image = 'Docker image is required';
    
    if (!formData.resources.cpu) errors.cpu = 'CPU is required';
    else if (isNaN(formData.resources.cpu) || parseInt(formData.resources.cpu) <= 0)
      errors.cpu = 'CPU must be a positive number';
    
    if (!formData.resources.memory) errors.memory = 'Memory is required';
    if (!formData.resources.storage) errors.storage = 'Storage is required';
    
    if (!formData.composeTemplate) errors.composeTemplate = 'Docker Compose template is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create service
  const handleCreateService = async () => {
    if (!validateForm()) return;
    
    try {
      setSubmitting(true);
      setError('');
      
      const response = await api.post('/api/admin/services', {
        ...formData,
        price: parseFloat(formData.price),
        resources: {
          ...formData.resources,
          cpu: parseInt(formData.resources.cpu)
        }
      });
      
      setServices([...services, response.data.service]);
      setSuccess('Service created successfully');
      setOpenCreateDialog(false);
      resetForm();
    } catch (err) {
      console.error('Failed to create service:', err);
      setError(err.response?.data?.error || 'Failed to create service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle update service
  const handleUpdateService = async () => {
    if (!validateForm()) return;
    
    try {
      setSubmitting(true);
      setError('');
      
      const response = await api.put(`/api/admin/services/${currentService.id}`, {
        ...formData,
        price: parseFloat(formData.price),
        resources: {
          ...formData.resources,
          cpu: parseInt(formData.resources.cpu)
        }
      });
      
      // Update service in the list
      setServices(services.map(service => 
        service.id === currentService.id ? response.data.service : service
      ));
      
      setSuccess('Service updated successfully');
      setOpenEditDialog(false);
    } catch (err) {
      console.error('Failed to update service:', err);
      setError(err.response?.data?.error || 'Failed to update service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete service
  const handleDeleteService = async () => {
    try {
      setSubmitting(true);
      setError('');
      
      await api.delete(`/api/admin/services/${currentService.id}`);
      
      // Remove service from the list
      setServices(services.filter(service => service.id !== currentService.id));
      
      setSuccess('Service deleted successfully');
      setOpenDeleteDialog(false);
    } catch (err) {
      console.error('Failed to delete service:', err);
      setError(err.response?.data?.error || 'Failed to delete service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      description: '',
      price: '',
      image: '',
      resources: {
        cpu: '',
        memory: '',
        storage: ''
      },
      composeTemplate: '',
      active: true
    });
    setFormErrors({});
  };

  // Open edit dialog
  const openEditServiceDialog = (service) => {
    setCurrentService(service);
    setFormData({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      image: service.image,
      resources: {
        cpu: service.resources.cpu.toString(),
        memory: service.resources.memory,
        storage: service.resources.storage
      },
      composeTemplate: service.composeTemplate,
      active: service.active
    });
    setOpenEditDialog(true);
  };

  // Open delete dialog
  const openDeleteServiceDialog = (service) => {
    setCurrentService(service);
    setOpenDeleteDialog(true);
  };

  // Open view dialog
  const openViewServiceDialog = (service) => {
    setCurrentService(service);
    setOpenViewDialog(true);
  };

  return (
    <Box className="service-management">
      <Box className="service-management-header">
        <Typography variant="h4" component="h1">
          Service Management
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setOpenCreateDialog(true);
          }}
        >
          Add New Service
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No services found
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>{service.id}</TableCell>
                    <TableCell>{service.name}</TableCell>
                    <TableCell>{service.description}</TableCell>
                    <TableCell>${service.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip 
                        icon={service.active ? <ActiveIcon /> : <InactiveIcon />}
                        label={service.active ? 'Active' : 'Inactive'}
                        color={service.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton 
                          color="info" 
                          onClick={() => openViewServiceDialog(service)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton 
                          color="primary" 
                          onClick={() => openEditServiceDialog(service)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          color="error" 
                          onClick={() => openDeleteServiceDialog(service)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Service Dialog */}
      <Dialog 
        open={openCreateDialog} 
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Service</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                name="id"
                label="Service ID"
                fullWidth
                value={formData.id}
                onChange={handleInputChange}
                error={!!formErrors.id}
                helperText={formErrors.id}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Name"
                fullWidth
                value={formData.name}
                onChange={handleInputChange}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={formData.description}
                onChange={handleInputChange}
                error={!!formErrors.description}
                helperText={formErrors.description}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="price"
                label="Price (€/month)"
                fullWidth
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                value={formData.price}
                onChange={handleInputChange}
                error={!!formErrors.price}
                helperText={formErrors.price}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="image"
                label="Docker Image"
                fullWidth
                value={formData.image}
                onChange={handleInputChange}
                error={!!formErrors.image}
                helperText={formErrors.image}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Resources
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="resources.cpu"
                label="CPU Cores"
                fullWidth
                type="number"
                inputProps={{ min: 1 }}
                value={formData.resources.cpu}
                onChange={handleInputChange}
                error={!!formErrors.cpu}
                helperText={formErrors.cpu}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="resources.memory"
                label="Memory"
                fullWidth
                placeholder="e.g., 2GB"
                value={formData.resources.memory}
                onChange={handleInputChange}
                error={!!formErrors.memory}
                helperText={formErrors.memory}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="resources.storage"
                label="Storage"
                fullWidth
                placeholder="e.g., 10GB"
                value={formData.resources.storage}
                onChange={handleInputChange}
                error={!!formErrors.storage}
                helperText={formErrors.storage}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="active"
                  value={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.value})}
                  label="Status"
                >
                  <MenuItem value={true}>Active</MenuItem>
                  <MenuItem value={false}>Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="composeTemplate"
                label="Docker Compose Template"
                fullWidth
                multiline
                rows={10}
                value={formData.composeTemplate}
                onChange={handleInputChange}
                error={!!formErrors.composeTemplate}
                helperText={formErrors.composeTemplate}
                required
                placeholder="version: '3'\nservices:\n  app:\n    image: {{image}}\n    ports:\n      - '{{PORT}}:80'"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateService} 
            variant="contained" 
            color="primary"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog 
        open={openEditDialog} 
        onClose={() => setOpenEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Service</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                name="id"
                label="Service ID"
                fullWidth
                value={formData.id}
                disabled
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Name"
                fullWidth
                value={formData.name}
                onChange={handleInputChange}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={formData.description}
                onChange={handleInputChange}
                error={!!formErrors.description}
                helperText={formErrors.description}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="price"
                label="Price (€/month)"
                fullWidth
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                value={formData.price}
                onChange={handleInputChange}
                error={!!formErrors.price}
                helperText={formErrors.price}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="image"
                label="Docker Image"
                fullWidth
                value={formData.image}
                onChange={handleInputChange}
                error={!!formErrors.image}
                helperText={formErrors.image}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Resources
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="resources.cpu"
                label="CPU Cores"
                fullWidth
                type="number"
                inputProps={{ min: 1 }}
                value={formData.resources.cpu}
                onChange={handleInputChange}
                error={!!formErrors.cpu}
                helperText={formErrors.cpu}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="resources.memory"
                label="Memory"
                fullWidth
                placeholder="e.g., 2GB"
                value={formData.resources.memory}
                onChange={handleInputChange}
                error={!!formErrors.memory}
                helperText={formErrors.memory}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="resources.storage"
                label="Storage"
                fullWidth
                placeholder="e.g., 10GB"
                value={formData.resources.storage}
                onChange={handleInputChange}
                error={!!formErrors.storage}
                helperText={formErrors.storage}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="active"
                  value={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.value})}
                  label="Status"
                >
                  <MenuItem value={true}>Active</MenuItem>
                  <MenuItem value={false}>Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="composeTemplate"
                label="Docker Compose Template"
                fullWidth
                multiline
                rows={10}
                value={formData.composeTemplate}
                onChange={handleInputChange}
                error={!!formErrors.composeTemplate}
                helperText={formErrors.composeTemplate}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdateService} 
            variant="contained" 
            color="primary"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Service Dialog */}
      <Dialog 
        open={openDeleteDialog} 
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Delete Service</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the service "{currentService?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteService} 
            variant="contained" 
            color="error"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Service Dialog */}
      <Dialog 
        open={openViewDialog} 
        onClose={() => setOpenViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Service Details</DialogTitle>
        <DialogContent>
          {currentService && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">ID</Typography>
                <Typography variant="body1" gutterBottom>{currentService.id}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Name</Typography>
                <Typography variant="body1" gutterBottom>{currentService.name}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Description</Typography>
                <Typography variant="body1" gutterBottom>{currentService.description}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Price</Typography>
                <Typography variant="body1" gutterBottom>${currentService.price.toFixed(2)}/month</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Docker Image</Typography>
                <Typography variant="body1" gutterBottom>{currentService.image}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Resources</Typography>
                <Typography variant="body1" gutterBottom>
                  CPU: {currentService.resources.cpu} cores | 
                  Memory: {currentService.resources.memory} | 
                  Storage: {currentService.resources.storage}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Status</Typography>
                <Chip 
                  icon={currentService.active ? <ActiveIcon /> : <InactiveIcon />}
                  label={currentService.active ? 'Active' : 'Inactive'}
                  color={currentService.active ? 'success' : 'default'}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Docker Compose Template</Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    mt: 1, 
                    backgroundColor: 'rgba(0, 0, 0, 0.03)',
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {currentService.composeTemplate}
                  </pre>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Created At</Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(currentService.createdAt).toLocaleString()}
                </Typography>
              </Grid>
              {currentService.updatedAt && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Last Updated</Typography>
                  <Typography variant="body1" gutterBottom>
                    {new Date(currentService.updatedAt).toLocaleString()}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
          <Button 
            onClick={() => {
              setOpenViewDialog(false);
              openEditServiceDialog(currentService);
            }} 
            variant="contained" 
            color="primary"
          >
            Edit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServiceManagement;
