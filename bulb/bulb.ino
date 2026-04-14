#include <WiFi.h>
#include <PubSubClient.h>

// =============================================
//   CHANGE THESE TWO LINES ONLY
// =============================================
const char* ssid       = "Swarup";
const char* password   = "swaroop1234";
// =============================================

const char* mqttServer  = "broker.hivemq.com";
const int   mqttPort    = 1883;
const char* clientID    = "ESP32_Bulb_001";

const char* topicControl = "home/bulb/control";  // listens for ON/OFF
const char* topicStatus  = "home/bulb/status";   // sends state back to app

const int RELAY_PIN = 26;  // GPIO5 → connects to relay IN pin

WiFiClient   espClient;
PubSubClient client(espClient);

// ── Connect to WiFi ──────────────────────────
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

// ── When message arrives from app ────────────
void onMessage(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  msg.trim();

  Serial.print("Message received: ");
  Serial.println(msg);

  if (msg == "ON") {
    digitalWrite(RELAY_PIN, HIGH);  // relay ON → bulb ON
    client.publish(topicStatus, "ON", true);
    Serial.println("Bulb turned ON 💡");
  }
  else if (msg == "OFF") {
    digitalWrite(RELAY_PIN, LOW);   // relay OFF → bulb OFF
    client.publish(topicStatus, "OFF", true);
    Serial.println("Bulb turned OFF ⚫");
  }
}

// ── Connect to MQTT broker ───────────────────
void connectMQTT() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    if (client.connect(clientID)) {
      Serial.println("Connected!");
      client.subscribe(topicControl);
      Serial.print("Subscribed to: ");
      Serial.println(topicControl);

      // Tell app current state on reconnect
      int state = digitalRead(RELAY_PIN);
      client.publish(topicStatus, state == HIGH ? "ON" : "OFF", true);

    } else {
      Serial.print("Failed. Error code: ");
      Serial.print(client.state());
      Serial.println(" — Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

// ── Setup (runs once) ────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);  // bulb OFF by default on startup

  Serial.println("=== ESP32 Smart Bulb ===");

  connectWiFi();

  client.setServer(mqttServer, mqttPort);
  client.setCallback(onMessage);

  connectMQTT();
}

// ── Loop (runs forever) ──────────────────────
void loop() {
  // Reconnect if connection drops
  if (!client.connected()) {
    Serial.println("MQTT disconnected — reconnecting...");
    connectMQTT();
  }
  client.loop();  // keeps MQTT alive
}