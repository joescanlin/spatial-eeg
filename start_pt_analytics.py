#!/usr/bin/env python3
"""
Startup script for PT Analytics CoP Area calculation
This will start the PT analytics service to provide real CoP area data to the Live Gait view
"""

import sys
import os
import subprocess
import time

def main():
    print("🎯 Starting PT Analytics Service for CoP Area Calculation")
    print("=" * 60)
    
    # Get the project root directory
    project_root = os.path.dirname(os.path.abspath(__file__))
    
    # Check if we're in the right directory
    if not os.path.exists(os.path.join(project_root, 'src/pt_analytics')):
        print("❌ Error: pt_analytics directory not found!")
        print("   Please run this script from the project root directory.")
        return
    
    # Start the PT analytics service
    analytics_script = os.path.join(project_root, "src/pt_analytics/services/stream_to_metrics.py")
    
    if not os.path.exists(analytics_script):
        print(f"❌ Error: {analytics_script} not found!")
        return
    
    print(f"🚀 Starting PT analytics service: {analytics_script}")
    print("This will:")
    print("  • Connect to MQTT broker for sensor data")
    print("  • Calculate real CoP area from 15x12 grid sensor data")
    print("  • Publish to 'pt/metrics' topic for Live Gait view")
    print("  • Replace dummy CoP area data with real calculations")
    print()
    print("💡 The Live Gait tab should now show real CoP area instead of random values!")
    print()
    print("Press Ctrl+C to stop the service")
    print("-" * 60)
    
    # Set up environment variables
    env = os.environ.copy()
    env['PYTHONPATH'] = project_root
    
    try:
        # Run the analytics service with proper environment
        subprocess.run([sys.executable, analytics_script], 
                      check=True, 
                      env=env,
                      cwd=project_root)
    except KeyboardInterrupt:
        print("\n🛑 PT Analytics service stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running analytics service: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()