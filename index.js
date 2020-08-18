const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
	const token = core.getInput('token');
	const octokit = github.getOctokit(token);

	const pullRequest = await getAssociatedPullRequest(octokit);
	if (pullRequest === undefined) {
		core.setFailed('Action invoked for event other than `issue_comment.created` or `pull_request.(opened|edited|ready_for_review)`');
		return;
	}

	if (pullRequest.draft) {
		console.log('Pull request is marked as a draft. Nothing to do yet.');
		return;
	}

	const needsTesting = pullRequest.body.toLowerCase().includes('#### what to test');
	if (needsTesting) {
		// Wait for the build to become available for testing before requesting
		// reviews.
		await requestReviewsIfBuildWasPosted(octokit, pullRequest);
	} else {
		// The pull request doesn't need testing, so we don't need to wait for
		// the build to become available before requesting reviews.
		await requestReviewsIfNeeded(octokit, pullRequest);
	}
}

// Returns the full pull request object associated with the current action run.
async function getAssociatedPullRequest(octokit) {
	const { owner, repo } = github.context.repo;

	if (github.context.eventName === 'issue_comment' && github.context.payload.issue.pull_request && github.context.payload.action == 'created') {
		// When a comment gets created the payload doesn't contain a full pull
		// request object so we need to fetch it through the GitHub API.
		const { owner, repo } = github.context.repo;
		const pullNumber = extractPullRequestNumber(github.context.payload.issue.pull_request.url);
		const { data: pullRequest } = await octokit.pulls.get({
			owner,
			repo,
			pull_number: pullNumber,
		});
		return pullRequest;
	} else if (github.context.eventName === 'pull_request' && ['opened', 'edited', 'ready_for_review'].includes(github.context.payload.action)) {
		// When a pull request is created, the payload contains the entire pull request object.
		return github.context.payload.pull_request;
	}
	return undefined;
}

// Requests reviews for the given pull request if the action was triggered by
// the build being posted in a comment on the PR.
async function requestReviewsIfBuildWasPosted(octokit, pullRequest) {
	if (github.context.eventName !== 'issue_comment') {
		console.log('Waiting for build requires a comment to be posted. Nothing to do yet.');
		return
	}

	// We look for the trigger string in the comment body to know that the build is ready
	const commentBody = github.context.payload.comment.body;
	if (!commentBody.includes(core.getInput('build_available_trigger'))) {
		console.log('Unrelated PR comment. Not requesting reviewers.');
		return;
	}

	await requestReviewsIfNeeded(octokit, pullRequest);
}

// Requests reviews for the given pull request if the pull request doesn't already
// have any pending requests or hasn't already been approved.
async function requestReviewsIfNeeded(octokit, pullRequest) {
	const { owner, repo } = github.context.repo;

	// Check if the pull request already has reviewers assigned
	const hasReviewers = pullRequest.requested_reviewers !== undefined && pullRequest.requested_reviewers.length > 0;
	if (hasReviewers) {
		console.log('PR already has reviewers. Not requesting different ones.');
		return;
	}

	// Check if the pull request is already approved
	const { data: reviews } = await octokit.pulls.listReviews({
		owner,
		repo,
		pull_number: pullRequest.number
	});
	const isApproved = reviews.some((review) => review.state === "APPROVED");
	if (isApproved) {
		console.log('PR is already approved. Not requesting reviews.');
		return;
	};

	// Request a review from the iOS team.
	// Our review settings on GitHub will ensure that two random people from the
	// team are assigned.
	await octokit.pulls.requestReviewers({
		owner,
		repo,
		pull_number: pullRequest.number,
		team_reviewers: [core.getInput('review_team')]
	})

	// Add the 'Awaiting review' label
	await octokit.issues.addLabels({
		owner,
		repo,
		issue_number: pullRequest.number,
		labels: core.getInput('labels').split(', ')
	});
}

function extractPullRequestNumber(pullRequestURL) {
	// Extracts the pull request from a pull request URL on the form
	// https://api.github.com/repos/octocat/Hello-World/pulls/1347
	const pathComponents = pullRequestURL.split('/');
	return pathComponents[pathComponents.length - 1];
}

run();
