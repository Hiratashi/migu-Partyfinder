# Beta Information

Migu's Partyfinder Tool is currently in **beta**.

The main raid-planning workflow is working and the live site is available for real guild use, but this is still the phase where we discover edge cases and polish the experience.

## What beta means

During beta:

- features may change based on feedback
- bugs may still occur
- wording/layout may be adjusted
- admin configuration may change
- migrations or data cleanup may occasionally be necessary.

The goal is to let the guild use the tool normally while collecting practical feedback.

## What to test

The most useful beta testing is ordinary usage:

- Discord login
- player profiles
- character creation/editing
- armor setup
- capability selection
- availability
- party creation
- joining/leaving
- invitations
- preferred-character invitations
- role/class selection
- local-time display
- My Parties
- history
- copyable in-game character names

Administrators should also test moderation and configuration workflows, including capability management.

## Character capabilities and armor

Characters may contain additional informational setup.

Armor is configured separately from capability tags:

- Tenebrous
- Exascale
  - Red
  - Blue
  - Green

Capability tags may be global or raid-specific and can describe useful character information such as gear, utility or raid readiness.

These fields are informational. They do not bypass or replace the normal party eligibility and composition rules.

The capability catalogue is intentionally configurable. Administrators can adjust capability names, descriptions, categories, raid scope, active state and display order later, and can add new capability definitions as needed.

## Preferred characters on invitations

Party leads may optionally indicate one or more preferred characters when inviting a player.

This does not lock the invited player to those characters. The invited player may still choose any character that satisfies the party's normal requirements.

This feature should be tested with:

- no preferred character
- one preferred character
- multiple preferred characters
- accepting with a preferred character
- accepting with a different eligible character
- declining or revoking the invitation

## Reporting bugs

Please use GitHub Issues:

https://github.com/Hiratashi/migu-Partyfinder/issues

Choose **Bug report** and provide enough information to reproduce the problem.

Screenshots are welcome when they help explain the issue.

## Suggesting improvements

Use **Feature / improvement request** for:

- UX polish
- confusing workflows
- missing quality-of-life features
- ideas for future Partyfinder functionality

Feedback does not need to be a large new feature. Small usability problems are exactly what this beta is intended to uncover.

## Security / sensitive information

Do not put sensitive information in a public GitHub issue.

Never include:

- passwords
- Discord client secrets
- OAuth tokens
- cookies/session tokens
- `.env` contents
- database passwords
- SSH private keys

If a report appears security-sensitive, contact the maintainer privately instead of publishing exploit details.

## Known scope

The current implementation is primarily focused on **Doom Aporia**.

Additional raids and features may be added after the beta workflow is stable.

## Data

Partyfinder stores user/profile, availability, character setup, party, invitation preference and audit data in PostgreSQL.

While the beta is intended for real usage, users should understand that development changes may occasionally require migrations or cleanup.

## Thank you

Real usage is the best way to find the remaining rough edges.

Thanks for helping improve Migu's Partyfinder Tool.
