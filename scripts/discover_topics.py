#!/usr/bin/env python3

import paho.mqtt.client as mqtt
import time
import json
from datetime import datetime

# Callback when the client receives a CONNACK response from the server
def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")
    # Subscribe to all available topics
    client.subscribe("#")  # '#' means subscribe to all topics

# Callback when a message is received
def on_message(client, userdata, msg):
    try:
        # Try to parse as JSON
        payload = json.loads(msg.payload)
        payload_str = json.dumps(payload, indent=2)
    except:
        # If not JSON, convert bytes to string
        payload_str = msg.payload.decode('utf-8', 'ignore')
    
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"\n[{timestamp}] Topic: {msg.topic}")
    print(f"Payload: {payload_str}")

def main():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    # Connect to your MQTT broker
    broker_address = "169.254.100.100"
    port = 1883
    
    print(f"Connecting to MQTT broker at {broker_address}:{port}...")
    try:
        client.connect(broker_address, port, 60)
        client.loop_forever()
    except KeyboardInterrupt:
        print("\nDisconnecting from MQTT broker...")
        client.disconnect()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
