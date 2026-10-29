# Interface source

The default cockpit UI in `web/src/reference/` is adapted from the user-supplied `bou-ai-interface.zip` (AI Studio export, received 2026-10-29). Original Apache-2.0 source headers are retained.

Included visual elements: cockpit header, character stage and mode controls, Bou/Aether portrait assets, Agent Town, signal feed, chat inspector, settings, themes and floating panels.

The exported client-side Gemini service is replaced with a local server adapter. Voice uses the tested native bridge in the packaged app and browser speech APIs during browser development. The ZIP's `.env`, `.aistudio` cache and reference videos are excluded.

World-monitor readings, credits, satellite imagery, agent activity, camera/browser cards and messaging integrations are demonstration UI. They do not grant device access, scrape pages, send messages or execute code. Existing camera/PC-control workflows remain in **Classic tools**. The local memory cards are editable UI data; they are not automatically included in provider prompts.

Change the app name/version in `web/src/config/app.ts`; the imported configuration derives its branding from those constants. Add production connectors through typed service adapters and replace the corresponding TODO/demo labels as each integration becomes real.
