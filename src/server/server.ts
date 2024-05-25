import express, { Request, Response } from "express";
import http from "http";
import path from "path";
import { Container } from "./container";

export class Server {
  private app: express.Application;
  private server: http.Server;
  private port: number;

  private _container: Container | null;
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.port = 3001;
    this._container = null;

    this.configureMiddleware();
    this.configureRoutes();
  }

  // Getter for container
  public get container(): Container | null {
    return this._container;
  }

  // Setter for container
  public set container(container: Container | null) {
    if (this._container != null) {
      this._container.stopConnexionDocker();
    }
    this._container = container;
  }

  private configureMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, "../../public")));
    this.app.use(
      "/dist/client",
      express.static(path.join(__dirname, "../../dist/client")),
    );
  }

  private configureRoutes(): void {
    this.app.post(
      "/start-bash-container",
      async (req: Request, res: Response) => {
        console.log("Received request to start shell");
        // Get the container name from the request body
        const containerName: string = req.body.containerName;
        console.log(`Container name: ${containerName}`);

        if (!containerName || containerName === "") {
          return res
            .status(400)
            .send({ status: "error", message: "Container name is required" });
        }

        this.container = new Container(containerName);

        try {
          const status = await this.container.getStatus();
          if (status.status) {
            res.send({
              status: "success",
              message: status.message,
            });
          } else {
            res.status(500).send({
              status: "error",
              message: status.message,
            });
          }
        } catch (error: any) {
          res.status(500).send({
            status: "error",
            message: `Failed to get container status: ${error.message}`,
          });
        }
      },
    );
    this.app.post(
      "/get-container-file",
      async (req: Request, res: Response) => {
        res.send(this._container?.fileIndex);
      },
    );
    this.app.post("/run-index", async (req: Request, res: Response) => {
      console.log("Received request to run code");
      // get the code from the request body
      const command: string = "ls /usr/lib/python3/dist-packages/odoo ";
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
            } catch (error: any) {
              return res
                .status(500)
                .send({ status: "error", message: error.message });
            }
          } else {
            return res
              .status(500)
              .send({ status: "error", message: "Container not started" });
          }
        } catch (err) {
          return res.status(500).send({
            status: "error",
            message: "Failed to get container status",
          });
        }
      } else {
        return res
          .status(500)
          .send({ status: "error", message: "Container is not defined" });
      }
    });
    this.app.post("/index-files", async (req: Request, res: Response) => {
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
            } catch (error: any) {
              res.status(500).send({
                status: "error",
                message: error.message,
              });
            }
          } else {
            res.status(500).send({
              status: "error",
              message: "Container not started",
            });
          }
        } catch (err) {
          res.status(500).send({
            status: "error",
            message: "Failed to get container status",
          });
        }
      } else {
        res.status(500).send({
          status: "error",
          message: "Container is not defined",
        });
      }
    });

    this.app.post("/open-file", async (req: Request, res: Response) => {
      console.log("Received request to get file");
      //need to get the file path from the request body
      //then we execute the command cat file_path
      const filePath: string = req.body.path;
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
              const result = await this.container.sendCommand(
                `cat ${filePath}`,
              );

              return res.send({ status: "success", message: result });
            } catch (error: any) {
              return res
                .status(500)
                .send({ status: "error", message: error.message });
            }
          } else {
            return res
              .status(500)
              .send({ status: "error", message: "Container not started" });
          }
        } catch (err) {
          return res.status(500).send({
            status: "error",
            message: "Failed to get container status",
          });
        }
      }
    });

    this.app.use((req: Request, res: Response) => {
      console.log(`Received request from: ${req.ip}`);

      res.status(404).send("Page not found");
    });
  }

  public start(): void {
    this.server.listen(this.port, () => {
      console.log(`Odoo code editor running on  http://localhost:${this.port}`);
    });
  }
}
