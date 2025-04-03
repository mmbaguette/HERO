import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#2A2A2A', // Dark theme color
  },
  map: { width: '100%', height: '80%' },
  bottomContainer: { 
    padding: 20, 
    alignItems: 'center', 
    width: '100%', 
    backgroundColor: '#1C1C1C', // Dark theme background for the bottom section
    position: 'absolute',
    bottom: 0, // Positioning it at the bottom
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 18, marginTop: 10, color: '#A5A5A5' },
  button: {
    backgroundColor: '#4A90E2', 
    padding: 14, 
    borderRadius: 12, 
    width: '80%', // Ensure the button fits properly within the screen
    alignItems: 'center', 
    marginTop: 12 
  },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
});
