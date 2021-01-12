# CodeDumpToMD

Allows you to specify a directory and generate a markdown and pdf file from it.

## Getting started
Install all dependencies:
```
npm install
```
Then open config.json and fill out the following parameters:
```json
{
    "folders": ["/source/directory"],
    "fileBlacklist": [],
    "documentFilename": "output.md",
    "documentTitle": "My Source Code",
    "makeMD": true,
    "makePDF": true
}
```
Then run using the following command:
```
npm start
```
The file(s) will be generated to the working directory.

Let me know if you have any issues!
