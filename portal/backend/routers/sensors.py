from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timedelta
import random
import math

from database import get_db, SensorData

router = APIRouter()

DEVICES = [
    {"id": "CC-001", "name": "遠心圧縮機 #1", "location": "プラントA - ユニット1"},
    {"id": "CC-002", "name": "遠心圧縮機 #2", "location": "プラントA - ユニット2"},
    {"id": "CC-003", "name": "遠心圧縮機 #3", "location": "プラントB - ユニット1"},
    {"id": "CC-004", "name": "遠心圧縮機 #4", "location": "プラントB - ユニット2"},
]

DEVICE_BASE_PARAMS = {
    "CC-001": {"rpm": 12000, "inlet_pressure": 1.013, "pressure_ratio": 4.2, "inlet_temp": 25.0, "power_kw": 850},
    "CC-002": {"rpm": 11500, "inlet_pressure": 1.013, "pressure_ratio": 3.8, "inlet_temp": 26.0, "power_kw": 780},
    "CC-003": {"rpm": 13500, "inlet_pressure": 1.013, "pressure_ratio": 5.1, "inlet_temp": 24.0, "power_kw": 1050},
    "CC-004": {"rpm": 10800, "inlet_pressure": 1.013, "pressure_ratio": 3.5, "inlet_temp": 27.0, "power_kw": 720},
}


def generate_sensor_reading(device_id: str, timestamp: datetime = None, noise_factor: float = 1.0) -> dict:
    if timestamp is None:
        timestamp = datetime.utcnow()

    params = DEVICE_BASE_PARAMS.get(device_id, DEVICE_BASE_PARAMS["CC-001"])

    t = timestamp.timestamp()
    slow_wave = math.sin(t / 3600) * 0.02
    fast_wave = math.sin(t / 300) * 0.01

    rpm_noise = random.gauss(0, 50 * noise_factor)
    rpm = params["rpm"] * (1 + slow_wave + fast_wave) + rpm_noise
    rpm = max(params["rpm"] * 0.85, min(params["rpm"] * 1.15, rpm))

    inlet_pressure = params["inlet_pressure"] + random.gauss(0, 0.005 * noise_factor)
    inlet_pressure = max(0.95, min(1.10, inlet_pressure))

    pressure_ratio = params["pressure_ratio"] + slow_wave * 0.3 + random.gauss(0, 0.05 * noise_factor)
    pressure_ratio = max(params["pressure_ratio"] * 0.90, min(params["pressure_ratio"] * 1.10, pressure_ratio))
    outlet_pressure = inlet_pressure * pressure_ratio

    temp_wave = math.sin(t / 7200) * 3
    inlet_temp = params["inlet_temp"] + temp_wave + random.gauss(0, 0.5 * noise_factor)
    inlet_temp = max(15.0, min(45.0, inlet_temp))

    polytropic_efficiency = 0.78 + random.gauss(0, 0.01 * noise_factor)
    polytropic_efficiency = max(0.70, min(0.88, polytropic_efficiency))
    k = 1.4
    outlet_temp = inlet_temp * (pressure_ratio ** ((k - 1) / (k * polytropic_efficiency))) + random.gauss(0, 1.0)
    outlet_temp = max(inlet_temp, outlet_temp)

    vibration_base = 2.5 + (params["rpm"] / 12000) * 1.5
    vibration = vibration_base + abs(random.gauss(0, 0.3 * noise_factor)) + abs(slow_wave * 0.5)
    vibration = max(0.5, min(15.0, vibration))

    power_factor = (rpm / params["rpm"]) ** 3
    power_kw = params["power_kw"] * power_factor + random.gauss(0, 10 * noise_factor)
    power_kw = max(params["power_kw"] * 0.6, min(params["power_kw"] * 1.2, power_kw))

    efficiency = (polytropic_efficiency * 100) + random.gauss(0, 0.5 * noise_factor)
    efficiency = max(65.0, min(92.0, efficiency))

    if vibration > 10.0 or efficiency < 70.0:
        status = "alarm"
    elif vibration > 7.0 or efficiency < 74.0 or rpm < params["rpm"] * 0.90:
        status = "warning"
    else:
        status = "normal"

    return {
        "device_id": device_id,
        "timestamp": timestamp.isoformat(),
        "inlet_pressure": round(inlet_pressure, 4),
        "outlet_pressure": round(outlet_pressure, 4),
        "inlet_temp": round(inlet_temp, 2),
        "outlet_temp": round(outlet_temp, 2),
        "vibration": round(vibration, 3),
        "rpm": round(rpm, 1),
        "power_kw": round(power_kw, 1),
        "efficiency": round(efficiency, 2),
        "status": status,
    }


@router.get("/devices")
async def get_devices():
    return {"devices": DEVICES}


@router.get("/latest")
async def get_latest_readings(db: AsyncSession = Depends(get_db)):
    results = []
    for device in DEVICES:
        device_id = device["id"]
        stmt = (
            select(SensorData)
            .where(SensorData.device_id == device_id)
            .order_by(desc(SensorData.timestamp))
            .limit(1)
        )
        result = await db.execute(stmt)
        latest = result.scalar_one_or_none()

        if latest:
            reading = {
                "device_id": latest.device_id,
                "timestamp": latest.timestamp.isoformat(),
                "inlet_pressure": latest.inlet_pressure,
                "outlet_pressure": latest.outlet_pressure,
                "inlet_temp": latest.inlet_temp,
                "outlet_temp": latest.outlet_temp,
                "vibration": latest.vibration,
                "rpm": latest.rpm,
                "power_kw": latest.power_kw,
                "efficiency": latest.efficiency,
                "status": latest.status,
            }
        else:
            reading = generate_sensor_reading(device_id)

        results.append({
            **device,
            **reading,
        })

    return {"readings": results}


@router.get("/history/{device_id}")
async def get_history(device_id: str, hours: int = 24, db: AsyncSession = Depends(get_db)):
    device_ids = [d["id"] for d in DEVICES]
    if device_id not in device_ids:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")

    since = datetime.utcnow() - timedelta(hours=hours)
    stmt = (
        select(SensorData)
        .where(SensorData.device_id == device_id)
        .where(SensorData.timestamp >= since)
        .order_by(SensorData.timestamp)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    if len(records) < 10:
        history = []
        interval_minutes = 15
        total_points = hours * 60 // interval_minutes
        for i in range(total_points):
            ts = since + timedelta(minutes=i * interval_minutes)
            reading = generate_sensor_reading(device_id, ts, noise_factor=0.8)
            history.append(reading)
        return {"device_id": device_id, "history": history}

    history = [
        {
            "device_id": r.device_id,
            "timestamp": r.timestamp.isoformat(),
            "inlet_pressure": r.inlet_pressure,
            "outlet_pressure": r.outlet_pressure,
            "inlet_temp": r.inlet_temp,
            "outlet_temp": r.outlet_temp,
            "vibration": r.vibration,
            "rpm": r.rpm,
            "power_kw": r.power_kw,
            "efficiency": r.efficiency,
            "status": r.status,
        }
        for r in records
    ]
    return {"device_id": device_id, "history": history}


@router.post("/generate")
async def generate_reading(device_id: str = "CC-001", db: AsyncSession = Depends(get_db)):
    device_ids = [d["id"] for d in DEVICES]
    if device_id not in device_ids:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")

    reading_data = generate_sensor_reading(device_id)
    record = SensorData(
        device_id=reading_data["device_id"],
        timestamp=datetime.utcnow(),
        inlet_pressure=reading_data["inlet_pressure"],
        outlet_pressure=reading_data["outlet_pressure"],
        inlet_temp=reading_data["inlet_temp"],
        outlet_temp=reading_data["outlet_temp"],
        vibration=reading_data["vibration"],
        rpm=reading_data["rpm"],
        power_kw=reading_data["power_kw"],
        efficiency=reading_data["efficiency"],
        status=reading_data["status"],
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return {"message": "Reading generated", "reading": reading_data}
