#### auto-assign-action
A GitHub Action that automatically assigns reviewers to pull requests. It's currently hard-coded in a way that's relevant only to the Fishbrain iPhone repository, but it can easily be made more reusable in the future.

##### Current behaviour
The action checks if the pull request needs testing based on the presence of a "what to test" section in the PR body and then either immediately requests reviews for the PR or waits until the OTA build is available for testing before requesting reviews.

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
          review_team: 'org/some-team'
          labels: 'Awaiting review'
          build_available_trigger: 'https://builds.yourorg.com/build/'
```
