const { spawn } = require("child_process");
const p = spawn("npx.cmd", ["expo", "start", "--port", "8082"], {
  cwd: "C:\\Users\\???\\Documents\\timer\\kaoyan-app",
  stdio: "ignore",
  shell: true,
  detached: true,
});
p.unref();
console.log("Expo started on port 8082");
