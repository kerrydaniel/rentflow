const showBootError = (error) => {
  const root = document.getElementById("root");
  const message = error?.message || String(error || "Unknown startup error");
  if (root) {
    root.innerHTML = \`
      <div style="min-height:100vh;display:grid;place-items:center;background:#f5f7fb;font-family:Inter,system-ui,sans-serif;color:#172033">
        <div style="width:min(560px,calc(100% - 40px));padding:32px;background:#fff;border:1px solid #e3e8f0;border-radius:18px;box-shadow:0 20px 60px rgba(16,24,39,.08)">
          <h1 style="margin:0 0 10px">RentFlow could not start</h1>
          <p style="color:#667189;line-height:1.5">The application bundle loaded, but the application module failed to initialize.</p>
          <div style="margin-top:18px;padding:14px;background:#fff6e5;border-radius:9px;color:#7a4b00;word-break:break-word">
            <b>Error</b><br>\${message.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
          </div>
          <button style="margin-top:18px;padding:11px 16px;border:0;border-radius:8px;background:#172033;color:#fff;cursor:pointer" onclick="location.reload()">Reload RentFlow</button>
        </div>
      </div>\`;
  }
  console.error("RentFlow bootstrap error", error);
};

import("./main.jsx").catch(showBootError);
