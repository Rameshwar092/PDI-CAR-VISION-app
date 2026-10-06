// ===================================================================
// PDI checklist schema — transcribed from the handwritten application spec.
// Each checklist item stores an ARRAY of selected options (multi-select),
// so the inspector can tick more than one fault on the same item.
// The option at index 0 of each list is the "all ok / normal" state used
// to compute section status and flagged items.
// To change wording or add/remove a check, edit this file only — the
// wizard, the report view and validation all read from it.
// ===================================================================

export const BRANDS = ['Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Kia', 'Toyota', 'Honda',
  'Renault', 'Nissan', 'Skoda', 'Volkswagen', 'MG', 'Jeep', 'Citroen', 'Other']

// ---- Basic Details (wizard step 1) — single-select, a vehicle has one of each ----
export const BASIC_DETAILS = [
  { key: 'pdiDate', label: 'PDI Date', type: 'date', required: true },
  { key: 'customerName', label: 'Customer Name', type: 'text', required: true },
  { key: 'customerMobile', label: 'Customer Mobile No.', type: 'tel', required: true },
  { key: 'condition', label: 'New / Used', type: 'select', options: ['New', 'Used'], required: true },
  { key: 'brand', label: 'Vehicle Brand', type: 'select', options: BRANDS, required: true },
  { key: 'model', label: 'Model', type: 'text', required: true },
  { key: 'vin', label: 'VIN Number', type: 'text', required: true, minLength: 11 },
  { key: 'transmission', label: 'Transmission', type: 'select', options: ['MT', 'AMT', 'iMT', 'AT', 'EV', 'Other'], required: true },
  { key: 'fuelType', label: 'Fuel Type', type: 'select', options: ['Petrol', 'Petrol/CNG', 'Diesel', 'Hybrid', 'EV', 'LPG', 'Other'], required: true },
  { key: 'emission', label: 'Emission Standard', type: 'select', options: ['BS III', 'BS IV', 'BS VI', 'BS 6.2', 'Other'], required: true },
  { key: 'mfgReg', label: 'MFG / REG (month-year)', type: 'text', required: true },
  { key: 'kmsDriven', label: 'KMs Driven', type: 'number', required: true },
]

// ---- Reusable dropdown option sets ----
const EXTERIOR_PANEL = ['All OK', 'Scratches', 'Hairline Marks', 'Rusting', 'Dent', 'Cracks', 'Color Mismatch',
  'Loose or Misaligned', 'Clipping', 'Broken Clips or Mounts', 'Panel Changed', 'Re-Painted', 'Paint Bubble',
  'Pin Holes', 'Partially Repainted', 'Hinges Tampered', 'Other (Specify)']
const PANEL_GAP = ['All OK', 'Not Smooth', 'Minor Panel Gap', 'Major Panel Gap', 'Manufacturing Issue', 'Improper Alignment']
const SEAL = ['All OK', 'Cracks', 'Cuts', 'Damage', 'Other (Specify)']
const TYRE_MFG = ['MRF', 'Apollo', 'CEAT', 'JK Tyre', 'Bridgestone', 'Goodyear', 'Pirelli', 'Michelin', 'Yokohama', 'Continental', 'Other (Specify)']
const TYRE_COND = ['All OK', 'Cut or Tear', 'Puncture', 'Bulges or Bubbles', 'Cracks', 'Other (Specify)']
const WHEEL_COND = ['All OK', 'Scratches or Scuffs', 'Dent or Bends', 'Cracks', 'Rust', 'Bolt Hole Damage', 'Other (Specify)']
const WINDSHIELD = ['No Fault Detected', 'Scratched Present', 'Wiper Marks Visible', 'Chipping Observed', 'Cracks Detected', 'Bubbles on Glass', 'Sealing Issue Noted', 'Other (Specify)']
const ORVM = ['No Fault Detected', 'Scratches', 'Cracks Detected', 'Damage', 'Noise Issue', 'Other (Specify)']
const GLASS_PANEL = ['No Fault Detected', 'Not Available', 'Scratches', 'Chipping Observed', 'Cracks Detected', 'Damage', 'Unusually Noisy', 'Glass Shattering', 'Bubbles on Glass', 'Other (Specify)']
const LIGHT_MAIN = ['Working Perfectly', 'Bulb Fuse', 'Moisture on Lights', 'One Headlight Not Working', 'Damage', 'Cracks on Light', 'Scratches', 'Other (Specify)']
const FOG_LAMP = ['Working Perfectly', 'Not Available', 'Moisture on Lights', 'One Fog Lamp Not Working', 'Damage', 'Cracks on Light', 'Scratches', 'Other (Specify)']
const BLINKERS = ['Working Perfectly', 'Not Available', 'Bulb Fuse', 'Cracks on Light', 'Damage', 'Scratches',
  'Fast Blinking', 'Hazard Lighting Not Working', 'Turn Signal Not Working', 'Other (Specify)']
const TAIL_LAMP = ['Working Perfectly', 'Bulb Fuse', 'Moisture on Lights', 'One Tail Light Not Working', 'Damage', 'Cracks on Light', 'Scratches', 'Other (Specify)']
const OBD_MONITOR = ['Monitor OK', 'Fault Detected', 'Not Applicable', 'Other (Specify)']
const DOC_ITEM = ['Available', 'Not Available', 'Not Applicable', 'Other (Specify)']

export const SECTIONS = [
  { key: 'exterior', title: 'Exterior Paint and Finish Inspection', hasRemarks: true, items: [
    ['Front Bumper', EXTERIOR_PANEL], ['Bonnet', EXTERIOR_PANEL], ['Left Fender', EXTERIOR_PANEL],
    ['Left Front Door', EXTERIOR_PANEL], ['Left Rear Door', EXTERIOR_PANEL], ['Left Quarter Panel', EXTERIOR_PANEL],
    ['Left Side Pillars', EXTERIOR_PANEL], ['Left Side Running Board', EXTERIOR_PANEL], ['Boot', EXTERIOR_PANEL],
    ['Rear Bumper', EXTERIOR_PANEL], ['Right Quarter Panel', EXTERIOR_PANEL], ['Right Rear Door', EXTERIOR_PANEL],
    ['Right Front Door', EXTERIOR_PANEL], ['Right Side Pillars', EXTERIOR_PANEL], ['Right Side Running Board', EXTERIOR_PANEL],
    ['Right Fender', EXTERIOR_PANEL], ['Roof', EXTERIOR_PANEL], ['Fuel Cap', EXTERIOR_PANEL] ] },

  { key: 'panelGaps', title: 'Panel Gaps and General Functionality', hasRemarks: true, items: [
    ['Rear Right Door', PANEL_GAP], ['Front Left Door', PANEL_GAP], ['Rear Left Door', PANEL_GAP],
    ['Bonnet', PANEL_GAP], ['Front Right Door', PANEL_GAP], ['Fuel Lid', PANEL_GAP], ['Boot', PANEL_GAP] ] },

  { key: 'seals', title: 'Seal and Rubber Component Assessment', hasRemarks: true, items: [
    ['Door Rubber Seal', SEAL], ['Window Seal', SEAL], ['Engine and Hood Seal', SEAL],
    ['Bushing (Suspension Component)', SEAL], ['Wiper Blades', SEAL], ['Boot / Trunk Seal', SEAL],
    ['Rubber Mounts (Engine & Transmission)', SEAL] ] },

  { key: 'tyres', title: 'Tyre and Wheel Inspection', hasRemarks: true, items: [
    ['Front Right Tyre MFG', TYRE_MFG], ['Front Right Tyre - Condition', TYRE_COND], ['Front Right Wheel / Alloy Condition', WHEEL_COND],
    ['Rear Right Tyre MFG', TYRE_MFG], ['Rear Right Tyre - Condition', TYRE_COND], ['Rear Right Wheel / Alloy Condition', WHEEL_COND],
    ['Front Left Tyre MFG', TYRE_MFG], ['Front Left Tyre - Condition', TYRE_COND], ['Front Left Wheel / Alloy Condition', WHEEL_COND],
    ['Rear Left Tyre MFG', TYRE_MFG], ['Rear Left Tyre - Condition', TYRE_COND], ['Rear Left Wheel / Alloy Condition', WHEEL_COND],
    ['Spare Tyre MFG', TYRE_MFG], ['Spare Tyre - Condition', TYRE_COND], ['Spare Wheel / Alloy Condition', WHEEL_COND] ] },

  { key: 'glass', title: 'Comprehensive Glass Inspection', hasRemarks: true, items: [
    ['Front Windshield', WINDSHIELD], ['Rear Windshield', WINDSHIELD], ['Left ORVM', ORVM], ['Right ORVM', ORVM],
    ['Left Side Front Door Glass', GLASS_PANEL], ['Left Side Rear Door Glass', GLASS_PANEL],
    ['Left Side Quarter Panel Glass', GLASS_PANEL], ['Right Side Quarter Panel Glass', GLASS_PANEL],
    ['Right Side Rear Door Glass', GLASS_PANEL], ['Right Side Front Door Glass', GLASS_PANEL],
    ['Sunroof', GLASS_PANEL] ] },

  { key: 'underbody', title: 'Underbody and Chassis Checks', hasRemarks: true, items: [
    ['Underbody Shield Damage', ['All OK', 'Bent', 'Damaged', 'Other (Specify)']],
    ['Underbody Rusting', ['All OK', 'Rust Found', 'Other (Specify)']],
    ['Underbody Checks', ['All OK', 'Leakage Found', 'Surface Rust', 'Unusual Noise', 'Other (Specify)']],
    ['Suspension System Checks', ['All OK', 'Leakage', 'Surface Rust', 'Unusual Noise', 'Other (Specify)']],
    ['Exhaust Checks', ['All OK', 'Surface Rust', 'Leakage', 'Other (Specify)']],
    ['Chassis & Frame', ['All OK', 'Leakage', 'Surface Rust', 'Unusual Noise', 'Other (Specify)']] ] },

  { key: 'hood', title: 'Under the Hood Checks', hasRemarks: true, items: [
    ['Battery Voltage', ['Good', 'Normal', 'Poor']],
    ['Battery Condition', ['All OK', 'Loose Battery Cable', 'Faulty Alternator', 'Corroded Terminals', 'Rigidine Found While Terminals', 'Other (Specify)']],
    ['Brake Oil', ['Normal', 'Low', 'Other (Specify)']],
    ['Coolant', ['Normal', 'Low / Insufficient', 'Leakage', 'Other (Specify)']],
    ['Engine Oil', ['Normal', 'Leakage', 'Other (Specify)']],
    ['Auxiliary Belt', ['NA', 'Normal', 'Cracks', 'Needs to be Changed', 'Other (Specify)']],
    ['Washer Fluid', ['Not Available', 'Normal', 'Leakage', 'Water Bottle Damaged', 'Clogged Nozzle', 'Other (Specify)']],
    ['Leakage (Differential / Axle / Shocker)', ['No Leakage', 'Differential or Axle Oil Leak', 'Sign of Shocker Leakage', 'Other (Specify)']] ] },

  { key: 'interior', title: 'Interior Inspection - Comfort and Function', hasRemarks: true, items: [
    ['Seats and Upholstery', ['All OK', 'Cracks', 'Cut', 'Stains', 'Leather Peeling', 'Loose or Leather Wrinkles',
      'Unusual Sound', 'Seat Deformation', 'Manual Seat Adjustment Not Working', 'Electric Seats Not Working',
      'Recliner Not Working', 'Seat Memory Function Not Working', 'Ventilated Seats Dysfunction', 'Other (Specify)']],
    ['Seat Belts', ['All Sensors are Working', 'Seat Belt Not Retracting Smoothly', 'Seat Belt Sticking or Locking',
      'Seat Belt Damage', 'Seat Belt Warning Light Stays On', 'Seat Belt Lock Issue', 'Other (Specify)']],
    ['Dashboard', ['All OK', 'Scratches or Scuff Marks', 'Uneven Gap and Loose Fitting', 'Adhesive Marks',
      'Switches Not Working', 'Vibration / Noise', 'Other (Specify)']],
    ['Infotainment System', ['Working Perfectly', 'Not Applicable', 'Display Issue', 'Speakers Not Working',
      'Bluetooth Issue', 'Scratches on Screen', 'Hairline Scratches', 'Connectivity Issue', 'Other (Specify)']],
    ['Air Conditioning / Climate Control', ['All Vents Working Perfectly', 'Clogged Air Vents', 'Noise',
      'Air Flow Issue', 'Cooling Issue', 'Slow Heating', 'Switches Not Working', 'Hairline Marks', 'Other (Specify)']],
    ['Steering Control', ['All Controls Working', 'Issue With the Control', 'Steering Adjustment Issue', 'Vibration', 'Other (Specify)']],
    ['Interior Lighting', ['Working Perfectly', 'Bulb Fuse', 'Damage', 'Other (Specify)']],
    ['Ambient Light', ['Not Applicable', 'Working Perfectly', 'Not Working', 'Other (Specify)']],
    ['Floor Mats', ['All OK', 'Wear and Tear Found', 'Dirt Marks', 'Unpleasant Odor', 'Uneven Fitment', 'Other (Specify)']],
    ['Power Windows & Sunroof', ['All Switches are OK', 'Not Available', 'One Touch Window Not Working',
      'Switches Not OK', 'Window Lock Issue', 'Faulty Switches', 'Faulty Sunroof Motor', 'Broken or Stuck Mechanism', 'Other (Specify)']],
    ['Storage Compartments', ['All OK', 'Damaged Hinges', 'Faulty Locks', 'Compartment Not Closing Properly',
      'Interior Lining or Padding Damage', 'Other (Specify)']],
    ['Instrument Cluster', ['No Warning Light Shown', 'Warning Light Stays On or Flashes', 'Incorrect Reading', 'On & Off Problem', 'Other (Specify)']],
    ['Headliner (Roof)', ['Neat and Clean', 'Dirt Stain', 'Damage', 'Not Properly Aligned', 'Tears or Rips', 'Loose or Detaching Edges', 'Other (Specify)']],
    ['All Door Controls', ['All Door Controls Work', 'Issue Found', 'Broken Switches', 'Loose Switches', 'Faulty Power Door Lock Relay', 'Central Locking System Issue',
      'Auto Door Lock Faulty', 'Child Safety Issue', 'ORVM Control Not Working', 'Other (Specify)']],
    ['Wireless Charging', ['Working Perfectly', 'Not Available', 'Other (Specify)']],
    ['Charging Ports / USB', ['All OK', 'Not Working', 'Other (Specify)']],
    ['IRVM and Vanity Mirror', ['All OK', 'Not Working', 'Vanity Mirror Issue', 'Damage', 'Loose', 'Vanity Mirror Broken', 'Light Not Working', 'Other (Specify)']],
    ['Gear Console Functions', ['All OK', 'Not Working', 'Scratches', 'Issue Found', 'Driving Modes Not Working', 'Hinges Broken / Loose', 'Damage', 'Panel Gaps', 'Other (Specify)']],
    ['Boot Carpet', ['All OK', 'Wear & Tear Found', 'Dirt Marks', 'Unpleasant Odor', 'Uneven Fitment', 'Other (Specify)']],
    ['Parcel Tray', ['All OK', 'Not Available', 'Thread Missing', 'Latch Issue', 'Stain Marks', 'Hinges Broken', 'Broken', 'Other (Specify)']],
    ['Armrest Controls', ['All OK', 'Not Available', 'Armrest Adjustment Not Working', 'Broken', 'Panel Gap', 'Armrest Controls Not Responding', 'Armrest Noise When Moving', 'Other (Specify)']] ] },

  { key: 'mechanical', title: 'Mechanical and Performance Inspection', hasRemarks: true, items: [
    ['Ignition', ['Working Perfectly', 'Long Self', 'Other (Specify)']],
    ['Exhaust System', ['No Issue Detected', 'Rusting Issue', 'Exhaust Pipe Damage', 'Grey Smoke', 'White Smoke', 'Black Smoke', 'Blue Smoke', 'Other (Specify)']],
    ['Clutch Operation', ['Working OK', 'Slipping Issue', 'Hard Clutch / Noise in Clutch', 'Other (Specify)']],
    ['Steering System', ['Working OK', 'Hard', 'Additional Noise', 'Adjustment Issue', 'Other (Specify)']],
    ['Transmission', ['All OK', 'Gear Shifting Issue', 'Hard Gear Shifting', 'Issue with 4x4', 'Other (Specify)']],
    ['Suspension System', ['All OK', 'Unusual Noise', 'Other (Specify)']],
    ['Brake Performance', ['All OK', 'Unusual Noise', 'Other (Specify)']],
    ['Engine Performance', ['All OK', 'Unusual Noise', 'Missing', 'Engine Mounting Noise', 'Over Heating', 'Other (Specify)']] ] },

  { key: 'obd', title: 'OBD Diagnostics and System Checks', hasRemarks: true, items: [
    ['Declined by Dealer', ['Not Declined by Dealer', 'Declined by Dealer', 'Other (Specify)']],
    ['Error Code / Fault Deduction', ['Engine Code Not Found', 'Engine Code Found', 'Other (Specify)']],
    ['Sensor Status & Reading', ['All OK', 'Not OK', 'Other (Specify)']],
    ['ECU Health (Overall)', ['All OK', 'Not OK', 'Other (Specify)']],
    ['Catalyst Monitor', OBD_MONITOR], ['Misfire Monitor', OBD_MONITOR], ['Oxygen Sensor Monitor', OBD_MONITOR],
    ['Oxygen Sensor Heater', OBD_MONITOR], ['EGR System', OBD_MONITOR], ['Heated Catalyst', OBD_MONITOR],
    ['Sensor Period', OBD_MONITOR], ['Low Sensor Voltage (B1S2)', OBD_MONITOR], ['High Sensor Voltage', OBD_MONITOR],
    ['Misfire Cylinder (1-6)', OBD_MONITOR], ['Idle RPM', OBD_MONITOR], ['EGR Monitor Bank 1', OBD_MONITOR],
    ['RPM Load', OBD_MONITOR], ['ABS Load / Transmission / Cylinder Deactivation', OBD_MONITOR],
    ['Misfire Data Monitor / ECM Output Circuit', OBD_MONITOR], ['Brake & Traction Control', OBD_MONITOR],
    ['Vehicle or Idle Speed Control', OBD_MONITOR],
    ['Chassis Verification', ['Chassis Verified', 'Verified through OBD', 'Other (Specify)']] ] },

  { key: 'lights', title: 'Lights Checks', hasRemarks: true, items: [
    ['Front Light (Headlight)', LIGHT_MAIN], ['Fog Lamp', FOG_LAMP], ['Blinkers (Turn Indicators)', BLINKERS],
    ['Rear Tail Lamp', TAIL_LAMP] ] },

  { key: 'documents', title: 'Owner Manual and Documents Check', hasRemarks: true, items: [
    ['Owner Manual', DOC_ITEM], ['Invoice / Challan (Not Applicable for New Car)', DOC_ITEM],
    ['Original Warranty with All Dealership Stamp', DOC_ITEM], ['All Payment Receipts', DOC_ITEM],
    ['Insurance', DOC_ITEM], ['3rd Party Warranty Stamp Booklet', DOC_ITEM], ['Duplicate Keys', DOC_ITEM],
    ['Sales Certificate for Date of Manufacturing', DOC_ITEM] ] },
]

export const PHOTOS = ['Front View', 'Rear View', 'Left Side', 'Right Side', 'Interior', 'Engine Bay', 'Odometer', 'Tyres', 'Damage / Issue']

export const emptyForm = () => ({
  vehicle: {}, checks: {}, other: {}, remarks: {}, photos: {}, result: 'PASS', inspectorRemarks: '', customerRemarks: '', signature: '',
})

function sectionDefault(sectionKey, item) {
  const s = SECTIONS.find(x => x.key === sectionKey)
  const row = s && s.items.find(([label]) => label === item)
  return row ? row[1][0] : ''
}
// An item is "flagged" when its selected array has anything beyond just the single default (all-ok/normal) option.
export const isFlagged = (checks, sectionKey, item) => {
  const v = checks[`${sectionKey}.${item}`]
  if (!v || !v.length) return false
  const def = sectionDefault(sectionKey, item)
  return v.length > 1 || v[0] !== def
}
export const sectionStatus = (checks, sectionKey) => {
  const s = SECTIONS.find(x => x.key === sectionKey)
  const flagged = s.items.filter(([label]) => isFlagged(checks, sectionKey, label)).length
  return flagged ? `${flagged} flagged` : 'All OK'
}
