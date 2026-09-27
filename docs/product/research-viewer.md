# Plannera Research Viewer

Decision date: 27 September 2026. Status: **ADOPTED PRODUCT DIRECTION / NOT IMPLEMENTED OR ACCEPTED**.

Research Viewer is a near-term workspace capability, sequenced immediately after the current commercial release gates and their prerequisite fixes. It lets a user inspect public spatial and council information and retain a source-linked evidence record in the same project. The documentation decision does not complete Item 78C, change its acceptance snapshot, enable checkout or authorise Production changes.

## User journey and first release

Open **Tools → Council & Spatial Viewer**. Resolve the existing project site and LGA; show the selected source and coverage limitations. For a verified native source, focus on the confirmed site, pan and zoom, toggle available layers, inspect features and select **Capture to Project**. Save the image and metadata under **Project Sources / Evidence**, then reopen the saved record after refresh. Opening the current live source is a separate action from reopening the immutable capture.

V1 covers Byron and Kempsey using accessible NSW/ArcGIS services and verified council sources where available. It includes source selection, site focus, layer controls, native capture, evidence persistence, provenance and reopening. It does not promise that either council portal can be embedded or that every advertised layer is available. Missing or ambiguous site coordinates require confirmation; an address search result is not a surveyed parcel boundary. Failed or incomplete layers must be visible to the user.

The next slice adds one public DA-tracker adapter: search address, inspect a result, capture or save the public resource, and retain the DA reference and source provenance where available. Structured DA extraction across all councils, arbitrary browsing and a remote-browser fleet are outside v1.

## Adapter selection

| Mode | Use | Capture contract |
| --- | --- | --- |
| `NATIVE_ARCGIS` | Verified public WebMaps or compatible ArcGIS services rendered in Plannera | Capture through the map view, with separate legend, attribution and feature metadata |
| `NATIVE_SPATIAL` | Later tested WMS/WFS/GeoJSON and other supported spatial services | Adapter-specific rendering and capture checks; never assume CORS or export support |
| `EMBED` | A specific council page permits framing | Browsing does not imply readable DOM or screenshot access; expose capture only if explicitly supported |
| `REMOTE_BROWSER` | Later allowlisted public sources where native/embedded integration is insufficient and use is permitted | Isolated browser and user-requested capture; separately accepted security and cost controls |
| `EXTERNAL` | Unsupported, unverified or restricted source | Open official source externally; save a link or use reviewed manual upload without claiming an automatic capture |

These are proposed registry values, not an existing runtime API. Keep native, permitted embed, controlled remote and external fallback as the four integration levels; `NATIVE_SPATIAL` extends the native level beyond ArcGIS. Unknown entries default to external. Remote browsing remains disabled until its own acceptance; it is never an automatic response to an access block.

The existing implementation is `src/lib/lga-map-registry.ts`, with `LgaMapInfo`, normalised LGA lookup, primary URLs and fallbacks. Extend that registry compatibly rather than building a competing list. Current platform labels are discovery leads, not proof of service type or capture capability. In particular, Byron's configured URL is an application URL: resolve and verify the underlying WebMap/service identifiers. Kempsey currently points to the NSW Spatial Viewer; identify reusable state services rather than assuming a council-hosted native map.

Each source descriptor should record stable source ID, canonical LGA, source kind (map/DA tracker), publisher, official landing URL, direct service or WebMap ID, platform, viewer mode, capability flags (`canFocusSite`, `canSelectFeature`, `canCapture`, `canExtract`), allowed origins, attribution/licence reference, validation time/result, adapter version and fallback. Map and tracker may use different adapters within one LGA. Registry health is separate from LGA statutory coverage maturity; viewing or capturing a source never promotes coverage to `VERIFIED`.

## Layer accuracy and source priority

Use official NSW state layers as the baseline, then add official council layers where available for local detail or information the state service does not provide. Provider brand, visual detail and successful rendering do not establish authority. A council-hosted ArcGIS layer is still a council source; a copied state layer is not independent confirmation.

The NSW Planning Portal Spatial Viewer is a viewing/access surface, not a single legal source. For zoning, height, FSR, minimum lot size and other mapped instrument controls, identify the applicable LEP/SEPP and its current legally adopted map, including adopted digital mapping where applicable. Use verified official state services for native display and keep the link to the governing instrument/map. Other constraints use the responsible authority's dataset for that topic, with official council mapping supplying local detail or acting as the topic's primary authoritative source where appropriate. Check digital-map adoption and instrument/map versions per LGA; neither a cached service nor a screenshot is automatically the legally operative map. The rule is authoritative source per layer, with state planning layers as the starting point.

For each layer, validate its publisher, official endpoint/item and layer ID, subject, geographic coverage, coordinate reference system, scale/resolution limits, update/effective date where published, licence, and relationship to the relevant instrument or authority. Record the validation date and reviewer separately from the source date. Unknown source currency must be labelled unknown, not current. RV0 must record an accuracy/source matrix for every pilot layer, with state baseline, optional council supplement and any gap or conflict.

Apply this resolution order:

1. Select the official state source for the topic as the baseline; check it covers the actual site and its legend, attributes and coordinate system match the intended use.
2. Add an official council source only for an identified local purpose, with its source and role visible. Where no suitable state layer exists, an authoritative council source can be the primary layer for that topic and must be labelled accordingly.
3. If state and council layers disagree, retain both provenance records, display the conflict and mark the affected interpretation unresolved. Do not silently overwrite state data, blend incompatible classifications, hide a conflict, infer no constraint from a missing feature, or let a screenshot resolve the disagreement.
4. Resolve any exception against the legally applicable instrument, adopted map or responsible authority. A legally authoritative council map can govern its specific topic; document why it supersedes or supplements the state display, who reviewed it and the applicable date. Source hierarchy is a default selection policy, not a claim that every state web layer overrides the statutory map.

At parcel boundaries or with coarse-scale mapping, disclose uncertainty and seek authoritative detail; a point query alone must not certify that the whole parcel is unaffected. Never promote cartographic observations to verified controls without the existing structured evidence and review gates.

Acceptance must prove the default state-first order, council supplementation, council-only topics, duplicate/repackaged state data, outdated or unknown source dates, differing classifications and parcel-edge uncertainty. Users must be able to identify which source supports each visible layer and each downstream claim.

## Evidence record

Reuse existing project Source/resource, private storage and evidence-review services. Final table and payload changes require code inspection and ordinary migration review; this document does not prescribe a parallel database or replacement authentication stack.

| Record group | Required information |
| --- | --- |
| Identity and scope | Evidence ID, schema version, authorised project ID, site ID/revision, capture actor and proposal revision where applicable |
| Source | Source ID/system/publisher, state/council authority and baseline/supplement role for each layer, canonical public URL, actual public page/service URL, capture method and adapter version, attribution and licence reference |
| Time | Capture time in UTC, server receipt time, display timezone; source update/effective date separately when supplied |
| Image | Private object key, MIME type, dimensions, server-computed SHA-256 of stored bytes, canonical metadata/manifest hash |
| Map state | Extent and spatial reference, scale/rotation where available, visible layer IDs/titles/service URLs, filters/time selection, load failures, legend and selected feature identifiers/attributes |
| Tracker state | Search term, result URL, DA number/description/determination date only when observed; absence or uncertainty recorded explicitly |
| Review | Capture-only/unreviewed status, provenance origin (client-observed or independently server-verified), applicability review, supersedes link and downstream evidence references |

Fields unavailable in a mode are null with a reason, never invented. Do not persist authentication tokens or sensitive URL parameters. Validate source URLs against the registry, derive project ownership server-side and reject a save if the active site changed during capture. A digest detects later byte changes; it does not establish legal authority, authenticity of a client screenshot, source currency or planning correctness. Keep source time distinct from capture time.

Capture waits for required layers to finish loading. Save failure must be recoverable; do not show success before both image and record exist. Use an idempotency key for retry and clean orphaned objects if persistence fails. A new capture creates a new record and leaves earlier captures intact. Site/proposal changes prevent stale evidence from silently supporting current outputs.

ArcGIS `MapView.takeScreenshot()` captures canvas geography and excludes overlaid DOM elements such as pop-ups. Preserve selected feature details, legend, scale and required attribution separately or compose a labelled evidence sheet. Reopening must show both the original image and its metadata. Native capture must be implemented with a supported map/view API; do not assume the minimal embeddable WebMap element exposes the full API.

## Planning and security boundaries

Captures are research evidence requiring applicability review. They do not replace source instruments, surveys, registered plans, structured spatial verification or specialist reports. A screenshot must not mark a control `Cited`, clear a pathway gate, certify an LGA or make a SEE submission-ready on its own. Later inclusion in a Planning Controls Pack or SEE must preserve exact project/site/proposal scope, caption, source, capture date and evidence-review state. Conflicts and missing information remain visible.

Treat all page text, pop-ups, OCR and downloaded material as untrusted data. They cannot supply agent instructions or privileged tool authorisation. Enforce project access for create/read/delete, private objects and expiring access links. Imported files use the existing scan/quarantine/review pipeline. Sanitise attributes and popup HTML; cap file size, image dimensions, fetch time and request rates.

Do not defeat CSP, X-Frame-Options, same-origin restrictions, CORS, authentication, CAPTCHAs or provider terms. Any later server fetch/remote viewer needs origin and redirect validation, private-address/metadata-endpoint denial, isolated per-user sessions, egress restrictions, idle expiry, quotas and a kill switch. Remote read-only browsing permits navigation/search but not submissions, payments, uploads, account changes or transfer of Plannera cookies/credentials. Start only after permitted-use review and a separate security/cost acceptance.

## Delivery and acceptance

| Slice | Deliverable | Exit evidence |
| --- | --- | --- |
| RV0 | Validate Byron/Kempsey source descriptors, capability matrix, licence/CORS/embedding constraints and evidence contract | Recorded outcomes for both LGAs; unsupported modes visibly external; implementation plan mapped to current Source/evidence code |
| RV1 | Native map, site focus, toggles, capture, save and reopen | Independent Byron and Kempsey journeys; image plus complete provenance survives refresh; missing layers and save failure are truthful |
| RV2 | Reviewed evidence inclusion in existing Planning Controls Pack/SEE lineage and one DA-tracker adapter | Exact-scope evidence references and captions; mismatched/stale/unreviewed captures cannot satisfy planning gates; one tracker result retained end to end |
| RV3 | Optional controlled remote-browser pilot | Separate threat model, permitted-use decision, isolation/egress tests, quotas, cost measurement and operator acceptance |

RV0 and RV1 are the first Research Viewer work after commercial-gate completion. RV2 follows native capture acceptance. RV3 is later and not a v1 dependency. No fixed delivery date or provider budget is committed by this decision.

Acceptance must cover two separate council projects, wrong-project access, changed site during capture, forged metadata, retry/double-click, stale source, partial/failed layers, CORS/capture denial, unavailable embedding, source fallback and immutable reopen. Verify keyboard use, labels, panel sizing, loading and error states. Use public or synthetic fixtures in the repo; keep real project evidence private. Run relevant focused tests plus repository-required checks and inspect rendered evidence. See [operations](../operations/research-viewer.md) and [first task](../project-memory/research-viewer-first-task.md).

## Technical references checked 27 September 2026

- [Esri embeddable WebMap components](https://developers.arcgis.com/javascript/latest/references/embeddable-components/)
- [Esri MapView and takeScreenshot](https://developers.arcgis.com/javascript/latest/references/core/views/MapView/)
- [MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)
- [MDN canvas and cross-origin images](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [NSW Planning Portal digital EPI mapping](https://www.planningportal.nsw.gov.au/digital-mapping-epi)
- [NSW Government Spatial Viewer description](https://www.crownland.nsw.gov.au/find-services/nsw-planning-portal-spatial-viewer)

These establish platform capabilities and limitations, not compatibility of every council endpoint. RV0 must validate the actual selected sources.
