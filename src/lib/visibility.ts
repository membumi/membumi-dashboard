import { VerificationStatus } from "@prisma/client";

// Only internal content (no merchant) or content from VERIFIED merchants is
// exposed to the public app API.
export const merchantVisible = {
  OR: [
    { merchantId: null },
    { merchant: { is: { verificationStatus: VerificationStatus.VERIFIED } } },
  ],
};
