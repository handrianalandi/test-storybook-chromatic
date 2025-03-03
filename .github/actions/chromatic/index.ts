import * as core from '@actions/core';
import * as github from '@actions/github';
import { Context } from '@actions/github/lib/context';

import { updatePrComment, updatePrDescription, UpdatePrParams } from './utils/chromatic-pr.util';

interface PullRequestPayload {
  pull_request: {
    number: number;
  } | null;
}

async function run() {
  try {
    // Input validation
    const token = core.getInput('github-token', { required: true });
    const storybookUrl = core.getInput('storybook-url', { required: true });
    const buildUrl = core.getInput('build-url', { required: true });

    const context = github.context as Context & { payload: PullRequestPayload };

    // Check if we're in a PR context
    if (!context.payload.pull_request) {
      // eslint-disable-next-line no-console
      console.log('No PR context found. Skipping comment creation.');
      return;
    }

    const prNumber = context.issue.number;
    const octokit = github.getOctokit(token);

    const params: UpdatePrParams = {
      octokit,
      context,
      prNumber,
      storybookUrl,
      buildUrl
    };

    try {
      await updatePrComment(params);
      await updatePrDescription(params);
    } catch (error) {
      core.warning(`Failed to manage PR updates: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  } catch (error) {
    core.setFailed(`Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

run();
