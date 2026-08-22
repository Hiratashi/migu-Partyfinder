# Migu's Partyfinder Tool — User Guide

This guide is for guild members using the beta version of Migu's Partyfinder Tool.

**Live site:** https://migu-partyfinder.tsukuyomi.ch

## 1. Log in with Discord

Open the Partyfinder site and choose **Login with Discord**.

Partyfinder uses Discord to identify you and verify that you belong to the configured guild. There is no separate Partyfinder password.

If your guild access changes, Partyfinder may disable access automatically.

## 2. Set up your profile and characters

Open **Account → Profile & characters**.

Add the Elsword characters you may use for raids. Each character has:

- an in-game character name
- a class
- the role/attack-type information associated with that class
- optional armor setup
- optional capability tags.

Your in-game character name can be copied with one click. This is useful when searching or inviting players in Elsword.

Character cards are compact by default. Use **Manage details** to expand a character and configure its armor or capabilities.

Keep your character list current so Partyfinder can determine which parties you can join.

Your profile and character information may also be shown to other Partyfinder users on your public profile and in party-related profile previews.

## 3. Configure armor

Inside a character's **Manage details** view, you can optionally configure its armor set.

Available armor setups are:

- **Tenebrous**
- **Exascale**
  - Red
  - Blue
  - Green
- **Not specified**

Tenebrous and Exascale are mutually exclusive. If you select Exascale, choose the appropriate Exascale color.

You can return later and change the armor setup at any time.

## 4. Configure capabilities

Inside the same character details view, you can select capability tags that describe useful information about that character.

Capabilities may be:

- global
- specific to a raid
- grouped into categories such as Damage, Gear, Utility or Other.

For example, a raid-specific capability may communicate that a character is suitable for a particular responsibility.

**Doom Damage Ready** is self-declared. Select it only when you are confident that character can be relied on as one of the party's primary damage dealers in Doom Aporia and can carry a meaningful share of the group's damage.

Capabilities are informational. They do not override normal party matching, eligibility or composition requirements.

Capability definitions are maintained by administrators and may be adjusted later. Names, descriptions, categories, raid scope, active state and display order can change without requiring users to recreate their characters.

## 5. Set your availability

Open **Account → Availability**.

Set the times you are normally available during the week.

Availability is stored as a recurring weekly schedule and shown relative to your saved timezone. Party times are presented in your local time so guild members in different timezones can coordinate more easily.

You can also save raid-related preferences such as:

- encounters/fights
- stages
- characters
- practice preferences
- notes

You can return later and change your availability.

## 6. Browse parties

The main page shows upcoming open parties.

A party can include information such as:

- raid
- date/time
- selected encounters
- stage
- practice/clear intent
- party composition requirements
- current members

Open a party to see the full details.

## 7. Create a party

Choose **+ Create Party**.

Select the date/time and raid options for the group.

Depending on the raid configuration, you can choose things such as:

- encounters/fights
- stage
- full run or selected fights
- practice settings
- party composition requirements

After creating the party, it appears for eligible guild members.

## 8. Join a party

Open the party you want to join and choose one of your eligible characters.

Partyfinder checks the party's requirements against the character/class you selected.

If the leader has restricted party composition, some characters may not currently satisfy the remaining requirements.

You can change your selected character later where supported.

## 9. Invitations and preferred characters

Party leaders can invite eligible Partyfinder users.

Invitations appear in Partyfinder and can be accepted or declined.

When sending an invitation from **Available players**, the party lead may optionally select one or more characters as preferred choices.

A preferred character is only a suggestion:

- the lead may select no preferred character
- one or multiple characters may be preferred
- the invited player sees which characters were preferred
- preferred characters are shown first in the invitation character picker
- the invited player may still choose any character that satisfies the normal party requirements.

Preferred characters do not change matching, eligibility, role requirements or party composition rules.

If you accept an invitation, choose an eligible character for that party.

A leader may revoke an invitation before it is accepted.

## 10. My Parties

Use **My Parties** to manage parties that involve you.

Depending on your role in the party, actions can include:

- viewing the party
- editing it
- changing your character
- leaving
- inviting players
- removing members
- completing the party
- cancelling it

Pending invitations may also show the party lead's preferred character choices.

## 11. Party status and history

Parties move through lifecycle states.

Examples include:

- **OPEN** — still accepting players
- **FULL** — all party slots are filled
- **DONE** — intentionally completed
- **CANCELLED** — cancelled by the leader/admin
- **EXPIRED** — the scheduled time passed while the party was still active.

Past parties can be reviewed through **History**.

## 12. Times and timezones

Partyfinder is designed for guild members in different timezones.

Times shown in the interface are converted for the viewer where applicable. Always double-check the displayed date/time before committing to a raid.

## 13. Admin-only pages

Administrators have additional tools for:

- users
- raids
- classes
- capabilities
- active-party moderation
- audit logs

The capability administration page allows capability definitions to be added or adjusted later, including:

- name
- description
- category
- raid scope
- active/inactive state
- display order.

Normal users do not need these pages.

## 14. Reporting a problem

This is a beta. If something behaves incorrectly, please open a GitHub Issue:

https://github.com/Hiratashi/migu-Partyfinder/issues

For bugs, include:

- what happened
- what you expected
- steps to reproduce
- the page/feature involved
- browser/device
- a screenshot if useful

Do **not** post passwords, tokens, cookies, `.env` contents or private credentials.

## 15. Suggesting improvements

Feature and UX suggestions are welcome through GitHub Issues as well.

Try to describe:

- what you would like improved
- what problem it solves
- how you imagine it working
- how important it feels to you

Thanks for helping test Migu's Partyfinder Tool.
