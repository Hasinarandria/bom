/*
# BOM by Hasina - Full Schema

## Overview
Creates the complete schema for the photovoltaic BOM application with multi-user auth.

## New Tables
1. `panels` - Shared PV panel library (predefined + custom). No user_id (shared).
   - id, manufacturer, model, power_w, length_mm, width_mm, thickness_mm, weight_kg, is_custom, created_at
2. `components` - Shared mounting component library (rails, clamps, L-feet, etc.). No user_id (shared).
   - id, manufacturer, type, reference, designation, unit, is_custom, created_at
3. `projects` - User-owned BOM projects.
   - id, name, client, company, engineer, reference, location, date, notes, margin_pct, user_id, created_at, updated_at
4. `blocks` - PV array blocks belonging to a project.
   - id, project_id, name, columns, rows, orientation, panel_id, roof_type, num_purlins, purlin_spacing, screws_per_lfoot, num_rails, rail_overhang_left, rail_overhang_right, horizontal_spacing, vertical_spacing, commercial_rail_length, created_at

## Security
- `panels` and `components`: shared library, TO anon, authenticated for all CRUD.
- `projects`: owner-scoped via user_id DEFAULT auth.uid(), TO authenticated only.
- `blocks`: owner-scoped through parent project via EXISTS check.
*/

-- Panels (shared library)
CREATE TABLE IF NOT EXISTS panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer text NOT NULL,
  model text NOT NULL,
  power_w integer NOT NULL,
  length_mm numeric NOT NULL,
  width_mm numeric NOT NULL,
  thickness_mm numeric DEFAULT 35,
  weight_kg numeric DEFAULT 22,
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE panels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_panels" ON panels;
CREATE POLICY "anon_select_panels" ON panels FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_panels" ON panels;
CREATE POLICY "anon_insert_panels" ON panels FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_panels" ON panels;
CREATE POLICY "anon_update_panels" ON panels FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_panels" ON panels;
CREATE POLICY "anon_delete_panels" ON panels FOR DELETE
  TO anon, authenticated USING (true);

-- Components (shared library)
CREATE TABLE IF NOT EXISTS components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer text NOT NULL,
  type text NOT NULL,
  reference text NOT NULL,
  designation text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_components" ON components;
CREATE POLICY "anon_select_components" ON components FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_components" ON components;
CREATE POLICY "anon_insert_components" ON components FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_components" ON components;
CREATE POLICY "anon_update_components" ON components FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_components" ON components;
CREATE POLICY "anon_delete_components" ON components FOR DELETE
  TO anon, authenticated USING (true);

-- Projects (owner-scoped)
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client text DEFAULT '',
  company text DEFAULT '',
  engineer text DEFAULT '',
  reference text DEFAULT '',
  location text DEFAULT '',
  date date,
  notes text DEFAULT '',
  margin_pct numeric NOT NULL DEFAULT 15,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Blocks (owner-scoped through parent project)
CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Block 1',
  columns integer NOT NULL DEFAULT 2,
  rows integer NOT NULL DEFAULT 1,
  orientation text NOT NULL DEFAULT 'portrait',
  panel_id uuid REFERENCES panels(id),
  roof_type text NOT NULL DEFAULT 'bac_acier',
  num_purlins integer NOT NULL DEFAULT 3,
  purlin_spacing numeric NOT NULL DEFAULT 1000,
  screws_per_lfoot integer NOT NULL DEFAULT 2,
  num_rails integer NOT NULL DEFAULT 2,
  rail_overhang_left numeric NOT NULL DEFAULT 300,
  rail_overhang_right numeric NOT NULL DEFAULT 300,
  horizontal_spacing numeric NOT NULL DEFAULT 20,
  vertical_spacing numeric NOT NULL DEFAULT 20,
  commercial_rail_length numeric NOT NULL DEFAULT 2100,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_blocks" ON blocks;
CREATE POLICY "select_own_blocks" ON blocks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = blocks.project_id AND projects.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_blocks" ON blocks;
CREATE POLICY "insert_own_blocks" ON blocks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = blocks.project_id AND projects.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "update_own_blocks" ON blocks;
CREATE POLICY "update_own_blocks" ON blocks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = blocks.project_id AND projects.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = blocks.project_id AND projects.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "delete_own_blocks" ON blocks;
CREATE POLICY "delete_own_blocks" ON blocks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = blocks.project_id AND projects.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_project_id ON blocks(project_id);
