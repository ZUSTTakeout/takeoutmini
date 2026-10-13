import { ServiceUnavailableException } from "@nestjs/common";

export function assertTestPaymentsEnabled(): void {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.TEST_PAYMENT_ENABLED !== "true"
  ) {
    throw new ServiceUnavailableException("支付暂不可用，请稍后再试");
  }
}
