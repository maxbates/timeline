# TODOs

## Nested Timelines / Sub-tracks

- [ ] Visual hierarchy: indent child tracks under parent, show connector line or nesting indicator
- [ ] Collapse/expand: allow collapsing a parent track to hide its child tracks
- [ ] Breadcrumb or "back to parent" navigation when drilling into sub-tracks
- [ ] Show parent event badge on child tracks (e.g. "Spawned from: Traditional Founding of Rome")
- [ ] Recursive cascade deletion on the server side (currently only 1 level deep on client)
- [ ] Sub-track ordering: place child tracks directly below their parent track, not at the end
- [ ] Limit dig-deeper depth (e.g. max 3 levels) to prevent runaway nesting
- [ ] Aggregate view: option to merge all child track events into the parent track temporarily

## Research Agent

- [ ] Wikipedia disambiguation filtering (skip "(disambiguation)" pages from search results)
- [ ] 429 rate-limit retry with exponential backoff for Wikipedia API
- [ ] Create DESIGN.md documenting the research pipeline architecture
- [ ] Write tests for research orchestrator, Wikipedia client, and cache layer
