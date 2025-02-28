const COMMENT_IDENTIFIER = "<!-- CHROMATIC-STORYBOOK-COMMENT -->";
const CHROMATIC_START_MARKER = "<!-- CHROMATIC-DESCRIPTION-START -->";
const CHROMATIC_END_MARKER = "<!-- CHROMATIC-DESCRIPTION-END -->";

async function updatePrComment(
  octokit,
  context,
  prNumber,
  storybookUrl,
  buildUrl
) {
  const commentBody =
    `${COMMENT_IDENTIFIER}\n` +
    `✅ Storybook has been successfully deployed!\n\n` +
    `📚 **Storybook URL**: [View Storybook](${storybookUrl})\n\n` +
    `🛠️ **Build URL**: [View Build](${buildUrl})`;

  // Get all comments on the PR
  const { data: comments } = await octokit.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
  });

  // Find and delete any previous Chromatic comments
  for (const comment of comments) {
    if (comment.body.includes(COMMENT_IDENTIFIER)) {
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
}

async function updatePrDescription(
  octokit,
  context,
  prNumber,
  storybookUrl,
  buildUrl
) {
  const chromaticSection =
    `${CHROMATIC_START_MARKER}\n` +
    `<hr />\n\n` +
    `### 🎨 Chromatic Preview\n\n` +
    `- 📚 [View Storybook](${storybookUrl})\n` +
    `- 🛠️ [View Build](${buildUrl})\n` +
    `${CHROMATIC_END_MARKER}`;

  const { data: pullRequest } = await octokit.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber,
  });

  let newBody = pullRequest.body || "";

  // Remove old Chromatic section if it exists
  const startIndex = newBody.indexOf(CHROMATIC_START_MARKER);
  const endIndex = newBody.indexOf(CHROMATIC_END_MARKER);

  if (startIndex !== -1 && endIndex !== -1) {
    newBody =
      newBody.substring(0, startIndex).trim() +
      newBody.substring(endIndex + CHROMATIC_END_MARKER.length).trim();
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
}

module.exports = {
  updatePrComment,
  updatePrDescription,
};
