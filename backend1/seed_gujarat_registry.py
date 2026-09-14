"""
Sentinel Gujarat — Seed Realistic CCTV Registry Data
======================================================
Generates 150+ camera assets across Gujarat's major departments:
- Ahmedabad Municipal Corp (AMC)
- Surat Municipal Corp (SMC)
- Gujarat State Police
- GSRTC Transport
- Gujarat Maritime Board (Ports)
- RTO & State Highways
- Education & Institutional
- Vadodara / Rajkot Municipal Corps

Run: python3 seed_gujarat_registry.py
"""

import random
import datetime
from database import SessionLocal, engine
from registry_models import CameraRegistryItem, CameraAuditTrail, Base

# Create tables
Base.metadata.create_all(bind=engine)

random.seed(42)

TODAY = datetime.date.today()

# ─── Vendor / Make-Model Pool ──────────────────────────────────────────────────
VENDORS = [
    "Hikvision DS-2CD2T46G2", "Hikvision DS-2DE4425IW-DE", "Hikvision DS-2CD6365G1",
    "Dahua DH-IPC-HFW5442T", "Dahua DH-SD6AL245XA-HNR", "Dahua DH-IPC-PDBW8802",
    "CP Plus CP-UNC-TS41PL6", "CP Plus CP-UNP-2404ZR8", "CP Plus CP-GPC-D24L3-S",
    "Bosch DINION IP 7100i", "Bosch FLEXIDOME IP 5100i", "Bosch MIC IP fusion 9000i",
    "Axis P3265-V", "Axis Q6135-LE", "Axis M3116-LVE",
    "Honeywell HC35WB5R3", "Pelco IME338-1ERS", "Samsung XNF-8010R",
]

AMC_VENDORS = ["Secure Infra Pvt Ltd", "Gujarat Telelink Ltd", "Sterlite Technologies", "L&T Smart World", "ABB India", "Honeywell India"]

# ─── Camera Data Generators ────────────────────────────────────────────────────

def _random_date(start_year=2018, end_year=2025):
    y = random.randint(start_year, end_year)
    m = random.randint(1, 12)
    d = random.randint(1, 28)
    return f"{y:04d}-{m:02d}-{d:02d}"

def _warranty_from_install(install_date_str, years=3):
    try:
        d = datetime.date.fromisoformat(install_date_str)
        w = d.replace(year=d.year + years)
        return w.isoformat()
    except:
        return ""

def _make_cam(camera_id, name, dept, lat, lon, city, district, **kw):
    install = _random_date(kw.get("install_year_start", 2019), kw.get("install_year_end", 2024))
    resolution = kw.get("resolution", random.choice(["4K UHD", "5MP", "1080p", "1080p", "1080p", "720p"]))
    status = kw.get("status", random.choices(["ONLINE", "ONLINE", "ONLINE", "ONLINE", "OFFLINE", "MAINTENANCE", "DEGRADED"], k=1)[0])
    connectivity = kw.get("connectivity_type", random.choice(["Optical Fiber", "Optical Fiber", "Optical Fiber", "4G/5G Cellular", "GSWAN"]))
    storage_type = kw.get("storage_type", random.choice(["Edge NVR", "Edge NVR", "Central SAN", "Local DVR"]))
    retention = kw.get("retention_days", random.choice([15, 30, 30, 30, 60, 90]))
    camera_type = kw.get("camera_type", random.choice(["PTZ", "Fixed Bullet", "Fixed Bullet", "Dome", "ANPR RLVD"]))
    
    return CameraRegistryItem(
        camera_id=camera_id,
        name=name,
        department=dept,
        ownership_model=kw.get("ownership_model", "Government Owned"),
        latitude=lat + random.uniform(-0.003, 0.003),
        longitude=lon + random.uniform(-0.003, 0.003),
        district=district,
        city=city,
        taluka=kw.get("taluka", "City"),
        ward_zone=kw.get("ward_zone", ""),
        landmark=kw.get("landmark", name),
        coverage_radius_meters=kw.get("coverage_radius_meters", random.choice([50, 80, 100, 120, 150])),
        mount_type=kw.get("mount_type", random.choice(["Pole", "Pole", "Mast", "Gantry", "Building"])),
        camera_type=camera_type,
        make_model=kw.get("make_model", random.choice(VENDORS)),
        resolution=resolution,
        ip_address=f"10.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}",
        mac_address=":".join(f"{random.randint(0,255):02X}" for _ in range(6)),
        rtsp_url="",
        connectivity_type=connectivity,
        bandwidth_mbps=kw.get("bandwidth_mbps", random.choice([4, 8, 10, 20, 50])),
        storage_type=storage_type,
        storage_capacity_tb=kw.get("storage_capacity_tb", random.choice([1, 2, 4, 8])),
        retention_days=retention,
        power_backup_hrs=kw.get("power_backup_hrs", random.choice([2, 4, 4, 6, 8])),
        status=status,
        installation_date=install,
        amc_vendor=kw.get("amc_vendor", random.choice(AMC_VENDORS)),
        warranty_expiry_date=_warranty_from_install(install),
        last_audit_date=_random_date(2024, 2025),
        notes=kw.get("notes", ""),
    )


def seed_all():
    db = SessionLocal()

    # Check if already seeded
    existing = db.query(CameraRegistryItem).count()
    if existing > 50:
        print(f"[Registry Seed] Already {existing} cameras in registry — skipping seed.")
        db.close()
        return existing

    cameras = []

    # ═══════════════════════════════════════════════════════════════════════════
    # 1. AHMEDABAD MUNICIPAL CORP (AMC) — 35 cameras
    # ═══════════════════════════════════════════════════════════════════════════
    amc_locations = [
        ("GJ-AMC-WZ-001", "BRTS Paldi Station Cam-1", 23.0166, 72.5560, "West Zone", "BRTS Paldi Station"),
        ("GJ-AMC-WZ-002", "BRTS Nehru Bridge Cam-1", 23.0310, 72.5650, "West Zone", "BRTS Nehru Bridge"),
        ("GJ-AMC-WZ-003", "Riverfront West Promenade Cam-1", 23.0370, 72.5640, "West Zone", "Sabarmati Riverfront West"),
        ("GJ-AMC-WZ-004", "Riverfront Event Ground Cam-1", 23.0420, 72.5660, "West Zone", "Riverfront Event Ground"),
        ("GJ-AMC-WZ-005", "CG Road Junction Cam-1", 23.0270, 72.5580, "West Zone", "CG Road Main Junction"),
        ("GJ-AMC-WZ-006", "Law Garden Entry Cam-1", 23.0310, 72.5540, "West Zone", "Law Garden Entry"),
        ("GJ-AMC-WZ-007", "Ashram Road Flyover Cam-1", 23.0340, 72.5610, "West Zone", "Ashram Road Flyover"),
        ("GJ-AMC-EZ-008", "Maninagar Circle Cam-1", 23.0010, 72.6000, "East Zone", "Maninagar Circle"),
        ("GJ-AMC-EZ-009", "Kankaria Lake Entry Cam-1", 23.0070, 72.6020, "East Zone", "Kankaria Lake Gate"),
        ("GJ-AMC-EZ-010", "Iscon Cross Roads Cam-1", 23.0260, 72.5090, "East Zone", "Iscon Cross Roads"),
        ("GJ-AMC-NZ-011", "Naroda GIDC Entry Cam-1", 23.0890, 72.6620, "North Zone", "Naroda GIDC Gate"),
        ("GJ-AMC-NZ-012", "Sabarmati Station Cam-1", 23.0640, 72.5880, "North Zone", "Sabarmati Railway Station"),
        ("GJ-AMC-NZ-013", "Ranip BRTS Terminal Cam-1", 23.0710, 72.5600, "North Zone", "Ranip BRTS Terminal"),
        ("GJ-AMC-SZ-014", "Vatva GIDC Main Gate Cam-1", 22.9700, 72.6300, "South Zone", "Vatva GIDC"),
        ("GJ-AMC-SZ-015", "Narol Circle Cam-1", 22.9800, 72.6200, "South Zone", "Narol Circle"),
        ("GJ-AMC-SZ-016", "SP Ring Road — Bopal Cam-1", 23.0210, 72.4700, "South Zone", "SP Ring Road Bopal"),
        ("GJ-AMC-WZ-017", "SG Highway SBR Cam-1", 23.0240, 72.5080, "West Zone", "SG Highway Junction"),
        ("GJ-AMC-WZ-018", "Vastrapur Lake Cam-1", 23.0340, 72.5200, "West Zone", "Vastrapur Lake Area"),
        ("GJ-AMC-EZ-019", "Vastral Junction Cam-1", 23.0080, 72.6400, "East Zone", "Vastral Junction"),
        ("GJ-AMC-NZ-020", "IIM Ahmedabad Gate Cam-1", 23.0330, 72.5280, "North Zone", "IIM Gate"),
        ("GJ-AMC-WZ-021", "Prahladnagar Cross Roads Cam-1", 23.0100, 72.5100, "West Zone", "Prahladnagar Junction"),
        ("GJ-AMC-WZ-022", "Satellite Road Junction Cam-1", 23.0190, 72.5200, "West Zone", "Satellite Road"),
        ("GJ-AMC-NZ-023", "Chandkheda BRTS Cam-1", 23.1020, 72.5700, "North Zone", "Chandkheda BRTS"),
        ("GJ-AMC-EZ-024", "CTM Cross Roads Cam-1", 23.0410, 72.6050, "East Zone", "CTM Cross Roads"),
        ("GJ-AMC-WZ-025", "Helmet Cross Road Cam-1", 23.0150, 72.5320, "West Zone", "Helmet Crossroads"),
        ("GJ-AMC-SZ-026", "Sarkhej Roza Entry Cam-1", 22.9960, 72.4950, "South Zone", "Sarkhej Roza Heritage"),
        ("GJ-AMC-EZ-027", "Bapunagar Junction Cam-1", 23.0450, 72.6200, "East Zone", "Bapunagar Junction"),
        ("GJ-AMC-NZ-028", "Motera Stadium Gate Cam-1", 23.0930, 72.5960, "North Zone", "Motera Stadium Gate-1"),
        ("GJ-AMC-NZ-029", "Motera Stadium Gate-2 Cam-1", 23.0940, 72.5930, "North Zone", "Motera Stadium Gate-2"),
        ("GJ-AMC-WZ-030", "Ambawadi Junction Cam-1", 23.0240, 72.5480, "West Zone", "Ambawadi Junction"),
        ("GJ-AMC-SZ-031", "Sindhu Bhawan Road Cam-1", 23.0130, 72.5050, "South Zone", "Sindhu Bhawan Road"),
        ("GJ-AMC-EZ-032", "Nikol Cross Roads Cam-1", 23.0530, 72.6650, "East Zone", "Nikol Junction"),
        ("GJ-AMC-WZ-033", "Gujarat University Gate Cam-1", 23.0360, 72.5460, "West Zone", "Gujarat University"),
        ("GJ-AMC-NZ-034", "Kali Temple Road Cam-1", 23.0810, 72.5650, "North Zone", "Kali Char Rasta"),
        ("GJ-AMC-SZ-035", "Thaltej Cross Roads Cam-1", 23.0480, 72.4980, "South Zone", "Thaltej Junction"),
    ]
    for cid, name, lat, lon, ward, landmark in amc_locations:
        cameras.append(_make_cam(cid, name, "Ahmedabad Municipal Corp (AMC)", lat, lon,
                                 city="Ahmedabad", district="Ahmedabad", ward_zone=ward, landmark=landmark))

    # ═══════════════════════════════════════════════════════════════════════════
    # 2. SURAT MUNICIPAL CORP (SMC) — 25 cameras
    # ═══════════════════════════════════════════════════════════════════════════
    smc_locations = [
        ("GJ-SMC-DZ-001", "Diamond Bourse Main Gate Cam-1", 21.1702, 72.8311, "Diamond Zone", "Surat Diamond Bourse"),
        ("GJ-SMC-DZ-002", "Surat Diamond Bourse Parking Cam-1", 21.1710, 72.8320, "Diamond Zone", "Bourse Parking"),
        ("GJ-SMC-TZ-003", "Textile Market Sahara Cam-1", 21.1960, 72.8180, "Textile Zone", "Sahara Darwaja Textile"),
        ("GJ-SMC-TZ-004", "Ring Road Overbridge-1 Cam-1", 21.1870, 72.8080, "Textile Zone", "Ring Road OB-1"),
        ("GJ-SMC-TZ-005", "Udhna Gate Junction Cam-1", 21.1740, 72.8450, "Textile Zone", "Udhna Gate"),
        ("GJ-SMC-CZ-006", "Chowk Bazaar Cam-1", 21.2020, 72.8280, "Central Zone", "Surat Chowk Bazaar"),
        ("GJ-SMC-CZ-007", "Athwa Gate Cam-1", 21.1860, 72.8200, "Central Zone", "Athwa Gate Junction"),
        ("GJ-SMC-WZ-008", "Dumas Beach Road Cam-1", 21.1010, 72.7700, "West Zone", "Dumas Beach Road"),
        ("GJ-SMC-WZ-009", "Magdalla Port Road Cam-1", 21.1080, 72.7680, "West Zone", "Magdalla Area"),
        ("GJ-SMC-NZ-010", "Sarthana Nature Park Cam-1", 21.2370, 72.8700, "North Zone", "Sarthana Park Entry"),
        ("GJ-SMC-NZ-011", "Katargam Junction Cam-1", 21.2280, 72.8370, "North Zone", "Katargam Junction"),
        ("GJ-SMC-EZ-012", "Kamrej Toll Cam-1", 21.2690, 72.9600, "East Zone", "Kamrej Toll Plaza"),
        ("GJ-SMC-CZ-013", "Surat Station Area Cam-1", 21.2052, 72.8371, "Central Zone", "Surat Railway Station"),
        ("GJ-SMC-CZ-014", "Majura Gate Cam-1", 21.2100, 72.8410, "Central Zone", "Majura Gate Circle"),
        ("GJ-SMC-DZ-015", "DREAM City Entry Cam-1", 21.1540, 72.8180, "Diamond Zone", "DREAM City Gate"),
        ("GJ-SMC-WZ-016", "Vesu Junction Cam-1", 21.1480, 72.7810, "West Zone", "Vesu Junction"),
        ("GJ-SMC-WZ-017", "Pal-Adajan Road Cam-1", 21.1620, 72.7730, "West Zone", "Pal-Adajan Road"),
        ("GJ-SMC-NZ-018", "Pandesara GIDC Cam-1", 21.2180, 72.8540, "North Zone", "Pandesara Industrial"),
        ("GJ-SMC-EZ-019", "Sachin GIDC Gate Cam-1", 21.0900, 72.8790, "East Zone", "Sachin GIDC"),
        ("GJ-SMC-CZ-020", "Varachha Road Junction Cam-1", 21.2170, 72.8620, "Central Zone", "Varachha Road"),
        ("GJ-SMC-WZ-021", "City Light Area Cam-1", 21.1650, 72.7950, "West Zone", "City Light Road"),
        ("GJ-SMC-NZ-022", "Bhatar Road Cam-1", 21.2010, 72.8500, "North Zone", "Bhatar Junction"),
        ("GJ-SMC-CZ-023", "Parle Point Cam-1", 21.1810, 72.8090, "Central Zone", "Parle Point"),
        ("GJ-SMC-DZ-024", "Althan Junction Cam-1", 21.1640, 72.8010, "Diamond Zone", "Althan Junction"),
        ("GJ-SMC-EZ-025", "Kadodara Highway Cam-1", 21.2380, 72.9350, "East Zone", "Kadodara NH Entry"),
    ]
    for cid, name, lat, lon, ward, landmark in smc_locations:
        cameras.append(_make_cam(cid, name, "Surat Municipal Corp (SMC)", lat, lon,
                                 city="Surat", district="Surat", ward_zone=ward, landmark=landmark))

    # ═══════════════════════════════════════════════════════════════════════════
    # 3. GUJARAT STATE POLICE — 30 cameras
    # ═══════════════════════════════════════════════════════════════════════════
    police_locations = [
        ("GJ-POL-AMD-001", "Police Control Room Shahibaug Cam-1", 23.0530, 72.5850, "Ahmedabad", "Shahibaug PCR"),
        ("GJ-POL-AMD-002", "SG Highway Checkpoint-1 Cam-1", 23.0250, 72.5100, "Ahmedabad", "SG Highway Checkpoint"),
        ("GJ-POL-AMD-003", "Ahmedabad Airport Entry Cam-1", 23.0770, 72.6300, "Ahmedabad", "SVP Airport Entry"),
        ("GJ-POL-AMD-004", "Sabarmati Jail Perimeter Cam-1", 23.0620, 72.5800, "Ahmedabad", "Sabarmati Jail"),
        ("GJ-POL-AMD-005", "Lal Darwaja Junction Cam-1", 23.0250, 72.5850, "Ahmedabad", "Lal Darwaja Junction"),
        ("GJ-POL-SRT-006", "Surat City Police HQ Cam-1", 21.1960, 72.8300, "Surat", "Surat Police HQ"),
        ("GJ-POL-SRT-007", "Hazira Industrial Gate Cam-1", 21.1000, 72.6200, "Surat", "Hazira Gate"),
        ("GJ-POL-SRT-008", "Surat Airport Area Cam-1", 21.1150, 72.7420, "Surat", "Surat Airport"),
        ("GJ-POL-VDR-009", "Vadodara Sayajibaug Gate Cam-1", 22.3150, 73.1850, "Vadodara", "Sayajibaug"),
        ("GJ-POL-VDR-010", "Vadodara Alkapuri Circle Cam-1", 22.3040, 73.1780, "Vadodara", "Alkapuri"),
        ("GJ-POL-RJK-011", "Rajkot Gondal Road Cam-1", 22.2900, 70.8100, "Rajkot", "Gondal Road"),
        ("GJ-POL-RJK-012", "Rajkot University Road Cam-1", 22.3050, 70.8020, "Rajkot", "University Road"),
        ("GJ-POL-BVN-013", "Bhavnagar ST Bus Depot Cam-1", 21.7650, 72.1510, "Bhavnagar", "ST Bus Depot"),
        ("GJ-POL-JGH-014", "Junagadh Upperkot Fort Cam-1", 21.5200, 70.4630, "Junagadh", "Upperkot Fort Entry"),
        ("GJ-POL-MHR-015", "Mehsana Highway Checkpost Cam-1", 23.5880, 72.3900, "Mehsana", "NH Highway Checkpost"),
        ("GJ-POL-AMD-016", "Gandhinagar Capital Complex Cam-1", 23.2150, 72.6370, "Gandhinagar", "Sachivalaya Complex"),
        ("GJ-POL-AMD-017", "Gandhinagar Dandi Kutir Cam-1", 23.1920, 72.6320, "Gandhinagar", "Dandi Kutir Museum"),
        ("GJ-POL-KCH-018", "Bhuj Airport Area Cam-1", 23.2430, 69.6700, "Kutch", "Bhuj Airport"),
        ("GJ-POL-KCH-019", "Mandvi Beach Entry Cam-1", 22.8330, 69.3490, "Kutch", "Mandvi Beach"),
        ("GJ-POL-ANR-020", "Anand Amul Circle Cam-1", 22.5570, 72.9530, "Anand", "Amul Dairy Circle"),
        ("GJ-POL-AMD-021", "Sardar Patel Stadium Cam-1", 23.0700, 72.5950, "Ahmedabad", "Sardar Patel Stadium"),
        ("GJ-POL-SRT-022", "Surat Ring Road Checkpoint Cam-1", 21.2200, 72.8850, "Surat", "Ring Road Check"),
        ("GJ-POL-VDR-023", "Vadodara NH-48 Entry Cam-1", 22.3100, 73.2100, "Vadodara", "NH-48 Entry Point"),
        ("GJ-POL-RJK-024", "Rajkot-Ahmedabad Highway Entry Cam-1", 22.3250, 70.8350, "Rajkot", "Highway Entry"),
        ("GJ-POL-AMR-025", "Amreli District HQ Cam-1", 21.5970, 71.2170, "Amreli", "District HQ Gate"),
        ("GJ-POL-VLS-026", "Valsad Coastal Watch Cam-1", 20.5970, 72.9310, "Valsad", "Coastal Watch Tower"),
        ("GJ-POL-NAV-027", "Navsari Junction Cam-1", 20.9470, 72.9520, "Navsari", "Main Junction"),
        ("GJ-POL-PAN-028", "Palanpur NH Entry Cam-1", 24.1700, 72.4260, "Banaskantha", "NH Entry Palanpur"),
        ("GJ-POL-BRD-029", "Bharuch NH-8 Bridge Cam-1", 21.7050, 73.0030, "Bharuch", "Narmada Bridge"),
        ("GJ-POL-GDH-030", "Godhra Railway Station Cam-1", 22.7760, 73.6200, "Panchmahal", "Godhra Station"),
    ]
    for cid, name, lat, lon, city, landmark in police_locations:
        cameras.append(_make_cam(cid, name, "Gujarat State Police", lat, lon,
                                 city=city, district=city, landmark=landmark,
                                 camera_type=random.choice(["PTZ", "ANPR RLVD", "Fixed Bullet", "Dome"])))

    # ═══════════════════════════════════════════════════════════════════════════
    # 4. GSRTC TRANSPORT — 20 cameras
    # ═══════════════════════════════════════════════════════════════════════════
    gsrtc_locations = [
        ("GJ-GSRTC-001", "Geeta Mandir Bus Terminal Cam-1", 23.0200, 72.5980, "Ahmedabad", "Geeta Mandir"),
        ("GJ-GSRTC-002", "Geeta Mandir Bus Terminal Cam-2", 23.0210, 72.5970, "Ahmedabad", "Geeta Mandir Platform"),
        ("GJ-GSRTC-003", "Paldi GSRTC Depot Cam-1", 23.0160, 72.5550, "Ahmedabad", "Paldi Depot"),
        ("GJ-GSRTC-004", "Ranip GSRTC Depot Cam-1", 23.0700, 72.5610, "Ahmedabad", "Ranip Depot"),
        ("GJ-GSRTC-005", "Surat Central Bus Station Cam-1", 21.2020, 72.8360, "Surat", "Central Bus Station"),
        ("GJ-GSRTC-006", "Surat Central Bus Station Cam-2", 21.2030, 72.8370, "Surat", "Central Bus Platform"),
        ("GJ-GSRTC-007", "Vadodara ST Bus Depot Cam-1", 22.3100, 73.1900, "Vadodara", "Vadodara ST Depot"),
        ("GJ-GSRTC-008", "Rajkot Central Bus Station Cam-1", 22.3000, 70.7900, "Rajkot", "Rajkot Bus Station"),
        ("GJ-GSRTC-009", "Bhavnagar Bus Depot Cam-1", 21.7670, 72.1530, "Bhavnagar", "Bhavnagar Depot"),
        ("GJ-GSRTC-010", "Junagadh Bus Depot Cam-1", 21.5240, 70.4620, "Junagadh", "Junagadh Depot"),
        ("GJ-GSRTC-011", "Jamnagar Bus Station Cam-1", 22.4700, 70.0700, "Jamnagar", "Jamnagar Station"),
        ("GJ-GSRTC-012", "Bhuj Bus Depot Cam-1", 23.2430, 69.6600, "Kutch", "Bhuj Depot"),
        ("GJ-GSRTC-013", "Gandhinagar GSRTC Depot Cam-1", 23.2200, 72.6400, "Gandhinagar", "Gandhinagar Depot"),
        ("GJ-GSRTC-014", "Mehsana Bus Stand Cam-1", 23.5920, 72.3840, "Mehsana", "Mehsana Stand"),
        ("GJ-GSRTC-015", "Anand Bus Station Cam-1", 22.5580, 72.9550, "Anand", "Anand Station"),
        ("GJ-GSRTC-016", "Bharuch Bus Depot Cam-1", 21.7040, 73.0020, "Bharuch", "Bharuch Depot"),
        ("GJ-GSRTC-017", "Nadiad Bus Stand Cam-1", 22.6930, 72.8620, "Kheda", "Nadiad Stand"),
        ("GJ-GSRTC-018", "Himmatnagar Bus Depot Cam-1", 23.5940, 72.9610, "Sabarkantha", "Himmatnagar Depot"),
        ("GJ-GSRTC-019", "Vapi Bus Station Cam-1", 20.3710, 72.9200, "Valsad", "Vapi Station"),
        ("GJ-GSRTC-020", "Dwarka Bus Stand Cam-1", 22.2380, 68.9690, "Devbhoomi Dwarka", "Dwarka Stand"),
    ]
    for cid, name, lat, lon, city, landmark in gsrtc_locations:
        cameras.append(_make_cam(cid, name, "GSRTC Transport", lat, lon,
                                 city=city, district=city, landmark=landmark,
                                 camera_type="Fixed Bullet", connectivity_type="4G/5G Cellular"))

    # ═══════════════════════════════════════════════════════════════════════════
    # 5. GUJARAT MARITIME BOARD — 15 cameras
    # ═══════════════════════════════════════════════════════════════════════════
    gmb_locations = [
        ("GJ-GMB-MND-001", "Mundra Port Main Gate Cam-1", 22.7390, 69.7190, "Mundra", "Mundra Port Gate"),
        ("GJ-GMB-MND-002", "Mundra Port Berth-3 Cam-1", 22.7420, 69.7220, "Mundra", "Mundra Berth-3"),
        ("GJ-GMB-MND-003", "Mundra Port Container Yard Cam-1", 22.7380, 69.7160, "Mundra", "Container Yard"),
        ("GJ-GMB-KDL-004", "Kandla Port Entry Cam-1", 23.0300, 70.2200, "Kandla", "Kandla Entry"),
        ("GJ-GMB-KDL-005", "Kandla Port Wharf Cam-1", 23.0320, 70.2180, "Kandla", "Kandla Wharf"),
        ("GJ-GMB-KDL-006", "Kandla Port Customs Gate Cam-1", 23.0290, 70.2210, "Kandla", "Customs Gate"),
        ("GJ-GMB-PPV-007", "Pipavav Port Gate Cam-1", 20.9100, 71.5300, "Pipavav", "Pipavav Gate"),
        ("GJ-GMB-PPV-008", "Pipavav Port Terminal Cam-1", 20.9120, 71.5280, "Pipavav", "Terminal Area"),
        ("GJ-GMB-HAZ-009", "Hazira Port Entry Cam-1", 21.1020, 72.6230, "Hazira", "Hazira Port Entry"),
        ("GJ-GMB-HAZ-010", "Hazira LNG Terminal Cam-1", 21.1040, 72.6250, "Hazira", "LNG Terminal"),
        ("GJ-GMB-DAH-011", "Dahej Port Gate Cam-1", 21.7120, 72.5740, "Dahej", "Dahej Port"),
        ("GJ-GMB-NAV-012", "Navlakhi Port Cam-1", 22.9580, 70.4520, "Navlakhi", "Navlakhi Jetty"),
        ("GJ-GMB-OKH-013", "Okha Port Cam-1", 22.4680, 69.0700, "Okha", "Okha Port Gate"),
        ("GJ-GMB-POR-014", "Porbandar Fishing Harbour Cam-1", 21.6420, 69.6140, "Porbandar", "Fishing Harbour"),
        ("GJ-GMB-VER-015", "Veraval Fishing Harbour Cam-1", 20.9070, 70.3680, "Veraval", "Veraval Harbour"),
    ]
    for cid, name, lat, lon, city, landmark in gmb_locations:
        cameras.append(_make_cam(cid, name, "Gujarat Maritime Board", lat, lon,
                                 city=city, district=city, landmark=landmark,
                                 camera_type=random.choice(["PTZ", "Thermal", "Fixed Bullet"]),
                                 resolution="4K UHD", connectivity_type="P2P RF",
                                 retention_days=60, coverage_radius_meters=150))

    # ═══════════════════════════════════════════════════════════════════════════
    # 6. RTO & STATE HIGHWAYS — 15 cameras
    # ═══════════════════════════════════════════════════════════════════════════
    rto_locations = [
        ("GJ-RTO-BHL-001", "Bhilad Interstate Checkpost Cam-1", 20.1700, 72.9500, "Bhilad", "Maharashtra Border"),
        ("GJ-RTO-BHL-002", "Bhilad Interstate Checkpost Cam-2", 20.1710, 72.9510, "Bhilad", "MH Border Lane-2"),
        ("GJ-RTO-SHM-003", "Shamlaji RJ Checkpost Cam-1", 23.9600, 73.1300, "Shamlaji", "Rajasthan Border"),
        ("GJ-RTO-SHM-004", "Shamlaji RJ Checkpost Cam-2", 23.9610, 73.1310, "Shamlaji", "RJ Border Lane-2"),
        ("GJ-RTO-SMK-005", "Samakhiyali Toll Plaza Cam-1", 23.3000, 70.5000, "Samakhiyali", "Kutch Entry Toll"),
        ("GJ-RTO-SMK-006", "Samakhiyali Toll Plaza Cam-2", 23.3010, 70.5010, "Samakhiyali", "Toll Lane-2"),
        ("GJ-RTO-AXP-007", "Ahmedabad-Vadodara Expressway Km-40 Cam-1", 22.8200, 72.7800, "Anand", "AXP Km-40"),
        ("GJ-RTO-AXP-008", "Ahmedabad-Vadodara Expressway Km-80 Cam-1", 22.5600, 72.9200, "Vadodara", "AXP Km-80"),
        ("GJ-RTO-SPR-009", "SP Ring Road — Nikol Cam-1", 23.0550, 72.6700, "Ahmedabad", "SPR Nikol"),
        ("GJ-RTO-SPR-010", "SP Ring Road — Gota Cam-1", 23.1050, 72.5350, "Ahmedabad", "SPR Gota"),
        ("GJ-RTO-NH8-011", "NH-8 Navsari Toll Cam-1", 20.9500, 72.9500, "Navsari", "NH-8 Toll"),
        ("GJ-RTO-NH8-012", "NH-8 Valsad Toll Cam-1", 20.6000, 72.9200, "Valsad", "NH-8 Valsad"),
        ("GJ-RTO-NH48-013", "NH-48 Chiloda Toll Cam-1", 23.1800, 72.6800, "Gandhinagar", "Chiloda Toll"),
        ("GJ-RTO-NH27-014", "NH-27 Viramgam Entry Cam-1", 23.1200, 71.9900, "Viramgam", "NH-27 Entry"),
        ("GJ-RTO-SH-015", "Rajkot-Morbi SH Cam-1", 22.4200, 70.6500, "Morbi", "SH Rajkot-Morbi"),
    ]
    for cid, name, lat, lon, city, landmark in rto_locations:
        cameras.append(_make_cam(cid, name, "RTO & State Highways", lat, lon,
                                 city=city, district=city, landmark=landmark,
                                 camera_type="ANPR RLVD", mount_type="Gantry",
                                 resolution="5MP", retention_days=90))

    # ═══════════════════════════════════════════════════════════════════════════
    # 7. EDUCATION & INSTITUTIONAL — 10 cameras
    # ═══════════════════════════════════════════════════════════════════════════
    edu_locations = [
        ("GJ-EDU-GTU-001", "GTU Chandkheda Campus Gate Cam-1", 23.1100, 72.5800, "Ahmedabad", "GTU Gate"),
        ("GJ-EDU-GTU-002", "GTU Exam Hall Corridor Cam-1", 23.1110, 72.5810, "Ahmedabad", "GTU Exam Hall"),
        ("GJ-EDU-GU-003", "Gujarat University Main Gate Cam-1", 23.0370, 72.5450, "Ahmedabad", "GU Main Gate"),
        ("GJ-EDU-GU-004", "Gujarat University Convocation Hall Cam-1", 23.0380, 72.5460, "Ahmedabad", "GU Convocation"),
        ("GJ-EDU-MSU-005", "MS University Vadodara Gate Cam-1", 22.3140, 73.1830, "Vadodara", "MSU Gate"),
        ("GJ-EDU-SU-006", "Saurashtra University Gate Cam-1", 22.3100, 70.7800, "Rajkot", "SU Gate"),
        ("GJ-EDU-SPU-007", "Sardar Patel University Gate Cam-1", 22.7200, 72.8900, "Anand", "SPU Gate"),
        ("GJ-EDU-DDU-008", "DDU Nadiad Gate Cam-1", 22.6900, 72.8700, "Nadiad", "DDU Gate"),
        ("GJ-EDU-IITGN-009", "IIT Gandhinagar Gate Cam-1", 23.2110, 72.6840, "Gandhinagar", "IITGN Gate"),
        ("GJ-EDU-NID-010", "NID Ahmedabad Gate Cam-1", 23.0320, 72.5350, "Ahmedabad", "NID Gate"),
    ]
    for cid, name, lat, lon, city, landmark in edu_locations:
        cameras.append(_make_cam(cid, name, "Education & Institutional", lat, lon,
                                 city=city, district=city, landmark=landmark,
                                 camera_type="Dome", connectivity_type="Optical Fiber",
                                 ownership_model="Government Owned"))

    # ═══════════════════════════════════════════════════════════════════════════
    # 8. VADODARA & RAJKOT MUNICIPAL CORPS — 10 cameras each
    # ═══════════════════════════════════════════════════════════════════════════
    vmc_locations = [
        ("GJ-VMC-001", "Vadodara Sayaji Garden Cam-1", 22.3150, 73.1860, "Vadodara"),
        ("GJ-VMC-002", "Vadodara Fatehgunj Circle Cam-1", 22.3200, 73.1950, "Vadodara"),
        ("GJ-VMC-003", "Vadodara Akota Junction Cam-1", 22.2900, 73.1700, "Vadodara"),
        ("GJ-VMC-004", "Vadodara Manjalpur Cam-1", 22.2700, 73.1800, "Vadodara"),
        ("GJ-VMC-005", "Vadodara Gotri Road Cam-1", 22.3300, 73.1500, "Vadodara"),
        ("GJ-VMC-006", "Vadodara Subhanpura Cam-1", 22.3050, 73.1650, "Vadodara"),
        ("GJ-VMC-007", "Vadodara Karelibaug Cam-1", 22.3250, 73.2050, "Vadodara"),
        ("GJ-VMC-008", "Vadodara Sama Junction Cam-1", 22.3400, 73.2100, "Vadodara"),
        ("GJ-VMC-009", "Vadodara Waghodia Road Cam-1", 22.3100, 73.2200, "Vadodara"),
        ("GJ-VMC-010", "Vadodara Race Course Cam-1", 22.3080, 73.1780, "Vadodara"),
    ]
    for cid, name, lat, lon, city in vmc_locations:
        cameras.append(_make_cam(cid, name, "Vadodara Municipal Corp (VMC)", lat, lon,
                                 city=city, district="Vadodara"))

    rmc_locations = [
        ("GJ-RMC-001", "Rajkot Trikon Baug Cam-1", 22.3050, 70.7950, "Rajkot"),
        ("GJ-RMC-002", "Rajkot Yagnik Road Cam-1", 22.2950, 70.8050, "Rajkot"),
        ("GJ-RMC-003", "Rajkot 150 Feet Ring Road Cam-1", 22.2800, 70.7800, "Rajkot"),
        ("GJ-RMC-004", "Rajkot Astron Chowk Cam-1", 22.3100, 70.8200, "Rajkot"),
        ("GJ-RMC-005", "Rajkot Kalavad Road Cam-1", 22.3200, 70.7700, "Rajkot"),
        ("GJ-RMC-006", "Rajkot Aji Dam Road Cam-1", 22.2700, 70.7600, "Rajkot"),
        ("GJ-RMC-007", "Rajkot Raiya Road Cam-1", 22.2850, 70.7700, "Rajkot"),
        ("GJ-RMC-008", "Rajkot Mavdi Junction Cam-1", 22.2750, 70.8100, "Rajkot"),
        ("GJ-RMC-009", "Rajkot Nana Mava Circle Cam-1", 22.3150, 70.8300, "Rajkot"),
        ("GJ-RMC-010", "Rajkot Paddhari Road Cam-1", 22.3350, 70.7500, "Rajkot"),
    ]
    for cid, name, lat, lon, city in rmc_locations:
        cameras.append(_make_cam(cid, name, "Rajkot Municipal Corp (RMC)", lat, lon,
                                 city=city, district="Rajkot"))

    # ═══════════════════════════════════════════════════════════════════════════
    # PERSIST ALL
    # ═══════════════════════════════════════════════════════════════════════════
    print(f"[Registry Seed] Seeding {len(cameras)} camera assets...")
    db.add_all(cameras)

    # Create audit trail entries for all
    for cam in cameras:
        db.add(CameraAuditTrail(
            camera_id=cam.camera_id,
            action="ONBOARDED",
            performed_by="Gujarat IT Registry Migration",
            department=cam.department,
            details=f"Initial seed: {cam.name} at ({cam.latitude:.4f}, {cam.longitude:.4f})",
        ))

    db.commit()
    print(f"[Registry Seed] ✅ Successfully seeded {len(cameras)} cameras with audit trails.")
    db.close()
    return len(cameras)


if __name__ == "__main__":
    seed_all()
