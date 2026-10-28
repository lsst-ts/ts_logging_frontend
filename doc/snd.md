# Scientific Nightly Digest

The Scientific Nightly Digest (SND) is a public-facing variant of the Nightly
Digest for the scientific community outside Rubin. It is built from this
repository with a build-time flag, and deployed separately from the internal
app:

| Environment | URL |
|---|---|
| Production | https://nightlydigest.lsst.cloud |
| Development | https://nightlydigest-dev.lsst.cloud |

---

## 1. How it differs from the internal app

The SND shows the same nights from the same sources, minus anything that is
internal to Rubin or links somewhere its users cannot reach:

- **No Context Feed.** The page has no route, so its path 404s, and it is left
  out of the navigation and the context menus.
- **Simonyi only.** The telescope selector is hidden, and `telescope=AuxTel` in
  the URL fails validation.
- **Digest page:** no Night Summary applet and no Jira tickets card, and the
  data behind them is not fetched. The Exposure Breakdown groups by image type
  by default, and its science program labels are plain text rather than BLOCK
  links.
- **Data Log:** no RubinTV or Comments columns, and science programs are plain
  text rather than Zephyr/Jira links.
- **Sidebar:** links to the LSST Community Forum for questions.
- It is served from the domain root (`/`) instead of `/nightlydigest/`, as it
  has its own domain rather than sitting underneath another domain alongside
  other tools.

Code that differs checks `isScientificNightlyDigest` from
`src/utils/appConfig.js`. The `snd` project of the mocked end-to-end suite
covers these differences ([testing.md](testing.md#projects)).

---

## 2. Data

The SND has no backend. Instead it reads static JSON files, generated from the
backend by its `scripts/generate_static_files.py` and published at the URL
given by `VITE_BACKEND_URL` at build time.

Each request maps to a file path instead of a query string:

```
<VITE_BACKEND_URL>/<endpoint>[/<instrument>]/<start>_<end>.json
```

- `<instrument>` is only present for endpoints that take one, and is always
  `LSSTCam`.
- `<start>` is the first selected dayobs and `<end>` the day after the last,
  e.g. `exposures/LSSTCam/20260101_20260102.json` for the night of 20260101.
- Any other query parameters the internal app sends are dropped, so each file
  has to contain everything any page needs from that endpoint.

The endpoints it reads are `almanac`, `expected-exposures`, `exposures`,
`exposure-flags`, `obs-status`, `data-log`, `exposure-entries`,
`static-visit-map` and `multi-night-visit-maps`, plus `block-details.json` and
`version.json`, which take no dates.

---

## 3. Deployment

The SND is a static site in a Google Cloud Storage bucket.
`scripts/gc-deploy.py` builds it and replaces the bucket's contents:

```shell
python scripts/gc-deploy.py --bucket <bucket> --backend-url <static data URL>
```

The script:

1. Deletes the local `dist/` directory.
2. Runs `npx vite build` with `VITE_SCIENTIFIC_NIGHTLY_DIGEST=true`.
3. Deletes the existing files in the bucket.
4. Uploads the new build, with `index.html` marked as not cacheable so that
   browsers pick up a new release straight away.

It needs the Google Cloud CLI, authenticated with access to the bucket, and the
`google-cloud-storage` Python package. See
[scripts/README.rst](../scripts/README.rst) for its options.

To run the SND locally, see
[getting started](getting-started.md#running-the-scientific-nightly-digest).
