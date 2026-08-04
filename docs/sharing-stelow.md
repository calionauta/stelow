# Sharing stelow: a step-by-step plan

A plan to publish stelow as a pi package and contribute it to existing community lists. The intent is to make stelow discoverable for people who would find it useful, not to run a campaign.

## Preconditions

- `npm` account with publish rights to `@calionauta/stelow`
- `gh` CLI authenticated
- Local stelow working tree clean, on `main`, in sync with `origin/main`
- `npm test`, `npm run typecheck`, `npm run build` all green
- A `CHANGELOG.md` entry for the new version

## Phase 1: Prepare `package.json`

The current manifest already declares `pi.extensions`. It needs two more things for the pi gallery: the `pi-package` keyword and a `skills` entry.

### 1.1 Add the `pi-package` keyword

```bash
npm pkg set keywords[0]=pi-package
npm pkg set keywords[+]=pi-extension
npm pkg set keywords[+]=pi-skill
```

After this, the first three keywords should read: `pi-package`, `pi-extension`, `pi-skill`. Verify with `npm pkg get keywords`.

### 1.2 Add the skills entry

```bash
npm pkg set 'pi.skills=["skills"]'
```

The full `pi` block should look like:

```json
"pi": {
  "extensions": ["./extensions/stelow/index.ts"],
  "skills": ["skills"]
}
```

### 1.3 Bump version and update changelog

Follow the existing release flow in `AGENTS.md`:

1. `npm version <major.minor.patch> --no-git-tag-version`
2. `npm run version:sync`
3. Add a `CHANGELOG.md` entry describing the publish.
4. `git add -A && git commit -m "chore: release v<version>"`
5. `git tag -a v<version> -m "v<version>"`
6. `git push origin main --tags`
7. `gh release create v<version> --title "v<version>" --notes "<changelog entry>"`

## Phase 2: Publish to npm

```bash
npm login                 # if not already
npm run build             # prepublishOnly runs this + sync
npm run typecheck
npm publish --access public
```

### 2.1 Verify install

In a scratch directory or via `pi -e`:

```bash
pi install npm:@calionauta/stelow
pi list                   # confirm it appears
pi -e npm:@calionauta/stelow   # smoke test in throwaway run
```

Confirm the extension loads and the skills directory is discoverable.

### 2.2 Verify the gallery

The pi.dev package gallery indexes packages with the `pi-package` keyword. It may take a short while to refresh. Check:

- https://pi.dev/packages — search for `stelow`

## Phase 3: Gallery metadata (optional but recommended)

The gallery shows an image or video preview for packages that declare one. A short demo helps.

```json
"pi": {
  "extensions": ["./extensions/stelow/index.ts"],
  "skills": ["skills"],
  "image": "https://raw.githubusercontent.com/calionauta/stelow/main/docs/design/preview.png",
  "video": "https://.../demo.mp4"
}
```

Requirements per pi packages docs:
- `image`: PNG, JPEG, GIF, or WebP
- `video`: MP4 only
- Paths are relative to the package root, but absolute URLs are accepted by the gallery

If neither is available now, leave them off and add later. Not blocking.

## Phase 4: Fill the pi ecosystem gap

No public "awesome-pi-packages" index exists. A small, neutral list maintained by the author can serve both as a directory and as a place to record stelow's own entry.

### 4.1 Check it does not exist

```bash
gh repo view awesome-pi-packages
gh search repos "awesome-pi"
```

If it already exists, skip the creation and submit stelow to that one instead. If a few candidates exist, pick the one that is actively maintained and submit a PR there.

### 4.2 Create it (if it does not exist)

```bash
gh repo create awesome-pi-packages --public \
  --description "A small, curated index of pi packages, extensions, skills, and themes." \
  --license MIT \
  --add-readme
```

### 4.3 Seed entries

A short README with a list grouped by category. Start with what is known and grow it as the community contributes. Suggested initial structure:

```markdown
# awesome-pi-packages

A small, curated index of packages, extensions, skills, and themes for [pi](https://pi.dev).

## Submitting

Open a PR. Keep entries alphabetical within each section. Each entry: name, one-line description, install command, link to repo.

## Extensions

- [stelow](https://github.com/calionauta/stelow) — opinionated product workflow. `pi install npm:@calionauta/stelow`

## Skills

- (to be filled as discovered)

## Themes

- (to be filled as discovered)
```

Add other known packages as they are encountered. Do not pad the list with low-quality entries. The point is accuracy, not size.

## Phase 5: Submit to existing community lists

These are the general lists plus any catalogue that mentions skills, plugins, or extensions (since stelow is published as skills + Pi extension). Submit in the order given, lowest friction first.

### 5.1 Tier 1 — high reach, direct fit

These are the most likely to result in a merged entry:

1. `VoltAgent/awesome-agent-skills` (27.2K stars)
2. `heilcheng/awesome-agent-skills` (5.9K stars)
3. `ai-boost/awesome-harness-engineering` (2.8K stars)
4. `skillmatic-ai/awesome-agent-skills`
5. `philipbankier/awesome-agent-skills`
6. `Ezeafk/awesome-agent-skills`
7. `michielhdoteth/awesome-ai-agent-tools`

### 5.2 Tier 2 — broader harness lists

Larger surface area, lower conversion rate. Submit a smaller batch and observe which conventions each one uses before adapting.

- `AutoJunjie/awesome-agent-harness`
- `zhijiewong/awesome-agent-harnesses`
- `walkinglabs/awesome-harness-engineering`
- `trheyi/awesome-agent-harness`
- `mahonzhan/awesome-agent-harness`
- `Picrew/awesome-agent-harness`
- `James-Bao/awesome-agent-harness`
- `RUCAIBox/awesome-agent-harness`
- `bradAGI/awesome-cli-coding-agents`
- `sorrycc/awesome-code-agents`
- `nielsbosma/awesome-ai-coding-agent-tools`
- `namphuongtran/awesome-ai-coding-agent-tools` (fork; check whether the original accepts first)
- `gmh5225/awesome-skills`
- `open-agent-craft/awesome-agent-skills`
- `seb1n/awesome-ai-agent-skills`
- `luoyuctl/awesome-agentic`
- `hummbl-dev/awesome-ai-agents-1`
- `brandonhimpfen/awesome-ai-coding-agents`
- `EuniAI/awesome-code-agents`
- `RyanAlberts/best-of-Agent-Harnesses`

### 5.3 Tier 3 — comparison pages and research notes

These are not submission targets. They are articles and lab repos that mention stelow alongside other frameworks. If a piece of writing compares agentic workflow tools, a thoughtful comment that points out stelow is on-topic and useful. Do not push for inclusion in articles; only respond if there is a real reason to.

- `rywalker.com/research/agentic-skills-frameworks`
- `thientranhung/agentic-coding-lab`

### 5.4 PR body template

Keep PR bodies short. The maintainer of an awesome list reads many of these. A useful structure:

```markdown
Adding @calionauta/stelow.

- Repo: https://github.com/calionauta/stelow
- npm: @calionauta/stelow
- Install: `pi install npm:@calionauta/stelow`
- Category: Product workflow / planning (Shape-Up)
- Compatibility: pi (works in any host that runs pi, including OpenCode)
- Short description: opinionated product workflow that turns a fuzzy idea into a reviewed spec, a tech plan, and an execution critique.
```

If a `CONTRIBUTING.md` exists, follow it. The categories used by that list, the alphabetical order, and the badge style all matter more than the words in the body.

### 5.5 Submission discipline

- One PR per list. Do not mass-open.
- If a list is dormant (no commits in 12+ months, no merged PRs), skip it.
- If a PR is closed without merge, accept the close. Do not reopen or push back.
- Cross-link only when natural: a single line in a follow-up comment, after a PR is merged, that says "also added to X". Not a campaign pitch.
- Do not submit to lists that explicitly exclude pi tools, general workflow tools, or non-Claude/Codex ecosystems.

## Phase 6: Track and reflect

Keep a small record so the work compounds.

```bash
gh pr list --search stelow --state all --limit 50 --json number,title,state,repository,url
```

Once a month, review:
- How many PRs were merged vs closed
- Which lists converted; which did not
- Whether the description in the merged entries matches the README
- Whether the install command in the merged entries still works

If a list renamed categories or removed stelow, update the rest of the entries to match. Lists drift; this is normal.

## Out of scope

This plan does not cover:
- Posting on social media, forums, or chat
- Writing blog posts or sponsored content
- Asking influencers to mention stelow
- Tracking download numbers or "adoption" metrics

The plan is intentionally narrow. stelow is useful to the people who find it useful. The job is to be findable, not to be loud.
