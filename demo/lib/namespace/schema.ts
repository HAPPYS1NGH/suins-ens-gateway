import { ChainName, validateAddress } from "@thenamespace/offchain-manager";
import { z } from "zod";

import { RESERVED_CHAINS, RESERVED_TEXT_KEYS } from "@/lib/records";

const MAX_ADDRESS_RECORDS = 20;
const MAX_TEXT_RECORDS = 30;
const MAX_TEXT_VALUE_LENGTH = 512;
const MAX_CONTENTHASH_LENGTH = 512;

const SUPPORTED_CHAINS = new Set<string>(Object.values(ChainName));

export const multichainAddressSchema = z
  .object({
    chain: z
      .string()
      .refine((value) => SUPPORTED_CHAINS.has(value), { message: "Unsupported chain" })
      // The gateway serves addr(784) from SuiNS alone, so a Sui address written here
      // could never be resolved — reject it instead of appearing to save it.
      .refine((value) => !RESERVED_CHAINS.has(value), {
        message: "The Sui address comes from SuiNS and cannot be set here",
      }),
    value: z.string().min(1).max(256),
  })
  .strict()
  .superRefine((record, ctx) => {
    try {
      validateAddress(record.value, record.chain as ChainName);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid address for chain "${record.chain}"`,
        path: ["value"],
      });
    }
  });

export const textRecordSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(256)
      .refine((key) => !RESERVED_TEXT_KEYS.has(key), {
        message: "This key is reserved for Sui-native data and cannot be set here",
      }),
    value: z.string().max(MAX_TEXT_VALUE_LENGTH),
  })
  .strict();

export const contenthashSchema = z.string().min(1).max(MAX_CONTENTHASH_LENGTH);

/**
 * Every ENS record family the offchain-manager data model represents: multichain
 * addresses, arbitrary text records, and contenthash. Reserved Sui-native keys are
 * rejected at this boundary rather than accepted and silently ignored downstream.
 */
export const ensRecordSchema = z
  .object({
    suiName: z.string().min(1).max(256),
    addresses: z.array(multichainAddressSchema).max(MAX_ADDRESS_RECORDS).default([]),
    texts: z.array(textRecordSchema).max(MAX_TEXT_RECORDS).default([]),
    contenthash: contenthashSchema.optional(),
    removeAddresses: z
      .array(
        z.string().refine((value) => SUPPORTED_CHAINS.has(value), {
          message: "Unsupported chain",
        }),
      )
      .max(MAX_ADDRESS_RECORDS)
      .default([]),
    removeTextKeys: z.array(z.string().min(1).max(256)).max(MAX_TEXT_RECORDS).default([]),
  })
  .strict();

export type MultichainAddressInput = z.infer<typeof multichainAddressSchema>;
export type TextRecordInput = z.infer<typeof textRecordSchema>;
export type EnsRecordInput = z.infer<typeof ensRecordSchema>;
