# Cheminformatics Virtual Lab Web Suite

An automated, publication-grade bio/cheminformatics workstation engineered for small-molecule drug discovery profiling, interactive 2D structure sketching, 3D conformer visualization with WebGL (`3dmol.js`), Lipinski/Veber/Ghose rule compliance, Morgan fingerprint analysis, and publication-ready PDF dossier generation.

Engineered for seamless **Vercel Serverless** hybrid deployment (Next.js 14 App Router + Python FastAPI backend powered by `rdkit`, `pubchempy`, `reportlab`, and `matplotlib`).

---

## Key Features

### 1. Multi-Mode Chemical Resolver (PubChem PUG REST)
- **Input Flexibility**: Search by **Compound Name** (*Aspirin*, *Atorvastatin*), **CAS Registry Number** (`50-78-2`), **PubChem CID** (`2244`), **Canonical SMILES** (`CC(=O)Oc1ccccc1C(=O)O`), or **InChI** identifier (`InChI=1S/...`).
- **Real-Time Auto-Detection**: Live query type indicator dynamically detects whether the researcher typed a CAS, CID, SMILES, or chemical name.
- **Fast Offline Cache & Live PubChem Sync**: Benchmark drugs resolve in 0 ms; unknown compounds live-query PubChem PUG REST with strict timeouts and error fallbacks.

### 2. Interactive 2D Structure Sketcher & Vector SVG Engine
- **Interactive 2D Sketcher (`MoleculeSketcher`)**:
  - Direct molecule sketching toolbar: atoms (`C`, `N`, `O`, `S`, `P`, `F`, `Cl`, `Br`, `I`), bonds (single, double, triple), and ring templates (Benzene, Cyclopentane, Cyclohexane, Pyridine).
  - Common functional group stamps: `-OH`, `-COOH`, `-NH2`, `-NO2`, `-OCH3`, `-CF3`.
  - Embedded **SmilesDrawer** vector canvas rendering.
  - One-click **"Send to 3D Virtual Lab & Analyze"** button syncing sketched molecules straight into the 3D conformer viewer and property dashboard.
- **RDKit 2D Vector Depictions (`Viewer2D`)**:
  - Pure, crisp vector SVG drawings generated via RDKit with transparent background.
  - 4 view modes:
    1. **Skeletal / Line-Angle**: Standard chemical formula.
    2. **Stereochemical (Wedge/Dash)**: Explicit chiral stereocenters highlighted.
    3. **Explicit Atoms & Hs**: Full atom labels and implicit hydrogens drawn.
    4. **Bemis-Murcko Scaffold**: Extracted core molecular framework for scaffold hopping.
  - Zoom modal and direct SVG/PNG downloads.

### 3. Interactive 3Dmol.js WebGL Conformer Station
- **ETKDGv3 Conformer Embedding & MMFF94 Minimization**:
  - Generates 3D conformers with ETKDGv3 and performs MMFF94 force field energy minimization (with UFF fallback).
  - **Conformer Toggle**: Compare unminimized ETKDG raw geometry vs MMFF94 energy-minimized geometry.
  - Energy score calculation in kcal/mol.
- **Model Representation Modes**:
  - Ball-and-Stick
  - Stick / Licorice
  - Space-Filling Sphere (Van der Waals radii)
  - Cartoon / Ribbon
  - Wireframe
- **Surface Overlays**:
  - Van der Waals Surface (VDW)
  - Solvent Accessible Surface (SAS)
  - Solvent Excluded Surface (SES)
  - Electrostatic Potential (ESP) mapped with Gasteiger partial charges (-δ red / +δ blue).
- **Interactive Controls**: Auto-rotation toggle, explicit hydrogen toggle, light/dark canvas background toggle, reset camera center, and camera snapshot download.

### 4. Physicochemical & Drug-Likeness Dashboard
- **Lipinski's Rule of 5**:
  - Molecular Weight ($MW \le 500\text{ g/mol}$)
  - Partition Coefficient ($\text{MolLogP} \le 5.0$)
  - Hydrogen Bond Donors ($HBD \le 5$)
  - Hydrogen Bond Acceptors ($HBA \le 10$)
- **Veber Rules**:
  - Rotatable Bonds ($RotB \le 10$)
  - Topological Polar Surface Area ($TPSA \le 140\text{ \AA}^2$)
- **Ghose Filter**:
  - $\text{LogP}$ between -0.4 and 5.6
  - $MW$ between 160 and 480 g/mol
  - Molar Refractivity between 40 and 130
  - Heavy Atom Count between 20 and 70
- **Morgan Fingerprint (ECFP4)**:
  - 1024-bit Morgan fingerprint calculated with radius 2.
  - Active bit count, bit density gauge, and interactive 32x32 bit-grid matrix visualization.
- **Extended Descriptors**: Heavy atoms, rings, aromatic rings, Fraction Csp3 ($f_{sp^3}$), and chiral stereocenters.

### 5. GHS Safety Flags & PubChem Bioassays
- **GHS Hazard Pictograms**: Irritant, Toxic, Flammable, Health Hazard, Environmental Hazard, Corrosive pictograms fetched from PubChem PUG REST.
- **GHS Hazard Statements**: Listed with expand/collapse summary.
- **Bioassay Activity Statistics**: Total tested assays, active assays, and percentage activity ratio.

### 6. Export & Publication-Grade PDF Dossier
- **One-Click PDF Dossier (`/api/export-pdf`)**:
  - Generated using ReportLab Platypus.
  - Features compound overview, identifiers, high-res 2D chemical structure, oral bioavailability radar plot, Lipinski/Veber/Ghose tables, and GHS safety flags.
- **Direct Structure File Exports**:
  - MDL Molfile (`.mol`)
  - Structure Data File (`.sdf`)
  - Canonical SMILES (`.smi`)
  - High-res Vector SVG (`.svg`)
  - High-res PNG (`.png`)
  - Copy-to-clipboard for SMILES, CAS, InChI, and InChIKey.

### 7. Virtual Lab Aesthetic
- Crisp, clinical workstation design with lighter tones (`#f8fafc` / `#ffffff`), laboratory millimeter grid, glassmorphic instrument panels, and LED status indicators.
- Seamless **Light / Dark theme toggle** in the top navigation bar.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router, TypeScript), Tailwind CSS, Lucide React, 3Dmol.js, SmilesDrawer |
| **Backend** | Python 3.12, FastAPI, Uvicorn, Pydantic |
| **Cheminformatics** | RDKit (`rdkit-pypi`), PubChemPy, NumPy, Matplotlib |
| **Reporting** | ReportLab 4.0 (Platypus PDF Generation) |
| **External APIs** | PubChem PUG REST & PUG-View APIs |
| **Deployment** | Vercel Serverless Functions (`vercel.json` rewrites) |

---

## Project Structure

```
drug-likeness-dossier/
├── api/
│   ├── index.py              # FastAPI serverless entry point (/api/analyze, /api/export-pdf, /api/structure/mol)
│   ├── chem_engine.py        # RDKit engine: Lipinski, Veber, Ghose, Morgan FP, SVG, 3D conformer, PubChem
│   ├── pdf_generator.py      # ReportLab publication-grade PDF dossier generator
│   └── requirements.txt      # rdkit, fastapi, uvicorn, reportlab, pubchempy, requests, pydantic
├── src/
│   ├── app/
│   │   ├── globals.css       # Virtual Lab theme: light palette variables, lab grid, glass panels, dark mode
│   │   ├── layout.tsx        # RootLayout with 3Dmol.js and SmilesDrawer CDNs
│   │   └── page.tsx          # Virtual Lab workstation dashboard: header, telemetry, search, split-pane, metrics
│   ├── components/
│   │   ├── Navbar.tsx        # Virtual Lab top bar with status LEDs, benchmark drug picker, and theme switcher
│   │   ├── SearchBar.tsx     # Smart chemical resolver (Name, CAS, CID, SMILES, InChI) with mode badges
│   │   ├── Viewer2D.tsx      # Split-pane left: RDKit SVG depiction tabs + MoleculeSketcher toggle
│   │   ├── MoleculeSketcher.tsx # Interactive 2D Structure Sketcher (atoms, bonds, rings, groups, SMILES/MOL export)
│   │   ├── Viewer3D.tsx      # Split-pane right: 3dmol.js WebGL viewer (Stick, Sphere, Cartoon, Wireframe, VDW/SAS/ESP)
│   │   ├── MetricCards.tsx   # Drug-likeness dashboard: Lipinski Ro5, Veber, Ghose, Extended metrics, Identifiers
│   │   ├── RadarChart.tsx    # Normalized oral bioavailability radar plot
│   │   ├── MorganFingerprint.tsx # 1024-bit Morgan ECFP4 fingerprint matrix & density
│   │   ├── SafetyPictograms.tsx  # PubChem GHS hazard pictograms & bioassay summary
│   │   └── DossierExport.tsx # PDF Dossier download & direct SMILES, SDF, MOL, SVG, PNG file exports
│   ├── lib/
│   │   ├── chem-fallback.ts  # Client-side fallback analyzer for cold-start resilience and offline functionality
│   │   └── samples.ts        # Reference benchmark molecules across search modalities
│   └── types/
│       └── chem.ts           # TypeScript interfaces for full cheminformatics dataset
├── next.config.js            # Next.js configuration with development proxy rewrites to FastAPI
├── vercel.json               # Serverless function rewrite rules for Vercel deployment
└── package.json              # Next.js and npm dependencies
```

---

