const index = require('./index');
const path = require("path");
const fs = require("fs").promises;

describe('find test location', () => {
    let testReportFile;
    let testCase;

    describe('given single module archetype', () => {
        beforeAll(async () => {
            testReportFile = resolve("target/surefire-reports/TEST-dummy.xml");
            testCase = {
                classname: "org.dummy.ClassTest",
                name: "methodTest"
            };

            await addFile(
                'src/main/java/org/dummy/ClassTest.java',
                'package org.dummy;\n' +
                'class ClassTest {\n' +
                'void methodTest() { }\n');

            await addFile('src/main/java/org/dummy2/ClassTest.java', '/* empty */');
        });

        afterAll(clearFiles);

        it('should find path of the class', async () => {
            let {filePath, line} = await index.findTestLocation(testReportFile, testCase);

            expect(filePath).toBe(resolve('src/main/java/org/dummy/ClassTest.java'));
        });
    });
});

async function addFile(filePath, content) {
    filePath = 'tmp/' + filePath;
    let dirname = path.dirname(filePath);
    await fs.mkdir(dirname, { recursive: true });
    await fs.writeFile(filePath, content);
}

async function clearFiles() {
    await fs.rmdir('tmp', { recursive: true });
}

function resolve(filePath) {
    return path.resolve('tmp/' + filePath);
}
