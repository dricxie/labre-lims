'use server';

import { z } from 'zod';
import { sopEndorsement, SopEndorsementOutput } from '@/ai/flows/sop-endorsement';

const FormSchema = z.object({
  userAction: z.string().min(10, {
    message: 'User action must be at least 10 characters long.',
  }),
  relevantSOP: z.string().min(1, {
    message: 'You must select a protocol.',
  }),
});

export type State = {
  errors?: {
    userAction?: string[];
    relevantSOP?: string[];
  };
  message?: string | null;
  result?: SopEndorsementOutput | null;
};

export async function checkSopCompliance(
  prevState: State,
  formData: FormData
): Promise<State> {
  const validatedFields = FormSchema.safeParse({
    userAction: formData.get('userAction'),
    relevantSOP: formData.get('relevantSOP'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Validation failed. Please check the fields.',
      result: null,
    };
  }
  
  const { userAction, relevantSOP } = validatedFields.data;

  try {
    const result = await sopEndorsement({ userAction, relevantSOP });
    return {
      message: 'Compliance check successful.',
      result: result,
    };
  } catch (error) {
    console.error('SOP Endorsement Error:', error);
    return {
      message: 'An error occurred while checking compliance. Please try again.',
      result: null,
    };
  }
}
