import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Project, Block, Panel, ProjectCalculation } from '../types';


export function exportExcel(
  project: Project,
  blocks: Block[],
  panels: Panel[],
  calc: ProjectCalculation,
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Project Summary
  const summaryData = [
    ['BOM by Hasina - Résumé du projet'],
    [''],
    ['Nom du projet', project.name],
    ['Client', project.client],
    ['Société', project.company],
    ['Ingénieur', project.engineer],
    ['Référence', project.reference],
    ['Localisation', project.location],
    ['Date', project.date ?? ''],
    ['Marge (%)', project.margin_pct],
    [''],
    ['Total modules', calc.totalModules],
    ['Puissance totale (Wc)', calc.totalPower],
    ['Longueur totale rails (mm)', calc.totalRailLength],
    ['Nombre de blocs', blocks.length],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1['!cols'] = [{ wch: 25 }, { wch: 30 }];
  ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Résumé');

  // Sheet 2: Input Data
  const inputData: (string | number)[][] = [
    ['Bloc', 'Panneau', 'Colonnes', 'Rangées', 'Orientation', 'Type toiture', 'Pannes', 'Entraxe (mm)', 'Vis/L-Foot', 'Rails', 'Dép. G (mm)', 'Dép. D (mm)', 'Esp. H (mm)', 'Esp. V (mm)', 'Long. rail comm. (mm)'],
  ];
  for (const block of blocks) {
    const panel = panels.find((p) => p.id === block.panel_id);
    inputData.push([
      block.name,
      panel ? `${panel.manufacturer} ${panel.model}` : '—',
      block.columns,
      block.rows,
      block.orientation,
      block.roof_type,
      block.num_purlins,
      block.purlin_spacing,
      block.screws_per_lfoot,
      block.num_rails,
      block.rail_overhang_left,
      block.rail_overhang_right,
      block.horizontal_spacing,
      block.vertical_spacing,
      block.commercial_rail_length,
    ]);
  }
  const ws2 = XLSX.utils.aoa_to_sheet(inputData);
  ws2['!cols'] = Array(15).fill({ wch: 15 });
  XLSX.utils.book_append_sheet(wb, ws2, 'Données entrée');

  // Sheet 3: Calculations
  const calcData: (string | number)[][] = [
    ['Bloc', 'Modules', 'Puissance (Wc)', 'Long. rangée (mm)', 'Long. rail (mm)', 'Nb rails', 'Long. totale (mm)', 'Rails comm.', 'Splices', 'End Clamps', 'Mid Clamps', 'L-Foot', 'Vis toiture', 'Boulons', 'Rondelles', 'Écrous', 'End Caps', 'Earth Clips', 'Earth Lugs', 'Ground Kits', 'Cable Clips', 'Cable Tray (mm)', 'CT Conn.'],
  ];
  for (const bc of calc.blocks) {
    calcData.push([
      bc.blockName, bc.moduleCount, bc.totalPower, Math.round(bc.rowLength),
      Math.round(bc.railLength), bc.numRails, Math.round(bc.totalRailLength),
      bc.numCommercialRails, bc.railSplices, bc.endClamps, bc.midClamps,
      bc.lFootCount, bc.roofScrews, bc.bolts, bc.washers, bc.nuts,
      bc.railEndCaps, bc.earthingClips, bc.earthingLugs, bc.groundKits,
      bc.cableClips, Math.round(bc.cableTrayLength), bc.cableTrayConnectors,
    ]);
  }
  const ws3 = XLSX.utils.aoa_to_sheet(calcData);
  ws3['!cols'] = Array(23).fill({ wch: 14 });
  XLSX.utils.book_append_sheet(wb, ws3, 'Calculs');

  // Sheet 4: BOM
  const bomData: (string | number)[][] = [
    ['Désignation', 'Référence', 'Fabricant', 'Unité', 'Qté calculée', 'Marge', 'Qté finale'],
  ];
  for (const line of calc.bom) {
    bomData.push([
      line.designation, line.reference, line.manufacturer, line.unit,
      line.quantityCalculated, line.hasMargin ? `${project.margin_pct}%` : '—',
      line.quantityFinal,
    ]);
  }
  const ws4 = XLSX.utils.aoa_to_sheet(bomData);
  ws4['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'BOM');

  // Sheet 5: Cost Estimation (placeholder structure)
  const costData: (string | number)[][] = [
    ['Estimation des coûts'],
    [''],
    ['Désignation', 'Unité', 'Qté', 'Prix unitaire (€)', 'Total (€)'],
  ];
  for (const line of calc.bom) {
    costData.push([line.designation, line.unit, line.quantityFinal, 0, 0]);
  }
  costData.push(['', '', '', 'Total:', 0]);
  const ws5 = XLSX.utils.aoa_to_sheet(costData);
  ws5['!cols'] = [{ wch: 25 }, { wch: 8 }, { wch: 10 }, { wch: 16 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws5, 'Estimation coûts');

  // Sheet 6: Technical Notes
  const notesData = [
    ['Notes techniques'],
    [''],
    ['Projet', project.name],
    ['Notes', project.notes],
    [''],
    ['Marge appliquée', `${project.margin_pct}%`],
    ['Marge non appliquée sur', 'Modules PV, Rails, Cable Tray'],
    [''],
    ['Optimisation des rails:'],
    ['- Les longueurs commerciales sont optimisées pour minimiser les chutes'],
    ['- Le nombre de rail splices est minimisé automatiquement'],
  ];
  const ws6 = XLSX.utils.aoa_to_sheet(notesData);
  ws6['!cols'] = [{ wch: 30 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws6, 'Notes techniques');

  XLSX.writeFile(wb, `BOM_${project.name.replace(/\s+/g, '_')}.xlsx`);
}

export function exportPDF(
  project: Project,
  _blocks: Block[],
  _panels: Panel[],
  calc: ProjectCalculation,
) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(0, 100, 200);
  doc.text('BOM by Hasina', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Nomenclature mécanique photovoltaïque', 14, 26);

  // Project info
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(project.name, 14, 38);
  doc.setFontSize(9);
  doc.setTextColor(80);
  const info = [
    `Client: ${project.client || '—'}`,
    `Société: ${project.company || '—'}`,
    `Ingénieur: ${project.engineer || '—'}`,
    `Référence: ${project.reference || '—'}`,
    `Localisation: ${project.location || '—'}`,
    `Date: ${project.date ?? '—'}`,
  ];
  info.forEach((line, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    doc.text(line, 14 + col * 90, 44 + row * 6);
  });

  // Summary
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text('Résumé', 14, 68);
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`Total modules: ${calc.totalModules}`, 14, 74);
  doc.text(`Puissance totale: ${(calc.totalPower / 1000).toFixed(2)} kWc`, 70, 74);
  doc.text(`Longueur totale rails: ${(calc.totalRailLength / 1000).toFixed(2)} m`, 14, 80);
  doc.text(`Marge: ${project.margin_pct}%`, 70, 80);

  // BOM Table
  autoTable(doc, {
    startY: 88,
    head: [['Désignation', 'Unité', 'Qté calculée', 'Marge', 'Qté finale']],
    body: calc.bom.map((line) => [
      line.designation,
      line.unit,
      line.quantityCalculated.toLocaleString('fr-FR'),
      line.hasMargin ? `+${project.margin_pct}%` : '—',
      line.quantityFinal.toLocaleString('fr-FR'),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [0, 100, 200] },
    styles: { fontSize: 8 },
    columnStyles: {
      2: { halign: 'right' },
      4: { halign: 'right' },
    },
  });

  // Block details
  const afterBOMY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text('Détail par bloc', 14, afterBOMY);

  autoTable(doc, {
    startY: afterBOMY + 4,
    head: [['Bloc', 'Panneau', 'Modules', 'Puissance (Wc)', 'Rails', 'L-Foot', 'Splices']],
    body: calc.blocks.map((bc) => [
      bc.blockName,
      `${bc.panelManufacturer} ${bc.panelModel}`,
      bc.moduleCount,
      bc.totalPower,
      bc.numCommercialRails,
      bc.lFootCount,
      bc.railSplices,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [0, 100, 200] },
    styles: { fontSize: 8 },
  });

  // Signature
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Établi par: ${project.engineer || '—'}`, 14, finalY);
  doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 14, finalY + 6);
  doc.line(120, finalY, 190, finalY);
  doc.text('Signature', 140, finalY + 6);

  doc.save(`BOM_${project.name.replace(/\s+/g, '_')}.pdf`);
}

export function exportCSV(calc: ProjectCalculation) {
  const headers = ['Désignation', 'Référence', 'Fabricant', 'Unité', 'Qté calculée', 'Marge', 'Qté finale'];
  const rows = calc.bom.map((line) => [
    line.designation,
    line.reference,
    line.manufacturer,
    line.unit,
    line.quantityCalculated,
    line.hasMargin ? '1' : '0',
    line.quantityFinal,
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'BOM_export.csv';
  a.click();
  URL.revokeObjectURL(url);
}
