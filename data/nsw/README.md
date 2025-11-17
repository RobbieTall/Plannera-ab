# NSW Legislation XML Exports

This directory holds manually downloaded XML exports from legislation.nsw.gov.au for ingestion into the Plannera database.

## Why Manual Download?

Codex/CI environments are blocked by NSW legislation.nsw.gov.au, preventing automatic fetching. Manual download via browser is the current workaround until:
- NSW provides an official API
- NSW whitelists our production IPs
- We set up a separate fetch service

## Priority LEPs (Batch 1 - First 5)

Download these 5 LEPs first to start building the knowledge base:

### 1. Sydney LEP 2012
- **URL**: https://legislation.nsw.gov.au/view/html/inforce/current/epi-2012-0628
- **Filename**: `sydney-lep-2012.html`
- **Coverage**: City of Sydney LGA

### 2. Randwick LEP 2012  
- **URL**: https://legislation.nsw.gov.au/view/html/inforce/current/epi-2012-0460
- **Filename**: `randwick-lep-2012.html`
- **Coverage**: Randwick LGA (Coogee, Randwick, Clovelly)

### 3. Waverley LEP 2012
- **URL**: https://legislation.nsw.gov.au/view/html/inforce/current/epi-2012-0666  
- **Filename**: `waverley-lep-2012.html`
- **Coverage**: Waverley LGA (Bondi, Bronte, Bondi Beach)

### 4. Woollahra LEP 2014
- **URL**: https://legislation.nsw.gov.au/view/html/inforce/current/epi-2014-0046
- **Filename**: `woollahra-lep-2014.html`
- **Coverage**: Woollahra LGA (Double Bay, Paddington, Vaucluse)

### 5. Bayside LEP 2021
- **URL**: https://legislation.nsw.gov.au/view/html/inforce/current/epi-2021-0144  
- **Filename**: `bayside-lep-2021.html`
- **Coverage**: Bayside LGA (Botany, Mascot, Rockdale)

## How to Download

XML exports are preferred because they ship cleaner structure for headings/clauses than the rendered HTML pages.

1. Build the export URL for the instrument: `https://legislation.nsw.gov.au/export/xml/current/<export-id>` (for example, Sydney LEP 2012 uses `epi-2012-0628`).
2. Download the XML file in your browser (or with `curl` if available) and save it with the exact filename listed above (e.g. `sydney-lep-2012.xml`).
3. Place the file in this `data/nsw/` directory.
4. Set `LEGISLATION_USE_FIXTURES=true` when ingesting to force the fetcher to use these local XML fixtures instead of the live NSW site.

## After Download

Once files are downloaded, run ingestion:

```bash
# Set environment to use fixtures
export LEGISLATION_USE_FIXTURES=true

# Run ingestion
npm run ingest:legislation
```

## Refresh Schedule

LEPs are updated periodically by NSW government. Recommended refresh:
- **Every 48 hours** for active development
- **Weekly** for production monitoring  

See `scripts/refresh-legislation.ts` for automated refresh workflow.

## Next Batches

After successfully ingesting Batch 1, we'll add:
- Batch 2: North Sydney, Willoughby, Lane Cove, Hunters Hill, Mosman
- Batch 3: Inner West, Canterbury-Bankstown, Strathfield
- Batch 4: Parramatta, Cumberland, Northern Beaches
- Additional batches as needed
    
