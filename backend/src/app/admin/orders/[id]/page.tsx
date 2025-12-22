"use client";

import { useEffect, useState } from "react";
import { adminFetch, getAdminToken } from "@/lib/admin-client";
import { useRouter } from "next/navigation";

type OrderDetail = {
  id: string;
  type: string;
  description: string;
  status: string;
  amount: string;
  address: string;
  user: { nickname: string; openid: string };
  worker?: { id: string; userId: string };
  review?: { rating: number; content: string | null };
  afterSale?: { status: string; reason: string; result: string | null };
  appeals?: { id: string; status: string; reason: string; result: string | null }[];
  createdAt: string;
  updatedAt: string;
};

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<OrderDetail | null>(null);
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
      const res = await adminFetch<OrderDetail>(`/api/admin/orders/${params.id}`);
      setData(res);
    } catch (e: any) {
      setError(e?.message || "加载失败");
    }
  };

  if (error) {
    return <p className="p-6 text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="p-6 text-slate-500">加载中...</p>;
  }

  return (
    <div className="min-h-screen px-6 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">管理员控制台</p>
          <h1 className="text-2xl font-semibold text-slate-900">订单详情</h1>
          <p className="text-sm text-slate-500">订单ID：{data.id}</p>
        </div>
        <a className="text-sm text-slate-600 hover:text-slate-900" href="/admin/orders">
          返回列表
        </a>
      </div>

      <div className="admin-card p-5 space-y-3">
        <DetailRow label="类型" value={data.type} />
        <DetailRow label="描述" value={data.description} />
        <DetailRow label="金额" value={`¥${data.amount}`} />
        <DetailRow label="状态" value={data.status} />
        <DetailRow label="地址" value={data.address} />
        <DetailRow label="用户" value={data.user?.nickname || data.user?.openid} />
        <DetailRow label="接单人" value={data.worker?.userId || data.worker?.id || "-"} />
        <DetailRow label="创建时间" value={data.createdAt} />
        <DetailRow label="更新时间" value={data.updatedAt} />
      </div>

      {data.review ? (
        <div className="admin-card p-5">
          <h3 className="text-lg font-semibold mb-2">评价</h3>
          <p className="text-slate-900">评分：{data.review.rating}</p>
          <p className="text-slate-700 mt-1">内容：{data.review.content || "-"}</p>
        </div>
      ) : null}

      {data.afterSale ? (
        <div className="admin-card p-5">
          <h3 className="text-lg font-semibold mb-2">售后</h3>
          <p className="text-slate-900">状态：{data.afterSale.status}</p>
          <p className="text-slate-700">原因：{data.afterSale.reason}</p>
          <p className="text-slate-700">结果：{data.afterSale.result || "-"}</p>
        </div>
      ) : null}

      {data.appeals && data.appeals.length > 0 ? (
        <div className="admin-card p-5">
          <h3 className="text-lg font-semibold mb-2">申诉</h3>
          <ul className="space-y-2">
            {data.appeals.map((a) => (
              <li key={a.id} className="border border-slate-100 rounded-md p-3">
                <div className="text-sm text-slate-900">状态：{a.status}</div>
                <div className="text-sm text-slate-700">原因：{a.reason}</div>
                <div className="text-sm text-slate-700">结果：{a.result || "-"}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number | undefined | null }) {
  return (
    <div className="flex text-sm text-slate-700">
      <div className="w-24 text-slate-500">{label}</div>
      <div className="flex-1 text-slate-900">{value ?? "-"}</div>
    </div>
  );
}
