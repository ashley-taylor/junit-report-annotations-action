const core = require("@actions/core");
const github = require("@actions/github");
const glob = require("@actions/glob");
const parser = require("xml2js");
const fs = require("fs");

(async () => {
  try {
    const inputPath = core.getInput("path");
    const includeSummary = core.getInput("includeSummary");
    const numFailures = core.getInput("numFailures");
    const accessToken = core.getInput("access-token");
    const testSrcPath = core.getInput("testSrcPath");
    const globber = await glob.create(inputPath, {
      followSymbolicLinks: false,
    });

    let numTests = 0;
    let numSkipped = 0;
    let numFailed = 0;
    let numErrored = 0;
    let testDuration = 0;

    let annotations = [];

    for await (const file of globber.globGenerator()) {
      const data = await fs.promises.readFile(file);
      let json = parser.parseStringPromise(data);
      if (json.testsuite) {
        const testsuite = json.testsuite;
        testDuration += Number(testsuite.time);
        numTests += Number(testsuite.tests);
        numErrored += Number(testsuite.errors);
        numFailed += Number(testsuite.failures);
        numSkipped += Number(testsuite.skipped);
        testFunction = async (testcase) => {
          if (testcase.failure) {
            if (annotations.length < numFailures) {
              let {filePath, line} = await findTestLocation(testcase, testSrcPath);
              annotations.push({
                path: filePath,
                start_line: line,
                end_line: line,
                start_column: 0,
                end_column: 0,
                annotation_level: "failure",
                message: `Junit test ${testcase.name} failed ${testcase.failure.message}`,
              });
            }
          }
        };

        if (Array.isArray(testsuite.testcase)) {
          for (const testcase of testsuite.testcase) {
            await testFunction(testcase);
          }
        } else {
          //single test
          await testFunction(testsuite.testcase);
        }
      }
    }

    const annotation_level = numFailed + numErrored > 0 ? "failure" : "notice";
    const annotation = {
      path: "test",
      start_line: 0,
      end_line: 0,
      start_column: 0,
      end_column: 0,
      annotation_level,
      message: `Junit Results ran ${numTests} in ${testDuration} seconds ${numErrored} Errored, ${numFailed} Failed, ${numSkipped} Skipped`,
    };

    annotations = [annotation, ...annotations];
    if (annotation_level === "failure") {
      //can just log these
      for (const annotation of annotations) {
        console.info(
          `::warning file=${annotation.path},line=${annotation.start_line}::${annotation.message}`
        );
      }
    } else {
      const octokit = new github.GitHub(accessToken);
      const req = {
        ...github.context.repo,
        ref: github.context.sha,
      };
      const res = await octokit.checks.listForRef(req);
      const jobName = process.env.GITHUB_JOB;

      const checkRun = res.data.check_runs.find(
        (check) => check.name === jobName
      );
      if (!checkRun) {
        console.log(
          "Junit tests result passed but can not identify test suite."
        );
        console.log(
          "Can happen when performing a pull request from a forked repository."
        );
        return;
      }
      const check_run_id = checkRun.id;

      const update_req = {
        ...github.context.repo,
        check_run_id,
        output: {
          title: "Junit Results",
          summary: "Num passed etc",
          annotations,
        },
      };
      await octokit.checks.update(update_req);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
})();

async function findTestLocation(testcase, testSrcPath) {
  const klass = testcase.classname
      .replace(/$.*/g, "")
      .replace(/\./g, "/");
  const filePathGlob = `${testSrcPath}${klass}.*`;
  const filePaths = await glob.create(filePathGlob, {
    followSymbolicLinks: false,
  });
  let filePath;
  for await (const file of filePaths.globGenerator()) {
    filePath = file;
  }

  let line = 0;
  if (filePath !== undefined) {
    const file = await fs.promises.readFile(filePath, {
      encoding: "utf-8",
    });
    //TODO: make this better won't deal with methods with arguments etc
    const lines = file.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].indexOf(testcase.name) >= 0) {
        line = i;
        break;
      }
    }
  } else {
    //fall back so see something
    filePath = `${testSrcPath}${klass}`;
  }
  return {filePath, line};
}

module.exports.findTestLocation = findTestLocation;