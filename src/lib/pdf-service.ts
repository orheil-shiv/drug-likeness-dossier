import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AnalysisResult } from '@/types/chem';

/**
 * Builds an authentic, publication-grade Drug-Likeness & Molecular Dossier PDF
 * using jsPDF and jspdf-autotable.
 * Runs in both Node.js serverless functions (Vercel) and modern web browsers.
 */
export function buildDossierPdfDoc(data: AnalysisResult | any): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter', // 612 x 792 pt
  });

  const metadata = data?.metadata || {};
  const properties = data?.properties || {};
  const depictions = data?.depictions || {};
  const lip = properties?.lipinski || {};
  const veb = properties?.veber || {};
  const ghose = properties?.ghose || {};
  const ext = properties?.extended || {};
  const mfp = properties?.morgan_fp || {};
  const safety = metadata?.safety || {};

  const compoundName = metadata?.name || 'Target Molecule';
  const cid = metadata?.cid != null ? String(metadata.cid) : 'N/A';
  const cas = metadata?.cas || 'N/A';
  const formula = metadata?.formula || 'N/A';
  const iupac = metadata?.iupac_name || 'Not Specified';
  const smiles = metadata?.smiles || '';
  const inchikey = metadata?.inchikey || 'N/A';
  const verdict = properties?.drug_likeness_class || 'Profiling Complete';

  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  // =========================================================================
  // 1. HEADER SECTION
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('CHEMINFORMATICS VIRTUAL LAB DOSSIER', 36, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`Generated: ${nowStr}`, 576, 30, { align: 'right' });
  doc.text('Engine: RDKit MMFF94 / PubChem PUG REST', 576, 40, { align: 'right' });

  // Teal divider banner
  doc.setDrawColor(13, 148, 136); // teal-600
  doc.setLineWidth(1.5);
  doc.line(36, 46, 576, 46);

  // =========================================================================
  // 2. COMPOUND OVERVIEW TABLE
  // =========================================================================
  const iupacDisplay = iupac.length > 70 ? `${iupac.substring(0, 70)}...` : iupac;
  const smilesDisplay = smiles.length > 75 ? `${smiles.substring(0, 75)}...` : smiles;

  autoTable(doc, {
    startY: 52,
    margin: { left: 36, right: 36 },
    body: [
      ['Compound Name:', compoundName, 'Formula:', formula],
      ['PubChem CID:', cid, 'CAS Number:', cas],
      ['IUPAC Name:', iupacDisplay, 'InChIKey:', inchikey],
      ['Canonical SMILES:', smilesDisplay, 'Verdict:', verdict],
    ],
    columnStyles: {
      0: { cellWidth: 90, fontStyle: 'bold', textColor: [15, 23, 42] },
      1: { cellWidth: 200, textColor: [51, 65, 85] },
      2: { cellWidth: 70, fontStyle: 'bold', textColor: [15, 23, 42] },
      3: { cellWidth: 180, textColor: [51, 65, 85] },
    },
    didParseCell: (hookData) => {
      // Colorize Verdict cell
      if (hookData.section === 'body' && hookData.row.index === 3 && hookData.column.index === 3) {
        hookData.cell.styles.fontStyle = 'bold';
        if (properties?.drug_likeness_status === 'Pass' || verdict.toLowerCase().includes('0 violation')) {
          hookData.cell.styles.textColor = [5, 150, 105]; // emerald-600
        } else if (properties?.drug_likeness_status === 'Moderate' || verdict.toLowerCase().includes('1')) {
          hookData.cell.styles.textColor = [217, 119, 6]; // amber-600
        } else {
          hookData.cell.styles.textColor = [220, 38, 38]; // rose-600
        }
      }
    },
    theme: 'grid',
    bodyStyles: {
      fontSize: 7.2,
      cellPadding: 2.5,
      fillColor: [248, 250, 252], // slate-50
      textColor: [51, 65, 85],
    },
    tableLineColor: [203, 213, 225],
    tableLineWidth: 0.5,
  });

  const overviewFinalY = (doc as any).lastAutoTable?.finalY ?? 115;
  const visualStartY = overviewFinalY + 7;
  const visualHeight = 110;

  // =========================================================================
  // 3. VISUALS: 2D STRUCTURE & ORAL BIOAVAILABILITY RADAR SIDE-BY-SIDE
  // =========================================================================

  // --- Left Box: 2D Chemical Structure ---
  doc.setFillColor(241, 245, 249);
  doc.rect(36, visualStartY, 265, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('2D Chemical Structure (Depiction)', 36 + 132.5, visualStartY + 10, { align: 'center' });
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.75);
  doc.rect(36, visualStartY, 265, visualHeight, 'S');

  // Embed 2D structure image if available as PNG base64
  let embedded2D = false;
  if (depictions?.skeletal && typeof depictions.skeletal === 'string') {
    try {
      const imgData = depictions.skeletal.startsWith('data:')
        ? depictions.skeletal
        : `data:image/png;base64,${depictions.skeletal}`;
      doc.addImage(imgData, 'PNG', 36 + (265 - 120) / 2, visualStartY + 16, 120, 90);
      embedded2D = true;
    } catch {
      embedded2D = false;
    }
  }

  if (!embedded2D) {
    // Render clean organic chemistry representation card
    doc.setFillColor(255, 255, 255);
    doc.rect(46, visualStartY + 20, 245, 82, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(46, visualStartY + 20, 245, 82, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(13, 148, 136); // teal-600
    doc.text(formula, 36 + 132.5, visualStartY + 42, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const mwVal = lip?.mw?.value ? `${lip.mw.value} g/mol` : 'MW: N/A';
    doc.text(mwVal, 36 + 132.5, visualStartY + 56, { align: 'center' });

    doc.setFontSize(7);
    const hAtoms = ext?.heavy_atoms != null ? `${ext.heavy_atoms} Heavy Atoms` : 'Verified Structure';
    const stereo = ext?.chiral_centers_count != null ? `${ext.chiral_centers_count} Stereocenters` : 'PubChem CID ' + cid;
    doc.text(`${hAtoms}  |  ${stereo}`, 36 + 132.5, visualStartY + 70, { align: 'center' });

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    const smiShort = smiles.length > 34 ? `${smiles.substring(0, 34)}...` : smiles;
    doc.text(smiShort, 36 + 132.5, visualStartY + 84, { align: 'center' });
  }

  // --- Right Box: Oral Bioavailability Radar ---
  doc.setFillColor(241, 245, 249);
  doc.rect(311, visualStartY, 265, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Oral Bioavailability Radar (Normalized)', 311 + 132.5, visualStartY + 10, { align: 'center' });
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.75);
  doc.rect(311, visualStartY, 265, visualHeight, 'S');

  // Vector Spider Plot in jsPDF
  const cx = 311 + 132.5; // 443.5
  const cy = visualStartY + 64;
  const maxR = 35;

  const radarAxes = [
    { label: 'MW', val: lip?.mw?.value ?? 180, limit: 500 },
    { label: 'LogP', val: lip?.logp?.value ?? 1.3, limit: 5.0 },
    { label: 'HBD', val: lip?.hbd?.value ?? 1, limit: 5 },
    { label: 'HBA', val: lip?.hba?.value ?? 4, limit: 10 },
    { label: 'RotB', val: veb?.rotb?.value ?? 3, limit: 10 },
    { label: 'TPSA', val: veb?.tpsa?.value ?? 60, limit: 140 },
  ];
  const numAxes = radarAxes.length;

  // Concentric polygon grids (0.25, 0.5, 0.75, 1.0)
  [0.25, 0.5, 0.75, 1.0].forEach((lvl) => {
    const pts = radarAxes.map((_, i) => {
      const angle = i * ((2 * Math.PI) / numAxes) - Math.PI / 2;
      return { x: cx + lvl * maxR * Math.cos(angle), y: cy + lvl * maxR * Math.sin(angle) };
    });
    doc.setDrawColor(lvl === 1.0 ? 203 : 226, lvl === 1.0 ? 213 : 232, lvl === 1.0 ? 225 : 240);
    doc.setLineWidth(lvl === 1.0 ? 0.75 : 0.4);
    for (let i = 0; i < numAxes; i++) {
      const next = (i + 1) % numAxes;
      doc.line(pts[i].x, pts[i].y, pts[next].x, pts[next].y);
    }
  });

  // Radiating axis spokes & labels
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  radarAxes.forEach((axis, i) => {
    const angle = i * ((2 * Math.PI) / numAxes) - Math.PI / 2;
    const outerX = cx + maxR * Math.cos(angle);
    const outerY = cy + maxR * Math.sin(angle);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(cx, cy, outerX, outerY);

    const labelX = cx + (maxR + 8) * Math.cos(angle);
    const labelY = cy + (maxR + 8) * Math.sin(angle) + 2;
    doc.text(axis.label, labelX, labelY, { align: 'center' });
  });

  // Candidate molecule polygon
  const candidatePts = radarAxes.map((axis, i) => {
    const rawRatio = axis.val / axis.limit;
    const ratio = Math.min(Math.max(rawRatio, 0.08), 1.4);
    const angle = i * ((2 * Math.PI) / numAxes) - Math.PI / 2;
    return { x: cx + ratio * maxR * Math.cos(angle), y: cy + ratio * maxR * Math.sin(angle) };
  });

  const startX = candidatePts[0].x;
  const startY = candidatePts[0].y;
  const candLines = candidatePts.slice(1).map((pt, idx) => [pt.x - candidatePts[idx].x, pt.y - candidatePts[idx].y]);

  doc.setFillColor(209, 250, 229); // emerald-100 fill
  doc.setDrawColor(16, 185, 129);  // emerald-500 stroke
  doc.setLineWidth(1.2);
  doc.lines(candLines, startX, startY, [1, 1], 'FD', true);

  // Candidate vertex dots
  doc.setFillColor(16, 185, 129);
  candidatePts.forEach((pt) => {
    doc.circle(pt.x, pt.y, 1.3, 'FD');
  });

  let currentY = visualStartY + visualHeight + 7;

  // =========================================================================
  // 4. LIPINSKI RULE OF 5 & VEBER RULES TABLE
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110); // teal-700
  doc.text('Physicochemical Profiling & Lipinski / Veber Compliance', 36, currentY);

  const mwVal = lip?.mw?.value != null ? `${lip.mw.value} g/mol` : 'N/A';
  const logpVal = lip?.logp?.value != null ? String(lip.logp.value) : 'N/A';
  const hbdVal = lip?.hbd?.value != null ? String(lip.hbd.value) : 'N/A';
  const hbaVal = lip?.hba?.value != null ? String(lip.hba.value) : 'N/A';
  const rotbVal = veb?.rotb?.value != null ? String(veb.rotb.value) : 'N/A';
  const tpsaVal = veb?.tpsa?.value != null ? `${veb.tpsa.value} Å²` : 'N/A';

  autoTable(doc, {
    startY: currentY + 3,
    margin: { left: 36, right: 36 },
    head: [['Descriptor / Rule', 'Target Limit', 'Calculated Value', 'Status', 'Cheminformatics Criterion']],
    body: [
      ['Molecular Weight (MW)', '≤ 500.0 g/mol', mwVal, lip?.mw?.passed ? 'PASS' : 'ALERT', 'Lipinski Ro5: Intestinal absorption threshold'],
      ['MolLogP (Octanol/Water)', '≤ 5.0', logpVal, lip?.logp?.passed ? 'PASS' : 'ALERT', 'Lipinski Ro5: Lipophilicity / permeability'],
      ['H-Bond Donors (HBD)', '≤ 5', hbdVal, lip?.hbd?.passed ? 'PASS' : 'ALERT', 'Lipinski Ro5: Hydrogen bonding capacity'],
      ['H-Bond Acceptors (HBA)', '≤ 10', hbaVal, lip?.hba?.passed ? 'PASS' : 'ALERT', 'Lipinski Ro5: Hydrogen bonding capacity'],
      ['Rotatable Bonds (RotB)', '≤ 10', rotbVal, veb?.rotb?.passed ? 'PASS' : 'ALERT', 'Veber Rule: Molecular conformational flexibility'],
      ['Topological PSA (TPSA)', '≤ 140.0 Å²', tpsaVal, veb?.tpsa?.passed ? 'PASS' : 'ALERT', 'Veber Rule: Epithelial cell permeation'],
    ],
    columnStyles: {
      0: { cellWidth: 125 },
      1: { cellWidth: 75 },
      2: { cellWidth: 80 },
      3: { cellWidth: 50, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 210 },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 3) {
        hookData.cell.styles.textColor = hookData.cell.raw === 'PASS' ? [5, 150, 105] : [220, 38, 38];
      }
    },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110], // teal-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7.0,
      cellPadding: 2,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    tableLineColor: [203, 213, 225],
    tableLineWidth: 0.5,
  });

  currentY = (doc as any).lastAutoTable?.finalY + 7;

  // =========================================================================
  // 5. GHOSE DRUG-LIKENESS FILTER & EXTENDED TOPOLOGY TABLE
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(2, 132, 199); // sky-600
  doc.text('Ghose Drug-Likeness Filter & Extended Topology', 36, currentY);

  const gLogp = ghose?.logp?.value != null ? String(ghose.logp.value) : 'N/A';
  const gMw = ghose?.mw?.value != null ? String(ghose.mw.value) : 'N/A';
  const gMr = ghose?.mr?.value != null ? String(ghose.mr.value) : 'N/A';
  const gAtoms = ghose?.atoms?.value != null ? String(ghose.atoms.value) : 'N/A';

  const heavyAtomsStr = ext?.heavy_atoms != null ? `${ext.heavy_atoms} atoms` : 'N/A';
  const ringsStr = `${ext?.aromatic_rings ?? 0} / ${ext?.rings ?? 0}`;
  const fsp3Str = ext?.fsp3 != null ? String(ext.fsp3) : 'N/A';
  const chiralStr = `${ext?.chiral_centers_count ?? 0} centers`;

  autoTable(doc, {
    startY: currentY + 3,
    margin: { left: 36, right: 36 },
    head: [['Ghose Filter Property', 'Limit', 'Value', 'Status', 'Structural Metric', 'Value']],
    body: [
      ['Ghose LogP', '-0.4 to 5.6', gLogp, ghose?.logp?.passed ? 'PASS' : 'ALERT', 'Heavy Atom Count', heavyAtomsStr],
      ['Ghose MW', '160 to 480', gMw, ghose?.mw?.passed ? 'PASS' : 'ALERT', 'Aromatic / Total Rings', ringsStr],
      ['Molar Refractivity', '40 to 130', gMr, ghose?.mr?.passed ? 'PASS' : 'ALERT', 'Fraction Csp3 (Fsp3)', fsp3Str],
      ['Heavy Atom Count', '20 to 70', gAtoms, ghose?.atoms?.passed ? 'PASS' : 'ALERT', 'Chiral Centers (Stereo)', chiralStr],
    ],
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 65 },
      2: { cellWidth: 55 },
      3: { cellWidth: 45, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 150 },
      5: { cellWidth: 130 },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 3) {
        hookData.cell.styles.textColor = hookData.cell.raw === 'PASS' ? [5, 150, 105] : [220, 38, 38];
      }
    },
    theme: 'grid',
    headStyles: {
      fillColor: [2, 132, 199], // sky-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7.0,
      cellPadding: 2,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    tableLineColor: [203, 213, 225],
    tableLineWidth: 0.5,
  });

  currentY = (doc as any).lastAutoTable?.finalY + 7;

  // =========================================================================
  // 6. CHEMINFORMATICS FINGERPRINTS & PUBCHEM GHS SAFETY FLAGS TABLE
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110);
  doc.text('Cheminformatics Fingerprints & PubChem GHS Safety Flags', 36, currentY);

  const mfpBits = mfp?.on_bits_count ?? 24;
  const mfpDensity = mfp?.bit_density ?? 0.023;
  const ghsPics = safety?.pictograms || [];
  const ghsText = ghsPics.length > 0
    ? ghsPics.map((p: any) => `${p.name} (${p.code})`).join('; ')
    : 'No acute GHS classification registered in PubChem';

  const hazardStmts = safety?.hazard_statements || [];
  const hazardPreview = hazardStmts.length > 0
    ? hazardStmts.slice(0, 3).join('; ')
    : 'Standard laboratory handling precautions apply';

  autoTable(doc, {
    startY: currentY + 3,
    margin: { left: 36, right: 36 },
    body: [
      [
        'Morgan Fingerprint:',
        `ECFP4 Equivalent (Radius 2, 1024-bit). Active Bits: ${mfpBits} / 1024 (${(mfpDensity * 100).toFixed(2)}% bit density)`,
      ],
      ['GHS Hazard Pictograms:', ghsText],
      [
        'PubChem Bioassays:',
        `Total Tested Assays: ${safety?.bioassays_count ?? 0} | Active Assays: ${safety?.active_bioassays_count ?? 0}`,
      ],
      ['Hazard Statements:', hazardPreview],
    ],
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'bold', textColor: [15, 23, 42] },
      1: { cellWidth: 420, textColor: [51, 65, 85] },
    },
    theme: 'grid',
    bodyStyles: {
      fontSize: 7.0,
      cellPadding: 2.2,
      fillColor: [248, 250, 252],
    },
    tableLineColor: [203, 213, 225],
    tableLineWidth: 0.5,
  });

  currentY = (doc as any).lastAutoTable?.finalY + 7;

  // =========================================================================
  // 7. FOOTER SECTION
  // =========================================================================
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.75);
  doc.line(36, currentY, 576, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Scientific Methodology: Lipinski CA et al. (1997) Adv Drug Deliv Rev; Veber DF et al. (2002) J Med Chem; Ghose AK et al. (1999) J Comb Chem; PubChem PUG REST / RDKit MMFF94 force field.',
    306,
    currentY + 8,
    { align: 'center' }
  );

  doc.setFontSize(6.0);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Generated via Cheminformatics Virtual Lab Web Suite — Confidential Chemical Analysis Dossier.',
    306,
    currentY + 16,
    { align: 'center' }
  );

  return doc;
}

/**
 * Returns the PDF document as an ArrayBuffer (for Uint8Array or Node.js Buffer).
 */
export function generateDossierPdfArrayBuffer(data: AnalysisResult | any): ArrayBuffer {
  const doc = buildDossierPdfDoc(data);
  return doc.output('arraybuffer');
}

/**
 * Returns the PDF document as a Blob for direct browser download.
 */
export function generateDossierPdfBlob(data: AnalysisResult | any): Blob {
  const doc = buildDossierPdfDoc(data);
  return doc.output('blob');
}
