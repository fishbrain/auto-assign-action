const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
	const token = core.getInput('token');

	// Only run for new comments on pull requests
	if (!(github.context.eventName === 'issue_comment' 
		&& github.context.payload.issue.pull_request
		&& github.context.payload.action == 'created')) {
		return;
	}

	// We look for the trigger string in the comment body to know that the build is ready
	const commentBody = github.context.payload.comment.body;
	if (!commentBody.includes(core.getInput('build_available_trigger'))) {
		console.log('Unrelated PR comment. Not requesting reviewers.');
		return;
	}

	const octokit = github.getOctokit(token);
	const { owner, repo } = github.context.repo;
	const pullNumber = extractPullRequestNumber(github.context.payload.issue.pull_request.url);

	// Check if the pull request already has reviewers assigned
	const { data: pullRequest } = await octokit.pulls.get({
		owner,
		repo,
		pull_number: pullNumber,
	});
	const hasReviewers = pullRequest.requested_reviewers !== undefined && pullRequest.requested_reviewers.length > 0;

	if (hasReviewers) {
		console.log('PR already has reviewers. Not requesting different ones.');
		return;
	}

	// Request a review from the iOS team.
	// Our review settings on GitHub will ensure that two random people from the
	// team are assigned.
	await octokit.pulls.requestReviewers({
		owner,
		repo,
		pull_number: pullNumber,
		team_reviewers: [core.getInput('review_team')]
	})

	// Add the 'Awaiting review' label
	await octokit.issues.addLabels({
		owner,
		repo,
		issue_number: pullNumber,
		labels: [core.getInput('labels').split(', ')]
	});
}

function extractPullRequestNumber(pullRequestURL) {
	// Extracts the pull request from a pull request URL on the form
	// https://api.github.com/repos/octocat/Hello-World/pulls/1347
	const pathComponents = pullRequestURL.split('/');
	return pathComponents[pathComponents.length - 1];
}

run();
