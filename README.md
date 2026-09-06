# Codex Lists for Nuvio

A static, GitHub Pages-hosted catalog add-on for Nuvio. Lists are ordinary JSON files committed to Git; the build turns them into endpoints compatible with the Stremio add-on protocol used by Nuvio.

## Edit a list

Add or edit a file under `lists/`. Each item must have a stable IMDb ID so Nuvio's installed metadata and stream add-ons can recognize it.

```json
{
  "id": "mind-bending-indie-scifi",
  "name": "Mind-Bending Indie Sci-Fi",
  "description": "A short description.",
  "type": "movie",
  "targetSize": 30,
  "items": [
    {
      "title": "Predestination",
      "year": 2014,
      "imdbId": "tt2397535",
      "imdbRating": 7.4,
      "imdbVotes": 339571
    }
  ]
}
```

Use `type: "series"` for a television catalog. Keep movie and series items in separate source files.

Every title must have an IMDb rating of at least 7.0. To refresh the stored ratings and vote counts from IMDb's daily non-commercial ratings dataset, run:

```sh
npm run ratings
```

The command fails if any title has fallen below the threshold. Replace those titles, refresh the ratings again, and run the test suite before publishing.

## Build and test

Node.js 18 or newer is sufficient and there are no package dependencies.

```sh
npm test
```

The generated static site is written to `dist/`. To preview it locally:

```sh
npm run serve
```

Then open <http://127.0.0.1:4173/>. The manifest is at <http://127.0.0.1:4173/manifest.json>.

## Publish with GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions** as the source.
4. Run the **Deploy GitHub Pages** workflow if the initial push did not start it automatically.

For this repository, the resulting add-on URL is:

```text
https://michaelmu.github.io/nuvio-lists/manifest.json
```

Paste that HTTPS URL into Nuvio's **Install add-on from URL** field. Treat all published lists as public and never commit credentials or sensitive data.

## Generated endpoints

For each list, the build creates:

```text
/catalog/{type}/{list-id}.json
```

The repository currently includes:

```text
/catalog/series/high-stakes-reality-series.json
/catalog/movie/mind-bending-indie-scifi.json
/catalog/movie/obsessions-power-ambition-documentaries.json
```
