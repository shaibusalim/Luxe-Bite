import { useMemo, useState } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Mail, Lock, User, ArrowLeft, Shield, Smartphone, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z
  .object({
    fullName: z.string().min(2, 'Name is required').max(100),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), {
        message: 'Password must contain letters and numbers',
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

const Auth = () => {
  const location = useLocation();
  const { user, signIn, signUp, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const from = (location.state as { from?: string })?.from || '/';

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const signupPassword = signupForm.watch('password') || '';
  const passwordStrength = useMemo(() => {
    let score = 0;
    if (signupPassword.length >= 8) score++;
    if (/[A-Z]/.test(signupPassword)) score++;
    if (/[a-z]/.test(signupPassword)) score++;
    if (/\d/.test(signupPassword)) score++;
    if (/[^A-Za-z0-9]/.test(signupPassword)) score++;
    return score;
  }, [signupPassword]);

  const strengthLabel = useMemo(() => {
    if (passwordStrength <= 1) return 'Very Weak';
    if (passwordStrength === 2) return 'Weak';
    if (passwordStrength === 3) return 'Medium';
    if (passwordStrength === 4) return 'Strong';
    return 'Very Strong';
  }, [passwordStrength]);
  const loginPassword = loginForm.watch('password') || '';
  const loginPasswordStrength = useMemo(() => {
    let score = 0;
    if (loginPassword.length >= 8) score++;
    if (/[A-Z]/.test(loginPassword)) score++;
    if (/[a-z]/.test(loginPassword)) score++;
    if (/\d/.test(loginPassword)) score++;
    if (/[^A-Za-z0-9]/.test(loginPassword)) score++;
    return score;
  }, [loginPassword]);
  const loginStrengthLabel = useMemo(() => {
    if (loginPasswordStrength <= 1) return 'Very Weak';
    if (loginPasswordStrength === 2) return 'Weak';
    if (loginPasswordStrength === 3) return 'Medium';
    if (loginPasswordStrength === 4) return 'Strong';
    return 'Very Strong';
  }, [loginPasswordStrength]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        toast.error('Invalid email or password');
      } else {
        toast.success('Signed in');
      }
    } catch (err) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signUp(data.email, data.password, data.fullName);
      if (error) {
        toast.error('Unable to create account');
      } else {
        toast.success('Account created');
        setActiveTab('login');
      }
    } catch (err) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] md:min-h-screen flex flex-col items-center justify-center px-4 py-8 md:py-12 bg-gradient-to-br from-amber-50/90 via-background to-orange-100/60">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <Link
          to="/"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        {/* Header - Fade + slide down on load */}
        <div className="text-center mb-8">
          <motion.h1
            className="font-display text-2xl md:text-3xl font-bold text-foreground"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <span className="text-primary">Luxe</span> Bite
          </motion.h1>
          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              <motion.div
                key="login-header"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="mt-5"
              >
                <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">
                  Welcome back 👋
                </h2>
                <p className="text-muted-foreground text-sm mt-1.5">Order your favorite meals in minutes.</p>
              </motion.div>
            ) : (
              <motion.div
                key="signup-header"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="mt-5"
              >
                <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">
                  Create your Luxe Bite account
                </h2>
                <p className="text-muted-foreground text-sm mt-1.5">Order your favorite meals in minutes.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Auth Card - Elevated with soft shadow */}
        <div className="bg-card rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-border/40 p-6 md:p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 rounded-xl bg-muted/80 p-1">
              <TabsTrigger
                value="login"
                className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              className="h-12 pl-10 rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-200"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="mt-1.5" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          {/* removed non-functional password reset link */}
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                              type={showLoginPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              className="h-12 pl-10 rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-200"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowLoginPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                              aria-label="Toggle password visibility"
                            >
                              {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="mt-1.5" />
                        <div className="mt-2">
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full transition-all"
                              style={{
                                width: `${(loginPasswordStrength / 5) * 100}%`,
                                background:
                                  loginPasswordStrength <= 2
                                    ? 'rgb(244 63 94)'
                                    : loginPasswordStrength === 3
                                    ? 'rgb(234 179 8)'
                                    : 'rgb(34 197 94)',
                              }}
                            />
                          </div>
                          <p className="text-xs mt-1 text-muted-foreground">{loginStrengthLabel}</p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      type="submit"
                      variant="hero"
                      size="lg"
                      className="w-full h-14 rounded-xl text-base font-semibold shadow-lg"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </motion.div>

                  <p className="text-center text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('signup')}
                      className="text-primary font-semibold hover:underline"
                    >
                      Sign up
                    </button>
                  </p>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-5">
                  <FormField
                    control={signupForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                              placeholder="Your name"
                              className="h-12 pl-10 rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-200"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="mt-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              className="h-12 pl-10 rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-200"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="mt-1.5" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                              type={showSignupPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              className="h-12 pl-10 rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-200"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowSignupPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                              aria-label="Toggle password visibility"
                            >
                              {showSignupPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="mt-1.5" />
                        <div className="mt-2">
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full transition-all"
                              style={{
                                width: `${(passwordStrength / 5) * 100}%`,
                                background:
                                  passwordStrength <= 2
                                    ? 'rgb(244 63 94)'
                                    : passwordStrength === 3
                                    ? 'rgb(234 179 8)'
                                    : 'rgb(34 197 94)',
                              }}
                            />
                          </div>
                          <p className="text-xs mt-1 text-muted-foreground">{strengthLabel}</p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signupForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              className="h-12 pl-10 rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-200"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                              aria-label="Toggle password visibility"
                            >
                              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="mt-1.5" />
                      </FormItem>
                    )}
                  />

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      type="submit"
                      variant="hero"
                      size="lg"
                      className="w-full h-14 rounded-xl text-base font-semibold shadow-lg"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </motion.div>

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="text-primary font-semibold hover:underline"
                    >
                      Log in
                    </button>
                  </p>
                </form>
              </Form>
            </TabsContent>
          </Tabs>

          {/* Social login placeholder (UI only) */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-center text-xs text-muted-foreground mb-3">Or continue with</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl border-2"
                disabled
              >
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl border-2"
                disabled
              >
                <Smartphone className="h-5 w-5 mr-2" />
                Phone
              </Button>
            </div>
          </div>

          {/* Trust micro-copy */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-primary/70" />
              Secure checkout & payments
            </span>
            <span className="flex items-center gap-1.5">We never share your data</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8 max-w-xs mx-auto leading-relaxed">
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
