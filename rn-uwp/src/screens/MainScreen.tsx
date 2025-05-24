import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { colors } from '../styles/colors';
import Sidebar from '../components/navigation/Sidebar';
import Dashboard from '../components/Dashboard';

const MainScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <View style={styles.container}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
    ...Platform.select({ windows: { height: '100vh' } }),
  },
  content: { flex: 1 },
});

export default MainScreen;
