'use server';

/**
 * @fileOverview An SOP (Standard Operating Procedure) endorsement AI agent.
 *
 * - sopEndorsement - A function that determines whether a given lab action adheres to SOPs.
 * - SopEndorsementInput - The input type for the sopEndorsement function.
 * - SopEndorsementOutput - The return type for the sopEndorsement function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SopEndorsementInputSchema = z.object({
  userAction: z.string().describe('Description of the user action performed in the lab.'),
  relevantSOP: z.string().describe('The relevant Standard Operating Procedure (SOP) document.'),
});
export type SopEndorsementInput = z.infer<typeof SopEndorsementInputSchema>;

const SopEndorsementOutputSchema = z.object({
  isCompliant: z.boolean().describe('Whether the user action is compliant with the SOP.'),
  reason: z.string().describe('The reason for the compliance determination.'),
});
export type SopEndorsementOutput = z.infer<typeof SopEndorsementOutputSchema>;

export async function sopEndorsement(input: SopEndorsementInput): Promise<SopEndorsementOutput> {
  return sopEndorsementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sopEndorsementPrompt',
  input: {schema: SopEndorsementInputSchema},
  output: {schema: SopEndorsementOutputSchema},
  prompt: `You are an AI assistant that reviews lab user actions to ensure compliance with Standard Operating Procedures (SOPs).

  Given a user action and the relevant SOP, determine if the action is compliant with the SOP.

  User Action: {{{userAction}}}
  Relevant SOP: {{{relevantSOP}}}

  Respond with whether the action is compliant, and the reasoning behind the decision.
  `,
});

const sopEndorsementFlow = ai.defineFlow(
  {
    name: 'sopEndorsementFlow',
    inputSchema: SopEndorsementInputSchema,
    outputSchema: SopEndorsementOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
