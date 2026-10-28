import { NextRequest, NextResponse } from 'next/server';
import { generateDossierPdfArrayBuffer } from '@/lib/pdf-service';
import { resolvePubChemCompound } from '@/lib/pubchem-service';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    let analysisData = body?.analysis_data || body?.data;

    // If only a query was passed, resolve via PubChem service
    if (!analysisData && body?.query) {
      try {
        analysisData = await resolvePubChemCompound(body.query);
      } catch {
        // Continue with empty or partial data
      }
    }

    // 1. Try local/containerized Python ReportLab server if active (fast 1500ms timeout)
    if (analysisData) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const pyResp = await fetch('http://127.0.0.1:8000/api/export-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analysis_data: analysisData }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (pyResp.ok) {
          const pdfBlob = await pyResp.blob();
          const compoundName = (analysisData?.metadata?.name || 'Compound').replace(/\s+/g, '_');
          return new NextResponse(pdfBlob, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${compoundName}_Cheminformatics_Dossier.pdf"`,
            },
          });
        }
      } catch {
        // Python ReportLab backend offline or timed out; proceed to native TypeScript PDF generator
      }
    }

    // 2. Native Next.js Serverless TypeScript PDF Compilation (Zero-dependency, works seamlessly on Vercel)
    if (!analysisData) {
      // Fallback: If no body was provided, resolve default benchmark (Aspirin)
      try {
        analysisData = await resolvePubChemCompound('Aspirin');
      } catch {
        analysisData = {
          metadata: { name: 'Compound Dossier', formula: 'N/A', smiles: '' },
          properties: {},
        };
      }
    }

    const pdfBuffer = generateDossierPdfArrayBuffer(analysisData);
    const compoundName = (analysisData?.metadata?.name || 'Compound').replace(/[\s/\\:]+/g, '_');
    const filename = `${compoundName}_Cheminformatics_Dossier.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('PDF export error:', err);
    return NextResponse.json(
      { detail: err?.message || 'Error exporting compound dossier.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Support direct GET requests with ?query=...
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || 'Aspirin';

  try {
    const analysisData = await resolvePubChemCompound(query);
    const pdfBuffer = generateDossierPdfArrayBuffer(analysisData);
    const compoundName = (analysisData?.metadata?.name || query).replace(/[\s/\\:]+/g, '_');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${compoundName}_Cheminformatics_Dossier.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || 'Failed to generate PDF for query.' },
      { status: 500 }
    );
  }
}
