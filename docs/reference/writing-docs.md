# Writing Conventions

To keep this wiki maintainable and stylistically consistent, all new pages should follow the conventions below.

## Page Structure

Every page should contain roughly these parts:

- Goal: what problem this page solves
- Background: enough context to orient the reader
- Body: organized by task or topic
- Related links: pointers to upstream and downstream pages

## Heading Levels

- Keep exactly one level-one heading per page
- Use level-two headings for main sections
- Use level-three headings for supplementary detail; do not go deeper
- Headings speak to readers, file names speak to maintainers

## Writing Advice

- Prefer direct headings over vague ones
- Keep one main idea per paragraph
- Use ordered lists for step-by-step procedures
- Always wrap commands, paths, and config keys in code formatting
- Refer to projects by their official name rather than their directory name

## Fixed Skeleton for Project Pages

Every page under `projects/` starts with these sections so readers can compare projects easily:

- One-line summary: what this project is responsible for
- Tech stack: language, framework, external services it depends on
- Directory layout: what each top-level directory does
- How to run: build command, run command, required services
- Configuration: where the config lives and which keys matter
- Relationships: who it depends on, who depends on it

Core projects get additional pages for architecture and for configuration or API reference; peripheral projects keep the single page above.

## Link Maintenance

- After adding a page, update the navigation or sidebar
- When a page relates to an upstream or downstream flow, link to the relevant docs
- When deleting or renaming a page, check for broken links
- Use absolute in-site paths, for example `/zh/projects/hrpauth/`

## Language Convention

The English site is the default locale and `/zh/` is its mirror. Both locales keep the same page structure, so add the counterpart page whenever you add a new one.

## Content Lifecycle

Different pages change at different rates. Keep them apart:

- Frequently changing content: changelog, FAQ, or operational guides
- Infrequently changing content: architecture notes, content models, conventions
