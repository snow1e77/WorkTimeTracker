import React, { useState } from 'react';

interface WebPrivacyAgreementScreenProps {
  onAccept: () => void;
  onSkip: () => void;
}

const WebPrivacyAgreementScreen: React.FC<WebPrivacyAgreementScreenProps> = ({ onAccept, onSkip }) => {
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedPermissions, setAcceptedPermissions] = useState(false);

  const handleAcceptAll = () => {
    if (!acceptedPrivacy || !acceptedPermissions) {
      alert('Please accept both Privacy Policy and Permissions to continue.');
      return;
    }
    onAccept();
  };

  const handleSkip = () => {
    const confirmed = window.confirm(
      'Are you sure you want to skip? You will need to accept these agreements later to use all features.'
    );
    if (confirmed) {
      onSkip();
    }
  };

  return (
    <div style={webStyles.container}>
      <div style={webStyles.content}>
        <div style={webStyles.header}>
          <h1 style={webStyles.title}>Privacy & Permissions</h1>
          <p style={webStyles.subtitle}>
            To provide the best experience, we need your agreement on the following:
          </p>
        </div>

        <div style={webStyles.sectionsContainer}>
          {/* Privacy Policy Section */}
          <div style={webStyles.section}>
            <div style={webStyles.sectionHeader}>
              <span style={webStyles.sectionIcon}>🔐</span>
              <h3 style={webStyles.sectionTitle}>Privacy Policy</h3>
            </div>
            
            <div style={webStyles.sectionContent}>
              <p style={webStyles.sectionDescription}>
                We collect and use your location data solely for work time tracking purposes:
              </p>
              <ul style={webStyles.bulletPoints}>
                <li style={webStyles.bulletPoint}>Location data is only recorded during work hours</li>
                <li style={webStyles.bulletPoint}>Data is encrypted and stored securely</li>
                <li style={webStyles.bulletPoint}>Information is only shared with authorized managers</li>
                <li style={webStyles.bulletPoint}>You can request data deletion at any time</li>
                <li style={webStyles.bulletPoint}>No personal data is sold to third parties</li>
              </ul>
            </div>

            <div 
              style={{
                ...webStyles.checkboxContainer,
                ...(acceptedPrivacy ? webStyles.checkboxSelected : {})
              }}
              onClick={() => setAcceptedPrivacy(!acceptedPrivacy)}
            >
              <div style={{
                ...webStyles.checkbox,
                ...(acceptedPrivacy ? webStyles.checkboxChecked : {})
              }}>
                {acceptedPrivacy && <span style={webStyles.checkmark}>✓</span>}
              </div>
              <span style={webStyles.checkboxText}>
                I have read and agree to the Privacy Policy
              </span>
            </div>
          </div>

          {/* Permissions Section */}
          <div style={webStyles.section}>
            <div style={webStyles.sectionHeader}>
              <span style={webStyles.sectionIcon}>📍</span>
              <h3 style={webStyles.sectionTitle}>Required Permissions</h3>
            </div>
            
            <div style={webStyles.sectionContent}>
              <p style={webStyles.sectionDescription}>
                The app requires the following permissions to function properly:
              </p>
              <ul style={webStyles.bulletPoints}>
                <li style={webStyles.bulletPoint}><strong>Location Access:</strong> To track work site entry/exit</li>
                <li style={webStyles.bulletPoint}><strong>Background Location:</strong> For automatic time tracking</li>
                <li style={webStyles.bulletPoint}><strong>Notifications:</strong> For shift reminders and alerts</li>
                <li style={webStyles.bulletPoint}><strong>Storage:</strong> To save work data locally</li>
              </ul>
            </div>

            <div 
              style={{
                ...webStyles.checkboxContainer,
                ...(acceptedPermissions ? webStyles.checkboxSelected : {})
              }}
              onClick={() => setAcceptedPermissions(!acceptedPermissions)}
            >
              <div style={{
                ...webStyles.checkbox,
                ...(acceptedPermissions ? webStyles.checkboxChecked : {})
              }}>
                {acceptedPermissions && <span style={webStyles.checkmark}>✓</span>}
              </div>
              <span style={webStyles.checkboxText}>
                I agree to grant the required permissions
              </span>
            </div>
          </div>
        </div>

        <div style={webStyles.dotsContainer}>
          <div style={webStyles.dot} />
          <div style={{...webStyles.dot, ...webStyles.activeDot}} />
        </div>

        <div style={webStyles.footer}>
          <button style={webStyles.skipButton} onClick={handleSkip}>
            Skip for now
          </button>
          
          <button 
            style={{
              ...webStyles.acceptButton,
              ...(!acceptedPrivacy || !acceptedPermissions ? webStyles.acceptButtonDisabled : {})
            }}
            onClick={handleAcceptAll}
            disabled={!acceptedPrivacy || !acceptedPermissions}
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

const webStyles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    minHeight: '100vh',
    backgroundColor: '#fff',
    padding: '20px',
    overflowY: 'auto',
  } as React.CSSProperties,

  content: {
    maxWidth: '700px',
    width: '100%',
  } as React.CSSProperties,

  header: {
    textAlign: 'center',
    marginBottom: '30px',
    paddingTop: '20px',
  } as React.CSSProperties,

  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 15px 0',
  } as React.CSSProperties,

  subtitle: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.4',
    margin: '0',
  } as React.CSSProperties,

  sectionsContainer: {
    marginBottom: '30px',
  } as React.CSSProperties,

  section: {
    backgroundColor: '#f9f9f9',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px',
    border: '1px solid #e0e0e0',
  } as React.CSSProperties,

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
  } as React.CSSProperties,

  sectionIcon: {
    fontSize: '24px',
    marginRight: '12px',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    margin: '0',
  } as React.CSSProperties,

  sectionContent: {
    marginBottom: '20px',
  } as React.CSSProperties,

  sectionDescription: {
    fontSize: '16px',
    color: '#555',
    marginBottom: '15px',
    lineHeight: '1.5',
  } as React.CSSProperties,

  bulletPoints: {
    margin: '0',
    paddingLeft: '20px',
    color: '#666',
  } as React.CSSProperties,

  bulletPoint: {
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '8px',
  } as React.CSSProperties,

  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    padding: '12px',
    borderRadius: '8px',
    transition: 'background-color 0.2s',
    backgroundColor: 'transparent',
  } as React.CSSProperties,

  checkboxSelected: {
    backgroundColor: '#e3f2fd',
  } as React.CSSProperties,

  checkbox: {
    width: '20px',
    height: '20px',
    border: '2px solid #ddd',
    borderRadius: '4px',
    marginRight: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  checkboxChecked: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  } as React.CSSProperties,

  checkmark: {
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold',
  } as React.CSSProperties,

  checkboxText: {
    fontSize: '15px',
    color: '#333',
    fontWeight: '500',
  } as React.CSSProperties,

  dotsContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '20px 0',
  } as React.CSSProperties,

  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '4px',
    backgroundColor: '#ddd',
    margin: '0 5px',
  } as React.CSSProperties,

  activeDot: {
    backgroundColor: '#2196F3',
    width: '20px',
  } as React.CSSProperties,

  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '30px',
    gap: '15px',
  } as React.CSSProperties,

  skipButton: {
    backgroundColor: 'transparent',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '25px',
    padding: '12px 24px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  acceptButton: {
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '25px',
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  acceptButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  } as React.CSSProperties,
};

export default WebPrivacyAgreementScreen; 