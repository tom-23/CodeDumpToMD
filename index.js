const fs = require('fs');
var path = require('path');

const folders = ['/source/code/dir']

let textBuf = "# CodeDump \r\n";


folders.forEach(folder => {
    const files = fs.readdirSync(folder, { withFileTypes: true });
    const fileList = files.filter(files => files.isFile()).map(files => files.name);
    fileList.forEach(file => {
        if (file != ".DS_Store") {
            textBuf += ("## " + file + "\r\n");
            //console.log(folder + "/" + file);
            const fileData = fs.readFileSync(folder + "/" + file);
            const fileExtention = path.extname(folder + "/" + file).replace(".", "");
            textBuf += ("```" + fileExtention + "\r\n");
            textBuf += fileData;
            textBuf += "```\r\n\r\n"
        }

    });
});

fs.writeFile("output.md", textBuf, "utf-8", function (err) {
    if (err) {
        return console.log(err);
    }
    console.log("The file was saved!");
});
//console.log(textBuf);