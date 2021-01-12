const fs = require('fs');
var path = require('path');
const { mdToPdf } = require('md-to-pdf');

const folders = ['/source/directory']
const outputFileName = "output";
const title = "Output Title";
const blackList = [""];
const makeMD = true;
const makePDF = true;

let textBuf = "# " + title + " \r\n";

if (makeMD) {
    console.log("Making Markdown file...")
    folders.forEach(folder => {
        const files = fs.readdirSync(folder, { withFileTypes: true });
        const fileList = files.filter(files => files.isFile()).map(files => files.name);
        fileList.forEach(file => {
            if (file != ".DS_Store") {
                if (!(blackList.indexOf(file) >= 0)) {
                    textBuf += ("## " + file + "\r\n");
                    const fileData = fs.readFileSync(folder + "/" + file);
                    const fileExtention = path.extname(folder + "/" + file).replace(".", "");
                    if (file.includes("CMake")) {
                        textBuf += ("```cmake \r\n");
                    } else {
                        textBuf += ("```" + fileExtention + "\r\n");
                    }

                    textBuf += fileData;
                    textBuf += "```\r\n\r\n"
                }
            }
        });
    });

    fs.writeFile(outputFileName + ".md", textBuf, "utf-8", function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("MD file saved!");
    });
}

if (!makeMD && !makePDF) {
    console.log("ERROR! - You have disabled PDF and MD generation. Nothing will be made!")
}

if (!makeMD && makePDF) {
    console.log("WARNING! - You have disabled MD generation but PDF generation is enabled. Please ensure you have a source markdown file!")
}

if (makePDF) {
    
        (async () => {
            const sourceFileName = outputFileName + ".md"
            console.log("Making PDF File...")
            const pdf = await mdToPdf({ path: sourceFileName }).catch(console.error);

            if (pdf) {
                console.log("PDF file saved!")
                fs.writeFileSync(outputFileName + ".pdf", pdf.content);
            }
        })();
}
//console.log(textBuf);