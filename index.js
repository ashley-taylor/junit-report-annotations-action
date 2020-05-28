const core = require('@actions/core');
const github = require('@actions/github');
const glob = require('@actions/glob');
const parser = require('xml2json');
const fs = require('fs');






(async () => {
    try {
        const path = core.getInput('path');
        const includeSummary = core.getInput('includeSummary');
        const numFailures = core.getInput('numFailures');
        const accessToken = core.getInput('access-token');
        const testSrcPath = core.getInput('testSrcPath');
        const globber = await glob.create(path, {followSymbolicLinks: false});

        let numTests = 0;
        let numSkipped = 0;
        let numFailed = 0;
        let numErrored = 0;
        let testDuration = 0;

        let annotations = [];
       

        for await (const file of globber.globGenerator()) {
            const data = await fs.promises.readFile(file);
            var json = JSON.parse(parser.toJson(data));
            if(json.testsuite) {
                const testsuite = json.testsuite;
                testDuration +=  Number(testsuite.time);
                numTests +=  Number(testsuite.tests);
                numErrored +=  Number(testsuite.errors);
                numFailed +=  Number(testsuite.failures);
                numSkipped +=  Number(testsuite.skipped);
                testFunction = async testcase => {
                    if(testcase.failure) {
                        if(annotations.length < numFailures) {
                            const klass = testcase.classname.replace(/$.*/g, '').replace(/\./g, '/');
                            const path = `${testSrcPath}${klass}.java`

                            const file = await fs.promises.readFile(path, {encoding: 'utf-8'});
                            //TODO: make this better won't deal with methods with arguments etc
                            let line = 0;
                            const lines = file.split('\n')
                                for(let i = 0; i < lines.length; i++) {
                                if(lines[i].indexOf(testcase.name) >= 0) {
                                    line = i;
                                    break;
                                }
                            }
                            annotations.push({
                                path: path,
                                start_line: line,
                                end_line: line,
                                start_column: 0,
                                end_column: 0,
                                annotation_level: 'failure',
                                message: `Junit test ${testcase.name} failed ${testcase.failure.message}`,
                              });
                        }
                        //add
                    }      
                }

                if(Array.isArray(testsuite.testcase)) {
                    for(const testcase of testsuite.testcase) {
                        await testFunction(testcase)
                    }
                }else {
                    //single test
                    await testFunction(testsuite.testcase)
                }
            }
        }

        const octokit = new github.GitHub(accessToken);
        const req = {
        ...github.context.repo,
        ref: github.context.sha
        }
        const res = await octokit.checks.listForRef(req);
        const jobName = process.env.GITHUB_JOB

        const check_run_id = res.data.check_runs.filter(check => check.name === jobName)[0].id
    
        const annotation_level = numFailed + numErrored > 0 ?'failure': 'notice';
        const annotation = {
            path: 'test',
            start_line: 0,
            end_line: 0,
            start_column: 0,
            end_column: 0,
            annotation_level,
            message: `Junit Results ran ${numTests} in ${testDuration} seconds ${numErrored} Errored, ${numFailed} Failed, ${numSkipped} Skipped`,
          };
        // const annotation = {
        //   path: 'test',
        //   start_line: 1,
        //   end_line: 1,
        //   start_column: 2,
        //   end_column: 2,
        //   annotation_level,
        //   message: `[500] failure`,
        // };


        const update_req = {
            ...github.context.repo,
            check_run_id,
            output: {
                title: "Junit Results",
                summary: `Num passed etc`,
                annotations: [annotation, ...annotations]
            }
        }
        await octokit.checks.update(update_req);
    } catch (error) {
   		core.setFailed(error.message);
    }
})();
