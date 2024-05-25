"use strict";
document.addEventListener("DOMContentLoaded", async () => {
    displayMessage("Odoo Code Editor is ready!");
    let code = document.getElementById("code");
    let startBash = document.getElementById("start-bash");
    let containerName = document.getElementById("container-name");
    let openFile = document.getElementById("open-file");
    let scanFiles = document.getElementById("scan-files");
    let loadFiles = document.getElementById("load-files");
    let search = document.getElementById("search");
    let searchResults = document.getElementById("search-results");
    let saveFile = document.getElementById("save-file");
    if (!code)
        throw new Error("Code element not found");
    if (!startBash)
        throw new Error("Start bash element not found");
    if (!containerName)
        throw new Error("Container name element not found");
    if (!openFile)
        throw new Error("Index element not found");
    if (!scanFiles)
        throw new Error("Index element not found");
    if (!loadFiles)
        throw new Error("Save element not found");
    if (!search)
        throw new Error("Search element not found");
    if (!searchResults)
        throw new Error("Search results element not found");
    if (!saveFile)
        throw new Error("Save element not found");
    let fileIndex = [];
    let editor = null; // To store the CodeMirror editor instance
    // Save the file index when the save button is clicked
    loadFiles.addEventListener("click", async () => {
        displayMessage("Get container file in container");
        let res = await fetch("/get-container-file", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });
        let data = await res.json();
        if (data.length > 0) {
            fileIndex = data;
            displayMessage(`File index loaded with ${fileIndex.length} files`);
        }
        else {
            displayMessage("Failed to save file index", true);
        }
    });
    startBash.addEventListener("click", async () => {
        displayMessage("Starting bash shell in container");
        displayMessage(containerName.value);
        let res = await fetch("/start-bash-container", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ containerName: containerName.value }),
        });
        let data = await res.json();
        displayMessage(data.message);
        // alert(data.message);
    });
    scanFiles.addEventListener("click", async () => {
        displayMessage("Running index in container");
        let res = await fetch("/index-files", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });
        let data = await res.json();
        displayMessage(`${data.message} ${data.data.length} files indexed`);
        // alert(data.message);
    });
    openFile.addEventListener("click", async () => {
        displayMessage("Opening file in container");
        //get search-results value
        let selectedFile = searchResults.value;
        if (!selectedFile || selectedFile === "") {
            alert("Please select a file to open");
            return;
        }
        //send path file to the server
        let res = await fetch("/open-file", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: selectedFile }),
        });
        let data = await res.json();
        displayMessage(`File has been opened with the status ${data.status}`);
        //if file is opened, display the content in the textarea
        //the textarea should load codemirror depending on the file type
        if (data.status === "success") {
            let extension = selectedFile.split(".").pop();
            let mode = "";
            switch (extension) {
                case "js":
                    mode = "javascript";
                    break;
                case "py":
                    mode = "python";
                    break;
                case "xml":
                    mode = "xml";
                    break;
                case "css":
                    mode = "css";
                    break;
                case "html":
                    mode = "html";
                    break;
                case "sql":
                    mode = "sql";
                    break;
                case "scss":
                    mode = "sass";
                    break;
                case "json":
                    mode = "javascript";
                    break;
                default:
                    mode = "python";
                    break;
            }
            if (!editor) {
                editor = CodeMirror.fromTextArea(code, {
                    lineNumbers: true,
                    mode: mode,
                });
            }
            else {
                editor.setOption("mode", mode);
            }
            //reset the editor value
            editor.setValue(data.message);
        }
        else {
            alert(data.message);
        }
    });
    search.addEventListener("input", () => {
        let query = search.value.trim().toLowerCase();
        if (query.length >= 3 && fileIndex.length > 0) {
            let results = fileIndex.filter((file) => file.path.toLowerCase().includes(query));
            displaySearchResults(results);
        }
        else {
            clearSearchResults();
        }
    });
    saveFile.addEventListener("click", async () => {
        displayMessage("Saving file in container");
        let res = await fetch("/save-file", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                path: searchResults.value,
                content: editor.getValue(),
            }),
        });
        let data = await res.json();
        displayMessage(`the file has been saved with the status ${data.status}`);
    });
    function displaySearchResults(results) {
        searchResults.innerHTML = "";
        results.forEach((result) => {
            let option = document.createElement("option");
            option.value = result.path;
            option.textContent = result.path;
            searchResults.appendChild(option);
        });
    }
    function clearSearchResults() {
        searchResults.innerHTML = "";
    }
    function displayMessage(message, isError = false) {
        const outputDiv = document.getElementById("output");
        const messageElement = document.createElement("div");
        messageElement.textContent = message;
        if (isError) {
            messageElement.classList.add("error");
        }
        outputDiv.appendChild(messageElement);
        outputDiv.scrollTop = outputDiv.scrollHeight; // Scroll to the bottom
    }
});
