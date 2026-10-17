# Claude Code recording plan — same artifact as acceptance

This is an unexecuted recording script for [#5](https://github.com/ryo0221/editor-platform-plugins/issues/5),
paired with [#3](https://github.com/ryo0221/editor-platform-plugins/issues/3).
Recording, actual-host checks and publication are **NOT RUN** in this document.
Use the real signed-in Claude Code and its local-browser Editor; `/demo`, Playwright,
a fabricated chat transcript or a Desktop/Codex session cannot substitute for them.
No new installer, recorder dependency, persistent configuration or publication is
introduced by this plan.

## Freeze the candidate once

Follow [installation and acceptance](claude-code.md) and retain the archive,
checksum and [acceptance record](acceptance-records.md). The recording and accepted
Release must identify the **same archive SHA-256**, not merely version `0.1.3` or
the same Git commit. Do not rebuild between acceptance and filming: bundled source
and documentation can change archive bytes. Keep the original candidate unchanged.
If a fix needs a new archive, record a new identity and reassess the affected
acceptance/footage; do not relabel the old footage as the new build.

Record the plugin source commit and dirty flag, upstream commit, archive filename
and SHA-256, plugin version, actual OS/architecture (including WSL when applicable),
Claude Code version, browser version and date. A tested version alone does not
establish a minimum supported version. Retain source video plus Short/Long exports
with their hashes and the same candidate identity in the acceptance record's video
fields or an accompanying private record. Put evidence time ranges beside the
scenario rows; retain PASS/FAIL/NOT RUN separately from the edited presentation.

Use already-authorized installation and a private workspace containing only the
fictional recording fixtures. Do not delete existing trial data. A fresh permanent
installation for C1 requires its own approval; filming in an existing `--plugin-dir`
session does not satisfy that condition. Reuse exact-artifact observations rather
than repeating successful operations just for a new form.

## One continuous source take

Arrange the actual Claude Code window and Editor content so their relationship is
clear. Crop private terminal chrome and browser chrome before recording. Keep the
uncut source take private; capture visible results, not just clicks. Allow real
model waits. These example prompts request data changes, never shell/HTTP/browser
automation of human-only approval.

| Step | Operator action / fictional prompt | Visible evidence to retain |
| --- | --- | --- |
| 1. Request | In Claude Code invoke the installed editor skill and ask: “架空の『星見台カフェ』の紹介スライドを3枚作ってください。1枚目は見出しと図形、2枚目は架空の来客数10・20・30のグラフ、3枚目は架空の商品と価格の表。まずSlideのガイドを確認してください。外部画像や実在の個人情報は使わないでください。” Ask it to open the Editor. | Actual guide/create calls and the resulting three native slides. If generation fails, retain the failure; do not substitute a prerecorded success. |
| 2. Choose and edit | In “保存済みの成果物”, choose this fixture's “開く”. Select a visible title/shape in the Slide Editor, change the title to “星見台カフェ・週末のご案内” and move a shape using its normal editing controls. | Correct artifact and real editable Surface, changed text/layout and unsaved state. The new-artifact kind selector is not the saved-artifact selector. |
| 3. Undo/Redo | Before saving, use the Host toolbar “元に戻す”, then “やり直す”. | The last visible local change reverses and returns. Undo history is local since load/save/accepted proposal; do not demonstrate Undo across a Save boundary. |
| 4. Save and reread | Click “保存”. In Claude Code ask: “今保存したスライドを読み直し、変更した見出しと現在のrevisionを確認してください。” | Saved state and a fresh `read_deck`/`read_artifact` result containing the manual change. A model assertion without a fresh read is insufficient. |
| 5. Preview and reject | Ask: “現在の保存版を読み、見出しを『架空の変更案A』にする変更案だけを作ってください。適用はしないでください。” Once saved local edits are clear, click “保存先から再読込”, then “変更案を表示”, inspect the preview and click “却下”. Ask Claude to reread. | Preview differs, explicit human rejection and saved title unchanged after reread. Preview is not a save. Do not discard an unsaved draft to refresh proposals. |
| 6. Preview and apply | Request a new proposal against the current saved revision: “見出しを『星見台カフェ・新しい週末』にする変更案だけを作ってください。” Refresh using “保存先から再読込”, inspect “変更案を表示”, then click “適用”. Ask Claude to reread. | Explicit human application, new saved revision and matching reread. Apply already writes the reviewed result; no invented second confirmation or automatic model approval. |
| 7. Reopen | After all changes are saved, end the Claude Code session, then start a new conversation using the same approved installation and data directory. Ask for saved artifacts and open this fixture again through `open_editor` and the inventory. | Same saved fixture and accepted title survive the new session. An old browser tab loses access when its server stops; reopen through the new session. |

The opener can report `launch_requested` or `launch_unconfirmed`, both with
`browserVerified: false`. Show the user's actual browser observation separately.
An uncertain handoff is not automatic detection success and is not a reason for
automatic retry. Never reveal/copy its capability URL as part of the video.

This take can support observed portions of C2/C3/C4/C6. It does not by itself prove
C1 fresh installation, C5 stale-conflict refusal, the complete C6 update/discovery
requirements, C7 exported-file inspection, other Editors or other OS targets.
Complete the remaining C1–C7 checks independently; label a partially observed row
with its observations, not an overall PASS. Do not manufacture a conflict or an
update demonstration by editing private on-disk data.

## Edit two deliveries from the same take

- **Short:** a few tens of seconds, no audio track, looping. Show request → manual
  edit → Undo/Redo → Save → preview/reject → preview/apply → reopened result in
  that order. Use brief captions such as “手編集”, “保存”, “確認して適用”. Trim waiting
  and use clearly signaled cuts; do not imply a pending preview was saved. Use the
  ending result followed by an opening title card to make the loop understandable.
- **Long:** follow all seven steps with readable Japanese subtitles. Distinguish
  Claude's request/proposal from human clicks. Include saved reread, rejected
  unchanged content and reopened applied content. Mark removed waits or speedups,
  and give enough time to read each result. Subtitles describe the observed action;
  they cannot claim a missing success. Include candidate version/OS in a short end
  card and attach the full identity record rather than exposing local paths.

Keep the original take for review and an edit list mapping each exported segment
to it. Review both exported files after encoding: readable text, correct ordering,
Short audio absent and loop behavior, Long subtitle timing, and no cut concealing
an error or missing confirmation. Any repair that changes the demonstrated result
requires a new real take. This is not a performance benchmark; shortened waits
must not imply measured latency. The LP should label these as actual Claude Code
plus browser demonstrations, separately from browser-only footage.

## Privacy and publication checklist

Before capture, close unrelated tabs/windows, suppress notifications, and remove
private shell prompts, account/avatar details, history and bookmarks from the
capture region. Use fictional content only; model-visible tool output may contain
artifact IDs, local paths or other metadata even when the slide is fictional.
Never record sign-in, permission secrets, environment variables, process arguments,
DevTools, session storage or the initial capability-bearing browser URL.

Inspect the entire exported Short and Long frame by frame around window changes,
model/tool output expansion, startup and transitions. Check audio/subtitles too.
Redact usernames, personal/account data, local paths, artifact IDs and authentication
URLs/tokens. If a credential is captured, keep that source private, end the affected
session and recapture safely; a blur in the public export does not sanitize the
private source. Check filenames, export metadata, thumbnails and the identity record
for private paths/names. Retain a privacy-review result and reviewer/date without
publishing those private details.

Only after full acceptance, identity matching and privacy review, request the
separate Release/video publication approval. Deliver Short, Long, their hashes,
redacted recording conditions and scenario evidence references to the reviewer.
No Release, LP update, upload or Issue closure is authorized by this script.
