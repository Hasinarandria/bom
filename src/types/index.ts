export type Orientation = 'portrait' | 'landscape';

export type RoofType = 'bac_acier' | 'tole_trapezoidale' | 'tuile' | 'terrasse' | 'sol';

export type ComponentType =
  | 'Rail'
  | 'Rail Splice'
  | 'Mid Clamp'
  | 'End Clamp'
  | 'L-Foot'
  | 'Screw'
  | 'Bolt'
  | 'Washer'
  | 'Nut'
  | 'Rail End Cap'
  | 'Earthing Clip'
  | 'Earthing Lug'
  | 'Ground Kit'
  | 'Cable Clip'
  | 'Cable Tray'
  | 'Cable Tray Connector'
  | 'Hook';

export interface Panel {
  id: string;
  manufacturer: string;
  model: string;
  power_w: number;
  length_mm: number;
  width_mm: number;
  thickness_mm: number;
  weight_kg: number;
  is_custom: boolean;
  created_at?: string;
}

export interface Component {
  id: string;
  manufacturer: string;
  type: ComponentType;
  reference: string;
  designation: string;
  unit: string;
  is_custom: boolean;
  created_at?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  company: string;
  engineer: string;
  reference: string;
  location: string;
  date: string | null;
  notes: string;
  margin_pct: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Block {
  id: string;
  project_id: string;
  name: string;
  columns: number;
  rows: number;
  orientation: Orientation;
  panel_id: string | null;
  roof_type: RoofType;
  num_purlins: number;
  purlin_spacing: number;
  screws_per_lfoot: number;
  num_rails: number;
  rail_overhang_left: number;
  rail_overhang_right: number;
  horizontal_spacing: number;
  vertical_spacing: number;
  commercial_rail_length: number;
  created_at?: string;
}

export interface BlockWithPanel extends Block {
  panel?: Panel | null;
}

export interface BOMLine {
  designation: string;
  reference: string;
  manufacturer: string;
  unit: string;
  quantityCalculated: number;
  hasMargin: boolean;
  quantityFinal: number;
  category: 'module' | 'rail' | 'accessory' | 'cable';
}

export interface BlockCalculation {
  blockId: string;
  blockName: string;
  panelModel: string;
  panelManufacturer: string;
  panelPower: number;
  moduleCount: number;
  totalPower: number;
  rowLength: number;
  railLength: number;
  numRails: number;
  totalRailLength: number;
  numCommercialRails: number;
  railSplices: number;
  endClamps: number;
  midClamps: number;
  lFootCount: number;
  roofScrews: number;
  bolts: number;
  washers: number;
  nuts: number;
  railEndCaps: number;
  earthingClips: number;
  earthingLugs: number;
  groundKits: number;
  cableClips: number;
  cableTrayLength: number;
  cableTrayConnectors: number;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface ProjectCalculation {
  blocks: BlockCalculation[];
  consolidated: Record<string, number>;
  bom: BOMLine[];
  totalModules: number;
  totalPower: number;
  totalRailLength: number;
}
