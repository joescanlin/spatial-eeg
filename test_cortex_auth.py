#!/usr/bin/env python3
"""
Test Cortex authentication with your credentials
"""
import asyncio
import sys
import os
from dotenv import load_dotenv

# Add src to path
sys.path.insert(0, os.path.dirname(__file__))

# Import directly to avoid __init__.py issues
import importlib.util
spec = importlib.util.spec_from_file_location("cortex_client", "src/utils/cortex_client.py")
cortex_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cortex_module)
CortexClient = cortex_module.CortexClient

async def test_auth():
    # Load credentials
    load_dotenv('.env.emotiv')

    client_id = os.getenv('EMOTIV_CLIENT_ID')
    client_secret = os.getenv('EMOTIV_CLIENT_SECRET')
    license_id = os.getenv('EMOTIV_LICENSE_ID')

    if not client_id or not client_secret:
        print("❌ Credentials not found in .env.emotiv")
        return False

    print("🧠 Testing Cortex authentication...")
    print(f"Client ID: {client_id[:20]}...")
    print(f"License ID: {license_id if license_id else 'None (will try without)'}")
    print()

    # Create client - try without license first
    print("⚠️  Trying without license ID first to test basic auth...")
    client = CortexClient(client_id, client_secret, None)

    # Connect
    print("1️⃣ Connecting to Cortex...")
    if not await client.connect():
        print("❌ Failed to connect")
        return False
    print("✅ Connected!\n")

    # Authenticate
    print("2️⃣ Authenticating...")
    print("   (You may need to approve access in Emotiv Launcher)")
    if not await client.authenticate():
        print("❌ Authentication failed")
        return False
    print("✅ Authenticated!\n")

    # Query headsets
    print("3️⃣ Querying headsets...")
    headsets = await client.query_headsets()

    if headsets:
        print(f"✅ Found {len(headsets)} headset(s):")
        for h in headsets:
            print(f"   - ID: {h.get('id', 'unknown')}")
            print(f"     Status: {h.get('status', 'unknown')}")
            print(f"     Dongle: {h.get('dongle', 'unknown')}")
    else:
        print("⚠️  No headsets found (make sure Insight is on and connected)")

    print("\n🎉 Everything is working! Ready to stream EEG data.")

    # Cleanup
    await client.disconnect()

    return True

if __name__ == "__main__":
    try:
        asyncio.run(test_auth())
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
