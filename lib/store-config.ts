export const workflowConfig = {
  approvalThresholdAmount: 1000,
  level1ApprovalTimeoutHours: 2,
  level2ApprovalTimeoutHours: 4,
  qcHoldTimeoutMinutes: 90,
  maxResubmitCount: 2,
} as const;

export function requiresLevel2Approval(amount: number) {
  return amount >= workflowConfig.approvalThresholdAmount;
}
