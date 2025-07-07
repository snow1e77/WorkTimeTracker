import React from 'react';
import { View, Text, StyleSheet, Platform, Linking } from 'react-native';

const LandingPage: React.FC = () => {
  const handleDownloadAndroid = () => {
    // Замените на ссылку вашего APK или Google Play Store
    const androidUrl = 'https://play.google.com/store/apps/details?id=com.snow1e77.WorkTimeTracker';
    if (Platform.OS === 'web') {
      window.open(androidUrl, '_blank');
    } else {
      Linking.openURL(androidUrl);
    }
  };

  const handleDownloadIOS = () => {
    // Замените на ссылку вашего App Store
    const iosUrl = 'https://apps.apple.com/app/worktimetracker/id123456789';
    if (Platform.OS === 'web') {
      window.open(iosUrl, '_blank');
    } else {
      Linking.openURL(iosUrl);
    }
  };

  const handleAdminLogin = () => {
    if (Platform.OS === 'web') {
      window.location.href = '/admin';
    }
  };

  if (Platform.OS === 'web') {
    // Ensure body can scroll
    React.useEffect(() => {
      // Reset any conflicting styles
      document.body.style.overflow = 'auto';
      document.body.style.height = 'auto';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.documentElement.style.height = 'auto';
      document.documentElement.style.overflow = 'auto';
      document.documentElement.style.margin = '0';
      document.documentElement.style.padding = '0';
      
      // Add global scroll behavior
      const style = document.createElement('style');
      style.textContent = `
        html, body {
          height: auto !important;
          overflow: auto !important;
          scroll-behavior: smooth;
        }
        * {
          box-sizing: border-box;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        // Cleanup on unmount
        document.body.style.overflow = '';
        document.body.style.height = '';
        document.body.style.margin = '';
        document.body.style.padding = '';
        document.documentElement.style.height = '';
        document.documentElement.style.overflow = '';
        document.documentElement.style.margin = '';
        document.documentElement.style.padding = '';
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      };
    }, []);

    return (
      <div style={webStyles.container}>
        {/* Header */}
        <header style={webStyles.header}>
          <div style={webStyles.headerContent}>
            <div style={webStyles.logo}>
              <h1 style={webStyles.logoText}>WorkTime Tracker</h1>
            </div>
            <nav style={webStyles.nav}>
              <button style={webStyles.adminButton} onClick={handleAdminLogin}>
                Admin Panel
              </button>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section style={webStyles.hero}>
          <div style={webStyles.heroContent}>
            <h1 style={webStyles.heroTitle}>
              Professional Time Tracking Solution
            </h1>
            <p style={webStyles.heroSubtitle}>
              Streamline your workforce management with our comprehensive time tracking application. 
              Perfect for construction, field work, and remote teams.
            </p>
            <div style={webStyles.downloadButtons}>
              <button style={webStyles.downloadButton} onClick={handleDownloadAndroid}>
                <div style={webStyles.buttonContent}>
                  <span style={webStyles.buttonIcon}>📱</span>
                  <div>
                    <div style={webStyles.buttonText}>Download for</div>
                    <div style={webStyles.buttonPlatform}>Android</div>
                  </div>
                </div>
              </button>
              <button style={webStyles.downloadButton} onClick={handleDownloadIOS}>
                <div style={webStyles.buttonContent}>
                  <span style={webStyles.buttonIcon}>🍎</span>
                  <div>
                    <div style={webStyles.buttonText}>Download for</div>
                    <div style={webStyles.buttonPlatform}>iOS</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section style={webStyles.features}>
          <div style={webStyles.featuresContainer}>
            <h2 style={webStyles.sectionTitle}>Key Features</h2>
            <div style={webStyles.featuresGrid}>
              <div style={webStyles.featureCard}>
                <div style={webStyles.featureIcon}>⏰</div>
                <h3 style={webStyles.featureTitle}>Time Tracking</h3>
                <p style={webStyles.featureDescription}>
                  Accurate clock-in/clock-out with GPS location verification
                </p>
              </div>
              <div style={webStyles.featureCard}>
                <div style={webStyles.featureIcon}>📍</div>
                <h3 style={webStyles.featureTitle}>Location Monitoring</h3>
                <p style={webStyles.featureDescription}>
                  Real-time location tracking to ensure workers are at designated sites
                </p>
              </div>
              <div style={webStyles.featureCard}>
                <div style={webStyles.featureIcon}>📊</div>
                <h3 style={webStyles.featureTitle}>Reporting</h3>
                <p style={webStyles.featureDescription}>
                  Comprehensive reports and analytics for better workforce management
                </p>
              </div>
              <div style={webStyles.featureCard}>
                <div style={webStyles.featureIcon}>👥</div>
                <h3 style={webStyles.featureTitle}>Team Management</h3>
                <p style={webStyles.featureDescription}>
                  Manage multiple teams and assign workers to different projects
                </p>
              </div>
              <div style={webStyles.featureCard}>
                <div style={webStyles.featureIcon}>📱</div>
                <h3 style={webStyles.featureTitle}>Mobile First</h3>
                <p style={webStyles.featureDescription}>
                  Native mobile apps for seamless field operation experience
                </p>
              </div>
              <div style={webStyles.featureCard}>
                <div style={webStyles.featureIcon}>☁️</div>
                <h3 style={webStyles.featureTitle}>Cloud Sync</h3>
                <p style={webStyles.featureDescription}>
                  Automatic synchronization with secure cloud storage
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={webStyles.cta}>
          <div style={webStyles.ctaContent}>
            <h2 style={webStyles.ctaTitle}>Ready to Get Started?</h2>
            <p style={webStyles.ctaSubtitle}>
              Download our app today and revolutionize your time tracking process
            </p>
            <div style={webStyles.downloadButtons}>
              <button style={webStyles.downloadButton} onClick={handleDownloadAndroid}>
                <div style={webStyles.buttonContent}>
                  <span style={webStyles.buttonIcon}>📱</span>
                  <div>
                    <div style={webStyles.buttonText}>Get it on</div>
                    <div style={webStyles.buttonPlatform}>Google Play</div>
                  </div>
                </div>
              </button>
              <button style={webStyles.downloadButton} onClick={handleDownloadIOS}>
                <div style={webStyles.buttonContent}>
                  <span style={webStyles.buttonIcon}>🍎</span>
                  <div>
                    <div style={webStyles.buttonText}>Download on the</div>
                    <div style={webStyles.buttonPlatform}>App Store</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={webStyles.footer}>
          <div style={webStyles.footerContent}>
            <div style={webStyles.footerSection}>
              <h3 style={webStyles.footerTitle}>WorkTime Tracker</h3>
              <p style={webStyles.footerText}>
                Professional time tracking solution for modern businesses
              </p>
            </div>
            <div style={webStyles.footerSection}>
              <h4 style={webStyles.footerSubtitle}>Quick Links</h4>
              <button style={webStyles.footerLink} onClick={handleAdminLogin}>
                Admin Panel
              </button>
            </div>
          </div>
          <div style={webStyles.footerBottom}>
            <p style={webStyles.copyright}>
              © 2025 WorkTime Tracker. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // Mobile view (simplified)
  return (
    <View style={styles.container}>
      <Text style={styles.title}>WorkTime Tracker</Text>
      <Text style={styles.subtitle}>Download our mobile app</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

const webStyles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    overflowY: 'auto',
    overflowX: 'hidden',
    width: '100%',
    position: 'relative',
  } as React.CSSProperties,

  header: {
    backgroundColor: '#2196F3',
    padding: '1rem 0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    width: '100%',
  } as React.CSSProperties,

  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,

  logo: {
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  logoText: {
    color: 'white',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: 0,
  } as React.CSSProperties,

  nav: {
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  adminButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.3)',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.3s ease',
  } as React.CSSProperties,

  hero: {
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '4rem 0',
    textAlign: 'center',
  } as React.CSSProperties,

  heroContent: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 2rem',
  } as React.CSSProperties,

  heroTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    margin: '0 0 1rem 0',
  } as React.CSSProperties,

  heroSubtitle: {
    fontSize: '1.2rem',
    marginBottom: '2rem',
    opacity: 0.9,
    lineHeight: 1.6,
  } as React.CSSProperties,

  downloadButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  } as React.CSSProperties,

  downloadButton: {
    backgroundColor: '#333',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '1rem 1.5rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minWidth: '200px',
  } as React.CSSProperties,

  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  } as React.CSSProperties,

  buttonIcon: {
    fontSize: '1.5rem',
  } as React.CSSProperties,

  buttonText: {
    fontSize: '0.8rem',
    opacity: 0.8,
  } as React.CSSProperties,

  buttonPlatform: {
    fontSize: '1rem',
    fontWeight: 'bold',
  } as React.CSSProperties,

  features: {
    padding: '4rem 0',
    backgroundColor: '#f8f9fa',
  } as React.CSSProperties,

  featuresContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '3rem',
    color: '#333',
  } as React.CSSProperties,

  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
  } as React.CSSProperties,

  featureCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s ease',
  } as React.CSSProperties,

  featureIcon: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
  } as React.CSSProperties,

  featureTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    color: '#333',
  } as React.CSSProperties,

  featureDescription: {
    color: '#666',
    lineHeight: 1.6,
  } as React.CSSProperties,

  cta: {
    backgroundColor: '#2196F3',
    color: 'white',
    padding: '4rem 0',
    textAlign: 'center',
  } as React.CSSProperties,

  ctaContent: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 2rem',
  } as React.CSSProperties,

  ctaTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    margin: '0 0 1rem 0',
  } as React.CSSProperties,

  ctaSubtitle: {
    fontSize: '1.1rem',
    marginBottom: '2rem',
    opacity: 0.9,
  } as React.CSSProperties,

  footer: {
    backgroundColor: '#333',
    color: 'white',
    padding: '3rem 0 1rem 0',
  } as React.CSSProperties,

  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
  } as React.CSSProperties,

  footerSection: {
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,

  footerTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
  } as React.CSSProperties,

  footerSubtitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
  } as React.CSSProperties,

  footerText: {
    opacity: 0.8,
    lineHeight: 1.6,
  } as React.CSSProperties,

  footerLink: {
    backgroundColor: 'transparent',
    color: '#64b5f6',
    border: 'none',
    padding: '0.25rem 0',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '0.9rem',
    textDecoration: 'underline',
  } as React.CSSProperties,

  footerBottom: {
    borderTop: '1px solid #555',
    marginTop: '2rem',
    paddingTop: '1rem',
    textAlign: 'center',
  } as React.CSSProperties,

  copyright: {
    opacity: 0.7,
    fontSize: '0.9rem',
  } as React.CSSProperties,
};

export default LandingPage; 