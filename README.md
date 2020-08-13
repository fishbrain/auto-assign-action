#### auto-assign-action
A GitHub Action that automatically assigns reviewers to pull requests. It's currently hard-coded in a way that's relevant only to the iPhone repository, but it can easily be made more reusable in the future.

##### Current behaviour
The `fishbrain/ios-developers` team is assigned as a reviewer, and the _Awaiting review_ label is added, when a comment containing the URL of an OTA build is added to the PR.
The [code review assignment settings](https://github.com/orgs/fishbrain/teams/ios-developers/edit/review_assignment) for the `fishbrain/ios-developers` team have been configured to request a review from 2 team members when the team is assigned as a reviewer.

##### Example workflow
To use this action, create a new workflow YAML file in `.github/workflows/` with the following contents:

```yaml
on:
  issue_comment:
    types: [created]

jobs:
  assign-reviewers:
    runs-on: ubuntu-latest
    name: Assign reviewers to pull requests
    steps:
      - name: auto-assign step
        uses: fishbrain/auto-assign-action@v1
        with:
          token: '${{ secrets.GITHUB_TOKEN }}'
```
