# Discord delivery and Striker Parties

## Discord setup

The website inbox is the durable record. Migration 033 adds a per-notification
delivery queue and a separate new-party announcement queue. Nothing is sent to
Discord until the `discord-worker` Compose profile is started.
The inbox offers All and Unread views; notifications older than 30 days are
deleted when the application next serves an authenticated request. Migration
035 also removes preexisting entries past that age.

1. In the Discord Developer Portal, create a bot for the OAuth application and
   add it to the guild. Give it permission to send messages in the chosen
   announcements channel; members can have that channel read-only.
2. Set `DISCORD_BOT_TOKEN` in your server environment. This is a bot token,
   separate from `DISCORD_CLIENT_SECRET` and OAuth user tokens. Optionally set
   `DISCORD_ANNOUNCEMENT_CHANNEL_ID` to the ID of the read-only channel. The
   worker sends public notices only for newly created parties, with no pings.
   Optionally set `DISCORD_ALERT_CHANNEL_ID` to a read-only channel for private
   alert fallbacks. It can be the same channel as announcements. A member must
   enable the fallback in Profile & characters before the worker posts a
   generic mention if Discord rejects their DM. The message links only to
   their website inbox; the guild can see who was mentioned, not why.
3. Run migrations through the usual Compose deployment. Start the bot with
   `docker compose --profile discord up -d --build`. Without this profile the
   website continues to work and the queue waits for the worker.

The worker checks current guild membership and any required role before a DM.
It retries temporary failures and rate limits. If DMs are blocked, the website
inbox still contains the alert. A member who opts in also receives a generic
guild mention when `DISCORD_ALERT_CHANNEL_ID` is configured. If that channel
is unavailable, website delivery still works. Start the bot before creating production test
parties to test announcements; older parties are not announced retroactively.
Discord times use viewer-local timestamp tags. No slash commands are installed
yet; party management remains on the website.

## Two-group raids

Migration 034 adds raid structure settings and a snapshot on newly created
parties. In Admin → Raids, create or update a raid with eight players and select
“Two Striker Parties (4 + 4)”. Add the verified encounters and stages in admin
before activating the raid. Existing parties retain their one-group layout.

Accepted members, including the leader, join an unassigned pool. The leader
uses the assignment selector on the party detail page to place or move each
person into Party 1 or Party 2. Each has four places; changes are checked in a
transaction under a party lock, audited, and sent to the affected member's
website inbox (and DM when the worker is enabled). A pending invitation does
not reserve a specific Striker Party place. Weekly Rosso/Berthe rotation is
not automated because a reliable Rift rule/source has not been established.
