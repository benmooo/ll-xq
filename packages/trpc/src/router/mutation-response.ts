import type { mutationResponseSchema } from '@ll-xq/game-core';
import { z } from 'zod';

export type MutationResponse<T> = z.infer<typeof mutationResponseSchema> & {
  data?: T;
};

export function ok<T>(data: T): MutationResponse<T> {
  return { success: true, data };
}

export function fail(message: string): MutationResponse<null> {
  return { success: false, error: { message } };
}
