import { NextRequest, NextResponse } from "next/server";

// 技能分类列表（基于ServiceType，可扩展）
const SKILL_CATEGORIES = [
  {
    id: "delivery",
    name: "代取快递",
    icon: "deliver",
    description: "帮忙代取快递、包裹等",
  },
  {
    id: "shopping",
    name: "代购物品",
    icon: "shop",
    description: "帮忙购买食品、日用品等",
  },
  {
    id: "printing",
    name: "打印服务",
    icon: "print",
    description: "文档打印、复印等",
  },
  {
    id: "tutoring",
    name: "学业辅导",
    icon: "education",
    description: "课程辅导、答疑解惑",
  },
  {
    id: "errand",
    name: "跑腿代办",
    icon: "run",
    description: "各类跑腿代办事务",
  },
  {
    id: "cleaning",
    name: "清洁服务",
    icon: "clear",
    description: "宿舍清洁、整理等",
  },
  {
    id: "moving",
    name: "搬运服务",
    icon: "move",
    description: "行李搬运、物品搬迁",
  },
  {
    id: "repair",
    name: "维修服务",
    icon: "tools",
    description: "电子设备维修、小修小补",
  },
];

// 获取技能分类列表
export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    data: SKILL_CATEGORIES,
  });
}
