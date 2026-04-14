import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar,
  Animated, SafeAreaView, TouchableOpacity,
} from 'react-native';
import mqtt from 'mqtt/dist/mqtt';
import BulbToggle from '../components/BulbToggle';

const BROKER_URL    = 'ws://broker.hivemq.com:8000/mqtt'; // WebSocket for React Native
const TOPIC_CONTROL = 'home/bulb/control';
const TOPIC_STATUS  = 'home/bulb/status';
const CLIENT_ID     = 'RNBulbApp_' + Math.random().toString(16).slice(2, 8);

export default function HomeScreen() {
  const [isOn,      setIsOn]      = useState(false);
  const [connected, setConnected] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Connecting...');
  const [logs,      setLogs]      = useState([]);
  const clientRef = useRef(null);
  const bgAnim    = useRef(new Animated.Value(0)).current;

  // Background color changes when bulb is ON
  useEffect(() => {
    Animated.timing(bgAnim, {
      toValue: isOn ? 1 : 0,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [isOn]);

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0f0f1a', '#1a1200'],
  });

  // MQTT Connection
  useEffect(() => {
    const client = mqtt.connect(BROKER_URL, {
      clientId: CLIENT_ID,
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 10000,
    });
    clientRef.current = client;

    client.on('connect', () => {
      setConnected(true);
      setStatusMsg('Connected');
      client.subscribe(TOPIC_STATUS, { qos: 1 });
    });

    client.on('reconnect', () => {
      setConnected(false);
      setStatusMsg('Reconnecting...');
    });

    client.on('error',   () => setStatusMsg('Connection error'));
    client.on('offline', () => { setConnected(false); setStatusMsg('Offline'); });

    // Receive bulb state from ESP32
    client.on('message', (topic, message) => {
      if (topic === TOPIC_STATUS) {
        const state = message.toString().trim();
        setIsOn(state === 'ON');
      }
    });

    return () => client.end(true);
  }, []);

  // Add to activity log
  useEffect(() => {
    if (connected) {
      const time = new Date().toLocaleTimeString();
      setLogs(prev =>
        [`${time} — Bulb turned ${isOn ? 'ON' : 'OFF'}`, ...prev].slice(0, 5)
      );
    }
  }, [isOn]);

  // Toggle handler
  const handleToggle = () => {
    if (!connected || !clientRef.current) return;
    const command = !isOn ? 'ON' : 'OFF';
    clientRef.current.publish(TOPIC_CONTROL, command, { qos: 1 });
    setIsOn(!isOn); // optimistic update
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💡 Smart Bulb</Text>
          <View style={[styles.dot, { backgroundColor: connected ? '#4ade80' : '#f87171' }]} />
          <Text style={styles.statusText}>{statusMsg}</Text>
        </View>

        {/* Bulb Visual */}
        <View style={styles.bulbSection}>
          <Text style={[styles.bulbEmoji, { opacity: isOn ? 1 : 0.25 }]}>💡</Text>
          <Text style={styles.roomLabel}>Living Room</Text>
          <Text style={[styles.stateLabel, { color: isOn ? '#FFD60A' : '#555577' }]}>
            {isOn ? 'ON' : 'OFF'}
          </Text>
        </View>

        {/* Power Button */}
        <View style={styles.buttonSection}>
          <BulbToggle isOn={isOn} onToggle={handleToggle} disabled={!connected} />
          <Text style={styles.tapHint}>
            {connected ? 'Tap to toggle' : 'Waiting for connection...'}
          </Text>
        </View>

        {/* Quick Action Chips */}
        <View style={styles.chipRow}>
          <TouchableOpacity style={[styles.chip, styles.chipOn]}
            onPress={() => { if (!isOn) handleToggle(); }}>
            <Text style={styles.chipText}>Turn ON</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, styles.chipOff]}
            onPress={() => { if (isOn) handleToggle(); }}>
            <Text style={styles.chipText}>Turn OFF</Text>
          </TouchableOpacity>
        </View>

        {/* Activity Log */}
        <View style={styles.logCard}>
          <Text style={styles.logTitle}>Recent Activity</Text>
          {logs.length === 0
            ? <Text style={styles.logEmpty}>No activity yet</Text>
            : logs.map((log, i) => (
                <Text key={i} style={[styles.logItem, { opacity: 1 - i * 0.18 }]}>
                  {log}
                </Text>
              ))
          }
        </View>

      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  safe:         { flex: 1, paddingHorizontal: 24 },
  header:       { flexDirection: 'row', alignItems: 'center', paddingTop: 16, paddingBottom: 8, gap: 8 },
  headerTitle:  { color: '#fff', fontSize: 22, fontWeight: '700', flex: 1 },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  statusText:   { color: '#aaaacc', fontSize: 13 },
  bulbSection:  { alignItems: 'center', paddingTop: 24, paddingBottom: 16 },
  bulbEmoji:    { fontSize: 90, marginBottom: 8 },
  roomLabel:    { color: '#aaaacc', fontSize: 16, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  stateLabel:   { fontSize: 36, fontWeight: '800', letterSpacing: 6 },
  buttonSection:{ alignItems: 'center', paddingVertical: 28 },
  tapHint:      { color: '#666688', fontSize: 13, marginTop: 18 },
  chipRow:      { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 28 },
  chip:         { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 30 },
  chipOn:       { backgroundColor: '#FFD60A22', borderWidth: 1, borderColor: '#FFD60A' },
  chipOff:      { backgroundColor: '#ffffff11', borderWidth: 1, borderColor: '#555577' },
  chipText:     { color: '#fff', fontWeight: '600', fontSize: 15 },
  logCard:      { backgroundColor: '#ffffff08', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#ffffff11' },
  logTitle:     { color: '#aaaacc', fontSize: 13, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  logEmpty:     { color: '#555577', fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  logItem:      { color: '#ccccee', fontSize: 13, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#ffffff08' },
});