const github = require("@actions/github");
const core = require("@actions/core");
const {
  updatePrComment,
  updatePrDescription,
} = require("./utils/chromatic-pr.util");

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

    try {
      await updatePrComment(octokit, context, prNumber, storybookUrl, buildUrl);
      await updatePrDescription(
        octokit,
        context,
        prNumber,
        storybookUrl,
        buildUrl
      );
    } catch (error) {
      core.warning(`Failed to manage PR comments: ${error.message}`);
      throw error;
    }
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
