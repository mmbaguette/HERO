import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 16,
  },
  title: { 
    fontSize: 24, 
    color: '#FFF', 
    marginBottom: 24,
    fontWeight: 'bold',
  },
  button: { 
    backgroundColor: '#4A90E2',
    padding: 14,
    borderRadius: 12, 
    width: '92%', 
    alignItems: 'center', 
    marginBottom: 12,
  },
  buttonText: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: '600' 
  },
});
