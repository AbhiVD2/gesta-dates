import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Calendar, Users, Bell } from 'lucide-react';

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-10 w-10 text-primary" />
            </div>
          </div>
          
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            Pregnancy Care Management
          </h1>
          <p className="mb-8 text-xl text-muted-foreground">
            Comprehensive pregnancy scan scheduling and reminder system
          </p>

          <div className="mb-12 flex justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <Calendar className="mx-auto mb-2 h-8 w-8 text-primary" />
                <CardTitle>Smart Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automatic calculation of all scan dates based on LMP with recommended appointment windows
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="mx-auto mb-2 h-8 w-8 text-primary" />
                <CardTitle>Multi-Role Access</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Role-based system for superadmin, admin, subadmin, and patients with proper permissions
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Bell className="mx-auto mb-2 h-8 w-8 text-primary" />
                <CardTitle>Reminders</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Send timely reminders to patients about upcoming scans and appointments
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12">
            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <h2 className="mb-4 text-2xl font-semibold">Default Scan Types</h2>
                <div className="grid gap-3 text-left md:grid-cols-2">
                  <div className="rounded-lg border bg-card p-3">
                    <p className="font-medium">Dating Scan</p>
                    <p className="text-sm text-muted-foreground">6-8 weeks</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="font-medium">NT Scan</p>
                    <p className="text-sm text-muted-foreground">11-13 weeks</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="font-medium">Anomaly Scan</p>
                    <p className="text-sm text-muted-foreground">18-22 weeks</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="font-medium">Fetal Echo</p>
                    <p className="text-sm text-muted-foreground">21-22 weeks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
