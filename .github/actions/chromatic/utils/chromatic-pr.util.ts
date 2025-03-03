import { getOctokit } from "@actions/github";
import { Context } from "@actions/github/lib/context";

const MARKERS = {
  COMMENT: "<!-- CHROMATIC-STORYBOOK-COMMENT -->",
  DESCRIPTION: {
    START: "<!-- CHROMATIC-DESCRIPTION-START -->",
    END: "<!-- CHROMATIC-DESCRIPTION-END -->",
  },
} as const;

type GitHubClient = ReturnType<typeof getOctokit>;

interface UpdatePrParams {
  octokit: GitHubClient;
  context: Context;
  prNumber: number;
  storybookUrl: string;
  buildUrl: string;
}

async function updatePrComment({
  octokit,
  context,
  prNumber,
  storybookUrl,
  buildUrl,
}: UpdatePrParams): Promise<void> {
  const commentBody = `${MARKERS.COMMENT}
✅ Storybook has been successfully deployed!

📚 **Storybook URL**: [View Storybook](${storybookUrl})

🛠️ **Build URL**: [View Build](${buildUrl})`;

  const { data: comments } = await octokit.rest.issues.listComments({
    ...context.repo,
    issue_number: prNumber,
  });

  for (const comment of comments) {
    if (comment.body?.includes(MARKERS.COMMENT)) {
      console.log(`Deleting previous comment ID ${comment.id}`);
      await octokit.rest.issues.deleteComment({
        ...context.repo,
        comment_id: comment.id,
      });
    }
  }

  const { data: newComment } = await octokit.rest.issues.createComment({
    ...context.repo,
    issue_number: prNumber,
    body: commentBody,
  });

  console.log(`Created new comment ID ${newComment.id}`);
}

async function updatePrDescription({
  octokit,
  context,
  prNumber,
  storybookUrl,
  buildUrl,
}: UpdatePrParams): Promise<void> {
  const chromaticSection = `${MARKERS.DESCRIPTION.START}
<hr />

### 🎨 Chromatic Preview

- 📚 [View Storybook](${storybookUrl})
- 🛠️ [View Build](${buildUrl})
${MARKERS.DESCRIPTION.END}`;

  const { data: pullRequest } = await octokit.rest.pulls.get({
    ...context.repo,
    pull_number: prNumber,
  });

  let newBody = pullRequest.body || "";

  const startIndex = newBody.indexOf(MARKERS.DESCRIPTION.START);
  const endIndex = newBody.indexOf(MARKERS.DESCRIPTION.END);

  if (startIndex !== -1 && endIndex !== -1) {
    newBody =
      newBody.substring(0, startIndex).trim() +
      newBody.substring(endIndex + MARKERS.DESCRIPTION.END.length).trim();
  }

  newBody = `${newBody.trim()}\n\n${chromaticSection}`;

  await octokit.rest.pulls.update({
    ...context.repo,
    pull_number: prNumber,
    body: newBody,
  });

  console.log("Updated PR description");
}

export { updatePrComment, updatePrDescription, type UpdatePrParams };
