# Issue Tracker: GitHub

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for issue operations when credentials are available.

## Conventions

- Create an issue: `gh issue create --title "..." --body "..."`
- Read an issue: `gh issue view <number> --comments`
- List issues: `gh issue list --state open --json number,title,body,labels,comments`
- Comment on an issue: `gh issue comment <number> --body "..."`
- Apply or remove labels: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- Close an issue: `gh issue close <number> --comment "..."`

Infer the repository from `git remote -v`; `gh` does this automatically inside the clone.

## Pull Requests As A Triage Surface

PRs as a request surface: no.

If this changes later, update this file and let `/triage` include external PRs using the `gh pr` equivalents.

## Publishing

When a skill says "publish to the issue tracker", create a GitHub issue unless the user asks for a local markdown draft.

When a skill says "fetch the relevant ticket", run `gh issue view <number> --comments`.
