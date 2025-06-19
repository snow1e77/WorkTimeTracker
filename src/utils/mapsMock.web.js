import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Mock MapView component for web
const MapView = React.forwardRef((props, ref) => {
  const { children, style, initialRegion, onPress, ...otherProps } = props;

  const handleClick = () => {
    if (onPress && initialRegion) {
      const coordinate = {
        latitude: initialRegion.latitude + (Math.random() - 0.5) * 0.01,
        longitude: initialRegion.longitude + (Math.random() - 0.5) * 0.01,
      };
      onPress({
        nativeEvent: { coordinate }
      });
    }
  };

  React.useImperativeHandle(ref, () => ({
    animateToRegion: (region) => {
      console.log('Web MapView: animateToRegion called with', region);
    }
  }));

  return React.createElement(
    View,
    {
      style: [styles.mockMap, style],
      onTouchEnd: handleClick,
      ...otherProps
    },
    React.createElement(
      Text,
      { style: styles.mockMapText },
      '🗺️ Map View (Web Preview)',
      initialRegion && React.createElement(
        Text,
        { style: styles.coordinates },
        `\n📍 ${initialRegion.latitude.toFixed(4)}, ${initialRegion.longitude.toFixed(4)}\nTap to select location`
      )
    ),
    children
  );
});

// Mock Marker component for web
const Marker = ({ coordinate, title, description, draggable, onDragEnd, children }) => {
  const handleDragEnd = () => {
    if (onDragEnd && coordinate) {
      const newCoordinate = {
        latitude: coordinate.latitude + (Math.random() - 0.5) * 0.001,
        longitude: coordinate.longitude + (Math.random() - 0.5) * 0.001,
      };
      onDragEnd({
        nativeEvent: { coordinate: newCoordinate }
      });
    }
  };

  return React.createElement(
    View,
    { style: styles.marker },
    React.createElement(Text, { style: styles.markerText }, '📍'),
    (title || description) && React.createElement(
      View,
      { style: styles.markerInfo },
      title && React.createElement(Text, { style: styles.markerTitle }, title),
      description && React.createElement(Text, { style: styles.markerDescription }, description)
    )
  );
};

const styles = StyleSheet.create({
  mockMap: {
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3498db',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
    position: 'relative',
  },
  mockMapText: {
    textAlign: 'center',
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '600',
  },
  coordinates: {
    fontSize: 12,
    fontWeight: '400',
    color: '#7f8c8d',
  },
  marker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -10 }, { translateY: -10 }],
    alignItems: 'center',
  },
  markerText: {
    fontSize: 20,
  },
  markerInfo: {
    backgroundColor: 'white',
    padding: 4,
    borderRadius: 4,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  markerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
  },
  markerDescription: {
    fontSize: 10,
    color: '#7f8c8d',
  },
});

// Export the mocked components
export default MapView;
export { Marker }; 