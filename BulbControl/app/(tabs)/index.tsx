import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar,
  Animated, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Client, Message } from 'paho-mqtt';
import BulbToggle from '@/components/BulbToggle';

const BROKER_HOST   = 'broker.hivemq.com';
const BROKER_PORT   = 8000;
const TOPIC_CONTROL = 'home/bulb/control';
const TOPIC_STATUS  = 'home/bulb/status';
const CLIENT_ID     = 'RNBulbApp_' + Math.random().toString(16).slice(2, 8);

export default function HomeScreen() {
  const [isOn,      setIsOn]      = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('Connecting...');
  const [logs,      setLogs]      = useState<string[]>([]);
  const clientRef  = useRef<Client | null>(null);
  const bgAnim     = useRef(new Animated.Value(0)).current;
  const scrollRef  = useRef<ScrollView>(null);

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

  useEffect(() => {
    const client = new Client(BROKER_HOST, BROKER_PORT, CLIENT_ID);
    clientRef.current = client;

    client.onConnectionLost = () => {
      setConnected(false);
      setStatusMsg('Reconnecting...');
      setTimeout(() => {
        client.connect({ onSuccess: onConnect, onFailure: onFailure, useSSL: false });
      }, 3000);
    };

    client.onMessageArrived = (msg: Message) => {
      if (msg.destinationName === TOPIC_STATUS) {
        setIsOn(msg.payloadString.trim() === 'ON');
      }
    };

    function onConnect() {
      setConnected(true);
      setStatusMsg('Connected');
      client.subscribe(TOPIC_STATUS);
    }

    function onFailure() {
      setConnected(false);
      setStatusMsg('Connection failed — retrying...');
      setTimeout(() => {
        client.connect({ onSuccess: onConnect, onFailure: onFailure, useSSL: false });
      }, 3000);
    }

    client.connect({ onSuccess: onConnect, onFailure: onFailure, useSSL: false });

    return () => {
      try {
        if (client.isConnected()) client.disconnect();
      } catch (e) {}
    };
  }, []);

  // Add log entry every time bulb state changes
  useEffect(() => {
    if (connected) {
      const now  = new Date();
      const time = now.toLocaleTimeString();
      const date = now.toLocaleDateString();
      setLogs((prev: string[]) =>
        [`${date} ${time} — Bulb turned ${isOn ? '🟡 ON' : '⚫ OFF'}`, ...prev]
      );
      // Auto scroll log to top after new entry
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
    }
  }, [isOn]);

  const handleToggle = () => {
    if (!connected || !clientRef.current) return;
    const command = !isOn ? 'ON' : 'OFF';
    const message = new Message(command);
    message.destinationName = TOPIC_CONTROL;
    message.qos = 1;
    clientRef.current.send(message);
    setIsOn(!isOn);
  };

  const clearLogs = () => setLogs([]);

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>

        {/* ── Fixed Header (always visible) ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💡 Smart Bulb</Text>
          <View style={[styles.dot, { backgroundColor: connected ? '#4ade80' : '#f87171' }]} />
          <Text style={styles.statusText}>{statusMsg}</Text>
        </View>

        {/* ── Scrollable Content ── */}
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
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

          {/* Quick Chips */}
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, styles.chipOn]}
              onPress={() => { if (!isOn) handleToggle(); }}>
              <Text style={styles.chipText}>⚡ Turn ON</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, styles.chipOff]}
              onPress={() => { if (isOn) handleToggle(); }}>
              <Text style={styles.chipText}>✋ Turn OFF</Text>
            </TouchableOpacity>
          </View>

          {/* Activity Log */}
          <View style={styles.logCard}>

            {/* Log Header with count + clear button */}
            <View style={styles.logHeader}>
              <Text style={styles.logTitle}>
                Recent Activity
                {logs.length > 0 && (
                  <Text style={styles.logCount}> ({logs.length})</Text>
                )}
              </Text>
              {logs.length > 0 && (
                <TouchableOpacity onPress={clearLogs} style={styles.clearBtn}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Log Entries — all show, scrollable via parent ScrollView */}
            {logs.length === 0 ? (
              <View style={styles.emptyLog}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.logEmpty}>No activity yet</Text>
                <Text style={styles.logEmptySub}>Toggle the bulb to see logs here</Text>
              </View>
            ) : (
              logs.map((log, i) => (
                <View key={i} style={[styles.logRow, i === 0 && styles.logRowNew]}>
                  <View style={[
                    styles.logDot,
                    { backgroundColor: log.includes('ON') ? '#FFD60A' : '#555577' }
                  ]} />
                  <Text style={styles.logItem}>{log}</Text>
                </View>
              ))
            )}

          </View>

          {/* Bottom padding */}
          <View style={{ height: 32 }} />

        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  safe:         { flex: 1 },

  // Fixed header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff11',
    gap: 8,
  },
  headerTitle:  { color: '#ffffff', fontSize: 22, fontWeight: '700', flex: 1 },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  statusText:   { color: '#aaaacc', fontSize: 13 },

  // Scroll
  scrollContent: { paddingHorizontal: 24, paddingTop: 8 },

  // Bulb visual
  bulbSection:  { alignItems: 'center', paddingTop: 24, paddingBottom: 16 },
  bulbEmoji:    { fontSize: 90, marginBottom: 8 },
  roomLabel:    { color: '#aaaacc', fontSize: 16, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  stateLabel:   { fontSize: 36, fontWeight: '800', letterSpacing: 6 },

  // Power button
  buttonSection: { alignItems: 'center', paddingVertical: 28 },
  tapHint:       { color: '#666688', fontSize: 13, marginTop: 18 },

  // Chips
  chipRow: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 28 },
  chip:    { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 30 },
  chipOn:  { backgroundColor: '#FFD60A22', borderWidth: 1, borderColor: '#FFD60A' },
  chipOff: { backgroundColor: '#ffffff11', borderWidth: 1, borderColor: '#555577' },
  chipText:{ color: '#ffffff', fontWeight: '600', fontSize: 15 },

  // Log card
  logCard: {
    backgroundColor: '#ffffff08',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffffff11',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  logTitle: {
    color: '#aaaacc',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  logCount: {
    color: '#FFD60A',
    fontSize: 13,
  },
  clearBtn: {
    backgroundColor: '#ffffff11',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  clearText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty state
  emptyLog: { alignItems: 'center', paddingVertical: 20 },
  emptyIcon:{ fontSize: 32, marginBottom: 8 },
  logEmpty: { color: '#555577', fontSize: 14, textAlign: 'center' },
  logEmptySub: { color: '#333355', fontSize: 12, marginTop: 4, textAlign: 'center' },

  // Log rows
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff08',
    gap: 10,
  },
  logRowNew: {
    backgroundColor: '#ffffff06',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  logItem: {
    color: '#ccccee',
    fontSize: 13,
    flex: 1,
  },
});