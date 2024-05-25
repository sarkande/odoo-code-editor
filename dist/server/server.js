"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const container_1 = require("./container");
class Server {
    app;
    server;
    port;
    _container;
    constructor() {
        this.app = (0, express_1.default)();
        this.server = http_1.default.createServer(this.app);
        this.port = 3001;
        this._container = null;
        this.configureMiddleware();
        this.configureRoutes();
    }
    // Getter for container
    get container() {
        return this._container;
    }
    // Setter for container
    set container(container) {
        if (this._container != null) {
            this._container.stopConnexionDocker();
        }
        this._container = container;
    }
    configureMiddleware() {
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.static(path_1.default.join(__dirname, "../../public")));
        this.app.use("/dist/client", express_1.default.static(path_1.default.join(__dirname, "../../dist/client")));
    }
    configureRoutes() {
        this.app.post("/start-bash-container", async (req, res) => {
            console.log("Received request to start shell");
            // Get the container name from the request body
            const containerName = req.body.containerName;
            console.log(`Container name: ${containerName}`);
            if (!containerName || containerName === "") {
                return res
                    .status(400)
                    .send({ status: "error", message: "Container name is required" });
            }
            this.container = new container_1.Container(containerName);
            try {
                const status = await this.container.getStatus();
                if (status.status) {
                    res.send({
                        status: "success",
                        message: status.message,
                    });
                }
                else {
                    res.status(500).send({
                        status: "error",
                        message: status.message,
                    });
                }
            }
            catch (error) {
                res.status(500).send({
                    status: "error",
                    message: `Failed to get container status: ${error.message}`,
                });
            }
        });
        this.app.post("/get-container-file", async (req, res) => {
            res.send(this._container?.fileIndex);
        });
        this.app.post("/run-index", async (req, res) => {
            console.log("Received request to run code");
            // get the code from the request body
            const command = "ls /usr/lib/python3/dist-packages/odoo ";
            console.log(`Command: ${command}`);
            if (!command || command === "") {
                return res
                    .status(400)
                    .send({ status: "error", message: "Command is required" });
            }
            if (this.container) {
                try {
                    const status = await this.container.getStatus();
                    if (status.status) {
                        try {
                            const result = await this.container.sendCommand(command);
                            return res.send({ status: "success", message: result });
                        }
                        catch (error) {
                            return res
                                .status(500)
                                .send({ status: "error", message: error.message });
                        }
                    }
                    else {
                        return res
                            .status(500)
                            .send({ status: "error", message: "Container not started" });
                    }
                }
                catch (err) {
                    return res.status(500).send({
                        status: "error",
                        message: "Failed to get container status",
                    });
                }
            }
            else {
                return res
                    .status(500)
                    .send({ status: "error", message: "Container is not defined" });
            }
        });
        this.app.post("/index-files", async (req, res) => {
            console.log("Received request to index files");
            if (this.container) {
                try {
                    const status = await this.container.getStatus();
                    if (status.status) {
                        try {
                            await this.container.indexFiles();
                            res.send({
                                status: "success",
                                message: "Files indexed successfully",
                                data: this.container.fileIndex,
                            });
                        }
                        catch (error) {
                            res.status(500).send({
                                status: "error",
                                message: error.message,
                            });
                        }
                    }
                    else {
                        res.status(500).send({
                            status: "error",
                            message: "Container not started",
                        });
                    }
                }
                catch (err) {
                    res.status(500).send({
                        status: "error",
                        message: "Failed to get container status",
                    });
                }
            }
            else {
                res.status(500).send({
                    status: "error",
                    message: "Container is not defined",
                });
            }
        });
        this.app.post("/open-file", async (req, res) => {
            console.log("Received request to get file");
            //need to get the file path from the request body
            //then we execute the command cat file_path
            const filePath = req.body.path;
            if (!filePath || filePath === "") {
                return res
                    .status(400)
                    .send({ status: "error", message: "File path is required" });
            }
            console.log(`File path: ${filePath}`);
            if (this.container) {
                try {
                    const status = await this.container.getStatus();
                    if (status.status) {
                        try {
                            const result = await this.container.sendCommand(`cat ${filePath}`);
                            return res.send({ status: "success", message: result });
                        }
                        catch (error) {
                            return res
                                .status(500)
                                .send({ status: "error", message: error.message });
                        }
                    }
                    else {
                        return res
                            .status(500)
                            .send({ status: "error", message: "Container not started" });
                    }
                }
                catch (err) {
                    return res.status(500).send({
                        status: "error",
                        message: "Failed to get container status",
                    });
                }
            }
        });
        this.app.post("/save-file", async (req, res) => {
            console.log("Received request to save file");
            const filePath = req.body.path;
            const content = req.body.content;
            if (!filePath || filePath === "") {
                return res
                    .status(400)
                    .send({ status: "error", message: "File path is required" });
            }
            if (!content || content === "") {
                return res
                    .status(400)
                    .send({ status: "error", message: "Content is required" });
            }
            console.log(`File path: ${filePath}`);
            console.log(`Content: ${content}`);
            if (this.container) {
                try {
                    const status = await this.container.getStatus();
                    if (status.status) {
                        try {
                            const escapedContent = content
                                .replace(/"/g, '\\"')
                                .replace(/\$/g, "\\$"); // Escape double quotes and dollar signs
                            const result = await this.container.sendCommand(`echo "${escapedContent}" | tee ${filePath}`);
                            return res.send({ status: "success", message: result });
                        }
                        catch (error) {
                            return res
                                .status(500)
                                .send({ status: "error", message: error.message });
                        }
                    }
                    else {
                        return res
                            .status(500)
                            .send({ status: "error", message: "Container not started" });
                    }
                }
                catch (err) {
                    return res.status(500).send({
                        status: "error",
                        message: "Failed to get container status",
                    });
                }
            }
        });
        this.app.use((req, res) => {
            console.log(`Received request from: ${req.ip}`);
            res.status(404).send("Page not found");
        });
    }
    start() {
        this.server.listen(this.port, () => {
            console.log(`Odoo code editor running on  http://localhost:${this.port}`);
        });
    }
}
exports.Server = Server;
