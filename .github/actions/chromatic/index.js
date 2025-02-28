const github = require("@actions/github");
const core = require("@actions/core");

async function run() {
  try {
    // Input validation
    const token = core.getInput("github-token", { required: true });
    const storybookUrl = core.getInput("storybook-url", { required: true });
    const buildUrl = core.getInput("build-url", { required: true });

    const context = github.context;

    // Check if we're in a PR context
    if (!context.payload.pull_request) {
      console.log("No PR context found. Skipping comment creation.");
      return;
    }

    const prNumber = context.issue.number;
    const octokit = github.getOctokit(token);
    const commentIdentifier = "<!-- CHROMATIC-STORYBOOK-COMMENT -->";
    const chromaticStartMarker = "<!-- CHROMATIC-DESCRIPTION-START -->";
    const chromaticEndMarker = "<!-- CHROMATIC-DESCRIPTION-END -->";

    // Create the comment body with an identifier that we can search for
    const commentBody =
      `${commentIdentifier}\n` +
      `✅ Storybook has been successfully deployed!\n\n` +
      `📚 **Storybook URL**: [View Storybook](${storybookUrl})\n\n` +
      `🛠️ **Build URL**: [View Build](${buildUrl})`;

    // Create the Chromatic description
    const chromaticSection =
      `${chromaticStartMarker}\n` +
      `<hr />\n\n` +
      `### 🎨 Chromatic Preview\n\n` +
      `- 📚 [View Storybook](${storybookUrl})\n` +
      `- 🛠️ [View Build](${buildUrl})\n` +
      `${chromaticEndMarker}`;

    try {
      // Get all comments on the PR
      const { data: comments } = await octokit.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber,
      });

      // Find and delete any previous Chromatic comments
      for (const comment of comments) {
        if (comment.body.includes(commentIdentifier)) {
          console.log(`Deleting previous comment ID ${comment.id}`);
          await octokit.rest.issues.deleteComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            comment_id: comment.id,
          });
        }
      }

      // Create new comment
      const { data: newComment } = await octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber,
        body: commentBody,
      });

      console.log(`Created new comment ID ${newComment.id}`);

      // Handle PR description update
      const { data: pullRequest } = await octokit.rest.pulls.get({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: prNumber,
      });

      let newBody = pullRequest.body || "";

      // Remove old Chromatic section if it exists
      const startIndex = newBody.indexOf(chromaticStartMarker);
      const endIndex = newBody.indexOf(chromaticEndMarker);

      if (startIndex !== -1 && endIndex !== -1) {
        newBody =
          newBody.substring(0, startIndex).trim() +
          newBody.substring(endIndex + chromaticEndMarker.length).trim();
      }

      // Add new Chromatic section
      newBody = newBody.trim() + "\n\n" + chromaticSection;

      // Update PR description
      await octokit.rest.pulls.update({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: prNumber,
        body: newBody,
      });
      console.log("Updated PR description");
    } catch (error) {
      core.warning(`Failed to manage PR comments: ${error.message}`);
      throw error;
    }
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
