"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { setAdminToken } from "@/lib/admin-client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({})))?.message || "登录失败";
        throw new Error(msg);
      }
      const data = await res.json();
      setAdminToken(data.token);
      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err?.message || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-content flex items-center justify-center px-6 py-16">
      <div className="admin-card w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold mb-6 text-slate-900">Admin 登录</h1>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm text-slate-600 mb-2">用户名</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-500 focus:outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-2">密码</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-500 focus:outline-none"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button className="admin-btn w-full" disabled={loading} type="submit">
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}
