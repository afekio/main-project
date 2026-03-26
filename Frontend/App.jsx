import React, { useState, useEffect } from 'react';

// 1. Emoji Bank & Helper
const EMOJI_BANK = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', 
  '🚀', '🛸', '🛰️', '🚁', '🛶', '💻', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '⚙️', '🛠️', '🔧', '🔨'
];

const createRandomEmoji = () => {
  const emoji = EMOJI_BANK[Math.floor(Math.random() * EMOJI_BANK.length)];
  const side = Math.random() > 0.5 ? 'left' : 'right';
  const horizontalOffset = side === 'left' ? (Math.random() * 8 + 2) : (Math.random() * 8 + 90); 
    
  return {
    id: Date.now() + Math.random(),
    char: emoji,
    style: {
      left: `${horizontalOffset}vw`,
      animationDuration: `${Math.random() * 5 + 3}s`,
      animationDelay: `${Math.random() * 3}s`,
      transform: `rotate(${Math.random() * 360}deg)`,
      fontSize: `${Math.random() * 1.5 + 1.5}rem`,
    }
  };
};

const ProvisionForm = () => {
  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authData, setAuthData] = useState({ username: '', password: '', re_password: '', email: '', fullName: '' });
  const [authMessage, setAuthMessage] = useState({ text: '', type: '' });

  // --- View State ---
  const [currentView, setCurrentView] = useState('form'); // 'form' or 'profile'
  
  // --- Profile State ---
  const [profileData, setProfileData] = useState({ files: [] });
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '' });
  const [pwdMessage, setPwdMessage] = useState({ text: '', type: '' });
  const [viewingFile, setViewingFile] = useState(null);

  // --- Form State ---
  const [formData, setFormData] = useState({ count: '', baseName: '', osKey: '', typeChoice: '', installScript: '', infraType: 'json' });
  const [errors, setErrors] = useState({});
  const [submittedJson, setSubmittedJson] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emojis, setEmojis] = useState([]);

  // Check for existing token
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setIsLoggedIn(true);
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  // Emoji effect
  useEffect(() => {
    const initialEmojis = Array.from({ length: 15 }, createRandomEmoji);
    setEmojis(initialEmojis);
    const intervalId = setInterval(() => {
      const newBatch = Array.from({ length: 3 }, createRandomEmoji);
      setEmojis(prev => {
        const next = [...prev, ...newBatch];
        return next.length > 50 ? next.slice(10) : next;
      });
    }, 1500);
    return () => clearInterval(intervalId);
  }, []);

  // --- API Helpers ---
  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      handleLogout();
      throw new Error("Unauthorized");
    }
    return response;
  };

  // --- Auth Handlers ---
  const handleAuthChange = (e) => setAuthData({ ...authData, [e.target.name]: e.target.value });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentView('form');
    setSubmittedJson(null); // Clear success screen on logout
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthMessage({ text: 'Processing...', type: 'info' });
    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData)
      });
      const data = await response.json();

      if (response.ok) {
        if (authMode === 'login') {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setIsLoggedIn(true);
          setCurrentUser(data.user);
          setShowAuthModal(false);
          setAuthMessage({ text: '', type: '' });
          setAuthData({ ...authData, password: '', re_password: '' });
        } else {
          setAuthMessage({ text: 'Registration successful! Please login.', type: 'success' });
          setAuthMode('login');
        }
      } else {
        setAuthMessage({ text: data.error || 'Authentication failed', type: 'error' });
      }
    } catch (err) {
      setAuthMessage({ text: 'Network error. Cannot reach backend.', type: 'error' });
    }
  };

  // --- Profile Handlers ---
  const loadProfile = async () => {
    setSubmittedJson(null); // Clear success screen when navigating to profile
    try {
      const res = await fetchWithAuth('/api/user/profile');
      const data = await res.json();
      setProfileData(data);
      setCurrentView('profile');
    } catch (e) {
      console.error("Failed to load profile", e);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMessage({ text: 'Updating...', type: 'info' });
    try {
      const res = await fetchWithAuth('/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify(passwordData)
      });
      const data = await res.json();
      if (res.ok) {
        setPwdMessage({ text: 'Password updated successfully!', type: 'success' });
        setPasswordData({ oldPassword: '', newPassword: '' });
      } else {
        setPwdMessage({ text: data.error, type: 'error' });
      }
    } catch (e) {
      setPwdMessage({ text: 'Error updating password', type: 'error' });
    }
  };

  const fetchFileContent = async (fileId) => {
    const res = await fetchWithAuth(`/api/user/file/${fileId}`);
    if (!res.ok) throw new Error("Failed to fetch file");
    return await res.json();
  };

  const handleViewFile = async (fileId) => {
    try {
      const fileData = await fetchFileContent(fileId);
      setViewingFile(fileData);
    } catch (e) {
      alert("Could not load file content.");
    }
  };

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const fileData = await fetchFileContent(fileId);
      const blob = new Blob([fileData.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Could not download file.");
    }
  };

  // --- Form Handlers ---
  const validateField = (name, value) => {
    let errorMsg = '';
    if (name === 'count') {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1 || num > 10) errorMsg = 'Count must be a number between 1 and 10.';
    }
    if (name === 'baseName' && value.trim() === '') errorMsg = 'Base name cannot be empty.';
    if (name === 'osKey' && value === '') errorMsg = 'Please select an operating system.';
    if (name === 'typeChoice' && value === '') errorMsg = 'Please select an instance type.';
    if (name === 'installScript' && value === '') errorMsg = 'Please select an installation script.';
    if (name === 'infraType' && value !== 'json' && value !== 'terraform') errorMsg = 'Please select a valid infrastructure type.';
    return errorMsg;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: validateField(name, value) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const errorMsg = validateField(key, formData[key]);
      if (errorMsg) newErrors[key] = errorMsg;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const timerPromise = new Promise(resolve => setTimeout(resolve, 3000));
      const fetchPromise = fetchWithAuth('/api/provision', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      const [response] = await Promise.all([fetchPromise, timerPromise]);
      const data = await response.json();

      if (response.ok) {
        setSubmittedJson(data.config);
      } else {
        alert('Server Error: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      if (error.message !== "Unauthorized") {
        alert('Network error. Could not connect to the backend server.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Styles ---
  const styles = `
    html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; overflow-x: hidden; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulseShadow { 0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(79, 70, 229, 0); } 100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); } }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes emojiFallAndRoll { 0% { top: -10vh; opacity: 0; transform: rotate(0deg) translateX(0px); } 10% { opacity: 0.8; } 80% { opacity: 0.8; } 100% { top: 110vh; opacity: 0; transform: rotate(720deg) translateX(calc(15px * var(--emoji-wobble-dir, 1))); } }

    .page-wrapper { position: absolute; top: 0; left: 0; width: 100vw; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #f6f8fd 0%, #f1f5f9 100%); padding: 40px; box-sizing: border-box; z-index: 1; }
    
    .top-navbar { position: absolute; top: 0; left: 0; width: 100%; padding: 20px 40px; display: flex; justify-content: flex-end; align-items: center; box-sizing: border-box; z-index: 10; gap: 15px; }
    .nav-user-info { display: flex; align-items: center; gap: 15px; font-weight: 600; color: #374151; }
    .nav-btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-primary { background: #4F46E5; color: white; }
    .btn-primary:hover { background: #4338CA; }
    .btn-secondary { background: #E5E7EB; color: #374151; }
    .btn-secondary:hover { background: #D1D5DB; }
    .btn-logout { background: #FEE2E2; color: #EF4444; }
    .btn-logout:hover { background: #FECACA; }

    .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 50; animation: fadeIn 0.3s ease-out; }
    .modal-content { background: white; padding: 40px; border-radius: 20px; width: 100%; max-width: 450px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); max-height: 90vh; overflow-y: auto;}
    .modal-tabs { display: flex; margin-bottom: 30px; border-bottom: 2px solid #E5E7EB; }
    .modal-tab { flex: 1; text-align: center; padding: 15px; font-weight: 700; color: #6B7280; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s; }
    .modal-tab.active { color: #4F46E5; border-bottom-color: #4F46E5; }

    .auth-msg { padding: 10px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; font-weight: 600; text-align: center; }
    .auth-msg.error { background: #FEF2F2; color: #EF4444; }
    .auth-msg.success { background: #ECFDF5; color: #10B981; }
    .auth-msg.info { background: #EFF6FF; color: #3B82F6; }

    .emoji-rain { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 0; }
    .falling-emoji { position: absolute; animation-name: emojiFallAndRoll; animation-iteration-count: 1; animation-timing-function: linear; animation-fill-mode: forwards; opacity: 0; }

    .form-container { width: 100%; max-width: 1200px; background: white; padding: 60px; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; z-index: 2; margin-top: 40px; }
    .profile-container { max-width: 1000px; }
    
    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; }
    .input-group { display: flex; flex-direction: column; }
    .input-group label { margin-bottom: 12px; font-weight: 700; color: #374151; font-size: 16px; }
    .input-field { width: 100%; padding: 18px; font-size: 16px; border-radius: 12px; box-sizing: border-box; transition: all 0.3s ease; background-color: #F9FAFB; border: 2px solid #E5E7EB; color: #111827; }
    .input-field:focus { outline: none; border-color: #4F46E5; background-color: white; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.1); transform: translateY(-2px); }
    .input-error { border-color: #EF4444; background-color: #FEF2F2; }

    .create-btn { grid-column: 1 / -1; width: 100%; padding: 20px; font-size: 20px; font-weight: 700; color: white; background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%); border: none; border-radius: 14px; cursor: pointer; transition: all 0.3s; margin-top: 20px; }
    .create-btn.locked { background: #9CA3AF; box-shadow: none; }
    .create-btn:hover:not(.locked) { transform: translateY(-4px); box-shadow: 0 15px 25px -5px rgba(79, 70, 229, 0.4); animation: pulseShadow 2s infinite; }

    .loading-overlay { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px; }
    .spinner { border: 6px solid #F3F4F6; border-top: 6px solid #4F46E5; border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite; margin-bottom: 24px; }
    .loading-text { font-size: 24px; color: #4F46E5; font-weight: 700; animation: fadeIn 1s infinite alternate; }

    /* Profile Specific Styles */
    .profile-header { border-bottom: 2px solid #E5E7EB; padding-bottom: 20px; margin-bottom: 30px; }
    .history-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .history-table th, .history-table td { padding: 15px; text-align: left; border-bottom: 1px solid #E5E7EB; }
    .history-table th { background-color: #F9FAFB; color: #374151; font-weight: 700; }
    .history-table tr:hover { background-color: #F3F4F6; }
    .action-btn { padding: 8px 12px; margin-right: 8px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; font-size: 14px; }
    .btn-view { background: #EFF6FF; color: #3B82F6; }
    .btn-download { background: #ECFDF5; color: #10B981; }

    /* Code Viewer */
    .code-viewer { background-color: #1E293B; color: #E2E8F0; padding: 20px; border-radius: 8px; overflow-x: auto; font-family: "Fira Code", monospace; white-space: pre-wrap; word-break: break-word; font-size: 14px; max-height: 60vh; overflow-y: auto;}
  `;

  // --- Modal Renders ---
  const renderAuthModal = () => {
    if (!showAuthModal) return null;
    return (
      <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-tabs">
            <div className={`modal-tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => { setAuthMode('login'); setAuthMessage({ text: '', type: '' }); }}>Login</div>
            <div className={`modal-tab ${authMode === 'register' ? 'active' : ''}`} onClick={() => { setAuthMode('register'); setAuthMessage({ text: '', type: '' }); }}>Register</div>
          </div>
          {authMessage.text && <div className={`auth-msg ${authMessage.type}`}>{authMessage.text}</div>}
          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="input-group"><label>Username</label><input type="text" name="username" className="input-field" required value={authData.username} onChange={handleAuthChange} /></div>
            {authMode === 'register' && (
              <>
                <div className="input-group"><label>Full Name</label><input type="text" name="fullName" className="input-field" required value={authData.fullName} onChange={handleAuthChange} /></div>
                <div className="input-group"><label>Email</label><input type="email" name="email" className="input-field" required value={authData.email} onChange={handleAuthChange} /></div>
              </>
            )}
            <div className="input-group"><label>Password</label><input type="password" name="password" className="input-field" required value={authData.password} onChange={handleAuthChange} /></div>
            {authMode === 'register' && (
              <div className="input-group"><label>Confirm Password</label><input type="password" name="re_password" className="input-field" required value={authData.re_password} onChange={handleAuthChange} /></div>
            )}
            <button type="submit" className="create-btn" style={{ marginTop: '10px' }}>{authMode === 'login' ? 'Sign In' : 'Create Account'}</button>
          </form>
        </div>
      </div>
    );
  };

  const renderFileViewerModal = () => {
    if (!viewingFile) return null;
    let displayText = viewingFile.content;
    if (viewingFile.fileType === 'terraform' && typeof displayText === 'string') {
        displayText = displayText.replace(/\\n/g, '\n');
        if (displayText.startsWith('"') && displayText.endsWith('"')) displayText = displayText.slice(1, -1);
    }
    return (
      <div className="modal-overlay" onClick={() => setViewingFile(null)}>
        <div className="modal-content" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
          <h2 style={{ marginTop: 0 }}>{viewingFile.fileName}</h2>
          <div className="code-viewer">{displayText}</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
             <button className="nav-btn btn-secondary" onClick={() => setViewingFile(null)}>Close</button>
             <button className="nav-btn btn-primary" onClick={() => handleDownloadFile(viewingFile.id, viewingFile.fileName)}>Download</button>
          </div>
        </div>
      </div>
    );
  };

  // --- Content Renders ---
  const renderProfile = () => (
    <div className="form-container profile-container">
      <div className="profile-header">
        <h1 style={{ margin: 0, color: '#111827' }}>Personal Area</h1>
        <p style={{ color: '#6B7280', margin: '10px 0 0 0' }}>Manage your account and deployment history.</p>
      </div>

      <div className="form-grid" style={{ marginBottom: '40px' }}>
        <div className="input-group"><label>Full Name</label><input type="text" className="input-field" value={profileData.fullName || ''} disabled /></div>
        <div className="input-group"><label>Email Address</label><input type="text" className="input-field" value={profileData.email || ''} disabled /></div>
      </div>

      <div style={{ backgroundColor: '#F9FAFB', padding: '20px', borderRadius: '12px', marginBottom: '40px' }}>
        <h3 style={{ marginTop: 0, color: '#111827' }}>Change Password</h3>
        {pwdMessage.text && <div className={`auth-msg ${pwdMessage.type}`}>{pwdMessage.text}</div>}
        <form onSubmit={handleChangePassword} style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ flex: 1 }}><label>Current Password</label><input type="password" required className="input-field" value={passwordData.oldPassword} onChange={e => setPasswordData({...passwordData, oldPassword: e.target.value})} /></div>
          <div className="input-group" style={{ flex: 1 }}><label>New Password</label><input type="password" required className="input-field" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} /></div>
          <button type="submit" className="nav-btn btn-primary" style={{ padding: '18px 24px' }}>Update</button>
        </form>
      </div>

      <h3>Deployment History</h3>
      {profileData.files && profileData.files.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="history-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Type</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profileData.files.map(file => {
                const isTf = file.fileType === 'terraform';
                const textColor = isTf ? '#7E22CE' : '#B45309'; // Purple for TF, Dark Yellow for JSON
                
                return (
                  <tr key={file.id}>
                    <td style={{ fontWeight: '700', color: textColor }}>{file.fileName}</td>
                    <td>
                      <span style={{ 
                        backgroundColor: isTf ? '#E0E7FF' : '#FEF3C7', 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', 
                        color: isTf ? '#3730A3' : '#92400E' 
                      }}>
                        {file.fileType.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600', color: textColor }}>{file.createdAt}</td>
                    <td>
                      <button className="action-btn btn-view" onClick={() => handleViewFile(file.id)}>👁️ View</button>
                      <button className="action-btn btn-download" onClick={() => handleDownloadFile(file.id, file.fileName)}>⬇️ Download</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: '#6B7280', textAlign: 'center', padding: '20px' }}>No deployments found. Start creating infrastructure!</p>
      )}
    </div>
  );

  const renderMainForm = () => (
    <div className="form-container">
      <h1 style={{ textAlign: 'center', color: '#111827', fontSize: '42px', marginBottom: '50px', fontWeight: '800' }}>Infrastructure Setup</h1>
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="input-group"><label>Number of Instances (1-10)</label><input type="number" name="count" value={formData.count} onChange={handleChange} className={`input-field ${errors.count ? 'input-error' : ''}`} placeholder="e.g., 3" />{errors.count && <span style={{ color: '#EF4444', fontSize: '15px', marginTop: '8px', fontWeight: '600' }}>{errors.count}</span>}</div>
        <div className="input-group"><label>Base Machine Name</label><input type="text" name="baseName" value={formData.baseName} onChange={handleChange} className={`input-field ${errors.baseName ? 'input-error' : ''}`} placeholder="e.g., app-server" />{errors.baseName && <span style={{ color: '#EF4444', fontSize: '15px', marginTop: '8px', fontWeight: '600' }}>{errors.baseName}</span>}</div>
        <div className="input-group"><label>Operating System</label><select name="osKey" value={formData.osKey} onChange={handleChange} className={`input-field ${errors.osKey ? 'input-error' : ''}`}><option value="">Select OS...</option><option value="ubuntu">Ubuntu 22.04 LTS</option><option value="centos">CentOS 8 Stream</option></select>{errors.osKey && <span style={{ color: '#EF4444', fontSize: '15px', marginTop: '8px', fontWeight: '600' }}>{errors.osKey}</span>}</div>
        <div className="input-group"><label>Instance Type</label><select name="typeChoice" value={formData.typeChoice} onChange={handleChange} className={`input-field ${errors.typeChoice ? 'input-error' : ''}`}><option value="">Select Type...</option><option value="1">t2.micro (1 vCPU, 1GB RAM)</option><option value="2">t2.nano (1 vCPU, 0.5GB RAM)</option></select>{errors.typeChoice && <span style={{ color: '#EF4444', fontSize: '15px', marginTop: '8px', fontWeight: '600' }}>{errors.typeChoice}</span>}</div>
        <div className="input-group"><label>Post-Launch Script</label><select name="installScript" value={formData.installScript} onChange={handleChange} className={`input-field ${errors.installScript ? 'input-error' : ''}`}><option value="">Select Installation...</option><option value="none">None (Skip Installation)</option><option value="nginx">Install & Configure Nginx</option></select>{errors.installScript && <span style={{ color: '#EF4444', fontSize: '15px', marginTop: '8px', fontWeight: '600' }}>{errors.installScript}</span>}</div>
        <div className="input-group"><label>Infrastructure Output Type</label><select name="infraType" value={formData.infraType} onChange={handleChange} className={`input-field ${errors.infraType ? 'input-error' : ''}`}><option value="json">JSON Configuration</option><option value="terraform">Terraform (.tf) File</option></select>{errors.infraType && <span style={{ color: '#EF4444', fontSize: '15px', marginTop: '8px', fontWeight: '600' }}>{errors.infraType}</span>}</div>
        <button type="submit" className={`create-btn ${!isLoggedIn ? 'locked' : ''}`}>{isLoggedIn ? 'Create Instances' : 'Login Required to Create'}</button>
      </form>
    </div>
  );

  const renderSuccessScreen = () => {
    let displayText = typeof submittedJson === 'string' 
      ? submittedJson.replace(/\\n/g, '\n').replace(/^"|"$/g, '') 
      : JSON.stringify(submittedJson, null, 2);
      
    return (
      <div className="form-container" style={{ textAlign: 'center', maxWidth: '800px' }}>
        <h2 style={{ color: '#10B981', fontSize: '36px', marginBottom: '24px' }}>Provisioning Complete!</h2>
        <div className="code-viewer" style={{ textAlign: 'left' }}>{displayText}</div>
        <button className="create-btn" onClick={() => setSubmittedJson(null)} style={{ marginTop: '30px' }}>Create New Batch</button>
      </div>
    );
  };

  const renderLoadingScreen = () => (
    <div className="form-container loading-overlay">
      <div className="spinner"></div>
      <div className="loading-text">Provisioning...</div>
      <span style={{fontSize: '16px', color: '#6B7280', fontWeight: 'normal', marginTop: '10px'}}>
        Setting up instances & checking configurations
      </span>
    </div>
  );

  // --- Main Return ---
  return (
    <div className="page-wrapper">
      <style>{styles}</style>
      
      {/* Background Layer */}
      <div className="emoji-rain">
        {emojis.map(e => <span key={e.id} className="falling-emoji" style={e.style} aria-hidden="true">{e.char}</span>)}
      </div>
      
      {/* ALWAYS VISIBLE Navbar */}
      <div className="top-navbar">
        {isLoggedIn ? (
          <div className="nav-user-info">
            <span>Welcome, {currentUser?.fullName || currentUser?.username} 👋</span>
            {currentView === 'form' && !submittedJson ? (
              <button className="nav-btn btn-secondary" onClick={loadProfile}>👤 My Profile</button>
            ) : (
              <button className="nav-btn btn-primary" onClick={() => { setCurrentView('form'); setSubmittedJson(null); }}>🏠 Back to Home</button>
            )}
            <button className="nav-btn btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <button className="nav-btn btn-primary" onClick={() => setShowAuthModal(true)}>Login / Register</button>
        )}
      </div>

      {/* Modals */}
      {renderAuthModal()}
      {renderFileViewerModal()}

      {/* Conditional Content Rendering */}
      {isSubmitting 
        ? renderLoadingScreen() 
        : submittedJson 
          ? renderSuccessScreen()
          : currentView === 'profile' 
            ? renderProfile() 
            : renderMainForm()
      }
    </div>
  );
};

export default ProvisionForm;