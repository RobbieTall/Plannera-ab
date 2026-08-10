# Byron and Kempsey soft-launch gate

The Byron and Kempsey launch smoke is the first commercial preflight.

Run it with:

```bash
npm run smoke:launch
```

GitHub Actions runs the same command for pull requests and pushes to `main`.
The workflow reads `DATABASE_URL` from the protected GitHub Actions secret and
does not print or publish that value.

The gate is green only when both launch LGAs have:

- a `VERIFIED` coverage state;
- a populated LEP instrument;
- populated launch-zone objectives and land-use projections;
- indexed DCP clauses; and
- successful zone-aware DCP retrieval.

The current launch truth zones are Byron `SP3`, `R2`, and `R3), plus
Kempsey `E2` and `SP2`. Missing provenance is reported as an amber warning.
Any red result blocks soft launch.

The workflow writes its text result to the GitHub job summary. It does not
upload a downloadable artifact.
