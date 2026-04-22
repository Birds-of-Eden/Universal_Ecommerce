import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDotDashed, FolderKanban, Landmark, ShieldCheck, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type InvestorWorkflowSection =
  | "overview"
  | "tasks"
  | "exceptions"
  | "notifications"
  | "registry"
  | "documents"
  | "profile-requests"
  | "portal-access"
  | "ledger"
  | "allocations"
  | "profit-runs"
  | "payouts"
  | "statements"
  | "statement-schedules";

type WorkflowStep = {
  id: string;
  title: string;
  description: string;
  href: string;
};

type WorkflowStage = {
  id: string;
  title: string;
  description: string;
  icon: typeof ShieldCheck;
  steps: WorkflowStep[];
};

const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: "onboard",
    title: "Onboard And Verify",
    description: "Create the investor, verify KYC, review portal changes, then enable access.",
    icon: ShieldCheck,
    steps: [
      { id: "registry", title: "Investor Registry", description: "Create and maintain investor master.", href: "/admin/investors/registry" },
      { id: "documents", title: "Documents", description: "Review KYC completeness and status.", href: "/admin/investors/documents" },
      { id: "profile-requests", title: "Profile Requests", description: "Approve portal-submitted sensitive changes.", href: "/admin/investors/profile-requests" },
      { id: "portal-access", title: "Portal Access", description: "Map investor user to portal access.", href: "/admin/investors/portal-access" },
    ],
  },
  {
    id: "fund",
    title: "Fund And Allocate",
    description: "Post capital movement, then define where investor exposure sits.",
    icon: Landmark,
    steps: [
      { id: "ledger", title: "Capital Ledger", description: "Record commitments, contributions, and adjustments.", href: "/admin/investors/ledger" },
      { id: "allocations", title: "Allocations", description: "Assign investor participation across variants.", href: "/admin/investors/allocations" },
    ],
  },
  {
    id: "profit",
    title: "Calculate And Govern",
    description: "Generate profit runs, review controls, approve, then post.",
    icon: FolderKanban,
    steps: [
      { id: "profit-runs", title: "Profit Runs", description: "Create, approve, reject, and post investor runs.", href: "/admin/investors/profit-runs" },
    ],
  },
  {
    id: "settle",
    title: "Settle And Communicate",
    description: "Create payouts, settle, monitor alerts, and export statements.",
    icon: Wallet,
    steps: [
      { id: "payouts", title: "Payouts", description: "Approve, hold, pay, and void payout drafts.", href: "/admin/investors/payouts" },
      { id: "statements", title: "Statements", description: "Preview and export investor statements.", href: "/admin/investors/statements" },
      { id: "statement-schedules", title: "Statement Schedules", description: "Automate recurring statement dispatch.", href: "/admin/investors/statement-schedules" },
      { id: "notifications", title: "Notifications", description: "Watch internal investor workflow alerts.", href: "/admin/investors/notifications" },
    ],
  },
];

const SECTION_META: Record<
  InvestorWorkflowSection,
  {
    title: string;
    description: string;
    stageId: string;
    next: WorkflowStep[];
  }
> = {
  overview: {
    title: "Investor Workspace",
    description: "Start here to understand the lifecycle, then jump into the active queue or the next operational stage.",
    stageId: "onboard",
    next: [
      { id: "registry", title: "Investor Registry", description: "Create or open the target investor master.", href: "/admin/investors/registry" },
      { id: "documents", title: "Documents", description: "Check KYC completeness before funding.", href: "/admin/investors/documents" },
      { id: "tasks", title: "My Tasks", description: "Open current approval and payout queues.", href: "/admin/investors/my-tasks" },
    ],
  },
  tasks: {
    title: "Action Queue",
    description: "Use this when you need to know what demands attention right now.",
    stageId: "profit",
    next: [
      { id: "notifications", title: "Notifications", description: "Review workflow alerts behind the queue.", href: "/admin/investors/notifications" },
      { id: "exceptions", title: "Exceptions", description: "Validate whether a blocker sits behind the task.", href: "/admin/investors/exceptions" },
    ],
  },
  exceptions: {
    title: "Exception Control",
    description: "Use this page to remove blockers before the lifecycle can move forward.",
    stageId: "onboard",
    next: [
      { id: "documents", title: "Documents", description: "Resolve KYC and review issues.", href: "/admin/investors/documents" },
      { id: "payouts", title: "Payouts", description: "Resolve hold, approval, or pay blockers.", href: "/admin/investors/payouts" },
    ],
  },
  notifications: {
    title: "Internal Alerts",
    description: "Use notifications as the event inbox, then open the exact workflow object behind each alert.",
    stageId: "settle",
    next: [
      { id: "tasks", title: "My Tasks", description: "Open the queue after triaging alerts.", href: "/admin/investors/my-tasks" },
      { id: "exceptions", title: "Exceptions", description: "If the alert is a blocker, open exceptions next.", href: "/admin/investors/exceptions" },
    ],
  },
  registry: {
    title: "Investor Master",
    description: "Registry comes first. If the investor master is weak, everything downstream gets noisy.",
    stageId: "onboard",
    next: [
      { id: "documents", title: "Documents", description: "Verify KYC and source documents.", href: "/admin/investors/documents" },
      { id: "portal-access", title: "Portal Access", description: "Enable investor self-service after verification.", href: "/admin/investors/portal-access" },
    ],
  },
  documents: {
    title: "KYC Governance",
    description: "After registry, document review is the clearest next step before funding and payout activity.",
    stageId: "onboard",
    next: [
      { id: "profile-requests", title: "Profile Requests", description: "Review sensitive portal changes that affect KYC.", href: "/admin/investors/profile-requests" },
      { id: "ledger", title: "Capital Ledger", description: "Once verified, move into funding.", href: "/admin/investors/ledger" },
    ],
  },
  "profile-requests": {
    title: "Sensitive Change Review",
    description: "Use this after portal users submit identity or beneficiary changes, then re-check document/KYC alignment.",
    stageId: "onboard",
    next: [
      { id: "documents", title: "Documents", description: "Re-verify affected KYC documents.", href: "/admin/investors/documents" },
      { id: "portal-access", title: "Portal Access", description: "Keep self-service ownership aligned.", href: "/admin/investors/portal-access" },
    ],
  },
  "portal-access": {
    title: "Portal Enablement",
    description: "This is the final onboarding step before the investor starts self-service interactions.",
    stageId: "onboard",
    next: [
      { id: "ledger", title: "Capital Ledger", description: "Move into funding after access is ready.", href: "/admin/investors/ledger" },
      { id: "notifications", title: "Notifications", description: "Watch for incoming portal-driven events.", href: "/admin/investors/notifications" },
    ],
  },
  ledger: {
    title: "Funding Ledger",
    description: "Capital movement should come before allocation and profit distribution.",
    stageId: "fund",
    next: [
      { id: "allocations", title: "Allocations", description: "Assign investor participation after funding.", href: "/admin/investors/allocations" },
      { id: "profit-runs", title: "Profit Runs", description: "Only calculate after ledger and allocation are stable.", href: "/admin/investors/profit-runs" },
    ],
  },
  allocations: {
    title: "Allocation Control",
    description: "This stage defines who owns what before profit can be governed correctly.",
    stageId: "fund",
    next: [
      { id: "profit-runs", title: "Profit Runs", description: "Generate runs once allocation coverage is acceptable.", href: "/admin/investors/profit-runs" },
      { id: "exceptions", title: "Exceptions", description: "Check overlap and inactive allocation issues.", href: "/admin/investors/exceptions" },
    ],
  },
  "profit-runs": {
    title: "Profit Governance",
    description: "This stage is calculation, approval, and posting control. Do not jump to payouts before posting.",
    stageId: "profit",
    next: [
      { id: "payouts", title: "Payouts", description: "Create payout drafts only after posting.", href: "/admin/investors/payouts" },
      { id: "statements", title: "Statements", description: "Use statements after payout and ledger state is stable.", href: "/admin/investors/statements" },
    ],
  },
  payouts: {
    title: "Settlement Control",
    description: "This stage is approval, hold, release, payment, and reversal control.",
    stageId: "settle",
    next: [
      { id: "statements", title: "Statements", description: "Preview final investor-facing output.", href: "/admin/investors/statements" },
      { id: "notifications", title: "Notifications", description: "Track payout-ready and settlement alerts.", href: "/admin/investors/notifications" },
    ],
  },
  statements: {
    title: "Investor Reporting",
    description: "Statements come last. Use them after ledger and payout data are in the expected state.",
    stageId: "settle",
    next: [
      { id: "statement-schedules", title: "Statement Schedules", description: "Automate recurring dispatch after output looks right.", href: "/admin/investors/statement-schedules" },
      { id: "notifications", title: "Notifications", description: "Monitor follow-up actions and investor responses.", href: "/admin/investors/notifications" },
    ],
  },
  "statement-schedules": {
    title: "Reporting Automation",
    description: "Use schedules after the statement output is already correct and auditable.",
    stageId: "settle",
    next: [
      { id: "notifications", title: "Notifications", description: "Watch due/overdue delivery alerts.", href: "/admin/investors/notifications" },
      { id: "overview", title: "Investor Workspace", description: "Return to workspace for overall operational monitoring.", href: "/admin/investors" },
    ],
  },
};

function stageTone(stageId: string, currentStageId: string) {
  if (stageId === currentStageId) {
    return "border-emerald-300 bg-emerald-50";
  }
  return "border-slate-200 bg-white";
}

export function InvestorWorkflowGuide({
  currentSection,
}: {
  currentSection: InvestorWorkflowSection;
}) {
  const currentMeta = SECTION_META[currentSection];
  const currentStage = WORKFLOW_STAGES.find((stage) => stage.id === currentMeta.stageId);

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">Investor Workflow Guide</CardTitle>
              <Badge variant="outline">{currentMeta.title}</Badge>
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {currentMeta.description}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/investors/my-tasks">Open Live Queue</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {WORKFLOW_STAGES.map((stage, index) => {
              const Icon = stage.icon;
              const isCurrent = stage.id === currentMeta.stageId;
              return (
                <div
                  key={stage.id}
                  className={`rounded-xl border p-4 ${stageTone(stage.id, currentMeta.stageId)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Step {index + 1}
                        </span>
                        {isCurrent ? <Badge>Current</Badge> : null}
                      </div>
                      <p className="font-semibold">{stage.title}</p>
                      <p className="text-sm text-muted-foreground">{stage.description}</p>
                    </div>
                    <Icon className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div className="mt-4 space-y-2">
                    {stage.steps.map((step) => {
                      const isPage = step.id === currentSection;
                      return (
                        <Link
                          key={step.id}
                          href={step.href}
                          className={`flex items-start justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:border-emerald-400 ${
                            isPage ? "border-emerald-400 bg-emerald-100/70" : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="space-y-1">
                            <p className="font-medium">{step.title}</p>
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                          </div>
                          {isPage ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
                          ) : (
                            <ArrowRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2">
              <CircleDotDashed className="h-4 w-4 text-emerald-700" />
              <p className="font-semibold">
                {currentStage ? `${currentStage.title} stage` : "Recommended next steps"}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {currentMeta.next.map((step, index) => (
                <Link
                  key={step.id}
                  href={step.href}
                  className="block rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-emerald-400"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Next {index + 1}
                  </p>
                  <p className="mt-1 font-medium">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
