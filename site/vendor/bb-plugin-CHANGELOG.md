# Changelog

All notable changes to `bb-plugin-stelow`.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to a single-version-per-release tag format
(`vX.Y.Z`) on the `master` branch.

## [0.78.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.78.0...v0.78.1) (2026-10-07)


### Bug Fixes

* the flow drawer says what it is, and a field grid stops holding a fixed column on a phone ([#348](https://github.com/calionauta/bb-plugin-stelow/issues/348)) ([e93ee87](https://github.com/calionauta/bb-plugin-stelow/commit/e93ee874a9d1623a32f39998ff8cace0db6a4fec))

## [0.78.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.77.0...v0.78.0) (2026-10-07)


### Features

* floating bulk bar, flow detail in a side drawer, and a card that works at 375px ([#346](https://github.com/calionauta/bb-plugin-stelow/issues/346)) ([597528f](https://github.com/calionauta/bb-plugin-stelow/commit/597528ff1cccd970e84474daf014b82c15cd6270))

## [0.77.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.76.0...v0.77.0) (2026-10-06)


### Features

* the bucket card is edited in the card, and the gallery fills its own width ([#344](https://github.com/calionauta/bb-plugin-stelow/issues/344)) ([1682e28](https://github.com/calionauta/bb-plugin-stelow/commit/1682e28c7d46594568603aecb61981fd474695ec))

## [0.76.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.75.0...v0.76.0) (2026-10-06)


### Features

* a failed question-persist records itself on the card and in the inbox ([#341](https://github.com/calionauta/bb-plugin-stelow/issues/341)) ([14d751a](https://github.com/calionauta/bb-plugin-stelow/commit/14d751a47fc95e8885572f63bc5ce227f89a4b43))

## [0.75.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.74.0...v0.75.0) (2026-10-06)


### Features

* the phone board is a second layout, not a narrower first one ([b6226fd](https://github.com/calionauta/bb-plugin-stelow/commit/b6226fd548c24327adcd76933a74dfd64b5bb72c))


### Breaking Changes

* **A card is no longer moved by hand.** Dragging a card between columns and clicking a stage chip to change stage are both gone — the workflow is the agent's to drive, and a person asks it in the conversation instead. The board reads as a status report rather than a manual tool.
* **A card's delete-all moved into its column header.** It used to sit in the flow between the header and the cards, which pushed the Archived column's cards out of line with every other column.

### Bug Fixes

* a disclosure chevron rotates from state, not from a CSS variant that froze ([9adee91](https://github.com/calionauta/bb-plugin-stelow/commit/9adee9112086095ca38e819aa00707ba81d8af97))
* gate the lint, and take the delete-all out of the column's flow ([fc9f931](https://github.com/calionauta/bb-plugin-stelow/commit/fc9f9310aef323df6d07780584de4a0150aa100c))

## [0.74.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.73.1...v0.74.0) (2026-10-06)


### Features

* **A worker's orientation cost is measured and shown on the card.** A skill load is a `toolCall` naming a `SKILL.md`, so reads before the first `bb stelow advance` are orientation spent before work. Violations are reported, never blocked. Measured: one skill read across ten workers.
* **A worker's token figure is shown for nearly every worker, and says what it is.** The plugin read one usage event family; `acp-opencode` — which 8 of 10 workers run on — emits none of it and reports a context-window reading instead. Both families are read now, and an estimate is labelled `(est.)` rather than presented as a measurement. 1 of 10 workers reporting a figure before, 10 of 10 after.
* **A refused retry records why and names an exit.** Five real runs hit the auto-retry's stage guard with the card already advanced and every one parked silently, which is why `auto_retry_count` read 0 across the fleet.


### Performance

* **Two cards share 90.5% of a build prompt's prefix, up from 0.6%.** Provider caching is prefix matching, so the state dir at character ~106 left the whole 10 KB clause block uncacheable. All three build paths now open with the same intro, state the shared clauses in one canonical order, and put per-card values last. Verified on live workers: 99.3%, 99.1% and 89.3% of their first snapshot's input served from cache; fleet-wide 60,386,501 cached against 54,840,152 fresh.
* **The prompt-duplication metric measures authored prose.** The previous figure counted shared clauses rendering into the paths that owe them, so it was largest where the architecture worked.


### Bug Fixes

* **Every prompt resolves its reading list from `bb stelow playbook`.** All six spawn paths told the worker to load the `stelow-workflow-*` glob — seventeen skills, 215,756 bytes of entry documents — while the `CLI_EQUIVALENTS` clause in the same prompt said to run the playbook and never discover skills that way.
* **One ask contract, rendered by every spawn path.** The structured-ask block was pasted into five builders and had already drifted: two lacked the "never write waiting text" guard and the restart path lacked the timeout rule.
* **A provider rate limit and an unowned card no longer advise "Answering below resumes the worker".** False for both — nothing is pending, and the reader was pointed at a box whose answer goes nowhere. A rate limit is matched on the status code, never the word "limit".
* **No RPC result carries a key holding `undefined`.** The board failed outright with `rpc result at $result.redFirst is not a JSON value (undefined)` on any board whose stored defaults predate red-first.
* **The run bundle's token evidence reads both families and states its provenance**, and the history row shows a dash rather than nothing when a provider reports no usage at all.
* **A clause that renders the literal word `undefined` now fails a test**, and the owed-clause list is derived from the clause bag so a new clause is covered at once.

## [0.73.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.73.0...v0.73.1) (2026-10-05)


### Bug Fixes

* board card checkbox no longer overlaps the title ([#334](https://github.com/calionauta/bb-plugin-stelow/issues/334)) ([c0cdfee](https://github.com/calionauta/bb-plugin-stelow/commit/c0cdfeebc99415a2c20fd02ac0ab8d6296a52990))

## [0.73.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.72.1...v0.73.0) (2026-10-05)


### Features

* red-first frozen acceptance gates with upstream sync ([65e388b](https://github.com/calionauta/bb-plugin-stelow/commit/65e388bde6ea1fd3fc1b9d18ea39dd5666fb63d6))
* red-first run knob in creation prefs with server seed wiring ([67f2844](https://github.com/calionauta/bb-plugin-stelow/commit/67f2844c3c87ec156565f7eb867161201409883e))


### Bug Fixes

* preserve explicit red_first across reseed and pin seed writes ([07934f3](https://github.com/calionauta/bb-plugin-stelow/commit/07934f3499edf6e6ff84ecd7ba08e98d6832e8a6))
* red_first round-trips through parse, reseed, and seed ([42ff205](https://github.com/calionauta/bb-plugin-stelow/commit/42ff205e8ea56016fd3ce61d6b9903b1586ef1d4))

## [0.72.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.72.0...v0.72.1) (2026-10-04)


### Bug Fixes

* terminal cards serve no expired questions ([#330](https://github.com/calionauta/bb-plugin-stelow/issues/330)) ([e5b8d10](https://github.com/calionauta/bb-plugin-stelow/commit/e5b8d102f7a22b0f742b7a42be757dffc00d3442))

## [0.72.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.71.0...v0.72.0) (2026-10-04)


### Features

* bucket editable parked cards plus bulk start/archive/delete ([#326](https://github.com/calionauta/bb-plugin-stelow/issues/326)) ([edc12ab](https://github.com/calionauta/bb-plugin-stelow/commit/edc12ab8094105b5f9b3a9f9f59cebe58691786f))
* inbox set-aside filter, verify-blockage notice, and quieter git and question surfaces ([#327](https://github.com/calionauta/bb-plugin-stelow/issues/327)) ([a7c521e](https://github.com/calionauta/bb-plugin-stelow/commit/a7c521edc08965cf0bfa2244d016a4b818b08151))

## [0.71.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.70.1...v0.71.0) (2026-10-04)


### Features

* bucket naming reuse on Start plus editable parked prompt ([#322](https://github.com/calionauta/bb-plugin-stelow/issues/322)) ([6195416](https://github.com/calionauta/bb-plugin-stelow/commit/6195416b1fc4ad7010ee1c54e805f69634ef64f7))
* empty multiple-choice answers complete as none ([#323](https://github.com/calionauta/bb-plugin-stelow/issues/323)) ([54d7255](https://github.com/calionauta/bb-plugin-stelow/commit/54d72557992b3c08373a36f9a7bfd06f98db0366))


### Bug Fixes

* drop the duplicate live-graph button ([#325](https://github.com/calionauta/bb-plugin-stelow/issues/325)) ([b9a82af](https://github.com/calionauta/bb-plugin-stelow/commit/b9a82af59dab874565c0b93759b3bdb6c6e9f20d))

## [0.70.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.70.0...v0.70.1) (2026-10-04)


### Bug Fixes

* strip pattern from engine-bound recipe schemas ([#320](https://github.com/calionauta/bb-plugin-stelow/issues/320)) ([9fac20f](https://github.com/calionauta/bb-plugin-stelow/commit/9fac20ffe50e7de8c1467e5a3d61073404cf7b2d))

## [0.70.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.69.0...v0.70.0) (2026-10-04)


### Features

* self-healing runs and deterministic scope asks ([#318](https://github.com/calionauta/bb-plugin-stelow/issues/318)) ([767a62a](https://github.com/calionauta/bb-plugin-stelow/commit/767a62a5dc88321313b26718b7b2e37a85d60b58))

## [0.69.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.68.0...v0.69.0) (2026-10-04)


### Features

* provider-schema fit enforcement for decision points ([#316](https://github.com/calionauta/bb-plugin-stelow/issues/316)) ([fa61bc1](https://github.com/calionauta/bb-plugin-stelow/commit/fa61bc1d777bf0b984031038dfd9e6d65187ea52))

## [0.68.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.67.0...v0.68.0) (2026-10-04)


### Features

* retry-transient and preset-tier decision points with evidence-gated criteria ([#314](https://github.com/calionauta/bb-plugin-stelow/issues/314)) ([a832f10](https://github.com/calionauta/bb-plugin-stelow/commit/a832f10b665556482c13ce1f8f2483f209f67a2f))

## [0.67.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.66.1...v0.67.0) (2026-10-03)


### Features

* preselected opt-out asks and draft scope preview ([#311](https://github.com/calionauta/bb-plugin-stelow/issues/311)) ([7f16394](https://github.com/calionauta/bb-plugin-stelow/commit/7f163948199e6c3d8592a7408069dd2a09f2bc1c))
* preselected opt-out asks and draft scope preview ([#312](https://github.com/calionauta/bb-plugin-stelow/issues/312)) ([c7a5216](https://github.com/calionauta/bb-plugin-stelow/commit/c7a521604c9f2e77def35f21479a098824ceae08))
* validate interface contrast scope coverage end to end ([#309](https://github.com/calionauta/bb-plugin-stelow/issues/309)) ([72b00c1](https://github.com/calionauta/bb-plugin-stelow/commit/72b00c136ccf0fd7b33178b1553a759667165fca))
* explicit run knobs replace appetite ladder, add architecture choice ([#307](https://github.com/calionauta/bb-plugin-stelow/issues/307)) — board defaults and card creation move from Lean/Core/Complete to quality/supervisor/exploration knobs; Explore gains architecture alternatives/contrast; board projects the architecture stage (shipped untagged in the squash subject, recorded here so the release notes the user-facing change)

## [0.66.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.66.0...v0.66.1) (2026-10-03)


### Bug Fixes

* frame appetite as scope budget in creation copy, name canonical terms ([#304](https://github.com/calionauta/bb-plugin-stelow/issues/304)) ([4b9dde2](https://github.com/calionauta/bb-plugin-stelow/commit/4b9dde2af53dcb8684daa235aa9c45ae1a17da36))

## [0.66.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.65.12...v0.66.0) (2026-10-03)


### Features

* card live-graph action and About capability panel ([#300](https://github.com/calionauta/bb-plugin-stelow/issues/300)) ([c228694](https://github.com/calionauta/bb-plugin-stelow/commit/c2286943d6cdb9f9eeb443e908740125023487fe))

## [0.65.12](https://github.com/calionauta/bb-plugin-stelow/compare/v0.65.11...v0.65.12) (2026-10-03)


### Bug Fixes

* bound the critique-rework loop at three rounds ([6dc52f1](https://github.com/calionauta/bb-plugin-stelow/commit/6dc52f12683fa0b0379fe8a8f14cdd39821e7356))
* evidence, oscillation, expiry, and risk for the gap loop ([a09db1a](https://github.com/calionauta/bb-plugin-stelow/commit/a09db1aaf1c47fc38a94e7185b6f2c5863b6a7f9))

## [0.65.11](https://github.com/calionauta/bb-plugin-stelow/compare/v0.65.10...v0.65.11) (2026-10-03)


### Bug Fixes

* name the reconcile recovery in the log instead of resolving silently ([#294](https://github.com/calionauta/bb-plugin-stelow/issues/294)) ([9b86e82](https://github.com/calionauta/bb-plugin-stelow/commit/9b86e827189d4be64722f449ccc107438bf31473))

## [0.65.10](https://github.com/calionauta/bb-plugin-stelow/compare/v0.65.9...v0.65.10) (2026-10-03)


### Bug Fixes

* a dead database handle ends the pass, never the process ([#290](https://github.com/calionauta/bb-plugin-stelow/issues/290)) ([20df89f](https://github.com/calionauta/bb-plugin-stelow/commit/20df89f204631cade8a20586d2816bbb4a4f112e))
* completion binds to the checkout holding the card's state ([#291](https://github.com/calionauta/bb-plugin-stelow/issues/291)) ([d79f433](https://github.com/calionauta/bb-plugin-stelow/commit/d79f4330d6c5710c062d3481ae2d66c0617008a4))

## [0.65.9](https://github.com/calionauta/bb-plugin-stelow/compare/v0.65.8...v0.65.9) (2026-10-03)


### Bug Fixes

* the audit trail is built where the card's state is ([#288](https://github.com/calionauta/bb-plugin-stelow/issues/288)) ([10409c0](https://github.com/calionauta/bb-plugin-stelow/commit/10409c00f29ef45a77fa87941103729085b8ef24))

## [0.65.8](https://github.com/calionauta/bb-plugin-stelow/compare/v0.65.7...v0.65.8) (2026-10-02)


### Bug Fixes

* the repository identity never joins an absolute common dir ([#286](https://github.com/calionauta/bb-plugin-stelow/issues/286)) ([b695586](https://github.com/calionauta/bb-plugin-stelow/commit/b695586b707c8a1162074378885aa4756f65d299))

## [0.65.7](https://github.com/calionauta/bb-plugin-stelow/compare/v0.65.6...v0.65.7) (2026-10-02)


### Bug Fixes

* the audit gate attests a repository, not a directory ([#283](https://github.com/calionauta/bb-plugin-stelow/issues/283)) ([7c2826c](https://github.com/calionauta/bb-plugin-stelow/commit/7c2826c32288130369e519fd4711df174f53120c))

## [0.65.6](https://github.com/calionauta/bb-plugin-stelow/compare/v0.65.5...v0.65.6) (2026-10-02)


### Bug Fixes

* the doctor and schema refusals name the fix, not just the gap ([#277](https://github.com/calionauta/bb-plugin-stelow/issues/277)) ([1e4dfa2](https://github.com/calionauta/bb-plugin-stelow/commit/1e4dfa25355502369b245301684a46380a00cd7e))

## [0.65.5](https://github.com/calionauta/bb-plugin-stelow/compare/v0.65.4...v0.65.5) (2026-10-02)


### Bug Fixes

* a publication reconcile that cannot ask reports it, instead of swallowing it ([#276](https://github.com/calionauta/bb-plugin-stelow/issues/276)) ([5385fc0](https://github.com/calionauta/bb-plugin-stelow/commit/5385fc04b5d671fc9c2ff4a36ffb8d72beaffa61))
* the audit trail is built where the receipt was verified, not at the project root ([#274](https://github.com/calionauta/bb-plugin-stelow/issues/274)) ([1554397](https://github.com/calionauta/bb-plugin-stelow/commit/155439772f9a363969eb2f7b4d8763cb406943fd))

## [0.65.4](https://github.com/calionauta/bb-plugin-stelow/compare/v0.65.3...v0.65.4) (2026-10-02)


### Bug Fixes

* the decision API defaults to a provider that answers the same way twice ([#271](https://github.com/calionauta/bb-plugin-stelow/issues/271)) ([17bca94](https://github.com/calionauta/bb-plugin-stelow/commit/17bca94db303889ce805a29235477dc8301a0544))

## [0.65.3](https://github.com/calionauta/bb-plugin-stelow/compare/v0.65.2...v0.65.3) (2026-10-02)


### Bug Fixes

* ask the cleanup gate's question in the reconciler, by content as well as by pull request ([#266](https://github.com/calionauta/bb-plugin-stelow/issues/266)) ([2fa0526](https://github.com/calionauta/bb-plugin-stelow/commit/2fa05262b2062d8f31961ed872942aaab72c8c36))
* settle an unrecognised environment kind on the card-override path ([#263](https://github.com/calionauta/bb-plugin-stelow/issues/263)) ([3704cb5](https://github.com/calionauta/bb-plugin-stelow/commit/3704cb5e14b4fa11274590e679885608a167b056))

## [0.65.2](https://github.com/calionauta/bb-plugin-stelow/compare/v0.65.1...v0.65.2) (2026-10-02)


### Bug Fixes

* keep the publication wiring inside the line budget ([#261](https://github.com/calionauta/bb-plugin-stelow/issues/261)) ([b8a8091](https://github.com/calionauta/bb-plugin-stelow/commit/b8a80919d17c1ce670d8ca35f702d9c537df0a9f))

## [0.65.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.65.0...v0.65.1) (2026-10-02)


### Bug Fixes

* restore the test wiring the 0.65.0 release merge dropped ([#258](https://github.com/calionauta/bb-plugin-stelow/issues/258)) ([01c86d4](https://github.com/calionauta/bb-plugin-stelow/commit/01c86d449f4c8ffa3c0add40a94f5dcedd357c42))

## [0.65.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.64.0...v0.65.0) (2026-10-02)


### Features

* a preset's worktree setting is authorable and is the composer's default ([#249](https://github.com/calionauta/bb-plugin-stelow/issues/249)) ([fedce5b](https://github.com/calionauta/bb-plugin-stelow/commit/fedce5b1d69ae591a1b4ef4d8da212138566c9e9))


### Bug Fixes

* let a worker see that a question is already open ([#256](https://github.com/calionauta/bb-plugin-stelow/issues/256)) ([3ad35b6](https://github.com/calionauta/bb-plugin-stelow/commit/3ad35b68c9e86d8d008d7c3f6231bcc236642b96))
* refuse placeholder questions before they reach a human ([#253](https://github.com/calionauta/bb-plugin-stelow/issues/253)) ([b76c7ee](https://github.com/calionauta/bb-plugin-stelow/commit/b76c7ee37a0d413601645b269963d3154fee7d65))
* the card-title burst leaves a cause-naming record (card_e3u00eb4) ([#251](https://github.com/calionauta/bb-plugin-stelow/issues/251)) ([ecbc741](https://github.com/calionauta/bb-plugin-stelow/commit/ecbc74141efb8aadbdb193053b95e96b692dbf08))
* the pending chip says what it recorded, not what it guessed ([#252](https://github.com/calionauta/bb-plugin-stelow/issues/252)) ([c421e62](https://github.com/calionauta/bb-plugin-stelow/commit/c421e625cc1e756f809a0aebce59609a9b1cbd6b))
* three conflict markers reached master through PR [#249](https://github.com/calionauta/bb-plugin-stelow/issues/249) ([#255](https://github.com/calionauta/bb-plugin-stelow/issues/255)) ([1e2348d](https://github.com/calionauta/bb-plugin-stelow/commit/1e2348ded03ef946ea4deac00287e14bb8a33c19))
* wrap an overlong source line that broke the shape gate ([#254](https://github.com/calionauta/bb-plugin-stelow/issues/254)) ([2acdfce](https://github.com/calionauta/bb-plugin-stelow/commit/2acdfcef2edde571b1279531275ead9991bb2091))

## [0.64.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.63.0...v0.64.0) (2026-10-02)


### Features

* rework is a number, and the card can read it ([#247](https://github.com/calionauta/bb-plugin-stelow/issues/247)) ([3c2295c](https://github.com/calionauta/bb-plugin-stelow/commit/3c2295cd2b22696f05b321d9dc565edccb7e8040))

## [0.63.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.62.0...v0.63.0) (2026-10-02)


### Features

* a worktree is only reclaimable once the work is already integrated ([#243](https://github.com/calionauta/bb-plugin-stelow/issues/243)) ([110cfb2](https://github.com/calionauta/bb-plugin-stelow/commit/110cfb29ea511e9fd0c36e8d047bf13b97264012))

## [0.62.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.61.2...v0.62.0) (2026-10-02)


### Features

* a finished card says whether it still owes the repository something ([#239](https://github.com/calionauta/bb-plugin-stelow/issues/239)) ([afbe4e1](https://github.com/calionauta/bb-plugin-stelow/commit/afbe4e13977f2baa3bf189b3c3424ccf1debd4f4))
* the human loop, from waiting to looking ([#244](https://github.com/calionauta/bb-plugin-stelow/issues/244)) ([d1c94d6](https://github.com/calionauta/bb-plugin-stelow/commit/d1c94d670ee5e01bb6b43de822875683916dc7e3))


### Bug Fixes

* remember last project in New issue and contain mobile modal overflow ([#237](https://github.com/calionauta/bb-plugin-stelow/issues/237)) ([bd553bb](https://github.com/calionauta/bb-plugin-stelow/commit/bd553bba7dbf72caf1cea07edeae709afd504384))

## [0.61.2](https://github.com/calionauta/bb-plugin-stelow/compare/v0.61.1...v0.61.2) (2026-10-01)


### Bug Fixes

* an install that ran v0.61.0 can upgrade again ([#234](https://github.com/calionauta/bb-plugin-stelow/issues/234)) ([18c04d1](https://github.com/calionauta/bb-plugin-stelow/commit/18c04d1e738bac250deff224760d1790bd7f6606))

## [0.61.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.61.0...v0.61.1) (2026-10-01)


### Bug Fixes

* v0.61.0 refused to start on every install, and the refusal named a corrupt database ([#231](https://github.com/calionauta/bb-plugin-stelow/issues/231)) ([e51d4bc](https://github.com/calionauta/bb-plugin-stelow/commit/e51d4bc65e02ea90ed7c3a2f8cff31dbd6cdc8bb))

## [0.61.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.60.6...v0.61.0) (2026-10-01)


### ⚠ BREAKING CHANGES

* an install whose `presets` table predates this schema no longer starts. The plugin now throws `PresetSchemaError` at boot, naming the missing constraint or the column order it found and the command that unblocks it (`ALTER TABLE presets RENAME TO presets_legacy`, which keeps the rows for re-import). This affects installs carrying a `presets` table without the `reasoning_level` CHECK, or with a legacy column order gained by `ALTER TABLE ADD COLUMN`. The operator must run that rename once; the plugin then creates the current table and re-seeds the default preset. Cards, workspaces, inbox events and run files are untouched.

### Features

* a New-worktree preset gets a worktree, and a wrong-shaped presets table is refused instead of migrated ([#227](https://github.com/calionauta/bb-plugin-stelow/issues/227)) ([889044e](https://github.com/calionauta/bb-plugin-stelow/commit/889044ef4f51af919b957b819562f8e44112fa64))

## [0.60.6](https://github.com/calionauta/bb-plugin-stelow/compare/v0.60.5...v0.60.6) (2026-10-01)


### Bug Fixes

* a card whose reads the host will not answer had a log line and no channel to its owner ([#225](https://github.com/calionauta/bb-plugin-stelow/issues/225)) ([e63fbb9](https://github.com/calionauta/bb-plugin-stelow/commit/e63fbb97fa39a1c9981ef0a0629c738df6e9bdd5))
* the reasoning level was validated against the wrong set ([#223](https://github.com/calionauta/bb-plugin-stelow/issues/223)) ([de311d7](https://github.com/calionauta/bb-plugin-stelow/commit/de311d7f96ed14fc5cd4e8331ad57b30d04d6aa5))
* the refusal named a door, and the test proved the words opened ([#224](https://github.com/calionauta/bb-plugin-stelow/issues/224)) ([0e94132](https://github.com/calionauta/bb-plugin-stelow/commit/0e94132fdfc23f75b7c6c4e495f762d4b3f9a939))

## [0.60.5](https://github.com/calionauta/bb-plugin-stelow/compare/v0.60.4...v0.60.5) (2026-10-01)


### Bug Fixes

* the adversarial pass survived the suite, so the suite was the bug ([#221](https://github.com/calionauta/bb-plugin-stelow/issues/221)) ([0086d31](https://github.com/calionauta/bb-plugin-stelow/commit/0086d319b2797e867a9b2069855c9daf1ba80f87))

## [0.60.4](https://github.com/calionauta/bb-plugin-stelow/compare/v0.60.3...v0.60.4) (2026-10-01)


### Bug Fixes

* the RPC boundary accepted every status, and a card's status was read through a scope's ([#218](https://github.com/calionauta/bb-plugin-stelow/issues/218)) ([0e9a70e](https://github.com/calionauta/bb-plugin-stelow/commit/0e9a70e8686162fb234cb2040424be797e67914b))

## [0.60.3](https://github.com/calionauta/bb-plugin-stelow/compare/v0.60.2...v0.60.3) (2026-10-01)


### Bug Fixes

* a card's status gets an owner, and the review found a value it was missing ([#215](https://github.com/calionauta/bb-plugin-stelow/issues/215)) ([f6f2c72](https://github.com/calionauta/bb-plugin-stelow/commit/f6f2c722f2b96c4abdd77fe6aadfbcd3d69f26a9))

## [0.60.2](https://github.com/calionauta/bb-plugin-stelow/compare/v0.60.1...v0.60.2) (2026-10-01)


### Bug Fixes

* a preset's reasoning level is validated, stored, and pinned to both spawns ([#211](https://github.com/calionauta/bb-plugin-stelow/issues/211)) ([42da623](https://github.com/calionauta/bb-plugin-stelow/commit/42da62301ccd67be72af539ccfb5611cfa31edab))

## [0.60.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.60.0...v0.60.1) (2026-10-01)


### Bug Fixes

* a stage is named by its label on every surface, or not at all ([#209](https://github.com/calionauta/bb-plugin-stelow/issues/209)) ([b85364d](https://github.com/calionauta/bb-plugin-stelow/commit/b85364dd3acbc659046982f63e328c145cc28b5d))
* stage names are written for a product team, and have exactly one owner ([#212](https://github.com/calionauta/bb-plugin-stelow/issues/212)) ([db82d27](https://github.com/calionauta/bb-plugin-stelow/commit/db82d276605027cf8c6351420d2196e27a36af47))

## [0.60.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.59.0...v0.60.0) (2026-10-01)


### Features

* a card mid-workflow is running, the scope map stops contradicting the tracker, and a failed run holds its stage ([#203](https://github.com/calionauta/bb-plugin-stelow/issues/203)) ([302a759](https://github.com/calionauta/bb-plugin-stelow/commit/302a7590f5816ec30be3ed94882f329e03021db0))


### Bug Fixes

* a dead import that claimed a live rule was still wired ([#208](https://github.com/calionauta/bb-plugin-stelow/issues/208)) ([12e4fc0](https://github.com/calionauta/bb-plugin-stelow/commit/12e4fc0a024efd96971095a5e5c0aa78dca6ec34))

## [0.59.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.58.2...v0.59.0) (2026-09-30)


### Features

* a card the host is holding is held, not paused ([#205](https://github.com/calionauta/bb-plugin-stelow/issues/205)) ([1c0df62](https://github.com/calionauta/bb-plugin-stelow/commit/1c0df628e26b49c46bdba2fe75572b943f27bf97))

## [0.58.2](https://github.com/calionauta/bb-plugin-stelow/compare/v0.58.1...v0.58.2) (2026-09-30)


### Bug Fixes

* a skipped rework scope is resolved everywhere, including the count on the card ([#202](https://github.com/calionauta/bb-plugin-stelow/issues/202)) ([a22f16b](https://github.com/calionauta/bb-plugin-stelow/commit/a22f16b955af90ff89d4fd45443d62a2bf862aac))
* the shared checkout, a refused done and the review chip each say what was measured ([#201](https://github.com/calionauta/bb-plugin-stelow/issues/201)) ([f2daa0c](https://github.com/calionauta/bb-plugin-stelow/commit/f2daa0c5c82b0a3d60b733b5c631efff955615d0))

## [0.58.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.58.0...v0.58.1) (2026-09-30)


### Bug Fixes

* an audit card that parks no longer says resume when there is nothing left to resume ([#197](https://github.com/calionauta/bb-plugin-stelow/issues/197)) ([f6dc5a7](https://github.com/calionauta/bb-plugin-stelow/commit/f6dc5a7e3c66bf1d1a049ecfc15ece4edd4b31d8))

## [0.58.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.57.11...v0.58.0) (2026-09-30)


### Features

* name the agents a claim ledger cannot see ([#194](https://github.com/calionauta/bb-plugin-stelow/issues/194)) ([619fec2](https://github.com/calionauta/bb-plugin-stelow/commit/619fec22d773cb8e68607bf4354b151dde06a300))

## [0.57.11](https://github.com/calionauta/bb-plugin-stelow/compare/v0.57.10...v0.57.11) (2026-09-30)


### Bug Fixes

* read and handled are different facts, so an item needs both actions ([#192](https://github.com/calionauta/bb-plugin-stelow/issues/192)) ([6b4e441](https://github.com/calionauta/bb-plugin-stelow/commit/6b4e441abfffa4b7beac3c711e22b9adc1a90b8e))

## [0.57.10](https://github.com/calionauta/bb-plugin-stelow/compare/v0.57.9...v0.57.10) (2026-09-30)


### Bug Fixes

* an undeclared scope refuses the batch, and the card shows who shares its files ([#190](https://github.com/calionauta/bb-plugin-stelow/issues/190)) ([efa6755](https://github.com/calionauta/bb-plugin-stelow/commit/efa6755409bb7f8094c67a7f5da3cd88b275831f))

## [0.57.9](https://github.com/calionauta/bb-plugin-stelow/compare/v0.57.8...v0.57.9) (2026-09-29)


### Bug Fixes

* one failure per card, and a notification in a notification's words ([#187](https://github.com/calionauta/bb-plugin-stelow/issues/187)) ([7b156b8](https://github.com/calionauta/bb-plugin-stelow/commit/7b156b827368accfb33d3d8957c8a3bfecb9096a))

## [0.57.8](https://github.com/calionauta/bb-plugin-stelow/compare/v0.57.7...v0.57.8) (2026-09-29)


### Bug Fixes

* five places the card told the reader something the code did not do ([#184](https://github.com/calionauta/bb-plugin-stelow/issues/184)) ([4dcdbe9](https://github.com/calionauta/bb-plugin-stelow/commit/4dcdbe9ffeef9e564872c7fc3946d6c35cabdfd9))

  - **A room called a sibling scope's file this scope's own.** A file belonging to
    another scope was attributed to the scope being viewed, so the room count and
    the file list disagreed with each other.
  - **A restored question was reopened and superseded a second later.** Restoring
    from the archive re-activated the pending question with its own resolution, and
    the next pass overwrote it — the reason it was restored was lost.
  - **A lock was visible in the Inbox and invisible on the card.** The Inbox
    surfaced an active lock that the card's own workflow progress never showed.
  - **A track tab counted cards its own board does not show.** The tab number
    included cards the board filtered out, so the count and the list disagreed.
  - **The gap tally counted findings the card could not list.** A gap that could
    not be attached to a scope was counted in the total and then absent from the
    list beneath it.

## [0.57.7](https://github.com/calionauta/bb-plugin-stelow/compare/v0.57.6...v0.57.7) (2026-09-29)


### Bug Fixes

* a worker that failed twice showed the reader the same card twice ([8fb4b8f](https://github.com/calionauta/bb-plugin-stelow/commit/8fb4b8f116b7d0554a16cbaceb3f0f90299da465))

## [0.57.6](https://github.com/calionauta/bb-plugin-stelow/compare/v0.57.5...v0.57.6) (2026-09-29)


### Bug Fixes

* a drag could skip every phase between the card and the target ([75b106f](https://github.com/calionauta/bb-plugin-stelow/commit/75b106f7058a0c5c242fc2b3c16bef4c3017257f))
* declare the card position the move policy now takes ([b95017a](https://github.com/calionauta/bb-plugin-stelow/commit/b95017a1fce22d7da5370bc80f7f2dcaf6c4d86d))
* the design-reference doc points at a panel that does not exist ([fdb524c](https://github.com/calionauta/bb-plugin-stelow/commit/fdb524cb48bec1516663bebb43a8991fe76aada4))

## [0.57.5](https://github.com/calionauta/bb-plugin-stelow/compare/v0.57.4...v0.57.5) (2026-09-28)


### Bug Fixes

* no declaration without a module ([#176](https://github.com/calionauta/bb-plugin-stelow/issues/176)) ([88b1929](https://github.com/calionauta/bb-plugin-stelow/commit/88b1929f90820faf2715d86480ffc73c38e7c4d6))

## [0.57.4](https://github.com/calionauta/bb-plugin-stelow/compare/v0.57.3...v0.57.4) (2026-09-28)


### Bug Fixes

* **A card with no scopes is only a fault when a spec said there should be some.**
  A card told its reader that planning "likely used headings instead of machine
  blocks" — on a card with no tech spec, which was an investigation that reached
  audit without ever planning (`planning: pending` in its own `state.md`). The
  panel rendered two scope-sync notices side by side and they disagreed: one read
  the server's classification (`no-spec`) and stayed silent, the other inferred
  the same fact from the current stage alone and invented a fault. Emptiness is
  not evidence. The classification is now the decision, made once in
  `lib/scope-sync-notice.mjs`; the stage-derived rule is deleted rather than
  amended, because it had no behavioural test — only a source pin asserting it
  was still used, which is how a wrong rule gets pinned in place.
  ([#172](https://github.com/calionauta/bb-plugin-stelow/pull/172))

* **A dispatched run is not a finished run.** Every run in the live database was
  reported finished before it finished: not one carried a terminal
  `native_status` — 31 sat at succeeded/running, 8 at failed/running, 5 at
  failed/queued. The host's `succeeded` at launch means the dispatch was
  *accepted*, so the run is `running`; the launch code said that and then
  overwrote it with a terminal state ten lines later. Terminal states accept no
  further transitions and the reconciler answers a terminal run without a host
  round trip, so the adapter was never asked what was actually happening. The
  host alone decides when a run finishes now, and the native column is written
  with it, so the two cannot disagree again.
  ([#174](https://github.com/calionauta/bb-plugin-stelow/pull/174))

* **The audit notice says "reached the audit stage", so it is gated on the
  stage.** A card announced the same arrival twice, minutes apart, because the
  notice was gated on `activity` — which a native run flips — rather than on the
  stage moving. Its neighbour, the pause event, was already deduplicating on the
  honest signal, and that asymmetry is what made the comment look accidental.
  ([#175](https://github.com/calionauta/bb-plugin-stelow/pull/175))

## [0.57.3](https://github.com/calionauta/bb-plugin-stelow/compare/v0.57.2...v0.57.3) (2026-09-28)


### Bug Fixes

* **A machine receipt is not a file the card produced.** Stelow's own
  `audit-trail.md` and `recon-receipt.json` are audit value, not deliverables,
  and `lib/artifact-roles.mjs` has said so from the start: they must not inflate
  the file count or sit unlabeled beside the specs. The server applied that rule
  and the card-detail contract carried the resulting `role` on every artifact —
  and the view discarded it.

  Explore passed every artifact through, so a card with two deliverables and one
  receipt said "3 files". Build re-implemented the same filter inline, twice in
  one file, and wrapped the result in a hand-drawn section rather than the
  disclosure family the rest of the card uses. Each section derived its own count
  from whatever it was handed, so the list and the number could disagree with
  nothing noticing.

  The rule now lives in `lib/artifact-roles.mjs` alone, the shared inventory
  applies it once for every track, and the count each section states is read from
  that same predicate. Receipts render in a named **Machine receipts**
  disclosure, closed by default: a receipt is reference material, not a decision
  awaiting the reader, so it is neither live nor blocking and never earns
  open-on-load. One row renders receipts and everything else, so a file cannot
  look like two different things depending on where it landed.
  ([#168](https://github.com/calionauta/bb-plugin-stelow/pull/168))

## [0.57.2](https://github.com/calionauta/bb-plugin-stelow/compare/v0.57.1...v0.57.2) (2026-09-28)


### Bug Fixes

* the release guard must not race the release it is guarding ([#163](https://github.com/calionauta/bb-plugin-stelow/issues/163)) ([23a7cf1](https://github.com/calionauta/bb-plugin-stelow/commit/23a7cf19dcd87ace4af34f0548766b71e6ced0aa))

## [0.57.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.57.0...v0.57.1) (2026-09-28)


### Bug Fixes

* **A merged release bump that never shipped now fails the build.** v0.57.0
  reached `master` with no tag, so installs could not move to it, and nothing
  went red: release-please does not fail when it loses track of its own release
  pull request — it reports no baseline, diffs from the start of history, and
  opens a new release pull request re-listing months of already-shipped features
  as new work.

  The release job now runs `scripts/check-release-published.mjs` right after the
  release action, so it judges what the action just did. A version on `master`
  with neither a tag nor an open release PR for it exits non-zero and names the
  stranded version. Every ordinary push is unaffected: `master` still sits at
  the published version, because the bump only lands with the release PR.
  ([#161](https://github.com/calionauta/bb-plugin-stelow/pull/161))

## [0.57.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.56.4...v0.57.0) (2026-09-28)

### Features

* **Optional UI design reference MCP, with per-CLI detection.** A worker can now
  study real shipped sites before writing an interface instead of reconstructing
  a layout from memory — the archetype library is interaction philosophy and
  carries no visual reference, which is where generic-looking UI comes from.

  Detection is honest about the thing that actually breaks: registration is per
  agent CLI, and a vendor installer writes only the configs that exist when it
  runs. A CLI installed afterwards is permanently unregistered, and that is
  invisible from inside a worker turn. The About panel and the Build/Explore
  onboarding re-read on every open and name the exact CLIs bb can run that lack
  it.

  The client list maps to bb's own provider registry rather than a hardcoded set,
  so `acp-opencode` and `acp-cursor` resolve to their CLIs, an installed CLI bb
  does not offer is not reported as a gap, and a bb provider with no known
  config path surfaces as a declared blind spot. Registration is explicit-click
  only, matching the doctrine already stated for the sibling host dependency: a
  plugin install changes the host, not this card. "Registered" claims config
  presence only, never a working handshake, and the verdict is always re-read
  from disk rather than taken from an exit code.

  Also fixes a real defect in the decision router: the settings slider read
  "Act at confidence >=" for every point, which is backwards for auto-continue.
  `routeAt` floors the confidence that a turn *did* progress, so raising it
  makes the veto fire more and the worker spend fewer turns — an operator
  setting 0.9 to be strict would have got the opposite. Each point now carries
  its own `thresholdLabel` in the registry, beside the point it describes.
  Display only; no stored value or behavior changed.

### Bug Fixes

* **A boundary question renders as the moment it records.** An Interface Contrast
  boundary carries a `kind` — `reaction` or `confirmation` — and the host read
  neither, so both rendered identically. A card could ask "what was your first
  reaction?" while listing the options the agent had already generated: the
  exact inversion the method exists to prevent, because it replaces the recorded
  first reaction with the agent's framing.

  Reaction boundaries now withhold their options and *name* the withholding, so
  nobody wonders where a list went; confirmation boundaries keep theirs. The
  kind is read from the `[Stelow boundary <id>]` marker the run already requires,
  and the framing is decided once in `lib/` and sent whole, the convention
  `splitAction` already follows.

* **A receipt naming a human decision reported no stale artifacts.** The list was
  read off a field that `additionalProperties: false` makes no receipt able to
  carry, so it was always empty. It now derives from the route table that owns
  it, and a receipt smuggling its own list cannot narrow it.

* **The runtime validator now covers every field the published schema declares.**
  `nextAction` was the consequential one: a receipt with no next move passed.

* **A running run says where its live progress streams; a paused or finished one
  points nowhere**, rather than at a chat token no card can render.

* **A design-reference status read from the ambient `PATH`.** The register-then-
  report case installed a `claude` stub into a temp bin dir and expected the
  verdict to see it, which only happened on a machine that already had that CLI
  on `PATH`. Green locally, red in CI. The handlers now take the environment
  they answer from.

### Chores

* **Sync stelow 0.71.6-alpha** ([calionauta/stelow#27](https://github.com/calionauta/stelow/pull/27)),
  which carries the design-reference skill. The four `skills/` files this release
  introduced now exist upstream, so the next sync can no longer delete them.
  Going up changed two things deliberately: the reference names the host's
  dependency panel rather than one host's About panel and the CLIs the host can
  run rather than one host's list, and its cross-skill link uses the
  `../../../<skill>/references/...` form that resolves in the repo layout, the
  flat hub layout, and the vendored tree alike.
* **Pins and debt ledger left behind by a rebase.** The preset-onboarding pin
  looked for a literal helper call where the code now invokes it through a local
  name; the behaviour never changed, and the replacement is a stronger pin
  (binding *and* call site with exact arguments).

### Documentation

* **A squash-merged PR is typed by its title, not its commits.** The five commits
  of #157 collapsed into one whose subject is the PR title, and the subject is
  the only line release-please reads for the change type. This release is
  0.57.0 rather than the 0.56.5 first computed, corrected through the workflow's
  `release-as` input, and the rule is now written down so it cannot recur.

  ([#159](https://github.com/calionauta/bb-plugin-stelow/pull/159))

## [0.56.4](https://github.com/calionauta/bb-plugin-stelow/compare/v0.56.3...v0.56.4) (2026-09-28)


### Bug Fixes

* a failure reaches the card as the reason, and a blocker as a link ([52c86b5](https://github.com/calionauta/bb-plugin-stelow/commit/52c86b54379d63d1b76dec8cfadd2d1749e1b26b))

## [0.56.3](https://github.com/calionauta/bb-plugin-stelow/compare/v0.56.2...v0.56.3) (2026-09-28)


### Bug Fixes

* name the vocabulary, because reuse that cannot be counted is not reuse ([5b2c877](https://github.com/calionauta/bb-plugin-stelow/commit/5b2c877933157de09915c06a1d96d5f26b85acfd))

## [0.56.2](https://github.com/calionauta/bb-plugin-stelow/compare/v0.56.1...v0.56.2) (2026-09-28)


### Bug Fixes

* one surface for every section, and history stops getting the first screen ([1614f2a](https://github.com/calionauta/bb-plugin-stelow/commit/1614f2a72a71b441a95a9793d21078a7671c6948))

## [0.56.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.56.0...v0.56.1) (2026-09-28)


### Bug Fixes

* the summary strip I added last commit was the card restating itself ([32156ee](https://github.com/calionauta/bb-plugin-stelow/commit/32156ee168b7d6de19a54b030f1e771f8fa2271a))

## [0.56.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.55.1...v0.56.0) (2026-09-28)


### Features

* add the host door that approves a scope map ([cfac273](https://github.com/calionauta/bb-plugin-stelow/commit/cfac273d2ed0fad7cf75ff1d47b787f651606f6f))
* add the host door that approves a scope map ([bba649e](https://github.com/calionauta/bb-plugin-stelow/commit/bba649e9f76589a3c2a2303e4826bcc7e7e87faf))
* add the host door that approves a scope map ([#151](https://github.com/calionauta/bb-plugin-stelow/issues/151)) ([cfac273](https://github.com/calionauta/bb-plugin-stelow/commit/cfac273d2ed0fad7cf75ff1d47b787f651606f6f))


### Bug Fixes

* an archived card stops asking for a review it can never get ([c1da80f](https://github.com/calionauta/bb-plugin-stelow/commit/c1da80fed7fc455ff96a4a76a44551db702a9834))

## [0.55.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.55.0...v0.55.1) (2026-09-27)


### Bug Fixes

* clear the stale reason when a pending question reopens ([3ff9c9f](https://github.com/calionauta/bb-plugin-stelow/commit/3ff9c9f4b8f4a7e0407633c7ef15849de4795fa5))
* clear the stale reason when a pending question reopens ([d4936f1](https://github.com/calionauta/bb-plugin-stelow/commit/d4936f10e8c9dee63a91bce4183b29f1c3c7df7c))

## [0.55.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.54.4...v0.55.0) (2026-09-27)


### Features

* enforce tool-backed verification evidence in card diff ([a987989](https://github.com/calionauta/bb-plugin-stelow/commit/a987989833767c5a06f3d4eb7ef8e825ff03f4a2))
* restore archived cards through a confirmed separate action ([04faa63](https://github.com/calionauta/bb-plugin-stelow/commit/04faa630f9d7915adf7b2153754ae3b8561a4af1))


### Bug Fixes

* pin host tool installers to latest verified versions ([f11699b](https://github.com/calionauta/bb-plugin-stelow/commit/f11699b590e9541a00e000d12f4cb0f0a3b6a288))

## [0.54.4](https://github.com/calionauta/bb-plugin-stelow/compare/v0.54.3...v0.54.4) (2026-09-27)


### Bug Fixes

* the three card creators must admit the call their handler answers ([#144](https://github.com/calionauta/bb-plugin-stelow/issues/144)) ([68e6990](https://github.com/calionauta/bb-plugin-stelow/commit/68e6990ecec13d21a790a69a3f614c860bc994a3))

## [0.54.3](https://github.com/calionauta/bb-plugin-stelow/compare/v0.54.2...v0.54.3) (2026-09-27)


### Bug Fixes

* Open on an execution run has to be observable ([#142](https://github.com/calionauta/bb-plugin-stelow/issues/142)) ([186e744](https://github.com/calionauta/bb-plugin-stelow/commit/186e7447d2dc0fd5863defe30cb6a3bc6d2ad067))

## [0.54.2](https://github.com/calionauta/bb-plugin-stelow/compare/v0.54.1...v0.54.2) (2026-09-27)


### Bug Fixes

* batch the archived bulk delete, and keep the dialog open while it runs ([#139](https://github.com/calionauta/bb-plugin-stelow/issues/139)) ([0937d44](https://github.com/calionauta/bb-plugin-stelow/commit/0937d44ebf8d1e8db8db36b2352ff9727eaacd9b))

## [0.54.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.54.0...v0.54.1) (2026-09-27)


### Bug Fixes

* a drop that changes nothing must change nothing ([#137](https://github.com/calionauta/bb-plugin-stelow/issues/137)) ([491e0fb](https://github.com/calionauta/bb-plugin-stelow/commit/491e0fb8e2979ea061f8b592113a1fc05167c5de))

## [0.54.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.53.5...v0.54.0) (2026-09-27)


### Features

* delete all archived cards, scoped to the filter, behind a confirm ([#135](https://github.com/calionauta/bb-plugin-stelow/issues/135)) ([289d064](https://github.com/calionauta/bb-plugin-stelow/commit/289d064c2f7c8194cdaf733541927ed52d91ca28))

## [0.53.5](https://github.com/calionauta/bb-plugin-stelow/compare/v0.53.4...v0.53.5) (2026-09-27)


### Bug Fixes

* the listCards contract must admit the call its handler supports ([#133](https://github.com/calionauta/bb-plugin-stelow/issues/133)) ([b0d24d4](https://github.com/calionauta/bb-plugin-stelow/commit/b0d24d4e4546cff4692d12324480f24137a97bb1))

## [0.53.4](https://github.com/calionauta/bb-plugin-stelow/compare/v0.53.3...v0.53.4) (2026-09-27)


### Bug Fixes

* one stuck card is one open paused event, escalated in place ([#131](https://github.com/calionauta/bb-plugin-stelow/issues/131)) ([e2e44d7](https://github.com/calionauta/bb-plugin-stelow/commit/e2e44d7dcc77c9e9179b4883f1be0b92d86e5d64))

## [0.53.3](https://github.com/calionauta/bb-plugin-stelow/compare/v0.53.2...v0.53.3) (2026-09-26)


### Bug Fixes

* a declared research substep is gated whether or not it was registered ([#129](https://github.com/calionauta/bb-plugin-stelow/issues/129)) ([cbd3d93](https://github.com/calionauta/bb-plugin-stelow/commit/cbd3d93111f5a89280b1b712c8d8b711cbf9d191))

## [0.53.2](https://github.com/calionauta/bb-plugin-stelow/compare/v0.53.1...v0.53.2) (2026-09-26)


### Bug Fixes

* the contrast contract must not depend on one spelling of "option" ([#126](https://github.com/calionauta/bb-plugin-stelow/issues/126)) ([cc453bf](https://github.com/calionauta/bb-plugin-stelow/commit/cc453bfd9a2403206103a60c7cfd903cce5a707a))

## [0.53.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.53.0...v0.53.1) (2026-09-26)


### Bug Fixes

* an option's letter never routes it to a different option's section ([#124](https://github.com/calionauta/bb-plugin-stelow/issues/124)) ([5ff5d66](https://github.com/calionauta/bb-plugin-stelow/commit/5ff5d66521dbb83b281200befbbd5274eea9cd23))

## [0.53.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.52.1...v0.53.0) (2026-09-26)


### Features

* Interface Contrast as a standalone Explore technique ([#122](https://github.com/calionauta/bb-plugin-stelow/issues/122)) ([0a1eacb](https://github.com/calionauta/bb-plugin-stelow/commit/0a1eacb15bff4d27f4e3c2288082e258661642d4))

## [0.52.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.52.0...v0.52.1) (2026-09-26)


### Bug Fixes

* the Explore quality seal honours the artifact the worker is told to write ([#120](https://github.com/calionauta/bb-plugin-stelow/issues/120)) ([36d9056](https://github.com/calionauta/bb-plugin-stelow/commit/36d9056e3fcfc4cc10dcd95ed1339c149a57a72f))

## [0.52.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.51.8...v0.52.0) (2026-09-26)


### Bug Fixes

* the card reads the state dir it lists on the board ([#117](https://github.com/calionauta/bb-plugin-stelow/issues/117)) ([53f709b](https://github.com/calionauta/bb-plugin-stelow/commit/53f709bb51ed51a0120f0cb9e8967485e1274088))

## [0.51.8](https://github.com/calionauta/bb-plugin-stelow/compare/v0.51.7...v0.51.8) (2026-09-26)


### Bug Fixes

* scroll the option into view instead of quoting it above the document ([#113](https://github.com/calionauta/bb-plugin-stelow/issues/113)) ([435958d](https://github.com/calionauta/bb-plugin-stelow/commit/435958d2f1ec8ab040ea49626a623e4436dd5db2))

## [0.51.7](https://github.com/calionauta/bb-plugin-stelow/compare/v0.51.6...v0.51.7) (2026-09-26)


### Bug Fixes

* an option opens at its own section, not the document's first line ([#110](https://github.com/calionauta/bb-plugin-stelow/issues/110)) ([5de8036](https://github.com/calionauta/bb-plugin-stelow/commit/5de8036d5b810495a9b032b2e22bd8deb0dff467))

## [0.51.6](https://github.com/calionauta/bb-plugin-stelow/compare/v0.51.5...v0.51.6) (2026-09-26)


### Bug Fixes

* mark a document the option never attached, on both paths ([#108](https://github.com/calionauta/bb-plugin-stelow/issues/108)) ([1d700ee](https://github.com/calionauta/bb-plugin-stelow/commit/1d700ee43442fae3c63f33e62e6677ed183aee96))

## [0.51.5](https://github.com/calionauta/bb-plugin-stelow/compare/v0.51.4...v0.51.5) (2026-09-26)


### Bug Fixes

* the question surface stops hiding the decision ([#106](https://github.com/calionauta/bb-plugin-stelow/issues/106)) ([67f77ab](https://github.com/calionauta/bb-plugin-stelow/commit/67f77ab794057e2339cc94da604bf48ab9b23f4e))

## [0.51.4](https://github.com/calionauta/bb-plugin-stelow/compare/v0.51.3...v0.51.4) (2026-09-26)


### Bug Fixes

* an option's control names the document it opens ([#104](https://github.com/calionauta/bb-plugin-stelow/issues/104)) ([e25a9e1](https://github.com/calionauta/bb-plugin-stelow/commit/e25a9e17cf74f1d80ed903fa451b07d11014577d))

## [0.51.3](https://github.com/calionauta/bb-plugin-stelow/compare/v0.51.2...v0.51.3) (2026-09-26)


### Bug Fixes

* a native run that did nothing is not a successful run ([#102](https://github.com/calionauta/bb-plugin-stelow/issues/102)) ([7e843ed](https://github.com/calionauta/bb-plugin-stelow/commit/7e843ed5241ec4cc63e6ace025c5153fd9b51ef8))

## [0.51.2](https://github.com/calionauta/bb-plugin-stelow/compare/v0.51.1...v0.51.2) (2026-09-26)


### Bug Fixes

* a run that asks a question is not a failed run ([#100](https://github.com/calionauta/bb-plugin-stelow/issues/100)) ([ba0f58d](https://github.com/calionauta/bb-plugin-stelow/commit/ba0f58d5028914b439361f49f96847cb9f7b1e5f))

## [0.51.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.51.0...v0.51.1) (2026-09-26)


### Bug Fixes

* name the running build next to the published tag in About ([#98](https://github.com/calionauta/bb-plugin-stelow/issues/98)) ([595f1a4](https://github.com/calionauta/bb-plugin-stelow/commit/595f1a4d22f754259e877e294d8c1562a06e942f))

## [0.51.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.50.0...v0.51.0) (2026-09-26)


### Features

* add Interface Contrast and Scope Map contracts ([#94](https://github.com/calionauta/bb-plugin-stelow/issues/94)) ([ee42633](https://github.com/calionauta/bb-plugin-stelow/commit/ee42633f81012379009a87657d87dacf02e19605))
* decision router seams, scope-batch safety contract, gated fan-out, and programmatic answers ([#97](https://github.com/calionauta/bb-plugin-stelow/issues/97)) ([b7bc503](https://github.com/calionauta/bb-plugin-stelow/commit/b7bc50355475a5f3da2bd5621541dd8de5fb3207))


### Bug Fixes

* send the build card request and protocol to the worker ([#95](https://github.com/calionauta/bb-plugin-stelow/issues/95)) ([56fde6e](https://github.com/calionauta/bb-plugin-stelow/commit/56fde6e4f4c706fee8be27e70e0c2773309b0390))

## [0.50.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.49.1...v0.50.0) (2026-09-24)


### Features

* surface BB Workflows setup status ([#87](https://github.com/calionauta/bb-plugin-stelow/issues/87)) ([7e5d621](https://github.com/calionauta/bb-plugin-stelow/commit/7e5d6214024d0e5b4a52c605cd7de436d1171153))

## [0.49.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.49.0...v0.49.1) (2026-09-24)


### Bug Fixes

* keep card detail output contract valid ([#84](https://github.com/calionauta/bb-plugin-stelow/issues/84)) ([b7e2c6d](https://github.com/calionauta/bb-plugin-stelow/commit/b7e2c6d6f6390fac072eb3ae6d34b4bad1ee2539))

## [0.49.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.48.0...v0.49.0) (2026-09-24)


### Features

* complete centralized Stelow execution ([f79ce88](https://github.com/calionauta/bb-plugin-stelow/commit/f79ce8899c79d589d2bcc3a7da7f43fd55594ce3))

## [0.48.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.47.1...v0.48.0) (2026-09-23)


### Features

* create GitHub issues at card birth and mirror linked discussion ([e4cc098](https://github.com/calionauta/bb-plugin-stelow/commit/e4cc09877158dc4d532c1d9dad585baa8325da11))
* create GitHub issues at card birth and mirror linked discussion ([fe88887](https://github.com/calionauta/bb-plugin-stelow/commit/fe888874bbd9cd6cff29a4cdee636baecb87d331))
* linked-issue composer, done-note drafts, link from any card ([99c0c86](https://github.com/calionauta/bb-plugin-stelow/commit/99c0c8680ee5b1e9d338a1866cf1164f7c1918af))

## [0.47.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.47.0...v0.47.1) (2026-09-22)


### Bug Fixes

* Bucket import copy and gallery top-left pin ([f187c67](https://github.com/calionauta/bb-plugin-stelow/commit/f187c67ebdc06161415bfca9838aef074777d2c2))
* name the import parking spot Bucket, not Inbox ([c4a57d6](https://github.com/calionauta/bb-plugin-stelow/commit/c4a57d69bf01d51056e1a89c588a2483fc7fde27))
* pin gallery rows to the top-left ([217d36e](https://github.com/calionauta/bb-plugin-stelow/commit/217d36e03f76a0feb440b247340e7bd3a8bef82a))

## [0.47.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.46.0...v0.47.0) (2026-09-22)


### Features

* post-merge worktree cleanup suggestion with shared confirm shape ([ddfb6d5](https://github.com/calionauta/bb-plugin-stelow/commit/ddfb6d5671b161b2af78df75d9ff801c73521e84))

## [0.46.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.45.2...v0.46.0) (2026-09-22)


### Features

* isolated worktree toggle on manual GitHub import ([96e7495](https://github.com/calionauta/bb-plugin-stelow/commit/96e74955fe49a0dfc4ece33b7c8fe201ce751123))
* multi-select board filters with canonical stage options ([3cae5d5](https://github.com/calionauta/bb-plugin-stelow/commit/3cae5d5cc3f178fe835b650af92f4d39299da085))
* worktree storage readout, realtime refresh fixes, completed dirt anchor ([1f61725](https://github.com/calionauta/bb-plugin-stelow/commit/1f61725033449c84bab811b66b7007c7d2087374))


### Bug Fixes

* honor provider-provisioned environments instead of collapsing them ([0b700df](https://github.com/calionauta/bb-plugin-stelow/commit/0b700dff68dc6fda225faf1ba10f1f6f7e5c39ac))

## [0.45.2](https://github.com/calionauta/bb-plugin-stelow/compare/v0.45.1...v0.45.2) (2026-09-22)


### Bug Fixes

* honest fallback when the requested worker environment is substituted ([f4220c0](https://github.com/calionauta/bb-plugin-stelow/commit/f4220c051277857499415de3493f4680bb932d66))

## [0.45.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.45.0...v0.45.1) (2026-09-22)


### Bug Fixes

* terminal cards read scope history instead of worker redirects ([fe1f7b7](https://github.com/calionauta/bb-plugin-stelow/commit/fe1f7b747ec644a847465c36a87d3a066159427d))

## [0.45.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.44.2...v0.45.0) (2026-09-22)


### Features

* bb stelow scope start|done wrapper for workers ([e5322fa](https://github.com/calionauta/bb-plugin-stelow/commit/e5322fa17054ae67b8fbeb509d7992748385dd27))
* central trackable machine for every pendency kind ([c05585e](https://github.com/calionauta/bb-plugin-stelow/commit/c05585e10a23b717c03559032500b56707677297))
* fail-closed scope-sync guard for invisible scopes ([4e02147](https://github.com/calionauta/bb-plugin-stelow/commit/4e021474e72c6b43fd7edf01a80467ecb03d91e0))
* forward seed-tasks and start-sha through bb stelow scope ([0d5e8c3](https://github.com/calionauta/bb-plugin-stelow/commit/0d5e8c3441a4f3b123b6945eda74396c6f32e0f0))
* name unstartable ordering on execution entry ([e71b234](https://github.com/calionauta/bb-plugin-stelow/commit/e71b234fcc428352ab813ba2e57880a2593b8393))
* realtime refresh on lock and rework-scope writes ([9c585a6](https://github.com/calionauta/bb-plugin-stelow/commit/9c585a629ee7815a875415ed2920da3ac9dff867))
* refusal lines plus spec content into done gates ([bf76449](https://github.com/calionauta/bb-plugin-stelow/commit/bf76449642172beaefdafaba3e88d5dd7f176aa1))
* separate machine evidence from deliverables in artifacts ([282ca0a](https://github.com/calionauta/bb-plugin-stelow/commit/282ca0aaa5889f52e8de23460103c265f93bd739))
* wire trackable evidence through card detail, gates, and panel ([f0d80e5](https://github.com/calionauta/bb-plugin-stelow/commit/f0d80e51a9fa8cb708f0612da41d9e6b0d474a2c))

## [0.44.2](https://github.com/calionauta/bb-plugin-stelow/compare/v0.44.1...v0.44.2) (2026-09-21)


### Bug Fixes

* hill line names archived cards once, in three words ([cdc4a6a](https://github.com/calionauta/bb-plugin-stelow/commit/cdc4a6aaa78b2c02e44afe92789d496ec241713c))

## [0.44.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.44.0...v0.44.1) (2026-09-21)


### Bug Fixes

* hill counts work, never terminal cards ([9ee4e85](https://github.com/calionauta/bb-plugin-stelow/commit/9ee4e8554004670d35b951b9eafc55941b8ac258))

## [0.44.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.43.0...v0.44.0) (2026-09-21)


### Features

* gap-triage judges escalated gaps; one helper per duplicated rule ([736183d](https://github.com/calionauta/bb-plugin-stelow/commit/736183d8e9631f7f3d1213bee67570c03ceaa1a7))
* tasks with verify commands run deterministically in verify-tasks ([ee72442](https://github.com/calionauta/bb-plugin-stelow/commit/ee724420d7b94a58dcde0dc54a32a2c31d413da3))


### Bug Fixes

* gallery tiles keep the board's own size and flow left to right ([cfdd360](https://github.com/calionauta/bb-plugin-stelow/commit/cfdd360855cf0d03bd1b24c6ecdb208aafccfbbe))

## [0.43.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.42.0...v0.43.0) (2026-09-21)


### Features

* Bucket lives in the header gallery, no longer as a board column ([ec88165](https://github.com/calionauta/bb-plugin-stelow/commit/ec8816517367289221d81a808b21e862b755bdac))
* Checks names untracked execution while running ([0adc063](https://github.com/calionauta/bb-plugin-stelow/commit/0adc063bd20f36abc23c974ab476a8646fb23728))
* Flow strip gains live stuck and review signals beside tempo ([23b1031](https://github.com/calionauta/bb-plugin-stelow/commit/23b10314301ab37039cc8773d87eec2194324c01))
* independent pre-review fires on gate entry ([7f6e806](https://github.com/calionauta/bb-plugin-stelow/commit/7f6e8066d1017b87a199c17947a565830ef80006))
* live delegation registry, automatic card titles ([17265b2](https://github.com/calionauta/bb-plugin-stelow/commit/17265b249f1dc3a5fb3d3d1f040385ab73cc7c75))
* reconcile watches scope fingerprints, publishes on movement ([fe0d55c](https://github.com/calionauta/bb-plugin-stelow/commit/fe0d55c5b6beae7f365bf09fc4439cf38200ba47))
* verify-delegation tripwire for worker subagents ([2e0a4f2](https://github.com/calionauta/bb-plugin-stelow/commit/2e0a4f29ac3cdc68093f9265b5532ba651759461))
* verify-tasks judges completed tasks against the diff ([a48824d](https://github.com/calionauta/bb-plugin-stelow/commit/a48824db7fe6bcb8ea1a5af94f86601f9ff48e58))
* verify-tasks rolls scopes up deterministically ([51e2bd7](https://github.com/calionauta/bb-plugin-stelow/commit/51e2bd732e3c5fe48001c03ff7a3ab9eabe7b24e))


### Bug Fixes

* closed Flow header names its window ([c62db5d](https://github.com/calionauta/bb-plugin-stelow/commit/c62db5deb955cab2f684d28032517a4be1a3ca69))
* every path into completed records the done trail event ([5e428b9](https://github.com/calionauta/bb-plugin-stelow/commit/5e428b9f44867951fcc76664c927e07d172ffc02))
* Flow strip names itself, counts finished, glosses p50/p90 ([3a94e67](https://github.com/calionauta/bb-plugin-stelow/commit/3a94e670b7e89c162361dd4beac9773a6b7eb038))
* gallery dialog uses fixed 70vw by 85dvh dimensions ([93ebfee](https://github.com/calionauta/bb-plugin-stelow/commit/93ebfee6d9c34055fa3ea268129c5b49235bdfed))
* Generation hint in product words, no commands ([504de80](https://github.com/calionauta/bb-plugin-stelow/commit/504de80008c31cfcaa8e32edf8b2eaf1f3055276))
* name Independent review, doctrine without goldens ([dd91c66](https://github.com/calionauta/bb-plugin-stelow/commit/dd91c66979495f1aea4a61a3e5335aae7bcef72c))
* Review hint names real use without commands ([d73c741](https://github.com/calionauta/bb-plugin-stelow/commit/d73c74136cd91a40d6952cb97f79fb5410784ba5))
* threshold edits in preset mode, routers A-Z, honest empty copy ([66cfd61](https://github.com/calionauta/bb-plugin-stelow/commit/66cfd61de013899bfca4a0c2890bf16bc554136e))

## [0.42.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.41.0...v0.42.0) (2026-09-21)


### Features

* About plugin section as Status, Contents, Resources cards ([ee70344](https://github.com/calionauta/bb-plugin-stelow/commit/ee703449117f42be27ccf7e58b2bbe9c9ef634bf))

## [0.41.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.40.0...v0.41.0) (2026-09-21)


### Features

* explain delegated tiers per row, designate reviewer in presets ([97c77e4](https://github.com/calionauta/bb-plugin-stelow/commit/97c77e4b7bcddfef4a5a4e14cc27986096bd947b))
* gallery at 70vw with board-width tiles, checkbox links to Bucket ([68e4537](https://github.com/calionauta/bb-plugin-stelow/commit/68e45379edc74c9089d3e878930d1ebbe3b2398a))

## [0.40.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.39.0...v0.40.0) (2026-09-21)


### Features

* first board column reads Bucket, keys unchanged ([5d271b7](https://github.com/calionauta/bb-plugin-stelow/commit/5d271b71a23fa65d0f6ba5373bf24049fefca520))
* name the card project on tiles and the open-card breadcrumb ([a6d54f1](https://github.com/calionauta/bb-plugin-stelow/commit/a6d54f15dbe4cc1e0a4a441903e52b404f256091))
* shared card gallery dialog for Bucket piles and hill clusters ([a39797c](https://github.com/calionauta/bb-plugin-stelow/commit/a39797cf07dde59a1f4bc3005d65b6100d9b61e5))


### Bug Fixes

* Bucket gallery sits beside New, before Agent Presets ([009c385](https://github.com/calionauta/bb-plugin-stelow/commit/009c38575b79841747f412ebf8ed118533d9a1ff))
* decision_points rebuild runs in a transaction ([550133a](https://github.com/calionauta/bb-plugin-stelow/commit/550133a1ebfb40ccf96cb49f469f232aa1591667))
* done refuses with open scopes ([54fd105](https://github.com/calionauta/bb-plugin-stelow/commit/54fd105ee55a91d65903047a1ccf3e809c1fb78d))
* hill clusters open a gallery modal on click, drop percentages ([0c6392d](https://github.com/calionauta/bb-plugin-stelow/commit/0c6392d92646e98755a31a81d95650c4fa5f63ae))
* judge timeout relies on finally cleanup ([6349f8b](https://github.com/calionauta/bb-plugin-stelow/commit/6349f8b1786df2c3c492ced89f801917758c2014))
* preset judging refusals name the judge preset ([84a0415](https://github.com/calionauta/bb-plugin-stelow/commit/84a0415cb87e6aebec31f68fea1b90afd2756500))
* recon warning reads as advisory with the fix named ([ace771e](https://github.com/calionauta/bb-plugin-stelow/commit/ace771e48acd5dc5da25aad9b3141e45633923f1))
* router rows meet min-h-11 touch targets ([e6be021](https://github.com/calionauta/bb-plugin-stelow/commit/e6be021dc2ace7538a2580742ba47c76b8c7e384))
* rule save names its project ([5bdc501](https://github.com/calionauta/bb-plugin-stelow/commit/5bdc501ad089e460c9c16370424c6ae54aec6668))
* scope rows rotate through the shared chevron contract ([513de9e](https://github.com/calionauta/bb-plugin-stelow/commit/513de9e5a9879c5a10dc022909f49ad3c671d2f3))
* terminal cards show no stage pill ([6af2fb6](https://github.com/calionauta/bb-plugin-stelow/commit/6af2fb61903a16355e7f63095604e557ddc0b014))

## [0.39.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.38.0...v0.39.0) (2026-09-21)


### Features

* board flow strip with windows and per-card table ([3e465b7](https://github.com/calionauta/bb-plugin-stelow/commit/3e465b71cd5a6dc06f82def358a8f05c289308b5))
* card token totals in worker history ([1f39678](https://github.com/calionauta/bb-plugin-stelow/commit/1f39678c1ed21f172c66ddb3b8a18df5cab3328f))
* executing-scope pill on tiles and rows ([7842352](https://github.com/calionauta/bb-plugin-stelow/commit/7842352aba171f6b0d3151064fae69ecc043ad9c))
* flow lead/cycle metrics per card and board ([cba67c5](https://github.com/calionauta/bb-plugin-stelow/commit/cba67c5549cdc664786ff58ea2198d2b59684727))
* grouped checks rollup on card detail ([5526b0b](https://github.com/calionauta/bb-plugin-stelow/commit/5526b0b79001f1c8db3f9aaa107ed8ca7befec10))
* hill clusters, preview panel, and living motion ([8ae8dc3](https://github.com/calionauta/bb-plugin-stelow/commit/8ae8dc35c3b011f4e1f679565221ea4ce0477126))
* token breakdown per thread with card-level legs ([470089d](https://github.com/calionauta/bb-plugin-stelow/commit/470089dba2bc307340dd88b7832814333a9f8d93))
* token evidence in run bundle manifest ([793b639](https://github.com/calionauta/bb-plugin-stelow/commit/793b6392ba1f80ee3a9e268ff229faee118d64e0))


### Bug Fixes

* persist board view per track; size hill dots by slice ([54bf0be](https://github.com/calionauta/bb-plugin-stelow/commit/54bf0be9dac32b55f1ca5f266faa11005fb09893))

## [0.38.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.37.0...v0.38.0) (2026-09-21)


### Features

* hill board view with shared strips and phase rail ([ae78374](https://github.com/calionauta/bb-plugin-stelow/commit/ae783740c242ae751e287870f3557de594c5bbdb))


### Bug Fixes

* about reads top-down, version story grouped ([04d1b4a](https://github.com/calionauta/bb-plugin-stelow/commit/04d1b4a9fa532d55f0fe53bb460459a1b1a28546))
* hill view is build-only ([fd2c369](https://github.com/calionauta/bb-plugin-stelow/commit/fd2c36902dfad7fbde5cf5c868c4c05a2294d264))
* preview names the owning project on foreign-repo skips ([0a4e1eb](https://github.com/calionauta/bb-plugin-stelow/commit/0a4e1ebbbcd02637ab26e65a9830a5af33a32931))
* shared github filters that re-search and match ([c4db199](https://github.com/calionauta/bb-plugin-stelow/commit/c4db1994a2dbc9819db5e0ad59e38d6bf5871b9f))
* unified tabs, chips, and preset creation placement ([81a890c](https://github.com/calionauta/bb-plugin-stelow/commit/81a890c36096229bed0888e0100fc6dafcc3dc79))

## [0.37.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.36.1...v0.37.0) (2026-09-20)


### Features

* project picker for GitHub automation rules ([e1a40e5](https://github.com/calionauta/bb-plugin-stelow/commit/e1a40e52f3503730a30b08db1b363404c534eecf))


### Bug Fixes

* confirm router saves and never wipe drafts ([b1556a9](https://github.com/calionauta/bb-plugin-stelow/commit/b1556a9082cc7f363be346f0baa44e7c3d2b7dc0))
* decision router rows save explicitly without board reloads ([dcd36f6](https://github.com/calionauta/bb-plugin-stelow/commit/dcd36f69b0372bfcf19b7091efce8bd65f8759c8))

## [0.36.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.36.0...v0.36.1) (2026-09-20)


### Bug Fixes

* hot paths no longer advertise preset judge mode ([10ce6c9](https://github.com/calionauta/bb-plugin-stelow/commit/10ce6c9f176f5261af3ee55957c025363077d135))

## [0.36.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.35.2...v0.36.0) (2026-09-20)


### Features

* per-point decision routes and preset judging ([81555fa](https://github.com/calionauta/bb-plugin-stelow/commit/81555fac1e967fec026832d98108fe6055562bcd))

## [0.35.2](https://github.com/calionauta/bb-plugin-stelow/compare/v0.35.1...v0.35.2) (2026-09-20)


### Bug Fixes

* opt RPC contract into host discovery ([e08b369](https://github.com/calionauta/bb-plugin-stelow/commit/e08b36941cf18f7e8279dc0eadc09ac14e1c9651))

## [0.35.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.35.0...v0.35.1) (2026-09-20)


### Bug Fixes

* lower runtime SDK floor so the host accepts the plugin ([956675a](https://github.com/calionauta/bb-plugin-stelow/commit/956675acabbb7c7da82af08c212d8b4415745e83))

## [0.35.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.34.0...v0.35.0) (2026-09-20)


### Features

* adopt BB 0.43 capabilities where they pay off ([6981bfe](https://github.com/calionauta/bb-plugin-stelow/commit/6981bfe88704876c76ed47764130467d71e1a0d6))

## [0.34.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.33.0...v0.34.0) (2026-09-20)


### Features

* add auto-continue veto router and per-point rules explanations ([8fe3fd5](https://github.com/calionauta/bb-plugin-stelow/commit/8fe3fd500e26451ca34f94a190f945dd0e21050c))
* add decoupled provider registry and inbox severity bump ([4fdf0c3](https://github.com/calionauta/bb-plugin-stelow/commit/4fdf0c3bf4489c4e0d2ea96a06ddf5b36f7b7d4c))
* add golden agreement command and per-point rules explanations ([f0f4c4c](https://github.com/calionauta/bb-plugin-stelow/commit/f0f4c4cb8a622db5e916fae1a77131f4fb2c0860))
* add inbox severity tiers with reason chips ([f854e0d](https://github.com/calionauta/bb-plugin-stelow/commit/f854e0dc84fba3b946a724164878f0eb4e150b7a))
* add skill criteria parser and shorten Decision API intro ([98aaac7](https://github.com/calionauta/bb-plugin-stelow/commit/98aaac7aad723d0612b74ba4c23dd6d282d7e8d9))
* name vetoes in pause trail and enrich bump states ([5a5dc74](https://github.com/calionauta/bb-plugin-stelow/commit/5a5dc74a534ee6cc9aebd5a6e365da615b21110d))
* shorten Decision API intro and sync criteria-bearing skills ([1637f53](https://github.com/calionauta/bb-plugin-stelow/commit/1637f5342daab340feca8cb0dda4ff53e6251c15))
* wire artifact criteria judging to the Decision API router ([f73d1e1](https://github.com/calionauta/bb-plugin-stelow/commit/f73d1e143e170735fc584c27a1b5118790273421))


### Bug Fixes

* name the full preset precedence in triage rules copy ([4767af9](https://github.com/calionauta/bb-plugin-stelow/commit/4767af902b59e3341268f8cf06e34e97f6bd7bc9))
* state who judges in triage copy and close the severity plan ([4b201ba](https://github.com/calionauta/bb-plugin-stelow/commit/4b201ba4f5f821d3332b380c26ea73579c548090))

## [0.33.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.32.0...v0.33.0) (2026-09-20)


### Features

* add classifier provider adapter and honor explicit intent seeds ([51fd9cc](https://github.com/calionauta/bb-plugin-stelow/commit/51fd9cc78853cb53d55f8c3c1838ccfe9b7497b7))
* add Decision API kill switch, failure trail, and config honesty ([b1b324c](https://github.com/calionauta/bb-plugin-stelow/commit/b1b324c75859b1e8302856606e8a8026576a7c3e))
* add Decision API settings and triage-intent router ([aef9b3f](https://github.com/calionauta/bb-plugin-stelow/commit/aef9b3f96ca0fcd203e6338d136b3e05029b2480))
* add reliable-tier preset override ([1cc7049](https://github.com/calionauta/bb-plugin-stelow/commit/1cc7049b2f42750ea8a64a287a3f735db849e519))
* name TypeSafe AI's Jev schema in Decision API settings ([984a320](https://github.com/calionauta/bb-plugin-stelow/commit/984a32060748cc0cd617335536a9d19d1c8a3622))
* report Decision API configured state in settings ([6194f33](https://github.com/calionauta/bb-plugin-stelow/commit/6194f33ffcdf05c32fae5047c696b33875d8a973))


### Bug Fixes

* Decision API kill-switch helper and threshold loop cleanup ([12d1b1d](https://github.com/calionauta/bb-plugin-stelow/commit/12d1b1d5f004d42fdc60c9f16ccedcb733df20a7))
* fan out preset staleness and resolve reseed through the reliable tier ([bcd2e58](https://github.com/calionauta/bb-plugin-stelow/commit/bcd2e58be1eb7cdc9bf443cadabf2252e666fd5e))

## [0.32.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.31.1...v0.32.0) (2026-09-20)


### Features

* overhaul GitHub issue import and automation ([8229d8c](https://github.com/calionauta/bb-plugin-stelow/commit/8229d8c698c530b53d48af371b05463c1b91cc6e))


### Bug Fixes

* drop 0.31.x autostart carry-over; rules save current shape only ([dd1d2a0](https://github.com/calionauta/bb-plugin-stelow/commit/dd1d2a032ebe2213f835301622938aace805ccaa))
* harden GitHub automation races, liveness, and test value ([04de499](https://github.com/calionauta/bb-plugin-stelow/commit/04de499308aff510c37ce9fe2a6c793e82ef7170))

## [0.31.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.31.0...v0.31.1) (2026-09-20)


### Bug Fixes

* reloading notice renders info tone instead of error red ([13eb0b0](https://github.com/calionauta/bb-plugin-stelow/commit/13eb0b0b9708b6a7fe15800a6e27654fdd201330))

## [0.31.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.30.0...v0.31.0) (2026-09-19)


### Features

* per-rule auto-start with aligned automation dialog and delete confirm ([80d98ed](https://github.com/calionauta/bb-plugin-stelow/commit/80d98edd74b1d965e9338f643c5f208b4f9807d4))


### Bug Fixes

* automation realtime reason and UI contract pins ([5711c11](https://github.com/calionauta/bb-plugin-stelow/commit/5711c11cc01abe387ab76c908193b03a4f9dabea))

## [0.30.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.29.0...v0.30.0) (2026-09-19)


### Features

* commit-aware bundle check with empty-skip ([f3cf4aa](https://github.com/calionauta/bb-plugin-stelow/commit/f3cf4aa5135672fc852be71a6e4626370ee33268))
* refresh run bundle on every done with drift check ([d97ebe6](https://github.com/calionauta/bb-plugin-stelow/commit/d97ebe6115ff0c61397760805e5e4260e004baea))


### Bug Fixes

* keep live checkpoint pill on the progress subtitle line without ring clipping ([33c87af](https://github.com/calionauta/bb-plugin-stelow/commit/33c87af1f76e1d856e9759166093c9f91b79cb3f))

## [0.29.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.28.0...v0.29.0) (2026-09-19)


### Features

* list automation rules across all projects with search and bulk actions ([f5db650](https://github.com/calionauta/bb-plugin-stelow/commit/f5db6506c1849f0addd43fa24f51a3e5b1602361))

## [0.28.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.27.0...v0.28.0) (2026-09-19)


### Features

* automation dialog names GitHub setup and 5-minute cadence ([18bfb8e](https://github.com/calionauta/bb-plugin-stelow/commit/18bfb8e0830dcd5caf2390570eecc48c4337b288))
* automation rules manage any BB project via picker ([0e43e8e](https://github.com/calionauta/bb-plugin-stelow/commit/0e43e8ec282482e1fdef39f2bdd2da96316f643d))
* manage automation rules for any BB project ([b3d5630](https://github.com/calionauta/bb-plugin-stelow/commit/b3d563069db6131fcfb381d8ff4e94f1e9c5cfa3))

## [0.27.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.26.0...v0.27.0) (2026-09-19)


### Features

* close the ESCALATED gap loop in code with mother-card transparency ([69a7606](https://github.com/calionauta/bb-plugin-stelow/commit/69a76060332ce4928fd7c0700178614fa491ad27))
* delegated draft bursts on a generation preset ([dd24ae0](https://github.com/calionauta/bb-plugin-stelow/commit/dd24ae05b8b9cc7af1520f97ec2ff001122ababa))
* delete removes the card state dir, dialog states the blast radius ([cd14077](https://github.com/calionauta/bb-plugin-stelow/commit/cd14077e9bee8ad410ade89ba9a29c9eeb774892))
* depth contracts on explore stages and build documents ([aaaaedd](https://github.com/calionauta/bb-plugin-stelow/commit/aaaaeddf353554c36f9a2e26a0ad04abbc7e4c7a))
* enforce gap effort and report fleet metrics ([685e21a](https://github.com/calionauta/bb-plugin-stelow/commit/685e21afdbf815bd008d3a5097e18b541dfc0aa8))
* fresh-context spawn contract ([e7ce34f](https://github.com/calionauta/bb-plugin-stelow/commit/e7ce34fa677064a44a76f2c8814221daa9ae2d21))
* hypothesis-only evidence status plus early build warnings ([72a991e](https://github.com/calionauta/bb-plugin-stelow/commit/72a991e84f154623d15caf50f4cdebf0a2e52646))
* loop escalated gaps back to execution on the mother card ([88bcfee](https://github.com/calionauta/bb-plugin-stelow/commit/88bcfee4e42190e2b09c3f4039a53bea09091c0e))
* opt-in independent artifact review ([6acef06](https://github.com/calionauta/bb-plugin-stelow/commit/6acef06ed850ef0119fc0ce9d2bab5e439b0729c))
* paste-ready Stelow-Artifacts commit trailer via manifest ([52f09f6](https://github.com/calionauta/bb-plugin-stelow/commit/52f09f6eb8803d2bbd45ece02dccc634dbbb9379))
* require Done Criterion as a task-table column, not prose ([ea59893](https://github.com/calionauta/bb-plugin-stelow/commit/ea59893b97323933cdb04a867634b73b23a7ac57))
* run-bundle export into docs/runs plus manifest ([a9dcca2](https://github.com/calionauta/bb-plugin-stelow/commit/a9dcca2997bc62d3646e93192fbe015cb5540b3e))
* scope progress hero above the per-scope list ([24ca31f](https://github.com/calionauta/bb-plugin-stelow/commit/24ca31fb0cfe874f9240354f8284e3bfed12d969))
* seals, quality panel, review policy, review-any-document ([e905227](https://github.com/calionauta/bb-plugin-stelow/commit/e9052276f38ee2716cab0a8caa83a3820c66a43f))
* seed-time gitignore keeps live runs out of git ([f8a4ae2](https://github.com/calionauta/bb-plugin-stelow/commit/f8a4ae2eb0a76004eee91c41595e157374d30f49))
* shift the rework loop left into verify and name the loop-back ([777a39b](https://github.com/calionauta/bb-plugin-stelow/commit/777a39b651b6b0d0f29c4ed2b453f830a369ace9))
* sync-scopes publishes card refresh on tracking change ([44bede3](https://github.com/calionauta/bb-plugin-stelow/commit/44bede36d66f4c99a024b6ef633a67bc2c87cef1))


### Bug Fixes

* **about:** keep last update verdict on failed checks, timebox applying ([9120d0e](https://github.com/calionauta/bb-plugin-stelow/commit/9120d0e3c3f7826e6e4db13647ff788da387b518))
* close remaining Phase 1-4 gaps ([6420a7b](https://github.com/calionauta/bb-plugin-stelow/commit/6420a7be1d356055bd5dd0eed7393ef5393354d8))
* disposable drafts exempt from unregistered list ([35198e3](https://github.com/calionauta/bb-plugin-stelow/commit/35198e3d8c6aefc3f9afdfa2ed2078cdb7ab0f30))

## [0.26.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.25.0...v0.26.0) (2026-09-18)


### Features

* deterministic JTBD depth contracts on every composite substep ([3b5a911](https://github.com/calionauta/bb-plugin-stelow/commit/3b5a911206b390376f79b6f4b3f9ddcf3068c1d2))


### Bug Fixes

* gate research completion on every composite substep ([2c487f1](https://github.com/calionauta/bb-plugin-stelow/commit/2c487f197c79e699ba7b652843c7b52fc6a83673))

## [0.25.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.24.0...v0.25.0) (2026-09-18)


### Features

* add stay-in-touch step to first-visit setup ([effa526](https://github.com/calionauta/bb-plugin-stelow/commit/effa52647e590c3c4d925881c05957eb0cc220ad))
* disclose agent-reach fetch router in About ([3df6ddb](https://github.com/calionauta/bb-plugin-stelow/commit/3df6ddbe715b8b6a45cfe867d7737332cb9de33f))
* per-child token totals on worker history rows ([487a389](https://github.com/calionauta/bb-plugin-stelow/commit/487a3891243f31ccb4b5b70b87dc431df306ec08))
* workspace file-claim coordination across cards ([c630f3f](https://github.com/calionauta/bb-plugin-stelow/commit/c630f3f13c4bf7494b5a22b7ca6031714371a47f))


### Bug Fixes

* release workspace claims on every terminal status, key by effective checkout ([fa580c8](https://github.com/calionauta/bb-plugin-stelow/commit/fa580c84981ace8915fe2b7c33bcdcfad13f723d))

## [0.24.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.23.2...v0.24.0) (2026-09-18)


### Features

* automation rules for GitHub-label drafts ([8011c7f](https://github.com/calionauta/bb-plugin-stelow/commit/8011c7f1b35de6b7303ae3e8c5e8f9c2a93ca93c))
* child threads in worker history ([d4c2a52](https://github.com/calionauta/bb-plugin-stelow/commit/d4c2a5248c0791579d5da4ef3f6e7087e9ad76fc))
* escalate long-stalled paused events with their age ([4cd56af](https://github.com/calionauta/bb-plugin-stelow/commit/4cd56af692d9569954b809f37500615d98ce6b96))
* provider token totals on worker history rows ([4eaa544](https://github.com/calionauta/bb-plugin-stelow/commit/4eaa544d841cbf4d4ca369b9c464b79e10953251))
* review gates as multi-select replacing the cumulative ladder ([a81171f](https://github.com/calionauta/bb-plugin-stelow/commit/a81171fbb9b44420f5ce660c01e72d68cb6838d3))


### Bug Fixes

* update copy branches on install source ([9a87748](https://github.com/calionauta/bb-plugin-stelow/commit/9a87748505432f66c9eb387a5b99a61d2a7a5ea2))
* update-check copy covers both sources ([366729c](https://github.com/calionauta/bb-plugin-stelow/commit/366729c8667a6dc70099a2e9e9d2a087edc090ed))

## [0.23.2](https://github.com/calionauta/bb-plugin-stelow/compare/v0.23.1...v0.23.2) (2026-09-18)


### Bug Fixes

* check update delivers the GitHub release half too ([66c70e8](https://github.com/calionauta/bb-plugin-stelow/commit/66c70e8e1238c17b247367ab19b00ddc12b64132))

## [0.23.1](https://github.com/calionauta/bb-plugin-stelow/compare/v0.23.0...v0.23.1) (2026-09-18)


### Bug Fixes

* keep migrate array frozen, create ask_contracts via direct exec ([0906c32](https://github.com/calionauta/bb-plugin-stelow/commit/0906c327cefbeafc5dacbf9a455abe5cb87c0662))
* update-status copy names Check update, confirms GitHub match ([96581a6](https://github.com/calionauta/bb-plugin-stelow/commit/96581a6340b1c6d3c4fb5fb72728865eb1a36ac9))

## [0.23.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.22.0...v0.23.0) (2026-09-17)


### Features

* contextual update status with GitHub release discovery ([69df8c5](https://github.com/calionauta/bb-plugin-stelow/commit/69df8c59ba754d97600849f0ea35e3ace5116c1a))
* conventional commit style for worker-authored commits ([d5f120c](https://github.com/calionauta/bb-plugin-stelow/commit/d5f120ce5cef163b7132df0c8d378c3145b596da))
* discard unpushed card work, then archive ([97ca2e2](https://github.com/calionauta/bb-plugin-stelow/commit/97ca2e2f83ff5747041fec905599a615517f26d4))
* enforce question contracts before advance ([70e1d66](https://github.com/calionauta/bb-plugin-stelow/commit/70e1d6654cb94e5276a82d7928ba3f7ef6a444b4))
* enforce question contracts in CLI advance ([eaaf062](https://github.com/calionauta/bb-plugin-stelow/commit/eaaf06297d47426ceb1f0fa69925369becc3cdf7))
* keep-open create dialogs with persistent submit warnings ([4e30fca](https://github.com/calionauta/bb-plugin-stelow/commit/4e30fcafc50d0e98f60f859e1149da17f8dff362))
* mirror upstream question contract for interface pick ([6bfb4c1](https://github.com/calionauta/bb-plugin-stelow/commit/6bfb4c17a3f9495c5a2831f1e7ea46d182b69b82))
* mirror upstream question contracts for shape/critique/scope ([e621ce4](https://github.com/calionauta/bb-plugin-stelow/commit/e621ce4b114ba7788a84d2b8916a2845f6cec82a))
* optional ask contract declarations with answer linkage ([d3c7772](https://github.com/calionauta/bb-plugin-stelow/commit/d3c77729471a74003da30ecaf9fff4eae777b5fe))
* per-option evidence for interface selection asks ([21aa66b](https://github.com/calionauta/bb-plugin-stelow/commit/21aa66b6fe5598cc20380e4278e03c1ecc82073f))
* shared update signal on sidebar, About tab, and Check update ([82517bb](https://github.com/calionauta/bb-plugin-stelow/commit/82517bbb3680a011d0be77a394042783cca23489))
* stash-aware discard with full trail evidence ([4257af3](https://github.com/calionauta/bb-plugin-stelow/commit/4257af39205491c0f4ff939711dc9e252ac902ff))


### Bug Fixes

* advance guard reads real history boundary via strict shared parser ([0de0fe4](https://github.com/calionauta/bb-plugin-stelow/commit/0de0fe41e0e53df34ee5549cc8b031b2fb893147))
* fail open when question contracts are unreadable ([89f88aa](https://github.com/calionauta/bb-plugin-stelow/commit/89f88aaf795c1579137d34e914bb4b8e4bba0ede))
* read real state.md history boundary in advance guard ([d6713cf](https://github.com/calionauta/bb-plugin-stelow/commit/d6713cf0d2344107c3135f6fb7b7deb8a5cc7172))

## [0.22.0](https://github.com/calionauta/bb-plugin-stelow/compare/v0.21.0...v0.22.0) (2026-09-17)


### Features

* atomic per-skill publish for the Stelow skills sync ([c4d9b0e](https://github.com/calionauta/bb-plugin-stelow/commit/c4d9b0e68d3b82c79ac2205ed0d2507c6a805cf2))
* bounded automatic retry for transient worker-start failures ([8fc9864](https://github.com/calionauta/bb-plugin-stelow/commit/8fc9864c3f765c12143f484cca083d5d452808d4))
* record portable reconnaissance capability ([31eed96](https://github.com/calionauta/bb-plugin-stelow/commit/31eed963fe8f0ee654acd1b24641884043894002))


### Bug Fixes

* hide unpublished stelow artifacts ([d8e1e2a](https://github.com/calionauta/bb-plugin-stelow/commit/d8e1e2a86a14836453d40a5d5ca805249daac7c8))
* isolate reconnaissance receipts per workflow ([b411e44](https://github.com/calionauta/bb-plugin-stelow/commit/b411e44556fc01718c1ae325f15746dd1ba2d903))
* require complete structured question batches ([2db51e5](https://github.com/calionauta/bb-plugin-stelow/commit/2db51e5c81f67a853eac5bc05f3585ea20d1b707))
* use single-package release-please mode ([ddb0d02](https://github.com/calionauta/bb-plugin-stelow/commit/ddb0d02490a76e7b528492a33c7a67fdb9f1b84a))

## [0.21.0] - 2026-09-17

### Added

- **Readable, recheckable plugin updates.** About shows tag versions instead
  of raw commit shas, names the installed and candidate versions in the
  update confirmation, offers "Check again" with a last-checked timestamp,
  and reports a post-update reload honestly instead of as a failure.
  Mount-time reads share one in-flight check with a one-minute reuse
  window via the new `checkPluginUpdate` RPC.

## [0.20.0] - 2026-09-16

### Changed

- **Native plugin updates.** Stelow now asks BB for the installed plugin's
  compatible update status and applies an available update only after explicit
  confirmation in About; the sidebar shows a separate update indicator.

### Fixed

- **Fresh update status.** About and the sidebar now await BB's update check
  for their initial read, so a fast panel mount cannot remain on a stale
  "checking" value.

## [0.19.1] - 2026-09-16

### Fixed

- **Automated sync commits.** The synchronization workflow now configures the
  GitHub Actions bot identity before committing its verified candidate.

## [0.19.0] - 2026-09-16

### Added

- **Safe Stelow update path.** The plugin checks published upstream releases
  read-only and names a newer version in About, while a scheduled GitHub
  workflow prepares an immutable, tested synchronization pull request.
- **Completion review badge.** An unread Done card now reaches Needs attention
  and the sidebar badge until a human opens it; its emerald review treatment
  remains distinct from an amber blocked workflow.

### Fixed

- **Audit contract metadata.** The TypeScript declaration now agrees with the
  executable v3 contract, and the skill inventory describes its pinned source
  rather than a stale runtime-sync timestamp.

## [0.18.47] - 2026-09-16

### Added

- **One tree, one receipt.** Build completion now runs `audit-trail build
  --strict` and `check --strict`, then binds the trail's own snapshot to the
  Git identity the `audit.md` receipt was verified at. A checkout that moved
  during completion is refused with its fix named instead of leaving Done
  holding two receipts for two different trees, and `--strict` refuses to seal
  a receipt that would omit an unregistered workflow document.
- **Audit evidence, labelled.** Stelow's trail is attributed to the Audit
  stage it belongs to — no longer listed as an unregistered stray file — and
  both receipts carry their role: the host's `audit.md` (acceptance criteria,
  tests, checkout) beside Stelow's portable trail (state, artifacts, worktree
  snapshot). A completed card opens its Artifacts section by default.
- **Audit trail freshness** (`auditTrailStatus`). A completed Build card shows
  a compact verified / changed-since-completion state with a re-check action.
  The verdict is the helper's own: freshness is asked for on demand, never
  computed on every board read, and `lib/audit-trail-contract.mjs` is the one
  place that interprets it — refusing a contract version it cannot read.
- **Review is not attention** (`hasPendingReview`). Finishing work is its own
  quieter, emerald signal — a Review marker on Done cards and a **Ready for
  review** Inbox entry — instead of being folded into the amber
  needs-attention treatment. `needsAttention` keeps meaning "a worker is
  blocked on you", and the Inbox badge keeps counting exactly the actions its
  primary filter lists.

### Changed

- **Vendored Stelow core refreshed to 0.59.7-alpha.**

### Fixed

- **The board reacts to Inbox changes.** The three board panels now listen to
  `inbox-changed`, so the Review marker clears when opening a Done card clears
  its completion instead of lingering until an unrelated refresh.
- **README no longer claims the sidebar badge counts unseen completions.** It
  counts unresolved actions only, which is what the code and the Inbox filter
  have done all along.

## [0.18.46] - 2026-09-16

### Added

- **Portable deterministic audit receipt.** Build completion now invokes the
  vendored Stelow helper's `audit-trail build` and `audit-trail check` after
  bb's checkout-bound `audit.md` gate. The generated receipt is the same
  cross-host contract, not a plugin-specific audit format.

### Changed

- **Vendored Stelow core refreshed to 0.59.5-alpha.** Includes deterministic
  audit-trail evidence hashes, mandatory final-audit generation, and removal
  of retired host-integration residue.

## [0.18.45] - 2026-09-16

### Fixed

- **The parked hero claims no checkpoint either.** Unstarted cards read
  Not started in the hero, matching their pills and the parked copy.

## [0.18.44] - 2026-09-16

### Fixed

- **Parked Inbox cards claim no stage.** Build tiles and open headers read
  Not started until a worker exists — the triage checkpoint is no longer
  shown for work that never began.
- **No split trigger without a worker.** Propose split hides on parked
  cards (there is no triage worker to propose from); the trigger RPC
  refuses threadless cards as a backstop.
- **Inbox exits spawn with creation-time choices.** Leaving the Inbox on
  any track starts through the shared starter, which resolves the pinned
  preset override (provider/model) and the card's own project workspace.

## [0.18.43] - 2026-09-16

### Added

- **Stale-question notices.** Asking snapshots each questioned document
  (content hash) and its checkout (Git HEAD). Every card read compares open
  questions against their baseline and names what moved — revised/removed
  document, moved checkout with touched paths — pointing at the existing
  exits (re-open the doc, request changes, regress the stage). Advisory
  only: nothing auto-replans and every question stays answerable.

### Fixed

- **Inbox toolbar in the plugin's own language.** One row: four tabs with
  semantic status dots (amber/emerald/zinc/primary, active tints to match)
  plus a single Unread-only checkbox. The detached Show label and its
  button pair are gone.

## [0.18.42] - 2026-09-16

### Fixed

- **Research/Explore chips match Build's language.** Position and playbook
  tags share one component with kind icons (track glyph for position,
  content glyph for the tag), `statusTone` for state and muted for tags —
  on tiles and open heroes alike. Tiles show identity (the board gives
  position); open cards add the position pill. The open heroes no longer
  out-color their tile twins, and Explore's open card pulses its live
  border while working like every other track.

## [0.18.41] - 2026-09-16

### Fixed

- **Workflow progress names the checkpoint with the live pill.** The header
  hint uses the same pulsing treatment as the timeline cursor instead of
  detached plain text.
- **Stage and workflow-type chips carry a kind icon** on Kanban tiles and
  open cards alike (one shared component, so both surfaces stay identical).
- **Conversation reads as a thread.** Card notes render as author bubbles
  (You/Agent) and the composer names where native attachments and mentions
  live, with the live worker thread one tap away beside Send.

## [0.18.40] - 2026-09-16

### Fixed

- **The DB stage converges to the state.md checkpoint on every sync.** Cards
  parked on a question or idle no longer render the last manually-advanced
  stage while the timeline, preset band, split eligibility, and hero read the
  DB value. The convergence write carries stage only; status, columns, and
  the activity-only question-wait contract are untouched.

## [0.18.39] - 2026-09-16

### Fixed

- **The hero Review entry opens the document under decision.** It now prefers
  the pending question's own option artifact over a manifest stage guess, so
  a card waiting on tech-plan approval no longer offers the testing strategy
  when two planning documents exist. The button also names the document
  (`Review spec-tech_v1 ↗`) instead of a generic label.

## [0.18.38] - 2026-09-15

### Added

- **Recovery audits are now real Build cards.** An attached legacy checkout
  creates one idempotent recovery-audit card in its registered project. The
  original exploratory card remains an immutable mismatch record; the audit
  card has the normal workspace, test, commit, and pull-request flow.
- **Build completion has host-recorded test evidence.** `bb stelow verify
  --tests` selects only a safe conventional project test command, runs it
  without a shell, and records its command, result digest, Git root, and
  HEAD. `done` refuses a stale, failed, or merely claimed test result.
- **Loose recovery evidence is visible.** Worker-reported folders and
  patch/diff/bundle paths are retained for review, never silently copied or
  applied to a project.

### Changed

- **Build state presentation is a shared component.** Kanban tiles and the
  open-card header use the same stage → type → waiting-for-you order. A
  waiting tag has a dashed amber live pulse; active work has no redundant
  tag and instead gives both the closed and open card a blue live border.
- **Server cleanup now maintains Stelow's managed-plugin cache.** It proves
  the active SHA, keeps it and exactly one rollback cache, and removes only
  older content-addressed Stelow cache entries.

## [0.18.37] - 2026-09-15

### Fixed

- **Build cards now name the actual workflow checkpoint.** The Kanban and
  open-card header show the same specific stage (`Critique`, `Audit`, etc.)
  plus workflow type. Kanban columns remain only navigation; redundant
  `Planning`/`Done`, `In progress`, and `Completed` chips are gone. A blue
  live border communicates active execution and an amber border communicates
  that the card needs the user's attention.
- **Recovered-card artifacts no longer target a stale worker environment.**
  When a user-confirmed recovery checkout exists, file links use the readable
  host target rather than a retired BB workspace that can return a 404.

## [0.18.36] - 2026-09-15

### Changed

- **The first board column is the Inbox on every track.** Research and
  Explore's "To-Do" becomes Inbox (the same word the creation dialogs and
  parked cards already used), and Build's board gains one too, ahead of
  Analysis. One column means *captured, nothing running yet*: a card sits
  there while it has no worker, and leaving it is what starts the card.

### Added

- **Deferred start for Build.** "Start new issue" now offers Start
  immediately (checked), matching research and explore. Unchecked parks the
  card in the Inbox with no worker; the card offers Start, and dragging it
  into a phase starts it through the same shared spawn as preset restarts.
  Dragging a card that already has a worker into the Inbox is refused by the
  move policy with a named exit, so a running worker is never orphaned.

### Fixed

- **Build state now reads identically on the board and in the open card.**
  Both surfaces share the same ordered pills: board location, lifecycle
  state, worker state, and workflow type. The Kanban no longer substitutes a
  stage for status or prefixes the pills with a redundant “Status” label.
- **Audit and recovery evidence fail closed.** Build completion now records
  the host-verified Git root and exact HEAD in `audit.md`; copied or stale
  receipts are refused. A recovered diff is also refused if its path no
  longer resolves to the Git root the person attached.

## [0.18.35] - 2026-09-15

### Fixed

- **An approval option can no longer reach you with nothing to read.**
  `--artifact` is authored per option, so a gate ask that attached it to only
  one option (typically "Request changes") rendered a blind "Approve plan": the
  evidence gate only required *some* option to carry evidence, and the manifest
  fallback fired only when *no* option did. Every option now inherits the
  document attached to its siblings within the same question, and the manifest
  recovery still covers asks that attached nothing at all
  (`inheritAskArtifact`, one pure rule shared by the card and the thread form).

### Changed

- **The document control inside an option is the shared outline button.**
  The hand-rolled emerald slab beside the amber option rows is gone; the
  affordance now uses the plugin's outline button (bordered, transparent,
  hover on `state-hover`), so it belongs to the same palette as the panel it
  sits in and keeps its `min-h-11` touch target.

## [0.18.34] - 2026-09-15

### Changed

- **Card detail has one progress row, one home for files, and one reference.**
  "What is happening" is now **Workflow progress** (`where this card is`),
  paired with the **Workflow map** (`what each stage does`) as a sibling
  section instead of nesting a reference inside card state. The section's
  redundant `PROGRESS` heading is gone, and the override coaching moved below
  the stage row, where it now appears only when an override is available.
- **No fact is printed twice.** Each stage's document buttons are replaced by
  a count-only suffix (`2 files`), so a pill stays one click target and files
  keep one shape; the card's file count rides the section summary as the single
  route into Artifacts.

### Removed

- The now-unreachable stage-artifact highlight and group-ring plumbing, and
  the archived progress heading/hint that the disclosure summary already
  covered.

## [0.18.33] - 2026-09-15

### Fixed

- **The artifact trail can no longer hide a produced document.** The card
  listed only what the agent registered in state.md, so a file the workflow
  wrote but never declared was invisible. Every other document in the card's
  state directory is now listed too, under "Produced but not registered"; the
  workflow's own state, its backups, logs, and JSON bookkeeping stay out.
- **"Mentioned files" never guesses.** It listed files the request never
  named — a split card's prompt names the parent card's path, and a basename
  search matched its own state file. It now shows only paths the request
  spells out that exist, and is labelled "Files named in your request", so
  the card states where the file came from.

## [0.18.32] - 2026-09-15

### Added

- **Exploratory cards can be recovered without losing the work.** When a
  worker wrote somewhere other than the card's own workspace, the card now
  offers exactly one evidence-led next step: promote the workspace, review a
  worker-reported registered checkout, choose between several reported
  checkouts, or state plainly that only documents remain. Attaching records
  the reviewed project, branch, HEAD, and changed-file count on the card and
  keeps the original exploratory path in its audit trail.
- **The audit receipt must name the checkout it verified.** `audit.md` now
  carries an Execution context section recording the absolute path the
  worker actually wrote to, so a receipt can never silently attest a
  different codebase than the one the card ran in.

### Fixed

- **Seeded scaffolding no longer counts as source material.** Every card
  workspace carries `skills/`, `data/`, `.stelow/`, and `stelow.json`;
  treating those as source made every exploratory card look promotable and
  hid the reported-checkout review path. Only a real source file, or a
  directory Stelow did not create, marks a workspace as promotable.
- **Recovery refusals name their exit.** Promoting a folder that has no
  source, or already has a reviewed checkout attached, explains what to do
  instead of failing generically.

## [0.18.31] - 2026-09-15

### Changed

- **Every disclosure uses the same readable chevron.** The control reserves
  a 20px target and rotates between closed/right and open/down, including
  board columns, preference rows, and preset forms.
- **Workflow map is a legible reference, not a dense line list.** It now has
  a proper two-line heading, relaxed copy, four phase sections, numbered
  stage cards, and direct links to the corresponding upstream behavior.

## [0.18.30] - 2026-09-15

### Fixed

- **Gate documents are visible where the decision is made.** Older pending
  gate asks recover their manifest artifact; every option now carries its
  contextual Open document control. Approval opens a read-only review;
  change requests retain quoting, notes, and agent delivery.
- **Artifact review remains usable with many quotes.** The viewer has a
  bounded, scrollable content area and a persistent action footer, so quoted
  excerpts, their inputs, and Close/Send never fall below the dialog frame.
- **Build cannot silently run without a codebase.** New Build cards and
  Build splits require a project workspace instead of an exploratory folder.
  Existing affected cards explain why Git evidence is unavailable.

### Added

- **Audit receipt for completed Build cards.** `audit.md`, registered as an
  Audit artifact, records acceptance criteria, verification, exact test
  results, and Git evidence. The host refuses `done` until it is present.

## [0.18.29] - 2026-09-15

### Fixed

- **Per-option evidence opens in the row.** The document button moved
  from below the options into each option (right side, Open document,
  same viewer); the inline glance still expands below. Thread view keeps
  the plain-filename degradation.
- **Deferred start on lightweight tracks.** Creation offers Start
  immediately (checked): unchecked parks in To-Do with no thread. Parked
  cards offer Start; drag-to-Doing starts via the shared fresh-spawn
  (also used by preset restarts). Split/imports always start.

### Changed

- **Build columns read as phases** (Analysis/Planning/Execution/Review)
  — the place, not a command nor a claimed activity.

## [0.18.28] - 2026-09-15

### Fixed

- **Review gates require evidence.** A gate question with nothing to read
  ("approve the plan", no plan attached) is now refused by the host
  (`lib/gate-ask-evidence.mjs` — `--artifact`/`--preview` on any option,
  `--force` to override). The card hero also falls back to
  question-attached evidence when the manifest lists nothing. Label-only
  options work unchanged at every non-gate stage.

## [0.18.27] - 2026-09-15

### Fixed

- **Refactor/bugfix skip strategy questions deterministically.** The
  intent pre-check was advisory text the worker had to remember to apply.
  The host now refuses standard asks at the `context` stage for those
  intents (`lib/context-ask-gate.mjs`, slug truth, `--force` to override)
  — nothing persists, the human is never pinged.
- **Config schema guaranteed end to end.** Write boundary was already a
  strict enum; the read boundary now parses whole and a seed→read
  round-trip test pins template and parser agreement.

## [0.18.26] - 2026-09-15

### Fixed

- **Split children inherit the full review mode.** The heir parser
  truncated multi-word modes (`Product Spec + Interface + Tech Review`
  degraded to `Product`, matching no gate) and the card-detail reader
  missed the indented config block entirely. One shared
  `parseWorkflowConfig` in `lib/` serves both, whole values only.
- **Archived threads keep their card link.** The thread header's Stelow
  card button no longer disappears when the card archives — the relation
  outlives the board position.

## [0.18.25] - 2026-09-15

### Fixed

- **Standard scope questions state their consequence.** A scope-picking
  question at triage/select read like a split decision but executed
  nothing. The host now appends a consequence disclosure (scope-only,
  creates no cards, Propose split stays available) to every standard ask
  at the shared gate — live form and persisted rows alike, regardless of
  worker wording.

## [0.18.24] - 2026-09-15

### Fixed

- **Split decides once, in `lib/`.** The stage pair and refusal strings
  were pasted at three call sites, the trigger read the DB cache while the
  executor read state.md truth, and live/expired answers carried duplicate
  recording blocks. One shared gate (`splitEligibility`,
  `splitActionState`, `recordSplitAnswer` in `lib/split-proposal.mjs`,
  covered against a real database) now serves the worker ask, the
  executor, the human trigger, and the card flag — the UI renders the
  server flag instead of local stage rules, and the trigger also refuses
  while a question pends. The trigger nudge is a pointer to
  `SPLIT_PROTOCOL`, not a second copy. Removed the dead `ask` RPC (no
  callers; the CLI asks through the host directly).

## [0.18.23] - 2026-09-15

### Fixed

- **Split converges three ways.** The spawn prompt forbids hedging with a
  validating standard question, a standard ask answered at triage/select
  reminds the worker with the exact re-ask repair while still legal, and
  the open card offers Propose split at triage/select to drive the worker
  into the protocol on demand. No single worker decision is load-bearing.

## [0.18.22] - 2026-09-15

### Fixed

- **Standard asks at triage/select warn when they can't split.** Answering
  a standard question executes nothing, so a would-be split died silently.
  The ask result now reminds the worker once — while re-asking with
  `--tag split` is still legal — with the exact repair.

### Synced

- **Upstream skills (calionauta/stelow).** Intent pre-check gates the
  strategic ask for refactor/bugfix with a verifiable baseline.

## [0.18.21] - 2026-09-15

### Fixed

- **One pill for one fact on the open card.** In progress collapses while
  the worker is live (the Working activity pill already says it); other
  activities keep both pills. The Workflow map disclosure carries a
  state-explicit chevron instead of relying on a CSS group-open variant.

## [0.18.20] - 2026-09-15

### Fixed

- **Preset dialogs use BB's own provider/model pickers.** The New/Edit
  preset form and the card override custom row dropped their hand-rolled
  provider/model selects for the host pickers (live catalog with search,
  same as the new-card composer) through one shared block. The Manage
  agent presets modal no longer overflows the viewport: band routing hides
  behind a disclosure and the frame scrolls.

## [0.18.19] - 2026-09-15

### Fixed

- **Draft no longer renders a second pill.** Draft always pairs with the
  triage checkpoint, so the Draft pill duplicated what the column already
  said. Draft cards now show the single column pill like completed ones;
  the stored status is untouched.

## [0.18.18] - 2026-09-15

### Fixed

- **The provider/model picked when opening a card is honored.** The
  creation dialogs dropped the composer's choice and spawned the worker on
  the band/default preset, so a card opened with e.g. acp-opencode still
  ran on pi. The choice is now forwarded to the spawn — a differing choice
  is pinned as the card's preset override, so restarts and reseeds keep
  running what was picked.

## [0.18.17] - 2026-09-15

### Changed

- **Tiles signal, the open card explains.** Board and list tiles no longer
  render the failure body or a retry action: a failed tile shows the Failed
  chip (reason one hover away) plus the usual attention border. The full
  error text and its retry live only in the open card's hero.

## [0.18.16] - 2026-09-15

### Fixed

- **The thread-header card button matches host chrome.** It renders the
  shared small outline button (h-8, self-centered) instead of a taller
  custom button that filled the whole header bar height.
- **The Draft pill explains itself.** Its tooltip now reads "Fresh card —
  still in triage, not yet admitted to the workflow" instead of the
  generic status help.

## [0.18.15] - 2026-09-15

### Fixed

- **The open card offers Retry beside a live question on failure.** The
  decision hero already named the concurrent error and offered Open
  thread; it now also offers Retry worker as an alternative to answering,
  in all three track detail bodies.

## [0.18.14] - 2026-09-15

### Fixed

- **Failures are named where the Failed chip appears.** Tiles render the
  worker error text in a Failed row; an open card in the decision state
  names a concurrent error inside the hero (answering resumes the worker)
  and always offers Open thread — no more unexplained chip.
- **Answering clears the interrupted turn's failure.** Both live and
  recovered answer paths reset `last_error`, and an error arriving while
  a question is open is superseded at birth, so one card counts once in
  the badge and Needs attention.

### Changed

- **Retry is a compact icon action on tiles.** The wide labeled button left
  the heading; the error row carries an icon-sized `↻` at its right edge
  with a full accessible name. It renders only when a live thread on a
  non-terminal card can act — never a dead button on Done or thread-less
  cards.

## [0.18.13] - 2026-09-15

### Changed

- **Start new issue preferences are compact rows, not a wall of cards.**
  Planning depth and Pause for my review each render as one summary row
  (title plus current value, always visible) that expands into the full
  radio cards on tap. Discovery without the nine-card scroll; the expanded
  options reuse the same accessible radio renderer.

## [0.18.12] - 2026-09-15

### Changed

- **Start new issue shows its workflow preferences openly.** Planning
  depth and review checkpoints render expanded under the composer instead
  of behind a collapsed Settings toggle, with consequence-first copy
  (what deeper planning costs, what a pause guarantees) and the board
  defaults framed as keep-or-adjust. The dialog keeps a fixed max height
  with inner scroll, so the frame never resizes.

## [0.18.11] - 2026-09-15

### Fixed

- **One card, one count — even when it errors with a question open.** An
  open question now supersedes a concurrent raw error report the same way
  it already absorbed generic paused notices. The error row survives in
  Resolved history; the badge and Needs attention list show the single
  actionable decision.

## [0.18.10] - 2026-09-15

### Fixed

- **Split completion is calm and legible.** Selecting every delivery now
  shows an accessible informational state instead of destructive-red text on
  an amber question surface.
- **Recovered answers no longer carry timeout jargon.** They reuse the normal
  answer continuation and say only that the user answered a pending question.
- **Question choice identity is protected.** The host rejects Portuguese
  structured question content before it can create a card form whose labels
  disagree with the split proposal.

## [0.18.9] - 2026-09-14

### Fixed

- **Structured card questions are English-only.** Question text, choices,
  recovery state, split guidance, and actions now use one product language.
  The worker cannot select a per-question locale, and the UI never guesses or
  translates arbitrary content.
- **Recovered questions are concise.** A pending recovered decision is now
  marked simply as “Waiting for you”; redundant timeout explanation and the
  duplicate answer-needed heading are removed.

## [0.18.8] - 2026-09-14

### Changed

- **Question language is now an explicit agent decision.** English is the
  default for every new structured ask. A worker deliberately opts into
  Portuguese with `--locale pt-BR` only when matching a Portuguese user
  request; the card controls, recovery explanation, and split consequences
  read that stored locale instead of guessing from visible text. Existing
  questions without metadata retain a compatibility fallback.

## [0.18.7] - 2026-09-14

### Fixed

- **Upgrade migration compatibility.** The explicit question-kind column is
  now added as a new migration instead of altering an already-recorded table
  migration, so managed installations can activate the recovery UI update.

## [0.18.6] - 2026-09-14

### Fixed

- **Recovered questions are now clear, calm, and language-consistent.** The
  card no longer leaks the technical “Timed-out question” label or repeats it.
  It explains that the original interactive prompt was interrupted, that there
  is no response deadline, and that answering resumes work. Question controls,
  recovery copy, and split outcomes follow the language of the question.
- **Split prompts no longer contradict or repeat themselves.** Legacy
  Portuguese wording is repaired on display, the separate “keep” choice is
  translated without changing its stored answer identity, and the outcome is
  stated once beside the choices.

### Changed

- **Question kinds are explicit.** `standard` and `split` now travel through
  live interactions and durable recovery instead of inferring split behavior
  from the visible “Keep as one card” label. Existing recovered questions keep
  the safe legacy fallback.

## [0.18.5] - 2026-09-14

### Changed

- **Split consequences now respond to the selection.** The card tells you
  before submission whether it will retain the remainder or archive after all
  deliveries become child cards.
- **Inbox adds a secondary Unread only view.** It works within each lifecycle
  tab while the primary attention badge continues to count unresolved work,
  whether read or not.

## [0.18.4] - 2026-09-14

### Fixed

- **Timed-out split decisions now recover completely.** The card upgrades
  legacy question copy when it renders, retains every multiple-choice value,
  and records the approved slices before resuming the worker. Selecting all
  deliveries now explicitly explains that the parent archives after the child
  cards are created.

## [0.18.3] - 2026-09-14

### Fixed

- **One attention need, one Inbox count.** A visible structured question now
  supersedes generic paused notices on the same card. The Inbox and its badge
  show the actionable question rather than duplicate signals for one task.
- **Split question choices no longer contradict each other.** “Keep as one
  card” is a visually separated, exclusive alternative to selecting delivery
  cards; consequence copy is concise and not repeated for every option.

## [0.18.2] - 2026-09-14

### Fixed

- **Lost questions cannot strand a card.** An agent now treats only a visible
  structured card form (or its durable timeout recovery) as pending. Stale
  split-proposal metadata and earlier chat messages no longer cause an agent
  to claim it is waiting for an invisible question; the host separately
  prevents duplicate real forms.

## [0.18.1] - 2026-09-14

### Changed

- **Cards and questions stay readable.** Board and list cards now give long
  titles their own wrapping row, label the status below, and place Resume or
  Retry in a separate touch-sized action row — no title, status, or recovery
  control competes for horizontal space. Split proposals explain their consequence before answer:
  selected deliveries become child cards, unselected work stays on the
  parent, and “Keep as one card” vetoes the split. Their choice controls use
  high-contrast boxes.
- **Settings and asks are more resilient.** New-card Settings starts closed
  and visually contains its vertical workflow preferences. `bb stelow ask`
  accepts `--multiple` before its first `--question`, including after
  `--tag split`.
- **Inbox labels and counts agree.** The primary list is now **Needs
  attention**, and it shows the exact unresolved actions counted by the
  sidebar badge even after one has been opened. Completed work remains in
  history and never creates a misleading action count.

## [0.18.0] - 2026-09-14

### Added

- **Resolved says how.** Inbox resolutions record their reason
  (`resolved_reason`: answered, superseded, resumed, completed, archived)
  and each Resolved row names it ("Answered by you", "Recovered on its
  own"…); the filter explains why the tab exists. Legacy rows keep the
  generic kind label.
- **Settings open by default, as radio cards.** Planning depth and "Pause
  for my review" (renamed — the board's Review column is the agent's own
  automatic check) render every option visibly with real radio inputs and
  min-h-11 targets. One shared chevron affordance across all eight
  collapsibles.

## [0.17.1] - 2026-09-14

### Fixed

- **No 404 links.** On GitHub shows only for branches proven to exist
  remotely (finished push or existing PR) — a failed first push no longer
  links nowhere. Ended shells admit "outcome unknown" instead of claiming
  unpushed.

## [0.17.0] - 2026-09-14

### Added

- **On GitHub links.** After a push, the card links View branch and Open
  pull request (compare), built from git's own `To <url>` line via
  `lib/remote-url` — the SDK exposes no remote URL. GitHub-only by design.

### Fixed

- **Git Changes decluttered.** Saved → Publish → On GitHub sections with
  one-line statuses and dedicated button rows; no call-to-action hides
  inside prose anymore, and the outcome line states the remote truth.

## [0.16.5] - 2026-09-14

### Added

- **Sync & push.** Rejected pushes get a one-click remediation where the
  failure is shown: `pull --rebase` then `push`, with per-step sentinels.
  Conflicts abort automatically with the checkout unchanged. Offered on
  failed shells and whenever the branch is behind — no sidebar trip.

### Fixed

- **Copy that actually copies.** The Clipboard API alone fails in some
  panel contexts; copy now falls back to the legacy path, and the final
  error carries the value so it stays copyable. Copy terminal ID names
  where the ID is used (BB's sidebar terminal panel).

## [0.16.4] - 2026-09-14

### Fixed

- **One active push shell.** Each Push now created a shell, stacking into
  an unreadable list. A push in flight now blocks duplicates ("already
  running — Check result"); retired finished/waiting shells are closed on
  the next run.
- **Honest push header.** "Push shells" + ghost "Check result" read as one
  phrase with an invisible button. Title and action are separated, Check
  result is outlined, each shell carries Copy terminal ID, and the output
  is labeled a snapshot (the embedded view is not interactive — the SDK
  exposes no terminal reveal or embed).
- **Ended shells stop lying.** Exited shells with gone scrollback reported
  "Running"; they report Ended now.

## [0.16.3] - 2026-09-14

### Fixed

- **Push now runs itself.** "Open push terminal" promised a reveal BB never
  performs, and typed-but-unsent output read as executed. The confirmed
  action now runs `git push` in the card's checkout (exit marker
  `STELOW_PUSH_EXIT`) and streams the named outcome into Push shells —
  ✓ Pushed, ✗ Push failed, … Running, ○ Waiting for legacy typed-only
  shells — with an automatic result refresh after each run.

## [0.16.2] - 2026-09-14

### Fixed

- **Push shells stay visible.** BB never auto-reveals a new shell, so the
  toast alone left users hunting the sidebar scope filter — and a swallowed
  typing failure reported success with an empty shell. The panel now tracks
  push shells with live output and a Check result refresh
  (`publicationPushTerminals`), names the shell id in the toast, and fails
  loudly when `git push` cannot be typed.

## [0.16.1] - 2026-09-14

### Fixed

- **Push shell stays open.** Command-mode terminals exited in ~1s —
  invisible, with no scrollback. The panel now opens an interactive shell
  in the card's own environment with `git push` typed and ready: the user
  reviews it and presses Enter, and a behind-branch warns before opening.
- **Done never asks for attention.** Background sync could re-error a
  completed card after it finished (e.g. a cleaned-up state dir), so the
  board showed needs-attention + Retry while the detail calmly showed
  Done. Sync now never writes terminal cards, stale errors never flag
  attention on them, and Retry is refused there — reopen via comment or
  restart fresh instead.

## [0.16.0] - 2026-09-14

### Added

- **Push in a visible terminal.** BB exposes no push action, so instead of
  pushing silently the panel opens a terminal in the card's own worker
  environment running `git push`, with the output watched live. The action
  is confirmed first and recorded in publication history.

## [0.15.1] - 2026-09-14

### Fixed

- **Generic post-commit steps.** The "what remains" guidance no longer
  assumes the card's project is this plugin itself: push, then pull
  request via the provider or BB's native flow.

## [0.15.0] - 2026-09-14

### Added

- **Focus return.** Esc (or Back) leaves the card detail with that card
  focused on the board, so keyboard users never lose their place.
- **Command chips.** Post-commit commands render as code chips with
  "Copy command" buttons that name what they copy.

### Fixed

- **Done-but-dirty review.** Completed cards with fresh uncommitted changes
  show the Diff panel again for evaluation, while the commit action stays
  in Git changes: evaluate in Diff, act in Git changes.

## [0.14.0] - 2026-09-14

### Added

- **Commit file accordions.** Each file in the commit viewer renders
  collapsed with its change stats, plus expand/collapse all.
- **Post-commit next steps.** The saved-commit state discloses what remains
  (push, tag, plugin update) with copyable commands, since the panel
  cannot push and the running plugin follows tags, not branches.

### Fixed

- **Diff vs Git changes paranoia.** The Diff review panel now shows only on
  active diff-gate/audit cards; completed cards keep Git changes alone.

## [0.13.2] - 2026-09-14

### Fixed

- **Gap audit of 0.13.0/0.13.1.** The W shortcut now also works from
  list-view rows, not only board cards. Commit-diff patch failures are
  logged server-side for diagnosis instead of swallowed. The truncation
  notice no longer blames BB's safety limit when the plugin's own fetch
  cap applies.

## [0.13.1] - 2026-09-14

### Fixed

- **Commit viewer actually shows patches.** Commit targets carry no inline
  patches from BB even with `loadMode: auto`, so the viewer fetched nothing
  and every file read as unavailable. It now fetches every missing file
  patch via `environments.diffPatch` (bounded, fail-soft) and renders them
  in BB's native diff viewer.

## [0.13.0] - 2026-09-14

### Added

- **Card keyboard shortcut.** W on a focused card opens its worker thread;
  Enter/Space still opens the card detail. Bound to the card surface only,
  so typing in nested controls never navigates.
- **Complete CLI reference.** The README now documents all 16 `bb stelow`
  subcommands, including `done`, `verify`, `doctor`, `split`, `preview`,
  `playbook`, `fan-out`, and `seed`.

### Fixed

- **README accuracy.** Removed stale claims (first-run tours, `@workflow-name`
  mentions, a second-database denial that contradicted the board store),
  corrected Explore to pick a technique rather than a workflow stage, fixed
  the Analyze spelling, refreshed install pins, and pointed details at
  FEATURES.md.

## [0.12.0] - 2026-09-14

### Added

- **Precise stage definition links.** Stages owned by the orchestrator now
  link directly at their behavior doc (`stages/*.md`); dedicated skills
  link at the skill root. The contract test verifies every linked doc is
  vendored, so an upstream rename breaks CI instead of silently rotting.

### Fixed

- **Timeline spacing.** Per-pill info icons are removed; pills keep their
  original spacing and their rerun/advance meaning. Skill ownership moved
  into pill tooltips and a richer Workflow map disclosure that works on
  desktop and mobile.
- **Commit viewer patches.** Files BB marks `on_demand` are now fetched via
  `environments.diffPatch` and rendered in BB's diff viewer instead of
  showing as unavailable. Only genuinely `too_large` files keep an honest
  unrenderable message.

## [0.11.0] - 2026-09-14

### Added

- **Upstream skill transparency.** Every workflow stage now names its owning
  Stelow skill in the single stage catalog, with one URL builder pointing at
  the upstream repository. Each timeline pill carries a sibling ⓘ link to
  that skill, and the Workflow map lists every stage with its definition
  link. Pill clicks keep their rerun/advance meaning and never navigate
  away.

## [0.10.1] - 2026-09-14

### Fixed

- **Single board topology.** Build phases, terminal columns, column labels,
  manual phase-entry checkpoints, and the stage-to-board projection now share
  one vocabulary. The move RPC, board UI, and tests consume it rather than
  carrying parallel literal lists.
- **Reopened completion state.** A new card comment or direct worker-thread
  turn on a completed card immediately returns it to In progress while
  preserving the state-file-owned checkpoint until the worker advances it.
  This removes the stale “Saved locally” publication presentation as soon as
  new work begins.
- **Timeline consistency.** The current checkpoint is disabled for every
  active workflow stage, not only a completed card's retained Audit record.

## [0.10.0] - 2026-09-14

### Added

- **Native local-commit review.** Done cards now expose an explicit saved
  state, copyable SHA, and read-only commit-diff viewer powered by BB's
  environment API. It works before a push and permits only commits recorded
  in that card's publication history.
- **Workflow map.** The progress disclosure now explains the relationship
  between phases, stages, the Done outcome, and the cross-cutting Needs
  attention signal.

### Fixed

- **Terminal timeline semantics.** A completed card retains Audit as its
  verification record but cannot reopen it by clicking the current checkpoint;
  archived cards render a read-only timeline.
- **Local-save feedback.** A clean workspace after a local commit no longer
  leaves a misleading disabled primary action. It clearly states the branch,
  whether the saved commit is current local HEAD, and that no remote push or
  merge occurred.

## [0.9.7] - 2026-09-14

### Fixed

- **Completion/watchdog consistency.** A completed Build card is now an
  explicit watchdog stop condition. Its stored `audit` stage remains the
  completion record, while Done-card copy and list rows describe it as
  completed verification rather than active audit work.
- **Verified Done invariant.** Dragging a Build card to Done and manually
  advancing it to Audit can no longer bypass `bb stelow done`; only the
  verified completion command records a Build card as complete.

## [0.9.6] - 2026-09-14

### Fixed

- **Release regression test.** The auto-continuation contract now also asserts
  that host-generated nudges remain agent-only, preventing a future change
  from putting workflow mechanics back into a card conversation.

## [0.9.5] - 2026-09-14

### Fixed

- **Honest Git-change controls.** Done cards now call a default-branch action
  “Save local commit” and state that BB cannot fetch, merge incoming remote
  changes, push, or create a pull request from that panel. Squash integration
  is hidden behind an explained Advanced Git operations disclosure and is not
  offered for a checkout already on the default branch.
- **Private workflow recovery.** Automatic audit and continuation instructions
  are now agent-only. They continue to recover a worker that stopped before
  `bb stelow done`, without appearing as an unexplained message in the card
  conversation.

## [0.9.4] - 2026-09-14

### Fixed

- **Accurate default-branch wording.** Done-card confirmation now describes
  exactly what BB's API guarantees: a host-side commit. It does not imply a
  push where the repository's configured Git policy has not done one.

## [0.9.3] - 2026-09-14

### Fixed

- **BB checkout choice and default-branch publishing.** New cards now retain
  the environment and branch selected in BB's composer across worker handoffs.
  A completed card using that selected default checkout can commit through BB
  after an explicit direct-commit confirmation; PR controls remain restricted
  to feature branches.

## [0.9.2] - 2026-09-14

### Fixed

- **Completed worker preset copy.** Done cards now show the preset recorded
  for their completed worker, rather than describing the terminal audit stage
  as a future worker configuration.

## [0.9.1] - 2026-09-14

### Fixed

- **Publication action safety.** Done-card pull-request controls now respect
  the same checked-out feature-branch policy as commits and local merges, and
  only offer the state transition that applies to the current PR. A local
  squash attempt is recorded in publication history only after BB confirms it
  merged. Confirmation dialogs also lock while BB handles a request, avoiding
  accidental duplicate writes.

## [0.9.0] - 2026-09-13

### Added

- **Done-card publication controls.** Completed cards now inspect the exact
  BB worker checkout before offering manual publication actions. The panel
  can commit through BB, show and transition an existing pull request, request
  a guarded PR merge, or explicitly squash merge locally. Default branches,
  detached checkouts, non-Git folders, unavailable hosts, missing approvals,
  failing checks, and non-mergeable PRs fail closed with actionable guidance.
  Publication history is recorded independently from the workflow's Done
  status.

## [0.8.1] - 2026-09-13

### Fixed

- **Split parent lifecycle.** A fully approved split now archives and stops
  the parent worker atomically, so an archived card cannot keep consuming
  agent turns.

## [0.8.0] - 2026-09-13

### Added

- **Exceptional card splitting.** Triage — or Choose work before its
  choice is committed — can offer a human-approved, multi-select split
  only for substantial, independently auditable deliverables. The default
  is one focused card with scopes: bullets, files, UI/API slices,
  sequential steps, and small fixes stay together. The host, never the
  worker, creates the approved child cards and preserves their lineage;
  "Keep as one card" is always available.

## [0.7.2] - 2026-09-13

### Fixed

- **Terminal timeline.** Finished cards kept the last stage lit and
  pulsing as if work were still there. All reached stages read passed,
  nothing is current, the hint says the workflow is complete.
- **Select stage label.** "Pick intent" → "Choose work": the stage picks
  which triage item becomes the workflow, never the intent category.

## [0.7.1] - 2026-09-13

### Fixed

- **Select stage label.** It read "Pick intent" while the stage picks a
  triage inbox item (intent was already classified in triage). Now
  "Pick item".

## [0.7.0] - 2026-09-13

### Changed

- **BREAKING (alpha): migration machinery removed.** The one-pass
  `pw-` → `sw-` boot migration ran everywhere it needed to and is
  deleted — no compat shims for dead prefixes, no legacy branches.
  Installs that never ran v0.6.x keep working (resolution never matched
  on prefix), but old `pw-` state is no longer renamed automatically.
- **Vendored helper synced** to upstream (native `sw-` generation).

## [0.6.2] - 2026-09-13

### Fixed

- **Shared-seed reunion.** Two cards seeded from one hash migrate as one
  directory: the first renames it, the second adopts the already-migrated
  hash with a metadata-only update instead of stalling on a gone source.

## [0.6.1] - 2026-09-13

### Fixed

- **Legacy migration fallback.** Tracking entries seeded before the
  immutable-owner scheme carry no `workflowId`, so nine archived cards
  kept `pw-` hashes after the v0.6.0 move. They now match by their
  unique stored hash; owner-keyed entries keep the strict path.

## [0.6.0] - 2026-09-13

### Added

- **Stelow identity prefix (`sw-`).** Per-workflow state dirs, cardless
  workflow ids, and both generators share one prefix. A boot migration
  renames existing `pw-` dirs, approvals, and both indexes exactly once
  (idempotent, fail-soft per card). Upstream `scripts/stelow` aligned in
  the same release.
- **Done-nudge at audit.** The audit-idle auto-complete inference is
  removed: an audit-idle worker is resumed with the done instruction
  (`shouldDoneNudge`, max 2), then pauses with the instruction on the
  card. Completed cards read "Done — ready to review".
- **Preview reliability.** A start that never announces an address fails
  after 60s with its log attached; the log opens itself while starting
  or failed, with a live elapsed clock; `previewShare` RPC backs a
  working "Share this port" retry.
- **Stage visibility.** Closed build cards name their stage (timeline
  tone + breathe pulse) instead of a bare "Working"; the open card's
  current stage pulses with the same effect. Preview moves above "What
  is happening"; Start/Stop/Refresh share one button pattern; copy is an
  in-input icon button; every preview button is pointer-shaped; pairing
  hints navigate to the pairing dashboard instead of highlighting dead
  text.

## [0.5.0] - 2026-09-13

### Added

- **Explicit completion (`bb stelow done`).** Done-ness was inferred from
  `audit` + idle. The worker commits; the host verifies in code (build
  only at `audit`, research/explore only with a passing `verify` and no
  pending question). Every refusal names the fix.
- **Host-served playbook (`bb stelow playbook`).** Exact state,
  transitions, and stage-playbook paths per card — no more
  `skill list | awk` discovery pipelines. Missing files fail loud.

### Fixed

- **Preset fence.** `preset add/remove/assign` refuse card workers;
  `preset list` stays open.
- **Prompt completion clause.** `DONE_PROTOCOL` is a single-source const
  referenced by all five card spawn paths, pinned by the prompt-contract
  test.

## [0.4.11] - 2026-09-13

### Fixed

- **Prompt clauses are single-source.** The seed ban and turn discipline
  were pasted per prompt and the band-swap restart prompt carried neither.
  Both are now consts referenced by all three build spawn paths, pinned by
  a prompt-contract test; `CLI_EQUIVALENTS` no longer routes workers to
  seed.
- **Narrower advance scan.** The finished-turn scan reads turn boundaries
  and completions only (limit 100) instead of the last 40 unfiltered
  events.

## [0.4.10] - 2026-09-13

### Fixed

- **Silent turns that advanced the stage resume too.** Text-only progress
  missed tool-only turns: a worker could run `bb stelow advance` to
  completion and idle without narrating, leaving the chat text unchanged
  and the watchdog quiet. The idle branch now scans the finished turn's
  events for a completed advance (scoped to the last turn boundary;
  `--dry-run`/`--help` probes excluded, `lib/auto-continue.mjs`
  `lastTurnAdvancedStages`). A user-stopped thread whose final partial
  turn advanced nothing still stays paused.

## [0.4.9] - 2026-09-13

### Fixed

- **A card worker can no longer seed an orphan workflow.** `bb stelow seed`
  from inside a card thread minted a name-derived owner at the project root
  that no card resolves back. The seed CLI now refuses card workers with
  the card's own state dir as the redirect (`lib/card-seed-guard.mjs`),
  and the spawn/reseed prompts state the workflow is pre-seeded.
- **A chatty worker no longer idles after every stage.** The provider ends a
  turn on any final text, so a progress report parked the card until a human
  Resume. The host now resumes the worker in place while the finished turn
  left fresh output or stage progress (`lib/auto-continue.mjs`, budget of 10
  consecutive resumes per stage, never past a pending question or `audit`).
  Silent stops and exhausted budgets still surface as paused with exactly
  one inbox event per idle period; manual Retry/Restart reset the budget.
  Spawn/reseed prompts teach the turn discipline that prevents the stop.

## [0.4.8] - 2026-09-13

### Fixed

- **The preview is on the card you actually build.** The section was mounted in
  the research and explore bodies only, so the one card the feature exists for —
  a build card whose workspace is a web app — never offered it. It is now on all
  three tracks.
- **A log line cannot fail a running preview.** The failure patterns were
  re-checked against the whole log for as long as the process lived, so any
  later line that merely read like a startup error (`not found:`, `cannot find`)
  flipped a working server to Failed. Failure is now judged while the server is
  starting; once it is up, output is a log and not a verdict.
- **A card whose checkout moved gets its own server.** Sessions were also found
  by card id, so after a worktree was recreated the panel could show the
  previous directory's server, and a Stop could report success without stopping
  the one that was actually running. A session is now found by the checkout it
  serves, and nothing else.
- **Stop releases the share and forgets the run.** The port's Connect share was
  released only when the session happened to record that it had been exposed,
  and stopped sessions stayed in memory for the life of the process.

### Changed

- **The preview lifecycle moved to `lib/preview-runtime.mjs`.** Which checkout
  owns a server, when it becomes ready, what is released on stop or dispose —
  all of it was inline in a `server.ts` handler, which is what `AGENTS.md`
  forbids and what made the old wiring test grep the source for strings. Every
  effect (read, spawn, connect) is injected, so the whole lifecycle runs in
  tests against a fake process and `server.ts` only supplies the effects.
- **One Connect client.** Three hand-rolled `bb connect … --json` calls, each
  with its own copy of the same brace-matching JSON extraction, are now one.
- **One definition of loopback.** `preview-detect` re-implemented the
  bind-address-to-browse-address mapping; it now uses the canonical helper in
  `preview-reach`, which also reads a bracketed IPv6 host correctly.
- **Dead surface removed:** the unreachable `localOnly` reach branch (nothing
  could set it), two unreachable hint branches with their unused parameters,
  `reachLabel`, and the hand-copied state list that duplicated
  `PREVIEW_STATES` — which the RPC contract now validates against directly.
- **`previewStart`/`previewStop` return `{ ok, error }`.** The extra `state`
  field was never read: every caller re-reads the view, which is the one
  renderer the panel and the CLI share.
- **`FEATURES.md`** now lists Preview, which the feature never added — a
  user-facing feature without an entry does not exist.

## [0.4.7] - 2026-09-13

### Fixed

- **An app in a subdirectory is found.** Probing the workspace root only meant a
  finished deliverable reported "No web app detected" whenever the agent had
  created it in a folder of its own — which is what agents do. Detection now
  descends exactly one level, and picks a directory by convention: the one named
  after the card first (agents name the folder after the work), a single
  candidate second, and otherwise nothing rather than a guess —
  `.stelow/preview.json` stays the way to name one.
- **A self-contained page is a deliverable.** A lone `index.html` was offered
  only when a caller asked for it, so the simplest possible product had no
  preview at all. It is now detected, served from **its own directory** (so
  nothing above it is exposed) and bound to loopback.

## [0.4.6] - 2026-09-13

### Added

- **Preview: run a card's web app and look at it, from the card.** A card whose
  workspace is a web app now offers a Preview section — it detects the stack
  (Next, Vite, Astro, Nuxt, SvelteKit, Remix, CRA, Go via `make`/`go run`,
  Django, FastAPI, Flask, Streamlit), picks the command and the port, starts the
  server on loopback, waits for the address the server announces in its own
  output, and shows it inline with an always-visible "Open in a new tab".
  Detection is convention over configuration: nothing to configure, and
  `.stelow/preview.json` (`command`, `port`, `url`) is the only override.
- **A reachable address, without Tailscale or a port hand-off.** The address
  ladder is the project's declared `url`, then a **bb connect share URL** (bb's
  own sanctioned remote route — `bb connect expose`, unexposed when the server
  stops), then loopback. An unpaired server keeps working at localhost and the
  panel says exactly that, instead of failing. A same-origin proxy was evaluated
  and rejected: `bb.http.route` is exact-match, so arbitrary dev-server asset
  paths cannot be forwarded.
- **Transparency for everything that runs.** The panel always shows the exact
  command, the port, the checkout, and which checkout it is — the **worker's own
  worktree when it exists** (a `new-worktree` card runs there, not in the
  project source), else the project source. A bounded server log is one click
  away.
- **One preview per checkout, never per card.** Two cards on one project's
  source are the same code, so they share one server instead of racing for the
  same port. A restart reuses the same port, so a bookmarked address stays
  valid, and at most three run at once so a machine cannot accumulate servers
  nobody is watching.
- **`bb stelow preview [status|start|stop] [--card <id>] [--json]`**, sharing the
  same view the panel renders, so the CLI and the UI can never describe a run
  differently.

### Security

- **The panel never frames this app's own origin.** A dev preview is framed with
  `allow-same-origin` so the app under test keeps its own storage and cookies;
  that is safe only while the framed document is a different origin, so
  `previewFrameVerdict` refuses a same-origin address outright. It also refuses
  to embed when the app itself refuses framing (Django's default) or when an
  https client cannot mix a plain-http origin.
- **Dev servers bind loopback only.** A server bound to every interface would be
  reachable without the account gate that makes a Connect share safe.

## [0.4.5] - 2026-09-12

### Changed

- **A seeded workflow owner is named like everything else.** A workflow a
  human seeds now carries `sw_<name>` instead of `wf-<name>`, in the same shape
  as the ids the host mints (`card_…`, `proj_…`, `thr_…`) and readable as
  "a stelow workflow". A card-owned workflow still carries that card's id, so
  the two can never be confused for one another.
- **Every compatibility path is gone.** Removed: the `delivery` → `build`
  branch and the SQL statement that converged stored rows, the
  `lib/stage-bands.mjs` re-export shim (its consumers read
  `lib/workflow-vocabulary.mjs` directly), and the in-skills sync-state
  migration. An unrecognized stored kind still reads as a build — one
  `normalizeKind` answers that, and nothing else repeats the literals.
- **No "legacy" vocabulary left in the plugin.** Comments, tests, and
  `FEATURES.md` describe what the code does now; nothing points at a previous
  design or calls the current one a fallback. The board's own schema
  migrations stay, because they carry existing cards forward rather than
  keeping an old code path alive.

### Fixed

- **Vendored skills and helper refreshed** to upstream `1.4.5-alpha`, which
  drops the last legacy wording there: a permissions row documenting
  `.stelow/state/current-stage.json` (a file the helper no longer writes), a
  scope-init row blaming a missing `created` timestamp on "legacy behavior",
  and the helper's own header. All 135 vendored files are byte-identical to
  upstream, verified by blob sha.

## [0.4.4] - 2026-09-12

### Changed

- **Seeding by name is idempotent.** `bb stelow seed --name X` derives the
  workflow's owner from the name, so seeding the same workflow again returns
  its own paths instead of adding a look-alike row and a second state
  directory. Workers are told to seed through `bb stelow seed`, which binds the
  owner the raw script cannot.

### Fixed

- **A workflow's state directory never moves.** Re-seeding keeps the workflow's
  first `created` date, and the seed writes the path through the same function
  that later resolves it, so a state directory can no longer be stranded or
  written where no reader looks.
- **The upstream sync spends one request per tick.** Each run fetched the
  GitHub tree twice (once for the skills, once for the helper) against a 60
  request/hour unauthenticated budget, so a busy hour turned into a silent
  "nothing updated". The tree is now shared for a minute — the sync still
  verifies every blob's sha before writing, and the next tick picks up
  anything newer.
- **Vendored skills match upstream again.** The `config get` fix shipped with
  a `read-config.md` still describing the old lookup, because a rate-limited
  sync had failed softly and left the file behind. Every vendored file is now
  byte-identical to `calionauta/stelow@main`, verified by blob sha.
- **The sync self-check reports what actually failed.** Offline and
  rate-limited GitHub is the sync's own fail-soft path, but the check crashed
  the build instead of skipping, because it never saw the sync's error text.
  It now claims network trouble only for network trouble, still fails hard on
  a real defect (missing file, truncated tree, sha mismatch), and verifies the
  vendored helper and skills offline so a skipped run is not a silent one.

## [0.4.3] - 2026-09-12

### Fixed

- **Config reads follow the card.** `bb stelow config get` returned the values
  of whichever workflow came first in the project index, so a worker read
  another card's appetite and review mode — and the review gates that follow
  from them. The vendored helper now resolves this card's own workflow entry by
  owner id, then by its state directory.
- **Vendored helper refreshed** to upstream `1.4.4-alpha`, which also carries
  artifact timestamps in the generated manifest.

## [0.4.2] - 2026-09-12

### Fixed

- **Scopes follow the owner.** Card progress is read through the workflow's
  immutable owner id instead of its name, and the board keeps one summary per
  card instead of one per project. Two cards carrying the same request no
  longer display each other's scopes or task counts.

## [0.4.1] - 2026-09-12

### Fixed

- **Card-owned workflow state.** A workflow now carries an immutable owner id
  in both `stelow.json` and `state.md`; equal names can never reuse another
  card's directory, stage, or artifacts.
- **Fail-closed state reads.** Cards with unverifiable ownership stop with a
  reseed instruction instead of falling back to project-root state.

### Changed

- **Legacy workflows are not adopted.** State written before `0.4.1` carries no
  owner id, so it stays deliberately unverifiable: reseed such a card to give
  it a fresh, owned state directory. Nothing is guessed by name or by a
  matching `dir_hash`.

## [0.4.0] - 2026-09-12

### Added

- **One workflow vocabulary.** Build now consistently speaks in terms of
  workflows, phases, and stages, while Explore calls its independent choices
  techniques.
- **Project-worker handoff.** Promoting work creates a project-owned worker
  while preserving the originating thread's lineage.
- **Quality and security gates.** CI checks quality, generated artifacts, and
  dependency vulnerabilities.

### Fixed

- **Thread continuity after promotion.** Opening a promoted thread now leads
  to its project worker; a failed handoff keeps the original worker active.

## [0.3.80] - 2026-09-12

### Changed

- **Quiet terminal disclosure.** Completed cards no longer show a stale
  stage hint ("Audit") beside "What is happening".

## [0.3.79] - 2026-09-12

### Changed

- **Explore speaks technique, not stage.** The track header, creation
  modal, picker, tags, and sidebar tooltip share one vocabulary with
  Build ("specialized techniques"); data fields keep their names.
- **One list row for all tracks.** Build geometry is the standard;
  strategy/technique context rides the meta line. Kanban tiles untouched.
- **Build header honesty.** Gated pauses read as conditional on the
  review mode (Auto never pauses) instead of promised.

## [0.3.78] - 2026-09-12

### Changed

- **List-view groups collapse.** Build, Research, and Explore lists get
  the kanban toggle treatment per group, persisted per track with
  Archived collapsed by default.
- **Track headers describe outcomes.** Research names the chosen
  strategy; Explore names the single Build stage it runs.
- **Done reads once.** Completed build cards show one Done pill instead
  of Done + Completed, and scopeless completed cards no longer claim the
  agent is still shaping.

## [0.3.77] - 2026-09-12

### Changed

- **Host-neutral comment in question-batch.** No behavior change.

## [0.3.76] - 2026-09-12

### Changed

- **About links the original thermo-nuclear skill.** The npx group row
  now points at `cursor/plugins` instead of showing no link.

## [0.3.75] - 2026-09-12

### Changed

- **About npx group shows no commands.** Usage snippets looked like
  instructions; workers resolve everything, so rows now state that
  instead — plus the thermo-nuclear gate skill. Text links read as links
  (persistent underline).

## [0.3.74] - 2026-09-12

### Added

- **About discloses the npx-resolved dependencies.** A "Ready via npx"
  group lists the skills hub, ctx7, and last30days with usage and consent
  rules — info only, no probe, no buttons.

## [0.3.73] - 2026-09-12

### Changed

- **About lists only tools bb honors.** plannotator never runs inside
  bb (gates resolve in the plugin review UI), so its row, probe, and
  installer are gone; the upstream reference stays linked. Intro copy
  drops the sem/cymbal name-drop (already per-row) and "Install guide"
  becomes the honest "Learn more".

## [0.3.72] - 2026-09-12

### Changed

- **About sync status, demoted to a signal.** The paragraph is now a
  quiet status line (● dot + "N skills · synced X ago") opening the
  vendored inventory grouped Workflow/Product. Installed optional tools
  gained one-click reinstall-as-update.

### Fixed

- **Truncated upstream trees refuse the sync.** A partial GitHub tree
  could previously prune valid local skills as "retired"; fail-soft now
  keeps everything instead.

## [0.3.71] - 2026-09-12

### Changed

- **All stelow-* skills ship vendored, not just workflow.** The upstream
  sync discovers every top-level `skills/stelow-*/` directory (product
  playbooks included) and prunes retired names; worker prompts prefer the
  local copy with `npx skills add` as fallback only. Sync state moved to
  the stable plugin data dir (survives managed-install cache rotations)
  and one fail-soft pass runs at boot — About never shows "never" after
  a plugin update again.

## [0.3.70] - 2026-09-12

### Fixed

- **Skills verification age is honest.** The timestamp now advances only
  on fully clean syncs; a partial failure leaves the previous stamp, so
  About shows growing age instead of a fresh lie during outages.

## [0.3.69] - 2026-09-12

### Added

- **About shows upstream-skills freshness.** Every upstream verification
  (changed files or not) records its timestamp, `buildInfo` serves it
  live, and the About tab renders "Workflow skills synced X ago" next to
  the plugin version — the 6h auto-sync is now visible instead of silent.

## [0.3.68] - 2026-09-11

### Fixed

- **Archived terminality, second pass.** Gap analysis found five more
  resuscitation routes the first fix did not cover: `updateCard` re-strips
  against a fresh write-time read (a poll that read before Archive can no
  longer write after it), the sync entry skips archived cards before any
  thread read, and move/advance/answers/comments refuse archived cards
  with the named exit instead of half-executing. Dragging out of Archived
  now explains itself instead of silently no-op'ing.

## [0.3.67] - 2026-09-11

### Fixed

- **Archived cards stay archived.** Stopping the worker after Archive could
  settle late and flip the card back to Done (idle thread + terminal
  `audit` stage = spurious completion). `updateCard` now strips any status
  change out of `archived` in one shared rule, worker-thread events skip
  archived cards, and the Archive button reports a refused archive instead
  of a false success.

### Added

- **Fresh-install safety net.** CI runs typecheck + the full suite on every
  push/PR, and `tests/fresh-install.test.mjs` locks the first-boot
  contract: marketplace entries, every source-root read, packaging
  (`skills/`, `lib/`, `components/`, `hooks/` now ship), and
  fresh/upgrade-safe migrations.

## [0.3.66] - 2026-09-11

### Fixed

- **The About logo now actually renders on managed installs.** bb's builder
  has no image loader and serves only the built `app.js`/`app.css`, so the
  previous runtime `./assets/*.png` URL always 404'd outside a local
  checkout. The mark is now a 512 px asset served lazily as a data URI over
  a new `aboutLogo` RPC (memoized, null-safe with a text fallback), keeping
  the board bundles untouched. The dead `dist/assets` postbuild copy is
  gone; `tests/about-logo.test.mjs` locks the delivery contract, the asset
  budget, and the ban on runtime static-asset URLs.

## [0.3.65] - 2026-09-11

### Fixed

- **The About logo is now delivered with the running plugin.** Assets are
  copied into the runtime bundle and declared in the package, with a
  regression test for both publication contracts.

## [0.3.64] - 2026-09-11

### Added

- **A responsive Stelow identity mark in About.** The centered, transparent
  logo is bundled with the plugin and remains a compact 224–256 px wide,
  leaving the operational boards focused on work.

## [0.3.63] - 2026-09-11

### Changed

- **Boards now explain their agent-led workflow in plain language.** Build,
  Research, and Explore describe the specialized AI skills that run each card
  and preserve the user's role at Build review gates.
- **Kanban columns retain a deliberate reading width.** Open columns stay
  between 240 and 320 px; collapsed columns stay 56 px. A shared layout helper
  keeps Build, Research, and Explore aligned on wide screens.

## [0.3.62] - 2026-09-11

### Changed

- **Card lifecycle regressions now have explicit coverage.** Shared policies
  govern Worker visibility and archived-card presentation; contract tests keep
  the UI and RPC lifecycle rules aligned. The full test command runs them.

## [0.3.61] - 2026-09-11

### Fixed

- **Archived workflow details are clearly historical.** The former live
  progress section now says **Workflow history**, records where the card
  ended, and no longer implies an agent is still shaping it.

## [0.3.60] - 2026-09-11

### Fixed

- **Archived cards now present one terminal state.** Their detail hero says
  **Archived** rather than implying the old workflow phase is still active.

## [0.3.59] - 2026-09-11

### Fixed

- **Archived cards are immutable in the UI.** An archived Build card that
  stopped during triage now shows its workflow type as read-only context,
  never as an editable selector.
- **Worker is omitted when it has nothing to say.** Archived cards without
  worker history, preset controls, or a GitHub link no longer render an empty
  bordered section.

## [0.3.58] - 2026-09-11

### Changed

- **Card actions now live where the card is identified.** A compact
  **Card actions** menu in the detail header holds Restart fresh, Archive,
  and permanent Delete. The Worker section now contains only worker context,
  preset controls, and history.
- **Workflow type is safe after triage.** Build cards can be classified while
  in triage. Afterwards the type is a read-only pill; **Reclassify workflow…**
  starts a fresh worker from triage on the selected route rather than silently
  changing a label beneath an existing plan. Research and Explore never show
  the Build-only type control.

### Fixed

- **Lifecycle updates refresh every open card surface.** Archive, delete, and
  reclassification now publish card state changes, including the thread-panel
  view.

## [0.3.47] - 2026-09-10

### Fixed

- **Card creation works again across all tracks.** Build, Research, and
  Explore shared an INSERT with 25 placeholders for 24 columns. SQL
  placeholders now derive from the canonical column list, with a mismatch
  guard and regression contract test.

## [0.3.46] - 2026-09-10

### Changed

- **Explore always runs at maximum depth.** New explorations seed
  appetite Complete with the strongest review mode (was silent
  Lean/Auto), and the worker prompt carries a depth contract: full
  exploration, every variant the stage offers, ask instead of
  auto-deciding — but never park for approval, since explore has no
  gates and nowhere to advance to. No UI change (there were never
  depth selects on Explore); artifact flow untouched.

## [0.3.45] - 2026-09-10

### Changed

- **About refinements.** Optional-tools rows sorted alphabetically
  with per-tool repository link; plannotator marked as unused in bb
  (gates resolve in the plugin review UI — no install offered);
  section headers bumped to readable size; repo buttons carry the
  GitHub icon.

## [0.3.44] - 2026-09-10

### Added

- **Changed symbols in Diff via `cymbal`.** When installed,
  `cardDiff` lists changed symbols with caller impact (blast radius
  at a glance) below the entity summary — same HEAD baseline,
  same fail-soft rule. Upstream skills also refined: Verification
  sizes review by entities (sem-first) and runs affected tests
  first (`sem impact --tests`); Execution mandates `sg -r` for
  cross-file renames.

## [0.3.43] - 2026-09-10

### Added

- **One-click install per tool in About.** Each optional-tool row has
  an Install button (explicit consent): official installers only,
  everything into `~/.local/bin`, no sudo, success verified by
  re-probe, failures show per-row error + install log. Rows are
  alphabetical with plain-language benefit and technical notes.

## [0.3.42] - 2026-09-10

### Added

- **Optional tools section in About.** Live presence probe (`toolStatus`
  RPC) for sem, cymbal, ripwire, ast-grep and plannotator — each row
  states the capability it unlocks plus the install command, so tools
  can be added later without a setup wizard.

### Fixed

- **Onboarding reset covers presets.** Reset in About cleared three
  track keys but kept the shared presets flag, so the presets step
  never replayed. All four keys clear now. The Build dialog also drops
  the "Step 2 of 2" counter when it opens straight at the defaults
  panel (a counter referencing an unseen step made no sense).

## [0.3.41] - 2026-09-10

### Changed

- **README documents optional host tools.** `sem` is now listed under
  Requirements as the opt-in binary behind the Diff entity summary —
  the plugin never installs binaries itself (fail-soft by design).

## [0.3.40] - 2026-09-10

### Added

- **Entity summary in Diff via `sem`.** When the `sem` binary is
  installed on the host, `cardDiff` heads the patch list with a
  one-line entity summary (added/modified/deleted/renamed/moved,
  cosmetic-only flag) from `sem diff HEAD --format json` — same
  baseline as the git diff, fully local, no cloud. Absent `sem`,
  timeout, or off-shape output degrades to no summary line, never an
  error. Server now ships with `sem` installed (`~/.local/bin`).

## [0.3.39] - 2026-09-10

### Fixed

- **Diff review gaps (code-verified).** `cardDiff` now diffs against
  HEAD — staged changes were invisible before, contradicting the
  "working tree vs HEAD" label. Untracked dirs expand to individual
  files (`-uall`; `skills/` no longer yields a broken Open button),
  git runs at the repo toplevel (root-relative paths), and non-repo
  returns `found:true/isRepo:false` so the UI stops confusing it with
  card-not-found. Fresh repos without HEAD degrade to untracked-only.

## [0.3.38] - 2026-09-10

### Added

- **Diff section on cards.** Working tree vs HEAD per file, rendered
  with bb's own diff viewer (plain-text fallback when the host lacks
  it) — visible at the diff-gate and audit stages, fetched lazily on
  open. Untracked files open in the viewer; clean trees and non-repos
  say so. Read-only throughout.

## [0.3.37] - 2026-09-10

### Fixed

- **About shows the real version again.** The unified plugin root broke
  the build-info lookup (it still probed the old dist-relative paths),
  printing "vdev". Candidates now assume the unified root.

## [0.3.36] - 2026-09-10

### Changed

- **Timeline tells the truth about skipped stages.** Off-route stages
  render struck-through (not in this intent's route); mode-skipped
  stages show ⊘ with the reason (e.g. skipped in Auto). Green now
  means executed — computed per card from its intent + review mode,
  cross-checked against transitions.md in tests.

## [0.3.35] - 2026-09-10

### Changed

- **Timeline artifact badges deep-link with context.** Clicking a
  stage's count opens Artifacts scrolled to that stage's group with a
  highlight ring — no more landing on the bare section top. The
  section now reads as the audit trail (`N files · audit trail`).

## [0.3.34] - 2026-09-10

### Fixed

- **Drag-to-archived stops the worker.** Parking a card via drag used to
  only flip its status, orphaning a live worker on a hidden board. It
  now shares the Archive button's shutdown path.
- **No Archive button on archived cards** (Delete stays as the only
  destructive action there).

## [0.3.33] - 2026-09-10

### Fixed

- **Single status pill at terminals.** Archived/completed build cards
  rendered "Archived Archived" (column + status resolving to the same
  word) — now one pill.
- **Archive button reads Archive everywhere** (was "Archive research"
  on all cards).
- **Timeline pills match Pill density** (`min-h-8`, same metrics as
  status pills instead of 44px targets).

## [0.3.32] - 2026-09-09

### Fixed

- **Bundled installs resolve the plugin root.** Git-managed installs run
  `dist/server.js`, so `import.meta.url` pointed at `dist/` and every
  `skills/` read 404d (ENOENT on transitions.md at card creation).
  The root now resolves to wherever transitions.md lives, covering
  source, bundled, and unknown layouts (fail-open).
- **Research modal trailing void.** The strategy picker's sr-only radio
  inputs (absolute, 1px) escaped their capped scroll list and stretched
  the dialog's scroll area by ~350px — invisible on shorter lists, which
  is why Explore never showed it. The list now contains its absolutely
  positioned descendants.

## [0.3.31] - 2026-09-09

### Fixed

- **Resizing into a narrow viewport no longer crashes the plugin.**
  The compact fullscreen dialog rendered Radix Portal/Content without a
  Radix Root (compact mode omits it), throwing on open-while-narrow and
  on every desktop→narrow resize with a creation modal open — which
  disabled the whole slot for the session. It now renders plain
  portaled divs with the same look plus Escape-to-close.

## [0.3.30] - 2026-09-09

### Added

- **Build onboarding wizard.** The setup dialog gains a second step for
  Planning depth + Review checkpoints as board defaults — presets and
  defaults never share a screen again.
- **Explore owns its preset band.** `explore` joins the band table, so
  all three tracks configure presets independently.

## [0.3.29] - 2026-09-09

### Fixed

- **Thread asks never render an undefined artifact.** Option artifact
  paths normalize through one shared pure function (parser, server,
  thread renderer) instead of three hand-rolled variants.

## [0.3.28] - 2026-09-09

### Added

- **Option details on asks.** Options carry `preview` (inline expandable
  glance) and `artifact` (workspace-relative path opening in the card
  viewer; plain filename in threads). Workers attach per option via
  `--desc/--preview/--artifact`; bad paths degrade silently, never
  block. Shapes mirror upstream `ask-patterns.md` Option schema.

### Changed

- **Question stepper drops tab roles** for group + `aria-current="step"`.

## [0.3.27] - 2026-09-09

### Added

- **Reset onboarding** on the About tab (two-step confirm): clears the
  first-visit flags so every track shows its setup dialog again.
- **Header buttons carry icons** (Plus for creation, Settings for Agent
  Presets, Github for import, Archive for the inbox archive toggle).

### Changed

- **Inbox order:** All-clear empty state first, Resolved history last.

## [0.3.26] - 2026-09-09

### Changed

- **Onboarding says presets, not agents.** Titles now read Choose your
  (research/exploration) agent preset; the Build dialog drops Planning
  depth + Review checkpoints (a separate concern, set per card in
  New issue → Settings).
- **Preset form header is stable.** The New/Edit header with Show/Hide
  always renders; only the body waits on the provider catalog (before,
  a tall spinner swapped in and flashed into the collapsed form).

## [0.3.25] - 2026-09-09

### Fixed

- **One onboarding at a time.** Keep-alive mounts every track, so
  first visit stacked three setup dialogs. The dialog now opens only
  while its own track is active.

## [0.3.24] - 2026-09-09

### Added

- **First-visit setup dialogs** on Build, Research, and Explore: agent
  presets (plus Planning depth + Review checkpoints as board defaults
  on Build), shown once each. Ends with configured state or an
  explicit skip — never passive reading.

### Changed

- **Preset form collapses.** The New-preset form in Manage agent
  presets stays behind Show/Hide; editing auto-expands.
- **Create dialog slims down.** Start new issue drops the preset box
  (Agent Presets lives in the header now); Settings keeps Planning
  depth + Review checkpoints.
- **Question stepper drops tab roles** for group + `aria-current="step"`.

### Removed

- **Track info bars.** The static preset-routing lines on Build,
  Research, and Explore are gone — the setup dialog and the dialogs
  that need the info carry it instead.

## [0.3.23] - 2026-09-09

### Changed

- **Sidebar label reads Stelow • Product Hub.** Short, • separator,
  names the place where everything product-related lives.
- **Track switcher is a nav, not a tablist.** Route navigation gets
  `nav` + `aria-current="page"` (the GitHub repo-tabs pattern) instead
  of tab roles that promised tabpanels and arrow keys routed views
  don't have. Same routes, same keyboard, honest semantics.

## [0.3.21] - 2026-09-09

### Changed

- **Preset buttons say what they manage.** Build/Research/Explore headers
  read Agent Presets, matching the dialog title and the plugin's own
  vocabulary (agent presets everywhere, never bare).

## [0.3.20] - 2026-09-09

### Removed

- **Onboarding tours.** The per-track Tour steppers are gone: audit
  showed half their steps duplicated headers, buttons, and dialogs.
  The three non-discoverable rules survive as static one-liners where
  they apply (preset routing per track, batch answers in the Inbox
  header, append-only rounds in the strategy dialog).

### Fixed

- Research header grammar ("an index").

## [0.3.19] - 2026-09-09

### Fixed

- **Panels no longer flicker on every sync poll.** `updateCard` is now a
  no-op (no write, no `card-state` publish, no `updated_at` bump) when
  no field actually changed — previously every 45s poll reshuffled
  board order, rewrote "Idle since" labels, and reloaded all panels.
  Panel loads also enter the loading state only on first mount, so
  background refreshes update silently instead of blanking to
  skeletons and unmounting the tour.

## [0.3.18] - 2026-09-09

### Changed

- **Dismissed tours collapse in place.** The Tour entry point keeps its
  full-width slot and container in every state — dismissing folds it to
  a one-line box with Show instead of swapping in a relocated button.
- **Build speaks issues.** The creation entry points read New/Start new
  issue (one name for manually created and imported work); the header
  drops the phase list and describes the flow.

## [0.3.17] - 2026-09-09

### Fixed

- **Upstream version available immediately.** `data/stelow-package.json`
  ships snapshotted (byte-identical to the sync source) so About shows
  the Stelow version on fresh installs, not only after the first
  skills sync.

## [0.3.16] - 2026-09-09

### Changed

- **About covers both releases side by side.** The tab now sections
  Stelow (upstream) vs this plugin, each with its own paragraph, repo
  link, and version — the upstream version syncs from the stelow repo
  alongside the skills, so the two can never be confused. Title first,
  tagline after.

## [0.3.15] - 2026-09-09

### Added

- **About tab.** What Stelow is, what each track is for, a Learn-more
  button to the stelow repo, and the running build stamp — product
  identity in exactly one place instead of the Build header.
- **Explore onboarding tour.** The Explore board joins the shared
  first-run Tour (one stage / catalog / artifact), like Inbox, Build,
  and Research.

### Changed

- **Build tab describes itself.** The header now explains the phased
  board (Analyse → Plan → Execute → Review → Done); the generic
  product tagline, About link, and version stamp moved to About.

## [0.3.14] - 2026-09-09

### Added

- **`bb stelow verify` worker self-check.** The deterministic complement
  to prompting: the worker runs the same predicates the sync gate
  enforces before finishing (`PASS` per round, `FAIL` naming the fix,
  `--json` for machines). Research and explore prompts require it;
  prompt, CLI, and sync share one definition of PASS in
  `lib/research-artifacts.mjs`, so the three can never disagree.

## [0.3.13] - 2026-09-09

### Added

- **Explore track.** A fourth tab for single-stage runs: pick one workflow
  stage (Shape Up, interface alternatives, critiques, tech planning,
  testing strategy…), supply the input, get one artifact
  (`explore-<stage>.md`). No triage, no pipeline, no gates. Own catalog
  (`stageCatalog`), card lifecycle (To-Do / Doing / Done), worker prompt,
  completion event, and detail body — all other machinery (board
  components, list view, status pill, inbox, retry/restart/reseed,
  presets) reuses the Research definitions instead of forked copies.

### Changed

- **Card kind `delivery` is now `build`, everywhere.** RPC contract, card
  rows, board copy ("Build board", "build flow", "build cards"), and code
  (`BUILD_PHASES`, `BUILD_TERMINALS`). Legacy rows migrate silently:
  stored `delivery` values read as `build` (`normalizeKind`) and converge
  via a startup `UPDATE`. Track concepts (build / research / explore,
  lightweight columns, worker bands) are centralized in
  `lib/tracks.mjs` — one line to rename or extend.
- **Artifact guarantee is enforced in code, not in prompt text.** Round
  validity (non-empty, substantive, never a mirror of the index) lives in
  `lib/research-artifacts.mjs` (unit-tested); the plugin pre-creates
  every round and explore file at spawn (reseed re-creates after
  wiping), and research readiness requires a reviewable index AND every
  round valid. An index with an invalid round is not Done — each invalid
  round surfaces as an inbox error naming what to re-run. The worker
  prompt states the contract; the sync is what makes it true. (Kept in
  the plugin per `AGENTS.md` owned-vs-vendored rules: `skills/` stays a
  pristine upstream mirror; structure enforcement belongs to the host.)

## [0.3.12] - 2026-09-09

### Changed

- **Sidebar label now reads "Stelow — Product Workflow"** so the panel's
  purpose is explicit in bb's navigation: it is an opinionated product
  workflow (Shape Up, gates, scopes), not a generic task runner.

### Fixed

- **A research round that mirrors the index is never presented as its
  artifact.** When the round file only contains the research index (identical
  content or the index heading), the playbook output was never written — the
  round shows as missing instead of opening the wrong file as if it were the
  round's output.
- **Loose-file scans compose absolute paths from the listed directory.**
  Entries from `files.list` are relative to the listed dir; treating them as
  absolute broke loose-file links and let `research-index.md` / `state.md`
  leak through as loose files.
- **Research completions emit a single inbox event**, and user-initiated
  board moves no longer ping the inbox with a "Completed" notification.
  Previously recorded duplicate generic completions for research cards are
  cleaned up on startup.

## [0.3.11] - 2026-09-09

### Fixed

- **Stable expanded-card scrolling.** Detail views no longer reload from every
  background card-state event; explicit actions refresh only the data they
  changed, preserving the reader's scroll position.
- **More reliable research output writes.** Research workers now label output
  artifacts correctly and are instructed to use native file writing or verify
  one shell write at a time rather than chain fragile heredocs.

## [0.3.10] - 2026-09-09

### Fixed

- **Clear open-card context.** Build card headers now distinguish their board
  column from their workflow status; Research keeps its single shared status.
- **Reliable strategy scrolling.** The full strategy-list area captures
  trackpad scrolling, including gaps between cards.

## [0.3.9] - 2026-09-09

### Changed

- **Visible detail status.** Open card headers now display the current board
  status as a pill for Build and Research.

## [0.3.8] - 2026-09-09

### Fixed

- **Stable track loading.** Build and Research now use page-shaped skeletons
  during their first load, preventing the onboarding, filters, and board from
  visibly assembling as RPC results arrive.
- **Strategy selection.** Follow-up strategy selection persists user choice,
  and strategy cards size to their content with contained scrolling.
- **Concise cards.** Closed cards no longer repeat the board column's status.

## [0.3.7] - 2026-09-09

### Changed

- **Research output labels.** Renamed the clickable output column from
  "Path" to "Artifact".

## [0.3.6] - 2026-09-09

### Fixed

- **No stale review-state behavior.** Removed remaining `researchReady`
  presentation paths and obsolete completion guidance; a completed index is
  represented only by Done.

## [0.3.5] - 2026-09-09

### Changed

- **Research completes directly into Done.** Completed indexes no longer use
  a separate review pill; Done is the single review surface. A new comment on
  a completed research card reopens it in Doing.
- **Selection-first build handoff.** The action is now "Select To Build";
  selection starts empty and only confirmed opportunities create build cards.

## [0.3.4] - 2026-09-09

### Added

- **Clickable research outputs.** The research index now renders
  structurally: Summary as prose, and the Outputs table with its Path
  column resolved to clickable artifact buttons that open the same
  reviewer as build cards (read, quote a passage, comment to the agent).
- **Artifact chips in the thread.** The research worker's final message
  emits `::stelow-artifact` directives per produced file (index + round +
  sub-steps), rendered by bb as clickable chips that open the file in the
  workspace viewer. Directive syntax is stripped before the message is
  mirrored into card comments (plain Markdown there).

### Changed

- **No fake checkboxes in the index.** The opportunities list in the card
  is a status overview — fanned-out items show a ✓ and "fanned out";
  selection happens only in the fan-out dialog.
- **No duplicated Opportunities section.** The raw index body no longer
  renders its own `## Opportunities` list above the interactive panel;
  contract-missing indexes fall back to the body without that section.

## [Unreleased]

## [0.3.3] - 2026-09-09

### Changed

- **Dedicated Worker section right under the hero** (both tracks). Preset
  pill + provider/model, real "Change preset…" outline button, and the
  note about when a preset applies are now one contextual block instead
  of a floating row. Recovery/danger actions (restart fresh, archive,
  delete) sit below a divider inside the same section, with worker
  history collapsed below. The buried Manage accordion below Artifacts
  is gone.

## [0.3.2] - 2026-09-08

### Changed

- **Worker row is always visible under the hero**: preset pill +
  provider/model, a real "Change preset…" outline button, and the
  stale-preset warning with its restart action. Preset no longer hides
  inside the collapsed Manage accordion.
- **Manage is now a danger zone only** (restart fresh, archive, delete)
  with real outline buttons — archive in destructive tone — plus worker
  history.

## [0.3.1] - 2026-09-08

### Changed

- **Strategy contracts come from upstream.** `product-strategies.json`
  syncs like the helper into `data/`; presentation stays local and the
  embedded list stands when the file is absent. Contract drift between
  playbooks and board is now structurally impossible.

## [0.3.0] - 2026-09-08

### Added

- **Research index replaces brief end to end.** `research-index.md`
  (Summary/Outputs/Opportunities) with native round files; output
  contracts (`single`/`variant`/`composite` + JTBD substeps) in the
  strategy registry; missing substeps surface on the card.
- **`bb stelow fan-out`.** Opportunity-ID-only fan-out from workers
  (RPC re-validates); prompt discipline requires structured user
  confirmation first.
- **Ask persist robustness.** Persist errors are logged with
  card/thread context; one retry on lock contention; regression tests;
  operator runbook in README.
- **`bb stelow advance --dry-run/--json`, `bb stelow schema`.**
  Exit codes pass through instead of collapsing.

## [0.2.0] - 2026-09-08

### Added

- **`bb stelow sync-scopes/lock/config` wrappers.** Same workspace/card
  resolution as `advance`/`doctor`; `lock` preserves helper exit codes
  (1 = conflict). Advancing into `execution` auto-syncs scopes
  best-effort, so the vendored Step 2e works without a `scripts/stelow`
  binary in the workspace.
- **Worker prompt equivalents.** Spawn/reseed prompts point at the `bb
  stelow` wrappers wherever vendored skills show `scripts/stelow`
  commands (single shared sentence).
- **Vendored content sync.** Single-source cli-tools, `visual_review.md`
  canonical gate doc, R4 skill splits, fence fixes, link-integrity
  repairs — all propagated from upstream with zero sync errors.
- **Upstream delegation for advance mechanics.** `data/stelow` is now a
  synced copy of upstream `scripts/stelow` (mode-skips, gate refusals
  and non-git roots ported there first); the transitions mirror and its
  fallbacks retire in favor of the vendored copy. New `bb stelow doctor`
  passthrough; workflow contract tests pin template, board order and
  transitions to the same 17 stages.

- **Round files on research cards.** Every strategy round persists its
  native playbook output verbatim (one file per round, one per sub-step
  when a playbook fans out) and registers each in the manifest; the
  card lists rounds newest-first with run status plus unregistered
  state-dir files. `brief.md` stays the fan-out
  aggregator; history carries timestamps.
- **Board/List on both boards.** Research gains the list view; the switch
  is now a quiet shared icon toggle beside the filters (a view
  preference, not a CTA) instead of a boxed segment next to the action
  buttons. The redundant Research empty-state hero is gone — first-run
  guidance lives in the tour.
- **Direct preset access.** Build and Research headers gain a Presets
  button opening the preset manager without starting anything; agent
  configuration in both creation dialogs is now its own block instead
  of inline text.
- **Floating mobile sheets.** Compact dialogs render as floating cards
  with backdrop margins on every side, not edge-to-edge panels.
- **Visual strategy picker.** Choosing a research strategy is now emoji
  radio-cards (name + one-line summary) with instant search over label,
  summary, and keywords — shared by the creation modal and "Explore
  another strategy" (which badges already-ran playbooks). No preselected
  default: Start stays disabled until an explicit pick.

### Fixed

- **Waiting on a question never moves the card.** Opening a structured
  question stored the wait in `status` (`awaiting-answer`), which
  normalized to `pending` — a Doing research card fell back to To-Do
  while the question was open, and the ask transport forced
  `in-progress`, dragging draft Triage cards to Running on their first
  question. One rule now holds on both tracks: a pending question is
  activity only, never board position (`lib/card-question-state`,
  shared by server and board, pinned by a node test). Legacy rows heal
  to `in-progress` on read and are rewritten on the next sync; worker
  prompts and the README no longer promise a "Gate pending" column.
- **Strategy picker on mobile.** The options list no longer nests its
  own scroll region inside the sheet scroll (scroll trap); it expands
  and the sheet scrolls as one column, autofocus is desktop-only so
  the keyboard doesn't cover the list, and a fieldset min-width fix
  removes the horizontal overflow. Disabled rows no longer hover.
- **Blocked submits keep the draft.** A submit rejected for want of a
  strategy (or a failed create) used to resolve successfully from the
  composer's view, wiping what the user typed. Guards now throw so the
  draft is kept, per the composer contract — in both creation dialogs.
- **Ask refuses unknown threads fast.** `bb stelow ask --thread` with an
  id that owns no card (provider session id, dirHash) exited 1 blaming
  storage after showing the question nowhere; now it exits 2 naming the
  fix ($BB_THREAD_ID). Prompts show the literal command, the storage
  message carries the cancel reason, and the sync state file moved out
  of `skills/` (daemon log spam).
- **Failed cards name their cause.** A worker that died before producing
  output (e.g. a provider 400 on the first inference call) left the card
  at Failed with a blank error. The latest `provider/error` detail is now
  resolved once and stored as `last_error`
  (`workerFailureCause`, `lib/worker-failure.mjs`, node-tested), so the
  Failed pill, the detail hero, and the inbox event read
  e.g. `Provider error 400: Internal server error`.
- **One research status everywhere.** A ready brief rendered two competing
  states on the kanban card (`Doing` + `Ready for review`) and no status
  pill at all in the expanded view. `ResearchStatusPill` is now the single
  status on the kanban card, the list row, and the expanded view —
  `Ready for review` replaces the column label when the brief is ready.

### Changed

- **Work track is now Build.** The delivery tab, its `build/card/...`
  routes, and all copy drop the "Work" qualifier ("Build cards",
  "Paused", "Intent", "Settings") — cross-track references read the
  track title from the central `STELOW_TRACKS` table instead of
  hardcoding it. No backward compatibility: old `work/...` links
  fall back to the Build board.

### Added

- **Tour nav visibility.** Back/Next/Done use real button hierarchy
  (Next/Done solid primary, Back outline) in a fixed footer row, so
  tour navigation no longer dissolves into the background.

- **Shared tours for Inbox, Work, and Research.** One `Tour` stepper for
  all three tracks: full steps on first use, a one-line summary bar once
  content exists, a quiet reopen once dismissed (per-track localStorage).
  Every step may carry its own primary action, rendered in the content
  zone while navigation owns a fixed footer row. Inbox teaches with a
  ghost sample row instead of a seeded notification.
- **Unified filters.** `FiltersBar` with optional facets: project +
  attention shared by both boards, delivery adding stage/type/status/
  activity by config. Research drops its forked filter row for the
  identical popover, pills, and checkbox. The popover dismisses on
  outside click or Escape; selections apply live.

- **Work tour.** First-run progressive disclosure on the Work board: a
  3-step tour on the empty state (start work, per-phase agents with the
  live routing, tune later), collapsing to a one-line agent routing bar
  once cards exist. Dismissible, reopenable, persisted in localStorage.
- **Research preset band.** Investigations get their own `research` preset
  default instead of inheriting the analysis band, configured from the
  New research dialog (board default fallback). Spawn, restart, and
  strategy rounds resolve it; `createResearchCard` accepts an optional
  per-investigation `presetId`.

- **Batched question answering.** Workers batch independent questions into
  one `bb stelow ask` call (repeat `--question` groups); the card, the
  artifact viewer, and the thread form answer them in one sitting via a
  stepper with counter, direct jump tabs, radio/checkbox options, a
  free-text Other on every question, and explicit Skip. One atomic submit
  (`answerQuestions` / `answerExpiredQuestions`) resumes the worker once.
  Timed-out questions batch the same way and resume the current worker.
- **GitHub import filters.** The label field offers the alphabetical label
  picker; an assignee dropdown narrows to one person when the GitHub cache
  exposes assignees; per-issue assignees render inline.
- **GitHub completion write-back.** Completed cards imported from an issue
  offer one explicit Manage action: post a factual English summary as an
  issue comment via `gh`, optionally closing the issue. Never automatic.

- **One Stelow panel with track tabs.** Inbox, Work, and Research live
  as tabs under a single Stelow sidebar row (subPath-routed, last tab
  remembered, legacy card links resolve live). Track names, icons, and
  routes come from one table. The sidebar badge counts unresolved inbox
  action items across both tracks; each tab carries its own active
  count.
- **Research track.** A Research tab beside Work and Inbox: To-Do /
  Doing / Done cards with composite strategy rounds on the same request
  (each round appends to `brief.md`, never rewrites), a parsed
  opportunities convention, and fan-out that turns opportunities into
  delivery work cards without duplication.
  Delivery surfaces (stages, gates, intent) refuse on research cards
  with named exits. Covered by brief-parser and strategy unit tests.
- **Turn exploratory work into a project.** Exploratory cards gain a
  "Turn into project…" action that creates a BB project from the card's
  workspace. Files stay in place and the worker continues from the current
  stage; project cards never see the option. Covered by a naming and
  create/adopt/conflict unit test.
- **Scope/task progress everywhere.** Open cards show per-scope n/m task
  counts plus task dependency chips; board and list rows carry scope and
  task done/totals from a per-workspace-cached lookup.

### Fixed

- **Proportional Board/List toggle.** The Work view switch is a fixed-height
  (44px) two-column segmented control with equal halves and centered
  labels, matching the action buttons beside it.
- **Inbox keeps stale content while reloading.** Only the first mount
  skeletons; later polls show a quiet updating hint instead of blanking.
- **Uniform header and filter controls.** Work toggle segments, action
  buttons, and research filters share one height and text size; the
  research project filter is horizontal so the row aligns.
- **Panel drops the board legacy.** Single panel id/path is now
  `stelow` (was `board`); track routes, thread actions, and comments
  no longer reference it. Old panel URLs are not preserved —
  early development, no backward-compat tax.
- **Timeline count links to its artifacts.** The count is now its own
  button (navigation and files no longer share a chip); it opens the
  Artifacts section and scrolls to it. Stage chips meet touch targets
  and scroll horizontally on mobile instead of wrapping.
- **Track tabs order and memory.** Order is Inbox, Research, Work with
  Inbox as the default; explicit track routes persist the last tab while
  the bare root only reads it (it used to clobber the memory), and the
  tab bar scrolls instead of squeezing on mobile.
- **Artifacts live with their stages.** File pills no longer sit among
  navigation pills in the timeline (count-only badges remain); a shared
  Artifacts section lists everything grouped by producing stage, in both
  tracks. Order pinned by unit test.
- **Inbox counts fresh completions.** The badge now includes unseen
  completions from the last 7 days alongside unresolved actions;
  opening a completed card marks it seen (read, never resolved).
- **Strategy picker is alphabetical.** Playbooks scan predictably;
  opportunity-mapping stays the suggested default.
- **Dead card-seen tracking removed.** The unreachable `markCardSeen`
  endpoint and its always-NULL columns are gone; attention reads presence
  directly. No behavior change.
- **Research copy matches the concept.** The input is a question or topic,
  not an opportunity space — that is the result. Empty state, header, and
  creation dialog reworded; the dialog also reflects composite rounds.
- **Research empty-state wording.** "A question or a space" read as
  ambiguous — it now says "an opportunity space".
- **Skills sync verifies content hash.** The raw CDN can serve a stale
  blob for a fresh tree sha right after pushes; the sync pinned stale
  bytes under a fresh sha forever. Fetched content is now verified
  against the tree sha before recording, with retry on mismatch.
  Covered by a blob-sha unit test; suite grows from 5 to 6.

### Added
- **Worker lineage in stelow.json.** Per the upstream Worker Lineage
  contract, spawn/reseed/restart mirror the thread ledger into the
  workflow's own state (host-readable, survives plugin DB loss). Merges
  retry on write conflicts instead of clobbering concurrent stage
  advances; covered by round-trip, preservation, and failure-path tests.
- **Artifact review surface.** Read-only viewer (Markdown/source render)
  with multi-excerpt draft comments sent to the agent in one organized
  batch, pending gate question inline, and workspace-kind links that open
  in bb's official viewer. Review entry point from the decision hero.
- **Advance refuses mode-skipped gates.** `plan-gate`/`diff-gate` in a
  review mode that skips them now fail with the redirect (to execution /
  audit) instead of parking the worker on a review nobody configured.
- **Gate-tool fallback in worker prompts.** When `visual_review` is
  unavailable, Auto writes the approval receipt and advances; gated
  modes open a structured ask; chat-parking is forbidden.
- **Regression tests for ask-cancel and worker lifecycle.** Ask
  cancellation matrix and worker ledger/stall/flag transitions run
  against real SQLite; suite grows from 3 to 5.
- **Honest paused verbs.** The paused hero offers Resume (not Retry) when
  there is no error, matching the board's attention label.
- **Mode-gated interface picks in worker prompts.** Spawn and retry
  prompts now state the review-mode discipline (Auto / Product Spec Gate
  → LLM decides; Interface-Gates+ → human picks), matching the new
  upstream `human-gates.md` policy that ships via skills sync.
- **Reload-proof questions.** Transient ask cancellations (timeout,
  plugin reload/restart, aborted request) persist the question and park
  the card in awaiting-answer instead of losing the decision; explicit
  dismissals pass through. The persist is guarded against storage torn
  down mid-write, with an honest re-ask-once fallback.
- **Worker ledger.** Every worker thread per card is recorded (initial,
  band-swap, restart, reseed) with preset and reason; a Worker history
  section in Manage opens current and archived threads.
- **Robust preset staleness.** An explicit restart-pending flag (set on
  assign, self-healed by thread-birth comparison) replaces id-equality
  inference; fresh cards no longer get a pseudo-override row.
- **Official thread mention.** Respawned workers reference the archived
  predecessor with a native mention chip, not just copied text.
- **Restart worker applies preset changes.** Provider/model are fixed at
  spawn, so Resume can never switch them. While the running worker
  predates the override the hero offers Restart worker (fresh worker on
  the effective preset, continuing from the current stage), with the
  previous archived thread referenced for context recovery and trailed on
  the card.
- **Reload-safe workers.** The dispose hook that stopped every live worker
  thread is removed — it fired on each hot-reload and massacred in-flight
  work. Workers survive reloads; boot reconcile re-syncs state.
- **Inbox history that persists.** Resolved items render under a Resolved
  section instead of vanishing; the badge counts unresolved action items
  only. Silent stops leave an agent comment trail, and repeated stalls
  escalate the paused hero copy.
- **Pointer cursors.** Every clickable across Stelow panels uses the hand
  cursor; disabled controls use not-allowed; text fields keep the I-beam.
- **Honest card-state signaling.** A worker that stops with no new output,
  question, or stage progress signals paused immediately (no 90s grace);
  the retry nudge tells the worker to ask genuinely new questions instead
  of staying silent; the paused hero fires only on known-stuck idle; inbox
  summaries complement kind labels; the card hides the inbox banner when
  the hero already communicates that state.
- **Contextual thread button.** The thread header shows "Stelow work item"
  only on a card's worker thread (via a new `cardByWorkerThread` lookup)
  and opens that card directly; other threads show nothing.
- **Inbox Resolved history.** Auto-resolved items stay visible under a
  collapsed Resolved section instead of vanishing; resolution is per-kind
  (resume clears error/paused, answers clear questions).
- **Manual-stop recovery.** Thread `starting`/`stopping`/`error` statuses
  map to card activity, opening a card reconciles with the live thread,
  and an idle worker always offers Resume next to Open thread.
- **Open-card zone order.** The Manage disclosure (preset, restart,
  archive) now comes collapsed right after What is happening, with
  Conversation closing the page as the final interaction zone.
- **Open-card redesign (contextual hero + progressive disclosure).** The
  open card now leads with a single hero derived from card state
  (decision > error > paused > working > calm) — one sentence plus one
  primary action — instead of competing error/paused/decision banners.
  Everything else collapses into three disclosures (What is happening /
  Conversation / Manage) with a fixed type scale, left-aligned
  single-column layout, and larger touch targets.
- **Intent correction after triage notifies the worker.** Changing a
  card's intent past triage asks for confirmation (appetite and the stage
  path are not recomputed) and sends the correction straight to the
  worker thread; a failed notify falls back to Retry guidance.
- **Exploratory workspaces.** "Don't work in a project" now creates an
  isolated workspace under `~/.bb/stelow/exploratory/<card-id/>` backed by a
  local "Stelow exploratory work" project, instead of failing on the Personal
  project. Advance, reseed, preset swap, details, artifacts and intent editing
  all resolve the exploratory workspace.
- **Per-card preset override with reset.** The card's Agent preset section has
  a Change dialog: board default first, user presets, every installed
  provider's models (with counts and load-failure notes), plus a Custom
  provider + filterable model combobox. A card override now beats band
  presets; reset restores the board default and drops the private row.
  Override rows stay out of preset listings.

### Fixed

- **Exploratory `bb stelow advance`.** The `data/stelow` helper was Git-only;
  it now accepts `STELOW_STATEDIR`/`STELOW_STATE`, resolves the project root
  correctly, and honors `STELOW_TRANSITIONS` in pre-condition checks.
- **Transitions parsing.** Comment markers (`(none — …)`) no longer leak
  fake stages into the CLI allow-list nor hide real rework targets from the
  card UI; `reject` targets are listed; the terminal `audit` block parses
  (the JS `\\Z` anchor was a literal "Z").
- **Worker stalls after answers.** Answering a card question now sends an
  explicit continuation turn — responding to the interaction alone never
  resumed the agent.
- **Worker errors.** Specific failure causes survive reconcile (the generic
  fallback is never stored); the kanban attention pill no longer duplicates
  the activity pill; the broken `W` shortcut and double-click worker open
  were removed.
- **Every card starts `unknown`.** The creation intent parameter is always
  persisted as `unknown` and the worker prompt classifies intent first,
  writing it to `state.md` before loading any phase skill.

### Changed

- **Worker prompt trimmed.** Intent-first instruction, state dir, advance
  and ask contracts only — redundant paragraphs removed.
- **Open card revamp.** Single sticky identity bar (intent control lives
  there now), micro-caps section scale, de-boxed comments, contextual
  actions (Resume in the error box, Open thread button in Progress, quiet
  Archive), tooltips explaining intent/stage, stage shown before intent.
- **Preset dialog UX.** Custom choice first, option counts, scroll fade
  affordance, filterable inline model list with free-text fallback.

### Fixed

- **`stelow advance` / `doctor` after skill renames.** The `data/stelow`
  SCOPE-2 helper still hardcoded the old `stelow-product-orchestrator` path in
  its `TRANSITIONS` fallback and the advance pre-condition Python block. Both
  now resolve `stelow-workflow-orchestrator`. Also fixed the stale mirror
  reference in `references/transitions.md`.

### Architecture

- **DRY: stop duplicating Stelow skills.** The plugin dropped the 13
  `stelow-product-*` playbooks from its bundle (consumed from the agent skills
  hub via `npx skills add calionauta/stelow`) and renamed the vendored workflow
  guides to the repo-authoritative `stelow-workflow-*` prefix.

- **Auto-sync vendored workflow skills.** `lib/workflow-skills-sync.mjs`
  fetches the `calionauta/stelow` repo tree, compares git blob hashes against a
  `.sync-state.json`, and rewrites only the changed core skills
  (`stelow-*` + `stelow-workflow-*`) into the plugin's skills dir. Registered on
  `bb.background.schedule` every 6h (`STELOW_SKILLS_SYNC_CRON` overrides;
  default `33 */6 * * *`). Fail-soft: network/API errors just log and keep the
  current skills — the board never breaks.

- **Worker prompt updated** to load workflow skills from the plugin and product
  playbooks from the stelow repo hub, matching the split distribution.

### Security

- **Artifact manifest path hardening.** Absolute paths and parent-directory
  traversal (`..`) in artifact manifests are now rejected; every resolved
  artifact path is verified to stay inside the project workspace
  (`resolveArtifactPath` in `lib/artifact-manifest.mjs`, used by the server's
  document-read path).

- **Optional third-party CLIs are user-installed only.** References under
  `skills/stelow-product-orchestrator/references/cli-tools/` (`pi-tasks`,
  `rpiv-todo`, thermo-nuclear code-quality review, and safe-change) no longer
  instruct the agent to run unpinned third-party installers automatically.
  They are framed as optional tools the user installs and pins/verifies
  themselves; absent them, the guidance falls back to built-in workflow steps.

- **Replace unsupported `Columns` host icon** with the valid `Columns2` icon
  in the board nav, thread panel action, and manifest metadata.

### Design

- **Board/List filter spacing.** The view toggle (Board/List) and the "New
  work" CTA now sit `gap-3` apart on desktop so they read as two distinct
  controls, keeping `gap-2` on mobile to preserve width.

### Added

- **Contextual preset configuration.** Removed the duplicate board-header
  Presets button. **Configure presets** now lives only beside Worker policy,
  where its phase assignments directly explain what a new card will use.

- **Shared worker policy at creation.** New cards no longer ask for a
  per-card Worker preset. The composer now summarizes the board's effective
  preset per phase and links directly to configuration; cards always begin
  with the shared Analysis preset and follow phase assignments thereafter.

- **Delightful preset-form loading.** While the real provider/model catalog is
  loading, Manage presets shows a purposeful preparation state instead of
  provisional fields. The editor appears only with the configured options.

- **No provisional preset editor values.** The preset modal waits for its
  preset data before opening; its new-preset form begins neutral while provider
  data is loading, then seeds from the actual configured default. The board
  also states plainly that its Worker preset, not BB's general composer picker,
  controls execution.

- **Authoritative worker-preset selector.** New-card creation now presents the
  configured Stelow presets directly. The selected preset, falling back to the
  built-in default, determines the worker's provider/model/reasoning/permission
  independently of the general BB composer controls.

- **Preset editor derives real defaults.** Opening the new-preset form now
  seeds provider, model, reasoning, and permission mode from the configured
  default preset instead of relying on a stale hardcoded UI value.

- **Focused Pi preset routes.** The Pi model picker now lists only its intended
  Bifrost routes — Harness Coding plus GPT-5.6 Sol, Terra, and Luna — instead
  of exposing Pi's unrelated OpenCode/OpenRouter catalog. The selected
  Harness Coding route remains present when the picker opens.

- **Reliable preset create/edit mode.** New presets now begin with a `null`
  identifier, immediately switch to edit mode after creation, and expose a
  clear **New preset** action. Existing accidental empty-ID presets are
  repaired automatically while retaining their card and workflow-phase links.

- **New-card workflow controls.** The board now lets the user set the two
  canonical workflow axes before creating a card: Appetite (`Lean`, `Core`, or
  `Complete`) and Review Mode (from `Auto` through the full code-diff gate).
  They default to **Lean** and **Auto**, are validated by the RPC contract, and
  are persisted to both the seeded `state.md` and `stelow.json`. The spawned
  worker receives the declared values and does not re-ask for them during
  setup.

- **Last-used workflow defaults.** After a card is created successfully, its
  Appetite and Review Mode become the preselected choices for the next card.
  This is stored as plugin UI preference data, never in a workflow's canonical
  files; a fresh installation still starts at Lean + Auto.

- **Stage timeline: advance one step, return many — with correct verbs.**
  Clicking a passed stage now opens a "Return to X?" dialog (was always
  "Advance to X?", wrong directionally). Forward movement is restricted to
  one stage at a time (the next legal stage — gates apply); going back is
  allowed for any number of stages and labeled as safe/reversible.

- **Per-card preset removed from the card detail.** Presets are configured
  once, globally, per workflow phase from the board's **Presets** button. The
  card's per-preset dropdown/assign (which could conflict with the phase
  preset) is gone; the card now just shows an informative chip of the phase's
  active preset. Dead `switchPreset`/`presets`/`presetSwitching` code removed.

- **Scopes/tasks are ordered and dependencies are explicit.** The card's
  Scopes list is now sorted **topologically by dependency** — a scope that
  depends on or is blocked by another appears after it, so reading top→bottom
  follows execution order. Tasks within a scope are sorted by progress
  (in-progress → pending → blocked → done). A scope waiting on an unfinished
  dependency gets a ⛔ "waiting on N" badge and an amber border; dependency
  chips show the scope's real name and turn amber when its dependency isn't
  done yet (missing deps shown as dashed). No framework, all client-side
  (topological sort + status rank).

- **Board columns are the workflow phases.** Columns are now
  Analysis → Planning → Execution → Review (+ Done, Archived) instead of
  abstract lifecycle states (Triage/Shaping/Running). An active card sits in
  the column of its current phase (derived from its stage), so the board
  visualizes exactly where in the workflow each card is. The `blocked` column
  is removed — stelow never records card-level `blocked` status (only
  scope/task dependencies, which stay in the card). Drag & drop a card to a
  phase column moves it to that phase's entry stage; dropping on Done/Archived
  sets the terminal status. Needs-attention remains an overlay (badge + count)
  across any phase column.

- **Workflow timeline in the card detail.** The 17 stages now render as a
  vertical timeline grouped by phase (Analyse / Plan / Execute / Review),
  replacing the loose "Advance stage" buttons. Each stage is a chip showing
  passed ✓ / current (highlighted) / upcoming, with the phase as a visual
  group label — so the card's position in the flow is clear at a glance. The
  timeline doubles as the advance control: click a future stage to advance, a
  passed one to go back, one step at a time (the confirm dialog and its per-
  stage preview still apply). Phase groupings live in a single `STAGE_BAND`
  map (cross-referenced with server `STAGE_BANDS` for presets), so phases are
  an aggregation of stages, not a rival axis.

- **[KISS/DRY] Attention is a single flag; "Gate pending" is no longer a
  column.** A pending question is now purely an *activity* signal — the card
  stays in its real stage column (e.g. Running) and shows the attention badge
  "Answer required". The "Gate pending" column is gone (it misrepresented
  workflow position: gates can occur at any stage, not after planning).
  Server returns exactly one `needsAttention` boolean; the label is derived
  client-side from the card's own `activity`/`status` (a single
  `attentionLabel()` helper) rather than a parallel enum.

- **Board card: removed the redundant status pill.** On the board, the
  column already communicates the card's status, so the status pill was noise.
  A board card now shows intent + stage (the phase, which differentiates cards
  within a column) + the activity pill. Status remains in the card detail,
  where the column is not visible; the detail also drops the now-duplicated
  status pill (its breadcrumb already shows status + stage).

- **Attention is unified.** The board no longer distinguishes "needs
  attention" from "needs repair" as separate visual states. A single flag
  (`needsAttention`) answers "does this card need a human now?", and a `kind`
  (`question` / `error` / `completed` / `idle`) picks the reason and its action.
  Idle-stuck cards now count as needing attention, so a stopped worker on an
  active card is no longer invisible on the board. Idle only surfaces after
  the worker has sat idle ~90s (two reconcile cycles), so a card that merely
  finished a turn is not falsely flagged. The card detail's "Repair" is now
  "Resume". Cards that were already idle before the `last_idle_at` column
  existed are backfilled on the next reconcile poll (with `updated_at` as a
  fallback onset proxy), so legacy idle cards surface too instead of never
  counting as attention.

- **Presets are configurable from the board header.** A **Presets** button in
  the Stelow board header opens the preset manager (create/edit/delete,
  set default, and the per-workflow-phase presets) without digging into a
  single card's drawer. The card-drawer entry point is unchanged.

- **Respawn reliability for phase-preset transitions.** The band-boundary
  respawn now resolves the real per-workflow state dir (from `stelow.json`)
  instead of guessing the current date, retires the old worker only after the
  new spawn succeeds, and marks the card `error` (with `last_error`) if the
  spawn fails — no more zombie cards with no worker and a stale `running`
  state. The board `advance` path triggers the phase-preset swap too, matching
  the CLI path.

- **Worker preset per workflow phase.** Presets can now be configured per
  stage phase (analysis / planning / execution / review) in the preset
  manager. When a card advances into a phase whose preset differs from the
  one its worker was spawned with, the worker is automatically respawned with
  that phase's preset on the same state dir (state.md is preserved, so the
  new worker continues from the current stage — no context reset). A phase
  with no configured preset falls back to the card's preset (or the default),
  so existing cards behave exactly as before. Add `test_bands.mjs` to verify
  the stage-phase mapping and fallback.

- **Artifacts flow: cards now surface the documents the workflow produces.**
  `transitions.md` declares a per-stage `artifact:` glob (e.g. shape →
  `plans/spec-product_*.md`, planning → `plans/spec-tech_*.md`, scope →
  `scopes/scope-report_*.md`). `stelow advance` now (a) **blocks** the transition
  when the required artifact file is missing, and (b) **records** the produced
  path into `state.md` → `artifacts.<stage>` (repo-root-relative, merged so
  earlier artifacts are preserved). The card detail reads those artifacts and
  shows a new **“Assets produced by the workflow”** section with each file as a
  clickable chip (opens the document in the review panel).

- **Per-workflow state: stelow is now multi-card per project.** Each card owns
  its own state file at `<root>/.stelow/<date>/<dirHash>/state.md` (plus
  `invariants.json` and `lock`) instead of sharing a single project-root
  `state.md`. The card stores its `dir_hash`; the helper resolves the dir from
  `STELOW_STATEDIR` (set per workflow by the server), so `advance`/`status`
  touch only that card's state. Removed the old one-active-card-per-project
  guard — N cards can now run concurrently in the same project without
  colliding. Legacy cards (no `dir_hash`) keep working via the root `state.md`
  fallback.

### Fixed

- **Status vs. activity: distinct, non-competing visuals.** `status` (the
  workflow's column anchor, e.g. "In progress") stays a solid pill; `activity`
  (the transient worker state) is subordinated as a dashed pill with its own
  glyphs — working (breathing dot), waiting-for-you (amber hourglass), error
  (red X). A worker resting in the normal idle state renders **no** activity
  badge, so a card no longer shows a jarring "Paused" beside "In progress".
  The play glyph is now reserved for the working state only; `in-progress`
  uses a solid dot instead, removing the play-icon collision that made a card
  read as both running and paused at once.

- **Artifacts are clickable right in the agent's message.** Stage skills now
  emit a `::stelow-artifact{path="…" display="…"}` message directive per
  artifact, rendered by a new plugin `messageDirective` as a clickable chip
  that opens the file in the workspace viewer. This fixes the old bare
  `plans/…` references in comments, which resolved against the project root
  and 404'd (real files live under `.stelow/<date>/<dir>/`).

- **Card ask questions are now real interactive forms.** An open Stelow
  question on a card rendered as buttons that only pre-filled the thread
  composer (easy to miss, required a manual send, and offered no multi-select).
  The card now shows the same option-picker as the thread's native interaction
  and answers through `threads.interactions.respond` — picking option(s) and
  pressing **Submit answer** forwards a structured response to the worker, no
  manual composer edit needed. `More pending questions` reuses the same form.
- **Artifacts and mentioned files open as dedicated plugin tabs.** The chips
  previously called `openThreadPanel`, which can be declined when the card
  detail is itself a plugin tab (no thread side panel). They now navigate to a
  `review-document/<path>` tab that renders the full markdown reviewer (read,
  inline comment, selection), reachable from the board or the card.

- **Pending stelow ask questions now surface on the card.** The card only
  showed an awaiting-answer banner when `activity` was exactly
  `awaiting-answer`, and `listCards`/`cardDetail` only promoted to it when the
  thread was `running`. A card whose worker is `idle` with a pending
  interaction (the normal state after `bb stelow ask` parks the workflow) hid
  the question entirely. Both now detect pending interactions regardless of the
  stored/thread activity, so an open question is always visible and answerable.
- **Repair only shows on idle, unfinished cards** (not when there is an open
  question to answer or an active error — those already have a clear action).
- **Comments render as Markdown** (bb's chat renderer) instead of raw text, so
  agent comments keep bold, lists, and clickable file references.
- **Artifacts use repo-root-relative paths** so the review file opener resolves
  them under the project (absolute paths containing `/` were rejected by the
  workspace-safety check and 404'd).

- **Realtime now works over Tailscale (port 8096).** The bb-tcp-proxy was a
  plain HTTP forwarder that never upgraded WebSocket, so the board, the
  sidebar count, and card state only refreshed on manual reload. Rewrote it as
  a Node proxy in `~/bin/bb-tcp-proxy.js` with `upgrade` support — board
  updates, drag-and-drop moves, and archives now reflect live without a
  refresh.
- **Card stays in Triage until triage is done.** A freshly-created card was
  immediately promoted `draft → in-progress` as soon as its worker thread went
  active, so it never showed in the Triage column and "jumped" to Running.
  The sync now reads `current_stage` from `state.md` and keeps the card in
  `draft` (Triage) while the stage is `triage`, only moving to Running after
  the agent advances.
- **intent and stage sync from state.md.** If a card is created with
  `intent=unknown`, the sync adopts the intent the agent records in the
  project's `state.md` (only when that state.md belongs to this card). The
  reported `stage` also follows `current_stage` from `state.md`.
- **state.md re-seeded per card.** A single `state.md` lives per project, so
  creating a card reused an existing `state.md` that belonged to a *different*
  card (wrong name/intent). The seed now re-writes `state.md` for the card
  being created when it belongs to another card (or is missing).
- **One active card per project.** Because `state.md` is a single per-project
  file (per the state-contract), creating a card now blocks if the project
  already has a non-archived card, with a clear message to archive/pause it
  first — preventing two cards from fighting over the same state.
- **Sidebar badge shows a number only.** The count pill now renders just the
  number, matching bb's own sidebar accessory styling, instead of "N live".
- **Board header counts live cards only.** "N cards" in the board header now
  uses the same live definition as the sidebar badge (in-progress / draft /
  planning / awaiting-answer), so archived, completed, and blocked cards are
  excluded and the two counters stay coherent.

### Added

- **Full bb composer on the board.** The new-card form now uses bb's own
  `NewThreadComposer` (tiptap editor): type `@` for mentions, use the `+`
  action menu to attach files, skills, automations, or a plugin reference,
  and pick project/provider/model right in the form. Attached files are
  copied to the thread storage and listed as `Attached files:` in the card
  prompt — same behavior as bb threads.
- **Bundled Stelow skills.** The plugin ships the 27 `stelow-*` skills in
  `skills/` and declares them via `bb.skills`, so a fresh install no longer
  depends on `~/.claude/skills/stelow-*` symlinks or the
  `calionauta/stelow` repo being checked out. The agent prompt now reads the
  stage guides from the plugin's own skills directory.
- **Workspace-file mention provider** (`@` + filename resolves to
  `Workspace file: <path>` when the route has a project context).
- **Timed-out questions are answerable later.** If a `bb stelow ask` times
  out (user away), the question is persisted and the card **stays in Gate
  pending** — it does not look abandoned. The agent is told to STOP and wait
  (never guess, never re-ask); the card shows "Waiting for your answer — the
  agent paused" with the original options still clickable. Answering records
  it as a card comment and delivers the answer to the worker thread, which
  resumes the workflow.

### Changed

- **Ask timeout stops the agent.** Previously the worker was told to proceed
  with best judgment on timeout. Now the ask command returns a STOP instruction
  and the worker prompt says: on timeout, do not proceed; the question stays
  pending and answerable; the answer resumes the workflow. `syncThreadState`
  keeps an idle card in Gate pending while a question remains unanswered.
- **Card header de-duplicated.** When activity and status agree (e.g. both
  `awaiting-answer`) only one tag shows; the breadcrumb shows the column
  state (`Gate pending`) plus the workflow stage (`Triage`) instead of only
  the stage. The intent label now shows the current intent next to the select.
- **Ask timeout is configurable** via `STELOW_ASK_TIMEOUT_MS` (default 1h)
  for testing and tuning.
- **Delete archived cards.** Manage on an archived card (research or
  build) offers Delete behind an English confirm dialog (`deleteCard`
  RPC: archived-only, removes the card row plus comments, presets,
  questions, inbox events, and ledger rows, stops + archives the worker
  thread). Archive stays the reversible exit; delete is the deliberate
  erasure.
- **Fullscreen creation on phones.** The New card / New research dialogs
  stay real modals on compact viewports (full-viewport with an explicit
  close, `fullscreenOnMobile` on `DialogContent`) instead of collapsing
  into a bottom sheet; desktop centering is unchanged.

## [0.1.4] - 2026-08-20

### Fixed

- **Cards now start in Triage instead of Running.** `createCard` wrote
  `status: "in-progress"` from the first INSERT, so a new card landed in the
  Running column and never passed through shaping. It now seeds
  `status: "draft"`, and `syncThreadState` promotes the card to
  `awaiting-answer` when a structured question is pending (listing it under
  "Gate pending") and to `in-progress` when the agent resumes real work.
- **Question form not rendering.** The worker prompt only said "call
  `bb.ui.requestInput`" without being categorical. The prompt now states the
  rule verbatim: any time the agent needs input it MUST call `bb stelow ask`
  (the structured form wired to `stelow-question`), never just write text like
  "waiting for your choice". The card flips to Gate pending automatically while
  the form is pending.
- **Realtime reloads now debounce** (`useDebouncedRealtime`, 250 ms) so bursts
  of mutations stop stampeding the board/card-detail RPC loaders.

### Changed

- **Repair uses a confirmation Dialog** instead of the fragile timed
  double-click (`setTimeout` + `confirmingRepair`). The dialog explains that
  state.md and stelow.json are reseeded and the worker restarts from triage.
- **Archive requires a destructive confirmation Dialog** instead of silently
  cancelling the card.
- **Filter UI collapses to a single "Filters" popover** with an active-count
  badge and a Reset button; the "Needs attention" toggle stays inline.
- **Keyboard and focus:** board cards are keyboard-operable (Enter/Space opens
  the card, `W` opens the worker thread), column containers expose `role=list`
  / `role=listitem` for the focus chain, and focus returns to the card detail's
  close button on a host-initiated detail restart.

### Added

- **Sidebar accessory badge:** the Stelow menu row shows a live count of cards
  in Triage/Shaping/Running/Gate pending, tinted as a primary badge when live
  (same pattern the Tasks plugin uses).
- **Defensive "awaiting answer" banner:** the card detail renders an amber
  banner with a path to the pending question when `activity` is
  `awaiting-answer`, so the form is never unreachable.
- **Agent presets** (schema mirrors the bb Tasks plugin):
  - New `presets` table: provider, model, reasoning level, permission mode,
    environment kind, base branch, machine, instructions, plus built-in and
    default flags. A read-only built-in `Default` preset ships and is used when
    a card has no explicit preset.
  - New `card_presets` join table; `createCard` and `reseedCard` persist the
    assignment and carry the preset's provider/model/reasoning/permission into
    the worker thread spawn (`executionInputSources: "explicit"`).
  - `reseedCard` now also stops the previous worker thread and spawns a fresh
    thread with the chosen preset, so swapping a preset and clicking Repair
    cleanly transfers the model + context.
  - New RPCs: `listPresets`, `upsertPreset`, `deletePreset`, `assignPreset`.
  - New CLI: `bb stelow preset list|add|remove|assign`.
  - Card detail surfaces a preset dropdown.

### Internal

- Added `awaiting-answer` to the `statusSchema` enum used by board/card types.
- Server/`app` compile clean at SDK `0.4.8` / bb `0.39.0`; `dist/data` and
  `dist/references` are copied by `postbuild.mjs`.
- Reconciled `package.json` version to `0.1.4` to match the published tag.

[0.1.4]: https://github.com/calionauta/bb-plugin-stelow/compare/v0.1.3...v0.1.4
