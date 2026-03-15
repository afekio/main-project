import React, { useState } from 'react';

const ProvisionForm = () => {
  const [formData, setFormData] = useState({
    count: '',
    baseName: '',
    osKey: '',
    typeChoice: '',
    installScript: ''
  });

  const [errors, setErrors] = useState({});
  const [submittedJson, setSubmittedJson] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (name, value) => {
    let errorMsg = '';
    if (name === 'count') {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1 || num > 10) {
        errorMsg = 'Count must be a number between 1 and 10.';
      }
    }
    if (name === 'baseName' && value.trim() === '') {
      errorMsg = 'Base name cannot be empty.';
    }
    if (name === 'osKey' && value === '') {
      errorMsg = 'Please select an operating system.';
    }
    if (name === 'typeChoice' && value === '') {
      errorMsg = 'Please select an instance type.';
    }
    if (name === 'installScript' && value === '') {
      errorMsg = 'Please select an installation script.';
    }
    return errorMsg;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    const errorMsg = validateField(name, value);
    setErrors({ ...errors, [name]: errorMsg });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const errorMsg = validateField(key, formData[key]);
      if (errorMsg) {
        newErrors[key] = errorMsg;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      try {
        await fetch('/api/log_error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'ValidationFailed', details: newErrors })
        });
      } catch (err) {
        console.error('Failed to log error', err);
      }
      return;
    }

    // All valid - trigger loading animation
    setIsSubmitting(true);

    try {
      // Create a 4-second minimum timer for the animation
      const timerPromise = new Promise(resolve => setTimeout(resolve, 4000));
      
      // Send data to Flask backend
      const fetchPromise = fetch('/api/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      // Wait for both the timer and the backend response
      const [response] = await Promise.all([fetchPromise, timerPromise]);
      const data = await response.json();

      if (response.ok) {
        setSubmittedJson(data.config);
      } else {
        alert('Server Error: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Network error. Could not connect to the backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Full screen, centered, and grid-based styling
  const styles = `
    html, body, #root {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes pulseShadow {
      0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); }
      70% { box-shadow: 0 0 0 15px rgba(79, 70, 229, 0); }
      100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .page-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f6f8fd 0%, #f1f5f9 100%);
      padding: 40px;
      box-sizing: border-box;
    }

    .form-container {
      width: 100%;
      max-width: 1200px;
      background: white;
      padding: 60px;
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1);
      animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr); 
      gap: 32px;
    }

    .input-group {
      display: flex;
      flex-direction: column;
    }

    .centered-input {
      grid-column: 1 / -1;
      width: calc(50% - 16px);
      margin: 0 auto;
    }

    .input-group label {
      margin-bottom: 12px;
      font-weight: 700;
      color: #374151;
      font-size: 16px;
    }

    .input-field {
      width: 100%;
      padding: 18px;
      font-size: 16px;
      border-radius: 12px;
      box-sizing: border-box;
      transition: all 0.3s ease;
      background-color: #F9FAFB;
      border: 2px solid #E5E7EB;
      color: #111827; 
    }

    select.input-field {
      color: #111827;
    }

    .input-field:focus {
      outline: none;
      border-color: #4F46E5;
      background-color: white;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.1);
      transform: translateY(-2px);
    }

    .input-error {
      border-color: #EF4444;
      background-color: #FEF2F2;
    }

    .create-btn {
      grid-column: 1 / -1;
      width: 100%;
      padding: 20px;
      font-size: 20px;
      font-weight: 700;
      color: white;
      background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%);
      border: none;
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      margin-top: 20px;
    }

    .create-btn:hover {
      transform: translateY(-4px);
      box-shadow: 0 15px 25px -5px rgba(79, 70, 229, 0.4);
      animation: pulseShadow 2s infinite;
    }

    .create-btn:active {
      transform: translateY(1px);
      box-shadow: 0 5px 10px -5px rgba(79, 70, 229, 0.4);
    }

    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px;
    }
    
    .spinner {
      border: 6px solid #F3F4F6;
      border-top: 6px solid #4F46E5;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      animation: spin 1s linear infinite;
      margin-bottom: 24px;
    }

    .loading-text {
      font-size: 24px;
      color: #4F46E5;
      font-weight: 700;
      animation: fadeIn 1s infinite alternate;
    }

    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
      .form-container {
        padding: 30px;
      }
      .centered-input {
        width: 100%;
      }
    }
  `;

  // Loading Screen
  if (isSubmitting) {
    return (
      <div className="page-wrapper">
        <style>{styles}</style>
        <div className="form-container loading-overlay">
          <div className="spinner"></div>
          <div className="loading-text">
            Please wait...<br/>
            <span style={{fontSize: '16px', color: '#6B7280', fontWeight: 'normal'}}>
              Provisioning Instances & Checking Configurations
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Success Screen
  if (submittedJson) {
    return (
      <div className="page-wrapper">
        <style>{styles}</style>
        <div className="form-container" style={{ textAlign: 'center', maxWidth: '800px' }}>
          <h2 style={{ color: '#10B981', fontSize: '36px', marginBottom: '24px' }}>Provisioning Complete!</h2>
          <pre style={{ backgroundColor: '#1E293B', color: '#E2E8F0', padding: '30px', borderRadius: '12px', overflowX: 'auto', textAlign: 'left', fontSize: '16px' }}>
            {JSON.stringify(submittedJson, null, 2)}
          </pre>
          <button className="create-btn" onClick={() => setSubmittedJson(null)}>
            Create New Batch
          </button>
        </div>
      </div>
    );
  }

  // Main Form
  return (
    <div className="page-wrapper">
      <style>{styles}</style>
      <div className="form-container">
        <h1 style={{ textAlign: 'center', color: '#111827', fontSize: '42px', marginBottom: '50px', fontWeight: '800' }}>
          Infrastructure Setup
        </h1>
        
        <form onSubmit={handleSubmit} className="form-grid">
          
          <div className="input-group">
            <label>Number of Instances (1-10)</label>
            <input 
              type="number" 
              name="count" 
              value={formData.count} 
              onChange={handleChange}
              className={`input-field ${errors.count ? 'input-error' : ''}`}
              placeholder="e.g., 3"
            />
            {errors.count && <span style={{ color: '#EF4444', fontSize: '15px', marginTop: '8px', fontWeight: '600' }}>{errors.count}</span>}
          </div>

          <div className="input-group">
            <label>Base Machine Name</label>
            <input 
              type="text" 
              name="baseName" 
              value={formData.baseName} 
              onChange={handleChange}
              className={`input-field ${errors.baseName ? 'input-error' : ''}`}
              placeholder="e.g., app-server"
            />
            {errors.baseName && <span style={{ color: '#EF4444', fontSize: '15px', marginTop: '8px', fontWeight: '600' }}>{errors.baseName}</span>}
          </div>

          <div className="input-group">
            <label>Operating System</label>
            <select 
              name="osKey" 
              value={formData.osKey} 
              onChange={handleChange}
              className={`input-field ${errors.osKey ? 'input-error' : ''}`}
            >
              <option value="">Select OS...</option>
              <option value="ubuntu">Ubuntu 22.04 LTS</option>
              <option value="centos">CentOS 8 Stream</option>
            </select>
            {errors.osKey && <span style={{ color: '#EF4444', fontSize: '15px', marginTop: '8px', fontWeight: '600' }}>{errors.osKey}</span>}
          </div>

          <div className="input-group">
            <label>Instance Type</label>
            <select 
              name="typeChoice" 
              value={formData.typeChoice} 
              onChange={handleChange}
              className={`input-field ${errors.typeChoice ? 'input-error' : ''}`}
            >
              <option value="">Select Type...</option>
              <option value="1">t2.micro (1 vCPU, 1GB RAM)</option>
              <option value="2">t2.nano (1 vCPU, 0.5GB RAM)</option>
            </select>
            {errors.typeChoice && <span style={{ color: '#EF4444', fontSize: '15px', marginTop: '8px', fontWeight: '600' }}>{errors.typeChoice}</span>}
          </div>

          <div className="input-group centered-input">
            <label>Post-Launch Script</label>
            <select 
              name="installScript" 
              value={formData.installScript} 
              onChange={handleChange}
              className={`input-field ${errors.installScript ? 'input-error' : ''}`}
            >
              <option value="">Select Installation...</option>
              <option value="none">None (Skip Installation)</option>
              <option value="nginx">Install & Configure Nginx</option>
            </select>
            {errors.installScript && <span style={{ color: '#EF4444', fontSize: '15px', marginTop: '8px', fontWeight: '600' }}>{errors.installScript}</span>}
          </div>

          <button type="submit" className="create-btn">
            Create Instances
          </button>

        </form>
      </div>
    </div>
  );
};

export default ProvisionForm;