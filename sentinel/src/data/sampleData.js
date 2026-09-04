// Sample camera data representing 50 cameras across Gujarat from different departments
export const DEPARTMENTS = [
  { id: 'traffic', name: 'Traffic Police', color: '#3b82f6' },
  { id: 'municipal', name: 'Municipal Corporation', color: '#10b981' },
  { id: 'rto', name: 'RTO', color: '#f59e0b' },
  { id: 'food_civil', name: 'Food & Civil Supplies', color: '#8b5cf6' },
  { id: 'home', name: 'Home Department', color: '#ef4444' },
  { id: 'forest', name: 'Forest Department', color: '#14b8a6' },
];

export const CAMERA_TYPES = ['PTZ', 'Fixed', 'Dome', 'Bullet', 'Box'];
export const CAMERA_VENDORS = ['Hikvision', 'Dahua', 'CP Plus', 'Bosch', 'Honeywell', 'Axis'];

const LOCATIONS = [
  { city: 'Ahmedabad', spots: [
    { name: 'SG Highway Junction', lat: 23.0300, lng: 72.5100 },
    { name: 'Ashram Road', lat: 23.0258, lng: 72.5873 },
    { name: 'CG Road', lat: 23.0258, lng: 72.5636 },
    { name: 'Satellite Road', lat: 23.0150, lng: 72.5190 },
    { name: 'Maninagar Circle', lat: 23.0010, lng: 72.6020 },
    { name: 'Kalupur Station', lat: 23.0245, lng: 72.6093 },
    { name: 'IIM Ahmedabad Gate', lat: 23.0305, lng: 72.5272 },
    { name: 'Sabarmati Riverfront', lat: 23.0386, lng: 72.5778 },
    { name: 'Paldi Junction', lat: 23.0130, lng: 72.5650 },
    { name: 'Naroda GIDC', lat: 23.0920, lng: 72.6430 },
  ]},
  { city: 'Gandhinagar', spots: [
    { name: 'Sector 17 Police Bhawan', lat: 23.2200, lng: 72.6400 },
    { name: 'Infocity Gate', lat: 23.2100, lng: 72.6900 },
    { name: 'Akshardham Temple Road', lat: 23.2260, lng: 72.6650 },
    { name: 'CH-0 Circle', lat: 23.2150, lng: 72.6370 },
    { name: 'Sector 21 Market', lat: 23.2220, lng: 72.6500 },
  ]},
  { city: 'Surat', spots: [
    { name: 'Ring Road Udhna', lat: 21.1700, lng: 72.8400 },
    { name: 'Textile Market', lat: 21.1850, lng: 72.8300 },
    { name: 'Athwa Gate', lat: 21.1780, lng: 72.8200 },
    { name: 'Surat Station', lat: 21.2060, lng: 72.8370 },
    { name: 'VR Mall Junction', lat: 21.1430, lng: 72.7770 },
  ]},
  { city: 'Vadodara', spots: [
    { name: 'Alkapuri Circle', lat: 22.3100, lng: 73.1700 },
    { name: 'Sayajigunj', lat: 22.3130, lng: 73.1890 },
    { name: 'Fatehgunj', lat: 22.3200, lng: 73.1810 },
    { name: 'Waghodia Road', lat: 22.2950, lng: 73.2050 },
    { name: 'Gotri Circle', lat: 22.3190, lng: 73.1470 },
  ]},
  { city: 'Rajkot', spots: [
    { name: 'Kalawad Road', lat: 22.3100, lng: 70.7800 },
    { name: 'Yagnik Road', lat: 22.2950, lng: 70.7900 },
    { name: 'Kalavad Chowk', lat: 22.3000, lng: 70.8050 },
    { name: 'University Road', lat: 22.3150, lng: 70.8100 },
  ]},
  { city: 'Bhavnagar', spots: [
    { name: 'Crescent Circle', lat: 21.7650, lng: 72.1520 },
    { name: 'Waghawadi Road', lat: 21.7700, lng: 72.1400 },
  ]},
  { city: 'Jamnagar', spots: [
    { name: 'Teen Batti Chowk', lat: 22.4710, lng: 70.0580 },
    { name: 'KV Road', lat: 22.4750, lng: 70.0650 },
  ]},
  { city: 'Junagadh', spots: [
    { name: 'Girnar Gate', lat: 21.5220, lng: 70.4580 },
    { name: 'MG Road Junagadh', lat: 21.5200, lng: 70.4550 },
  ]},
  { city: 'Valsad', spots: [
    { name: 'Tithal Road', lat: 20.5990, lng: 72.9340 },
    { name: 'Valsad Station', lat: 20.6100, lng: 72.9260 },
  ]},
  { city: 'Dahod', spots: [
    { name: 'Dahod MP Border RTO Checkpost', lat: 22.8385, lng: 74.2550 },
  ]},
  { city: 'Devbhumi Dwarka', spots: [
    { name: 'Dwarkadhish Temple Highway Corridor', lat: 22.2442, lng: 68.9685 },
    { name: 'Okha Port Coastal Terminal', lat: 22.4703, lng: 69.0712 },
  ]},
  { city: 'Gir Somnath', spots: [
    { name: 'Somnath Temple Coastal Ring Road', lat: 20.8880, lng: 70.4010 },
    { name: 'Veraval Fishing Harbor Gate', lat: 20.9067, lng: 70.3685 },
  ]},
  { city: 'Kutch', spots: [
    { name: 'Kandla Port Terminal Highway Gate', lat: 23.0753, lng: 70.1337 },
    { name: 'Bhuj Jubilee Ground Circle', lat: 23.2420, lng: 69.6669 },
  ]},
];

export const generateCameras = () => {
  let cameraId = 1;
  const cameras = [];
  LOCATIONS.forEach(location => {
    location.spots.forEach(spot => {
      const dept = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
      const vendor = CAMERA_VENDORS[Math.floor(Math.random() * CAMERA_VENDORS.length)];
      const type = CAMERA_TYPES[Math.floor(Math.random() * CAMERA_TYPES.length)];
      const statusRand = Math.random();
      const status = statusRand > 0.15 ? 'online' : (statusRand > 0.05 ? 'maintenance' : 'offline');
      const stream_num = ((cameraId - 1) % 30) + 1;
      cameras.push({
        id: `CAM-${String(cameraId).padStart(3, '0')}`,
        name: `${spot.name} Cam`,
        stream_num: stream_num,
        lat: spot.lat,
        lng: spot.lng,
        city: location.city,
        department: dept,
        vendor,
        type,
        status,
        resolution: Math.random() > 0.4 ? '1080p' : (Math.random() > 0.5 ? '4K' : '720p'),
        storage: Math.random() > 0.5 ? 'Cloud' : (Math.random() > 0.5 ? 'Local NVR' : 'Hybrid'),
        retentionDays: [7, 15, 30][Math.floor(Math.random() * 3)],
        installDate: `202${Math.floor(Math.random() * 4) + 2}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        protocol: Math.random() > 0.3 ? 'ONVIF' : 'RTSP',
      });
      cameraId++;
    });
  });
  return cameras;
};

export const generateWatchlist = () => [
  { id: 1, plate: 'GJ 01 AB 1234', reason: 'Stolen Vehicle', priority: 'high', addedBy: 'SP Ahmedabad', addedAt: '2026-08-20T10:30:00', vehicle: 'Maruti Swift (White)', owner: 'Rahul Patel' },
  { id: 2, plate: 'GJ 05 CD 5678', reason: 'Wanted Criminal', priority: 'high', addedBy: 'Crime Branch', addedAt: '2026-08-22T14:15:00', vehicle: 'Hyundai Creta (Black)', owner: 'Unknown' },
  { id: 3, plate: 'GJ 03 EF 9012', reason: 'Missing Person Vehicle', priority: 'medium', addedBy: 'Surat Police', addedAt: '2026-08-24T09:00:00', vehicle: 'Honda City (Silver)', owner: 'Meena Shah' },
  { id: 4, plate: 'GJ 18 GH 3456', reason: 'Blacklisted (Hit & Run)', priority: 'high', addedBy: 'Traffic Dept', addedAt: '2026-08-25T16:45:00', vehicle: 'Tata Nexon (Blue)', owner: 'Ajay Kumar' },
  { id: 5, plate: 'GJ 06 JK 7890', reason: 'Suspected Smuggling', priority: 'medium', addedBy: 'SOG', addedAt: '2026-08-26T08:20:00', vehicle: 'Mahindra Bolero (White)', owner: 'Karim Sheikh' },
  { id: 6, plate: 'MH 04 LM 2345', reason: 'Interstate Alert', priority: 'low', addedBy: 'Maharashtra Police', addedAt: '2026-08-26T11:00:00', vehicle: 'Toyota Fortuner (Grey)', owner: 'Suresh Desai' },
];

export const generateDetections = (cameras) => {
  const plates = [
    'GJ 01 AB 1234', 'GJ 05 CD 5678', 'GJ 01 XX 9999', 'GJ 03 EF 9012',
    'GJ 01 MN 4455', 'GJ 06 PQ 7788', 'GJ 18 RS 1122', 'GJ 01 TU 3344',
    'GJ 05 VW 5566', 'MH 04 LM 2345', 'GJ 01 AB 6677', 'GJ 03 CD 8899',
    'RJ 14 EF 1010', 'GJ 01 GH 2020', 'GJ 06 JK 7890',
  ];
  const detections = [];
  const now = Date.now();
  const camIds = cameras.map(c => c.id);
  for (let i = 0; i < 150; i++) {
    const plate = plates[Math.floor(Math.random() * plates.length)];
    const camId = camIds[Math.floor(Math.random() * camIds.length)];
    const minutesAgo = Math.floor(Math.random() * 480);
    detections.push({
      id: i + 1,
      plate,
      cameraId: camId,
      timestamp: new Date(now - minutesAgo * 60000).toISOString(),
      confidence: (85 + Math.random() * 14).toFixed(1),
      vehicleType: ['Car', 'SUV', 'Truck', 'Bus', 'Motorcycle', 'Auto'][Math.floor(Math.random() * 6)],
    });
  }
  return detections.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

export const searchVehicle = (plate, cameras, detections) => {
  const norm = plate.replace(/\s/g, '').toUpperCase();
  return detections
    .filter(d => d.plate.replace(/\s/g, '').toUpperCase().includes(norm))
    .map(d => {
      const cam = cameras.find(c => c.id === d.cameraId);
      return { ...d, camera: cam, lat: cam?.lat, lng: cam?.lng, cameraName: cam?.name || d.cameraId, city: cam?.city || 'Unknown' };
    })
    .filter(d => d.camera)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

export const VAHAN_DB = {
  'GJ01AB1234': { owner: 'Rahul Patel', vehicle: 'Maruti Swift', color: 'White', year: 2022, rcValid: '2032-05-15', insurance: 'Active' },
  'GJ05CD5678': { owner: 'Unknown', vehicle: 'Hyundai Creta', color: 'Black', year: 2023, rcValid: '2033-08-20', insurance: 'Expired' },
  'GJ03EF9012': { owner: 'Meena Shah', vehicle: 'Honda City', color: 'Silver', year: 2021, rcValid: '2031-03-10', insurance: 'Active' },
  'GJ01XX9999': { owner: 'Vikram Rao', vehicle: 'Kia Seltos', color: 'Red', year: 2025, rcValid: '2035-06-01', insurance: 'Active' },
  'GJ06JK7890': { owner: 'Karim Sheikh', vehicle: 'Mahindra Bolero', color: 'White', year: 2019, rcValid: '2029-07-22', insurance: 'Lapsed' },
  'MH04LM2345': { owner: 'Suresh Desai', vehicle: 'Toyota Fortuner', color: 'Grey', year: 2023, rcValid: '2033-01-15', insurance: 'Active' },
};
