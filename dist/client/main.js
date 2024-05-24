"use strict";
document.addEventListener("DOMContentLoaded", () => {
    console.log("Hello, TypeScript!");
    let code = document.getElementById("code");
    let startBash = document.getElementById("start-bash");
    let containerName = document.getElementById("container-name");
    let index = document.getElementById("index");
    let save = document.getElementById("save");
    if (!code)
        throw new Error("Code element not found");
    if (!startBash)
        throw new Error("Start bash element not found");
    if (!containerName)
        throw new Error("Container name element not found");
    if (!index)
        throw new Error("Index element not found");
    if (!save)
        throw new Error("Save element not found");
    startBash.addEventListener("click", async () => {
        console.log("Starting bash shell in container");
        console.log(containerName.value);
        let res = await fetch("/start-bash-container", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ containerName: containerName.value }),
        });
        let data = await res.json();
        console.log(data);
        // alert(data.message);
    });
    index.addEventListener("click", async () => {
        console.log("Running index in container");
        let res = await fetch("/index-files", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });
        let data = await res.json();
        console.log(data);
        // alert(data.message);
    });
    save.addEventListener("click", async () => {
        console.log("Get container file in container");
        let res = await fetch("/get-container-file", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });
        let data = await res.json();
        console.log(data);
        // alert(data.message);
    });
});
