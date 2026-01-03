const loginBtn = document.getElementById("loginBtn");
const loginStatus = document.getElementById("loginStatus");

const apiFetch = async (path, options = {}) => {
  const headers = { ...(options.headers ?? {}) };
  if (!headers["Content-Type"] && options.body) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(path, { ...options, headers, credentials: "include" });
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  let data = {};
  if (text && contentType.includes("application/json")) {
    data = JSON.parse(text);
  }
  if (!response.ok) {
    const message = data?.message || text || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
};

loginBtn.addEventListener("click", async () => {
  loginStatus.textContent = "";
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (!email || !password) {
    loginStatus.textContent = "Email and password required.";
    return;
  }
  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem("adminToken", data.token);
    window.location.href = "/admin";
  } catch (err) {
    loginStatus.textContent = err.message;
  }
});
