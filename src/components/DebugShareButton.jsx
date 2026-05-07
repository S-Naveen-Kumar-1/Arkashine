import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Share from 'react-native-share';

import { store } from '../redux/store';

const DebugButton = () => {
  const handleShareStore = async () => {
    try {
      // FULL STORE DATA
      const fullState = store.getState();

      const formattedData = JSON.stringify(fullState, null, 2);

      await Share.open({
        title: 'Redux Store Data',
        message: 'Complete Redux Store Data\n\n' + formattedData,
      });
    } catch (e) {
      console.log('Share failed', e);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleShareStore}
      activeOpacity={0.8}
    >
      <Icon name="bug" size={26} color="#fff" />
    </TouchableOpacity>
  );
};

export default DebugButton;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    bottom: 30,

    width: 60,
    height: 60,
    borderRadius: 30,

    backgroundColor: '#EF4444',

    justifyContent: 'center',
    alignItems: 'center',

    elevation: 10,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,

    zIndex: 9999,
  },
});
