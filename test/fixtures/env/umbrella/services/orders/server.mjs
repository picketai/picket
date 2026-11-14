import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 8080);

createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("ok");
    return;
  }
  response.writeHead(404);
  response.end();
}).listen(port);
