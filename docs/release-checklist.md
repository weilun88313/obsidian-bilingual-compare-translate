# Release Checklist

Use this checklist before publishing a GitHub release and before submitting the plugin to the Obsidian community catalog.

## Before pushing to GitHub

- Confirm `manifest.json`, `versions.json`, `README.md`, and `LICENSE` exist in the repository root.
- Confirm the manifest author metadata is final and not placeholder text.
- Run:

```bash
npm install
npm run check
```

- Make sure `main.js` is not committed to the repository root. It should be generated only for releases.

## Creating a GitHub release

1. Bump the version in `package.json`.
2. Run:

```bash
npm version <new-version> --no-git-tag-version
npm run version
```

3. Commit the version change.
4. Push the commit.
5. Create and push a tag that exactly matches the version number, without a `v` prefix.

Example:

```bash
git tag 0.1.0
git push origin 0.1.0
```

6. Wait for the `Release` GitHub Actions workflow to publish a release with:
   - `manifest.json`
   - `main.js`
   - `styles.css`

## Before submitting to Obsidian Community Plugins

- The latest GitHub release tag exactly matches the plugin version in `manifest.json`.
- The latest GitHub release includes `manifest.json`, `main.js`, and `styles.css` as release assets.
- The README discloses network use and any external services.
- The repository root includes `README.md` and `LICENSE`.
- `versions.json` maps the plugin version to the correct `minAppVersion`.
- The plugin works in a clean vault with Community plugins enabled.

## Submitting

1. Publish the initial GitHub release.
2. Open a pull request to `obsidianmd/obsidian-releases`.
3. Add your plugin entry following that repository's current format and validation rules.
