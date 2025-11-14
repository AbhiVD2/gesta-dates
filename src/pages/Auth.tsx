import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Heart, Loader2 } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !fullName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
            phone: phone
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        // store email on profile as well so we can support phone->email lookup on sign-in
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: fullName,
            phone: phone || null,
            email: email || null
          });

        if (profileError) throw profileError;

        // Assign patient role by default
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'patient'
          });

        if (roleError) throw roleError;

        toast.success('Account created successfully!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    // allow either email or phone number as the credential
    if (!email || !password) {
      toast.error('Please enter email/phone and password');
      return;
    }

    setLoading(true);

    try {
      const credential = email.trim();

      // simple phone detection: starts with + or only digits (7-15 digits)
      const phoneRegex = /^\+?\d{7,15}$/;
      let emailToUse = credential;

      if (phoneRegex.test(credential)) {
        // lookup profile by phone to find associated email
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('email')
          .eq('phone', credential)
          .maybeSingle();

        if (profileErr) {
          console.error('Phone lookup error:', profileErr);
          throw profileErr;
        }
        if (!profile || !profile.email) {
          toast.error('No account found for that phone number');
          setLoading(false);
          return;
        }

        emailToUse = profile.email;
      }

      console.log('Attempting sign in with email:', emailToUse);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        throw error;
      }

      console.log('Sign in successful, user:', data.user?.id);
      toast.success('Signed in successfully!');
      
      // Wait a moment for session to be fully established before navigating
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background p-3 sm:p-4">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="text-center pb-4 sm:pb-6">
          <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">Pregnancy Care Portal</CardTitle>
          <CardDescription className="text-sm">Manage your pregnancy journey with care</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-11 sm:h-12">
              <TabsTrigger value="signin" className="text-sm sm:text-base">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-sm sm:text-base">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-credential">Email or Phone</Label>
                  <Input
                    id="signin-credential"
                    type="text"
                    placeholder="email or +1234567890"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name *</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email *</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password *</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
