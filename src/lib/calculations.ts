import type {
  Block,
  Panel,
  BlockCalculation,
  ProjectCalculation,
  BOMLine,
} from '../types';

const ceil = (n: number) => Math.ceil(n);

export function calculateBlock(block: Block, panel: Panel | null): BlockCalculation {
  const cols = block.columns;
  const rows = block.rows;

  const moduleCount = cols * rows;
  const totalPower = moduleCount * (panel?.power_w ?? 0);

  // Row length
  const panelLong = panel?.length_mm ?? 2000;
  const panelShort = panel?.width_mm ?? 1000;
  const hSpacing = block.horizontal_spacing;

  const moduleWidthAlongRow =
    block.orientation === 'portrait' ? panelShort : panelLong;
  const rowLength = cols * moduleWidthAlongRow + (cols - 1) * hSpacing;

  // Rail length
  const railLength = rowLength + block.rail_overhang_left + block.rail_overhang_right;

  // Number of rails
  const numRails = block.num_rails * rows;

  // Total rail length
  const totalRailLength = railLength * numRails;

  // Commercial rails
  const commercialLen = block.commercial_rail_length;
  const numCommercialRails = ceil(totalRailLength / commercialLen);

  // Rail splices
  const splicesPerRail = Math.max(0, ceil(railLength / commercialLen) - 1);
  const railSplices = splicesPerRail * numRails;

  // End clamps
  const endClamps = 2 * numRails;

  // Mid clamps
  const midClamps = (cols - 1) * numRails;

  // L-Foot
  const lFootCount = block.num_purlins * numRails;

  // Roof screws
  const roofScrews = lFootCount * block.screws_per_lfoot;

  // Bolts = L-Foot count
  const bolts = lFootCount;

  // Washers
  const washers = bolts;

  // Nuts
  const nuts = bolts;

  // Rail End Caps
  const railEndCaps = 2 * numRails;

  // Earthing Clips
  const earthingClips = (cols - 1) * numRails;

  // Earthing Lugs
  const earthingLugs = rows;

  // Ground Kits
  const groundKits = rows;

  // Cable Clips
  const cableClips = 2 * moduleCount;

  // Cable Tray
  const cableTrayLength = rowLength * rows;

  // Cable Tray Connectors (one per junction — approximate as rows - 1 per block)
  const cableTrayConnectors = Math.max(0, rows - 1);

  const blockWidth =
    block.orientation === 'portrait'
      ? cols * panelShort + (cols - 1) * hSpacing
      : cols * panelLong + (cols - 1) * hSpacing;

  const blockHeight =
    block.orientation === 'portrait'
      ? rows * panelLong + (rows - 1) * block.vertical_spacing
      : rows * panelShort + (rows - 1) * block.vertical_spacing;

  return {
    blockId: block.id,
    blockName: block.name,
    panelModel: panel?.model ?? 'Unknown',
    panelManufacturer: panel?.manufacturer ?? 'Unknown',
    panelPower: panel?.power_w ?? 0,
    moduleCount,
    totalPower,
    rowLength,
    railLength,
    numRails,
    totalRailLength,
    numCommercialRails,
    railSplices,
    endClamps,
    midClamps,
    lFootCount,
    roofScrews,
    bolts,
    washers,
    nuts,
    railEndCaps,
    earthingClips,
    earthingLugs,
    groundKits,
    cableClips,
    cableTrayLength,
    cableTrayConnectors,
    dimensions: { width: blockWidth, height: blockHeight },
  };
}

export function applyMargin(qty: number, marginPct: number, hasMargin: boolean): number {
  if (!hasMargin) return ceil(qty);
  return ceil(qty * (1 + marginPct / 100));
}

export function buildBOM(
  blocks: BlockCalculation[],
  marginPct: number,
): BOMLine[] {
  // Consolidate across blocks
  const totals: Record<string, { qty: number; designation: string; unit: string }> = {
    module: { qty: 0, designation: 'PV Module', unit: 'pcs' },
    rail: { qty: 0, designation: 'Rail', unit: 'pcs' },
    railSplice: { qty: 0, designation: 'Rail Splice', unit: 'pcs' },
    midClamp: { qty: 0, designation: 'Mid Clamp', unit: 'pcs' },
    endClamp: { qty: 0, designation: 'End Clamp', unit: 'pcs' },
    lFoot: { qty: 0, designation: 'L-Foot', unit: 'pcs' },
    roofScrew: { qty: 0, designation: 'Roof Screw', unit: 'pcs' },
    bolt: { qty: 0, designation: 'Bolt', unit: 'pcs' },
    washer: { qty: 0, designation: 'Washer', unit: 'pcs' },
    nut: { qty: 0, designation: 'Nut', unit: 'pcs' },
    railEndCap: { qty: 0, designation: 'Rail End Cap', unit: 'pcs' },
    earthingClip: { qty: 0, designation: 'Earthing Clip', unit: 'pcs' },
    earthingLug: { qty: 0, designation: 'Earthing Lug', unit: 'pcs' },
    groundKit: { qty: 0, designation: 'Ground Kit', unit: 'kit' },
    cableClip: { qty: 0, designation: 'Cable Clip', unit: 'pcs' },
    cableTray: { qty: 0, designation: 'Cable Tray', unit: 'm' },
    cableTrayConn: { qty: 0, designation: 'Cable Tray Connector', unit: 'pcs' },
  };

  for (const b of blocks) {
    totals.module.qty += b.moduleCount;
    totals.rail.qty += b.numCommercialRails;
    totals.railSplice.qty += b.railSplices;
    totals.midClamp.qty += b.midClamps;
    totals.endClamp.qty += b.endClamps;
    totals.lFoot.qty += b.lFootCount;
    totals.roofScrew.qty += b.roofScrews;
    totals.bolt.qty += b.bolts;
    totals.washer.qty += b.washers;
    totals.nut.qty += b.nuts;
    totals.railEndCap.qty += b.railEndCaps;
    totals.earthingClip.qty += b.earthingClips;
    totals.earthingLug.qty += b.earthingLugs;
    totals.groundKit.qty += b.groundKits;
    totals.cableClip.qty += b.cableClips;
    totals.cableTray.qty += b.cableTrayLength / 1000; // mm -> m
    totals.cableTrayConn.qty += b.cableTrayConnectors;
  }

  const lines: BOMLine[] = [
    {
      designation: 'PV Module',
      reference: '',
      manufacturer: blocks[0]?.panelManufacturer ?? '',
      unit: 'pcs',
      quantityCalculated: totals.module.qty,
      hasMargin: false,
      quantityFinal: ceil(totals.module.qty),
      category: 'module',
    },
    {
      designation: 'Rail',
      reference: '',
      manufacturer: '',
      unit: 'pcs',
      quantityCalculated: totals.rail.qty,
      hasMargin: false,
      quantityFinal: ceil(totals.rail.qty),
      category: 'rail',
    },
    {
      designation: 'Rail Splice',
      reference: '',
      manufacturer: '',
      unit: 'pcs',
      quantityCalculated: totals.railSplice.qty,
      hasMargin: true,
      quantityFinal: applyMargin(totals.railSplice.qty, marginPct, true),
      category: 'accessory',
    },
    {
      designation: 'Mid Clamp',
      reference: '',
      manufacturer: '',
      unit: 'pcs',
      quantityCalculated: totals.midClamp.qty,
      hasMargin: true,
      quantityFinal: applyMargin(totals.midClamp.qty, marginPct, true),
      category: 'accessory',
    },
    {
      designation: 'End Clamp',
      reference: '',
      manufacturer: '',
      unit: 'pcs',
      quantityCalculated: totals.endClamp.qty,
      hasMargin: true,
      quantityFinal: applyMargin(totals.endClamp.qty, marginPct, true),
      category: 'accessory',
    },
    {
      designation: 'L-Foot',
      reference: '',
      manufacturer: '',
      unit: 'pcs',
      quantityCalculated: totals.lFoot.qty,
      hasMargin: true,
      quantityFinal: applyMargin(totals.lFoot.qty, marginPct, true),
      category: 'accessory',
    },
    {
      designation: 'Roof Screw',
      reference: '',
      manufacturer: '',
      unit: 'pcs',
      quantityCalculated: totals.roofScrew.qty,
      hasMargin: true,
      quantityFinal: applyMargin(totals.roofScrew.qty, marginPct, true),
      category: 'accessory',
    },
    {
      designation: 'Bolt',
      reference: '',
      manufacturer: '',
      unit: 'pcs',
      quantityCalculated: totals.bolt.qty,
      hasMargin: true,
      quantityFinal: applyMargin(totals.bolt.qty, marginPct, true),
      category: 'accessory',
    },
    {
      designation: 'Washer',
      reference: '',
      manufacturer: '',
      unit: 'pcs',
      quantityCalculated: totals.washer.qty,
      hasMargin: true,
      quantityFinal: applyMargin(totals.washer.qty, marginPct, true),
      category: 'accessory',
    },
    {
      designation: 'Nut',
      reference: '',
      manufacturer: '',
      unit: 'pcs',
      quantityCalculated: totals.nut.qty,
      hasMargin: true,
      quantityFinal: applyMargin(totals.nut.qty, marginPct, true),
      category: 'accessory',
    },
    {
      designation: 'Rail End Cap',
      reference: '',
      manufacturer: '',
      unit: 'pcs',
      quantityCalculated: totals.railEndCap.qty,
      hasMargin: true,
      quantityFinal: applyMargin(totals.railEndCap.qty, marginPct, true),
      category: 'accessory',
    },
    {
      designation: 'Earthing Clip',
      reference: '',
      manufacturer: '',
      unit: 'pcs',
      quantityCalculated: totals.earthingClip.qty,
      hasMargin: true,
      quantityFinal: applyMargin(totals.earthingClip.qty, marginPct, true),
      category: 'accessory',
    },
    {
      designation: 'Earthing Lug',
      reference: '',
      manufacturer: '',
      unit: 'pcs',
      quantityCalculated: totals.earthingLug.qty,
      hasMargin: true,
      quantityFinal: applyMargin(totals.earthingLug.qty, marginPct, true),
      category: 'accessory',
    },
    {
      designation: 'Ground Kit',
      reference: '',
      manufacturer: '',
      unit: 'kit',
      quantityCalculated: totals.groundKit.qty,
      hasMargin: true,
      quantityFinal: applyMargin(totals.groundKit.qty, marginPct, true),
      category: 'accessory',
    },
    {
      designation: 'Cable Clip',
      reference: '',
      manufacturer: '',
      unit: 'pcs',
      quantityCalculated: totals.cableClip.qty,
      hasMargin: true,
      quantityFinal: applyMargin(totals.cableClip.qty, marginPct, true),
      category: 'accessory',
    },
    {
      designation: 'Cable Tray',
      reference: '',
      manufacturer: '',
      unit: 'm',
      quantityCalculated: totals.cableTray.qty,
      hasMargin: false,
      quantityFinal: ceil(totals.cableTray.qty),
      category: 'cable',
    },
    {
      designation: 'Cable Tray Connector',
      reference: '',
      manufacturer: '',
      unit: 'pcs',
      quantityCalculated: totals.cableTrayConn.qty,
      hasMargin: true,
      quantityFinal: applyMargin(totals.cableTrayConn.qty, marginPct, true),
      category: 'accessory',
    },
  ];

  return lines;
}

export function calculateProject(
  blocks: Block[],
  panels: Panel[],
  marginPct: number,
): ProjectCalculation {
  const blockCalcs: BlockCalculation[] = blocks.map((block) => {
    const panel = panels.find((p) => p.id === block.panel_id) ?? null;
    return calculateBlock(block, panel);
  });

  const bom = buildBOM(blockCalcs, marginPct);

  const consolidated: Record<string, number> = {};
  for (const line of bom) {
    consolidated[line.designation] = line.quantityFinal;
  }

  return {
    blocks: blockCalcs,
    consolidated,
    bom,
    totalModules: blockCalcs.reduce((s, b) => s + b.moduleCount, 0),
    totalPower: blockCalcs.reduce((s, b) => s + b.totalPower, 0),
    totalRailLength: blockCalcs.reduce((s, b) => s + b.totalRailLength, 0),
  };
}
