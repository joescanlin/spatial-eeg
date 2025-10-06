#!/usr/bin/env python3
"""
Quick test to verify Cortex service is accessible
"""
import asyncio
import websockets
import json
import ssl

async def test_cortex():
    try:
        print("🧠 Testing Cortex connection...")
        print("Connecting to wss://localhost:6868...")

        # Create SSL context that accepts self-signed certificates
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        async with websockets.connect("wss://localhost:6868", ssl=ssl_context) as ws:
            print("✅ Connected to Cortex!")

            # Test getCortexInfo
            request = {
                "id": 1,
                "jsonrpc": "2.0",
                "method": "getCortexInfo",
                "params": {}
            }

            await ws.send(json.dumps(request))
            response = await ws.recv()
            data = json.loads(response)

            if "result" in data:
                print(f"✅ Cortex version: {data['result'].get('version', 'unknown')}")
                print(f"✅ Build number: {data['result'].get('buildNumber', 'unknown')}")
                print("\n🎉 Cortex is working! Ready to add credentials.")
                return True
            else:
                print(f"❌ Unexpected response: {data}")
                return False

    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\n💡 Make sure:")
        print("   1. EMOTIV Launcher is running")
        print("   2. You're logged in to Launcher")
        return False

if __name__ == "__main__":
    asyncio.run(test_cortex())
