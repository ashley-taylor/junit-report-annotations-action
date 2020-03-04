const core = require('@actions/core');
const github = require('@actions/github');
const glob = require('@actions/glob');
const parser = require('xml2json');
const fs = require('fs');

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


(async () => {
    try {
        const path = core.getInput('path');
        const includeSummary = core.getInput('includeSummary');
        const numFailures = core.getInput('numFailures');
        const accessToken = core.getInput('access-token');
        
        const globber = await glob.create(path, {followSymbolicLinks: false});

        let numTests = 0;
        let numSkipped = 0;
        let numFailed = 0;
        let numErrored = 0;
        let testDuration = 0;
        for await (const file of globber.globGenerator()) {
            const data = await fs.promises.readFile(file);
            var json = parser.toJson(data);
            if(json.testsuite) {
                const testsuite = json.testsuite;
                time +=  testsuite.time;
                numTests +=  testsuite.tests;
                numErrored +=  testsuite.errors;
                numFailed +=  testsuite.failures;
                numSkipped +=  testsuite.skipped;

                for(const testcase of testsuite.testcase) {
                    // if(testcase.fai)
                }
            }
            console.log("to json ->", json);
        }

        const octokit = new github.GitHub(accessToken);
        const req = {
        ...github.context.repo,
        ref: github.context.sha
        }
        console.log(github)
        const res = await octokit.checks.listForRef(req);
        console.log(JSON.stringify(res))
    
        const check_run_id = res.data.check_runs.filter(check => check.name === 'build')[0].id
    
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
