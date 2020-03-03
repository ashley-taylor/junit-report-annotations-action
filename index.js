const core = require('@actions/core');
const github = require('@actions/github');
const glob = require('@actions/glob');
const parser = require('xml2json');
const { Octokit } = require('@octokit/rest');
const fs = require('fs');

const { GITHUB_TOKEN, GITHUB_WORKSPACE } = process.env;


const annotation_level = 'failure';
const annotation = {
  path: 'test',
  start_line: 1,
  end_line: 1,
  start_column: 2,
  end_column: 2,
  annotation_level,
  message: `[500] failure`,
};

annotations.push(annotation);

(async () => {
    try {
    const path = core.getInput('path');
    const includeSummary = core.getInput('includeSummary');
    const numFailures = core.getInput('numFailures');

    const globber = await glob.create(path, {followSymbolicLinks: false});

    for await (const file of globber.globGenerator()) {
        const data = await fs.promises.readFile(file);
        var json = parser.toJson(data);
        console.log("to json ->", json);
    }


    const octokit = new github.GitHub(GITHUB_TOKEN);
    const req = {
      ...github.context.repo,
      ref: github.sha
    }
    console.log(req)
    const res = await octokit.checks.listForRef(req);
    console.log(res)
  
    const check_run_id = res.data.check_runs.filter(check => check.name === check_name)[0].id
  
    const update_req = {
      ...github.context.repo,
      check_run_id,
      output: {
        title: "Junit Results",
        summary: `Num passed etc`,
        annotations: [annotation]
      }
    }
  
    console.log(update_req)
    await octokit.checks.update(update_req);

    } catch (error) {
   		core.setFailed(error.message);
    }
})();