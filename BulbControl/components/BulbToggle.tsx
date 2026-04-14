import React, { useRef, useEffect } from 'react';
import { Animated, TouchableOpacity, StyleSheet, View } from 'react-native';

interface Props {
  isOn: boolean;
  onToggle: () => void;
  disabled: boolean;
}

export default function BulbToggle({ isOn, onToggle, disabled }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const ringAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(glowAnim, {
      toValue: isOn ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();

    if (isOn) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(ringAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      ringAnim.stopAnimation();
      ringAnim.setValue(0);
    }
  }, [isOn]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    if (!disabled) onToggle();
  };

  const bgColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1e1e2e', '#FFD60A'],
  });

  const iconColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#555577', '#1e1e2e'],
  });

  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 0.15, 0.6],
  });

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });

  return (
    <View style={styles.wrapper}>
      {isOn && (
        <Animated.View style={[
          styles.pulseRing,
          { opacity: ringOpacity, transform: [{ scale: ringScale }] }
        ]} />
      )}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity activeOpacity={0.85} onPress={handlePress} disabled={disabled}>
          <Animated.View style={[styles.button, { backgroundColor: bgColor }]}>
            <Animated.Text style={[styles.powerIcon, { color: iconColor }]}>
              ⏻
            </Animated.Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:   { alignItems: 'center', justifyContent: 'center' },
  pulseRing: {
    position: 'absolute', width: 180, height: 180,
    borderRadius: 90, borderWidth: 3, borderColor: '#FFD60A',
  },
  button: {
    width: 160, height: 160, borderRadius: 80,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FFD60A', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 30, elevation: 20,
  },
  powerIcon: { fontSize: 72, lineHeight: 80 },
});