#!/usr/bin/env python3
"""
==============================================================================
ARKASHINE-SOIL BLE HARDWARE SIMULATOR
==============================================================================
This simulator replicates the exact Raspberry Pi firmware (main.py) BLE interface.
It allows you to test the mobile app without requiring a physical device.

Requirements:
    pip install bless

Usage:
    python3 soil_device_simulator.py
==============================================================================
"""

import json
import os
import threading
import time
import sys
import random
import asyncio
from datetime import datetime

# ==============================================================================
# CONFIG & UUIDS (Matches main.py exactly)
# ==============================================================================
DEVICE_NAME           = "ArkaShine-Soil"
FIRMWARE_SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab"
FIRMWARE_DATA_UUID    = "abcd1234-5678-1234-5678-1234567890ab"
SOFTWARE_VERSION      = "1.1.1.1"
DEVICE_ID             = "SIM-001"
SERIAL_NO             = "ARK-SIM-2026"

SOIL_CAL_FILE = "simulated_soil_calibration.json"

CH_NAMES = [
    "A", "B", "C", "D", "E", "F", "G", "H", "I",
    "J", "K", "L", "R", "S", "T", "U", "V", "W",
    "UVA", "UVB", "UVC"
]

BASE_SPECTRUM = {
    "A": 750.0, "B": 160.0, "C": 52.5, "D": 43.8,
    "E": 78.5,  "F": 404.0, "G": 276.5, "H": 297.8,
    "I": 155.0, "J": 46.0,  "K": 26.7, "L": 16.9,
    "R": 1160.0, "S": 392.9, "T": 1012.4, "U": 351.9,
    "V": 471.0, "W": 623.3, "UVA": 988.7, "UVB": 18.5,
    "UVC": 9.0
}

NUTRIENT_CONFIG = {
    "OC": {"vals": [0.1, 1, 2]},
    "N":  {"vals": [50, 350, 850]},
    "P":  {"vals": [0.916, 170, 366.4]},
    "K":  {"vals": [2, 500, 960]},
    "Ca": {"vals": [1, 60, 120]},
    "Mg": {"vals": [1, 30, 60]},
    "S":  {"vals": [10, 120, 250]},
    "Fe": {"vals": [1, 25, 50]},
    "Mn": {"vals": [0.5, 12, 25]},
    "Cu": {"vals": [0.1, 5, 10]},
    "Zn": {"vals": [0.1, 5, 10]},
    "B":  {"vals": [0.1, 5, 10]},
}

VALID_CALIBRATION_POINTS = ("blank", "min", "mid", "max")

# Global states
ble_motor_status       = "STOPPED"
ble_sensor_status      = "STOPPED"
_calibration_running   = False
_calibration_cancel    = False
latest_result          = None
_ble_server_ref        = None

# ==============================================================================
# CALIBRATION DATABASE
# ==============================================================================
def load_calibration_db():
    if os.path.exists(SOIL_CAL_FILE):
        try:
            with open(SOIL_CAL_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    # Default initial state showing OC and N partially calibrated
    initial = {
        "summary": {
            "OC": ["blank", "min"],
            "N": ["min"],
            "P": [], "K": [], "Ca": [], "Mg": [],
            "S": [], "Fe": [], "Mn": [], "Cu": [], "Zn": [], "B": []
        }
    }
    save_calibration_db(initial)
    return initial

def save_calibration_db(data):
    try:
        with open(SOIL_CAL_FILE, "w") as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print(f"Error saving calibration db: {e}")

# ==============================================================================
# BLE NOTIFY HELPER
# ==============================================================================
def ble_notify(server, data: dict):
    if server is None:
        print(f"⚠️ [MOCK BLE NOTIFY]: {data}")
        return
    try:
        payload = json.dumps(data).encode("utf-8")
        char = server.get_characteristic(FIRMWARE_DATA_UUID)
        char.value = bytearray(payload)
        server.update_value(FIRMWARE_SERVICE_UUID, FIRMWARE_DATA_UUID)
        print(f"📤 BLE TX: {data}")
    except Exception as ex:
        print(f"❌ BLE TX Error: {ex}")

# ==============================================================================
# WORKFLOW SIMULATIONS
# ==============================================================================
def simulate_mixing(server):
    global ble_motor_status
    print("\n🌀 [SIMULATOR] Mixing Motor Started...")
    ble_motor_status = "RUNNING"
    time.sleep(3.0)  # Simulate 3 seconds of mixing
    ble_motor_status = "STOPPED"
    print("✅ [SIMULATOR] Mixing Motor Completed")
    ble_notify(server, {"SOILTEST": "MIXING_COMPLETED"})

def simulate_sensor_reading(server):
    global ble_sensor_status, latest_result
    print("\n🔬 [SIMULATOR] Reading Soil Sensors...")
    ble_sensor_status = "RUNNING"
    time.sleep(2.0)

    # Simulated realistic soil results
    latest_result = {
        "OC": round(random.uniform(0.45, 0.75), 3),
        "N":  round(random.uniform(250.0, 450.0), 2),
        "P":  round(random.uniform(20.0, 45.0), 2),
        "K":  round(random.uniform(150.0, 320.0), 2),
        "Ca": round(random.uniform(2.5, 5.5), 2),
        "Mg": round(random.uniform(1.2, 3.2), 2),
        "S":  round(random.uniform(12.0, 22.0), 2),
        "Fe": round(random.uniform(5.0, 9.5), 2),
        "Mn": round(random.uniform(2.2, 4.2), 2),
        "Cu": round(random.uniform(0.22, 0.45), 2),
        "Zn": round(random.uniform(0.65, 1.25), 2),
        "B":  round(random.uniform(0.55, 1.05), 2),
        "ph": 6.8,
        "ec": 1.1,
    }
    ble_sensor_status = "STOPPED"
    print("✅ [SIMULATOR] Sensor Reading Done")
    ble_notify(server, {"SOILSENSORSTATUS": "SENSOR_READING_DONE"})

def simulate_calibration(server, nutrient, point):
    global _calibration_cancel, _calibration_running
    print(f"\n🎯 [SIMULATOR] Starting Calibration Capture: Nutrient={nutrient}, Point={point}")
    _calibration_running = True
    _calibration_cancel = False

    total_samples = 100
    stride = 2  # Send updates rapidly for responsive testing

    try:
        ble_notify(server, {
            "SOILCALIBRATION": "CAPTURING",
            "nutrient": nutrient,
            "point": point,
            "sample": 0,
            "total": total_samples,
        })

        for i in range(total_samples):
            if _calibration_cancel:
                print("🛑 [SIMULATOR] Calibration Cancelled by App")
                ble_notify(server, {
                    "SOILCALIBRATION": "CANCELLED",
                    "nutrient": nutrient,
                    "point": point,
                })
                return

            time.sleep(0.08)  # ~8 seconds total test run time

            # Generate fluctuating realistic channels
            channels_dict = {}
            for ch in CH_NAMES:
                base = BASE_SPECTRUM.get(ch, 100.0)
                noise = random.uniform(-1.5, 1.5)
                channels_dict[ch] = round(base + (i * 0.2) + noise, 3)

            # Progress notification
            ble_notify(server, {
                "SOILCALIBRATION": "CAPTURING",
                "sample": i,
                "total": total_samples,
                "percent": int(((i + 1) / total_samples) * 100),
            })

            # Channel live readings notification
            if i % stride == 0 or i == total_samples - 1:
                ble_notify(server, {
                    "SOILCALIBRATIONDATA": "CAPTURING",
                    "nutrient": nutrient,
                    "point": point,
                    "sample": i,
                    "total": total_samples,
                    "channels": channels_dict,
                })

        # Completed
        db = load_calibration_db()
        summary = db.get("summary", {})
        if nutrient not in summary:
            summary[nutrient] = []
        if point not in summary[nutrient]:
            summary[nutrient].append(point)
        db["summary"] = summary
        save_calibration_db(db)

        print(f"✅ [SIMULATOR] Calibration Done: {nutrient}/{point} Saved")
        ble_notify(server, {
            "SOILCALIBRATION": "COMPLETED",
            "nutrient": nutrient,
            "point": point,
            "message": f"{nutrient}/{point} saved",
        })
        ble_notify(server, {
            "SOILCALIBRATIONDATA": "SAVED",
            "nutrient": nutrient,
            "point": point,
            "message": f"{nutrient}/{point} saved",
        })
        ble_notify(server, {
            "SOILCALIBRATE": "SAVED",
            "nutrient": nutrient,
            "point": point,
            "message": f"{nutrient}/{point} saved",
        })

    finally:
        _calibration_running = False

# ==============================================================================
# COMMAND ROUTING
# ==============================================================================
def handle_ble_command(server, raw_bytes: bytes):
    global _calibration_cancel, ble_motor_status

    try:
        cmd_str = raw_bytes.decode("utf-8")
        cmd = json.loads(cmd_str)
        print(f"\n📥 BLE RX: {cmd}")
    except Exception as e:
        print(f"❌ Could not parse JSON from client: {raw_bytes!r} ({e})")
        return

    # Handshake
    if cmd.get("HANDSHAKE") == "HELLO":
        ble_notify(server, {"HANDSHAKE": "ACK"})

    # Calibration Start
    elif cmd.get("SOILCALIBRATION") == "START" or cmd.get("SOILCALIBRATE") == "START":
        nutrients = cmd.get("nutrients") or [cmd.get("nutrient")]
        point = str(cmd.get("point", "")).strip().lower()

        if isinstance(nutrients, str):
            nutrients = [nutrients]
        nutrient = (nutrients[0] if nutrients else "").strip().upper()

        if nutrient not in NUTRIENT_CONFIG or point not in VALID_CALIBRATION_POINTS:
            ble_notify(server, {"SOILCALIBRATION": "ERROR", "message": "Invalid nutrient or point"})
            return

        t = threading.Thread(target=simulate_calibration, args=(server, nutrient, point), daemon=True)
        t.start()

    # Calibration Stop / Cancel
    elif cmd.get("SOILCALIBRATION") == "STOP" or cmd.get("SOILCALIBRATE") == "CANCEL":
        _calibration_cancel = True
        ble_notify(server, {"SOILCALIBRATION": "STOPPED"})

    # Calibration Status Query
    elif "SOILCALIBRATIONSTATUS" in cmd:
        status = "RUNNING" if _calibration_running else "IDLE"
        ble_notify(server, {"SOILCALIBRATIONSTATUS": status})

    # Calibration Data / Table Query
    elif cmd.get("SOILCALIBRATIONDATA") == "GET" or cmd.get("SOILCALIBRATE") == "LIST":
        db = load_calibration_db()
        ble_notify(server, {
            "SOILCALIBRATIONDATA": "OK",
            "summary": db.get("summary", {}),
            "file": SOIL_CAL_FILE,
        })

    # Soil Motor Test (Mixing)
    elif cmd.get("SOILTEST") == "START":
        ble_notify(server, {"SOILTEST": "STARTED"})
        t = threading.Thread(target=simulate_mixing, args=(server,), daemon=True)
        t.start()

    elif cmd.get("SOILTEST") == "STOP":
        ble_motor_status = "STOPPED"
        ble_notify(server, {"SOILTEST": "STOPPED"})

    # Soil Sensor Reading
    elif cmd.get("SOILSENSOR") == "READ":
        ble_notify(server, {"SOILSENSORSTATUS": "READING"})
        t = threading.Thread(target=simulate_sensor_reading, args=(server,), daemon=True)
        t.start()

    elif cmd.get("SOILRESULT") == "GET":
        if latest_result:
            ble_notify(server, {"FINALSOILRESULT": latest_result})
        else:
            ble_notify(server, {"FINALSOILRESULT": None, "ERROR": "No result yet"})

    # Status check
    elif "CHECKSOILSENSORSTATUS" in cmd:
        ble_notify(server, {"SOILSENSORSTATUS": ble_sensor_status})

    elif "CHECKSOILMOTORSTATUS" in cmd:
        ble_notify(server, {"SOILMOTORSTATUS": ble_motor_status})

    # System Info
    elif cmd.get("GETSYSTEMINFO") == "GET":
        ble_notify(server, {
            "GETSYSTEMINFO": "OK",
            "version": SOFTWARE_VERSION,
            "device_id": DEVICE_ID,
            "serial_no": SERIAL_NO,
        })

    # Thermal Print
    elif cmd.get("SOILPRINT") == "START":
        print(f"🖨️ [SIMULATOR] Thermal Print Request for: {cmd.get('farmer_name')}")
        time.sleep(1.0)
        ble_notify(server, {"SOILPRINT": "DONE", "message": "Print completed successfully"})

    else:
        print(f"ℹ️ [SIMULATOR] Ignored/Unrecognized command: {cmd}")

# ==============================================================================
# BLE SERVER INITIALIZATION
# ==============================================================================
def run_simulator():
    print("=" * 70)
    print("🚀 ARKASHINE-SOIL HARDWARE BLE SIMULATOR")
    print(f"📡 Device Name: {DEVICE_NAME}")
    print(f"📡 Service UUID: {FIRMWARE_SERVICE_UUID}")
    print(f"📡 Characteristic UUID: {FIRMWARE_DATA_UUID}")
    print("=" * 70)

    try:
        from bless import BlessServer, GATTCharacteristicProperties, GATTAttributePermissions
    except ImportError:
        print("\n❌ Error: The 'bless' Python library is not installed.")
        print("👉 Install it with: pip install bless\n")
        sys.exit(1)

    async def _ble_main():
        global _ble_server_ref
        loop = asyncio.get_event_loop()
        server = BlessServer(name=DEVICE_NAME, loop=loop)
        _ble_server_ref = server

        await server.add_new_service(FIRMWARE_SERVICE_UUID)

        char_flags = (
            GATTCharacteristicProperties.read |
            GATTCharacteristicProperties.write |
            GATTCharacteristicProperties.write_without_response |
            GATTCharacteristicProperties.notify
        )
        permissions = (
            GATTAttributePermissions.readable |
            GATTAttributePermissions.writeable
        )

        await server.add_new_characteristic(
            FIRMWARE_SERVICE_UUID,
            FIRMWARE_DATA_UUID,
            char_flags,
            None,
            permissions,
        )

        def write_request(characteristic, value):
            try:
                handle_ble_command(server, bytes(value))
            except Exception as e:
                import traceback
                traceback.print_exc()

        server.write_request_func = write_request

        print("\n🔵 Starting BLE advertising...")
        await server.start()
        print(f"✅ BLE Simulator is RUNNING and advertising as '{DEVICE_NAME}'!")
        print("📱 You can now open your mobile app, scan, and connect!\n")

        while True:
            await asyncio.sleep(1)

    try:
        asyncio.run(_ble_main())
    except KeyboardInterrupt:
        print("\n👋 Stopping simulator...")

if __name__ == "__main__":
    run_simulator()
