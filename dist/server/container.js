"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Container = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class Container {
    containerName;
    bashShell;
    execPromise;
    _fileIndex = null;
    indexFilePath;
    constructor(containerName) {
        this.containerName = containerName;
        this.containerName = containerName;
        this.bashShell = this.startConnexionDocker();
        this.execPromise = (0, util_1.promisify)(child_process_1.exec);
        this.indexFilePath = path.join(__dirname, `${this.containerName}_file_index.json`);
        this._fileIndex = this.fileIndex;
    }
    startConnexionDocker() {
        console.log(`Starting bash shell in container ${this.containerName}`);
        return (0, child_process_1.spawn)("docker", ["exec", "-i", this.containerName, "bash"]);
    }
    stopConnexionDocker() {
        if (this.bashShell) {
            this.bashShell.kill();
            this.bashShell = null;
            console.log("Shell connexion stopped");
        }
    }
    async getStatus() {
        if (this.bashShell) {
            try {
                await this.ping();
                return {
                    status: true,
                    message: "Connexion to the container is active",
                };
            }
            catch (error) {
                return {
                    status: false,
                    message: `Failed to execute command: ${error.message}`,
                };
            }
        }
        else {
            return { status: false, message: "No connexion to the container" };
        }
    }
    getContainerName() {
        return this.containerName;
    }
    setContainerName(containerName) {
        this.containerName = containerName;
    }
    restartConnexionDocker() {
        this.stopConnexionDocker();
        this.bashShell = this.startConnexionDocker();
    }
    async ping() {
        try {
            const { stdout } = await this.execPromise(`docker exec ${this.containerName} echo "pong"`);
            return stdout;
        }
        catch (error) {
            throw new Error(`Failed to execute command: ${error.message}. Stderr: ${error.stderr}`);
        }
    }
    async sendCommand(command) {
        return new Promise((resolve, reject) => {
            const args = ["exec", this.containerName, "bash", "-c", command];
            const childProcess = (0, child_process_1.spawn)("docker", args);
            let stdoutData = "";
            let stderrData = "";
            childProcess.stdout.on("data", (data) => {
                stdoutData += data.toString();
            });
            childProcess.stderr.on("data", (data) => {
                stderrData += data.toString();
            });
            childProcess.on("error", (error) => {
                reject(new Error(`Failed to execute command: ${error.message}. Stderr: ${stderrData}`));
            });
            childProcess.on("close", (code) => {
                if (code === 0) {
                    resolve(stdoutData);
                }
                else {
                    reject(new Error(`Command exited with code ${code}. Stderr: ${stderrData}`));
                }
            });
        });
    }
    // Getter for fileIndex
    get fileIndex() {
        if (this._fileIndex === null) {
            if (fs.existsSync(this.indexFilePath)) {
                const fileContent = fs.readFileSync(this.indexFilePath, "utf-8");
                this._fileIndex = JSON.parse(fileContent);
            }
        }
        return this._fileIndex;
    }
    // Setter for fileIndex
    set fileIndex(index) {
        this._fileIndex = index;
        if (index !== null) {
            fs.writeFileSync(this.indexFilePath, JSON.stringify(index, null, 2));
        }
    }
    // Method to index files and update fileIndex
    async indexFiles() {
        const directory = "/usr/lib/python3/dist-packages/odoo";
        const command = `find ${directory} -type f -not -name "*.pyc" -not -path "*/__pycache__/*" -print0 | xargs -0 sha256sum | awk '{ print $2 " " $1 }'`;
        try {
            const result = await this.sendCommand(command);
            const index = result
                .split("\n")
                .filter((line) => line)
                .map((line) => {
                const [path, hash] = line.split(" ");
                return { path, hash };
            })
                .filter((item) => !item.path.includes("__pycache__") && !item.path.endsWith(".pyc"));
            this.fileIndex = index; // Automatically saves the file
        }
        catch (error) {
            throw new Error(`Failed to index files: ${error.message}`);
        }
    }
}
exports.Container = Container;
