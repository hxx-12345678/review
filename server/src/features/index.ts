import { Router } from "express";
import whatsappFlowsRoutes from "./whatsapp-flows/whatsapp-flows.routes";
import unifiedInboxRoutes from "./unified-inbox/unified-inbox.routes";
import reviewTasksRoutes from "./review-tasks/review-tasks.routes";
import instagramRoutes from "./instagram/instagram.routes";
import multiPlatformRoutes from "./multi-platform/multi-platform.routes";
import gbpRoutes from "./gbp/gbp.routes";

const router = Router();

// WhatsApp Flows Review Collection
router.use("/whatsapp-flows", whatsappFlowsRoutes);

// Multi-Platform Review Automation
router.use("/multi-platform", multiPlatformRoutes);

// Cross-Platform Unified Inbox
router.use("/inbox", unifiedInboxRoutes);

// Auto-Generated Follow-up Tasks
router.use("/tasks", reviewTasksRoutes);

// Instagram @Mentions Monitoring + Reply
router.use("/instagram", instagramRoutes);

// Google GBP API Sync + Reply
router.use("/gbp", gbpRoutes);

export default router;
