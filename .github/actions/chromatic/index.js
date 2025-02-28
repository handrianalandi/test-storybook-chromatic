const github = require('@actions/github');
const core = require('@actions/core');

async function run() {
  try {
    // Input validation
    const token = core.getInput('github-token', { required: true });
    const storybookUrl = core.getInput('storybook-url', { required: true });
    const buildUrl = core.getInput('build-url', { required: true });

    const context = github.context;
    
    // Check if we're in a PR context
    if (!context.payload.pull_request) {
      console.log('No PR context found. Skipping comment creation.');
      return;
    }

    const prNumber = context.issue.number;
    const octokit = github.getOctokit(token);
    const commentIdentifier = '<!-- CHROMATIC-STORYBOOK-COMMENT -->';

    // Create the comment body with an identifier that we can search for
    const body =
      `${commentIdentifier}\n` +
      `✅ Storybook has been successfully deployed!\n\n` +
      `📚 **Storybook URL**: [View Storybook](${storybookUrl})\n\n` +
      `🛠️ **Build URL**: [View Build](${buildUrl})`;

    try {
      // Get all comments on the PR
      const { data: comments } = await octokit.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber
      });

      // Find and delete any previous Chromatic comments
      for (const comment of comments) {
        if (comment.body.includes(commentIdentifier)) {
          console.log(`Deleting previous comment ID ${comment.id}`);
          await octokit.rest.issues.deleteComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            comment_id: comment.id
          });
        }
      }

      // Create new comment
      const { data: newComment } = await octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber,
        body: body
      });

      console.log(`Created new comment ID ${newComment.id}`);
    } catch (error) {
      core.warning(`Failed to manage PR comments: ${error.message}`);
      throw error;
    }
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run(); 
