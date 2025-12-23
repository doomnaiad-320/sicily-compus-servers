-- 添加交付备注与交付图片字段
ALTER TABLE "Order" ADD COLUMN "deliveryNote" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryImages" JSONB;
ALTER TABLE "Order" ADD COLUMN "deliveredAt" DATETIME;
