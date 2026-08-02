import { isAddress } from "viem";
import { z } from "zod";

export const ethereumAddressSchema = z
  .string()
  .refine((value) => isAddress(value, { strict: true }), {
    message: "Must be a checksummed Ethereum address",
  });

/**
 * Phase 3 covers a single field. Multichain addresses, arbitrary text records, and
 * contenthash join this schema in Phase 4 without changing the write path's shape.
 */
export const ensRecordSchema = z
  .object({
    suiName: z.string().min(1).max(256),
    ethereumAddress: ethereumAddressSchema.optional(),
  })
  .strict();

export type EnsRecordInput = z.infer<typeof ensRecordSchema>;
