const index = require("./index");
const path = require("path");
const fs = require("fs").promises;

describe("find test location", () => {
  let testReportFile;
  let testCase;

  describe("given single module archetype", () => {
    beforeAll(async () => {
      testReportFile = resolve("target/surefire-reports/TEST-dummy.xml");
      testCase = {
        $: {
          classname: "org.dummy.ClassTest",
          name: "methodTest",
        },
      };

      await addFile(
        "src/main/java/org/dummy/ClassTest.java",
        "package org.dummy;\n" +
          "class ClassTest {\n" +
          "void methodTest() { }\n" +
          "}"
      );

      await addFile("src/main/java/org/dummy2/ClassTest.java", "/* empty */");
    });

    afterAll(clearFiles);

    it("should find path of the class", async () => {
      let { filePath, line } = await index.findTestLocation(
        testReportFile,
        testCase
      );

      expect(filePath).toBe(resolve("src/main/java/org/dummy/ClassTest.java"));
    });

    it("should find line of the method", async () => {
      let { filePath, line } = await index.findTestLocation(
        testReportFile,
        testCase
      );

      expect(line).toBe(3);
    });
  });

  describe("given multiple gradle modules", () => {
    beforeAll(async () => {
      testReportFile = resolve(
        "very_long_module1/build/test-results/test/TEST-dummy.xml"
      );
      testCase = {
        $: {
          classname: "org.dummy.ClassTest",
          name: "methodTest",
        },
      };

      await addFile("src/main/java/org/dummy/ClassTest.java", "");
      await addFile(
        "very_long_module1/src/main/java/org/dummy/ClassTest.java",
        ""
      );
      await addFile("module2/src/main/java/org/dummy/ClassTest.java", "");
    });

    afterAll(clearFiles);

    it("should find path of the class in the good module", async () => {
      let { filePath, line } = await index.findTestLocation(
        testReportFile,
        testCase
      );

      expect(filePath).toBe(
        resolve("very_long_module1/src/main/java/org/dummy/ClassTest.java")
      );
    });
  });
});

describe('readTestSuites', () => {
  describe('given testsuite tag', () => {
    afterAll(clearFiles);

    it('should return single test suite', async () => {
      const filePath = 'TEST-report.xml';

      await addFile(filePath, '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<testsuite name="org.dummy.DummyTest" tests="4" skipped="1" failures="1" errors="1"' +
          ' timestamp="2020-07-21T19:20:12" hostname="dummy" time="0.132">\n' +
          '  <testcase name="test1" classname="org.dummy.DummyTest" time="0.028"/>\n' +
          '  <testcase name="test2" classname="org.dummy.DummyTest" time="0.054">\n' +
          '    <failure message="failure_message" type="failure_type">failure_text</failure>\n' +
          '  </testcase>\n' +
          '</testsuite>');

      const testSuites = await index.readTestSuites(resolve(filePath));

      expect(testSuites).toStrictEqual([{
        $: {
          name: 'org.dummy.DummyTest',
          tests: '4',
          skipped: '1',
          failures: '1',
          errors: '1',
          timestamp: '2020-07-21T19:20:12',
          hostname: 'dummy',
          time: '0.132'
        },
        testcase: [
          {
            $: {
              name: 'test1',
              classname: 'org.dummy.DummyTest',
              time: '0.028'
            }
          },
          {
            $: {
              name: 'test2',
              classname: 'org.dummy.DummyTest',
              time: '0.054'
            },
            failure: [{
              $: {
                message: 'failure_message',
                type: 'failure_type'
              },
              _: 'failure_text'
            }]
          }
        ]
      }]);
    });
  });

  describe('given testsuites tag', () => {
    afterAll(clearFiles);

    it('should return multiple test suites', async () => {
      const filePath = 'TEST-report.xml';

      await addFile(filePath, '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<testsuites>\n' +
          '  <testsuite name="org.dummy.DummyTest" tests="4" skipped="1" failures="1" errors="1"' +
          '   timestamp="2020-07-21T19:20:12" hostname="dummy" time="0.132">\n' +
          '    <testcase name="test1" classname="org.dummy.DummyTest" time="0.028"/>\n' +
          '    <testcase name="test2" classname="org.dummy.DummyTest" time="0.054">\n' +
          '      <failure message="failure_message" type="failure_type">' +
          '<![CDATA[failure_text]]></failure>\n' +
          '    </testcase>\n' +
          '  </testsuite>\n' +
          '  <testsuite name="org.dummy.DummyTest2">\n' +
          '  </testsuite>\n' +
          '</testsuites>');

      const testSuites = await index.readTestSuites(resolve(filePath));

      expect(testSuites).toStrictEqual([
        {
          $: {
            name: 'org.dummy.DummyTest',
            tests: '4',
            skipped: '1',
            failures: '1',
            errors: '1',
            timestamp: '2020-07-21T19:20:12',
            hostname: 'dummy',
            time: '0.132'
          },
          testcase: [
            {
              $: {
                name: 'test1',
                classname: 'org.dummy.DummyTest',
                time: '0.028'
              }
            },
            {
              $: {
                name: 'test2',
                classname: 'org.dummy.DummyTest',
                time: '0.054'
              },
              failure: [{
                $: {
                  message: 'failure_message',
                  type: 'failure_type'
                },
                _: 'failure_text'
              }]
            }
          ]
        },
        {
          $: {
            name: 'org.dummy.DummyTest2'
          }
        }
      ]);
    });
  });
});

describe('TestSummary', () => {
  let testSummary;

  beforeEach(() => {
    testSummary = new index.TestSummary();
  });

  describe('handleTestSuite', () => {
    it('should be initialized with empty summary', () => {
      expect(testSummary.testDuration).toBe(0);
      expect(testSummary.numTests).toBe(0);
      expect(testSummary.numErrored).toBe(0);
      expect(testSummary.numFailed).toBe(0);
      expect(testSummary.numSkipped).toBe(0);
      expect(testSummary.annotations).toStrictEqual([]);
    });

    it('should ignore missing values', async () => {
      await testSummary.handleTestSuite({
        $: {
          time: "1",
          tests: "2",
          errors: "3",
          failures: "4",
          skipped: "5"
        }
      }, 'file');

      await testSummary.handleTestSuite({$:{}}, 'file');
      await testSummary.handleTestSuite({}, 'file');

      expect(testSummary.testDuration).toBe(1);
      expect(testSummary.numTests).toBe(2);
      expect(testSummary.numErrored).toBe(3);
      expect(testSummary.numFailed).toBe(4);
      expect(testSummary.numSkipped).toBe(5);
    });

    it('should call handle test cases for all', async () => {
      spyOn(testSummary, 'handleTestCase');

      const testcase1 = { t1: '' };
      const testcase2 = { t2: '' };

      await testSummary.handleTestSuite({
        testcase: [testcase1, testcase2]
      }, 'file');

      expect(testSummary.handleTestCase).toHaveBeenCalledWith(testcase1, 'file');
      expect(testSummary.handleTestCase).toHaveBeenCalledWith(testcase2, 'file');
    });
  });

  describe('handleTestCase', () => {
    it('should do nothing if there is no failure', async () => {
      await testSummary.handleTestCase({}, 'file');

      expect(testSummary.annotations).toStrictEqual([]);
    });

    it('should add an annotation if there is failure', async () => {
      const testcase = {
        $: {
          name: 'dummyTest'
        },
        failure: [{
          $: {
            message: 'dummyMessage'
          },
          _: 'detailed description of failure'
        }]
      };

      spyOn(index, 'findTestLocation').and.returnValue({
        filePath: '/path/of/file',
        line: 42
      });

      await testSummary.handleTestCase(testcase, 'file');

      expect(testSummary.annotations).toStrictEqual([{
        path: '/path/of/file',
        start_line: 42,
        end_line: 42,
        start_column: 0,
        end_column: 0,
        annotation_level: 'failure',
        title: 'dummyTest',
        message: 'Junit test dummyTest failed dummyMessage',
        raw_details: 'detailed description of failure'
      }]);
    });

    it('should handle no message and no content in failure', async () => {
      const testcase = {
        $: {
          name: 'dummyTest'
        },
        failure: [{}]
      };

      spyOn(index, 'findTestLocation').and.returnValue({
        filePath: '/path/of/file',
        line: 42
      });

      await testSummary.handleTestCase(testcase, 'file');

      expect(testSummary.annotations).toStrictEqual([{
        path: '/path/of/file',
        start_line: 42,
        end_line: 42,
        start_column: 0,
        end_column: 0,
        annotation_level: 'failure',
        title: 'dummyTest',
        message: 'Junit test dummyTest failed',
        raw_details: 'No details'
      }]);
    });
  });
});

async function addFile(filePath, content) {
  filePath = "tmp/" + filePath;
  let dirname = path.dirname(filePath);
  await fs.mkdir(dirname, { recursive: true });
  await fs.writeFile(filePath, content);
}

async function clearFiles() {
  await fs.rmdir("tmp", { recursive: true });
}

function resolve(filePath) {
  return path.resolve("tmp/" + filePath);
}
