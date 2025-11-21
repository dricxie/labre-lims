'use client';

import { useActionState, useMemo } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { collection, query } from 'firebase/firestore'; // Removed 'where'

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/page-header';
import { checkSopCompliance, type State } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { Protocol } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const initialState: State = {
  message: null,
  errors: {},
  result: null,
};


function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Check Compliance
    </Button>
  );
}

export default function SopEnforcerPage() {
  const [state, dispatch] = useActionState(checkSopCompliance, initialState);
  const firestore = useFirestore();
  const { user } = useUser();
  
  // FIX: Simplified the query and updated the dependency array.
  const protocolsQuery = useMemo(() => {
    if (!firestore || !user) return null; // Guard against unauthenticated access
    return query(collection(firestore, 'protocols'));
  }, [firestore, user]);
  
  const { data: protocols, isLoading } = useCollection<Protocol>(protocolsQuery);

  return (
    <div className="space-y-8">
      <PageHeader
        title="SOP Enforcer"
        description="Use AI to verify if a lab action complies with a Standard Operating Procedure."
      />

      <form action={dispatch}>
        <Card>
          <CardHeader>
            <CardTitle>Compliance Check</CardTitle>
            <CardDescription>
              Describe a user action and select the relevant SOP. The AI will
              determine if the action is compliant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userAction">User Action</Label>
              <Textarea
                id="userAction"
                name="userAction"
                placeholder="e.g., 'User added 2µL of template DNA to the master mix before aliquoting into PCR tubes.'"
                rows={4}
                required
              />
              {state.errors?.userAction && (
                <p className="text-sm text-destructive">{state.errors.userAction[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="relevantSOP">Relevant SOP</Label>
               {isLoading ? (
                  <Skeleton className="h-10 w-full" />
               ) : (
                <Select name="relevantSOP">
                    <SelectTrigger>
                        <SelectValue placeholder="Select a protocol..."/>
                    </SelectTrigger>
                    <SelectContent>
                        {protocols?.map((protocol) => (
                            <SelectItem key={protocol.id} value={protocol.content}>
                                {protocol.title} (v{protocol.version})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
               )}
              {state.errors?.relevantSOP && (
                <p className="text-sm text-destructive">{state.errors.relevantSOP[0]}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <p className="text-sm text-muted-foreground">
              Results will appear below after submission.
            </p>
            <SubmitButton />
          </CardFooter>
        </Card>
      </form>

      {state.result && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Result</CardTitle>
          </CardHeader>
          <CardContent>
            {state.result.isCompliant ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle className="text-green-700 dark:text-green-400">Compliant</AlertTitle>
                <AlertDescription>{state.result.reason}</AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Not Compliant</AlertTitle>
                <AlertDescription>{state.result.reason}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {state.message && !state.result && (
         <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
         </Alert>
      )}
    </div>
  );
}