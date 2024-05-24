import { ChildProcess, spawn, exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

export class Container {
  private bashShell: ChildProcess | null;
  private execPromise;
  private _fileIndex: { path: string; hash: string }[] | null = null;
  private indexFilePath: string;

  constructor(private containerName: string) {
    this.containerName = containerName;
    this.bashShell = this.startConnexionDocker();
    this.execPromise = promisify(exec);
    this.indexFilePath = path.join(
      __dirname,
      `${this.containerName}_file_index.json`,
    );
    this._fileIndex = this.fileIndex;
  }

  private startConnexionDocker(): ChildProcess {
    console.log(`Starting bash shell in container ${this.containerName}`);
    return spawn("docker", ["exec", "-i", this.containerName, "bash"]);
  }

  public stopConnexionDocker(): void {
    if (this.bashShell) {
      this.bashShell.kill();
      this.bashShell = null;
      console.log("Shell connexion stopped");
    }
  }

  public async getStatus(): Promise<{ status: boolean; message: string }> {
    if (this.bashShell) {
      try {
        await this.ping();

        return {
          status: true,
          message: "Connexion to the container is active",
        };
      } catch (error: any) {
        return {
          status: false,
          message: `Failed to execute command: ${error.message}`,
        };
      }
    } else {
      return { status: false, message: "No connexion to the container" };
    }
  }

  public getContainerName(): string {
    return this.containerName;
  }

  public setContainerName(containerName: string): void {
    this.containerName = containerName;
  }

  public restartConnexionDocker(): void {
    this.stopConnexionDocker();
    this.bashShell = this.startConnexionDocker();
  }
  public async ping(): Promise<string> {
    try {
      const { stdout } = await this.execPromise(
        `docker exec ${this.containerName} echo "pong"`,
      );
      return stdout;
    } catch (error: any) {
      throw new Error(
        `Failed to execute command: ${error.message}. Stderr: ${error.stderr}`,
      );
    }
  }

  public async sendCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = ["exec", this.containerName, "bash", "-c", command];
      const childProcess = spawn("docker", args);

      let stdoutData = "";
      let stderrData = "";

      childProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      childProcess.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      childProcess.on("error", (error) => {
        reject(
          new Error(
            `Failed to execute command: ${error.message}. Stderr: ${stderrData}`,
          ),
        );
      });

      childProcess.on("close", (code) => {
        if (code === 0) {
          resolve(stdoutData);
        } else {
          reject(
            new Error(
              `Command exited with code ${code}. Stderr: ${stderrData}`,
            ),
          );
        }
      });
    });
  }
  // Getter for fileIndex
  public get fileIndex(): { path: string; hash: string }[] | null {
    if (this._fileIndex === null) {
      if (fs.existsSync(this.indexFilePath)) {
        const fileContent = fs.readFileSync(this.indexFilePath, "utf-8");
        this._fileIndex = JSON.parse(fileContent);
      }
    }
    return this._fileIndex;
  }

  // Setter for fileIndex
  public set fileIndex(index: { path: string; hash: string }[] | null) {
    this._fileIndex = index;
    if (index !== null) {
      fs.writeFileSync(this.indexFilePath, JSON.stringify(index, null, 2));
    }
  }

  // Method to index files and update fileIndex
  public async indexFiles(): Promise<void> {
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
        .filter(
          (item) =>
            !item.path.includes("__pycache__") && !item.path.endsWith(".pyc"),
        );
      this.fileIndex = index; // Automatically saves the file
    } catch (error: any) {
      throw new Error(`Failed to index files: ${error.message}`);
    }
  }
}
