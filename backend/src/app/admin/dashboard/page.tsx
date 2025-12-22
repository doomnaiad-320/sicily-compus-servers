"use client";

import { useEffect, useState } from "react";
import { adminFetch, getAdminToken } from "@/lib/admin-client";
import { useRouter } from "next/navigation";

type DashboardStats = {
  userCount: number;
  orderCount: number;
  workerCount: number;
  completedOrders: number;
  totalIncome: number;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace("/admin");
      return;
    }
    load();
  }, []);

  const load = async () => {
    try {
      const data = await adminFetch<DashboardStats>("/api/admin/dashboard");
      setStats(data);
    } catch (e: any) {
      setError(e?.message || "加载失败");
    }
  };

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-slate-500">管理员控制台</p>
          <h1 className="text-2xl font-semibold text-slate-900">仪表盘</h1>
        </div>
        <div className="flex items-center gap-3">
          <a className="text-sm text-slate-600 hover:text-slate-900" href="/admin/orders">
            订单
          </a>
          <a className="text-sm text-slate-600 hover:text-slate-900" href="/admin/workers">
            兼职者
          </a>
          <a className="text-sm text-slate-600 hover:text-slate-900" href="/admin/withdrawals">
            提现
          </a>
          <a className="text-sm text-slate-600 hover:text-slate-900" href="/admin/reviews">
            评价
          </a>
          <a className="text-sm text-slate-600 hover:text-slate-900" href="/admin/appeals">
            申诉
          </a>
          <a className="text-sm text-slate-600 hover:text-slate-900" href="/admin/aftersales">
            售后
          </a>
          <a className="text-sm text-slate-600 hover:text-slate-900" href="/admin/users">
            用户
          </a>
          <button
            className="admin-btn"
            onClick={() => {
              localStorage.removeItem("admin_token");
              router.replace("/admin");
            }}
          >
            退出登录
          </button>
        </div>

        {error ? <p className="text-red-600 mb-4 text-sm">{error}</p> : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="用户数" value={stats?.userCount ?? "-"} />
          <StatCard title="订单数" value={stats?.orderCount ?? "-"} />
          <StatCard title="兼职者" value={stats?.workerCount ?? "-"} />
          <StatCard title="已完成订单" value={stats?.completedOrders ?? "-"} />
          <StatCard title="总收入" value={stats ? `¥${stats.totalIncome}` : "-"} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="admin-card p-5">
      <p className="text-sm text-slate-500 mb-2">{title}</p>
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
