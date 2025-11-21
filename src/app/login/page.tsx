'use client';

import { useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/firebase';
import { Logo } from '@/components/logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createUser, SignUpState } from '@/app/auth/actions';

function SubmitButton({ text }: { text: string }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
            {text}
        </Button>
    );
}

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [signInError, setSignInError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');

  // Menginisialisasi state untuk Server Action
  // Pastikan tipenya cocok dengan yang di-return dari actions.ts
  const initialState: SignUpState = { message: null, errors: null, success: false, credentials: null };
  const [signUpState, dispatchSignUp] = React.useActionState(createUser, initialState);

  // Satu useEffect untuk menangani hasil dari Server Action
  useEffect(() => {
    // Fungsi ini akan dipanggil jika sign-up di server berhasil
    const triggerVerificationEmail = async (creds: { email: string; password: string }) => {
      // Pastikan ada kredensial yang valid
      if (!creds || !creds.email || !creds.password) {
        console.error("Credentials not found in state after sign-up.");
        setInfo("Account created, but could not automatically send verification email. Please try signing in to trigger it.");
        return;
      }

      try {
        console.log("Attempting temporary sign-in to send verification email for:", creds.email);
        const userCredential = await signInWithEmailAndPassword(auth, creds.email, creds.password);
        await sendEmailVerification(userCredential.user);
        console.log("Verification email sent successfully.");
        setInfo(signUpState.message + " A verification link has been sent to your inbox.");
      } catch (error) {
        console.error("Could not send verification email after sign-up:", error);
        setInfo(signUpState.message + " Could not automatically send verification email. Please sign in to trigger it.");
      } finally {
        // Penting: Selalu sign out setelahnya, apa pun yang terjadi
        if (auth.currentUser) {
          await auth.signOut();
        }
      }
    };

    // Cek apakah Server Action berhasil dan mengembalikan kredensial
    if (signUpState.success && signUpState.credentials) {
      triggerVerificationEmail(signUpState.credentials);
      setActiveTab('signin');
    }
  }, [signUpState, auth]);


  const clearMessages = () => {
    setSignInError(null);
    setInfo(null);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        setSignInError("Your email is not verified. Please check your inbox or click the link below to resend.");
        await auth.signOut();
        setIsLoading(false);
        return;
      }

      const idToken = await user.getIdToken();
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        const errorData = await response.json();
        setSignInError(errorData.error || 'Failed to create session.');
        await auth.signOut();
      }
    } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
            setSignInError('Invalid email or password.');
        } else {
            setSignInError(err.message || 'An unexpected error occurred.');
        }
    } finally {
      if (router) setIsLoading(false);
    }
  };
  
  const handlePasswordReset = async () => {
    if (!email) {
      setSignInError("Please enter your email address to reset your password.");
      return;
    }
    clearMessages();
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo("Password reset email sent! Please check your inbox.");
    } catch (err: any) {
      setSignInError(err.message || "Failed to send password reset email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email || !password) {
      setSignInError("Please enter your email and password to resend the verification link.");
      return;
    }
    clearMessages();
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (!user.emailVerified) {
        await sendEmailVerification(user);
        setInfo("A new verification link has been sent to your email.");
      } else {
        setInfo("Your email is already verified. You can now sign in.");
      }
      await auth.signOut();
    } catch (err: any) {
      setSignInError("Could not resend link. Please check your credentials and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const showResendButton = signInError?.includes("not verified");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <Card className="w-full max-w-sm mx-auto">
        <CardContent className="flex flex-col items-center p-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center gap-2">
            <Logo className="h-7 w-auto" />
            <span className="text-2xl font-semibold tracking-tight">
              LabRe
            </span>
          </div>
            <div className="pt-2">
              <CardTitle className="text-2xl font-semibold tracking-tight">
                {activeTab === 'signin' ? 'Welcome Back' : 'Create an Account'}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {activeTab === 'signin'
                  ? 'Sign in to continue'
                  : 'Enter your details below to get started'}
              </CardDescription>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4 p-0 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="email-signin">Email</Label>
                    <Input id="email-signin" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password-signin">Password</Label>
                      <Button variant="link" type="button" onClick={handlePasswordReset} className="p-0 h-auto text-xs">Forgot your password?</Button>
                    </div>
                    <Input id="password-signin" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </CardContent>
                <CardFooter className="p-0 pt-6">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
  
            <TabsContent value="signup">
              <form action={dispatchSignUp}>
                <CardContent className="space-y-4 p-0 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="name-signup">Name</Label>
                    <Input id="name-signup" name="name" placeholder="Your Name" required />
                    {signUpState.errors?.name && <p className="text-sm text-red-500">{signUpState.errors.name[0]}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-signup">Email</Label>
                    <Input id="email-signup" name="email" placeholder="your.email@example.com" type="email" required />
                    {signUpState.errors?.email && <p className="text-sm text-red-500">{signUpState.errors.email[0]}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signup">Password</Label>
                    <Input id="password-signup" name="password" placeholder="At least 6 characters" type="password" required />
                    {signUpState.errors?.password && <p className="text-sm text-red-500">{signUpState.errors.password[0]}</p>}
                  </div>
                </CardContent>
                <CardFooter className="p-0 pt-6">
                  <SubmitButton text="Sign Up" />
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="w-full pt-2">
            {signInError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{signInError}</AlertDescription>
              </Alert>
            )}
  
            {showResendButton && (
              <Button 
                variant="link" 
                onClick={handleResendVerification} 
                disabled={isLoading} 
                className="mt-2 w-full"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Resend verification link'}
              </Button>
            )}
  
            {info && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Info</AlertTitle>
                <AlertDescription>{info}</AlertDescription>
              </Alert>
            )}
  
            {signUpState.errors?._form && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sign Up Failed</AlertTitle>
                <AlertDescription>{signUpState.errors._form[0]}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}