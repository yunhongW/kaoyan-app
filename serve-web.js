const http = require("http"), fs = require("fs"), path = require("path");
const m = {"":"text/html;charset=utf-8",".html":"text/html;charset=utf-8",".css":"text/css;charset=utf-8",".js":"application/javascript;charset=utf-8",".json":"application/json",".png":"image/png",".ttf":"font/ttf",".woff":"font/woff",".woff2":"font/woff2",".svg":"image/svg+xml",".ico":"image/x-icon"};
http.createServer((req, res) => {
  let f = path.join(__dirname, "dist", req.url === "/" ? "index.html" : req.url.split("?")[0]);
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    const ext = path.extname(f);
    res.writeHead(200, { "Content-Type": m[ext] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
}).listen(8084, () => console.log("http://localhost:8084"));
