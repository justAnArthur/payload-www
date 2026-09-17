// inlined by the server view: hosts never import the plugin's extracted client.css
export const reviewStyles = /* css */ `
.tr { --tr-ok: var(--theme-success-500); --tr-ok-bg: var(--theme-success-100); --tr-warn: var(--theme-warning-500); --tr-warn-bg: var(--theme-warning-100); --tr-bad: var(--theme-error-500); --tr-bad-bg: var(--theme-error-100); --tr-line: var(--theme-elevation-100); --tr-muted: var(--theme-elevation-500); --tr-card: var(--theme-elevation-50); padding-block: calc(var(--base) * 2) calc(var(--base) * 4); }
.tr a { text-decoration: none; color: inherit; }
.tr__head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--base); margin-bottom: calc(var(--base) * 1.5); }
.tr__head h1 { margin: 0 0 4px; }
.tr__lead { margin: 0; color: var(--tr-muted); max-width: 60ch; }
.tr__back { display: inline-flex; gap: 6px; color: var(--tr-muted); font-size: 13px; margin-bottom: 8px; }
.tr__back:hover { color: var(--theme-text); }

.tr__stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: calc(var(--base) * 1.5); }
.tr__stat { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border: 1px solid var(--tr-line); border-radius: var(--style-radius-m); background: var(--tr-card); }
.tr__stat-label { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--tr-muted); }
.tr__stat-value { font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.1; }
.tr__stat-note { font-size: 12px; color: var(--tr-muted); }

.tr__bar { height: 4px; border-radius: 999px; background: var(--theme-elevation-150); overflow: hidden; }
.tr__bar > span { display: block; height: 100%; border-radius: inherit; background: var(--tr-tone, var(--tr-ok)); }

.tr__toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.tr__tabs { display: inline-flex; padding: 3px; gap: 2px; border-radius: 999px; background: var(--theme-elevation-100); }
.tr__tab { padding: 5px 14px; border-radius: 999px; font-size: 13px; color: var(--theme-elevation-700); text-transform: capitalize; }
.tr__tab:hover { color: var(--theme-text); }
.tr__tab[aria-current='true'] { background: var(--theme-elevation-0); color: var(--theme-text); box-shadow: 0 1px 2px rgba(0,0,0,.2); }
.tr__filters { display: inline-flex; align-items: center; gap: 12px; font-size: 13px; color: var(--tr-muted); }
.tr__toggle { display: inline-flex; align-items: center; gap: 8px; padding: 5px 12px; border: 1px solid var(--tr-line); border-radius: 999px; color: var(--theme-elevation-800); }
.tr__toggle::before { content: ''; width: 26px; height: 14px; border-radius: 999px; background: var(--theme-elevation-200) radial-gradient(circle at 7px 50%, var(--theme-elevation-0) 4px, transparent 4.5px); }
.tr__toggle[aria-pressed='true']::before { background: var(--tr-ok) radial-gradient(circle at 19px 50%, var(--theme-elevation-0) 4px, transparent 4.5px); }

.tr__bulk { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: calc(var(--base) * 1.25); padding: 10px 12px; border: 1px dashed var(--tr-line); border-radius: var(--style-radius-m); }
.tr__bulk-main, .tr__bulk-progress { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.tr__bulk .btn { margin: 0; }
.tr__select { height: 28px; padding: 0 8px; border: 1px solid var(--tr-line); border-radius: var(--style-radius-s, 4px); background: var(--theme-input-bg, var(--theme-elevation-0)); color: var(--theme-text); font: inherit; font-size: 13px; }
.tr__card { border: 1px solid var(--tr-line); border-radius: var(--style-radius-m); overflow: auto; background: var(--theme-elevation-0); }
.tr table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
.tr th { position: sticky; top: 0; z-index: 1; background: var(--tr-card); text-align: left; font-weight: 500; color: var(--tr-muted); padding: 10px 12px; border-bottom: 1px solid var(--tr-line); white-space: nowrap; }
.tr th small { display: block; font-size: 11px; font-weight: 400; }
.tr td { padding: 6px 12px; border-bottom: 1px solid var(--tr-line); vertical-align: middle; }
.tr tbody tr:last-child td { border-bottom: 0; }
.tr tbody tr:hover td { background: var(--theme-elevation-50); }
.tr__locale-col { text-align: center !important; }
.tr__doc { min-width: 240px; }
.tr__doc a { font-weight: 500; }
.tr__doc a:hover { text-decoration: underline; }
.tr__key { display: block; margin-top: 2px; font-family: var(--font-mono, ui-monospace, monospace); font-size: 11px; color: var(--tr-muted); }

.tr__cell { display: flex; flex-direction: column; gap: 4px; min-width: 64px; padding: 6px 8px; border-radius: 6px; text-align: center; font-variant-numeric: tabular-nums; font-weight: 500; transition: background .12s; }
.tr__cell:hover { background: var(--theme-elevation-100); }
.tr__cell[data-tone='ok'] { --tr-tone: var(--tr-ok); color: var(--tr-ok); }
.tr__cell[data-tone='warn'] { --tr-tone: var(--tr-warn); color: var(--tr-warn); }
.tr__cell[data-tone='bad'] { --tr-tone: var(--tr-bad); color: var(--tr-bad); }
.tr__marks { font-size: 11px; color: var(--tr-muted); }
.tr__lang { color: var(--tr-bad); font-weight: 500; }

.tr__legend { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 12px; font-size: 12px; color: var(--tr-muted); }
.tr__legend span { display: inline-flex; align-items: center; gap: 6px; }
.tr__dot { width: 8px; height: 8px; border-radius: 999px; background: var(--tr-tone); }

.tr__pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; font-size: 13px; color: var(--tr-muted); }
.tr__pager nav { display: inline-flex; gap: 6px; }
.tr__pager a, .tr__pager span[aria-disabled] { padding: 5px 12px; border: 1px solid var(--tr-line); border-radius: 999px; color: var(--theme-elevation-800); }
.tr__pager span[aria-disabled] { opacity: .4; }
.tr__pager a:hover { background: var(--theme-elevation-100); }

.tr__pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 500; white-space: nowrap; background: var(--theme-elevation-100); }
.tr__pill::before { content: ''; width: 6px; height: 6px; border-radius: 999px; background: currentColor; }
.tr__pill[data-tone='ok'] { color: var(--tr-ok); background: var(--tr-ok-bg); }
.tr__pill[data-tone='warn'] { color: var(--tr-warn); background: var(--tr-warn-bg); }
.tr__pill[data-tone='bad'] { color: var(--tr-bad); background: var(--tr-bad-bg); }

.tr__meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.tr__chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid var(--tr-line); border-radius: 999px; font-size: 12px; color: var(--theme-elevation-800); }
.tr__chip--bad { color: var(--tr-bad); border-color: var(--tr-bad); }
a.tr__chip:hover { background: var(--theme-elevation-100); }

.tr__path { width: 22%; font-family: var(--font-mono, ui-monospace, monospace); font-size: 12px; color: var(--theme-elevation-700); word-break: break-word; }
.tr__text { width: 34%; white-space: pre-wrap; word-break: break-word; line-height: 1.45; }
.tr__text--empty { color: var(--tr-muted); font-style: italic; }
.tr__empty { padding: 32px; text-align: center; color: var(--tr-muted); }
.tr__error { color: var(--tr-bad); }

.translator-review__actions { display: flex; flex-wrap: wrap; gap: 8px; }
.translator-review__actions .btn { margin: 0; }
`
