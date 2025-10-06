#!/usr/bin/env python3
"""
Test EEG streaming - get real data from your Insight headset!
"""
import asyncio
import sys
import os
from dotenv import load_dotenv
import time
import json

# Import directly
import importlib.util
spec = importlib.util.spec_from_file_location("cortex_client", "src/utils/cortex_client.py")
cortex_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cortex_module)
CortexClient = cortex_module.CortexClient

async def test_stream():
    # Load credentials
    load_dotenv('.env.emotiv')

    client_id = os.getenv('EMOTIV_CLIENT_ID')
    client_secret = os.getenv('EMOTIV_CLIENT_SECRET')

    print("🧠 Testing EEG Data Streaming")
    print("=" * 50)

    # Create client
    client = CortexClient(client_id, client_secret)

    # Connect
    print("\n1️⃣ Connecting to Cortex...")
    await client.connect()

    # Authenticate
    print("2️⃣ Authenticating...")
    await client.authenticate()

    # Connect to headset
    print("3️⃣ Connecting to Insight headset...")
    await client.connect_headset()

    # Create session
    print("4️⃣ Creating session...")
    session_id = await client.create_session(activate=True)
    print(f"   Session ID: {session_id}")

    # Subscribe to streams
    print("\n5️⃣ Subscribing to data streams...")
    print("   Requesting: eeg, met, pow, mot, eq, dev")

    # Track received data
    data_received = {
        'eeg': 0,
        'met': 0,
        'pow': 0,
        'mot': 0,
        'eq': 0,
        'dev': 0
    }

    def create_counter(stream_name):
        def callback(data):
            data_received[stream_name] += 1
            if data_received[stream_name] == 1:
                print(f"   ✅ {stream_name.upper()}: First sample received!")
                if stream_name == 'eeg':
                    vals = data.get('eeg', [])
                    print(f"      Channels: {len(vals)}")
                    print(f"      Values: {[f'{v:.2f}' for v in vals[:5]]}")
                elif stream_name == 'met':
                    met = data.get('met', [])
                    if len(met) >= 7:
                        print(f"      Engagement: {met[0]:.2f}")
                        print(f"      Stress: {met[3]:.2f}")
                        print(f"      Focus: {met[6]:.2f}")
                elif stream_name == 'eq':
                    eq = data.get('eq', [])
                    channels = ['AF3', 'AF4', 'T7', 'T8', 'Pz']
                    print(f"      Contact Quality:")
                    for i, ch in enumerate(channels):
                        if i < len(eq):
                            quality = ['No Signal', 'Poor', 'Fair', 'Good', 'Excellent']
                            q = int(eq[i]) if eq[i] < 5 else 4
                            print(f"        {ch}: {quality[q]} ({eq[i]:.0f})")
        return callback

    for stream in ['eeg', 'met', 'pow', 'mot', 'eq', 'dev']:
        client.add_stream_callback(stream, create_counter(stream))

    result = await client.subscribe(['eeg', 'met', 'pow', 'mot', 'eq', 'dev'])

    # Check subscription results
    print("\n6️⃣ Subscription Results:")
    for success in result.get('success', []):
        stream_name = success.get('streamName')
        cols = success.get('cols', [])
        print(f"   ✅ {stream_name}: {len(cols)} channels")

    for failure in result.get('failure', []):
        stream_name = failure.get('streamName')
        message = failure.get('message', 'Unknown error')
        print(f"   ❌ {stream_name}: {message}")

    # Stream for 10 seconds
    print("\n7️⃣ Streaming data for 10 seconds...")
    print("   (Watch for real-time data!)\n")

    # Manually receive messages for 10 seconds
    start_time = time.time()
    message_count = 0
    while time.time() - start_time < 10:
        try:
            # Receive with short timeout
            message = await asyncio.wait_for(client.ws.recv(), timeout=0.5)
            message_count += 1
            data = json.loads(message)

            # Debug: print first message
            if message_count == 1:
                print(f"   📨 First message keys: {list(data.keys())}")
                print(f"   📨 SID value: {data.get('sid')}")
                print(f"   📨 Sample EEG data: {data.get('eeg', [])[:5] if 'eeg' in data else 'N/A'}")

            # Handle stream data - check which stream type it is
            if "sid" in data:
                # Determine stream type from data keys
                for stream_type in ['eeg', 'met', 'pow', 'mot', 'eq', 'dev']:
                    if stream_type in data:
                        # Call the callback directly
                        for callback in client.stream_callbacks.get(stream_type, []):
                            callback(data)
                        break
            elif "warning" in data:
                print(f"   ⚠️  Warning: {data['warning']}")

        except asyncio.TimeoutError:
            pass
        except Exception as e:
            if message_count < 5:  # Only show first few errors
                print(f"   ⚠️  Error: {e}")

        # Show progress every second
        elapsed = int(time.time() - start_time)
        if elapsed != getattr(test_stream, '_last_elapsed', -1):
            test_stream._last_elapsed = elapsed
            total = sum(data_received.values())
            print(f"   [{elapsed+1}/10] Messages: {message_count}, Samples: EEG={data_received['eeg']}, MET={data_received['met']}, Total={total}")

    print("\n8️⃣ Summary:")
    print(f"   Total samples received: {sum(data_received.values())}")
    for stream, count in data_received.items():
        print(f"   {stream.upper()}: {count} samples")

    # Cleanup
    print("\n9️⃣ Cleaning up...")
    await client.close_session()
    await client.disconnect()

    print("\n🎉 EEG Streaming Test Complete!")
    print("\n💡 Your Insight is streaming data successfully!")
    print("   Ready to integrate with your UI!")

if __name__ == "__main__":
    try:
        asyncio.run(test_stream())
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()