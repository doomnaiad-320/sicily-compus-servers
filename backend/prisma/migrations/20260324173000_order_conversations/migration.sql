PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT,
    "userId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Conversation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Conversation_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Conversation" ("id", "orderId", "userId", "workerId", "createdAt", "updatedAt")
SELECT "id", "orderId", "userId", "workerId", "createdAt", "updatedAt"
FROM "Conversation";

DROP TABLE "Conversation";
ALTER TABLE "new_Conversation" RENAME TO "Conversation";

CREATE UNIQUE INDEX "Conversation_orderId_userId_workerId_key" ON "Conversation"("orderId", "userId", "workerId");
CREATE INDEX "Conversation_orderId_idx" ON "Conversation"("orderId");
CREATE INDEX "Conversation_userId_workerId_idx" ON "Conversation"("userId", "workerId");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
