#!/usr/bin/env python3
"""
Close all open Cortex sessions
"""
import asyncio
import sys
import os
from dotenv import load_dotenv

# Import directly
import importlib.util
spec = importlib.util.spec_from_file_location("cortex_client", "src/utils/cortex_client.py")
cortex_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cortex_module)
CortexClient = cortex_module.CortexClient

async def close_sessions():
    load_dotenv('.env.emotiv')

    client_id = os.getenv('EMOTIV_CLIENT_ID')
    client_secret = os.getenv('EMOTIV_CLIENT_SECRET')

    client = CortexClient(client_id, client_secret)

    print("🧠 Closing all open sessions...")
    await client.connect()
    await client.authenticate()

    # Query existing sessions
    print("\nQuerying sessions...")
    sessions = await client._call_api("querySessions", {
        "cortexToken": client.cortex_token
    })

    if not sessions:
        print("✅ No open sessions found")
        await client.disconnect()
        return

    print(f"Found {len(sessions)} open session(s):")
    for session in sessions:
        session_id = session.get('id')
        status = session.get('status')
        owner = session.get('owner', 'unknown')
        print(f"  - {session_id} (status: {status}, owner: {owner})")

    # Close all sessions
    print("\nClosing sessions...")
    for session in sessions:
        session_id = session.get('id')
        try:
            await client._call_api("updateSession", {
                "cortexToken": client.cortex_token,
                "session": session_id,
                "status": "close"
            })
            print(f"  ✅ Closed {session_id}")
        except Exception as e:
            print(f"  ⚠️  Could not close {session_id}: {e}")

    await client.disconnect()
    print("\n✅ Done! You can now create new sessions.")

if __name__ == "__main__":
    asyncio.run(close_sessions())
