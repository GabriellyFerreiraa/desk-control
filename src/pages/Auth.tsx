import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Mail, Shield } from 'lucide-react';
import { LangSwitch } from '@/components/LangSwitch';
import { useLang, useT } from '@/i18n/lang';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const {
    signIn,
    signUp
  } = useAuth();
  const navigate = useNavigate();
  // "Get started" on the landing page links here with ?tab=signup.
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';
  const t = useT();
  const { lang } = useLang();
  const ta = t.auth;

  // Built per language so validation messages follow the selected language.
  const loginSchema = useMemo(() => z.object({
    email: z.string().email(ta.errors.invalidEmail),
    password: z.string().min(6, ta.errors.passwordMin6)
  }), [ta]);
  const signupSchema = useMemo(() => z.object({
    name: z.string().min(2, ta.errors.nameMin),
    email: z.string().email(ta.errors.invalidEmail),
    password: z.string().min(8, ta.errors.passwordMin8)
  }), [ta]);
  type LoginForm = z.infer<typeof loginSchema>;
  type SignupForm = z.infer<typeof signupSchema>;

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });
  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: ''
    }
  });
  const onLogin = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const {
        error
      } = await signIn(data.email, data.password);
      if (!error) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error during login:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const onSignup = async (data: SignupForm) => {
    setIsLoading(true);
    try {
      // useAuth shows the success or error toast. The language picked here
      // becomes the new profile's language.
      await signUp(data.email, data.password, {
        name: data.name,
        language: lang
      });
    } catch (error) {
      console.error('Error during signup:', error);
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-background p-4 landing-theme force-light relative">
      <LangSwitch className="absolute top-4 right-4" />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">DeskControl</CardTitle>
          <CardDescription>
            {ta.tagline}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={initialTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{ta.signInTab}</TabsTrigger>
              <TabsTrigger value="signup">{ta.signUpTab}</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{ta.email}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="login-email" type="email" placeholder={ta.emailPlaceholder} className="pl-10" {...loginForm.register('email')} autoComplete="email" />
                  </div>
                  {loginForm.formState.errors.email && <p className="text-sm text-destructive">
                      {loginForm.formState.errors.email.message}
                    </p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">{ta.password}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="login-password" type="password" placeholder="••••••" className="pl-10" {...loginForm.register('password')} autoComplete="current-password" />
                  </div>
                  {loginForm.formState.errors.password && <p className="text-sm text-destructive">
                      {loginForm.formState.errors.password.message}
                    </p>}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? ta.signingIn : ta.signIn}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{ta.fullName}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="signup-name" placeholder={ta.namePlaceholder} className="pl-10" {...signupForm.register('name')} autoComplete="name" />
                  </div>
                  {signupForm.formState.errors.name && <p className="text-sm text-destructive">
                      {signupForm.formState.errors.name.message}
                    </p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">{ta.email}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="signup-email" type="email" placeholder={ta.emailPlaceholder} className="pl-10" {...signupForm.register('email')} autoComplete="email" />
                  </div>
                  {signupForm.formState.errors.email && <p className="text-sm text-destructive">
                      {signupForm.formState.errors.email.message}
                    </p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">{ta.password}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="signup-password" type="password" placeholder="••••••" className="pl-10" {...signupForm.register('password')} autoComplete="new-password" />
                  </div>
                  {signupForm.formState.errors.password && <p className="text-sm text-destructive">
                      {signupForm.formState.errors.password.message}
                    </p>}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? ta.creatingAccount : ta.createAccount}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>;
};
export default Auth;
