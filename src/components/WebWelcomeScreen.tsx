import React from 'react';

interface WebWelcomeScreenProps {
  onNext: () => void;
}

const WebWelcomeScreen: React.FC<WebWelcomeScreenProps> = ({ onNext }) => {
  const features = [
    {
      icon: '⏰',
      title: 'Automatic Time Tracking',
      description: 'GPS-based automatic detection when you arrive and leave work sites'
    },
    {
      icon: '📍',
      title: 'Location Verification',
      description: 'Ensure you are at the correct construction site before starting work'
    },
    {
      icon: '📊',
      title: 'Work Reports',
      description: 'Generate detailed reports of your working hours and site activity'
    },
    {
      icon: '🔔',
      title: 'Smart Notifications',
      description: 'Get reminders for shift start times and important updates'
    },
    {
      icon: '📱',
      title: 'Easy Management',
      description: 'Simple interface for managers to oversee construction site activities'
    },
    {
      icon: '🔐',
      title: 'Secure & Private',
      description: 'Your location data is encrypted and only used for work tracking'
    }
  ];

  return (
    <div style={webStyles.container}>
      <div style={webStyles.content}>
        <div style={webStyles.header}>
          <h1 style={webStyles.title}>Welcome to</h1>
          <h2 style={webStyles.appName}>Work Time Tracker</h2>
          <p style={webStyles.subtitle}>
            The smart solution for construction site time management
          </p>
        </div>

        <div style={webStyles.featuresContainer}>
          {features.map((feature, index) => (
            <div key={index} style={webStyles.featureItem}>
              <div style={webStyles.featureIcon}>
                <span style={webStyles.iconText}>{feature.icon}</span>
              </div>
              <div style={webStyles.featureContent}>
                <h3 style={webStyles.featureTitle}>{feature.title}</h3>
                <p style={webStyles.featureDescription}>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={webStyles.dotsContainer}>
          <div style={{...webStyles.dot, ...webStyles.activeDot}} />
          <div style={webStyles.dot} />
        </div>

        <div style={webStyles.footer}>
          <button style={webStyles.nextButton} onClick={onNext}>
            Get Started
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
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#fff',
    padding: '20px',
  } as React.CSSProperties,

  content: {
    maxWidth: '600px',
    width: '100%',
    textAlign: 'center',
  } as React.CSSProperties,

  header: {
    marginBottom: '40px',
  } as React.CSSProperties,

  title: {
    fontSize: '24px',
    color: '#666',
    margin: '0 0 5px 0',
    fontWeight: '400',
  } as React.CSSProperties,

  appName: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#2196F3',
    margin: '0 0 15px 0',
  } as React.CSSProperties,

  subtitle: {
    fontSize: '16px',
    color: '#888',
    lineHeight: '1.4',
    margin: '0',
    padding: '0 20px',
  } as React.CSSProperties,

  featuresContainer: {
    marginBottom: '30px',
  } as React.CSSProperties,

  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '25px',
    padding: '0 10px',
    textAlign: 'left',
  } as React.CSSProperties,

  featureIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '25px',
    backgroundColor: '#f0f8ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '15px',
    flexShrink: 0,
  } as React.CSSProperties,

  iconText: {
    fontSize: '24px',
  } as React.CSSProperties,

  featureContent: {
    flex: 1,
    paddingTop: '5px',
  } as React.CSSProperties,

  featureTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 5px 0',
  } as React.CSSProperties,

  featureDescription: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.4',
    margin: '0',
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
    marginTop: '30px',
  } as React.CSSProperties,

  nextButton: {
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '25px',
    padding: '16px 40px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
};

export default WebWelcomeScreen; 